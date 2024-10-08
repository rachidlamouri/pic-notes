import { Meta, MetadataManager, Tag } from '../../../commands/metadataManager';
import { ModificationOperationNodeName } from './modificationNodeName';
import { ModificationOperationNode } from './modificationOperationNode';

export class AddDescriptionOperationNode extends ModificationOperationNode<ModificationOperationNodeName.AddDescriptionOperation> {
  constructor(public description: string) {
    super(ModificationOperationNodeName.AddDescriptionOperation);
  }

  apply(meta: Meta): void {
    meta.setDescription(this.description);
  }
}
