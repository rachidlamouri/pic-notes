import { IdSet, MetadataManager } from '../../../../commands/metadataManager';
import { assertIsNotUndefined } from '../../../../utils/assertIsNotUndefined';
import { LookupOperationNodeName } from '../searchOperationNodeName';
import { LookupOperationNode } from './lookupOperationNode';

export class HasAllTagValuesOperationNode extends LookupOperationNode<LookupOperationNodeName.HasAllTagValuesOperation> {
  constructor(
    public tagName: string,
    public tagValueList: string[],
  ) {
    super(LookupOperationNodeName.HasAllTagValuesOperation);
  }

  compute(metadataManager: MetadataManager): IdSet {
    const ids = metadataManager.getIds(this.tagName, this.tagValueList);
    const metaList = [...ids].map((id) => metadataManager.getMetaById(id));

    const matchingMetaList = metaList.filter((meta) => {
      const tag = meta.tagMap.get(this.tagName);
      assertIsNotUndefined(tag);
      const result = this.tagValueList.every((value) => tag.hasValue(value));
      return result;
    });

    const matchingIdList = matchingMetaList.map((meta) => meta.id);

    return new IdSet(matchingIdList);
  }
}
