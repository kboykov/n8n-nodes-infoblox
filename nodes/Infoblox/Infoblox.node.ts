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
	// Universal DDI — IPAM & DHCP
	ipSpace: '/api/ddi/v1/ipam/ip_space',
	ipAddress: '/api/ddi/v1/ipam/address',
	addressBlock: '/api/ddi/v1/ipam/address_block',
	subnet: '/api/ddi/v1/ipam/subnet',
	dhcpRange: '/api/ddi/v1/ipam/range',
	fixedAddress: '/api/ddi/v1/dhcp/fixed_address',
	// Universal DDI — DNS
	dnsZone: '/api/ddi/v1/dns/auth_zone',
	dnsRecord: '/api/ddi/v1/dns/record',
	// BloxOne Threat Defense (atcfw v1)
	tdAccessCode: '/api/atcfw/v1/access_codes',
	tdApplicationFilter: '/api/atcfw/v1/application_filters',
	tdCategoryFilter: '/api/atcfw/v1/category_filters',
	tdInternalDomainList: '/api/atcfw/v1/internal_domain_lists',
	tdNamedList: '/api/atcfw/v1/named_lists',
	tdScheduledReport: '/api/atcfw/v1/scheduled_reports',
	// DNS Events (dnsdata v2)
	dnsEvent: '/api/dnsdata/v2/dns_event',
	// BloxOne Endpoint (atcep v1)
	epDeviceGroup: '/api/atcep/v1/roaming_device_groups',
	epRoamingDevice: '/api/atcep/v1/roaming_devices',
	epVpnProfile: '/api/atcep/v1/vpn_profiles',
	// DNS Forwarding Proxy (atcdfp v1)
	dfpService: '/api/atcdfp/v1/dfp_services',
	// Lookalike Domain Analysis (tdlad v1)
	ladLookalikeDomain: '/api/tdlad/v1/lookalike_domains',
	ladLookalikeTarget: '/api/tdlad/v1/lookalike_targets',
	// Redirect (redirect v1)
	redirectCustomRedirect: '/api/redirect/v1/custom_redirects',
	// SOC Insights (v2)
	socInsight: '/api/v2/insights',
	// TIDE Dossier & Threat Data
	tideDossierLookup: '/tide/api/services/intel/lookup/indicator',
	tideThreat: '/tide/api/data/threats',
	tideBatch: '/tide/api/data/batches',
	// Infrastructure (infra v1)
	infraHost: '/api/infra/v1/hosts',
	infraService: '/api/infra/v1/services',
	// Locations (infra v1)
	location: '/api/infra/v1/locations',
	// Audit Log (auditlog v1)
	auditLog: '/api/auditlog/v1/logs',
	// Service Logs (atlas-logs v2)
	serviceLog: '/atlas-logs/v2/logs',
	// Authentication Profiles (authn v1)
	authnProfileLdap: '/api/authn/v1/profiles/ldap',
	authnProfileOidc: '/api/authn/v1/profiles/oidc',
	authnProfileSaml: '/api/authn/v1/profiles/saml',
	// Global Search (atlas-search-api v1)
	globalSearch: '/atlas-search-api/v1/search',
	// NTP Config Service (ntp v1)
	ntpServiceConfig: '/api/ntp/v1/service/config',
	// Identity (v2)
	identityUser: '/v2/users',
	identityGroup: '/v2/groups',
	identityCompartment: '/v2/compartments',
	// DHCP additional resources (ddi v1)
	dhcpLease: '/api/ddi/v1/dhcp/lease',
	dhcpFingerprint: '/api/ddi/v1/dhcp/fingerprint',
	// CDC Data Connector (cdc-flow v1)
	cdcApplication: '/api/cdc-flow/v1/applications',
	cdcDestinationHttp: '/api/cdc-flow/v1/destinations/http',
	cdcDestinationSplunk: '/api/cdc-flow/v1/destinations/splunk',
	cdcDestinationSyslog: '/api/cdc-flow/v1/destinations/syslog',
	cdcHost: '/api/cdc-flow/v1/cdcs/hosts',
};

