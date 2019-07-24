import { DisjointSet } from "./disjoint-set";

test("disjoint-set", () => {
  const a = new DisjointSet("a");
  const b = new DisjointSet("b");
  const c = new DisjointSet("c");
  expect(c.isSameSet(b)).toBe(false);
  expect(a.join(b)).toBe(a);
  expect(a.isSameSet(b)).toBe(true);
  expect(a.isSameSet(c)).toBe(false);
  expect(b.join(c)).toBe(a);
  expect(a.isSameSet(c));
});
