import type { INodeProperties } from 'n8n-workflow';

import { buildResourceMapper } from './SharedDescription';

/* -------------------------------------------------------------------------- */
/*                                 Operations                                  */
/* -------------------------------------------------------------------------- */

const niosOperationSelectors: INodeProperties[] = [
	// WAPI object CRUD
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['niosObject'] } },
		options: [
			{ name: 'Create', value: 'create', action: 'Create a WAPI object' },
			{ name: 'Delete', value: 'delete', action: 'Delete a WAPI object' },
			{ name: 'Get', value: 'get', action: 'Get a WAPI object' },
			{ name: 'Get Many', value: 'getAll', action: 'Get many WAPI objects' },
			{ name: 'Update', value: 'update', action: 'Update a WAPI object' },
		],
		default: 'getAll',
	},
	// Custom WAPI request
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['niosCustom'] } },
		options: [{ name: 'Send Request', value: 'send', action: 'Send a custom WAPI request' }],
		default: 'send',
	},
];

/* -------------------------------------------------------------------------- */
/*                              WAPI object fields                             */
/* -------------------------------------------------------------------------- */

const niosObjectFields: INodeProperties[] = [
	{
		displayName: 'Object Type',
		name: 'objectType',
		type: 'options',
		options: [
			{ name: 'A Record', value: 'record:a' },
			{ name: 'AAAA Record', value: 'record:aaaa' },
			{ name: 'Authoritative Zone', value: 'zone_auth' },
			{ name: 'CNAME Record', value: 'record:cname' },
			{ name: 'Custom', value: 'custom' },
			{ name: 'Fixed Address', value: 'fixedaddress' },
			{ name: 'Grid', value: 'grid' },
			{ name: 'Host Record', value: 'record:host' },
			{ name: 'Member', value: 'member' },
			{ name: 'Network', value: 'network' },
			{ name: 'Network View', value: 'networkview' },
			{ name: 'PTR Record', value: 'record:ptr' },
			{ name: 'Range', value: 'range' },
			{ name: 'TXT Record', value: 'record:txt' },
			{ name: 'View', value: 'view' },
		],
		default: 'record:host',
		displayOptions: { show: { resource: ['niosObject'] } },
	},
	{
		displayName: 'Custom Object Type',
		name: 'customObjectType',
		type: 'string',
		default: '',
		placeholder: 'record:mx',
		displayOptions: { show: { resource: ['niosObject'], objectType: ['custom'] } },
	},
	{
		displayName: 'Object Reference',
		name: 'objectReference',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'record:host/ZG5zLm...',
		displayOptions: {
			show: { resource: ['niosObject'], operation: ['get', 'update', 'delete'] },
		},
		description: 'The WAPI _ref value returned by Infoblox',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		displayOptions: { show: { resource: ['niosObject'], operation: ['getAll'] } },
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: { minValue: 1 },
		default: 50,
		displayOptions: {
			show: { resource: ['niosObject'], operation: ['getAll'], returnAll: [false] },
		},
		description: 'Max number of results to return',
	},
	buildResourceMapper(['niosObject']),
	{
		displayName: 'JSON Body',
		name: 'jsonBody',
		type: 'json',
		default: '{}',
		displayOptions: { show: { resource: ['niosObject'], operation: ['create', 'update'] } },
		description:
			'Additional request body as JSON, merged over the mapped fields above. Use for fields not present in the API schema, or when no schema is available.',
	},
];

/* -------------------------------------------------------------------------- */
/*                            Custom WAPI request fields                      */
/* -------------------------------------------------------------------------- */

const niosCustomFields: INodeProperties[] = [
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
		displayOptions: { show: { resource: ['niosCustom'] } },
	},
	{
		displayName: 'Endpoint',
		name: 'customEndpoint',
		type: 'string',
		required: true,
		default: '',
		placeholder: '/record:a',
		displayOptions: { show: { resource: ['niosCustom'] } },
		description: 'Endpoint path, with or without the /wapi/vX.Y prefix',
	},
	{
		displayName: 'JSON Body',
		name: 'customJsonBody',
		type: 'json',
		default: '{}',
		displayOptions: {
			show: { resource: ['niosCustom'] },
			hide: { customMethod: ['GET', 'DELETE'] },
		},
		description: 'Request body as JSON',
	},
];

export const niosDescription: INodeProperties[] = [
	...niosOperationSelectors,
	...niosObjectFields,
	...niosCustomFields,
];
