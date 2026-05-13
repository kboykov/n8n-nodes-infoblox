import {
	NodeConnectionTypes,
	NodeOperationError,
	type IDataObject,
	type IExecuteFunctions,
	type IHttpRequestMethods,
	type IHttpRequestOptions,
	type INodeExecutionData,
	type INodeProperties,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

type QueryParameterCollection = {
	parameters?: Array<{
		name?: string;
		value?: string | number | boolean;
	}>;
};

const CLOUD_ENDPOINTS: Record<string, string> = {
	ipSpace: '/api/ddi/v1/ipam/ip_space',
	ipAddress: '/api/ddi/v1/ipam/address',
	addressBlock: '/api/ddi/v1/ipam/address_block',
	subnet: '/api/ddi/v1/ipam/subnet',
	dhcpRange: '/api/ddi/v1/ipam/range',
	fixedAddress: '/api/ddi/v1/dhcp/fixed_address',
	dnsZone: '/api/ddi/v1/dns/auth_zone',
	dnsRecord: '/api/ddi/v1/dns/record',
};

const cloudOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'cloudOperation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				platform: ['cloud'],
				cloudResource: [
					'ipSpace',
					'ipAddress',
					'addressBlock',
					'subnet',
					'dhcpRange',
					'fixedAddress',
					'dnsZone',
					'dnsRecord',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a resource',
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a resource',
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a resource',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many resources',
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a resource',
			},
		],
		default: 'getAll',
	},
	{
		displayName: 'Resource ID',
		name: 'resourceId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				platform: ['cloud'],
				cloudOperation: ['get', 'update', 'delete'],
			},
			hide: {
				cloudResource: ['custom'],
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
				platform: ['cloud'],
				cloudOperation: ['getAll'],
			},
			hide: {
				cloudResource: ['custom'],
			},
		},
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: {
			minValue: 1,
		},
		default: 50,
		displayOptions: {
			show: {
				platform: ['cloud'],
				cloudOperation: ['getAll'],
				returnAll: [false],
			},
			hide: {
				cloudResource: ['custom'],
			},
		},
		description: 'Max number of results to return',
	},
	{
		displayName: 'JSON Body',
		name: 'jsonBody',
		type: 'json',
		default: '{}',
		displayOptions: {
			show: {
				platform: ['cloud'],
				cloudOperation: ['create', 'update'],
			},
			hide: {
				cloudResource: ['custom'],
			},
		},
		description: 'Request body as JSON',
	},
	{
		displayName: 'HTTP Method',
		name: 'customMethod',
		type: 'options',
		options: [
			{
				name: 'DELETE',
				value: 'DELETE',
			},
			{
				name: 'GET',
				value: 'GET',
			},
			{
				name: 'PATCH',
				value: 'PATCH',
			},
			{
				name: 'POST',
				value: 'POST',
			},
			{
				name: 'PUT',
				value: 'PUT',
			},
		],
		default: 'GET',
		displayOptions: {
			show: {
				platform: ['cloud'],
				cloudResource: ['custom'],
			},
		},
	},
	{
		displayName: 'Endpoint',
		name: 'customEndpoint',
		type: 'string',
		required: true,
		default: '',
		placeholder: '/api/ddi/v1/ipam/ip_space',
		displayOptions: {
			show: {
				platform: ['cloud'],
				cloudResource: ['custom'],
			},
		},
		description: 'Endpoint path. Absolute CSP URLs are also accepted.',
	},
	{
		displayName: 'JSON Body',
		name: 'customJsonBody',
		type: 'json',
		default: '{}',
		displayOptions: {
			show: {
				platform: ['cloud'],
				cloudResource: ['custom'],
			},
			hide: {
				customMethod: ['GET', 'DELETE'],
			},
		},
		description: 'Request body as JSON',
	},
];

const niosOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'niosOperation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				platform: ['nios'],
				niosResource: ['object'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a WAPI object',
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a WAPI object',
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a WAPI object',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many WAPI objects',
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a WAPI object',
			},
		],
		default: 'getAll',
	},
	{
		displayName: 'Object Type',
		name: 'objectType',
		type: 'options',
		options: [
			{
				name: 'A Record',
				value: 'record:a',
			},
			{
				name: 'AAAA Record',
				value: 'record:aaaa',
			},
			{
				name: 'Authoritative Zone',
				value: 'zone_auth',
			},
			{
				name: 'CNAME Record',
				value: 'record:cname',
			},
			{
				name: 'Custom',
				value: 'custom',
			},
			{
				name: 'Fixed Address',
				value: 'fixedaddress',
			},
			{
				name: 'Grid',
				value: 'grid',
			},
			{
				name: 'Host Record',
				value: 'record:host',
			},
			{
				name: 'Member',
				value: 'member',
			},
			{
				name: 'Network',
				value: 'network',
			},
			{
				name: 'Network View',
				value: 'networkview',
			},
			{
				name: 'PTR Record',
				value: 'record:ptr',
			},
			{
				name: 'Range',
				value: 'range',
			},
			{
				name: 'TXT Record',
				value: 'record:txt',
			},
			{
				name: 'View',
				value: 'view',
			},
		],
		default: 'record:host',
		displayOptions: {
			show: {
				platform: ['nios'],
				niosResource: ['object'],
			},
		},
	},
	{
		displayName: 'Custom Object Type',
		name: 'customObjectType',
		type: 'string',
		default: '',
		placeholder: 'record:mx',
		displayOptions: {
			show: {
				platform: ['nios'],
				niosResource: ['object'],
				objectType: ['custom'],
			},
		},
	},
	{
		displayName: 'Object Reference',
		name: 'objectReference',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'record:host/ZG5zLm...',
		displayOptions: {
			show: {
				platform: ['nios'],
				niosResource: ['object'],
				niosOperation: ['get', 'update', 'delete'],
			},
		},
		description: 'The WAPI _ref value returned by Infoblox',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				platform: ['nios'],
				niosResource: ['object'],
				niosOperation: ['getAll'],
			},
		},
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: {
			minValue: 1,
		},
		default: 50,
		displayOptions: {
			show: {
				platform: ['nios'],
				niosResource: ['object'],
				niosOperation: ['getAll'],
				returnAll: [false],
			},
		},
		description: 'Max number of results to return',
	},
	{
		displayName: 'JSON Body',
		name: 'jsonBody',
		type: 'json',
		default: '{}',
		displayOptions: {
			show: {
				platform: ['nios'],
				niosResource: ['object'],
				niosOperation: ['create', 'update'],
			},
		},
		description: 'Request body as JSON',
	},
	{
		displayName: 'HTTP Method',
		name: 'customMethod',
		type: 'options',
		options: [
			{
				name: 'DELETE',
				value: 'DELETE',
			},
			{
				name: 'GET',
				value: 'GET',
			},
			{
				name: 'PATCH',
				value: 'PATCH',
			},
			{
				name: 'POST',
				value: 'POST',
			},
			{
				name: 'PUT',
				value: 'PUT',
			},
		],
		default: 'GET',
		displayOptions: {
			show: {
				platform: ['nios'],
				niosResource: ['custom'],
			},
		},
	},
	{
		displayName: 'Endpoint',
		name: 'customEndpoint',
		type: 'string',
		required: true,
		default: '',
		placeholder: '/record:a',
		displayOptions: {
			show: {
				platform: ['nios'],
				niosResource: ['custom'],
			},
		},
		description: 'Endpoint path, with or without the /wapi/vX.Y prefix',
	},
	{
		displayName: 'JSON Body',
		name: 'customJsonBody',
		type: 'json',
		default: '{}',
		displayOptions: {
			show: {
				platform: ['nios'],
				niosResource: ['custom'],
			},
			hide: {
				customMethod: ['GET', 'DELETE'],
			},
		},
		description: 'Request body as JSON',
	},
];

const queryParameters: INodeProperties[] = [
	{
		displayName: 'Query Parameters',
		name: 'queryParameters',
		type: 'fixedCollection',
		placeholder: 'Add Query Parameter',
		default: {},
		typeOptions: {
			multipleValues: true,
		},
		options: [
			{
				displayName: 'Parameter',
				name: 'parameters',
				values: [
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
					},
				],
			},
		],
		description:
			'Additional query parameters. For Universal DDI filters, use names like _filter or _fields.',
	},
];

