import { parseSearch } from './searchParser';
import assert from 'assert';
import { HasTagNameOperationNode } from './nodes/search-nodes/lookup-operations/hasTagNameOperationNode';
import { HasAnyTagValueOperationNode } from './nodes/search-nodes/lookup-operations/hasAnyTagValueOperationNode';
import { HasAllTagValuesOperationNode } from './nodes/search-nodes/lookup-operations/hasAllTagValuesOperationNode';
import { SelectAllOperationNode } from './nodes/search-nodes/lookup-operations/selectAllOperationNode';
import { HasExactTagValuesOperationNode } from './nodes/search-nodes/lookup-operations/hasExactTagValuesOperationNode';
import { DifferenceOperationNode } from './nodes/search-nodes/set-operations/differenceOperationNode';
import { IntersectionOperationNode } from './nodes/search-nodes/set-operations/intersectionOperationNode';
import { UnionOperationNode } from './nodes/search-nodes/set-operations/unionOperationNode';

console.log('• Testing select all');
{
  const result = parseSearch('*');
  assert.deepEqual(
    // -
    result,
    new SelectAllOperationNode(),
  );
}

console.log('• Testing has tag name search');
{
  const result = parseSearch('a');
  assert.deepEqual(
    // -
    result,
    new HasTagNameOperationNode('a'),
  );
}

console.log('• Testing has any value search (single value without ~)');
{
  const result = parseSearch('a:b');
  assert.deepEqual(
    // -
    result,
    new HasAnyTagValueOperationNode('a', ['b']),
  );
}

console.log('• Testing has any value search (single value with ~)');
{
  const result = parseSearch('a:~b');
  assert.deepEqual(
    // -
    result,
    new HasAnyTagValueOperationNode('a', ['b']),
  );
}

console.log('• Testing has any value search (multiple values)');
{
  const result = parseSearch('a:~[b c d]');
  assert.deepEqual(
    // -
    result,
    new HasAnyTagValueOperationNode('a', ['b', 'c', 'd']),
  );
}

console.log('• Testing has all values search (single value)');
{
  const result = parseSearch('a:^b');
  assert.deepEqual(
    // -
    result,
    new HasAllTagValuesOperationNode('a', ['b']),
  );
}

console.log('• Testing has all values search (multiple values)');
{
  const result = parseSearch('a:^[b c d]');
  assert.deepEqual(
    // -
    result,
    new HasAllTagValuesOperationNode('a', ['b', 'c', 'd']),
  );
}

console.log('• Testing has exact values search (single value)');
{
  const result = parseSearch('a:=b');
  assert.deepEqual(
    // -
    result,
    new HasExactTagValuesOperationNode('a', ['b']),
  );
}

console.log('• Testing has exact values search (multiple values)');
{
  const result = parseSearch('a:=[b c d]');
  assert.deepEqual(
    // -
    result,
    new HasExactTagValuesOperationNode('a', ['b', 'c', 'd']),
  );
}

console.log('• Testing parenthesis');
{
  const result = parseSearch('(a)');
  assert.deepEqual(
    // -
    result,
    new HasTagNameOperationNode('a'),
  );
}

console.log('• Testing intersection operator');
{
  const result = parseSearch('a ^ b');
  assert.deepEqual(
    result,
    new IntersectionOperationNode(
      // -
      new HasTagNameOperationNode('a'),
      new HasTagNameOperationNode('b'),
    ),
  );
}

console.log('• Testing intersection associativity');
{
  const result = parseSearch('a ^ b ^ c');
  assert.deepEqual(
    result,
    new IntersectionOperationNode(
      // -
      new IntersectionOperationNode(
        new HasTagNameOperationNode('a'),
        new HasTagNameOperationNode('b'),
      ),
      new HasTagNameOperationNode('c'),
    ),
  );
}

console.log('• Testing overloaded "^" operator');
{
  const result = parseSearch('a:^b ^ c:^d');
  assert.deepEqual(
    result,
    new IntersectionOperationNode(
      // -
      new HasAllTagValuesOperationNode('a', ['b']),
      new HasAllTagValuesOperationNode('c', ['d']),
    ),
  );
}

console.log('• Testing union operator');
{
  const result = parseSearch('a + b');
  assert.deepEqual(
    result,
    new UnionOperationNode(
      // -
      new HasTagNameOperationNode('a'),
      new HasTagNameOperationNode('b'),
    ),
  );
}

console.log('• Testing union associativity');
{
  const result = parseSearch('a + b + c');
  assert.deepEqual(
    result,
    new UnionOperationNode(
      // -
      new UnionOperationNode(
        new HasTagNameOperationNode('a'),
        new HasTagNameOperationNode('b'),
      ),
      new HasTagNameOperationNode('c'),
    ),
  );
}

