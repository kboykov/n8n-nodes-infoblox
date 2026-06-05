# n8n-nodes-infoblox

A community node for [n8n](https://n8n.io/) that covers the full Infoblox API surface — Universal DDI (IPAM, DHCP, DNS), BloxOne Threat Defense, TIDE threat intelligence, BloxOne Endpoint, SOC Insights, Infrastructure, Identity, and NIOS WAPI.

## Features

- **Two platforms in one node** — Infoblox Portal (CSP API key) and NIOS WAPI (basic auth).
- **47 typed Cloud resources** covering IPAM, DHCP, DNS, Threat Defense, Endpoint, Lookalike Detection, Redirect, TIDE, SOC Insights, Infrastructure, Locations, CDC, Audit Log, Service Logs, Auth Profiles, NTP, Identity, and Global Search.
- **Standard CRUD operations** — Get, Get Many, Create, Update, Delete — for every typed resource.
- **Structured filters** on Get Many — filter expressions for Universal DDI resources, dedicated filter fields for Audit Log (time range, username, action), DNS Events (qname, src\_ip, policy, threat type), Service Logs (service, severity), SOC Insights (status), TIDE Threat (indicator type, profile), and NTP Service Config (service ID).
- **Automatic pagination** — Universal DDI via `_limit`/`_offset`, NIOS WAPI via `_paging`/`_page_id`, TIDE via `rlimit`.
- **Return All** toggle for unbounded result fetching.
- **Custom API Request** mode on both platforms for any endpoint not yet modeled.
- **Raw Query Parameters** collection for advanced filtering and field selection.
- Global, Europe, and custom Infoblox Portal base URLs.
- Optional SSL certificate validation bypass for self-signed NIOS appliances.
- Compatible with n8n's `usableAsTool` flag for AI agent workflows.

---

## Installation

Install as an n8n community node from npm:

```bash
npm install n8n-nodes-infoblox
```

For local development:

```bash
git clone https://github.com/kboykov/n8n-nodes-infoblox.git
cd n8n-nodes-infoblox
pnpm install
pnpm build
```

---

## Credentials

### Infoblox Portal (CSP)

Used for all Cloud resources. Requires an Infoblox Portal API key.

| Field | Description |
| --- | --- |
| API Key | Your CSP API key. Sent as `Authorization: Token <key>`. |
| Realm | `Global` (`csp.infoblox.com`), `Europe` (`csp.eu.infoblox.com`), or `Custom`. |
| Custom Base URL | Required when Realm is `Custom`. |

The credential test calls `GET /api/ddi/v1/ipam/ip_space` to verify connectivity.

### Infoblox NIOS WAPI

Used for NIOS WAPI resources. Uses HTTP basic authentication.

| Field | Description |
| --- | --- |
| Grid Master URL | Base URL of the NIOS Grid Master, e.g. `https://grid-master.example.com`. |
| WAPI Version | Version string, e.g. `2.13.7`. |
| Username / Password | Grid Master credentials. |
| Ignore SSL Issues | Disable TLS verification for self-signed certificates. |

The credential test calls `GET /wapi/v<version>/grid`.

---

## Platform: Infoblox Portal / Universal DDI

Select **Infoblox Portal / Universal DDI** in the Platform field to access the CSP API.

All resources share these common operation fields:

| Field | Operations | Description |
| --- | --- | --- |
| Resource ID | Get, Update, Delete | The CSP resource UUID. |
| Return All | Get Many | Fetch all pages automatically. |
| Limit | Get Many (Return All = false) | Max records to return. |
| JSON Body | Create, Update | Request body as JSON. |
| Filter Expression | Get Many (most resources) | Infoblox `_filter` expression, e.g. `name=="default"`. |
| Query Parameters | All | Raw key/value query parameters appended to every request. |

### Universal DDI — IPAM & DHCP

| Resource | Endpoint | Notes |
| --- | --- | --- |
| IP Space | `/api/ddi/v1/ipam/ip_space` | Top-level IPAM container. |
| IP Address | `/api/ddi/v1/ipam/address` | Individual IP address record. |
| Address Block | `/api/ddi/v1/ipam/address_block` | CIDR block within an IP Space. |
| Subnet | `/api/ddi/v1/ipam/subnet` | Routable subnet. |
| IPAM Range | `/api/ddi/v1/ipam/range` | Dynamic DHCP address range. |
| Fixed Address | `/api/ddi/v1/dhcp/fixed_address` | Static DHCP reservation. |
| DHCP Lease | `/api/ddi/v1/dhcp/lease` | Active DHCP lease (read-only in practice). |
| DHCP Fingerprint | `/api/ddi/v1/dhcp/fingerprint` | DHCP client fingerprint. |

Filter Expression examples for IPAM resources:

```
name=="default"
address=="10.0.0.0"
cidr>=24
space=="<space-id>"
```

### Universal DDI — DNS

| Resource | Endpoint | Notes |
| --- | --- | --- |
| DNS Zone | `/api/ddi/v1/dns/auth_zone` | Authoritative DNS zone. |
| DNS Record | `/api/ddi/v1/dns/record` | Any DNS record type. |

Filter Expression examples for DNS resources:

```
fqdn=="example.com"
name_in_zone=="app1"
type=="A"
zone=="<zone-id>"
```

### BloxOne Threat Defense (atcfw v1)

All Threat Defense resources use **PUT** for updates (full replacement).

| Resource | Endpoint | Description |
| --- | --- | --- |
| TD Access Code | `/api/atcfw/v1/access_codes` | Bypass access code. |
| TD Application Filter | `/api/atcfw/v1/application_filters` | Application-level traffic filter. |
| TD Category Filter | `/api/atcfw/v1/category_filters` | Content category filter. |
| TD Internal Domain List | `/api/atcfw/v1/internal_domain_lists` | Internal domain allowlist. |
| TD Named List | `/api/atcfw/v1/named_lists` | Named allowlist or blocklist. |
| TD Scheduled Report | `/api/atcfw/v1/scheduled_reports` | Scheduled threat report. |

Filter Expression example: `name=="corp-allowlist"`.

### DNS Events (dnsdata v2)

DNS Events bypass the standard operation selector. Instead of an Operation field, configure:

| Field | Description |
| --- | --- |
| Start Time (T0) | Required. Unix epoch timestamp (seconds) — start of query window. |
| End Time (T1) | Required. Unix epoch timestamp (seconds) — end of query window. |
| Return All | Paginate through all matching events. |
| Limit | Max events to return when Return All is off. |
| Query Name | Filter by the queried domain name, e.g. `malware.example.com`. |
| Source IP | Filter by client IP address. |
| Policy Name | Filter by the security policy that fired. |
| Threat Type | Filter by threat type label, e.g. `C&C`, `Malware`, `Phishing`. |

### BloxOne Endpoint (atcep v1)

| Resource | Endpoint | Description |
| --- | --- | --- |
| Endpoint Device Group | `/api/atcep/v1/roaming_device_groups` | Roaming device group. |
| Endpoint Roaming Device | `/api/atcep/v1/roaming_devices` | Individual roaming device. |
| Endpoint VPN Profile | `/api/atcep/v1/vpn_profiles` | VPN integration profile. |

Device Groups and VPN Profiles use PUT for updates.

### DNS Forwarding Proxy (atcdfp v1)

| Resource | Endpoint | Description |
| --- | --- | --- |
| DFP Service | `/api/atcdfp/v1/dfp_services` | DNS Forwarding Proxy service. Uses PUT for updates. |

### Lookalike Domain Analysis (tdlad v1)

| Resource | Endpoint | Description |
| --- | --- | --- |
| Lookalike Domain | `/api/tdlad/v1/lookalike_domains` | Detected lookalike domain. |
| Lookalike Target | `/api/tdlad/v1/lookalike_targets` | Target domain monitored for lookalike attacks. |

### Redirect (redirect v1)

| Resource | Endpoint | Description |
| --- | --- | --- |
| Redirect: Custom Redirect | `/api/redirect/v1/custom_redirects` | Custom redirect destination for blocked domains. Uses PUT for updates. |

### SOC Insights (v2)

| Resource | Endpoint | Description |
| --- | --- | --- |
| SOC Insight | `/api/v2/insights` | Threat detection insight generated by BloxOne SOC. |

**Get Many filter:** Status (`Active` or `Closed`).

### TIDE — Threat Intelligence Data Exchange

TIDE resources share the CSP credential. The base URL is the same CSP host; TIDE uses the `/tide/` path prefix.

#### TIDE Dossier Lookup

Performs an indicator intelligence lookup. Instead of standard CRUD fields, configure:

| Field | Description |
| --- | --- |
| Indicator Type | `email`, `hash`, `host`, `ip`, or `url`. |
| Indicator Value | The indicator to look up. |
| Source | Optional TIDE source name. Leave empty to query all. |
| Wait for Results | Whether to poll until the lookup job completes. |

#### TIDE Threat Data

| Resource | Endpoint | Description |
| --- | --- | --- |
| TIDE Threat | `/tide/api/data/threats` | Individual threat indicator record. Uses `rlimit` for pagination (max 10,000). |
| TIDE Batch | `/tide/api/data/batches` | Threat batch submission. Uses PUT for updates. |

**TIDE Threat Get Many filters:**

| Field | Description |
| --- | --- |
| Indicator Type | Filter by `host`, `ip`, `url`, `hash`, or `email`. |
| Profile | Filter by TIDE profile name. |

Single-record Get for TIDE Threat uses the path `/tide/api/data/threats/id/<id>`.

### Infrastructure (infra v1)

| Resource | Endpoint | Description |
| --- | --- | --- |
| Infrastructure Host | `/api/infra/v1/hosts` | On-prem BloxOne host. Uses PUT for updates. |
| Infrastructure Service | `/api/infra/v1/services` | Application service running on a host. Uses PUT for updates. |

Filter Expression example: `display_name=="my-host"`.

### Locations (infra v1)

| Resource | Endpoint | Description |
| --- | --- | --- |
| Location | `/api/infra/v1/locations` | Physical location associated with on-prem hosts. Uses PUT for updates. |

### Cloud Data Connector (cdc-flow v1)

| Resource | Endpoint | Description |
| --- | --- | --- |
| CDC Application | `/api/cdc-flow/v1/applications` | CDC application configuration. Uses PUT for updates. |
| CDC Destination: HTTP | `/api/cdc-flow/v1/destinations/http` | HTTP/HTTPS destination server. Uses PUT for updates. |
| CDC Destination: Splunk | `/api/cdc-flow/v1/destinations/splunk` | Splunk HEC destination. Uses PUT for updates. |
| CDC Destination: Syslog | `/api/cdc-flow/v1/destinations/syslog` | Syslog destination. Uses PUT for updates. |
| CDC Host | `/api/cdc-flow/v1/cdcs/hosts` | Host with CDC enabled. |

### Audit Log (auditlog v1)

| Resource | Endpoint | Description |
| --- | --- | --- |
| Audit Log | `/api/auditlog/v1/logs` | Portal audit log entries. Read-only in practice. |

**Get Many filters:**

| Field | Description |
| --- | --- |
| Start Date | ISO 8601 date-time — lower bound (`t_from`). |
| End Date | ISO 8601 date-time — upper bound (`t_to`). |
| Username | Filter by the actor who performed the action. |
| Action | Filter by action type, e.g. `Create`, `Update`, `Delete`. |

### Service Logs (atlas-logs v2)

| Resource | Endpoint | Description |
| --- | --- | --- |
| Service Log | `/atlas-logs/v2/logs` | On-prem host service log entries. |

**Get Many filters:**

| Field | Description |
| --- | --- |
| Service Name | Filter by on-prem service name. |
| Severity | Filter by level: Debug, Info, Warning, or Error. |

### Authentication Profiles (authn v1)

All auth profile resources use PUT for updates.

| Resource | Endpoint | Description |
| --- | --- | --- |
| Auth Profile: LDAP | `/api/authn/v1/profiles/ldap` | LDAP authentication profile. |
| Auth Profile: OIDC | `/api/authn/v1/profiles/oidc` | OpenID Connect authentication profile. |
| Auth Profile: SAML | `/api/authn/v1/profiles/saml` | SAML 2.0 authentication profile. |

### Global Search (atlas-search-api v1)

Global Search uses a POST request to query across all Portal resources. Instead of standard CRUD fields, configure:

| Field | Description |
| --- | --- |
| Search Query | Required. Search string (3–300 characters). |
| Additional Options | Optional JSON object with extra parameters (filters, limit, offset, highlight, exact\_token). |

### NTP Service Config (ntp v1)

| Resource | Endpoint | Description |
| --- | --- | --- |
| NTP Service Config | `/api/ntp/v1/service/config` | NTP configuration for an on-prem service. |

NTP Service Config uses POST for both Create and Update (upsert by service ID). Use the **Update** operation with the service ID to create or replace the config.

**Get Many filter:** Service ID — filter by on-prem service identifier.

### Identity (v2)

| Resource | Endpoint | Description |
| --- | --- | --- |
| Identity: User | `/v2/users` | Portal identity user. |
| Identity: Group | `/v2/groups` | Portal identity group. |
| Identity: Compartment | `/v2/compartments` | Portal identity compartment. |

Filter Expression example: `name=="admin"`.

### Custom API Request

Select **Custom API Request** to call any CSP endpoint not covered by the typed resources.

| Field | Description |
| --- | --- |
| HTTP Method | GET, POST, PUT, PATCH, or DELETE. |
| Endpoint | Path (e.g. `/api/ddi/v1/ipam/ip_space`) or absolute URL. |
| JSON Body | Optional request body for POST, PUT, PATCH. |
| Query Parameters | Optional key/value query parameters. |

---

## Platform: NIOS WAPI

Select **NIOS WAPI** in the Platform field to access a classic Infoblox NIOS Grid Master via WAPI.

### WAPI Object

A generic resource for all WAPI object types:

| Object Type | WAPI Type |
| --- | --- |
| A Record | `record:a` |
| AAAA Record | `record:aaaa` |
| Authoritative Zone | `zone_auth` |
| CNAME Record | `record:cname` |
| Fixed Address | `fixedaddress` |
| Grid | `grid` |
| Host Record | `record:host` |
| Member | `member` |
| Network | `network` |
| Network View | `networkview` |
| PTR Record | `record:ptr` |
| Range | `range` |
| TXT Record | `record:txt` |
| View | `view` |
| Custom | Any WAPI type string |

Supported operations:

- **Get Many** — list objects of the selected type with optional query parameters.
- **Get** — fetch by WAPI `_ref`.
- **Create** — create using a JSON body.
- **Update** — replace by WAPI `_ref` using a JSON body (PUT).
- **Delete** — delete by WAPI `_ref`.

The Object Reference field accepts the full `_ref` value returned by NIOS, for example:

```
record:host/ZG5zLmhvc3QkLl9kZWZhdWx0LmV4YW1wbGUuY29tLmFwcDE:app1.example.com/default
```

Slash-separated reference segments are individually URL-encoded.

For Get Many, the node uses `_paging`, `_return_as_object`, `_max_results`, and `_page_id` to paginate automatically when **Return All** is enabled.

### Custom API Request (NIOS)

Same as the Cloud Custom Request, but requests are routed to the NIOS Grid Master. Endpoint paths are accepted with or without the `/wapi/v<version>` prefix.

---

## Query Parameters

The **Query Parameters** collection accepts raw key/value pairs appended to any request. Use it for advanced filtering, field selection, or API-specific controls not covered by the structured filter fields.

### Universal DDI examples

| Parameter | Example Value | Purpose |
| --- | --- | --- |
| `_filter` | `name=="default"` | Server-side filter expression (also set via Filter Expression field) |
| `_fields` | `id,name,comment` | Return only these fields |
| `_limit` | `100` | Override page size |
| `_offset` | `200` | Skip first N results |
| `_order_by` | `name asc` | Sort results |

### TIDE examples

| Parameter | Example Value | Purpose |
| --- | --- | --- |
| `type` | `host` | Filter by indicator type |
| `profile` | `malware` | Filter by TIDE profile |
| `detected` | `true` | Return only currently active threats |
| `rlimit` | `1000` | Max results (max 10,000) |

### NIOS WAPI examples

| Parameter | Example Value | Purpose |
| --- | --- | --- |
| `_return_fields` | `name,ipv4addrs` | Return selected fields |
| `_return_as_object` | `1` | Return WAPI envelope |
| `_max_results` | `500` | Limit results |
| `name` | `app1.example.com` | Object-specific search field |
| `network_view` | `default` | Search within a specific network view |
| `network` | `10.0.0.0/8` | Filter by parent network |

---

## Example Workflows

### List all subnets in an IP Space

1. Platform: **Infoblox Portal / Universal DDI**
2. Resource: **Subnet**
3. Operation: **Get Many**
4. Filter Expression: `space=="<space-id>"`
5. Return All: enabled

### Look up a threat indicator in TIDE Dossier

1. Resource: **TIDE Dossier Lookup**
2. Indicator Type: **Host**
3. Indicator Value: `malware.example.com`
4. Wait for Results: enabled

### Query DNS security events for the last hour

1. Resource: **DNS Event**
2. Start Time (T0): Unix timestamp for one hour ago
3. End Time (T1): Unix timestamp for now
4. Threat Type: `Malware`
5. Return All: enabled

### Audit log entries by a specific user

1. Resource: **Audit Log**
2. Operation: **Get Many**
3. Start Date: `2024-06-01T00:00:00Z`
4. Username: `admin@example.com`
5. Action: `Delete`

### Fetch all active DHCP leases on a subnet

1. Resource: **DHCP Lease**
2. Operation: **Get Many**
3. Filter Expression: `state=="used"`
4. Return All: enabled

### Search across all Portal resources

1. Resource: **Global Search**
2. Search Query: `app1.example.com`

### Get NIOS host records for a domain

1. Platform: **NIOS WAPI**
2. Resource: **WAPI Object**
3. Object Type: **Host Record**
4. Operation: **Get Many**
5. Query Parameters: `name = app1.example.com`, `_return_fields = name,ipv4addrs`

---

## Development

```bash
pnpm install       # install dependencies
pnpm build         # compile TypeScript to dist/
pnpm lint          # run n8n community-node lint rules
pnpm lint:fix      # auto-fix lint errors
pnpm dev           # watch mode
```

The package requires pnpm 11+ and TypeScript 5+. Generated output goes to `dist/` and is not committed.

### Project layout

```
.
├── credentials/
│   ├── InfobloxCspApi.credentials.ts    # CSP API key credential
│   └── InfobloxNiosApi.credentials.ts   # NIOS WAPI basic auth credential
├── nodes/
│   └── Infoblox/
│       ├── Infoblox.node.ts             # Main node — all resources and logic
│       ├── Infoblox.node.json           # Node metadata
│       └── infoblox.svg                 # Node icon
├── package.json
├── pnpm-lock.yaml
└── tsconfig.json
```

---

## Security Notes

- Store Infoblox credentials in n8n credentials only — never hardcode API keys.
- Enable **Ignore SSL Issues** only in lab or controlled environments.
- Use least-privilege API accounts: read-only accounts for monitoring workflows, write-access only for provisioning workflows.
- Review JSON bodies before running Create, Update, or Delete operations against production DNS, DHCP, or IPAM data.

---

## Limitations

- The node does not provide typed input fields for every Infoblox object schema. Use JSON Body or Custom API Request for advanced object shapes.
- Live API behavior depends on your Infoblox product version, enabled modules, and account permissions.
- OAuth is not implemented. CSP uses API key; NIOS uses basic auth.
- TIDE pagination is capped at 10,000 records per request (`rlimit` max).

---

## API Documentation

- [Infoblox CSP API Reference](https://csp.infoblox.com/apidoc)
- [Infoblox NIOS WAPI Guide](https://docs.infoblox.com/)
- [n8n Community Nodes Docs](https://docs.n8n.io/integrations/community-nodes/)

---

## License

MIT
