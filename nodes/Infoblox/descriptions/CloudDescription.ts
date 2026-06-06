import type { INodeProperties } from 'n8n-workflow';

import { FILTER_EXPRESSION_RESOURCES, STANDARD_CLOUD_RESOURCES } from '../constants';

/* -------------------------------------------------------------------------- */
/*                                 Operations                                  */
/* -------------------------------------------------------------------------- */

const cloudOperationSelectors: INodeProperties[] = [
	// Standard CRUD operations shared by most cloud resources
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: STANDARD_CLOUD_RESOURCES,
			},
		},
		options: [
			{ name: 'Create', value: 'create', action: 'Create a resource' },
			{ name: 'Delete', value: 'delete', action: 'Delete a resource' },
			{ name: 'Get', value: 'get', action: 'Get a resource' },
			{ name: 'Get Many', value: 'getAll', action: 'Get many resources' },
			{ name: 'Update', value: 'update', action: 'Update a resource' },
		],
		default: 'getAll',
	},
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
		description: 'Request body as JSON',
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
		displayName: 'Start Time (T0)',
		name: 'dnsEventT0',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: { show: { resource: ['dnsEvent'] } },
		description: 'Start of time range as a Unix epoch timestamp (seconds)',
	},
	{
		displayName: 'End Time (T1)',
		name: 'dnsEventT1',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: { show: { resource: ['dnsEvent'] } },
		description: 'End of time range as a Unix epoch timestamp (seconds)',
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
		description: 'Filter DNS events by the queried domain name',
	},
	{
		displayName: 'Source IP',
		name: 'dnsEventSrcIp',
		type: 'string',
		default: '',
		placeholder: '192.0.2.10',
		displayOptions: { show: { resource: ['dnsEvent'] } },
		description: 'Filter DNS events by client source IP address',
	},
	{
		displayName: 'Policy Name',
		name: 'dnsEventPolicy',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['dnsEvent'] } },
		description: 'Filter DNS events by the security policy that generated them',
	},
	{
		displayName: 'Threat Type',
		name: 'dnsEventThreatType',
		type: 'string',
		default: '',
		placeholder: 'C&C',
		displayOptions: { show: { resource: ['dnsEvent'] } },
		description: 'Filter DNS events by threat type label (e.g. C&C, Malware, Phishing)',
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
	// Audit Log
	{
		displayName: 'Start Date',
		name: 'auditLogFrom',
		type: 'string',
		default: '',
		placeholder: '2024-01-01T00:00:00Z',
		displayOptions: { show: { operation: ['getAll'], resource: ['auditLog'] } },
		description: 'Return audit entries on or after this ISO 8601 date-time (maps to `t_from`)',
	},
	{
		displayName: 'End Date',
		name: 'auditLogTo',
		type: 'string',
		default: '',
		placeholder: '2024-12-31T23:59:59Z',
		displayOptions: { show: { operation: ['getAll'], resource: ['auditLog'] } },
		description: 'Return audit entries on or before this ISO 8601 date-time (maps to `t_to`)',
	},
	{
		displayName: 'Username',
		name: 'auditLogUsername',
		type: 'string',
		default: '',
		displayOptions: { show: { operation: ['getAll'], resource: ['auditLog'] } },
		description: 'Filter audit log entries by the user who performed the action',
	},
	{
		displayName: 'Action',
		name: 'auditLogAction',
		type: 'string',
		default: '',
		placeholder: 'Create',
		displayOptions: { show: { operation: ['getAll'], resource: ['auditLog'] } },
		description: 'Filter audit log entries by action type (e.g. Create, Update, Delete)',
	},
	// Service Log
	{
		displayName: 'Service Name',
		name: 'serviceLogService',
		type: 'string',
		default: '',
		displayOptions: { show: { operation: ['getAll'], resource: ['serviceLog'] } },
		description: 'Filter service logs by on-prem service name',
	},
	{
		displayName: 'Severity',
		name: 'serviceLogSeverity',
		type: 'options',
		options: [
			{ name: 'Any', value: '' },
			{ name: 'Debug', value: 'debug' },
			{ name: 'Error', value: 'error' },
			{ name: 'Info', value: 'info' },
			{ name: 'Warning', value: 'warn' },
		],
		default: '',
		displayOptions: { show: { operation: ['getAll'], resource: ['serviceLog'] } },
		description: 'Filter service logs by severity level',
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
	// NTP Service Config
	{
		displayName: 'Service ID',
		name: 'ntpServiceId',
		type: 'string',
		default: '',
		displayOptions: { show: { operation: ['getAll'], resource: ['ntpServiceConfig'] } },
		description: 'Filter NTP service configurations by the on-prem service ID',
	},
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
