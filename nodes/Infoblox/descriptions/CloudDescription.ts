import type { INodeProperties, INodePropertyOptions } from 'n8n-workflow';

import { FILTER_EXPRESSION_RESOURCES, STANDARD_CLOUD_RESOURCES } from '../constants';
import { buildResourceMapper } from './SharedDescription';

/* -------------------------------------------------------------------------- */
/*                                 Operations                                  */
/* -------------------------------------------------------------------------- */

interface ResourceNoun {
	singular: string;
	plural: string;
	article: string;
}

/**
 * Human-readable nouns per resource, used to generate meaningful action labels
 * for the n8n Actions panel (e.g. "Create a DNS record" instead of the generic
 * "Create a resource"). Acronyms are kept uppercase so the action-casing lint
 * rule treats them as exempt; every other word stays lowercase (sentence case).
 * Nouns follow the terminology used in the Infoblox API documentation.
 */
const RESOURCE_NOUNS: Record<string, ResourceNoun> = {
	ipSpace: { singular: 'IP space', plural: 'IP spaces', article: 'an' },
	ipAddress: { singular: 'IP address', plural: 'IP addresses', article: 'an' },
	addressBlock: { singular: 'address block', plural: 'address blocks', article: 'an' },
	subnet: { singular: 'subnet', plural: 'subnets', article: 'a' },
	dhcpRange: { singular: 'IPAM range', plural: 'IPAM ranges', article: 'an' },
	fixedAddress: { singular: 'fixed address', plural: 'fixed addresses', article: 'a' },
	dnsZone: { singular: 'DNS zone', plural: 'DNS zones', article: 'a' },
	dnsRecord: { singular: 'DNS record', plural: 'DNS records', article: 'a' },
	tdAccessCode: { singular: 'TD access code', plural: 'TD access codes', article: 'a' },
	tdApplicationFilter: {
		singular: 'TD application filter',
		plural: 'TD application filters',
		article: 'a',
	},
	tdCategoryFilter: { singular: 'TD category filter', plural: 'TD category filters', article: 'a' },
	tdInternalDomainList: {
		singular: 'TD internal domain list',
		plural: 'TD internal domain lists',
		article: 'a',
	},
	tdNamedList: { singular: 'TD named list', plural: 'TD named lists', article: 'a' },
	tdScheduledReport: { singular: 'TD scheduled report', plural: 'TD scheduled reports', article: 'a' },
	epDeviceGroup: { singular: 'roaming device group', plural: 'roaming device groups', article: 'a' },
	epRoamingDevice: { singular: 'roaming device', plural: 'roaming devices', article: 'a' },
	epVpnProfile: { singular: 'VPN profile', plural: 'VPN profiles', article: 'a' },
	dfpService: { singular: 'DFP service', plural: 'DFP services', article: 'a' },
	ladLookalikeDomain: { singular: 'lookalike domain', plural: 'lookalike domains', article: 'a' },
	ladLookalikeTarget: { singular: 'lookalike target', plural: 'lookalike targets', article: 'a' },
	redirectCustomRedirect: { singular: 'custom redirect', plural: 'custom redirects', article: 'a' },
	socInsight: { singular: 'SOC insight', plural: 'SOC insights', article: 'a' },
	tideBatch: { singular: 'TIDE batch', plural: 'TIDE batches', article: 'a' },
	tideThreat: { singular: 'TIDE threat', plural: 'TIDE threats', article: 'a' },
	auditLog: { singular: 'audit log entry', plural: 'audit log entries', article: 'an' },
	authnProfileLdap: { singular: 'LDAP auth profile', plural: 'LDAP auth profiles', article: 'an' },
	authnProfileOidc: { singular: 'OIDC auth profile', plural: 'OIDC auth profiles', article: 'an' },
	authnProfileSaml: { singular: 'SAML auth profile', plural: 'SAML auth profiles', article: 'a' },
	cdcApplication: { singular: 'CDC application', plural: 'CDC applications', article: 'a' },
	cdcDestinationHttp: { singular: 'CDC HTTP destination', plural: 'CDC HTTP destinations', article: 'a' },
	cdcDestinationSplunk: {
		singular: 'CDC splunk destination',
		plural: 'CDC splunk destinations',
		article: 'a',
	},
	cdcDestinationSyslog: {
		singular: 'CDC syslog destination',
		plural: 'CDC syslog destinations',
		article: 'a',
	},
	cdcHost: { singular: 'CDC host', plural: 'CDC hosts', article: 'a' },
	dhcpFingerprint: { singular: 'DHCP fingerprint', plural: 'DHCP fingerprints', article: 'a' },
	dhcpLease: { singular: 'DHCP lease', plural: 'DHCP leases', article: 'a' },
	identityCompartment: {
		singular: 'identity compartment',
		plural: 'identity compartments',
		article: 'an',
	},
	identityGroup: { singular: 'identity group', plural: 'identity groups', article: 'an' },
	identityUser: { singular: 'identity user', plural: 'identity users', article: 'an' },
	infraHost: { singular: 'infrastructure host', plural: 'infrastructure hosts', article: 'an' },
	infraService: {
		singular: 'infrastructure service',
		plural: 'infrastructure services',
		article: 'an',
	},
	location: { singular: 'location', plural: 'locations', article: 'a' },
	ntpServiceConfig: {
		singular: 'NTP service configuration',
		plural: 'NTP service configurations',
		article: 'an',
	},
	serviceLog: { singular: 'service log entry', plural: 'service log entries', article: 'a' },
};

