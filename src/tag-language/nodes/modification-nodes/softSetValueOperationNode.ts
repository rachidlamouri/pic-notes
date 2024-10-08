import { Meta, Tag } from '../../../commands/metadataManager';
import { ModificationOperationNodeName } from './modificationNodeName';
import { ModificationOperationNode } from './modificationOperationNode';

export class SoftSetValueOperationNode extends ModificationOperationNode<ModificationOperationNodeName.SoftSetValueOperation> {
  constructor(
    public tagName: string,
    public tagValues: string[],
  ) {
    super(ModificationOperationNodeName.SoftSetValueOperation);
  }

  apply(meta: Meta): void {
    const newTag = new Tag(this.tagName, this.tagValues);

    if (meta.hasTag(this.tagName)) {
      const existingTag = meta.getTag(this.tagName);

      if (newTag.isEqual(existingTag)) {
        return;
      }

      if (existingTag.valueCount >= 2) {
        throw new Error(
          `Unable to soft set tag "${this.tagName}" with two or more existing values: ${this.tagValues.join(', ')}`,
        );
      }
    }

    meta.setTag(newTag);
  }
}
