#!/usr/bin/env node

import { main } from "./index";

main(process.argv[2]).catch(err => {
  console.error(err);
  process.exit(1);
});
