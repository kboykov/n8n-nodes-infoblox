import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	Icon,
	INodeProperties,
} from 'n8n-workflow';

export class InfobloxCspApi implements ICredentialType {
	name = 'infobloxCspApi';

	displayName = 'Infoblox Portal API';

	icon: Icon = 'file:../nodes/Infoblox/infoblox.svg';

	documentationUrl = 'https://www.infoblox.com/developer-portal/getting-started/';

	properties: INodeProperties[] = [
		{
			displayName: 'Realm',
			name: 'realm',
			type: 'options',
			options: [
				{
					name: 'Global',
					value: 'https://csp.infoblox.com',
				},
				{
					name: 'Europe',
					value: 'https://csp.eu.infoblox.com',
				},
				{
					name: 'Custom',
					value: 'custom',
				},
			],
			default: 'https://csp.infoblox.com',
		},
		{
			displayName: 'Custom Base URL',
			name: 'customBaseUrl',
			type: 'string',
			default: '',
			placeholder: 'https://csp.example.infoblox.com',
			displayOptions: {
				show: {
					realm: ['custom'],
				},
			},
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Token {{$credentials?.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL:
				'={{$credentials?.realm === "custom" ? $credentials?.customBaseUrl : $credentials?.realm}}',
			url: '/api/ddi/v1/ipam/ip_space',
			method: 'GET',
		},
	};
}
