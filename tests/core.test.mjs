// Round-trip tests for the Mermaid parser and serializer.
//   node tests/core.test.mjs
// The core files are plain browser scripts, so they are loaded into one shared VM context.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ctx = vm.createContext({ console });
for (const f of ['js/core/mermaid.js', 'js/core/geometry.js', 'js/core/templates.js']) {
  vm.runInContext(readFileSync(join(root, f), 'utf8'), ctx, { filename: f });
}
const run = (code) => vm.runInContext(code, ctx);
ctx.__src = '';
const roundTrip = (src) => {
  ctx.__src = src;
  return run(`(() => {
    const a = parseMermaid(__src); resolveGeometry(a.model, new Map());
    const s1 = serializeMermaid(a.model);
    const b = parseMermaid(s1); resolveGeometry(b.model, new Map());
    return { errors: a.errors.concat(b.errors), fatal: a.fatal, s1, s2: serializeMermaid(b.model), model: a.model };
  })()`);
};

let passed = 0;
const test = (name, fn) => { try { fn(); passed++; console.log('ok   ' + name); } catch (e) { console.error('FAIL ' + name + '\n' + e.message); process.exitCode = 1; } };

for (const t of run('TEMPLATES')) {
  test('template round-trips: ' + t.name, () => {
    const r = roundTrip(t.code);
    assert.equal(r.errors.length, 0, JSON.stringify(r.errors));
    assert.equal(r.s1, r.s2);
  });
}

test('shapes, arrows, labels and styles', () => {
  const r = roundTrip(`graph TD
  A[Start] -- yes --> B(Round)
  B -.-> C{{Hex}}
  C ==>|thick| D[(DB)]
  D <--> E((Circle))
  E --o F[/Para/]
  F --x G[[Sub]]
  A & B --> H
  style A fill:#fff9b1,font-size:24px,font-weight:bold
`);
  assert.equal(r.errors.length, 0, JSON.stringify(r.errors));
  assert.equal(r.s1, r.s2);
  assert.equal(r.model.edges.length, 8);
  assert.match(r.s1, /font-size:24px/);
});

test('canvas data: stickies, drawings, free arrows, routes, images', () => {
  const r = roundTrip(`flowchart LR
  n1["Ship it"]:::sticky
  a --> b
  linkStyle 0 stroke-width:5px,stroke:#f24726
%% @route 0 elbow
%% @arrow a1 straight 0 0 100 40 2 #1a1a1a to=a
%% @ink k1 pen #1a1a1a 2.5 10,10 5,5 3,-2
%% @image img1 10 20 300 200
`);
  assert.equal(r.errors.length, 0, JSON.stringify(r.errors));
  assert.equal(r.s1, r.s2);
  assert.equal(r.model.nodes.get('n1').shape, 'sticky');
  assert.equal(r.model.edges[0].route, 'elbow');
  assert.equal(r.model.edges[0].width, 5);
  assert.equal(r.model.arrows[0].to, 'a');
  assert.equal(r.model.inks.length, 1);
  assert.equal(r.model.images.length, 1);
});

test('comments: threads on shapes and on the board', () => {
  const r = roundTrip(`flowchart LR
  a --> b
%% @comment cm1 12 -8 on=a [{"a":"Anna","t":"Why \\"this\\"?\\nTwo lines","d":1700000000000},{"t":"Because","d":1700000060000}]
%% @comment cm2 300 40 done [{"t":"Fixed","d":1700000000000}]
`);
  assert.equal(r.errors.length, 0, JSON.stringify(r.errors));
  assert.equal(r.s1, r.s2);
  assert.equal(r.model.threads.length, 2);
  assert.equal(r.model.threads[0].on, 'a');
  assert.equal(r.model.threads[0].msgs.length, 2);
  assert.equal(r.model.threads[0].msgs[0].a, 'Anna');
  assert.equal(r.model.threads[0].msgs[1].a, undefined);
  assert.ok(r.model.threads[0].msgs[0].t.includes('\n'));
  assert.equal(r.model.threads[1].done, true);
});

test('free arrows can end on a frame', () => {
  const r = roundTrip(`flowchart LR
  subgraph g [Frame]
  end
  a --> g
%% @pos g 300 0 280 180
%% @arrow a1 straight 0 0 100 40 2 #1a1a1a to=g
`);
  assert.equal(r.errors.length, 0, JSON.stringify(r.errors));
  assert.equal(r.s1, r.s2);
  assert.equal(r.model.arrows[0].to, 'g');
  assert.ok(r.s2.includes('to=g'));
});

test('connector sides are kept', () => {
  const r = roundTrip(`flowchart LR
  a --> b
  b --> c
%% @route 0 curved r t
%% @route 1 elbow - l
`);
  assert.equal(r.errors.length, 0, JSON.stringify(r.errors));
  assert.equal(r.s1, r.s2);
  assert.equal(r.model.edges[0].sa, 'r'); assert.equal(r.model.edges[0].sb, 't'); assert.equal(r.model.edges[0].route, 'curved');
  assert.equal(r.model.edges[1].sa, undefined); assert.equal(r.model.edges[1].sb, 'l'); assert.equal(r.model.edges[1].route, 'elbow');
});

test('board connector style from Mermaid curve config', () => {
  const r = roundTrip(`---
config:
  flowchart:
    curve: step
---
flowchart LR
  a --> b
  b --> c
%% @route 1 curved
`);
  assert.equal(r.errors.length, 0, JSON.stringify(r.errors));
  assert.equal(r.s1, r.s2);
  assert.equal(r.model.curve, 'elbow');
  assert.equal(r.model.edges[0].route, undefined);
  assert.equal(r.model.edges[1].route, 'curved');
  assert.ok(r.s2.includes('%% @route 1 curved'));
});

test('reports errors with line numbers', () => {
  const r = roundTrip('flowchart LR\n  A -->\n  subgraph x [X]\n    B\n');
  assert.ok(r.errors.some((e) => e.line === 1));
  assert.ok(r.errors.some((e) => /end/.test(e.msg)));
});

test('rejects non-flowchart diagrams clearly', () => {
  const r = roundTrip('sequenceDiagram\n  A->>B: hi\n');
  assert.ok(r.fatal);
});

console.log('\n' + passed + ' passed');
