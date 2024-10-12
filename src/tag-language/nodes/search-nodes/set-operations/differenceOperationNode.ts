import { SetOperationNodeName } from '../searchOperationNodeName';
import { GenericSearchOperationNode } from '../searchOperationNode';
import { SetOperationNode } from './setOperationNode';
import { IdSet, MetadataManager } from '../../../../commands/metadataManager';

export class DifferenceOperationNode extends SetOperationNode<SetOperationNodeName.DifferenceOperation> {
  constructor(
    public left: GenericSearchOperationNode,
    public right: GenericSearchOperationNode,
  ) {
    super(SetOperationNodeName.DifferenceOperation);
  }

  compute(metadataManager: MetadataManager): IdSet {
    throw new Error('Not implemented');
  }
}
