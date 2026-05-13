# n8n Nodes Infoblox

`n8n-nodes-infoblox` is a community node package for [n8n](https://n8n.io/) that lets workflows interact with Infoblox DDI services. It supports both modern Infoblox Portal / Universal DDI APIs and classic NIOS WAPI APIs, so the same n8n node can automate cloud-managed DDI objects and appliance-backed Grid Master objects.

The node is intended for DNS, DHCP, IPAM, and network-automation workflows such as allocating subnets, searching IP spaces, creating DNS records, querying NIOS objects, enriching incidents with DDI context, and calling Infoblox endpoints that are not yet modeled as first-class operations.

## Features

- Infoblox Portal / CSP API key authentication.
- Infoblox NIOS WAPI basic authentication.
- Global, Europe, and custom Infoblox Portal base URLs.
- Configurable NIOS Grid Master URL and WAPI version.
- Optional SSL certificate validation bypass for lab or self-signed NIOS appliances.
- Create, get, get many, update, and delete operations for common Universal DDI resources.
- Generic NIOS WAPI object operations.
- Custom API request mode for both API families.
- Query parameter builder for filters, field selection, paging controls, and WAPI options.
- n8n-compatible credential tests, build output, linting, and package metadata.

## Supported Infoblox API Interfaces

### Infoblox Portal / Universal DDI

The Infoblox Portal API, also commonly referred to as the CSP API in Infoblox documentation, is the API surface for Universal DDI and other cloud-managed Infoblox services. This node uses API key authentication and sends requests with:

```http
Authorization: Token <api-key>
Accept: application/json
```

The credential supports these Portal realms:

- `https://csp.infoblox.com` for the global realm.
- `https://csp.eu.infoblox.com` for the Europe realm.
- A custom base URL for private, regional, or future Infoblox Portal deployments.

The credential test calls:

```text
GET /api/ddi/v1/ipam/ip_space
```

This validates that the API key and base URL can reach a Universal DDI endpoint.

### Infoblox NIOS WAPI

NIOS WAPI is the REST API exposed by Infoblox NIOS Grid Master appliances. This node supports basic authentication against a configured Grid Master URL and WAPI version.

The credential asks for:

- Grid Master URL, for example `https://grid-master.example.com`.
- WAPI Version, for example `2.13.7`.
- Username.
- Password.
- Ignore SSL Issues, useful for lab systems with self-signed certificates.

The credential test calls:

```text
GET /wapi/v<version>/grid
```

Custom NIOS endpoints may be entered either with or without the `/wapi/v<version>` prefix. For example, `/record:a` and `/wapi/v2.13.7/record:a` are both accepted.

## Node Operations

The node has a top-level `Platform` selector:

- `Infoblox Portal / Universal DDI`
- `NIOS WAPI`

Each platform exposes the resources and operations relevant to that API family.

## Universal DDI Resources

The Universal DDI side currently includes first-class support for these resources:

| n8n Resource | Endpoint |
| --- | --- |
| IP Space | `/api/ddi/v1/ipam/ip_space` |
| IP Address | `/api/ddi/v1/ipam/address` |
| Address Block | `/api/ddi/v1/ipam/address_block` |
| Subnet | `/api/ddi/v1/ipam/subnet` |
| IPAM Range | `/api/ddi/v1/ipam/range` |
| Fixed Address | `/api/ddi/v1/dhcp/fixed_address` |
| DNS Authoritative Zone | `/api/ddi/v1/dns/auth_zone` |
| DNS Record | `/api/ddi/v1/dns/record` |
| Custom API Request | User-provided endpoint |

The modeled Universal DDI resources support:

- `Get Many`: list resources, optionally with query parameters.
- `Get`: fetch a resource by ID.
- `Create`: create a resource using a JSON body.
- `Update`: patch a resource by ID using a JSON body.
- `Delete`: delete a resource by ID.

The node appends resource IDs to the endpoint for `Get`, `Update`, and `Delete` operations:

```text
/api/ddi/v1/ipam/ip_space/<resource-id>
```

## NIOS WAPI Resources

The NIOS side exposes a generic `WAPI Object` resource for common object types:

- A Record, `record:a`
- AAAA Record, `record:aaaa`
- Authoritative Zone, `zone_auth`
- CNAME Record, `record:cname`
- Fixed Address, `fixedaddress`
- Grid, `grid`
- Host Record, `record:host`
- Member, `member`
- Network, `network`
- Network View, `networkview`
- PTR Record, `record:ptr`
- Range, `range`
- TXT Record, `record:txt`
- View, `view`
- Custom object type

The `WAPI Object` resource supports:

- `Get Many`: list objects of the selected type.
- `Get`: fetch an object by WAPI `_ref`.
- `Create`: create an object using a JSON body.
- `Update`: update an object by WAPI `_ref` using a JSON body.
- `Delete`: delete an object by WAPI `_ref`.

For `Get`, `Update`, and `Delete`, provide the WAPI `_ref` returned by Infoblox, for example:

```text
record:host/ZG5zLmhvc3QkLl9kZWZhdWx0LmV4YW1wbGUuY29tLmFwcDE:app1.example.com/default
```

The node preserves the slash-separated WAPI reference structure while URL-encoding each segment.

## Custom API Requests

Both platforms include `Custom API Request` for endpoints that are not yet exposed as typed resources.

Custom request fields:

- HTTP Method: `GET`, `POST`, `PUT`, `PATCH`, or `DELETE`.
- Endpoint: a path or absolute URL, depending on the platform.
- JSON Body: optional body for methods that send one.
- Query Parameters: optional key/value query parameters.

Universal DDI examples:

```text
GET /api/ddi/v1/ipam/ip_space
GET /api/ddi/v1/dns/record
POST /api/ddi/v1/ipam/subnet
```

NIOS examples:

```text
GET /record:a
GET /network
POST /record:host
GET /wapi/v2.13.7/grid
```

## Query Parameters

The `Query Parameters` collection is available for all operations. Use it for Infoblox filters, field selection, and WAPI-specific controls.

Universal DDI examples:

| Name | Example Value | Purpose |
| --- | --- | --- |
| `_filter` | `name=="default"` | Filter returned objects |
| `_fields` | `id,name,comment` | Limit returned fields |
| `_limit` | `100` | Override page size |
| `_offset` | `200` | Start result offset |

NIOS WAPI examples:

| Name | Example Value | Purpose |
| --- | --- | --- |
| `_return_fields` | `name,ipv4addrs` | Return selected fields |
| `_return_as_object` | `1` | Return a WAPI object envelope |
| `_max_results` | `100` | Limit results |
| `name` | `app1.example.com` | Object-specific search field |
| `network_view` | `default` | Object-specific search field |

For `Get Many`, the node has a `Return All` option. Universal DDI paging uses `_limit` and `_offset`. NIOS paging uses `_paging`, `_return_as_object`, `_max_results`, and `_page_id`.

## Example Workflows

### List Universal DDI IP Spaces

1. Add an Infoblox node.
2. Set `Platform` to `Infoblox Portal / Universal DDI`.
3. Set `Resource` to `IP Space`.
4. Set `Operation` to `Get Many`.
5. Add optional query parameters such as `_fields = id,name,comment`.

### Create a Universal DDI DNS Record

1. Set `Platform` to `Infoblox Portal / Universal DDI`.
2. Set `Resource` to `DNS Record`.
3. Set `Operation` to `Create`.
4. Provide the JSON body required by the Infoblox DNS record API.

Example body shape depends on the specific DNS record type and Infoblox API version, but it is entered as raw JSON in the node.

### Query NIOS Host Records

1. Set `Platform` to `NIOS WAPI`.
2. Set `Resource` to `WAPI Object`.
3. Set `Object Type` to `Host Record`.
4. Set `Operation` to `Get Many`.
5. Add query parameters such as `name = app1.example.com` or `_return_fields = name,ipv4addrs`.

### Create a NIOS A Record

1. Set `Platform` to `NIOS WAPI`.
2. Set `Resource` to `WAPI Object`.
3. Set `Object Type` to `A Record`.
4. Set `Operation` to `Create`.
5. Provide a JSON body accepted by NIOS WAPI for `record:a`.

Example:

```json
{
	"name": "app1.example.com",
	"ipv4addr": "192.0.2.10",
	"view": "default"
}
```

## Installation

Install this package as an n8n community node once it is published to npm:

```bash
npm install n8n-nodes-infoblox
```

For local development, clone the repository and use pnpm:

```bash
git clone https://github.com/kboykov/n8n-nodes-infoblox.git
cd n8n-nodes-infoblox
pnpm install
pnpm run build
```

Start n8n with the local node loaded:

```bash
pnpm run dev
```

## Development

This project follows the current n8n community-node starter structure.

Useful commands:

```bash
pnpm install
pnpm run build
pnpm run lint
pnpm run lint:fix
pnpm run dev
```

The package uses:

- TypeScript
- `@n8n/node-cli`
- n8n community-node lint rules
- pnpm 11

Generated files are written to `dist/` and are not committed.

## Project Layout

```text
.
├── credentials/
│   ├── InfobloxCspApi.credentials.ts
│   └── InfobloxNiosApi.credentials.ts
├── nodes/
│   └── Infoblox/
│       ├── Infoblox.node.ts
│       ├── Infoblox.node.json
│       └── infoblox.svg
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
└── tsconfig.json
```

## Security Notes

- Store Infoblox credentials only in n8n credentials.
- Avoid enabling `Ignore SSL Issues` outside lab or controlled environments.
- Use least-privilege Infoblox API accounts where possible.
- Review JSON bodies before running create, update, or delete operations against production DNS, DHCP, or IPAM data.

## Current Limitations

- The node does not yet provide typed fields for every Infoblox object schema. Use JSON bodies and custom requests for advanced objects.
- Live API behavior depends on your Infoblox product version, enabled services, permissions, and WAPI version.
- OAuth flows are not implemented; Universal DDI uses API key authentication and NIOS uses basic authentication.
- The node has been build- and lint-verified locally, but live API calls require your Infoblox environment and credentials.

## API Documentation

- [Infoblox Developer Portal API Documentation](https://www.infoblox.com/developer-portal/developer-portal-api-documentation/)
- [Infoblox Developer Portal Getting Started](https://www.infoblox.com/developer-portal/getting-started/)
- [n8n Community Nodes Documentation](https://docs.n8n.io/integrations/community-nodes/)

## License

MIT
