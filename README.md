# typescript-infer-types

[![npm version](https://img.shields.io/npm/v/typescript-infer-types.svg)](https://www.npmjs.com/package/typescript-infer-types)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg)](https://conventionalcommits.org)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)

Infer types from typescript code.

This is currently under develop, feel free to try it and report any issues or features request you might have.

## Install

```sh
$ npm i -g typescript-infer-types
```

## Example

```ts
// input.ts
let a = true;

hello = "world";

EXTERNAL.DEPP.VAR = a;

EXTERNAL.foo(3);

let c = EXTERNAL.BAR;
let d = BAR;

c = 3;
d = 4;

c = EXTERNAL.BARR;

foo("asdf");
```

Then extract external definitions (outputs to stdout):

```sh
$ typescript-infer-types input.ts
declare let hello: string;
declare let EXTERNAL: { DEPP: { VAR: boolean }, foo: ((...args: [number]) => any), BAR: any, BARR: any };
declare let BAR: any;
declare let foo: ((...args: [string]) => any);
```

## Roadmap

- [ ] Anotate variables (fix missing types in source code)
- [ ] ...sugestions?
