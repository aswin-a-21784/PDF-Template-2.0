# PDF Editor 2.0

Standalone, single-file PDF template editor prototype. The complete app is in
`index.html`, including its styles, interactions, sample invoice data, and
responsive layout. It follows the supplied PDF Editor 2.0 UI designs.

## Features

- Page settings, insertable components, module fields, and contextual properties.
- Interactive invoice canvas with section, column, and element selection.
- Drag-and-drop layout editing, table styling, and placeholder fields.
- Zoom, undo/redo, sample-data preview, rename, and local template saving.
- Responsive layout and reduced-motion support.

## Run locally

From the repository root:

```bash
python3 -m http.server 5173
```

Open [http://localhost:5173/pdf-editor-2/](http://localhost:5173/pdf-editor-2/).
No build step is required.

## Hosted preview

The Catalyst development preview is available at
[pdfeditor-60084712969.development.catalystserverless.in/app/index.html](https://pdfeditor-60084712969.development.catalystserverless.in/app/index.html).
The deployable web client is mirrored in `client/`.
