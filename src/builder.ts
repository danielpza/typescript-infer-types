import ts from "typescript";

export class Builder {
  checker: ts.TypeChecker;
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
  public getDefinitions() {
    return "";
  }
  protected relate(binding: ts.Identifier[], exp: ts.Expression) {
    console.log(
      binding.map(bind => bind.getText()).join(".") +
        " relates to " +
        exp.getText()
    );
    // process
  }
  protected visit(node: ts.Node) {
    if (ts.isBinaryExpression(node)) {
      if (ts.isIdentifier(node.left) && this.isExternal(node.left)) {
        this.relate([node.left], node.right);
      } else if (ts.isPropertyAccessExpression(node.left)) {
        const flat = this.flattenPropertyAccess(node.left);
        if (flat && this.isExternal(flat[0])) {
          this.relate(flat, node.right);
        }
      }
    }
    ts.forEachChild(node, node => this.visit(node));
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
