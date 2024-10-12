import { IdSet, MetadataManager } from '../../../../commands/metadataManager';
import { LookupOperationNodeName } from '../searchOperationNodeName';
import { LookupOperationNode } from './lookupOperationNode';

export class HasExactTagValuesOperationNode extends LookupOperationNode<LookupOperationNodeName.HasExactTagValuesOperation> {
  constructor(
    public tagName: string,
    public tagValueList: string[],
  ) {
    super(LookupOperationNodeName.HasExactTagValuesOperation);
  }

  compute(metadataManager: MetadataManager): IdSet {
    throw new Error('Not implemented');
  }
}
