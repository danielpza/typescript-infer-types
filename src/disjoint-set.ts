export class DisjointSet<N> {
  protected parent: DisjointSet<N>;
  get node() {
    return this.getSet()._node;
  }
  constructor(protected _node: N) {
    this.parent = this;
  }
  join(other: DisjointSet<N>): DisjointSet<N> {
    const dset = this.getSet();
    const odset = other.getSet();
    odset.parent = dset;
    return dset;
  }
  isSameSet(other: DisjointSet<N>): boolean {
    return this.getSet() === other.getSet();
  }
  protected getSet(): DisjointSet<N> {
    if (this.parent === this) return this;
    return (this.parent = this.parent.getSet());
  }
}
