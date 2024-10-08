import { SetOperationNodeName } from '../searchNodeName';
import { SearchOperationNode } from '../searchOperationNode';

export class SetOperationNode<
  TName extends SetOperationNodeName,
> extends SearchOperationNode<TName> {}
