import type {
	IDataObject,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	ResourceMapperField,
	ResourceMapperFields,
	FieldType,
} from 'n8n-workflow';

import { CLOUD_ENDPOINTS, NIOS_RESOURCES, getCloudUpdateMethod } from './constants';
import { normalizeBaseUrl } from './GenericFunctions';

/* -------------------------------------------------------------------------- */
/*                              Spec source maps                              */
/* -------------------------------------------------------------------------- */

/** Cloud resource → CSP apidoc document name (`/apidoc/docs/<DocName>`). */
const CLOUD_SPEC_DOCS: Record<string, string> = {
	ipSpace: 'Ipamsvc',
	ipAddress: 'Ipamsvc',
	addressBlock: 'Ipamsvc',
	subnet: 'Ipamsvc',
	dhcpRange: 'Ipamsvc',
	fixedAddress: 'Ipamsvc',
	dnsZone: 'DnsConfig',
	dnsRecord: 'DnsData',
	tdAccessCode: 'Atcfw',
	tdApplicationFilter: 'Atcfw',
	tdCategoryFilter: 'Atcfw',
	tdInternalDomainList: 'Atcfw',
	tdNamedList: 'Atcfw',
	tdScheduledReport: 'Atcfw',
	epDeviceGroup: 'Atcep',
	epRoamingDevice: 'Atcep',
	epVpnProfile: 'Atcep',
	dfpService: 'Atcdfp',
	ladLookalikeDomain: 'Tdlad',
	ladLookalikeTarget: 'Tdlad',
	redirectCustomRedirect: 'Redirect',
	socInsight: 'Insights_NewAPI',
	tideThreat: 'TIDEData',
	tideBatch: 'TIDEData',
	infraHost: 'Infrastructure',
	infraService: 'Infrastructure',
	location: 'Locations',
	auditLog: 'AuditLog',
	serviceLog: 'cfl',
	authnProfileLdap: 'Authnapi',
	authnProfileOidc: 'Authnapi',
	authnProfileSaml: 'Authnapi',
	ntpServiceConfig: 'NTPService',
	identityUser: 'Identity',
	identityGroup: 'Identity',
	identityCompartment: 'Identity',
	dhcpLease: 'DhcpLeases',
	dhcpFingerprint: 'DhcpLeases',
	cdcApplication: 'CDC',
	cdcDestinationHttp: 'CDC',
	cdcDestinationSplunk: 'CDC',
	cdcDestinationSyslog: 'CDC',
	cdcHost: 'CDC',
};

/** NIOS object type → swagger service file (`.../openspec/v<ver>/<service>.json`). */
const NIOS_SERVICE_BY_OBJECT: Record<string, string> = {
	'record:a': 'dns',
	'record:aaaa': 'dns',
	'record:cname': 'dns',
	'record:host': 'dns',
	'record:ptr': 'dns',
	'record:txt': 'dns',
	zone_auth: 'dns',
	view: 'dns',
	network: 'ipam',
	networkview: 'ipam',
	range: 'ipam',
	fixedaddress: 'dhcp',
	grid: 'grid',
	member: 'grid',
};

/* -------------------------------------------------------------------------- */
/*                              Spec fetch + cache                            */
/* -------------------------------------------------------------------------- */

interface OpenApiSpec {
	swagger?: string;
	openapi?: string;
	basePath?: string;
	paths?: Record<string, IDataObject>;
	definitions?: Record<string, IDataObject>;
	components?: { schemas?: Record<string, IDataObject> };
}

/** Module-level cache keyed by spec URL; stores the in-flight promise to dedupe. */
const specCache = new Map<string, Promise<OpenApiSpec>>();

async function fetchSpec(ctx: ILoadOptionsFunctions, url: string): Promise<OpenApiSpec> {
	const cached = specCache.get(url);
	if (cached) {
		return cached;
	}

	const request = ctx.helpers
		.httpRequest({
			method: 'GET',
			url,
			json: true,
			headers: { Accept: 'application/json' },
		})
		.then((response) => response as OpenApiSpec)
		.catch((error) => {
			// Drop failed fetches from the cache so a later retry can succeed.
			specCache.delete(url);
			throw error;
		});

	specCache.set(url, request);
	return request;
}

/* -------------------------------------------------------------------------- */
/*                              Schema resolution                             */
/* -------------------------------------------------------------------------- */

