import {
	NodeConnectionTypes,
	NodeOperationError,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

import { executeCloudOperation } from './actions/cloud';
import { executeNiosOperation } from './actions/nios';
import { ALL_CLOUD_RESOURCES, NIOS_RESOURCES } from './constants';
import { nodeProperties } from './descriptions';
import { toOutputItems } from './GenericFunctions';

const NIOS_RESOURCE_SET = new Set(NIOS_RESOURCES);

export class Infoblox implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Infoblox',
		name: 'infoblox',
		icon: 'file:infoblox.svg',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Work with Infoblox Universal DDI, Threat Defense, TIDE, and NIOS WAPI',
		defaults: {
			name: 'Infoblox',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'infobloxCspApi',
				required: true,
				displayOptions: {
					show: {
						resource: ALL_CLOUD_RESOURCES,
					},
				},
			},
			{
				name: 'infobloxNiosApi',
				required: true,
				displayOptions: {
					show: {
						resource: NIOS_RESOURCES,
					},
				},
			},
		],
		properties: nodeProperties,
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const resource = this.getNodeParameter('resource', itemIndex) as string;
				const responseData = NIOS_RESOURCE_SET.has(resource)
					? await executeNiosOperation.call(this, itemIndex)
					: await executeCloudOperation.call(this, itemIndex);

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(toOutputItems(responseData)),
					{ itemData: { item: itemIndex } },
				);
				returnData.push(...executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: error instanceof Error ? error.message : String(error),
						},
						pairedItem: {
							item: itemIndex,
						},
					});
					continue;
				}

				if (error instanceof Error) {
					throw new NodeOperationError(this.getNode(), error, { itemIndex });
				}

				throw new NodeOperationError(this.getNode(), String(error), { itemIndex });
			}
		}

		return [returnData];
	}
}
