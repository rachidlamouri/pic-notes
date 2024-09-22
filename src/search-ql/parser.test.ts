import { TagNode } from './nodes/tagNode';
import { IntersectionNode } from './nodes/intersectionNode';
import { UnionNode } from './nodes/unionNode';
import { DifferenceNode } from './nodes/differenceNode';
import { parse } from './parser';
import assert from 'assert';
import { SelectAllNode } from './nodes/selectAllNode';

console.log('• Testing select all');
{
  const result = parse('*');
  assert.deepEqual(
    // -
    result,
    new SelectAllNode(),
  );
}

console.log('• Testing tag');
{
  const result = parse('a');
  assert.deepEqual(
    // -
    result,
    new TagNode('a'),
  );
}

console.log('• Testing tagged value');
{
  const result = parse('a:b');
  assert.deepEqual(
    // -
    result,
    new TagNode('a', 'b'),
  );
}

console.log('• Parenthesis');
{
  const result = parse('(a)');
  assert.deepEqual(
    // -
    result,
    new TagNode('a'),
  );
}

console.log('• Testing intersection operator');
{
  const result = parse('a ^ b');
  assert.deepEqual(
    result,
    new IntersectionNode(
      // -
      new TagNode('a'),
      new TagNode('b'),
    ),
  );
}

console.log('• Testing intersection associativity');
{
  const result = parse('a ^ b ^ c');
  assert.deepEqual(
    result,
    new IntersectionNode(
      new IntersectionNode(
        // -
        new TagNode('a'),
        new TagNode('b'),
      ),
      new TagNode('c'),
    ),
  );
}

console.log('• Testing union operator');
{
  const result = parse('a + b');
  assert.deepEqual(
    result,
    new UnionNode(
      // -
      new TagNode('a'),
      new TagNode('b'),
    ),
  );
}

console.log('• Testing union associativity');
{
  const result = parse('a + b + c');
  assert.deepEqual(
    result,
    new UnionNode(
      new UnionNode(
        // -
        new TagNode('a'),
        new TagNode('b'),
      ),
      new TagNode('c'),
    ),
  );
}

console.log('• Testing difference operator');
{
  const result = parse('a - b');
  assert.deepEqual(
    result,
    new DifferenceNode(
      // -
      new TagNode('a'),
      new TagNode('b'),
    ),
  );
}

console.log('• Testing difference associativity');
{
  const result = parse('a - b - c');
  assert.deepEqual(
    result,
    new DifferenceNode(
      new DifferenceNode(
        // -
        new TagNode('a'),
        new TagNode('b'),
      ),
      new TagNode('c'),
    ),
  );
}

console.log('• Testing precedence ( ^ + - )');
{
  const result = parse('a ^ b + c - d');
  assert.deepEqual(
    result,
    new DifferenceNode(
      new UnionNode(
        new IntersectionNode(
          // -
          new TagNode('a'),
          new TagNode('b'),
        ),
        new TagNode('c'),
      ),
      new TagNode('d'),
    ),
  );
}

console.log('• Testing precedence ( ^ - + )');
{
  const result = parse('a ^ b - c + d');
  assert.deepEqual(
    result,
    new UnionNode(
      new DifferenceNode(
        new IntersectionNode(
          // -
          new TagNode('a'),
          new TagNode('b'),
        ),
        new TagNode('c'),
      ),
      new TagNode('d'),
    ),
  );
}

console.log('• Testing precedence ( + ^ - )');
{
  const result = parse('a + b ^ c - d');
  assert.deepEqual(
    result,
    new DifferenceNode(
      new UnionNode(
        new TagNode('a'),
        new IntersectionNode(
          // -
          new TagNode('b'),
          new TagNode('c'),
        ),
      ),
      new TagNode('d'),
    ),
  );
}

console.log('• Testing precedence ( + - ^ )');
{
  const result = parse('a + b - c ^ d');
  assert.deepEqual(
    result,
    new DifferenceNode(
      new UnionNode(
        // -
        new TagNode('a'),
        new TagNode('b'),
      ),
      new IntersectionNode(
        // -
        new TagNode('c'),
        new TagNode('d'),
      ),
    ),
  );
}

console.log('• Testing precedence ( - ^ + )');
{
  const result = parse('a - b ^ c + d');
  assert.deepEqual(
    result,
    new UnionNode(
      new DifferenceNode(
        new TagNode('a'),
        new IntersectionNode(
          // -
          new TagNode('b'),
          new TagNode('c'),
        ),
      ),
      new TagNode('d'),
    ),
  );
}

console.log('• Testing precedence ( - + ^ )');
{
  const result = parse('a - b + c ^ d');
  assert.deepEqual(
    result,
    new UnionNode(
      new DifferenceNode(
        // -
        new TagNode('a'),
        new TagNode('b'),
      ),
      new IntersectionNode(
        // -
        new TagNode('c'),
        new TagNode('d'),
      ),
    ),
  );
}

console.log('• Testing parenthesis precedence');
{
  const result = parse('(a - b) ^ (c + d)');
  assert.deepEqual(
    result,
    new IntersectionNode(
      new DifferenceNode(
        // -
        new TagNode('a'),
        new TagNode('b'),
      ),
      new UnionNode(
        // -
        new TagNode('c'),
        new TagNode('d'),
      ),
    ),
  );
}

console.log('• Testing nested parenthesis precedence');
{
  const result = parse('(a + (b - c) + d)');
  assert.deepEqual(
    result,
    new UnionNode(
      new UnionNode(
        // -
        new TagNode('a'),
        new DifferenceNode(
          // -
          new TagNode('b'),
          new TagNode('c'),
        ),
      ),
      new TagNode('d'),
    ),
  );
}
