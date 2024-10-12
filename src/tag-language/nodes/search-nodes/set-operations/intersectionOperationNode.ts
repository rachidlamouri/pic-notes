import { SetOperationNodeName } from '../searchOperationNodeName';
import { GenericSearchOperationNode } from '../searchOperationNode';
import { SetOperationNode } from './setOperationNode';
import { IdSet, MetadataManager } from '../../../../commands/metadataManager';

export class IntersectionOperationNode extends SetOperationNode<SetOperationNodeName.IntersectionOperation> {
  constructor(
    public left: GenericSearchOperationNode,
    public right: GenericSearchOperationNode,
  ) {
    super(SetOperationNodeName.IntersectionOperation);
  }

  compute(metadataManager: MetadataManager): IdSet {
    throw new Error('Not implemented');
  }
}
