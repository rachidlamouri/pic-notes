import { IdSet, MetadataManager } from '../../../commands/metadataManager';
import { ParsedNode } from '../parsedNode';
import { SearchOperationNodeName } from './searchOperationNodeName';

export abstract class SearchOperationNode<
  TName extends SearchOperationNodeName,
> extends ParsedNode<TName> {
  abstract compute(metadataManager: MetadataManager): IdSet;
}

export type GenericSearchOperationNode =
  SearchOperationNode<SearchOperationNodeName>;
