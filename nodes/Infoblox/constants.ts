import type { IHttpRequestMethods } from 'n8n-workflow';

/**
 * Map of cloud (Infoblox Portal / Universal DDI / CSP) resource keys to their API base paths.
 */
export const CLOUD_ENDPOINTS: Record<string, string> = {
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

/**
 * Cloud resources that use the standard CRUD operation selector
 * (create / delete / get / getAll / update).
 */
export const STANDARD_CLOUD_RESOURCES = [
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

/** Special cloud resources that do not use the standard CRUD selector. */
export const SPECIAL_CLOUD_RESOURCES = ['custom', 'dnsEvent', 'tideDossierLookup', 'globalSearch'];

/** Every cloud resource — used to scope the CSP API credential. */
export const ALL_CLOUD_RESOURCES = [...STANDARD_CLOUD_RESOURCES, ...SPECIAL_CLOUD_RESOURCES];

/** NIOS WAPI resources — used to scope the NIOS API credential. */
export const NIOS_RESOURCES = ['niosObject', 'niosCustom'];

/** Resources that support an Infoblox `_filter` expression on list operations. */
export const FILTER_EXPRESSION_RESOURCES = [
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
];

export const FILTER_EXPRESSION_RESOURCE_SET = new Set(FILTER_EXPRESSION_RESOURCES);

/** Resources that use PUT (full replacement) for updates instead of PATCH (partial). */
export const PUT_UPDATE_RESOURCES = new Set([
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

/** Resources where update uses POST (upsert by ID) — e.g. NTP service config. */
export const POST_UPDATE_RESOURCES = new Set(['ntpServiceConfig']);

/** TIDE Data API resources use `rlimit` instead of `_limit` for pagination. */
export const TIDE_DATA_RESOURCES = new Set(['tideThreat', 'tideBatch']);

/** Resolve the HTTP method used to update a given cloud resource. */
export function getCloudUpdateMethod(cloudResource: string): IHttpRequestMethods {
	if (POST_UPDATE_RESOURCES.has(cloudResource)) return 'POST';
	if (PUT_UPDATE_RESOURCES.has(cloudResource)) return 'PUT';
	return 'PATCH';
}
