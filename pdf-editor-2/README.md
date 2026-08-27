# PDF Editor 2.0 — Template Editor Prototype

Clickable UX prototype of the **PDF Editor 2.0** invoice/document template
editor, built from a large product & UX knowledge base spec plus reference
screenshots of the real Zoho-style template editor. Vanilla HTML/CSS/JS, no
build step — matches the conventions of the sibling prototypes in this
workspace.

## What is included

- **Three contextual side-panel modes**, switched from an icon rail:
  - **Page** — paper size/orientation, margins, content inset, header/footer
    toggles, background, page & content-section borders, default typography.
  - **Insert** — drag-and-drop **Components** (Title, Text, Image, Logo,
    Divider, Signature, Dynamic Table, Static Table) and pre-built **Section
    presets** / **Module sections**, plus a **Module Fields** tab (searchable
    field picker with "already used" pills) for inserting bound placeholder
    fields into text/table elements.
  - **Properties** — a contextual panel driven entirely by the current
    selection: page, header/footer (with variant switching + destructive-change
    confirmation), section (column count/width/alignment), column, or any of
    the 10 element types, including per-cell editing for both dynamic and
    static tables.
- **Live template preview** — a rendered A4 page (header/sections/footer) built
  from a JS template-literal renderer, with a default "AS Aquarium" donation
  invoice pre-populated to match the reference screenshots.
- **Click-to-select / breadcrumb navigation** — clicking any section, column,
  or element in the preview selects it, opens the Properties panel, and shows
  a `Section > Column > Element` breadcrumb; hovering shows highlight overlays.
- **Drag-and-drop** — drag components from the Insert panel into column
  drop-zones, or drag section presets into the page to add whole new sections.
- **Dynamic vs. static tables** — dynamic tables bind to repeating line-item
  data with configurable columns; static tables are a fixed grid of
  individually editable cells (static value or placeholder), both with several
  built-in visual style presets.
- **Undo / redo** with debounced history snapshots, **rename**, **save**
  (persists to `localStorage`), duplicate/export/reset via the overflow menu,
  and a **Show placeholders / Show sample values** toggle for previewing the
  template with real-looking data vs. raw field placeholders.

## Known simplifications vs. the full spec

- No real PDF export or pagination simulation — the preview always renders a
  single page (the header's "subsequent page" variant can still be previewed
  by switching its variant in Properties).
- Background image tiling/positioning is simplified to a few basic options.
- Table cell formatting supports the common typography controls but not full
  rich-text (mixed inline styles within one cell).

## Run locally

Open `index.html` directly in a browser, or serve the folder:

```bash
python3 -m http.server 5173
```

Then visit `http://localhost:5173/pdf-editor-2/`.
