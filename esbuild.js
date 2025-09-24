const esbuild = require("esbuild");
const path = require("path");
const fs = require("fs");

const production = process.argv.includes("--production");
const watch = process.argv.includes("--watch");

/**
 * Esbuild plugin to report build status.
 * @returns {import('esbuild').Plugin}
 */
function createBuildPlugin() {
  return {
    name: "build-reporter",

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
        } else {
          console.log("[build] build finished with errors.");
        }
      });
    },
  };
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
    define: {
      IS_PROD: "" + !!production,
    },
    plugins: [createBuildPlugin()],
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
