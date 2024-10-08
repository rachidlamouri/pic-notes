import { ParsedNode } from '../parsedNode';
import { SearchNodeName } from './searchNodeName';

export abstract class SearchNode<
  TName extends SearchNodeName,
> extends ParsedNode<TName> {}
