import type { INodeProperties } from 'n8n-workflow';

import { cloudDescription } from './CloudDescription';
import { niosDescription } from './NiosDescription';
import { queryParameters, resourceSelector } from './SharedDescription';

/** All node properties, assembled in display order. */
export const nodeProperties: INodeProperties[] = [
	resourceSelector,
	...cloudDescription,
	...niosDescription,
	...queryParameters,
];

export { resourceSelector, queryParameters, cloudDescription, niosDescription };
