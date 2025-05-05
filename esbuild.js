const esbuild = require("esbuild");
const path = require("path");
const fs = require("fs");

const production = process.argv.includes("--production");
const watch = process.argv.includes("--watch");

/**
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
  name: "esbuild-problem-matcher",

  setup(build) {
    build.onStart(() => {
      console.log("[watch] build started");
    });
    build.onEnd((result) => {
      result.errors.forEach(({ text, location }) => {
        console.error(`✘ [ERROR] ${text}`);
        console.error(
          `    ${location.file}:${location.line}:${location.column}:`
        );
      });
      console.log("[watch] build finished");
    });
  },
};

function copyAsset(assetFileName) {
  const sourcePath = path.join(__dirname, "src", assetFileName);
  const destDir = path.join(__dirname, "dist");
  const destPath = path.join(destDir, assetFileName);

  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  try {
    fs.copyFileSync(sourcePath, destPath);
    console.log(`Copied asset: ${assetFileName} to ${destPath}`);
  } catch (error) {
    console.error(`Error copying asset ${assetFileName}:`, error);
  }
}

async function main() {
  const ctx = await esbuild.context({
    entryPoints: ["src/extension.ts"],
    bundle: true,
    format: "cjs",
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    platform: "node",
    outfile: "dist/extension.js",
    external: ["vscode"],
    logLevel: "silent",
    plugins: [esbuildProblemMatcherPlugin],
  });

  const assetsToCopy = ["chatview.html"];

  if (watch) {
    console.log("Starting watch mode. Assets copied on initial run.");
    assetsToCopy.forEach(copyAsset);
    await ctx.watch();
  } else {
    await ctx.rebuild();
    assetsToCopy.forEach(copyAsset);
    await ctx.dispose();
    console.log("Build finished. Assets copied.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
