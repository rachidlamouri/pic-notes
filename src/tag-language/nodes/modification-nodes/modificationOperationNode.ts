import { Meta } from '../../../commands/metadataManager';
import { ModificationNode } from './modificationNode';
import { ModificationOperationNodeName } from './modificationNodeName';

export abstract class ModificationOperationNode<
  TName extends ModificationOperationNodeName,
> extends ModificationNode<TName> {
  abstract apply(meta: Meta): void;
}

export type GenericModificationOperationNode =
  ModificationOperationNode<ModificationOperationNodeName>;
