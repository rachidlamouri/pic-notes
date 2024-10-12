import { Meta, MetadataManager, Tag } from '../../../commands/metadataManager';
import { ModificationOperationNodeName } from './modificationNodeName';
import { ModificationOperationNode } from './modificationOperationNode';

export class RemoveDescriptionOperationNode extends ModificationOperationNode<ModificationOperationNodeName.RemoveDescriptionOperation> {
  constructor() {
    super(ModificationOperationNodeName.RemoveDescriptionOperation);
  }

  apply(meta: Meta): void {
    meta.setDescription(undefined);
  }
}
