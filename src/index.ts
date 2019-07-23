import ts from "typescript";
import globby from "globby";
import { Builder } from "./builder";

export async function main(glob: string) {
  const files = await globby([glob]);
  const program = ts.createProgram(files, {
    allowJs: true,
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.CommonJS
  });
  const builder = new Builder(program);
  builder.analyze();
}