type CrudOperation = 'create' | 'delete' | 'get' | 'getAll' | 'update';

/** Display order for the CRUD operation options. */
const CRUD_OPERATION_ORDER: CrudOperation[] = ['create', 'delete', 'get', 'getAll', 'update'];

/**
 * Resources that do not support the full CRUD set. The listed operations are the
 * only ones exposed by the Infoblox API for that resource (verified against the
 * swagger specs); resources not listed here support all five operations. This
 * keeps the Actions panel honest — e.g. logs are list-only, not create/delete.
 */
const RESOURCE_OPERATIONS: Record<string, CrudOperation[]> = {
	tdAccessCode: ['create', 'delete', 'get', 'getAll'],
	epRoamingDevice: ['get', 'getAll'],
	epVpnProfile: ['create', 'getAll', 'update'],
	dfpService: ['getAll', 'update'],
	ladLookalikeDomain: ['getAll'],
	ladLookalikeTarget: ['getAll'],
	socInsight: ['get', 'getAll'],
	tideThreat: ['getAll'],
	tideBatch: ['create', 'get', 'getAll'],
	auditLog: ['getAll'],
	serviceLog: ['getAll'],
	ntpServiceConfig: ['delete', 'get', 'getAll', 'update'],
	identityCompartment: ['create', 'get', 'getAll', 'update'],
	dhcpLease: ['getAll'],
	cdcHost: ['get', 'getAll'],
};

/** Build a per-resource CRUD operation selector with meaningful action labels. */
function buildCloudCrudSelector(resource: string): INodeProperties {
	const { singular, plural, article } = RESOURCE_NOUNS[resource] ?? {
		singular: 'resource',
		plural: 'resources',
		article: 'a',
	};

	const allOptions: Record<CrudOperation, INodePropertyOptions> = {
		create: {
			name: 'Create',
			value: 'create',
			action: `Create ${article} ${singular}`,
			description: `Create a new ${singular}`,
		},
		delete: {
			name: 'Delete',
			value: 'delete',
			action: `Delete ${article} ${singular}`,
			description: `Delete ${article} ${singular} by ID`,
		},
		get: {
			name: 'Get',
			value: 'get',
			action: `Get ${article} ${singular}`,
			description: `Get ${article} ${singular} by ID`,
		},
		getAll: {
			name: 'Get Many',
			value: 'getAll',
			action: `Get many ${plural}`,
			description: `Retrieve many ${plural}`,
		},
		update: {
			name: 'Update',
			value: 'update',
			action: `Update ${article} ${singular}`,
			description: `Update ${article} ${singular} by ID`,
		},
	};

	const allowed = RESOURCE_OPERATIONS[resource] ?? CRUD_OPERATION_ORDER;
	const options = CRUD_OPERATION_ORDER.filter((op) => allowed.includes(op)).map(
		(op) => allOptions[op],
	);

	return {
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: [resource] } },
		options,
		// Every cloud resource supports listing, so "Get Many" is always a safe default.
		default: 'getAll',
	};
}

