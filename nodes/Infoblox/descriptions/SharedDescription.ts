import type { INodeProperties } from 'n8n-workflow';

/**
 * The single unified resource selector. Cloud (Infoblox Portal / Universal DDI /
 * Threat Defense / TIDE) and NIOS WAPI resources live in one list so that n8n can
 * generate an Action for every resource/operation pair. The selected resource also
 * drives which credential is required (see the node's `credentials` block).
 */
export const resourceSelector: INodeProperties = {
	displayName: 'Resource',
	name: 'resource',
	type: 'options',
	noDataExpression: true,
	options: [
		{ name: 'Address Block', value: 'addressBlock' },
		{ name: 'Audit Log', value: 'auditLog', description: 'Infoblox Portal audit log entry' },
		{ name: 'Auth Profile: LDAP', value: 'authnProfileLdap', description: 'LDAP authentication profile' },
		{ name: 'Auth Profile: OIDC', value: 'authnProfileOidc', description: 'OpenID Connect authentication profile' },
		{ name: 'Auth Profile: SAML', value: 'authnProfileSaml', description: 'SAML 2.0 authentication profile' },
		{ name: 'CDC Application', value: 'cdcApplication', description: 'Cloud Data Connector application configuration' },
		{ name: 'CDC Destination: HTTP', value: 'cdcDestinationHttp', description: 'Cloud Data Connector HTTP destination server' },
		{ name: 'CDC Destination: Splunk', value: 'cdcDestinationSplunk', description: 'Cloud Data Connector Splunk destination server' },
		{ name: 'CDC Destination: Syslog', value: 'cdcDestinationSyslog', description: 'Cloud Data Connector Syslog destination server' },
		{ name: 'CDC Host', value: 'cdcHost', description: 'Host with Cloud Data Connector enabled' },
		{ name: 'Custom API Request', value: 'custom', description: 'Send an arbitrary request to the Infoblox Portal API' },
		{ name: 'DFP Service', value: 'dfpService', description: 'DNS Forwarding Proxy service configuration' },
		{ name: 'DHCP Fingerprint', value: 'dhcpFingerprint', description: 'DHCP client fingerprint' },
		{ name: 'DHCP Lease', value: 'dhcpLease', description: 'Active DHCP lease' },
		{ name: 'DNS Event', value: 'dnsEvent', description: 'DNS security policy hit events (BloxOne Threat Defense)' },
		{ name: 'DNS Record', value: 'dnsRecord' },
		{ name: 'DNS Zone', value: 'dnsZone' },
		{ name: 'Endpoint Device Group', value: 'epDeviceGroup', description: 'BloxOne Endpoint roaming device group' },
		{ name: 'Endpoint Roaming Device', value: 'epRoamingDevice', description: 'BloxOne Endpoint roaming device' },
		{ name: 'Endpoint VPN Profile', value: 'epVpnProfile', description: 'BloxOne Endpoint VPN profile' },
		{ name: 'Fixed Address', value: 'fixedAddress' },
		{ name: 'Global Search', value: 'globalSearch', description: 'Search across all Infoblox Portal resources' },
		{ name: 'Identity: Compartment', value: 'identityCompartment', description: 'Identity service compartment' },
		{ name: 'Identity: Group', value: 'identityGroup', description: 'Identity service user group' },
		{ name: 'Identity: User', value: 'identityUser', description: 'Identity service user' },
		{ name: 'Infrastructure Host', value: 'infraHost', description: 'Infoblox infrastructure on-prem host' },
		{ name: 'Infrastructure Service', value: 'infraService', description: 'Infoblox infrastructure service (application)' },
		{ name: 'IP Address', value: 'ipAddress' },
		{ name: 'IP Space', value: 'ipSpace' },
		{ name: 'IPAM Range', value: 'dhcpRange' },
		{ name: 'Location', value: 'location', description: 'Physical location for on-prem hosts' },
		{ name: 'Lookalike Domain', value: 'ladLookalikeDomain', description: 'Detected lookalike domain' },
		{ name: 'Lookalike Target', value: 'ladLookalikeTarget', description: 'Target domain monitored for lookalike detection' },
		{ name: 'NIOS Custom API Request', value: 'niosCustom', description: 'Send an arbitrary request to the NIOS WAPI' },
		{ name: 'NIOS WAPI Object', value: 'niosObject', description: 'Create, read, update or delete a NIOS WAPI object' },
		{ name: 'NTP Service Config', value: 'ntpServiceConfig', description: 'NTP configuration for a service. Use Update with the service ID to create or update.' },
		{ name: 'Redirect: Custom Redirect', value: 'redirectCustomRedirect', description: 'Custom redirect destination for blocked domains' },
		{ name: 'Service Log', value: 'serviceLog', description: 'On-prem host service log entry' },
		{ name: 'SOC Insight', value: 'socInsight', description: 'BloxOne SOC Insight (threat detection insight)' },
		{ name: 'Subnet', value: 'subnet' },
		{ name: 'TD Access Code', value: 'tdAccessCode', description: 'Threat Defense bypass access code' },
		{ name: 'TD Application Filter', value: 'tdApplicationFilter', description: 'Threat Defense application filter' },
		{ name: 'TD Category Filter', value: 'tdCategoryFilter', description: 'Threat Defense content category filter' },
		{ name: 'TD Internal Domain List', value: 'tdInternalDomainList', description: 'Threat Defense internal domain list' },
		{ name: 'TD Named List', value: 'tdNamedList', description: 'Threat Defense named list (allowlist/blocklist)' },
		{ name: 'TD Scheduled Report', value: 'tdScheduledReport', description: 'Threat Defense scheduled report' },
		{ name: 'TIDE Batch', value: 'tideBatch', description: 'TIDE threat batch submission' },
		{ name: 'TIDE Dossier Lookup', value: 'tideDossierLookup', description: 'TIDE Dossier indicator intelligence lookup' },
		{ name: 'TIDE Threat', value: 'tideThreat', description: 'TIDE threat indicator record' },
	],
	default: 'ipSpace',
};

/** Free-form query parameters appended to every request. */
export const queryParameters: INodeProperties[] = [
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
			'Additional query parameters. For Universal DDI filters use _filter or _fields; for TIDE use type, host, ip, URL, hash, email, profile.',
	},
];
