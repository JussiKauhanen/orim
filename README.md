# orim

orim is a whiteboard and Mermaid editor in one page. Write Mermaid or plain text on the left and edit a Miro-style board on the right; both sides stay in sync. It comes with the official Azure, Power Platform and Dynamics 365 icons, so architecture diagrams look the part.

Everything runs in the browser. There is no backend, no account and no build step. The board is saved in your browser and exported as files.

## Features

**Home**
- A start page with templates in two rows that scroll sideways (each shown as a small preview of the real board) and your recent boards, in a list or a grid.
- Rename, duplicate, export or delete boards from the ⋯ menu.
- Paste text, Mermaid or an image anywhere on the home page to start a new board from it.
- Every board has its own link (`#b-<id>`), so the browser's back button and bookmarks work.

**Two editors, one board**
- Code, Split and Canvas views, with a draggable splitter.
- Mermaid mode: flowchart syntax with highlighting, line errors and autocomplete for keywords, arrows, node ids and icon nodes.
- Text mode: write `Browser -> API -> Database`, `- list items` and `# Headings`. Basic [D2](https://d2lang.com) also works.
- Paste any text onto the board to turn it into connected boxes or sticky notes.

**Board**
- Shapes, sticky notes, text, frames (nested), pen, highlighter and eraser, with Miro-style menus that name each tool and its shortcut.
- Connectors that stay attached, plus free arrows: curved, straight, elbow, line and block, with thickness and color.
- Arrow ends snap to shapes; pull hard to detach.
- Items pop out of a frame when flicked out fast; slow drags grow the frame instead.
- Lasso empty space to create a frame. Drag frame edges to resize, or pick a format such as 16:9 or A4.
- Text styling: size, bold, italic, color and highlight.
- Paste or drop images.
- Comments: press C, click the board or a shape, type and press Enter. Comments on a shape move with it; drag a pin to move it, reply in the thread, or resolve it.
- The first comment asks for your name. It shows as an avatar in the top right, where you can change it or sign out. The name is kept in this browser only; comments keep the name they were written with.
- Undo and redo for everything, light and dark themes, keyboard shortcuts.

**Icons**
- 637 Azure architecture icons (V24), 9 Power Platform icons (Power Apps, Power Automate, Dataverse, Power BI, Copilot Studio, Power Pages, AI Builder, Power Fx, Power Platform) and 33 Dynamics 365 icons.
- Search the library, click or drag to add, or let Text mode pick icons from service names.

**Export**
- PNG, SVG, draw.io (`.drawio`, editable in draw.io and diagrams.net), Mermaid in Markdown, Mermaid text and an orim board file (`.json`, keeps images).
- Copy for draw.io pastes straight onto a draw.io canvas.
- QR code moves the current board to another device: scan it, or save the link (see below).
- Ask an AI copies a prompt for any AI chat (see below).

## Run it locally

Any static file server works. The page must be served over http, because the icon pack is loaded with `fetch`.

```sh
cd orim
python3 -m http.server 8080
# or
npm start
```

Open http://localhost:8080.

For a single file that opens from disk with no server, build it:

```sh
npm run build      # writes dist/orim.html
```

## Deploy to GitHub Pages

1. Create a repository named `orim` and push this folder to the `main` branch.
2. In the repository, open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, select `main` and `/ (root)`, and save.
4. The site is published at `https://<your-user>.github.io/orim/` after a minute or so.

The `.nojekyll` file tells Pages to serve the files as they are. All paths are relative, so the app works under the `/orim/` sub-path without changes.

## Project structure

```
orim/
├── index.html              Page markup and script order
├── css/
│   └── orim.css            All styles, with light and dark theme tokens
├── js/
│   ├── core/               Pure logic, no DOM; covered by tests
│   │   ├── mermaid.js      Mermaid parser and serializer, canvas data comments
│   │   ├── geometry.js     Text wrap, node sizing, auto layout, connector shapes
│   │   └── templates.js    Starter boards
│   ├── env.js              DOM references, palettes, toolbar icon set
│   ├── icons.js            Loads assets/icons.json
│   ├── state.js            App state, undo and redo
│   ├── editor.js           Code pane: Mermaid and Text modes, autocomplete
│   ├── title.js            Diagram title
│   ├── render.js           Draws the board
│   ├── view.js             Pan, zoom, fit, tidy up
│   ├── hit-test.js         Hit testing
│   ├── pointer.js          Mouse, pen and touch interaction
│   ├── label-editor.js     Inline text editing
│   ├── selection.js        Selection actions
│   ├── context-toolbar.js  Selection toolbar and popovers
│   ├── library.js          Icon library panel
│   ├── tools.js            Left toolbar and fly-outs
│   ├── keyboard.js         Shortcuts and clipboard
│   ├── layout.js           Views and splitter
│   ├── ui.js               Menus, toasts, dialogs
│   ├── templates.js        Templates menu and import
│   ├── quick-text.js       Plain-text language and paste to board
│   ├── export-drawio.js    draw.io export
│   ├── export.js           Other exports
│   ├── share-qr.js         QR code and shared links (#m=…)
│   ├── ai-guide.js         Ask an AI: prompt, format guide, paste back
│   ├── theme.js            Theme switching
│   ├── tooltips.js         Tooltips
│   ├── me.js               Your name and avatar for comments
│   ├── comments.js         Comment pins and threads
│   ├── boards.js           Home page, board list, saving, #b-<id> links
│   └── main.js             Startup
├── assets/
│   ├── icons.json          Icon pack (generated)
│   └── favicon.svg
├── vendor/
│   ├── dagre/              dagre 0.8.5 for auto layout (MIT)
│   └── qrcode-generator/   qrcode-generator 1.4.4 for QR codes (MIT)
├── docs/orim-board.md      Format guide for AI assistants (generated)
├── tests/core.test.mjs     Parser and serializer round-trip tests
└── tools/
    ├── build.mjs           Bundles dist/orim.html
    └── build-icons.py      Regenerates assets/icons.json
```

The scripts are plain browser scripts loaded in order, not modules, so the app runs from any static host without bundling. Top-level declarations are shared between them; the order in `index.html` matters.

## Where boards are stored

Boards live in the browser's `localStorage` on the device you use: `orim.boards` holds the list, `orim.b.<id>` the Mermaid code and `orim.i.<id>` the images of each board. `orim.me` is your comment name. Clearing site data removes them, so export a board file (`.json`) for anything you want to keep or move.

## File format

A board is stored as standard Mermaid, so it renders on GitHub, Azure DevOps and other Mermaid tools. Things Mermaid has no syntax for are kept in `%%` comment lines, which other tools ignore:

```
%% @pos   <id> <x> <y> [<w> <h>]                     node or frame position and size
%% @route <edgeIndex> straight|elbow                  connector routing
%% @arrow <id> <kind> <x1> <y1> <x2> <y2> <w> <color> [from=<id>] [to=<id>]
%% @ink   <id> pen|hl <color> <w> <x,y> <dx,dy> ...   pen and highlighter strokes
%% @image <id> <x> <y> <w> <h> [front]               image placement; front = above shapes (pixels live in the board file)
%% @comment <id> <x> <y> [on=<id>] [done] <json>      comment thread [{a: author, t: text, d: time}]; on= makes x y an offset from that shape, done = resolved
```

Icon nodes use Mermaid 11 shape syntax: `fn@{ icon: "azure:function-apps", label: "API" }`. Packs are `azure:`, `pp:` (Power Platform) and `d365:`. Other Mermaid renderers show these as plain nodes unless the same icon pack is registered there.

Sticky notes are nodes with the `sticky` class. Text styling uses standard `style` properties (`font-size`, `font-weight`, `font-style`, `color`), plus `background` for the highlight.

## Text mode

```
direction: right
Azure {
  API
  Orders: Orders DB
  Orders.shape: cylinder
}
Browser -> API -> Orders: writes
API -> Cache, Key Vault

# Open questions
- Who owns the schema?
```

| Write | Gives |
| --- | --- |
| `A -> B` or `A → B` | arrow |
| `A <- B` | arrow from B to A |
| `A <-> B` | arrows both ways |
| `A -- B` | plain line |
| `A => B` | thick arrow |
| `A -> B, C` | one arrow to each |
| `A -> B: label` | labelled arrow |
| `id: Label` | box with an id and a different label |
| `Name { … }` | frame |
| `# Heading` or `Heading:` | frame for the list items below it |
| `- item` | sticky note |

Help while typing stays out of the way:

- The best match appears as grey text after the cursor. Press Tab or → to take it, or keep typing.
- Pause on a line and a short list appears that fits where you are: names to start with on an empty line, arrow types after a name, targets after an arrow, and label or chain options after a connection. Typing narrows the list; Tab inserts, Esc hides it.
- The pause adapts. Taking suggestions keeps it short; ignoring or hiding them makes it longer, so experienced users rarely see the list. Ctrl+Space opens it at any time.
- When new boxes appear outside the view, the board pans and zooms to show them, and new items flash briefly.

## Ask an AI

**Export → Ask an AI** copies a prompt for ChatGPT, Claude, Copilot or any other chat assistant. The prompt contains:

- a short guide to the orim board format: node shapes, frames, edges, styling and the `%%` canvas lines;
- the Power Platform and Dynamics 365 icon ids, and the 88 Azure icons most boards use;
- the current board;
- your request, if you type one in the dialog.

The assistant replies with the complete board in a ```` ```mermaid ```` block. Paste the whole reply into the dialog's answer box, or straight onto the board, and orim takes the code from it. Ctrl+Z undoes the change.

The prompt is about 5,000 characters plus the board. **Download guide (.md)** saves the guide with every Azure icon id as a skill file with a name and description at the top, so it can be added to an assistant that supports skills or custom instructions. A copy is in [docs/orim-board.md](docs/orim-board.md); it is generated from `js/ai-guide.js`, so download a fresh one after changing the format or the icons.

## Move a board to another device

**Export → QR code** shows a large QR code, the link it contains and the board's Mermaid code. Scanning the code, or opening the link, creates a copy of the board on the other device.

- The board travels inside the link itself (`#m=` followed by the deflated, base64url-encoded Mermaid), so nothing is uploaded or stored anywhere else.
- Only the current board is included, and images are left out.
- A QR code holds about 2,900 characters. If the board is too large, pen strokes and then positions are dropped (the board is laid out again on arrival); **Smaller code** switches between the sizes. Boards that still do not fit need a board file.
- On GitHub Pages or `localhost` the link points to the same site. Anywhere else it points to `https://jussikauhanen.github.io/orim/`; change `ORIM_PAGES` in `js/share-qr.js` for your own deployment.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| V, H or Space | Select, hand |
| N, T, S, A, P, Shift+P, E, F | Sticky, text, shapes, arrows, pen, highlighter, eraser, frame |
| R, O, D, B | Rectangle, circle, decision, database |
| I | Icon library |
| C | Comment |
| Ctrl+Z, Ctrl+Shift+Z | Undo, redo |
| Ctrl+D, Ctrl+G, Ctrl+Shift+G | Duplicate, group into frame, ungroup |
| Ctrl+B, Ctrl+I | Bold, italic |
| Shift+1, Shift+L | Fit to screen, tidy up |
| Alt+1, Alt+2, Alt+3 | Code, Split, Canvas |
| Esc | Close panel, cancel tool, clear selection |

## Development

```sh
npm test          # parser and serializer tests (Node 18+)
npm run build     # single-file build in dist/
```

To update the icons, see the header of `tools/build-icons.py`.

## Licenses

The orim source has no license file yet; add one before publishing if you want others to reuse the code. Third-party material is listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). The Microsoft icons are licensed only for architecture diagrams, training material and documentation.
