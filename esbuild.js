const esbuild = require("esbuild");
const path = require("path");
const fs = require("fs");

const production = process.argv.includes("--production");
const watch = process.argv.includes("--watch");

/**
 * Copies a specified asset file from src to dist.
 * @param {string} assetFileName - The name of the asset file to copy.
 */
function copyAsset(assetFileName) {
  const sourcePath = path.join(__dirname, "src", assetFileName);
  const destDir = path.join(__dirname, "dist");
  const destPath = path.join(destDir, assetFileName);

  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  try {
    fs.copyFileSync(sourcePath, destPath);
    console.log(`[asset-copier] Copied asset: ${assetFileName} to ${destPath}`);
  } catch (error) {
    console.error(
      `[asset-copier] Error copying asset ${assetFileName}:`,
      error
    );
  }
}

/**
 * Esbuild plugin to report build status and copy assets on build completion.
 * @param {string[]} assetsToCopy - List of asset filenames to copy after a successful build.
 * @returns {import('esbuild').Plugin}
 */
function createBuildPlugin(assetsToCopy) {
  return {
    name: "build-reporter-and-asset-copier",

    setup(build) {
      build.onStart(() => {
        console.log("[build] build started");
      });

      build.onEnd((result) => {
        result.errors.forEach(({ text, location }) => {
          console.error(`✘ [ERROR] ${text}`);
          if (location) {
            console.error(
              `    ${location.file}:${location.line}:${location.column}:`
            );
          }
        });

        if (result.errors.length === 0) {
          console.log("[build] build finished successfully.");
          console.log("[build] Starting asset copy...");
          assetsToCopy.forEach(copyAsset);
          console.log("[build] Asset copy finished.");
        } else {
          console.log(
            "[build] build finished with errors, skipping asset copy."
          );
        }
      });
    },
  };
}

async function main() {
  const assetsToCopy = ["chatview.html", "chatview.css", "chatview.js"];

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
    plugins: [createBuildPlugin(assetsToCopy)],
  });

  if (watch) {
    console.log("Starting watch mode.");
    await ctx.watch();
  } else {
    await ctx.rebuild();
    await ctx.dispose();
    console.log("Build process finished.");
  }
}

main().catch((e) => {
  console.error("An error occurred during the build process:");
  console.error(e);
  process.exit(1);
});