const cloudOperationSelectors: INodeProperties[] = [
	// Per-resource CRUD selectors — one per resource so the Actions panel shows a
	// meaningful label (e.g. "Create a DNS record") instead of a generic placeholder.
	...STANDARD_CLOUD_RESOURCES.map(buildCloudCrudSelector),
	// DNS Event — time-range query
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['dnsEvent'] } },
		options: [{ name: 'Search', value: 'search', action: 'Search DNS events' }],
		default: 'search',
	},
	// TIDE Dossier Lookup
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['tideDossierLookup'] } },
		options: [{ name: 'Look Up', value: 'lookup', action: 'Look up an indicator' }],
		default: 'lookup',
	},
	// Global Search
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['globalSearch'] } },
		options: [{ name: 'Search', value: 'search', action: 'Run a global search' }],
		default: 'search',
	},
	// Custom API request
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['custom'] } },
		options: [{ name: 'Send Request', value: 'send', action: 'Send a custom API request' }],
		default: 'send',
	},
];

/* -------------------------------------------------------------------------- */
/*                              Standard CRUD fields                           */
/* -------------------------------------------------------------------------- */

const cloudCrudFields: INodeProperties[] = [
	{
		displayName: 'Resource ID',
		name: 'resourceId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: STANDARD_CLOUD_RESOURCES,
				operation: ['get', 'update', 'delete'],
			},
		},
		description: 'The Infoblox resource ID',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: STANDARD_CLOUD_RESOURCES,
				operation: ['getAll'],
			},
		},
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: { minValue: 1 },
		default: 50,
		displayOptions: {
			show: {
				resource: STANDARD_CLOUD_RESOURCES,
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		description: 'Max number of results to return',
	},
	buildResourceMapper(STANDARD_CLOUD_RESOURCES),
	{
		displayName: 'JSON Body',
		name: 'jsonBody',
		type: 'json',
		default: '{}',
		displayOptions: {
			show: {
				resource: STANDARD_CLOUD_RESOURCES,
				operation: ['create', 'update'],
			},
		},
		description:
			'Additional request body as JSON, merged over the mapped fields above. Use for fields not present in the API schema, or when no schema is available.',
	},
	{
		displayName: 'Filter Expression',
		name: 'filterExpression',
		type: 'string',
		default: '',
		placeholder: 'name=="default"',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: FILTER_EXPRESSION_RESOURCES,
			},
		},
		description:
			'Infoblox `_filter` expression applied server-side. Example: `name=="default"` or `address=="10.0.0.0"`. Leave empty to return all records.',
	},
];

/* -------------------------------------------------------------------------- */
/*                            DNS Event query fields                          */
/* -------------------------------------------------------------------------- */

