import globby from "globby";

export async function main(glob: string) {
  const paths = await globby([glob]);
  console.log(paths);
}
