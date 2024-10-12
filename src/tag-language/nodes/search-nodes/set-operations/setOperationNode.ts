import { SetOperationNodeName } from '../searchOperationNodeName';
import { SearchOperationNode } from '../searchOperationNode';

export abstract class SetOperationNode<
  TName extends SetOperationNodeName,
> extends SearchOperationNode<TName> {}
