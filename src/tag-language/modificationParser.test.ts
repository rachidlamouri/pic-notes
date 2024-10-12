import { parseModification } from './modificationParser';
import { AddTagOperationNode } from './nodes/modification-nodes/addTagOperationNode';
import { SoftSetValueOperationNode } from './nodes/modification-nodes/softSetValueOperationNode';
import { HardSetValueOperationNode } from './nodes/modification-nodes/hardSetValueOperationNode';
import { ModificationExpressionNode } from './nodes/modification-nodes/modificationExpressionNode';
import { RemoveTagOperationNode } from './nodes/modification-nodes/removeTagOperationNode';
import assert from 'assert';
import { AddValueOperationNode } from './nodes/modification-nodes/addValueOperationNode';
import { RemoveValueOperationNode } from './nodes/modification-nodes/removeValueOperationNode';
import { AddDescriptionOperationNode } from './nodes/modification-nodes/addDescriptionOperationNode';
import { RemoveDescriptionOperationNode } from './nodes/modification-nodes/removeDescriptionOperationNode';

console.log('• Testing empty expression');
{
  const result = parseModification('  ');
  assert.deepEqual(
    // -
    result,
    new ModificationExpressionNode([]),
  );
}

console.log('• Testing add tag operation');
{
  const result = parseModification('a');
  assert.deepEqual(
    // -
    result,
    new ModificationExpressionNode([new AddTagOperationNode('a')]),
  );
}

console.log('• Testing remove tag operation');
{
  const result = parseModification('-a');
  assert.deepEqual(
    // -
    result,
    new ModificationExpressionNode([new RemoveTagOperationNode('a')]),
  );
}

console.log('• Testing soft set value operation with value');
{
  const result = parseModification('a:b');
  assert.deepEqual(
    // -
    result,
    new ModificationExpressionNode([new SoftSetValueOperationNode('a', ['b'])]),
  );
}

console.log('• Testing hard set value operation with value');
{
  const result = parseModification('a:=b');
  assert.deepEqual(
    // -
    result,
    new ModificationExpressionNode([new HardSetValueOperationNode('a', ['b'])]),
  );
}

console.log('• Testing add value operation');
{
  const result = parseModification('a:+b');
  assert.deepEqual(
    // -
    result,
    new ModificationExpressionNode([new AddValueOperationNode('a', ['b'])]),
  );
}

console.log('• Testing remove value operation');
{
  const result = parseModification('a:-b');
  assert.deepEqual(
    // -
    result,
    new ModificationExpressionNode([new RemoveValueOperationNode('a', ['b'])]),
  );
}

console.log('• Testing add description operation');
{
  const result = parseModification('#abc');
  assert.deepEqual(
    // -
    result,
    new ModificationExpressionNode([new AddDescriptionOperationNode('abc')]),
  );
}

console.log('• Testing remove description operation');
{
  const result = parseModification('-#');
  assert.deepEqual(
    // -
    result,
    new ModificationExpressionNode([new RemoveDescriptionOperationNode()]),
  );
}

console.log('• Testing multiple operations');
{
  const result = parseModification('a b:c d:=e -f g:-h i:+j #the description');
  assert.deepEqual(
    result,
    new ModificationExpressionNode([
      new AddTagOperationNode('a'),
      new SoftSetValueOperationNode('b', ['c']),
      new HardSetValueOperationNode('d', ['e']),
      new RemoveTagOperationNode('f'),
      new RemoveValueOperationNode('g', ['h']),
      new AddValueOperationNode('i', ['j']),
      new AddDescriptionOperationNode('the description'),
    ]),
  );
}
