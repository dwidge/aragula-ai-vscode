export const toUnixPath = (path: string) => fixRootSlash(fixBackslash(path));

const fixBackslash = (path: string) => path.replaceAll("\\", "/");

const fixRootSlash = (path: string) =>
  !isPathWithRootSlash(path) && isPathWithDriveLetter(path)
    ? prependSlash(path)
    : path;

const isPathWithDriveLetter = (path: string) => /^[a-zA-Z]:\//.test(path);

const isPathWithRootSlash = (path: string) => path.startsWith("/");

const prependSlash = (path: string) => `/${path}`;
