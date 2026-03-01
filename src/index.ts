#!/usr/bin/env node
/**
 * Set FORCE_COLOR before any module (including Ink/chalk) is loaded so that
 * list/search/info render with colors. ESM hoists static imports, so we must
 * use a dynamic import here.
 */
process.env.FORCE_COLOR = "1";

await import("./main.js");
