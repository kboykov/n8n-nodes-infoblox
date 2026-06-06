# n8n-nodes-infoblox

A community node for [n8n](https://n8n.io/) covering a broad slice of the Infoblox API surface — Universal DDI (IPAM, DHCP, DNS), Threat Defense, TIDE threat intelligence, Endpoint, SOC Insights, Infrastructure, Identity, CDC, and NIOS WAPI — in a single node.

## Features

- **One node, two APIs.** Infoblox Portal (CSP, token auth) and NIOS WAPI (basic auth) live in a single **Resource** dropdown. There is no separate "platform" selector — picking a resource automatically selects the matching credential.
- **45+ typed resources** across IPAM, DHCP, DNS, Threat Defense, Endpoint, Lookalike Detection, Redirect, TIDE, SOC Insights, Infrastructure, Locations, CDC, Audit Log, Service Logs, Auth Profiles, NTP, Identity, and Global Search — plus a **Custom API Request** escape hatch for each API.
- **Per-resource actions.** Every resource exposes only the operations the Infoblox API actually supports (verified against the swagger specs), with meaningful action labels in the Actions panel (e.g. *Create a DNS record*, not *Create a resource*). List-only resources such as logs do not offer create/update/delete.
- **Dynamic Create/Update fields.** A resource-mapper **Fields** control loads the create/update schema for the selected resource at runtime from the Infoblox swagger specs, so you get typed, validated inputs instead of hand-written JSON. A **JSON Body** field remains available and is merged on top for anything the schema doesn't cover.
- **Automatic pagination** — Universal DDI via `_limit`/`_offset`, NIOS WAPI via `_paging`/`_page_id`, TIDE via `rlimit` — with a **Return All** toggle.
- **Structured Get Many filters** where the API supports them, plus a free-form **Query Parameters** collection on every request.
- Global, Europe, and custom Infoblox Portal realms; optional SSL bypass for self-signed NIOS appliances.
- Works with n8n's `usableAsTool` flag for AI-agent workflows.

---

## Installation

Install as an n8n community node from npm:

```bash
npm install n8n-nodes-infoblox
```

Or via the n8n UI: **Settings → Community Nodes → Install** and enter `n8n-nodes-infoblox`.

For local development:

```bash
git clone https://github.com/kboykov/n8n-nodes-infoblox.git
cd n8n-nodes-infoblox
pnpm install
pnpm build
```

---

## Credentials

The node ships two credential types. The required credential is selected automatically based on the chosen resource.

### Infoblox Portal API (`infobloxCspApi`)

Used for all Infoblox Portal / Universal DDI / Threat Defense / TIDE resources. Requires a CSP API key.

| Field | Description |
| --- | --- |
| Realm | `Global` (`csp.infoblox.com`), `Europe` (`csp.eu.infoblox.com`), or `Custom`. |
| Custom Base URL | Required when Realm is `Custom`. |
| API Key | Your CSP API key. Sent as `Authorization: Token <key>`. |

Connectivity test: `GET /api/ddi/v1/ipam/ip_space`.

### Infoblox NIOS API (`infobloxNiosApi`)

Used for NIOS WAPI resources. HTTP basic authentication.

| Field | Description |
| --- | --- |
| Grid Master URL | Base URL of the NIOS Grid Master, e.g. `https://grid-master.example.com`. |
| WAPI Version | Version string, e.g. `2.13.7`. |
| Username / Password | Grid Master credentials. |
| Ignore SSL Issues | Disable TLS verification for self-signed certificates. |

Connectivity test: `GET /wapi/v<version>/grid`.

---

## How the node is structured

Pick a **Resource**, then an **Operation**. Most resources share these fields:

| Field | Shown for | Description |
| --- | --- | --- |
| Resource ID | Get, Update, Delete | The Infoblox resource ID. |
| Return All | Get Many | Fetch all pages automatically. |
| Limit | Get Many (Return All off) | Max records to return. |
| Fields | Create, Update | Resource-mapper control whose columns are loaded from the API schema at runtime. |
| JSON Body | Create, Update | Optional raw JSON, merged over the mapped fields (for fields not in the schema). |
| Filter Expression | Get Many (supported resources) | Infoblox `_filter` expression, e.g. `name=="default"`. |
| Query Parameters | All | Raw key/value query parameters appended to every request. |

### Dynamic Create/Update fields (resource mapper)

For create and update operations, the **Fields** control fetches the relevant request-body schema for the selected resource directly from the Infoblox swagger documents (CSP `/apidoc/docs/...`; NIOS GitHub Pages openspec) and presents each property as a typed, mappable column. Schemas are fetched on demand and cached in memory.

If a resource's API exposes no create/update body (for example list-only resources), the control shows a notice and you can fall back to the **JSON Body** field. The fetch requires the credential's host to be reachable from the n8n instance.

---

## Resources — Infoblox Portal

> The endpoint column is the Infoblox Portal API path each resource maps to. Unless noted, resources support full CRUD (**Create, Get, Get Many, Update, Delete**). Update methods follow each API (PATCH for Universal DDI, PUT for most Threat Defense / Infrastructure / CDC / Auth resources, POST for NTP).

### Universal DDI — IPAM & DHCP

| Resource | Endpoint | Notes |
| --- | --- | --- |
| IP Space | `/api/ddi/v1/ipam/ip_space` | Top-level IPAM container. |
| IP Address | `/api/ddi/v1/ipam/address` | Individual IP address record. |
| Address Block | `/api/ddi/v1/ipam/address_block` | CIDR block within an IP Space. |
| Subnet | `/api/ddi/v1/ipam/subnet` | Routable subnet. |
| IPAM Range | `/api/ddi/v1/ipam/range` | Dynamic DHCP address range. |
| Fixed Address | `/api/ddi/v1/dhcp/fixed_address` | Static DHCP reservation. |
| DHCP Lease | `/api/ddi/v1/dhcp/lease` | **Get Many only** (read-only). |
| DHCP Fingerprint | `/api/ddi/v1/dhcp/fingerprint` | DHCP client fingerprint. |

Filter Expression examples: `name=="default"`, `address=="10.0.0.0"`, `cidr>=24`, `space=="<space-id>"`.

### Universal DDI — DNS

| Resource | Endpoint | Notes |
| --- | --- | --- |
| DNS Zone | `/api/ddi/v1/dns/auth_zone` | Authoritative DNS zone. |
| DNS Record | `/api/ddi/v1/dns/record` | Any DNS record type. |

Filter Expression examples: `fqdn=="example.com"`, `name_in_zone=="app1"`, `type=="A"`, `zone=="<zone-id>"`.

### Threat Defense (atcfw v1)

| Resource | Endpoint | Notes |
| --- | --- | --- |
| TD Access Code | `/api/atcfw/v1/access_codes` | Create, Get, Get Many, Delete (no update). |
| TD Application Filter | `/api/atcfw/v1/application_filters` | Full CRUD. |
| TD Category Filter | `/api/atcfw/v1/category_filters` | Full CRUD. |
| TD Internal Domain List | `/api/atcfw/v1/internal_domain_lists` | Full CRUD. |
| TD Named List | `/api/atcfw/v1/named_lists` | Full CRUD. |
| TD Scheduled Report | `/api/atcfw/v1/scheduled_reports` | Full CRUD. |
| Redirect: Custom Redirect | `/api/atcfw/v1/custom_redirects` | Custom redirect destination for blocked domains. |

### DNS Events (dnsdata v2)

The **DNS Event** resource runs a time-range search (`/api/dnsdata/v2/dns_event`) rather than CRUD. Fields:

| Field | Description |
| --- | --- |
| Start Time | Required. Accepts a date/time or a Unix epoch (seconds); sent as `t0`. |
| End Time | Required. Accepts a date/time or a Unix epoch (seconds); sent as `t1`. |
| Return All / Limit | Paginate all matching events, or cap the count. |
| Query Name | Filter by queried domain name (`qname`). |
| Query IP | Filter by the IP that made the query (`qip`). |
| Policy Name | Filter by the security policy that fired (`policy_name`). |
| Threat Class | Filter by threat class (`threat_class`), e.g. `Malware`, `Phishing`. |

Each event is emitted as its own item.

### Endpoint (atcep v1)

| Resource | Endpoint | Notes |
| --- | --- | --- |
| Endpoint Device Group | `/api/atcep/v1/roaming_device_groups` | Full CRUD. |
| Endpoint Roaming Device | `/api/atcep/v1/roaming_devices` | Get, Get Many. |
| Endpoint VPN Profile | `/api/atcep/v1/vpn_profiles` | Create, Get Many, Update. |

### DNS Forwarding Proxy (atcdfp v1)

| Resource | Endpoint | Notes |
| --- | --- | --- |
| DFP Service | `/api/atcdfp/v1/dfp_services` | Get Many, Update. |

### Lookalike Domain Analysis (tdlad v1)

| Resource | Endpoint | Notes |
| --- | --- | --- |
| Lookalike Domain | `/api/tdlad/v1/lookalike_domains` | **Get Many only.** |
| Lookalike Target | `/api/tdlad/v1/lookalike_targets` | **Get Many only.** |

### SOC Insights (v2)

| Resource | Endpoint | Notes |
| --- | --- | --- |
| SOC Insight | `/api/v2/insights` | Get, Get Many. Get Many filter: **Status** (`Active` / `Closed`). |

### TIDE — Threat Intelligence Data Exchange

TIDE resources use the Portal credential and the `/tide/` path prefix on the same host.

**TIDE Dossier Lookup** performs an indicator intelligence lookup:

| Field | Description |
| --- | --- |
| Indicator Type | `email`, `hash`, `host`, `ip`, or `url`. |
| Indicator Value | The indicator to look up. |
| Source | Optional TIDE source name. Leave empty to query all. |
| Wait for Results | Whether to poll until the lookup completes. |

**TIDE Threat Data:**

| Resource | Endpoint | Notes |
| --- | --- | --- |
| TIDE Threat | `/tide/api/data/threats` | **Get Many only.** Get Many filters: Indicator Type, Profile. Uses `rlimit` (max 10,000). |
| TIDE Batch | `/tide/api/data/batches` | Create, Get, Get Many. |

### Infrastructure & Locations (infra v1)

| Resource | Endpoint | Notes |
| --- | --- | --- |
| Infrastructure Host | `/api/infra/v1/hosts` | Full CRUD. |
| Infrastructure Service | `/api/infra/v1/services` | Full CRUD. |
| Location | `/api/infra/v1/locations` | Full CRUD. |

### Cloud Data Connector (cdc-flow v1)

| Resource | Endpoint | Notes |
| --- | --- | --- |
| CDC Application | `/api/cdc-flow/v1/applications` | Full CRUD. |
| CDC Destination: HTTP | `/api/cdc-flow/v1/destinations/http` | Full CRUD. |
| CDC Destination: Splunk | `/api/cdc-flow/v1/destinations/splunk` | Full CRUD. |
| CDC Destination: Syslog | `/api/cdc-flow/v1/destinations/syslog` | Full CRUD. |
| CDC Host | `/api/cdc-flow/v1/cdcs/hosts` | Get, Get Many. |

### Audit Log & Service Logs

| Resource | Endpoint | Notes |
| --- | --- | --- |
| Audit Log | `/api/auditlog/v1/logs` | **Get Many only.** Filter via the **Filter Expression** field (`_filter`). |
| Service Log | `/atlas-logs/v2/logs` | **Get Many only.** Filters: Service ID (`service_id`), Container Name (`container_name`), On-Prem Host ID (`ophid`), Start (`start`), End (`end`). |

### Authentication Profiles (authn v1)

| Resource | Endpoint | Notes |
| --- | --- | --- |
| Auth Profile: LDAP | `/api/authn/v1/profiles/ldap` | Full CRUD. |
| Auth Profile: OIDC | `/api/authn/v1/profiles/oidc` | Full CRUD. |
| Auth Profile: SAML | `/api/authn/v1/profiles/saml` | Full CRUD. |

### NTP Service Config (ntp v1)

| Resource | Endpoint | Notes |
| --- | --- | --- |
| NTP Service Config | `/api/ntp/v1/service/config` | Get, Get Many, Update, Delete. Update uses POST (upsert). Filter via the **Filter Expression** field. |

### Identity (v2)

| Resource | Endpoint | Notes |
| --- | --- | --- |
| Identity: User | `/v2/users` | Full CRUD. |
| Identity: Group | `/v2/groups` | Full CRUD. |
| Identity: Compartment | `/v2/compartments` | Create, Get, Get Many, Update (no delete). |

Filter Expression example: `name=="admin"`.

### Global Search (atlas-search-api v1)

The **Global Search** resource POSTs a query across all Portal resources:

| Field | Description |
| --- | --- |
| Search Query | Required. Search string (3–300 characters). |
| Additional Options | Optional JSON object (filters, limit, offset, highlight, exact_token). |

### Custom API Request

The **Custom API Request** resource calls any CSP endpoint not covered above:

| Field | Description |
| --- | --- |
| HTTP Method | GET, POST, PUT, PATCH, or DELETE. |
| Endpoint | Path (e.g. `/api/ddi/v1/ipam/ip_space`) or absolute URL. |
| JSON Body | Optional request body for POST/PUT/PATCH. |
| Query Parameters | Optional key/value query parameters. |

---

## Resources — NIOS WAPI

### NIOS WAPI Object

A generic resource for any WAPI object type (Create, Get, Get Many, Update, Delete):

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

- **Get / Update / Delete** operate on a WAPI `_ref`, supplied in the **Object Reference** field, e.g.
  `record:host/ZG5zLmhvc3Qk...:app1.example.com/default`. Slash-separated segments are individually URL-encoded.
- **Create / Update** use the **Fields** resource mapper (loaded from the NIOS openspec for the selected object type, by WAPI version) with **JSON Body** as a fallback.
- **Get Many** paginates with `_paging`, `_return_as_object`, `_max_results`, and `_page_id` when **Return All** is enabled.

### NIOS Custom API Request

Sends an arbitrary request to the Grid Master. Endpoint paths are accepted with or without the `/wapi/v<version>` prefix.

---

## Query Parameters

The **Query Parameters** collection appends raw key/value pairs to any request — for field selection, ordering, or controls not exposed as structured fields.

| Context | Examples |
| --- | --- |
| Universal DDI | `_filter=name=="default"`, `_fields=id,name,comment`, `_order_by=name asc`, `_limit`, `_offset` |
| TIDE | `type=host`, `profile=malware`, `detected=true`, `rlimit=1000` |
| NIOS WAPI | `_return_fields=name,ipv4addrs`, `_return_as_object=1`, `_max_results=500`, `name=app1.example.com`, `network_view=default` |

---

## Example workflows

**List all subnets in an IP Space**
1. Resource: **Subnet** → Operation: **Get Many**
2. Filter Expression: `space=="<space-id>"`
3. Return All: enabled

**Create a DNS A record**
1. Resource: **DNS Record** → Operation: **Create**
2. Fields: set `type` = `A`, `name_in_zone` = `app1`, `zone` = `<zone-id>`, `rdata` = `{ "address": "10.0.0.10" }`

**Look up a threat indicator in TIDE Dossier**
1. Resource: **TIDE Dossier Lookup**
2. Indicator Type: **Host**, Indicator Value: `malware.example.com`, Wait for Results: enabled

**Query DNS security events for the last hour**
1. Resource: **DNS Event**
2. Start Time: one hour ago, End Time: now
3. Threat Class: `Malware`, Return All: enabled

**Audit log entries via filter expression**
1. Resource: **Audit Log** → Operation: **Get Many**
2. Filter Expression: `user_name=="admin@example.com"`

**Get NIOS host records for a domain**
1. Resource: **NIOS WAPI Object** → Object Type: **Host Record** → Operation: **Get Many**
2. Query Parameters: `name = app1.example.com`, `_return_fields = name,ipv4addrs`

---

## Development

```bash
pnpm install       # install dependencies
pnpm build         # compile to dist/
pnpm lint          # n8n community-node lint rules
pnpm lint:fix      # auto-fix lint errors
pnpm dev           # watch mode
```

Requires pnpm 11+ and TypeScript 5+. Built output goes to `dist/` (the only thing published) and is not committed.

### Project layout

```
credentials/
  InfobloxCspApi.credentials.ts     # CSP token credential
  InfobloxNiosApi.credentials.ts    # NIOS basic-auth credential
nodes/Infoblox/
  Infoblox.node.ts                  # thin entry: description, routing, methods
  Infoblox.node.json
  constants.ts                      # endpoints, resource groups, update-method rules
  types.ts
  GenericFunctions.ts               # transport, pagination, body/response helpers
  swagger.ts                        # runtime spec fetch + resource-mapper columns
  descriptions/                     # resource / operation / field definitions
    SharedDescription.ts            #   resource selector, shared mapper, query params
    CloudDescription.ts             #   Portal resources, per-resource operations, fields
    NiosDescription.ts              #   NIOS object + custom request
    index.ts
  actions/                          # execution logic
    cloud.ts
    nios.ts
  infoblox.svg
```

Releases are cut by publishing a GitHub Release tagged with the version; a GitHub Actions workflow then publishes to npm with provenance.

---

## Notes & limitations

- The resource mapper covers create/update body schemas. For deeply nested object shapes, the **JSON Body** field (merged over the mapped fields) and **Custom API Request** remain available.
- Available operations and fields ultimately depend on your Infoblox product version, enabled modules, and account permissions.
- Authentication is API key (CSP) and basic auth (NIOS); OAuth is not implemented.
- TIDE list requests are capped at 10,000 records (`rlimit`).
- Enable **Ignore SSL Issues** only in controlled environments, and prefer least-privilege API accounts (read-only for monitoring, write access only for provisioning).

---

## API documentation

- [Infoblox CSP API Reference](https://csp.infoblox.com/apidoc)
- [Infoblox NIOS WAPI / openspec](https://infobloxopen.github.io/nios-swagger/)
- [n8n Community Nodes Docs](https://docs.n8n.io/integrations/community-nodes/)

---

## License

MIT
