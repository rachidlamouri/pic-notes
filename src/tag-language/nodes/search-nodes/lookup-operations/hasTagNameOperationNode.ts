import { IdSet, MetadataManager } from '../../../../commands/metadataManager';
import { LookupOperationNodeName } from '../searchOperationNodeName';
import { LookupOperationNode } from './lookupOperationNode';

export class HasTagNameOperationNode extends LookupOperationNode<LookupOperationNodeName.HasTagNameOperation> {
  constructor(public tagName: string) {
    super(LookupOperationNodeName.HasTagNameOperation);
  }

  compute(metadataManager: MetadataManager): IdSet {
    const result = metadataManager.getIds(this.tagName, []);
    return result;
  }
}
