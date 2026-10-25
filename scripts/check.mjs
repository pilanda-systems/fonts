// Prüft jede Familie unter families/ gegen die Aufnahmeregeln (README) und den Katalog.
// Aufruf: node scripts/check.mjs   (Exit-Code 1 bei Verstößen)

import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { tables, names, fsType } from "./sfnt.mjs";
import { buildCatalog, CATALOG } from "./catalog.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const FAMILIES = join(ROOT, "families");
const LICENSES = new Set(["OFL-1.1", "Apache-2.0"]);
const KINDS = new Set(["sans", "serif", "mono", "display", "script"]);
// Was pdfcraft (PaperZocks PDF-Kern) nie einbettet: Adobe-Schriften und Noto CJK.
const EXCLUDED = ["sourcehan", "sourceserif", "sourcesans", "notosanscjk", "notoserifcjk"];
// Lizenzangabe im name-Eintrag 13, wie pdfcraft sie verlangt.
const LICENCE_MARKS = { "OFL-1.1": ["SIL OPEN FONT", "SIL Open Font"], "Apache-2.0": ["Apache License"] };
// fsType: Einbetten verboten (0x0002), nur Vorschau/Druck (0x0004), nur Bitmaps (0x0200).
const FORBIDDEN_FSTYPE = 0x0002 | 0x0004 | 0x0200;

const errors = [];
const fail = (where, msg) => errors.push(`${where}: ${msg}`);
const key = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

for (const slug of readdirSync(FAMILIES).sort()) {
  const dir = join(FAMILIES, slug);
  if (!statSync(dir).isDirectory()) continue;
  if (!/^[a-z0-9-]+$/.test(slug)) fail(slug, "Ordnername nur aus a–z, 0–9 und -");
  const metaPath = join(dir, "font.json");
  if (!existsSync(metaPath)) {
    fail(slug, "font.json fehlt");
    continue;
  }
  let meta;
  try {
    meta = JSON.parse(readFileSync(metaPath, "utf8"));
  } catch (e) {
    fail(slug, `font.json unlesbar: ${e.message}`);
    continue;
  }
  for (const field of ["family", "kind", "license", "licenseFile", "copyright", "source", "files"]) {
    if (meta[field] === undefined) fail(slug, `font.json: Feld "${field}" fehlt`);
  }
  if (!LICENSES.has(meta.license)) fail(slug, `Lizenz ${meta.license} nicht erlaubt (nur ${[...LICENSES].join(", ")})`);
  if (!KINDS.has(meta.kind)) fail(slug, `Art ${meta.kind} unbekannt (${[...KINDS].join(", ")})`);
  if (!meta.source?.url || !meta.source?.version) fail(slug, "Quelle braucht url und version (Tag oder Commit)");
  if (meta.licenseFile && !existsSync(join(dir, meta.licenseFile))) fail(slug, `Lizenztext ${meta.licenseFile} fehlt`);
  if (EXCLUDED.some((x) => key(meta.family ?? "").startsWith(x))) fail(slug, "von pdfcraft ausgeschlossene Familie");

  const listed = new Set((meta.files ?? []).map((f) => f.file));
  for (const entry of readdirSync(dir)) {
    if (/\.(ttf|otf)$/i.test(entry) && !listed.has(entry)) fail(slug, `${entry} liegt im Ordner, steht aber nicht in font.json`);
    if (/\.(ttc|otc|woff2?)$/i.test(entry)) fail(slug, `${entry}: nur einzelne TTF/OTF-Dateien`);
  }
  for (const f of meta.files ?? []) {
    const where = `${slug}/${f.file}`;
    if (!existsSync(join(dir, f.file))) {
      fail(where, "Datei fehlt");
      continue;
    }
    if (typeof f.weight !== "number" || f.weight < 100 || f.weight > 900) fail(where, "weight 100–900 fehlt");
    if (typeof f.italic !== "boolean") fail(where, "italic fehlt");
    let buf, dir2, n;
    try {
      buf = readFileSync(join(dir, f.file));
      dir2 = tables(buf);
      n = names(buf, dir2);
    } catch (e) {
      fail(where, e.message);
      continue;
    }
    if (dir2.has("fvar")) fail(where, "variable Schrift (fvar): nur statische Schnitte (D24)");
    if (!dir2.has("glyf") && !dir2.has("CFF ")) fail(where, "keine Umrisse (glyf/CFF)");
    const type = fsType(buf, dir2);
    if (type === null) fail(where, "keine OS/2-Tabelle (keine Einbettungsrechte)");
    else if (type & FORBIDDEN_FSTYPE) fail(where, `fsType 0x${type.toString(16)} verbietet editierbares Einbetten`);
    const attribution = `${n.get(0) ?? ""} ${n.get(8) ?? ""}`.toLowerCase();
    if (attribution.includes("adobe")) fail(where, "Adobe-Schrift (von pdfcraft ausgeschlossen)");
    const declared = n.get(13) ?? "";
    if (!(LICENCE_MARKS[meta.license] ?? []).some((m) => declared.includes(m))) {
      fail(where, `name-Eintrag 13 nennt die Lizenz ${meta.license} nicht (pdfcraft verlangt das): "${declared.slice(0, 80)}"`);
    }
    const family = n.get(16) ?? n.get(1) ?? "";
    if (key(family) !== key(meta.family) && !key(family).startsWith(key(meta.family))) {
      fail(where, `Familie in der Datei "${family}" passt nicht zu font.json "${meta.family}"`);
    }
  }
}

// Der Katalog muss zum Stand der Dateien passen.
const fresh = JSON.stringify(buildCatalog(FAMILIES), null, 2) + "\n";
const current = existsSync(join(ROOT, CATALOG)) ? readFileSync(join(ROOT, CATALOG), "utf8") : "";
if (fresh !== current) fail(CATALOG, "veraltet: node scripts/catalog.mjs ausführen und mit committen");

if (errors.length) {
  console.error(errors.map((e) => `✗ ${e}`).join("\n"));
  console.error(`\n${errors.length} Verstoß/Verstöße.`);
  process.exit(1);
}
console.log("✓ alle Familien erfüllen die Regeln, Katalog aktuell");
