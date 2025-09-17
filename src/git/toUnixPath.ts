export const toUnixPath = (path: string) => prependSlash(fixBackslash(path));

const fixBackslash = (path: string) => path.replaceAll("\\", "/");

const prependSlash = (path: string) =>
  path.startsWith("/") ? path : `/${path}`;
