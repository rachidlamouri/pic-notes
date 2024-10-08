import { SearchOperationNodeName } from '../searchNodeName';
import { SearchOperationNode } from '../searchOperationNode';

export class LookupOperationNode<
  TName extends SearchOperationNodeName,
> extends SearchOperationNode<TName> {}
