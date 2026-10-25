// Erzeugt catalog.json aus families/*/font.json: je Datei Größe und SHA-256.
// Aufruf: node scripts/catalog.mjs

import { readdirSync, readFileSync, writeFileSync, statSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export const CATALOG = "catalog.json";

export function buildCatalog(familiesDir) {
  const families = [];
  for (const slug of readdirSync(familiesDir).sort()) {
    const dir = join(familiesDir, slug);
    if (!statSync(dir).isDirectory() || !existsSync(join(dir, "font.json"))) continue;
    const meta = JSON.parse(readFileSync(join(dir, "font.json"), "utf8"));
    families.push({
      id: slug,
      family: meta.family,
      kind: meta.kind,
      license: meta.license,
      metricCompatible: meta.metricCompatible ?? [],
      files: (meta.files ?? []).map((f) => {
        const bytes = readFileSync(join(dir, f.file));
        return {
          path: `families/${slug}/${f.file}`,
          weight: f.weight,
          italic: f.italic,
          size: bytes.length,
          sha256: createHash("sha256").update(bytes).digest("hex"),
        };
      }),
    });
  }
  return { schema: 1, families };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const root = fileURLToPath(new URL("..", import.meta.url));
  const json = JSON.stringify(buildCatalog(join(root, "families")), null, 2) + "\n";
  writeFileSync(join(root, CATALOG), json);
  console.log(`${CATALOG} geschrieben`);
}
