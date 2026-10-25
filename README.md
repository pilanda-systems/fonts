# Pilanda Fonts

Freie Schriften für alle Projekte der Pilanda Systems FlexCo: PaperZock-PDF, die Webseiten und künftige Repos. Eine Quelle, geprüfte Lizenzen, feste Versionen.

## Regeln für jede Schrift

Eine Familie kommt nur ins Repo, wenn alles hier erfüllt ist. `node scripts/check.mjs` prüft es, auch in der CI.

| Regel | Warum |
|---|---|
| Lizenz **OFL-1.1** oder **Apache-2.0**, Lizenztext aus der Quelle unverändert daneben | Einbetten und Weitergeben erlaubt, kostenlos |
| **Statisch** (keine `fvar`-Tabelle), einzelne TTF/OTF, keine Sammlung (.ttc) | PDF kennt keine variablen Schriften |
| **Vollständig**, wie aus der Quelle, Dateien nie verändert | Eingebettet fehlt kein Zeichen; Reserved Font Names der OFL bleiben gewahrt |
| Einbettungsrecht im OS/2-Feld `fsType` erlaubt editierbares Einbetten | Vorgabe des Herstellers |
| Lizenz im `name`-Eintrag 13 genannt; keine Adobe-Schrift, kein Noto CJK | sonst nimmt PaperZocks PDF-Kern (pdfcraft) sie nicht an |
| Herkunft in `font.json` mit URL und Version (Tag oder Commit) | nachvollziehbar, reproduzierbar |

## Aufbau

```text
families/<id>/        eine Familie: Schriftdateien, Lizenztext, font.json
catalog.json          erzeugt (node scripts/catalog.mjs): Dateien mit Größe und SHA-256
scripts/              check.mjs (Regeln), catalog.mjs (Katalog), sfnt.mjs (liest Schriftdateien)
```

`font.json`:

```json
{
  "family": "Liberation Sans",
  "kind": "sans",
  "license": "OFL-1.1",
  "licenseFile": "LICENSE",
  "copyright": "Digitized data copyright (c) 2010 Google Corporation …",
  "source": { "url": "https://github.com/liberationfonts/liberation-fonts", "version": "2.1.5" },
  "metricCompatible": ["Arial", "Helvetica"],
  "files": [{ "file": "LiberationSans-Regular.ttf", "weight": 400, "italic": false }]
}
```

`kind`: `sans`, `serif`, `mono`, `display` oder `script`. `metricCompatible`: Schriften mit gleichen Zeichenbreiten (gleicher Umbruch).

## Verwenden

Immer ein **Tag** pinnen (`vJJJJ.MM.N`), nie `main`.

- **PaperZock-PDF:** baut den Katalog des gepinnten Tags ein und lädt Schriften nur auf Klick des Nutzers; jede Datei wird gegen die SHA-256 aus dem Katalog geprüft.
- **Webseiten:** Dateien beim Build übernehmen und **selbst hosten**. Nie per Direktlink auf dieses Repo, GitHub oder Google laden: Die Übertragung der IP-Adresse der Besucher an Dritte ist nach LG München I (20.01.2022, 3 O 17493/20) ein DSGVO-Verstoß. Web-Formate (WOFF2, Teilsätze) folgen hier als nächster Schritt.

## Neue Schrift aufnehmen

1. Dateien und Lizenztext aus der Originalquelle (Hersteller-Repo oder `google/fonts`) nach `families/<id>/` kopieren, unverändert.
2. `font.json` schreiben.
3. `node scripts/catalog.mjs`, dann `node scripts/check.mjs`.
4. PR; nach dem Merge ein neues Tag.

## Lizenz

Die Werkzeuge in diesem Repo stehen unter Apache-2.0 (`LICENSE`). **Jede Schrift behält ihre eigene Lizenz**, siehe den Lizenztext in ihrem Ordner.
