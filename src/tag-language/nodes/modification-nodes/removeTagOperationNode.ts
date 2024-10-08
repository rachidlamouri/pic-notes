import { Meta, MetadataManager } from '../../../commands/metadataManager';
import { ModificationOperationNodeName } from './modificationNodeName';
import { ModificationOperationNode } from './modificationOperationNode';

export class RemoveTagOperationNode extends ModificationOperationNode<ModificationOperationNodeName.RemoveTagOperation> {
  constructor(public tagName: string) {
    super(ModificationOperationNodeName.RemoveTagOperation);
  }

  apply(meta: Meta): void {
    meta.removeTag(this.tagName);
  }
}