export class Infoblox implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Infoblox',
		name: 'infoblox',
		icon: 'file:infoblox.svg',
		group: ['input'],
		version: 1,
		subtitle:
			'={{$parameter["platform"] === "cloud" ? $parameter["cloudResource"] : $parameter["niosResource"]}}',
		description: 'Work with Infoblox Universal DDI and NIOS WAPI',
		defaults: {
			name: 'Infoblox',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'infobloxCspApi',
				required: true,
				displayOptions: {
					show: {
						platform: ['cloud'],
					},
				},
			},
			{
				name: 'infobloxNiosApi',
				required: true,
				displayOptions: {
					show: {
						platform: ['nios'],
					},
				},
			},
		],
		properties: [
			{
				displayName: 'Platform',
				name: 'platform',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Infoblox Portal / Universal DDI',
						value: 'cloud',
					},
					{
						name: 'NIOS WAPI',
						value: 'nios',
					},
				],
				default: 'cloud',
			},
			{
				displayName: 'Resource',
				name: 'cloudResource',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						platform: ['cloud'],
					},
				},
				options: [
					{
						name: 'Address Block',
						value: 'addressBlock',
					},
					{
						name: 'Custom API Request',
						value: 'custom',
					},
					{
						name: 'DNS Authoritative Zone',
						value: 'dnsZone',
					},
					{
						name: 'DNS Record',
						value: 'dnsRecord',
					},
					{
						name: 'Fixed Address',
						value: 'fixedAddress',
					},
					{
						name: 'IP Address',
						value: 'ipAddress',
					},
					{
						name: 'IP Space',
						value: 'ipSpace',
					},
					{
						name: 'IPAM Range',
						value: 'dhcpRange',
					},
					{
						name: 'Subnet',
						value: 'subnet',
					},
				],
				default: 'ipSpace',
			},
			{
				displayName: 'Resource',
				name: 'niosResource',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						platform: ['nios'],
					},
				},
				options: [
					{
						name: 'Custom API Request',
						value: 'custom',
					},
					{
						name: 'WAPI Object',
						value: 'object',
					},
				],
				default: 'object',
			},
			...cloudOperations,
			...niosOperations,
			...queryParameters,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const platform = this.getNodeParameter('platform', itemIndex) as string;
				const responseData =
					platform === 'cloud'
						? await executeCloudOperation.call(this, itemIndex)
						: await executeNiosOperation.call(this, itemIndex);

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(toOutputItems(responseData)),
					{ itemData: { item: itemIndex } },
				);
				returnData.push(...executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: error instanceof Error ? error.message : String(error),
						},
						pairedItem: {
							item: itemIndex,
						},
					});
					continue;
				}

				if (error instanceof Error) {
					throw new NodeOperationError(this.getNode(), error, { itemIndex });
				}

				throw new NodeOperationError(this.getNode(), String(error), { itemIndex });
			}
		}

		return [returnData];
	}
}

async function executeCloudOperation(this: IExecuteFunctions, itemIndex: number): Promise<unknown> {
	const cloudResource = this.getNodeParameter('cloudResource', itemIndex) as string;
	const qs = getQueryParameters(this, itemIndex);

	if (cloudResource === 'custom') {
		const method = this.getNodeParameter('customMethod', itemIndex) as IHttpRequestMethods;
		const endpoint = this.getNodeParameter('customEndpoint', itemIndex) as string;
		const body = ['GET', 'DELETE'].includes(method)
			? undefined
			: parseJsonParameter(this.getNodeParameter('customJsonBody', itemIndex, {}));

		return infobloxCloudRequest.call(this, method, endpoint, qs, body);
	}

	const operation = this.getNodeParameter('cloudOperation', itemIndex) as string;
	const endpoint = CLOUD_ENDPOINTS[cloudResource];

	if (operation === 'getAll') {
		const returnAll = this.getNodeParameter('returnAll', itemIndex) as boolean;
		const limit = this.getNodeParameter('limit', itemIndex, 50) as number;

		return getManyCloudItems.call(this, endpoint, qs, returnAll, limit);
	}

	if (operation === 'create') {
		const body = parseJsonParameter(this.getNodeParameter('jsonBody', itemIndex, {}));

		return infobloxCloudRequest.call(this, 'POST', endpoint, qs, body);
	}

	const resourceId = this.getNodeParameter('resourceId', itemIndex) as string;
	const itemEndpoint = `${endpoint}/${encodeURIComponent(resourceId)}`;

	if (operation === 'get') {
		return infobloxCloudRequest.call(this, 'GET', itemEndpoint, qs);
	}

	if (operation === 'delete') {
		return infobloxCloudRequest.call(this, 'DELETE', itemEndpoint, qs);
	}

	const body = parseJsonParameter(this.getNodeParameter('jsonBody', itemIndex, {}));

	return infobloxCloudRequest.call(this, 'PATCH', itemEndpoint, qs, body);
}