// Resources that use PUT (full replacement) for updates instead of PATCH (partial)
const PUT_UPDATE_RESOURCES = new Set([
	'tdAccessCode',
	'tdApplicationFilter',
	'tdCategoryFilter',
	'tdInternalDomainList',
	'tdNamedList',
	'tdScheduledReport',
	'epDeviceGroup',
	'epVpnProfile',
	'dfpService',
	'redirectCustomRedirect',
	'tideBatch',
	'authnProfileLdap',
	'authnProfileOidc',
	'authnProfileSaml',
	'cdcApplication',
	'cdcDestinationHttp',
	'cdcDestinationSplunk',
	'cdcDestinationSyslog',
	'infraHost',
	'infraService',
	'location',
]);

// Resources where update uses POST (upsert by ID) — e.g. NTP service config
const POST_UPDATE_RESOURCES = new Set(['ntpServiceConfig']);

// TIDE Data API resources use 'rlimit' instead of '_limit' for pagination
const TIDE_DATA_RESOURCES = new Set(['tideThreat', 'tideBatch']);

// All cloud resources that use the standard cloudOperation selector (get/getAll/create/update/delete)
const STANDARD_CLOUD_RESOURCES = [
	'ipSpace',
	'ipAddress',
	'addressBlock',
	'subnet',
	'dhcpRange',
	'fixedAddress',
	'dnsZone',
	'dnsRecord',
	'tdAccessCode',
	'tdApplicationFilter',
	'tdCategoryFilter',
	'tdInternalDomainList',
	'tdNamedList',
	'tdScheduledReport',
	'epDeviceGroup',
	'epRoamingDevice',
	'epVpnProfile',
	'dfpService',
	'ladLookalikeDomain',
	'ladLookalikeTarget',
	'redirectCustomRedirect',
	'socInsight',
	'tideBatch',
	'tideThreat',
	'auditLog',
	'authnProfileLdap',
	'authnProfileOidc',
	'authnProfileSaml',
	'cdcApplication',
	'cdcDestinationHttp',
	'cdcDestinationSplunk',
	'cdcDestinationSyslog',
	'cdcHost',
	'dhcpFingerprint',
	'dhcpLease',
	'identityCompartment',
	'identityGroup',
	'identityUser',
	'infraHost',
	'infraService',
	'location',
	'ntpServiceConfig',
	'serviceLog',
];

const cloudOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'cloudOperation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				platform: ['cloud'],
				cloudResource: STANDARD_CLOUD_RESOURCES,
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
				cloudResource: ['custom', 'dnsEvent', 'tideDossierLookup'],
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
				cloudResource: ['custom', 'dnsEvent', 'tideDossierLookup', 'globalSearch'],
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
				cloudResource: ['custom', 'dnsEvent', 'tideDossierLookup', 'globalSearch'],
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
				cloudResource: ['custom', 'dnsEvent', 'tideDossierLookup'],
			},
		},
		description: 'Request body as JSON',
	},
	// DNS Event specific fields
	{
		displayName: 'Start Time (T0)',
		name: 'dnsEventT0',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: {
				platform: ['cloud'],
				cloudResource: ['dnsEvent'],
			},
		},
		description: 'Start of time range as a Unix epoch timestamp (seconds)',
	},
	{
		displayName: 'End Time (T1)',
		name: 'dnsEventT1',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: {
				platform: ['cloud'],
				cloudResource: ['dnsEvent'],
			},
		},
		description: 'End of time range as a Unix epoch timestamp (seconds)',
	},
	{
		displayName: 'Return All',
		name: 'dnsEventReturnAll',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				platform: ['cloud'],
				cloudResource: ['dnsEvent'],
			},
		},
		description: 'Whether to return all DNS events or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'dnsEventLimit',
		type: 'number',
		typeOptions: { minValue: 1 },
		default: 100,
		displayOptions: {
			show: {
				platform: ['cloud'],
				cloudResource: ['dnsEvent'],
				dnsEventReturnAll: [false],
			},
		},
		description: 'Max number of DNS events to return',
	},
	// TIDE Dossier Lookup specific fields
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
		displayOptions: {
			show: {
				platform: ['cloud'],
				cloudResource: ['tideDossierLookup'],
			},
		},
		description: 'Type of indicator to look up in the TIDE Dossier',
	},
	{
		displayName: 'Indicator Value',
		name: 'dossierIndicatorValue',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				platform: ['cloud'],
				cloudResource: ['tideDossierLookup'],
			},
		},
		description: 'The indicator to look up (domain name, IP address, URL, file hash, or email)',
	},
	{
		displayName: 'Source',
		name: 'dossierSource',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				platform: ['cloud'],
				cloudResource: ['tideDossierLookup'],
			},
		},
		description: 'Optional TIDE source to query. Leave empty to query all available sources.',
	},
	{
		displayName: 'Wait for Results',
		name: 'dossierWait',
		type: 'boolean',
		default: true,
		displayOptions: {
			show: {
				platform: ['cloud'],
				cloudResource: ['tideDossierLookup'],
			},
		},
		description: 'Whether to wait for the Dossier lookup job to complete before returning',
	},
	// Global Search specific fields
	{
		displayName: 'Search Query',
		name: 'globalSearchQuery',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				platform: ['cloud'],
				cloudResource: ['globalSearch'],
			},
		},
		description: 'Search query string (3–300 characters)',
	},
	{
		displayName: 'Additional Options',
		name: 'globalSearchOptions',
		type: 'json',
		default: '{}',
		displayOptions: {
			show: {
				platform: ['cloud'],
				cloudResource: ['globalSearch'],
			},
		},
		description:
			'Optional search parameters as JSON — e.g. filters, limit, offset, highlight, exact_token',
	},
	// ── Generic _filter expression (Universal DDI and most CSP list APIs) ──────
	{
		displayName: 'Filter Expression',
		name: 'filterExpression',
		type: 'string',
		default: '',
		placeholder: 'name=="default"',
		displayOptions: {
			show: {
				platform: ['cloud'],
				cloudOperation: ['getAll'],
				cloudResource: [
					'ipSpace', 'ipAddress', 'addressBlock', 'subnet', 'dhcpRange', 'fixedAddress',
					'dnsZone', 'dnsRecord', 'dhcpLease', 'dhcpFingerprint',
					'location', 'infraHost', 'infraService',
					'epDeviceGroup', 'epRoamingDevice', 'epVpnProfile',
					'dfpService', 'ladLookalikeDomain', 'ladLookalikeTarget',
					'redirectCustomRedirect',
					'identityUser', 'identityGroup', 'identityCompartment',
					'cdcApplication', 'cdcDestinationHttp', 'cdcDestinationSplunk', 'cdcDestinationSyslog', 'cdcHost',
					'tdAccessCode', 'tdApplicationFilter', 'tdCategoryFilter',
					'tdInternalDomainList', 'tdNamedList', 'tdScheduledReport',
					'authnProfileLdap', 'authnProfileOidc', 'authnProfileSaml',
				],
			},
		},
		description:
			'Infoblox `_filter` expression applied server-side. Example: `name=="default"` or `address=="10.0.0.0"`. Leave empty to return all records.',
	},
	// ── DNS Event extra filters ──────────────────────────────────────────────
	{
		displayName: 'Query Name',
		name: 'dnsEventQname',
		type: 'string',
		default: '',
		placeholder: 'malware.example.com',
		displayOptions: {
			show: { platform: ['cloud'], cloudResource: ['dnsEvent'] },
		},
		description: 'Filter DNS events by the queried domain name',
	},
	{
		displayName: 'Source IP',
		name: 'dnsEventSrcIp',
		type: 'string',
		default: '',
		placeholder: '192.0.2.10',
		displayOptions: {
			show: { platform: ['cloud'], cloudResource: ['dnsEvent'] },
		},
		description: 'Filter DNS events by client source IP address',
	},
	{
		displayName: 'Policy Name',
		name: 'dnsEventPolicy',
		type: 'string',
		default: '',
		displayOptions: {
			show: { platform: ['cloud'], cloudResource: ['dnsEvent'] },
		},
		description: 'Filter DNS events by the security policy that generated them',
	},
	{
		displayName: 'Threat Type',
		name: 'dnsEventThreatType',
		type: 'string',
		default: '',
		placeholder: 'C&C',
		displayOptions: {
			show: { platform: ['cloud'], cloudResource: ['dnsEvent'] },
		},
		description: 'Filter DNS events by threat type label (e.g. C&C, Malware, Phishing)',
	},
	// ── Audit Log filters ────────────────────────────────────────────────────
	{
		displayName: 'Start Date',
		name: 'auditLogFrom',
		type: 'string',
		default: '',
		placeholder: '2024-01-01T00:00:00Z',
		displayOptions: {
			show: { platform: ['cloud'], cloudOperation: ['getAll'], cloudResource: ['auditLog'] },
		},
		description: 'Return audit entries on or after this ISO 8601 date-time (maps to `t_from`)',
	},
	{
		displayName: 'End Date',
		name: 'auditLogTo',
		type: 'string',
		default: '',
		placeholder: '2024-12-31T23:59:59Z',
		displayOptions: {
			show: { platform: ['cloud'], cloudOperation: ['getAll'], cloudResource: ['auditLog'] },
		},
		description: 'Return audit entries on or before this ISO 8601 date-time (maps to `t_to`)',
	},
	{
		displayName: 'Username',
		name: 'auditLogUsername',
		type: 'string',
		default: '',
		displayOptions: {
			show: { platform: ['cloud'], cloudOperation: ['getAll'], cloudResource: ['auditLog'] },
		},
		description: 'Filter audit log entries by the user who performed the action',
	},
	{
		displayName: 'Action',
		name: 'auditLogAction',
		type: 'string',
		default: '',
		placeholder: 'Create',
		displayOptions: {
			show: { platform: ['cloud'], cloudOperation: ['getAll'], cloudResource: ['auditLog'] },
		},
		description: 'Filter audit log entries by action type (e.g. Create, Update, Delete)',
	},
	// ── Service Log filters ──────────────────────────────────────────────────
	{
		displayName: 'Service Name',
		name: 'serviceLogService',
		type: 'string',
		default: '',
		displayOptions: {
			show: { platform: ['cloud'], cloudOperation: ['getAll'], cloudResource: ['serviceLog'] },
		},
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
		displayOptions: {
			show: { platform: ['cloud'], cloudOperation: ['getAll'], cloudResource: ['serviceLog'] },
		},
		description: 'Filter service logs by severity level',
	},
	// ── SOC Insight filters ──────────────────────────────────────────────────
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
		displayOptions: {
			show: { platform: ['cloud'], cloudOperation: ['getAll'], cloudResource: ['socInsight'] },
		},
		description: 'Filter SOC Insights by status',
	},
	// ── TIDE Threat filters ──────────────────────────────────────────────────
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
		displayOptions: {
			show: { platform: ['cloud'], cloudOperation: ['getAll'], cloudResource: ['tideThreat'] },
		},
		description: 'Filter TIDE threat records by indicator type',
	},
	{
		displayName: 'Profile',
		name: 'tideThreatProfile',
		type: 'string',
		default: '',
		displayOptions: {
			show: { platform: ['cloud'], cloudOperation: ['getAll'], cloudResource: ['tideThreat'] },
		},
		description: 'Filter TIDE threat records by profile name',
	},
	// ── NTP Service Config filter ────────────────────────────────────────────
	{
		displayName: 'Service ID',
		name: 'ntpServiceId',
		type: 'string',
		default: '',
		displayOptions: {
			show: { platform: ['cloud'], cloudOperation: ['getAll'], cloudResource: ['ntpServiceConfig'] },
		},
		description: 'Filter NTP service configurations by the on-prem service ID',
	},
	// ── Custom API Request fields ─────────────────────────────────────────────
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
		description: 'Additional query parameters. For Universal DDI filters use _filter or _fields; for TIDE use type, host, ip, URL, hash, email, profile.',
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
		description: 'Work with Infoblox Universal DDI, Threat Defense, TIDE, and NIOS WAPI',
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
						name: 'Audit Log',
						value: 'auditLog',
						description: 'Infoblox Portal audit log entry',
					},
					{
						name: 'Auth Profile: LDAP',
						value: 'authnProfileLdap',
						description: 'LDAP authentication profile',
					},
					{
						name: 'Auth Profile: OIDC',
						value: 'authnProfileOidc',
						description: 'OpenID Connect authentication profile',
					},
					{
						name: 'Auth Profile: SAML',
						value: 'authnProfileSaml',
						description: 'SAML 2.0 authentication profile',
					},
					{
						name: 'CDC Application',
						value: 'cdcApplication',
						description: 'Cloud Data Connector application configuration',
					},
					{
						name: 'CDC Destination: HTTP',
						value: 'cdcDestinationHttp',
						description: 'Cloud Data Connector HTTP destination server',
					},
					{
						name: 'CDC Destination: Splunk',
						value: 'cdcDestinationSplunk',
						description: 'Cloud Data Connector Splunk destination server',
					},
					{
						name: 'CDC Destination: Syslog',
						value: 'cdcDestinationSyslog',
						description: 'Cloud Data Connector Syslog destination server',
					},
					{
						name: 'CDC Host',
						value: 'cdcHost',
						description: 'Host with Cloud Data Connector enabled',
					},
					{
						name: 'Custom API Request',
						value: 'custom',
					},
					{
						name: 'DFP Service',
						value: 'dfpService',
						description: 'DNS Forwarding Proxy service configuration',
					},
					{
						name: 'DHCP Fingerprint',
						value: 'dhcpFingerprint',
						description: 'DHCP client fingerprint',
					},
					{
						name: 'DHCP Lease',
						value: 'dhcpLease',
						description: 'Active DHCP lease',
					},
					{
						name: 'DNS Event',
						value: 'dnsEvent',
						description: 'DNS security policy hit events (BloxOne Threat Defense)',
					},
					{
						name: 'DNS Record',
						value: 'dnsRecord',
					},
					{
						name: 'DNS Zone',
						value: 'dnsZone',
					},
					{
						name: 'Endpoint Device Group',
						value: 'epDeviceGroup',
						description: 'BloxOne Endpoint roaming device group',
					},
					{
						name: 'Endpoint Roaming Device',
						value: 'epRoamingDevice',
						description: 'BloxOne Endpoint roaming device',
					},
					{
						name: 'Endpoint VPN Profile',
						value: 'epVpnProfile',
						description: 'BloxOne Endpoint VPN profile',
					},
					{
						name: 'Fixed Address',
						value: 'fixedAddress',
					},
					{
						name: 'Global Search',
						value: 'globalSearch',
						description: 'Search across all Infoblox Portal resources',
					},
					{
						name: 'Identity: Compartment',
						value: 'identityCompartment',
						description: 'Identity service compartment',
					},
					{
						name: 'Identity: Group',
						value: 'identityGroup',
						description: 'Identity service user group',
					},
					{
						name: 'Identity: User',
						value: 'identityUser',
						description: 'Identity service user',
					},
					{
						name: 'Infrastructure Host',
						value: 'infraHost',
						description: 'Infoblox infrastructure on-prem host',
					},
					{
						name: 'Infrastructure Service',
						value: 'infraService',
						description: 'Infoblox infrastructure service (application)',
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
						name: 'Location',
						value: 'location',
						description: 'Physical location for on-prem hosts',
					},
					{
						name: 'Lookalike Domain',
						value: 'ladLookalikeDomain',
						description: 'Detected lookalike domain',
					},
					{
						name: 'Lookalike Target',
						value: 'ladLookalikeTarget',
						description: 'Target domain monitored for lookalike detection',
					},
					{
						name: 'NTP Service Config',
						value: 'ntpServiceConfig',
						description: 'NTP configuration for a service. Use Update with the service ID to create or update.',
					},
					{
						name: 'Redirect: Custom Redirect',
						value: 'redirectCustomRedirect',
						description: 'Custom redirect destination for blocked domains',
					},
					{
						name: 'Service Log',
						value: 'serviceLog',
						description: 'On-prem host service log entry',
					},
					{
						name: 'SOC Insight',
						value: 'socInsight',
						description: 'BloxOne SOC Insight (threat detection insight)',
					},
					{
						name: 'Subnet',
						value: 'subnet',
					},
					{
						name: 'TD Access Code',
						value: 'tdAccessCode',
						description: 'Threat Defense bypass access code',
					},
					{
						name: 'TD Application Filter',
						value: 'tdApplicationFilter',
						description: 'Threat Defense application filter',
					},
					{
						name: 'TD Category Filter',
						value: 'tdCategoryFilter',
						description: 'Threat Defense content category filter',
					},
					{
						name: 'TD Internal Domain List',
						value: 'tdInternalDomainList',
						description: 'Threat Defense internal domain list',
					},
					{
						name: 'TD Named List',
						value: 'tdNamedList',
						description: 'Threat Defense named list (allowlist/blocklist)',
					},
					{
						name: 'TD Scheduled Report',
						value: 'tdScheduledReport',
						description: 'Threat Defense scheduled report',
					},
					{
						name: 'TIDE Batch',
						value: 'tideBatch',
						description: 'TIDE threat batch submission',
					},
					{
						name: 'TIDE Dossier Lookup',
						value: 'tideDossierLookup',
						description: 'TIDE Dossier indicator intelligence lookup',
					},
					{
						name: 'TIDE Threat',
						value: 'tideThreat',
						description: 'TIDE threat indicator record',
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

// Resources that support Infoblox _filter expression on list operations
const FILTER_EXPRESSION_RESOURCES = new Set([
	'ipSpace', 'ipAddress', 'addressBlock', 'subnet', 'dhcpRange', 'fixedAddress',
	'dnsZone', 'dnsRecord', 'dhcpLease', 'dhcpFingerprint',
	'location', 'infraHost', 'infraService',
	'epDeviceGroup', 'epRoamingDevice', 'epVpnProfile',
	'dfpService', 'ladLookalikeDomain', 'ladLookalikeTarget',
	'redirectCustomRedirect',
	'identityUser', 'identityGroup', 'identityCompartment',
	'cdcApplication', 'cdcDestinationHttp', 'cdcDestinationSplunk', 'cdcDestinationSyslog', 'cdcHost',
	'tdAccessCode', 'tdApplicationFilter', 'tdCategoryFilter',
	'tdInternalDomainList', 'tdNamedList', 'tdScheduledReport',
	'authnProfileLdap', 'authnProfileOidc', 'authnProfileSaml',
]);

function getResourceFilters(
	executeFunctions: IExecuteFunctions,
	itemIndex: number,
	cloudResource: string,
): IDataObject {
	const filters: IDataObject = {};

	if (FILTER_EXPRESSION_RESOURCES.has(cloudResource)) {
		const expr = executeFunctions.getNodeParameter('filterExpression', itemIndex, '') as string;
		if (expr) filters._filter = expr;
	}

	if (cloudResource === 'auditLog') {
		const from = executeFunctions.getNodeParameter('auditLogFrom', itemIndex, '') as string;
		const to = executeFunctions.getNodeParameter('auditLogTo', itemIndex, '') as string;
		const username = executeFunctions.getNodeParameter('auditLogUsername', itemIndex, '') as string;
		const action = executeFunctions.getNodeParameter('auditLogAction', itemIndex, '') as string;
		if (from) filters.t_from = from;
		if (to) filters.t_to = to;
		if (username) filters.username = username;
		if (action) filters.action = action;
	}

	if (cloudResource === 'serviceLog') {
		const service = executeFunctions.getNodeParameter('serviceLogService', itemIndex, '') as string;
		const severity = executeFunctions.getNodeParameter('serviceLogSeverity', itemIndex, '') as string;
		if (service) filters.service_name = service;
		if (severity) filters.severity = severity;
	}

	if (cloudResource === 'socInsight') {
		const status = executeFunctions.getNodeParameter('socInsightStatus', itemIndex, '') as string;
		if (status) filters.status = status;
	}

	if (cloudResource === 'tideThreat') {
		const type = executeFunctions.getNodeParameter('tideThreatType', itemIndex, '') as string;
		const profile = executeFunctions.getNodeParameter('tideThreatProfile', itemIndex, '') as string;
		if (type) filters.type = type;
		if (profile) filters.profile = profile;
	}

	if (cloudResource === 'ntpServiceConfig') {
		const serviceId = executeFunctions.getNodeParameter('ntpServiceId', itemIndex, '') as string;
		if (serviceId) filters.service_id = serviceId;
	}

	return filters;
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

	if (cloudResource === 'dnsEvent') {
		return executeDnsEventQuery.call(this, itemIndex, qs);
	}

	if (cloudResource === 'tideDossierLookup') {
		return executeTideDossierLookup.call(this, itemIndex, qs);
	}

	if (cloudResource === 'globalSearch') {
		return executeGlobalSearch.call(this, itemIndex, qs);
	}

	const operation = this.getNodeParameter('cloudOperation', itemIndex) as string;
	const endpoint = CLOUD_ENDPOINTS[cloudResource];
	const updateMethod: IHttpRequestMethods = POST_UPDATE_RESOURCES.has(cloudResource)
		? 'POST'
		: PUT_UPDATE_RESOURCES.has(cloudResource)
		? 'PUT'
		: 'PATCH';

	if (operation === 'getAll') {
		const returnAll = this.getNodeParameter('returnAll', itemIndex) as boolean;
		const limit = this.getNodeParameter('limit', itemIndex, 50) as number;
		const resourceFilters = getResourceFilters(this, itemIndex, cloudResource);
		const mergedQs = { ...qs, ...resourceFilters };

		return getManyCloudItems.call(this, cloudResource, endpoint, mergedQs, returnAll, limit);
	}

	if (operation === 'create') {
		const body = parseJsonParameter(this.getNodeParameter('jsonBody', itemIndex, {}));

		return infobloxCloudRequest.call(this, 'POST', endpoint, qs, body);
	}

	const resourceId = this.getNodeParameter('resourceId', itemIndex) as string;
	const itemEndpoint = buildCloudItemEndpoint(cloudResource, endpoint, resourceId);

	if (operation === 'get') {
		return infobloxCloudRequest.call(this, 'GET', itemEndpoint, qs);
	}

	if (operation === 'delete') {
		return infobloxCloudRequest.call(this, 'DELETE', itemEndpoint, qs);
	}

	const body = parseJsonParameter(this.getNodeParameter('jsonBody', itemIndex, {}));

	return infobloxCloudRequest.call(this, updateMethod, itemEndpoint, qs, body);
}

async function executeDnsEventQuery(
	this: IExecuteFunctions,
	itemIndex: number,
	qs: IDataObject,
): Promise<unknown> {
	const t0 = this.getNodeParameter('dnsEventT0', itemIndex) as number;
	const t1 = this.getNodeParameter('dnsEventT1', itemIndex) as number;
	const returnAll = this.getNodeParameter('dnsEventReturnAll', itemIndex, false) as boolean;
	const limit = this.getNodeParameter('dnsEventLimit', itemIndex, 100) as number;
	const endpoint = CLOUD_ENDPOINTS.dnsEvent;

	const extraFilters: IDataObject = {};
	const qname = this.getNodeParameter('dnsEventQname', itemIndex, '') as string;
	const srcIp = this.getNodeParameter('dnsEventSrcIp', itemIndex, '') as string;
	const policy = this.getNodeParameter('dnsEventPolicy', itemIndex, '') as string;
	const threatType = this.getNodeParameter('dnsEventThreatType', itemIndex, '') as string;
	if (qname) extraFilters.qname = qname;
	if (srcIp) extraFilters.src_ip = srcIp;
	if (policy) extraFilters.policy_name = policy;
	if (threatType) extraFilters.threat_type = threatType;

	if (!returnAll) {
		return infobloxCloudRequest.call(this, 'GET', endpoint, {
			...qs,
			...extraFilters,
			t0,
			t1,
			_limit: limit,
		});
	}

	const allItems: IDataObject[] = [];
	const pageSize = 5000;
	let offset = 0;

	while (true) {
		const response = await infobloxCloudRequest.call(this, 'GET', endpoint, {
			...qs,
			...extraFilters,
			t0,
			t1,
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

async function executeTideDossierLookup(
	this: IExecuteFunctions,
	itemIndex: number,
	qs: IDataObject,
): Promise<unknown> {
	const indicatorType = this.getNodeParameter('dossierIndicatorType', itemIndex) as string;
	const indicatorValue = this.getNodeParameter('dossierIndicatorValue', itemIndex) as string;
	const source = this.getNodeParameter('dossierSource', itemIndex, '') as string;
	const wait = this.getNodeParameter('dossierWait', itemIndex, true) as boolean;

	const endpoint = `${CLOUD_ENDPOINTS.tideDossierLookup}/${encodeURIComponent(indicatorType)}`;
	const requestQs: IDataObject = { ...qs, value: indicatorValue, wait: String(wait) };

	if (source) {
		requestQs.source = source;
	}

	return infobloxCloudRequest.call(this, 'GET', endpoint, requestQs);
}

async function executeGlobalSearch(
	this: IExecuteFunctions,
	itemIndex: number,
	qs: IDataObject,
): Promise<unknown> {
	const query = this.getNodeParameter('globalSearchQuery', itemIndex) as string;
	const options = parseJsonParameter(
		this.getNodeParameter('globalSearchOptions', itemIndex, {}),
	);

	const body: IDataObject = { query, ...options };

	return infobloxCloudRequest.call(this, 'POST', CLOUD_ENDPOINTS.globalSearch, qs, body);
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
	cloudResource: string,
	endpoint: string,
	qs: IDataObject,
	returnAll: boolean,
	limit: number,
): Promise<unknown> {
	// TIDE Data APIs use 'rlimit' and do not support offset-based pagination
	if (TIDE_DATA_RESOURCES.has(cloudResource)) {
		const response = await infobloxCloudRequest.call(this, 'GET', endpoint, {
			...qs,
			rlimit: returnAll ? 10000 : limit,
		});

		return extractList(response) ?? response;
	}

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

function buildCloudItemEndpoint(
	cloudResource: string,
	endpoint: string,
	resourceId: string,
): string {
	// TIDE threats use /id/{id} path structure for single-record retrieval
	if (cloudResource === 'tideThreat') {
		return `${endpoint}/id/${encodeURIComponent(resourceId)}`;
	}

	return `${endpoint}/${encodeURIComponent(resourceId)}`;
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
