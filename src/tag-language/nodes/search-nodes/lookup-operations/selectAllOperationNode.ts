import { LookupOperationNodeName } from '../searchOperationNodeName';
import { SearchOperationNode } from '../searchOperationNode';
import { IdSet, MetadataManager } from '../../../../commands/metadataManager';

export class SelectAllOperationNode extends SearchOperationNode<LookupOperationNodeName.SelectAllOperation> {
  constructor() {
    super(LookupOperationNodeName.SelectAllOperation);
  }

  compute(metadataManager: MetadataManager): IdSet {
    const ids = Object.values(metadataManager.metadata.metaById).map(
      (meta) => meta.id,
    );

    return new Set(ids);
  }
}