async function executeNiosOperation(this: IExecuteFunctions, itemIndex: number): Promise<unknown> {
	const niosResource = this.getNodeParameter('niosResource', itemIndex) as string;
	const qs = getQueryParameters(this, itemIndex);

	if (niosResource === 'custom') {
		const method = this.getNodeParameter('customMethod', itemIndex) as IHttpRequestMethods;
		const endpoint = this.getNodeParameter('customEndpoint', itemIndex) as string;
		const body = ['GET', 'DELETE'].includes(method)
			? undefined
			: parseJsonParameter(this.getNodeParameter('customJsonBody', itemIndex, {}));

		return infobloxNiosRequest.call(this, method, endpoint, qs, body);
	}

	const operation = this.getNodeParameter('niosOperation', itemIndex) as string;

	if (operation === 'getAll') {
		const returnAll = this.getNodeParameter('returnAll', itemIndex) as boolean;
		const limit = this.getNodeParameter('limit', itemIndex, 50) as number;
		const objectType = getNiosObjectType(this, itemIndex);

		return getManyNiosItems.call(this, objectType, qs, returnAll, limit);
	}

	if (operation === 'create') {
		const objectType = getNiosObjectType(this, itemIndex);
		const body = parseJsonParameter(this.getNodeParameter('jsonBody', itemIndex, {}));

		return infobloxNiosRequest.call(this, 'POST', `/${encodeURIComponent(objectType)}`, qs, body);
	}

	const objectReference = this.getNodeParameter('objectReference', itemIndex) as string;
	const endpoint = `/${encodeWapiReference(objectReference)}`;

	if (operation === 'get') {
		return infobloxNiosRequest.call(this, 'GET', endpoint, qs);
	}

	if (operation === 'delete') {
		return infobloxNiosRequest.call(this, 'DELETE', endpoint, qs);
	}

	const body = parseJsonParameter(this.getNodeParameter('jsonBody', itemIndex, {}));

	return infobloxNiosRequest.call(this, 'PUT', endpoint, qs, body);
}

async function getManyCloudItems(
	this: IExecuteFunctions,
	endpoint: string,
	qs: IDataObject,
	returnAll: boolean,
	limit: number,
): Promise<unknown> {
	if (!returnAll) {
		const response = await infobloxCloudRequest.call(this, 'GET', endpoint, {
			...qs,
			_limit: limit,
		});

		return extractList(response) ?? response;
	}

	const allItems: IDataObject[] = [];
	const pageSize = 100;
	let offset = 0;

	while (true) {
		const response = await infobloxCloudRequest.call(this, 'GET', endpoint, {
			...qs,
			_limit: pageSize,
			_offset: offset,
		});
		const pageItems = extractList(response);

		if (!pageItems) {
			return response;
		}

		allItems.push(...pageItems);

		if (pageItems.length < pageSize) {
			break;
		}

		offset += pageItems.length;
	}

	return allItems;
}

async function getManyNiosItems(
	this: IExecuteFunctions,
	objectType: string,
	qs: IDataObject,
	returnAll: boolean,
	limit: number,
): Promise<unknown> {
	if (!returnAll) {
		const response = await infobloxNiosRequest.call(
			this,
			'GET',
			`/${encodeURIComponent(objectType)}`,
			{
				...qs,
				_max_results: limit,
			},
		);

		return extractList(response) ?? response;
	}

	const allItems: IDataObject[] = [];
	const pageSize = 1000;
	let pageId: string | undefined;

	while (true) {
		const requestQs: IDataObject = {
			...qs,
			_paging: 1,
			_return_as_object: 1,
			_max_results: pageSize,
		};

		if (pageId) {
			requestQs._page_id = pageId;
		}

		const response = await infobloxNiosRequest.call(
			this,
			'GET',
			`/${encodeURIComponent(objectType)}`,
			requestQs,
		);
		const pageItems = extractList(response);

		if (!pageItems) {
			return response;
		}

		allItems.push(...pageItems);

		if (!isDataObject(response) || typeof response.next_page_id !== 'string') {
			break;
		}

		pageId = response.next_page_id;
	}

	return allItems;
}

