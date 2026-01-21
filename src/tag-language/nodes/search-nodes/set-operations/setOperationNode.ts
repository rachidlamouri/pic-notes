import { SetOperationNodeName } from '../searchOperationNodeName';
import {
  GenericSearchOperationNode,
  SearchOperationNode,
} from '../searchOperationNode';
import { IdSet } from '../../../../commands/metadataManager';
import { GenericSearchNode } from '../searchNode';

export abstract class SetOperationNode<
  TName extends SetOperationNodeName,
  TRight extends GenericSearchNode,
> extends SearchOperationNode<TName> {
  constructor(
    name: TName,
    public left: GenericSearchOperationNode,
    public right: TRight,
  ) {
    super(name);
  }
}
