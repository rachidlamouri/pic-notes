import { TagNode } from './nodes/tagNode';
import { tl } from './tagParser';
import assert from 'assert';

console.log('• Testing a tag name');
{
  const result = tl.tagName.tryParse('a');
  assert.deepEqual(
    // -
    result,
    'a',
  );
}

console.log('• Testing a single tag value');
{
  const result = tl.tagValueUnit.tryParse('a');
  assert.deepEqual(
    // -
    result,
    ['a'],
  );
}

console.log('• Testing empty value list');
{
  const result = tl.tagValueUnit.tryParse('[]');
  assert.deepEqual(
    // -
    result,
    [],
  );
}

console.log('• Testing tag with value list');
{
  const result = tl.tagValueUnit.tryParse('[a b c]');
  assert.deepEqual(
    // -
    result,
    ['a', 'b', 'c'],
  );
}

console.log('• Testing a secondary index key');
{
  const result = tl.secondaryIndexKey.tryParse('a:b');
  assert.deepEqual(
    // -
    result,
    'a:b',
  );
}
