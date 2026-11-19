// Neon Palms Cover Studio — entry program.
// Runs on Node 22 with the standard library only. It copies app/ and
// screenshots/ from this repository into the output directory and writes
// /output/dossier.json with buildDossier from vendor/makefun-app.ts.
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output.
import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { buildDossier } from "./vendor/makefun-app.ts";

const repoRoot = resolve(import.meta.dirname);
const outputDir = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? "/output");

function handInEntry() {
  mkdirSync(outputDir, { recursive: true });
  for (const name of ["app", "screenshots", "dossier.json"]) {
    rmSync(join(outputDir, name), { recursive: true, force: true });
  }
  cpSync(join(repoRoot, "app"), join(outputDir, "app"), { recursive: true });
  cpSync(join(repoRoot, "screenshots"), join(outputDir, "screenshots"), {
    recursive: true,
  });
  const dossier = buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
  });
  writeFileSync(join(outputDir, "dossier.json"), dossier);
}

handInEntry();
