import { SetOperationNodeName } from '../searchOperationNodeName';
import {
  GenericSearchOperationNode,
  SearchOperationNode,
} from '../searchOperationNode';
import { SetOperationNode } from './setOperationNode';
import { IdSet, MetadataManager } from '../../../../commands/metadataManager';
import { GenericSearchNode } from '../searchNode';

export class DifferenceOperationNode extends SetOperationNode<
  SetOperationNodeName.DifferenceOperation,
  GenericSearchNode
> {
  constructor(
    public left: GenericSearchOperationNode,
    public right: GenericSearchNode,
  ) {
    super(SetOperationNodeName.DifferenceOperation, left, right);
  }

  compute(metadataManager: MetadataManager): IdSet {
    const left = this.left.compute(metadataManager);

    if (this.right instanceof SearchOperationNode) {
      const right = this.right.compute(metadataManager);
      return new Set([...left].filter((leftId) => !right.has(leftId)));
    }

    return new Set(
      [...left].filter((leftId) => {
        const meta = metadataManager.getMetaById(leftId);
        return !this.right.compute(meta);
      }),
    );
  }
}
