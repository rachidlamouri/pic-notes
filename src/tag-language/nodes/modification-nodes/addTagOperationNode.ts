import { Meta, MetadataManager, Tag } from '../../../commands/metadataManager';
import { ModificationOperationNodeName } from './modificationNodeName';
import { ModificationOperationNode } from './modificationOperationNode';

export class AddTagOperationNode extends ModificationOperationNode<ModificationOperationNodeName.AddTagOperation> {
  constructor(public tagName: string) {
    super(ModificationOperationNodeName.AddTagOperation);
  }

  apply(meta: Meta): void {
    if (meta.hasTag(this.tagName)) {
      return;
    }

    const tag = new Tag(this.tagName, []);
    meta.setTag(tag);
  }
}
