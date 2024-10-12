import { LookupOperationNodeName } from '../searchOperationNodeName';
import { SearchOperationNode } from '../searchOperationNode';
import { IdSet, MetadataManager } from '../../../../commands/metadataManager';

export class SelectAllOperationNode extends SearchOperationNode<LookupOperationNodeName.SelectAllOperation> {
  constructor() {
    super(LookupOperationNodeName.SelectAllOperation);
  }

  compute(metadataManager: MetadataManager): IdSet {
    throw new Error('Not implemented');
  }
}
