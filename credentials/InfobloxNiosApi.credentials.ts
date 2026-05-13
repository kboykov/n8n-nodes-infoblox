import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	Icon,
	INodeProperties,
} from 'n8n-workflow';

export class InfobloxNiosApi implements ICredentialType {
	name = 'infobloxNiosApi';

	displayName = 'Infoblox NIOS API';

	icon: Icon = 'file:../nodes/Infoblox/infoblox.svg';

	documentationUrl = 'https://docs.infoblox.com/';

	properties: INodeProperties[] = [
		{
			displayName: 'Grid Master URL',
			name: 'gridMasterUrl',
			type: 'string',
			default: '',
			placeholder: 'https://grid-master.example.com',
			description: 'Base URL of the NIOS Grid Master',
		},
		{
			displayName: 'WAPI Version',
			name: 'wapiVersion',
			type: 'string',
			default: '2.13.7',
			placeholder: '2.13.7',
		},
		{
			displayName: 'Username',
			name: 'username',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
		{
			displayName: 'Ignore SSL Issues',
			name: 'ignoreSslIssues',
			type: 'boolean',
			default: false,
			description: 'Whether to connect even if the NIOS appliance uses a self-signed certificate',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			auth: {
				username: '={{$credentials?.username}}',
				password: '={{$credentials?.password}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials?.gridMasterUrl}}',
			url: '=/wapi/v{{$credentials?.wapiVersion}}/grid',
			method: 'GET',
			skipSslCertificateValidation: '={{$credentials?.ignoreSslIssues}}',
		},
	};
}
