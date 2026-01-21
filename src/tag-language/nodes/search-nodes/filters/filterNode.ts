import { Meta } from '../../../../commands/metadataManager';
import { SearchNode } from '../searchNode';
import { FilterNodeName } from '../searchOperationNodeName';

export abstract class FilterNode<
  TNodeName extends FilterNodeName,
> extends SearchNode<TNodeName> {
  abstract compute(meta: Meta): boolean;
}

export type GenericFilterNode = FilterNode<FilterNodeName>;