async function infobloxCloudRequest(
	this: IExecuteFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	qs: IDataObject,
	body?: IDataObject,
): Promise<unknown> {
	const credentials = await this.getCredentials('infobloxCspApi');
	const realm = credentials.realm as string;
	const customBaseUrl = credentials.customBaseUrl as string | undefined;
	const baseUrl = normalizeBaseUrl(realm === 'custom' ? customBaseUrl ?? '' : realm);
	const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${normalizePath(endpoint)}`;

	const options: IHttpRequestOptions = {
		method,
		url,
		qs,
		body,
		json: true,
		headers: {
			Accept: 'application/json',
		},
	};

	return this.helpers.httpRequestWithAuthentication.call(this, 'infobloxCspApi', options);
}

async function infobloxNiosRequest(
	this: IExecuteFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	qs: IDataObject,
	body?: IDataObject,
): Promise<unknown> {
	const credentials = await this.getCredentials('infobloxNiosApi');
	const baseUrl = normalizeBaseUrl(credentials.gridMasterUrl as string);
	const wapiVersion = credentials.wapiVersion as string;
	const normalizedEndpoint = normalizeNiosEndpoint(endpoint, wapiVersion);

	const options: IHttpRequestOptions = {
		method,
		url: `${baseUrl}${normalizedEndpoint}`,
		qs,
		body,
		json: true,
		skipSslCertificateValidation: credentials.ignoreSslIssues as boolean,
		headers: {
			Accept: 'application/json',
		},
	};

	return this.helpers.httpRequestWithAuthentication.call(this, 'infobloxNiosApi', options);
}

function getQueryParameters(executeFunctions: IExecuteFunctions, itemIndex: number): IDataObject {
	const queryParameters = executeFunctions.getNodeParameter(
		'queryParameters',
		itemIndex,
		{},
	) as QueryParameterCollection;

	return (queryParameters.parameters ?? []).reduce<IDataObject>((accumulator, parameter) => {
		if (parameter.name) {
			accumulator[parameter.name] = parameter.value ?? '';
		}

		return accumulator;
	}, {});
}

function getNiosObjectType(executeFunctions: IExecuteFunctions, itemIndex: number): string {
	const objectType = executeFunctions.getNodeParameter('objectType', itemIndex) as string;

	if (objectType !== 'custom') {
		return objectType;
	}

	return executeFunctions.getNodeParameter('customObjectType', itemIndex) as string;
}

function parseJsonParameter(value: unknown): IDataObject {
	if (value === undefined || value === null || value === '') {
		return {};
	}

	if (typeof value === 'object' && !Array.isArray(value)) {
		return value as IDataObject;
	}

	if (typeof value === 'string') {
		return JSON.parse(value) as IDataObject;
	}

	return {};
}

function extractList(response: unknown): IDataObject[] | undefined {
	if (Array.isArray(response)) {
		return response.map((item) => toDataObject(item));
	}

	if (!isDataObject(response)) {
		return undefined;
	}

	for (const key of ['results', 'result', 'items', 'data']) {
		const value = response[key];

		if (Array.isArray(value)) {
			return value.map((item) => toDataObject(item));
		}
	}

	return undefined;
}

function toOutputItems(responseData: unknown): IDataObject[] {
	if (Array.isArray(responseData)) {
		return responseData.map((item) => toDataObject(item));
	}

	return [toDataObject(responseData)];
}

function toDataObject(value: unknown): IDataObject {
	if (isDataObject(value)) {
		return value;
	}

	return {
		result: value as string | number | boolean | null,
	};
}

function isDataObject(value: unknown): value is IDataObject {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeBaseUrl(url: string): string {
	return url.replace(/\/+$/, '');
}

function normalizePath(path: string): string {
	return path.startsWith('/') ? path : `/${path}`;
}

function normalizeNiosEndpoint(endpoint: string, wapiVersion: string): string {
	const normalizedEndpoint = normalizePath(endpoint);

	if (normalizedEndpoint.startsWith('/wapi/')) {
		return normalizedEndpoint;
	}

	return `/wapi/v${wapiVersion}${normalizedEndpoint}`;
}

function encodeWapiReference(reference: string): string {
	return reference
		.split('/')
		.map((part) => encodeURIComponent(part))
		.join('/');
}
