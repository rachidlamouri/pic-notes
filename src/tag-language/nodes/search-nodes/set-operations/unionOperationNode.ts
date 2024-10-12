import { SetOperationNodeName } from '../searchOperationNodeName';
import { GenericSearchOperationNode } from '../searchOperationNode';
import { SetOperationNode } from './setOperationNode';
import { IdSet, MetadataManager } from '../../../../commands/metadataManager';

export class UnionOperationNode extends SetOperationNode<SetOperationNodeName.UnionOperation> {
  constructor(
    public left: GenericSearchOperationNode,
    public right: GenericSearchOperationNode,
  ) {
    super(SetOperationNodeName.UnionOperation);
  }

  compute(metadataManager: MetadataManager): IdSet {
    const left = this.left.compute(metadataManager);
    const right = this.right.compute(metadataManager);

    return new Set([...left, ...right]);
  }
}
