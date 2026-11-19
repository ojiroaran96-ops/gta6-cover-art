// Neon Palms Cover Studio — entry program for make.fun's gta6-cover-art-01.
// It hands the app in: copies app/ and screenshots/ from this repository
// into the output directory and writes /output/dossier.json with
// buildDossier from vendor/makefun-app.ts. Outside the grader,
// MAKEFUN_OUTPUT_DIR stands in for /output.
import { buildDossier } from "./vendor/makefun-app.ts";
import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR || "/output";

rmSync(outputDir, { recursive: true, force: true });
mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, "app"), join(outputDir, "app"), { recursive: true });
cpSync(join(repoRoot, "screenshots"), join(outputDir, "screenshots"), { recursive: true });

const dossier = await buildDossier(repoRoot, { text_max_bytes: 163840 });
writeFileSync(join(outputDir, "dossier.json"), dossier);

console.log("Neon Palms Cover Studio handed in:");
console.log("  app/ -> " + join(outputDir, "app"));
console.log("  screenshots/ -> " + join(outputDir, "screenshots"));
console.log("  dossier.json: " + dossier.length + " bytes");
