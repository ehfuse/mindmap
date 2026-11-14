# ehfuse mindmap

Monorepo for two React + MUI packages that edit the same tree:

| Package | What it is |
| --- | --- |
| [`@ehfuse/outliner`](packages/outliner) | Outliner — one row per node, fold, indent / outdent, drag to reorder, formatting toolbar, undo |
| [`@ehfuse/mindmap`](packages/mindmap) | Mind map — map view drawn from scratch + the outline view, one shared toolbar, SVG export |

The tree uses Mind Elixir's `nodeData` shape (`{ id, topic, children, expanded, style }`), so data saved by Mind Elixir opens as is.

```bash
npm install            # workspaces: packages/outliner, packages/mindmap, example
npm run build          # builds outliner, then mindmap
npm run example        # example app (Vite) — reads the package sources directly
```

License: MIT
