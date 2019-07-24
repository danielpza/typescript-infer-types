import ts from "typescript";
import { DisjointSet } from "./disjoint-set";
import arrayUnion from "array-union";

const DISJOINTSET_PARENT_KEY = "__disjointset_parent";

class Node {
  constructor(public types: string[] = []) {}
  join(other: Node) {
    other.types = this.types = arrayUnion(this.types, other.types);
  }
}

type IdentifierLike = ts.Identifier | ts.PropertyAccessExpression;

export class Builder {
  checker: ts.TypeChecker;
  externals = new Map<IdentifierLike, DisjointSet<Node>>();
  constructor(public program: ts.Program) {
    this.checker = program.getTypeChecker();
  }
  public analyze() {
    for (const sourceFile of this.program.getSourceFiles()) {
      if (!sourceFile.isDeclarationFile) {
        this.visit(sourceFile);
      }
    }
  }
  public print() {
    const dump = {} as any;
    this.externals.forEach((ds, ident) => {
      const types = ds.node.types.filter(id => id !== "any");
      const type = types.length === 0 ? "any" : types.join(" | ");
      const keys = this.flattenIdentifierLike(ident)!.map(node => node.text);
      const [last] = keys.splice(keys.length - 1);
      let cont = dump;
      for (const key of keys) {
        if (cont[key] === undefined) cont[key] = {};
        cont = cont[key];
      }
      cont[last] = type;
    });
    return (
      Object.entries(dump)
        .map(
          ([key, value]) => `declare let ${key}: ${printType(value as any)};`
        )
        .join("\n") + "\n"
    );
    function printType(value: object | string): string {
      if (typeof value === "string") return value;
      return `{ \
${Object.entries(value)
  .map(([key, value]) => `${key}: ${printType(value as any)}`)
  .join(", ")} \
}`;
    }
  }
  protected ensureExternal(binding: IdentifierLike) {
    if (!this.externals.has(binding))
      this.externals.set(binding, new DisjointSet(new Node()));
  }
  protected getDisjointSet(node: ts.Expression): DisjointSet<Node> | undefined {
    const symbol = this.checker.getSymbolAtLocation(node) as
      | (ts.Symbol & { [DISJOINTSET_PARENT_KEY]?: DisjointSet<Node> })
      | undefined;
    if (symbol) {
      if (symbol[DISJOINTSET_PARENT_KEY]) {
        return symbol[DISJOINTSET_PARENT_KEY];
      }
      return (symbol[DISJOINTSET_PARENT_KEY] = new DisjointSet(
        new Node([this.inferType(node)])
      ));
    } else if (this.isExternalIdentifier(node)) {
      this.ensureExternal(node);
      return this.externals.get(node);
    }
    return undefined;
  }
  protected relate(left: ts.Expression, right: ts.Expression) {
    const leftSet = this.getDisjointSet(left);
    const rightSet = this.getDisjointSet(right);
    if (leftSet && !rightSet) {
      leftSet.node.types = arrayUnion(leftSet.node.types, [
        this.inferType(right)
      ]);
    } else if (!leftSet && rightSet) {
      rightSet.node.types = arrayUnion(rightSet.node.types, [
        this.inferType(left)
      ]);
    } else if (leftSet && rightSet && !leftSet.isSameSet(rightSet)) {
      leftSet.node.join(rightSet.node);
      leftSet.join(rightSet);
    }
  }
  protected inferType(node: ts.Expression): string {
    if (ts.isCallExpression(node)) {
      const argTypes = node.arguments.map(arg => this.inferType(arg));
      return `((...args: [${argTypes.join(", ")}]) => any)`;
    }
    return this.checker
      .typeToString(
        this.checker.getApparentType(this.checker.getTypeAtLocation(node))
      )
      .toLowerCase();
  }
  protected visit(node: ts.Node) {
    if (
      ts.isVariableDeclaration(node) &&
      node.initializer &&
      ts.isIdentifier(node.name)
    ) {
      this.relate(node.name, node.initializer);
      if (this.isExternalIdentifier(node.initializer))
        this.ensureExternal(node.initializer);
    } else if (ts.isBinaryExpression(node)) {
      this.relate(node.left, node.right);
      if (this.isExternalIdentifier(node.left)) this.ensureExternal(node.left);
      if (this.isExternalIdentifier(node.right))
        this.ensureExternal(node.right);
    } else if (
      ts.isCallExpression(node) &&
      this.isExternalIdentifier(node.expression)
    ) {
      this.ensureExternal(node.expression);
      this.relate(node.expression, node);
    }
    ts.forEachChild(node, node => this.visit(node));
  }
  protected isExternalIdentifier(node: ts.Node): node is IdentifierLike {
    if (!(ts.isIdentifier(node) || ts.isPropertyAccessExpression(node)))
      return false;
    const root = this.flattenIdentifierLike(node);
    if (root === undefined) return false;
    return this.isExternal(root[0]);
  }
  protected flattenIdentifierLike(
    node: IdentifierLike
  ): ts.Identifier[] | undefined {
    if (ts.isIdentifier(node)) return [node];
    if (ts.isIdentifier(node.expression)) {
      return [node.expression, node.name];
    }
    if (ts.isPropertyAccessExpression(node.expression)) {
      const flat = this.flattenIdentifierLike(node.expression);
      if (flat === undefined) return undefined;
      return [...flat, node.name];
    }
    return undefined;
  }
  protected isExternal(node: ts.Node) {
    const symbol = this.checker.getSymbolAtLocation(node);
    return !symbol; // TODO no symbol means external, should check veracity
  }
  // Debugging
  depth = 0;
  in() {
    this.depth++;
  }
  out() {
    this.depth--;
  }
  log(node: ts.Node) {
    const spaces = " ".repeat(this.depth);
    const kind = ts.SyntaxKind[node.kind];
    console.log(`${spaces}${kind} ${node.getText()}`);
  }
}
