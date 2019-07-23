import ts from "typescript";

export class Builder {
  checker: ts.TypeChecker;
  relations = new Map<string, string[]>();
  dump: any = {};
  // Debugging
  // depth = 0;
  // in() {
  //   this.depth++;
  // }
  // out() {
  //   this.depth--;
  // }
  // log(node: ts.Node) {
  //   const spaces = " ".repeat(this.depth);
  //   const kind = ts.SyntaxKind[node.kind];
  //   console.log(`${spaces}${kind} ${node.getText()}`);
  // }
  constructor(public program: ts.Program) {
    this.checker = program.getTypeChecker();
  }
  public analyze() {
    for (const sourceFile of this.program.getSourceFiles()) {
      if (!sourceFile.isDeclarationFile) {
        this.visit(sourceFile);
      }
    }
    this.relations.forEach((types, id) => {
      const type = types.length === 0 ? "any" : types.join(" | ");
      const keys = id.split(".");
      const [last] = keys.splice(keys.length - 1);
      let cont = this.dump;
      for (const key of keys) {
        if (cont[key] === undefined) cont[key] = {};
        cont = cont[key];
      }
      cont[last] = type;
    });
  }
  public print() {
    return (
      Object.entries(this.dump)
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
  protected relate(binding: ts.Identifier[], exp: ts.Expression) {
    const key = binding.map(bind => bind.getText()).join(".");
    if (!this.relations.has(key)) this.relations.set(key, []);
    const type = this.inferType(exp);
    if (type !== "any" && !this.relations.get(key)!.includes(type))
      this.relations.get(key)!.push(type);
  }
  protected inferType(node: ts.Expression): string {
    if (ts.isNumericLiteral(node)) {
      return "number";
    }
    if (ts.isStringLiteralLike(node)) {
      return "string";
    }
    if (
      ts.isLiteralTypeNode(node) &&
      (node.literal.kind === ts.SyntaxKind.TrueKeyword ||
        node.literal.kind === ts.SyntaxKind.FalseKeyword)
    ) {
      return "boolean";
    }
    if (ts.isIdentifier(node)) {
      const symbol = this.checker.getSymbolAtLocation(node);
      if (symbol) {
        return this.checker.typeToString(
          this.checker.getTypeOfSymbolAtLocation(
            symbol,
            symbol.valueDeclaration!
          )
        );
      }
    }
    if (ts.isCallExpression(node)) {
      const argTypes = node.arguments.map(arg => this.inferType(arg));
      return `((...args: [${argTypes.join(", ")}]) => any)`;
    }
    return "any";
  }
  protected visit(node: ts.Node) {
    if (
      ts.isVariableDeclaration(node) &&
      node.initializer &&
      ts.isIdentifier(node.name)
    ) {
      if (
        ts.isIdentifier(node.initializer) &&
        this.isExternal(node.initializer)
      ) {
        this.relate([node.initializer], node.name);
      } else if (ts.isPropertyAccessExpression(node.initializer)) {
        const flat = this.flattenPropertyAccess(node.initializer);
        if (flat && this.isExternal(flat[0])) {
          this.relate(flat, node.name);
        }
      }
    } else if (ts.isBinaryExpression(node)) {
      if (ts.isIdentifier(node.left) && this.isExternal(node.left)) {
        this.relate([node.left], node.right);
      } else {
        if (ts.isPropertyAccessExpression(node.left)) {
          const flat = this.flattenPropertyAccess(node.left);
          if (flat && this.isExternal(flat[0])) {
            this.relate(flat, node.right);
          }
        }
      }
      if (ts.isIdentifier(node.right) && this.isExternal(node.right)) {
        this.relate([node.right], node.left);
      } else {
        if (ts.isPropertyAccessExpression(node.right)) {
          const flat = this.flattenPropertyAccess(node.right);
          if (flat && this.isExternal(flat[0])) {
            this.relate(flat, node.left);
          }
        }
      }
    } else if (ts.isCallExpression(node)) {
      if (
        ts.isIdentifier(node.expression) &&
        this.isExternal(node.expression)
      ) {
        this.relate([node.expression], node);
      } else if (ts.isPropertyAccessExpression(node.expression)) {
        const flat = this.flattenPropertyAccess(node.expression);
        if (flat && this.isExternal(flat[0])) {
          this.relate(flat, node);
        }
      }
    }
    // this.log(node);
    // this.in();
    ts.forEachChild(node, node => this.visit(node));
    // this.out();
  }
  protected flattenPropertyAccess(
    node: ts.PropertyAccessExpression
  ): ts.Identifier[] | undefined {
    if (ts.isIdentifier(node.expression)) {
      return [node.expression, node.name];
    }
    if (ts.isPropertyAccessExpression(node.expression)) {
      const flat = this.flattenPropertyAccess(node.expression);
      if (flat === undefined) return undefined;
      return [...flat, node.name];
    }
    return undefined;
  }
  protected isExternal(node: ts.Node) {
    const symbol = this.checker.getSymbolAtLocation(node);
    return !symbol; // TODO no symbol means external, should check veracity
  }
}
