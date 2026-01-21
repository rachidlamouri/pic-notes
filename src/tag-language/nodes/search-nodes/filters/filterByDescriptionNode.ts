import { FilterNodeName } from '../searchOperationNodeName';
import { Meta } from '../../../../commands/metadataManager';
import { FilterNode } from './filterNode';

export class FilterByDescriptionNode extends FilterNode<FilterNodeName.Description> {
  constructor(public hasDescription: boolean) {
    super(FilterNodeName.Description);
  }

  compute(meta: Meta): boolean {
    return meta.hasDescription === this.hasDescription;
  }
}