console.log('• Testing difference operator');
{
  const result = parseSearch('a - b');
  assert.deepEqual(
    result,
    new DifferenceOperationNode(
      // -
      new HasTagNameOperationNode('a'),
      new HasTagNameOperationNode('b'),
    ),
  );
}

console.log('• Testing difference associativity');
{
  const result = parseSearch('a - b - c');
  assert.deepEqual(
    result,
    new DifferenceOperationNode(
      // -
      new DifferenceOperationNode(
        new HasTagNameOperationNode('a'),
        new HasTagNameOperationNode('b'),
      ),
      new HasTagNameOperationNode('c'),
    ),
  );
}

console.log('• Testing precedence ( ^ + - )');
{
  const result = parseSearch('a ^ b + c - d');
  assert.deepEqual(
    result,
    new DifferenceOperationNode(
      new UnionOperationNode(
        new IntersectionOperationNode(
          // -
          new HasTagNameOperationNode('a'),
          new HasTagNameOperationNode('b'),
        ),
        new HasTagNameOperationNode('c'),
      ),
      new HasTagNameOperationNode('d'),
    ),
  );
}

console.log('• Testing precedence ( ^ - + )');
{
  const result = parseSearch('a ^ b - c + d');
  assert.deepEqual(
    result,
    new UnionOperationNode(
      new DifferenceOperationNode(
        new IntersectionOperationNode(
          // -
          new HasTagNameOperationNode('a'),
          new HasTagNameOperationNode('b'),
        ),
        new HasTagNameOperationNode('c'),
      ),
      new HasTagNameOperationNode('d'),
    ),
  );
}

console.log('• Testing precedence ( + ^ - )');
{
  const result = parseSearch('a + b ^ c - d');
  assert.deepEqual(
    result,
    new DifferenceOperationNode(
      new UnionOperationNode(
        new HasTagNameOperationNode('a'),
        new IntersectionOperationNode(
          // -
          new HasTagNameOperationNode('b'),
          new HasTagNameOperationNode('c'),
        ),
      ),
      new HasTagNameOperationNode('d'),
    ),
  );
}

console.log('• Testing precedence ( + - ^ )');
{
  const result = parseSearch('a + b - c ^ d');
  assert.deepEqual(
    result,
    new DifferenceOperationNode(
      new UnionOperationNode(
        // -
        new HasTagNameOperationNode('a'),
        new HasTagNameOperationNode('b'),
      ),
      new IntersectionOperationNode(
        // -
        new HasTagNameOperationNode('c'),
        new HasTagNameOperationNode('d'),
      ),
    ),
  );
}

console.log('• Testing precedence ( - ^ + )');
{
  const result = parseSearch('a - b ^ c + d');
  assert.deepEqual(
    result,
    new UnionOperationNode(
      new DifferenceOperationNode(
        new HasTagNameOperationNode('a'),
        new IntersectionOperationNode(
          // -
          new HasTagNameOperationNode('b'),
          new HasTagNameOperationNode('c'),
        ),
      ),
      new HasTagNameOperationNode('d'),
    ),
  );
}

console.log('• Testing precedence ( - + ^ )');
{
  const result = parseSearch('a - b + c ^ d');
  assert.deepEqual(
    result,
    new UnionOperationNode(
      new DifferenceOperationNode(
        // -
        new HasTagNameOperationNode('a'),
        new HasTagNameOperationNode('b'),
      ),
      new IntersectionOperationNode(
        // -
        new HasTagNameOperationNode('c'),
        new HasTagNameOperationNode('d'),
      ),
    ),
  );
}

console.log('• Testing parenthesis precedence');
{
  const result = parseSearch('(a - b) ^ (c + d)');
  assert.deepEqual(
    result,
    new IntersectionOperationNode(
      new DifferenceOperationNode(
        // -
        new HasTagNameOperationNode('a'),
        new HasTagNameOperationNode('b'),
      ),
      new UnionOperationNode(
        // -
        new HasTagNameOperationNode('c'),
        new HasTagNameOperationNode('d'),
      ),
    ),
  );
}

console.log('• Testing nested parenthesis precedence');
{
  const result = parseSearch('(a + (b - c) + d)');
  assert.deepEqual(
    result,
    new UnionOperationNode(
      new UnionOperationNode(
        // -
        new HasTagNameOperationNode('a'),
        new DifferenceOperationNode(
          // -
          new HasTagNameOperationNode('b'),
          new HasTagNameOperationNode('c'),
        ),
      ),
      new HasTagNameOperationNode('d'),
    ),
  );
}
