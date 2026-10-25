// Liest aus einer Schriftdatei (TrueType/OpenType) nur, was die Aufnahmeregeln brauchen:
// Tabellenverzeichnis und name-Einträge. Ohne Abhängigkeiten, wirft bei kaputten Dateien.

const TTC = 0x74746366; // 'ttcf'
const VERSIONS = new Set([0x00010000, 0x4f54544f, 0x74727565]); // 1.0, 'OTTO', 'true'

/** Tabellen der Schrift: Kennung → { offset, length }. */
export function tables(buf) {
  if (buf.length < 12) throw new Error("zu kurz für eine Schriftdatei");
  const version = buf.readUInt32BE(0);
  if (version === TTC) throw new Error("Schriftsammlung (.ttc) statt einzelner Schrift");
  if (!VERSIONS.has(version)) throw new Error("keine TrueType/OpenType-Schrift");
  const count = buf.readUInt16BE(4);
  if (12 + count * 16 > buf.length) throw new Error("Tabellenverzeichnis abgeschnitten");
  const out = new Map();
  for (let i = 0; i < count; i++) {
    const at = 12 + i * 16;
    const tag = buf.toString("latin1", at, at + 4);
    const offset = buf.readUInt32BE(at + 8);
    const length = buf.readUInt32BE(at + 12);
    if (offset + length > buf.length) throw new Error(`Tabelle ${tag} abgeschnitten`);
    out.set(tag, { offset, length });
  }
  return out;
}

/** name-Einträge als Map ID → Text (Windows-Unicode bevorzugt, sonst Mac Roman). */
export function names(buf, dir = tables(buf)) {
  const t = dir.get("name");
  if (!t) throw new Error("keine name-Tabelle");
  const base = t.offset;
  const count = buf.readUInt16BE(base + 2);
  const strings = base + buf.readUInt16BE(base + 4);
  const out = new Map();
  for (let i = 0; i < count; i++) {
    const r = base + 6 + i * 12;
    if (r + 12 > base + t.length) break;
    const platform = buf.readUInt16BE(r);
    const encoding = buf.readUInt16BE(r + 2);
    const language = buf.readUInt16BE(r + 4);
    const id = buf.readUInt16BE(r + 6);
    const length = buf.readUInt16BE(r + 8);
    const start = strings + buf.readUInt16BE(r + 10);
    if (start + length > buf.length) continue;
    const raw = buf.subarray(start, start + length);
    let text;
    if (platform === 3 && (encoding === 1 || encoding === 10)) {
      // UTF-16BE; Englisch (0x409) gewinnt vor anderen Sprachen.
      const le = Buffer.from(raw);
      le.swap16();
      text = le.toString("utf16le");
      if (out.has(id) && language !== 0x409) continue;
    } else if (platform === 1 && encoding === 0) {
      if (out.has(id)) continue;
      text = raw.toString("latin1");
    } else {
      continue;
    }
    out.set(id, text);
  }
  return out;
}

/** OS/2 fsType (Einbettungsrechte), `null` ohne OS/2-Tabelle. */
export function fsType(buf, dir = tables(buf)) {
  const t = dir.get("OS/2");
  return t && t.length >= 10 ? buf.readUInt16BE(t.offset + 8) : null;
}
