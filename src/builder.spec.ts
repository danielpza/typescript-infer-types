import { resolve } from "path";
import * as ts from "typescript";
import { Builder } from "./builder";
import { readFileSync } from "fs";

test("builder", () => {
  const program = ts.createProgram([resolve(__dirname, "__fixtures/base.ts")], {
    allowJs: true,
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.CommonJS
  });
  const builder = new Builder(program);
  builder.analyze();
  const actual = builder.print();
  const expected = readFileSync(
    resolve(__dirname, "__fixtures/expected.d.ts"),
    "utf8"
  ).toString();
  expect(actual).toBe(expected);
});
