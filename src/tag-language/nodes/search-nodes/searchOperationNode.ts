import { IdSet, MetadataManager } from '../../../commands/metadataManager';
import { ParsedNode } from '../parsedNode';
import { SearchNode } from './searchNode';
import { SearchOperationNodeName } from './searchOperationNodeName';

export abstract class SearchOperationNode<
  TName extends SearchOperationNodeName,
> extends SearchNode<TName> {
  abstract compute(metadataManager: MetadataManager): IdSet;
}

export type GenericSearchOperationNode =
  SearchOperationNode<SearchOperationNodeName>;
