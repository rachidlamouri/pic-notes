import {
  Meta,
  MetadataManager,
  Tag,
  TagValueList,
} from '../../../commands/metadataManager';
import { ModificationOperationNodeName } from './modificationNodeName';
import { ModificationOperationNode } from './modificationOperationNode';

export class AddValueOperationNode extends ModificationOperationNode<ModificationOperationNodeName.AddValueOperation> {
  constructor(
    public tagName: string,
    public valueList: string[],
  ) {
    super(ModificationOperationNodeName.AddValueOperation);
  }

  apply(meta: Meta): void {
    if (meta.hasTag(this.tagName)) {
      const existingTag = meta.getTag(this.tagName);
      this.valueList.forEach((value) => {
        existingTag.addToValueSet(value);
      });
    } else {
      const tag = new Tag(this.tagName, this.valueList);
      meta.setTag(tag);
    }
  }
}
