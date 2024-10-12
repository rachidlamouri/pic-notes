import { LookupOperationNodeName } from '../searchOperationNodeName';
import { SearchOperationNode } from '../searchOperationNode';

export abstract class LookupOperationNode<
  TName extends LookupOperationNodeName,
> extends SearchOperationNode<TName> {}