const dnsEventFields: INodeProperties[] = [
	{
		displayName: 'Start Time',
		name: 'dnsEventT0',
		type: 'dateTime',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['dnsEvent'] } },
		description:
			'Start of the time range (inclusive). Accepts a date/time or a Unix epoch in seconds; sent to the API as `t0`.',
	},
	{
		displayName: 'End Time',
		name: 'dnsEventT1',
		type: 'dateTime',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['dnsEvent'] } },
		description:
			'End of the time range (exclusive). Accepts a date/time or a Unix epoch in seconds; sent to the API as `t1`.',
	},
	{
		displayName: 'Return All',
		name: 'dnsEventReturnAll',
		type: 'boolean',
		default: false,
		displayOptions: { show: { resource: ['dnsEvent'] } },
		description: 'Whether to return all DNS events or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'dnsEventLimit',
		type: 'number',
		typeOptions: { minValue: 1 },
		default: 100,
		displayOptions: { show: { resource: ['dnsEvent'], dnsEventReturnAll: [false] } },
		description: 'Max number of DNS events to return',
	},
	{
		displayName: 'Query Name',
		name: 'dnsEventQname',
		type: 'string',
		default: '',
		placeholder: 'malware.example.com',
		displayOptions: { show: { resource: ['dnsEvent'] } },
		description: 'Filter by the queried domain name (`qname`)',
	},
	{
		displayName: 'Query IP',
		name: 'dnsEventQip',
		type: 'string',
		default: '',
		placeholder: '192.0.2.10',
		displayOptions: { show: { resource: ['dnsEvent'] } },
		description: 'Filter by the IP address that made the query (`qip`)',
	},
	{
		displayName: 'Policy Name',
		name: 'dnsEventPolicy',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['dnsEvent'] } },
		description: 'Filter by the security policy that generated the event (`policy_name`)',
	},
	{
		displayName: 'Threat Class',
		name: 'dnsEventThreatClass',
		type: 'string',
		default: '',
		placeholder: 'Malware',
		displayOptions: { show: { resource: ['dnsEvent'] } },
		description: 'Filter by threat class (`threat_class`), e.g. Malware, Phishing, MalwareC2',
	},
];

/* -------------------------------------------------------------------------- */
/*                         TIDE Dossier Lookup fields                         */
/* -------------------------------------------------------------------------- */

const tideDossierFields: INodeProperties[] = [
	{
		displayName: 'Indicator Type',
		name: 'dossierIndicatorType',
		type: 'options',
		required: true,
		options: [
			{ name: 'Email', value: 'email' },
			{ name: 'Hash', value: 'hash' },
			{ name: 'Host', value: 'host' },
			{ name: 'IP Address', value: 'ip' },
			{ name: 'URL', value: 'url' },
		],
		default: 'host',
		displayOptions: { show: { resource: ['tideDossierLookup'] } },
		description: 'Type of indicator to look up in the TIDE Dossier',
	},
	{
		displayName: 'Indicator Value',
		name: 'dossierIndicatorValue',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['tideDossierLookup'] } },
		description: 'The indicator to look up (domain name, IP address, URL, file hash, or email)',
	},
	{
		displayName: 'Source',
		name: 'dossierSource',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['tideDossierLookup'] } },
		description: 'Optional TIDE source to query. Leave empty to query all available sources.',
	},
	{
		displayName: 'Wait for Results',
		name: 'dossierWait',
		type: 'boolean',
		default: true,
		displayOptions: { show: { resource: ['tideDossierLookup'] } },
		description: 'Whether to wait for the Dossier lookup job to complete before returning',
	},
];

/* -------------------------------------------------------------------------- */
/*                            Global Search fields                            */
/* -------------------------------------------------------------------------- */

const globalSearchFields: INodeProperties[] = [
	{
		displayName: 'Search Query',
		name: 'globalSearchQuery',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['globalSearch'] } },
		description: 'Search query string (3–300 characters)',
	},
	{
		displayName: 'Additional Options',
		name: 'globalSearchOptions',
		type: 'json',
		default: '{}',
		displayOptions: { show: { resource: ['globalSearch'] } },
		description:
			'Optional search parameters as JSON — e.g. filters, limit, offset, highlight, exact_token',
	},
];

/* -------------------------------------------------------------------------- */
/*                          Resource-specific filters                         */
/* -------------------------------------------------------------------------- */

