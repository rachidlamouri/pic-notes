import { Meta, Tag } from '../../../commands/metadataManager';
import { ModificationOperationNodeName } from './modificationNodeName';
import { ModificationOperationNode } from './modificationOperationNode';

export class HardSetValueOperationNode extends ModificationOperationNode<ModificationOperationNodeName.HardSetValueOperation> {
  constructor(
    public tagName: string,
    public tagValues: string[],
  ) {
    super(ModificationOperationNodeName.HardSetValueOperation);
  }
  apply(meta: Meta): void {
    const tag = new Tag(this.tagName, this.tagValues);
    meta.setTag(tag);
  }
}
