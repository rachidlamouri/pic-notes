import { IdSet, MetadataManager } from '../../../../commands/metadataManager';
import { LookupOperationNodeName } from '../searchOperationNodeName';
import { LookupOperationNode } from './lookupOperationNode';

export class HasAllTagValuesOperationNode extends LookupOperationNode<LookupOperationNodeName.HasAllTagValuesOperation> {
  constructor(
    public tagName: string,
    public tagValueList: string[],
  ) {
    super(LookupOperationNodeName.HasAllTagValuesOperation);
  }

  compute(metadataManager: MetadataManager): IdSet {
    throw new Error('Not implemented');
  }
}
