import type { IExecuteFunctions, IHttpRequestMethods } from 'n8n-workflow';

import {
	encodeWapiReference,
	getManyNiosItems,
	getNiosObjectType,
	getQueryParameters,
	infobloxNiosRequest,
	parseJsonParameter,
} from '../GenericFunctions';

/** Route a single item through the appropriate NIOS WAPI request. */
export async function executeNiosOperation(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<unknown> {
	const niosResource = this.getNodeParameter('resource', itemIndex) as string;
	const qs = getQueryParameters(this, itemIndex);

	if (niosResource === 'niosCustom') {
		const method = this.getNodeParameter('customMethod', itemIndex) as IHttpRequestMethods;
		const endpoint = this.getNodeParameter('customEndpoint', itemIndex) as string;
		const body = ['GET', 'DELETE'].includes(method)
			? undefined
			: parseJsonParameter(this.getNodeParameter('customJsonBody', itemIndex, {}));

		return infobloxNiosRequest.call(this, method, endpoint, qs, body);
	}

	const operation = this.getNodeParameter('operation', itemIndex) as string;

	if (operation === 'getAll') {
		const returnAll = this.getNodeParameter('returnAll', itemIndex) as boolean;
		const limit = this.getNodeParameter('limit', itemIndex, 50) as number;
		const objectType = getNiosObjectType(this, itemIndex);

		return getManyNiosItems.call(this, objectType, qs, returnAll, limit);
	}

	if (operation === 'create') {
		const objectType = getNiosObjectType(this, itemIndex);
		const body = parseJsonParameter(this.getNodeParameter('jsonBody', itemIndex, {}));

		return infobloxNiosRequest.call(this, 'POST', `/${encodeURIComponent(objectType)}`, qs, body);
	}

	const objectReference = this.getNodeParameter('objectReference', itemIndex) as string;
	const endpoint = `/${encodeWapiReference(objectReference)}`;

	if (operation === 'get') {
		return infobloxNiosRequest.call(this, 'GET', endpoint, qs);
	}

	if (operation === 'delete') {
		return infobloxNiosRequest.call(this, 'DELETE', endpoint, qs);
	}

	// update
	const body = parseJsonParameter(this.getNodeParameter('jsonBody', itemIndex, {}));

	return infobloxNiosRequest.call(this, 'PUT', endpoint, qs, body);
}
