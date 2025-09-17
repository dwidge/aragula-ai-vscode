export const isDirContainingSomeFile = (files: string[]) => (dir: string) =>
  files.some((file) =>
    file.toLowerCase().replaceAll("\\", "/").startsWith(dir)
  );
