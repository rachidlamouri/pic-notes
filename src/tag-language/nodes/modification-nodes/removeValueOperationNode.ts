import { Meta } from '../../../commands/metadataManager';
import { ModificationOperationNodeName } from './modificationNodeName';
import { ModificationOperationNode } from './modificationOperationNode';

export class RemoveValueOperationNode extends ModificationOperationNode<ModificationOperationNodeName.RemoveValueOperation> {
  constructor(
    public tagName: string,
    public valueList: string[],
  ) {
    super(ModificationOperationNodeName.RemoveValueOperation);
  }

  apply(meta: Meta): void {
    if (!meta.hasTag(this.tagName)) {
      return;
    }

    const tag = meta.getTag(this.tagName);
    this.valueList.forEach((value) => {
      tag.removeFromValueSet(value);
    });
  }
}
