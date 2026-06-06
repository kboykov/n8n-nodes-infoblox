import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
} from 'n8n-workflow';

import { TIDE_DATA_RESOURCES } from './constants';
import type { QueryParameterCollection } from './types';

/* -------------------------------------------------------------------------- */
/*                                  Transport                                  */
/* -------------------------------------------------------------------------- */

/** Perform an authenticated request against the Infoblox Portal (CSP) API. */
export async function infobloxCloudRequest(
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

/** Perform an authenticated request against the NIOS WAPI. */
export async function infobloxNiosRequest(
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

/* -------------------------------------------------------------------------- */
/*                                 Pagination                                 */
/* -------------------------------------------------------------------------- */

/** List cloud items, transparently paginating when `returnAll` is set. */
export async function getManyCloudItems(
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

/** List NIOS WAPI objects, transparently paginating when `returnAll` is set. */
export async function getManyNiosItems(
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

/* -------------------------------------------------------------------------- */
/*                                  Helpers                                    */
/* -------------------------------------------------------------------------- */

/** Read the free-form "Query Parameters" fixed collection into a plain object. */
export function getQueryParameters(
	executeFunctions: IExecuteFunctions,
	itemIndex: number,
): IDataObject {
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

/** Resolve the effective NIOS object type, honouring the "Custom" choice. */
export function getNiosObjectType(
	executeFunctions: IExecuteFunctions,
	itemIndex: number,
): string {
	const objectType = executeFunctions.getNodeParameter('objectType', itemIndex) as string;

	if (objectType !== 'custom') {
		return objectType;
	}

	return executeFunctions.getNodeParameter('customObjectType', itemIndex) as string;
}

/** Build the single-record endpoint for a cloud resource. */
export function buildCloudItemEndpoint(
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

/**
 * Build a request body for create/update operations: the resource-mapper fields
 * (loaded at runtime from the swagger spec) with the raw JSON Body merged on top
 * so it can override or supply fields the schema does not cover.
 */
export function buildMappedBody(
	executeFunctions: IExecuteFunctions,
	itemIndex: number,
): IDataObject {
	const mapped = executeFunctions.getNodeParameter('dataFields.value', itemIndex, {});
	const mappedBody = isDataObject(mapped) ? mapped : {};
	const jsonBody = parseJsonParameter(executeFunctions.getNodeParameter('jsonBody', itemIndex, {}));

	return { ...mappedBody, ...jsonBody };
}

export function parseJsonParameter(value: unknown): IDataObject {
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

/** Extract a list of records from the various shapes Infoblox APIs return. */
export function extractList(response: unknown): IDataObject[] | undefined {
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

/** Normalise an arbitrary response into an array of output items. */
export function toOutputItems(responseData: unknown): IDataObject[] {
	if (Array.isArray(responseData)) {
		return responseData.map((item) => toDataObject(item));
	}

	return [toDataObject(responseData)];
}

export function toDataObject(value: unknown): IDataObject {
	if (isDataObject(value)) {
		return value;
	}

	return {
		result: value as string | number | boolean | null,
	};
}

export function isDataObject(value: unknown): value is IDataObject {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function normalizeBaseUrl(url: string): string {
	return url.replace(/\/+$/, '');
}

export function normalizePath(path: string): string {
	return path.startsWith('/') ? path : `/${path}`;
}

export function normalizeNiosEndpoint(endpoint: string, wapiVersion: string): string {
	const normalizedEndpoint = normalizePath(endpoint);

	if (normalizedEndpoint.startsWith('/wapi/')) {
		return normalizedEndpoint;
	}

	return `/wapi/v${wapiVersion}${normalizedEndpoint}`;
}

export function encodeWapiReference(reference: string): string {
	return reference
		.split('/')
		.map((part) => encodeURIComponent(part))
		.join('/');
}