function resolveRef(spec: OpenApiSpec, ref: string): IDataObject | undefined {
	// Supports Swagger 2.0 (#/definitions/X) and OpenAPI 3.0 (#/components/schemas/X).
	const parts = ref.replace(/^#\//, '').split('/');
	let current: unknown = spec;

	for (const part of parts) {
		if (current && typeof current === 'object') {
			current = (current as IDataObject)[part];
		} else {
			return undefined;
		}
	}

	return current && typeof current === 'object' ? (current as IDataObject) : undefined;
}

/** Pull the request body schema for the first usable method on a path. */
function findBodySchema(
	spec: OpenApiSpec,
	pathItem: IDataObject,
	methods: string[],
): IDataObject | undefined {
	for (const method of methods) {
		const op = pathItem[method] as IDataObject | undefined;
		if (!op) {
			continue;
		}

		// Swagger 2.0 — parameters with `in: body`.
		const parameters = op.parameters as IDataObject[] | undefined;
		if (Array.isArray(parameters)) {
			const bodyParam = parameters.find((p) => p.in === 'body');
			const schema = bodyParam?.schema as IDataObject | undefined;
			if (schema) {
				return schema;
			}
		}

		// OpenAPI 3.0 — requestBody.content[...].schema.
		const requestBody = op.requestBody as IDataObject | undefined;
		const content = requestBody?.content as Record<string, IDataObject> | undefined;
		if (content) {
			const media = content['application/json'] ?? Object.values(content)[0];
			const schema = media?.schema as IDataObject | undefined;
			if (schema) {
				return schema;
			}
		}
	}

	return undefined;
}

/** Flatten a schema (resolving $ref / allOf) into its property map and required list. */
function collectProperties(
	spec: OpenApiSpec,
	schema: IDataObject | undefined,
	seen: Set<string> = new Set(),
): { properties: Record<string, IDataObject>; required: Set<string> } {
	const properties: Record<string, IDataObject> = {};
	const required = new Set<string>();

	if (!schema) {
		return { properties, required };
	}

	if (typeof schema.$ref === 'string') {
		if (seen.has(schema.$ref)) {
			return { properties, required };
		}
		seen.add(schema.$ref);
		const resolved = resolveRef(spec, schema.$ref);
		return collectProperties(spec, resolved, seen);
	}

	if (Array.isArray(schema.allOf)) {
		for (const part of schema.allOf as IDataObject[]) {
			const nested = collectProperties(spec, part, seen);
			Object.assign(properties, nested.properties);
			nested.required.forEach((name) => required.add(name));
		}
	}

	if (Array.isArray(schema.required)) {
		(schema.required as string[]).forEach((name) => required.add(name));
	}

	const ownProps = schema.properties as Record<string, IDataObject> | undefined;
	if (ownProps) {
		Object.assign(properties, ownProps);
	}

	return { properties, required };
}

const SKIP_PROPERTIES = new Set(['id', '_ref']);

function mapFieldType(prop: IDataObject): { type: FieldType; options?: INodePropertyOptions[] } {
	if (Array.isArray(prop.enum)) {
		const options = (prop.enum as Array<string | number>).map((value) => ({
			name: String(value),
			value,
		}));
		return { type: 'options', options };
	}

	switch (prop.type) {
		case 'integer':
		case 'number':
			return { type: 'number' };
		case 'boolean':
			return { type: 'boolean' };
		case 'array':
			return { type: 'array' };
		case 'object':
			return { type: 'object' };
		case 'string':
			return { type: prop.format === 'date-time' ? 'dateTime' : 'string' };
		default:
			// $ref / composed objects fall through to free-form JSON object.
			return { type: 'object' };
	}
}

/** Turn a resolved body schema into n8n resource-mapper columns. */
function schemaToFields(spec: OpenApiSpec, schema: IDataObject | undefined): ResourceMapperField[] {
	const { properties, required } = collectProperties(spec, schema);
	const fields: ResourceMapperField[] = [];

	for (const [name, prop] of Object.entries(properties)) {
		if (SKIP_PROPERTIES.has(name) || prop.readOnly === true) {
			continue;
		}

		const { type, options } = mapFieldType(prop);
		const field: ResourceMapperField = {
			id: name,
			displayName: name,
			required: required.has(name),
			defaultMatch: false,
			canBeUsedToMatch: false,
			display: true,
			type,
		};

		if (options) {
			field.options = options;
		}

		fields.push(field);
	}

	fields.sort((a, b) => {
		if (a.required !== b.required) {
			return a.required ? -1 : 1;
		}
		return a.id.localeCompare(b.id);
	});

	return fields;
}

/* -------------------------------------------------------------------------- */
/*                              URL construction                              */
/* -------------------------------------------------------------------------- */

async function getCloudSpecBaseUrl(ctx: ILoadOptionsFunctions): Promise<string> {
	const credentials = await ctx.getCredentials('infobloxCspApi');
	const realm = credentials.realm as string;
	const customBaseUrl = credentials.customBaseUrl as string | undefined;
	return normalizeBaseUrl(realm === 'custom' ? customBaseUrl ?? '' : realm);
}

function pathKeyForEndpoint(spec: OpenApiSpec, endpoint: string): string {
	const basePath = (spec.basePath ?? '').replace(/\/+$/, '');
	if (basePath && endpoint.startsWith(basePath)) {
		return endpoint.slice(basePath.length);
	}
	return endpoint;
}

/* -------------------------------------------------------------------------- */
/*                          Resource mapper entry point                      */
/* -------------------------------------------------------------------------- */

async function getCloudMappingFields(ctx: ILoadOptionsFunctions): Promise<ResourceMapperFields> {
	const resource = ctx.getNodeParameter('resource', '') as string;
	const operation = ctx.getNodeParameter('operation', 'create') as string;
	const doc = CLOUD_SPEC_DOCS[resource];
	const endpoint = CLOUD_ENDPOINTS[resource];

	if (!doc || !endpoint) {
		return { fields: [], emptyFieldsNotice: 'No schema is available for this resource.' };
	}

	const baseUrl = await getCloudSpecBaseUrl(ctx);
	const spec = await fetchSpec(ctx, `${baseUrl}/apidoc/docs/${doc}`);

	const pathItem = spec.paths?.[pathKeyForEndpoint(spec, endpoint)];
	if (!pathItem) {
		return { fields: [], emptyFieldsNotice: 'No schema is available for this resource.' };
	}

	const methods =
		operation === 'update'
			? [getCloudUpdateMethod(resource).toLowerCase(), 'put', 'patch', 'post']
			: ['post', 'put'];

	const schema = findBodySchema(spec, pathItem, methods);
	const fields = schemaToFields(spec, schema);

	if (fields.length === 0) {
		return {
			fields,
			emptyFieldsNotice:
				'No mappable fields found in the API schema — use the JSON Body field instead.',
		};
	}

	return { fields };
}

async function getNiosMappingFields(ctx: ILoadOptionsFunctions): Promise<ResourceMapperFields> {
	const objectTypeParam = ctx.getNodeParameter('objectType', '') as string;
	const objectType =
		objectTypeParam === 'custom'
			? (ctx.getNodeParameter('customObjectType', '') as string)
			: objectTypeParam;

	const service = NIOS_SERVICE_BY_OBJECT[objectType];
	if (!service) {
		return {
			fields: [],
			emptyFieldsNotice: 'No schema is available for this object type — use the JSON Body field.',
		};
	}

	const credentials = await ctx.getCredentials('infobloxNiosApi');
	const wapiVersion = (credentials.wapiVersion as string) || '2.13.7';
	const url = `https://infobloxopen.github.io/nios-swagger/swagger-ui/openspec/v${wapiVersion}/${service}.json`;
	const spec = await fetchSpec(ctx, url);

	const pathItem = spec.paths?.[`/${objectType}`];
	if (!pathItem) {
		return { fields: [], emptyFieldsNotice: 'No schema is available for this object type.' };
	}

	const schema = findBodySchema(spec, pathItem, ['post', 'put']);
	const fields = schemaToFields(spec, schema);

	if (fields.length === 0) {
		return {
			fields,
			emptyFieldsNotice:
				'No mappable fields found in the API schema — use the JSON Body field instead.',
		};
	}

	return { fields };
}

/**
 * Resource-mapper loader: returns the create/update columns for the currently
 * selected resource by fetching the matching Infoblox swagger spec at runtime.
 */
export async function getMappingColumns(
	this: ILoadOptionsFunctions,
): Promise<ResourceMapperFields> {
	const resource = this.getNodeParameter('resource', '') as string;

	try {
		if (NIOS_RESOURCES.includes(resource)) {
			return await getNiosMappingFields(this);
		}
		return await getCloudMappingFields(this);
	} catch {
		// Never hard-fail the editor — fall back to the JSON Body field.
		return {
			fields: [],
			emptyFieldsNotice: 'Could not load the API schema — use the JSON Body field instead.',
		};
	}
}
