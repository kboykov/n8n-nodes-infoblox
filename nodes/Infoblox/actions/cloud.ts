import type { IDataObject, IExecuteFunctions, IHttpRequestMethods } from 'n8n-workflow';

import { CLOUD_ENDPOINTS, FILTER_EXPRESSION_RESOURCE_SET, getCloudUpdateMethod } from '../constants';
import {
	buildCloudItemEndpoint,
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

	// update
	const body = parseJsonParameter(this.getNodeParameter('jsonBody', itemIndex, {}));

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

/** DNS Event time-range query, with optional transparent pagination. */
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
