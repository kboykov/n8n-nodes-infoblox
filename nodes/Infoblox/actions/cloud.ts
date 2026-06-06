import type { IDataObject, IExecuteFunctions, IHttpRequestMethods } from 'n8n-workflow';

import { CLOUD_ENDPOINTS, FILTER_EXPRESSION_RESOURCE_SET, getCloudUpdateMethod } from '../constants';
import {
	buildCloudItemEndpoint,
	buildMappedBody,
	extractList,
	getManyCloudItems,
	getQueryParameters,
	infobloxCloudRequest,
	parseJsonParameter,
} from '../GenericFunctions';

/** Route a single item through the appropriate cloud (CSP) request. */
export async function executeCloudOperation(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<unknown> {
	const cloudResource = this.getNodeParameter('resource', itemIndex) as string;
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

	const operation = this.getNodeParameter('operation', itemIndex) as string;
	const endpoint = CLOUD_ENDPOINTS[cloudResource];

	if (operation === 'getAll') {
		const returnAll = this.getNodeParameter('returnAll', itemIndex) as boolean;
		const limit = this.getNodeParameter('limit', itemIndex, 50) as number;
		const resourceFilters = getResourceFilters(this, itemIndex, cloudResource);
		const mergedQs = { ...qs, ...resourceFilters };

		return getManyCloudItems.call(this, cloudResource, endpoint, mergedQs, returnAll, limit);
	}

	if (operation === 'create') {
		const body = buildMappedBody(this, itemIndex);

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

	// update
	const body = buildMappedBody(this, itemIndex);

	return infobloxCloudRequest.call(this, getCloudUpdateMethod(cloudResource), itemEndpoint, qs, body);
}

/** Collect resource-specific list filters into a query-string object. */
function getResourceFilters(
	executeFunctions: IExecuteFunctions,
	itemIndex: number,
	cloudResource: string,
): IDataObject {
	const filters: IDataObject = {};

	if (FILTER_EXPRESSION_RESOURCE_SET.has(cloudResource)) {
		const expr = executeFunctions.getNodeParameter('filterExpression', itemIndex, '') as string;
		if (expr) filters._filter = expr;
	}

	if (cloudResource === 'serviceLog') {
		const serviceId = executeFunctions.getNodeParameter('serviceLogServiceId', itemIndex, '') as string;
		const containerName = executeFunctions.getNodeParameter(
			'serviceLogContainerName',
			itemIndex,
			'',
		) as string;
		const ophid = executeFunctions.getNodeParameter('serviceLogOphid', itemIndex, '') as string;
		const start = executeFunctions.getNodeParameter('serviceLogStart', itemIndex, '') as string;
		const end = executeFunctions.getNodeParameter('serviceLogEnd', itemIndex, '') as string;
		if (serviceId) filters.service_id = serviceId;
		if (containerName) filters.container_name = containerName;
		if (ophid) filters.ophid = ophid;
		if (start) filters.start = start;
		if (end) filters.end = end;
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

	return filters;
}

/** Convert a date/time value or epoch into Unix epoch seconds. */
function toEpochSeconds(value: unknown): number {
	const fromNumber = (input: number): number =>
		input > 1e12 ? Math.floor(input / 1000) : Math.floor(input);

	if (typeof value === 'number' && !Number.isNaN(value)) {
		return fromNumber(value);
	}

	if (typeof value === 'string' && value.trim() !== '') {
		const numeric = Number(value);
		if (!Number.isNaN(numeric)) {
			return fromNumber(numeric);
		}

		const parsed = Date.parse(value);
		if (!Number.isNaN(parsed)) {
			return Math.floor(parsed / 1000);
		}
	}

	return 0;
}

/** Collect the DNS event convenience filters into a query-string object. */
function getDnsEventFilters(
	executeFunctions: IExecuteFunctions,
	itemIndex: number,
): IDataObject {
	const filters: IDataObject = {};
	const mapping: Array<[string, string]> = [
		['dnsEventQname', 'qname'],
		['dnsEventQip', 'qip'],
		['dnsEventPolicy', 'policy_name'],
		['dnsEventThreatClass', 'threat_class'],
	];

	for (const [parameter, key] of mapping) {
		const value = executeFunctions.getNodeParameter(parameter, itemIndex, '') as string;
		if (value) {
			filters[key] = value;
		}
	}

	return filters;
}

/** DNS Event time-range query, with optional transparent pagination. */
async function executeDnsEventQuery(
	this: IExecuteFunctions,
	itemIndex: number,
	qs: IDataObject,
): Promise<unknown> {
	const t0 = toEpochSeconds(this.getNodeParameter('dnsEventT0', itemIndex));
	const t1 = toEpochSeconds(this.getNodeParameter('dnsEventT1', itemIndex));
	const returnAll = this.getNodeParameter('dnsEventReturnAll', itemIndex, false) as boolean;
	const limit = this.getNodeParameter('dnsEventLimit', itemIndex, 100) as number;
	const endpoint = CLOUD_ENDPOINTS.dnsEvent;
	const baseQs: IDataObject = { ...qs, ...getDnsEventFilters(this, itemIndex), t0, t1 };

	if (!returnAll) {
		const response = await infobloxCloudRequest.call(this, 'GET', endpoint, {
			...baseQs,
			_limit: limit,
		});

		return extractList(response) ?? response;
	}

	const allItems: IDataObject[] = [];
	const pageSize = 1000;
	let offset = 0;

	while (true) {
		const response = await infobloxCloudRequest.call(this, 'GET', endpoint, {
			...baseQs,
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

/** TIDE Dossier indicator intelligence lookup. */
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

/** Global search across all Infoblox Portal resources. */
async function executeGlobalSearch(
	this: IExecuteFunctions,
	itemIndex: number,
	qs: IDataObject,
): Promise<unknown> {
	const query = this.getNodeParameter('globalSearchQuery', itemIndex) as string;
	const options = parseJsonParameter(this.getNodeParameter('globalSearchOptions', itemIndex, {}));

	const body: IDataObject = { query, ...options };

	return infobloxCloudRequest.call(this, 'POST', CLOUD_ENDPOINTS.globalSearch, qs, body);
}