const cloudFilterFields: INodeProperties[] = [
	// Audit Log — uses the shared Filter Expression field (the API only supports `_filter`)
	// Service Log
	{
		displayName: 'Service ID',
		name: 'serviceLogServiceId',
		type: 'string',
		default: '',
		displayOptions: { show: { operation: ['getAll'], resource: ['serviceLog'] } },
		description: 'Filter logs by service ID (`service_id`)',
	},
	{
		displayName: 'Container Name',
		name: 'serviceLogContainerName',
		type: 'string',
		default: '',
		displayOptions: { show: { operation: ['getAll'], resource: ['serviceLog'] } },
		description: 'Filter logs by the service container name (`container_name`)',
	},
	{
		displayName: 'On-Prem Host ID',
		name: 'serviceLogOphid',
		type: 'string',
		default: '',
		displayOptions: { show: { operation: ['getAll'], resource: ['serviceLog'] } },
		description: "Filter logs by the on-prem host's ID (`ophid`)",
	},
	{
		displayName: 'Start',
		name: 'serviceLogStart',
		type: 'dateTime',
		default: '',
		displayOptions: { show: { operation: ['getAll'], resource: ['serviceLog'] } },
		description: 'Only include logs from this moment forward (`start`)',
	},
	{
		displayName: 'End',
		name: 'serviceLogEnd',
		type: 'dateTime',
		default: '',
		displayOptions: { show: { operation: ['getAll'], resource: ['serviceLog'] } },
		description: 'Only include logs up to this moment (`end`)',
	},
	// SOC Insight
	{
		displayName: 'Status',
		name: 'socInsightStatus',
		type: 'options',
		options: [
			{ name: 'Any', value: '' },
			{ name: 'Active', value: 'Active' },
			{ name: 'Closed', value: 'Closed' },
		],
		default: '',
		displayOptions: { show: { operation: ['getAll'], resource: ['socInsight'] } },
		description: 'Filter SOC Insights by status',
	},
	// TIDE Threat
	{
		displayName: 'Indicator Type',
		name: 'tideThreatType',
		type: 'options',
		options: [
			{ name: 'Any', value: '' },
			{ name: 'Email', value: 'email' },
			{ name: 'Hash', value: 'hash' },
			{ name: 'Host', value: 'host' },
			{ name: 'IP Address', value: 'ip' },
			{ name: 'URL', value: 'url' },
		],
		default: '',
		displayOptions: { show: { operation: ['getAll'], resource: ['tideThreat'] } },
		description: 'Filter TIDE threat records by indicator type',
	},
	{
		displayName: 'Profile',
		name: 'tideThreatProfile',
		type: 'string',
		default: '',
		displayOptions: { show: { operation: ['getAll'], resource: ['tideThreat'] } },
		description: 'Filter TIDE threat records by profile name',
	},
	// NTP Service Config — uses the shared Filter Expression field (the API only supports `_filter`)
];

/* -------------------------------------------------------------------------- */
/*                            Custom API request fields                       */
/* -------------------------------------------------------------------------- */

const cloudCustomFields: INodeProperties[] = [
	{
		displayName: 'HTTP Method',
		name: 'customMethod',
		type: 'options',
		options: [
			{ name: 'DELETE', value: 'DELETE' },
			{ name: 'GET', value: 'GET' },
			{ name: 'PATCH', value: 'PATCH' },
			{ name: 'POST', value: 'POST' },
			{ name: 'PUT', value: 'PUT' },
		],
		default: 'GET',
		displayOptions: { show: { resource: ['custom'] } },
	},
	{
		displayName: 'Endpoint',
		name: 'customEndpoint',
		type: 'string',
		required: true,
		default: '',
		placeholder: '/api/ddi/v1/ipam/ip_space',
		displayOptions: { show: { resource: ['custom'] } },
		description: 'Endpoint path. Absolute CSP URLs are also accepted.',
	},
	{
		displayName: 'JSON Body',
		name: 'customJsonBody',
		type: 'json',
		default: '{}',
		displayOptions: {
			show: { resource: ['custom'] },
			hide: { customMethod: ['GET', 'DELETE'] },
		},
		description: 'Request body as JSON',
	},
];

export const cloudDescription: INodeProperties[] = [
	...cloudOperationSelectors,
	...cloudCrudFields,
	...dnsEventFields,
	...tideDossierFields,
	...globalSearchFields,
	...cloudFilterFields,
	...cloudCustomFields,
];
