# @ehfuse/mindmap

Mind map for React + MUI. The map is drawn from scratch (no canvas library), and the same tree can be edited as a list
with [`@ehfuse/outliner`](../outliner). One toolbar formats both views. Exports a standalone SVG for saving a picture.

```bash
npm install @ehfuse/mindmap @mui/material @mui/icons-material @emotion/react @emotion/styled
```

```tsx
import { useRef, useState } from "react";
import { MindMap, createTree, type MindMapData, type MindMapHandle } from "@ehfuse/mindmap";

export function Plan() {
    const [data, setData] = useState<MindMapData>({ nodeData: createTree("Topic"), direction: 2 });
    const ref = useRef<MindMapHandle>(null);
    return (
        <div style={{ height: 520 }}>
            <MindMap ref={ref} value={data} onChange={setData} locale="en" />
            <button onClick={() => console.log(ref.current?.exportSvg())}>SVG</button>
        </div>
    );
}
```

## Map

| Do | How |
| --- | --- |
| Select | Click a branch |
| Edit text | Double-click, F2, or the ✎ button above the selected branch |
| Child / sibling | Tab / Enter, or the buttons above the selected branch |
| Delete | Delete / Backspace |
| Fold | Space, or the circle at the branch's outer edge |
| Move a branch | Drag it onto another (middle = into it, top / bottom edge = before / after) |
| Pan | Drag empty space (the mouse wheel scrolls the page, it doesn't move the map) |
| Zoom | Ctrl/⌘ + wheel, or the toolbar |
| Move the selection | Arrow keys |
| Undo / redo | Ctrl/⌘+Z, Ctrl/⌘+Shift+Z or Ctrl+Y (shared with the list view) |

Layout: both sides (default), right only, or left only — `direction` 2 / 1 / 0 (same values as Mind Elixir).

## Props

| Prop | Type | |
| --- | --- | --- |
| `value` / `onChange` | `MindMapData` | `{ nodeData: TreeNode, direction?: 0 \| 1 \| 2 }` — Mind Elixir compatible |
| `locale` | `string` | `ko` · `en` · `ja` · `zh` · `de` · `fr` · `it` · `vi` |
| `view` / `defaultView` / `onViewChange` | `"map" \| "outline"` | |
| `readOnly` | `boolean` | |
| `toolbarEnd` | `ReactNode` | Your own controls at the right end of the toolbar |
| `hint` | `boolean` | One-line help at the bottom (default `true`) |
| `height` | `number \| string` | Default `100%` |

`ref` → `{ exportSvg(): string; center(): void }`. `exportMindMapSvg(data)` works without a mounted component.

License: MIT
