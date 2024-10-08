import { SearchNode } from './searchNode';
import { SearchOperationNodeName } from './searchNodeName';

export abstract class SearchOperationNode<
  TName extends SearchOperationNodeName,
> extends SearchNode<TName> {}

export type GenericSearchOperationNode =
  SearchOperationNode<SearchOperationNodeName>;
