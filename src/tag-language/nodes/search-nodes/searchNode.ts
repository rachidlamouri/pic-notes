import { ParsedNode } from '../parsedNode';
import { SearchNodeName } from './searchOperationNodeName';

export abstract class SearchNode<
  TNodeName extends SearchNodeName,
> extends ParsedNode<TNodeName> {
  abstract compute(...args: any[]): unknown;
}

export type GenericSearchNode = SearchNode<SearchNodeName>;
