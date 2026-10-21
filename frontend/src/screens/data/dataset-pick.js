/** Picking datasets in the Data Explorer's Fields filters for a lab. */

import { createPick } from '@/lib/pick'
/** The ids are the datasets; the extra is the filter they were chosen under, which the lab
 *  applies to their fields. */
export const useDatasetPick = createPick('alpha-harness-dataset-pick', '/labs/search')
