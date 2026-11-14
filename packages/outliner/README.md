# @ehfuse/outliner

Outliner for React + MUI. One row per node, fold / unfold, indent / outdent, drag to reorder, per-node formatting
(font size · text color · background · bold · underline · strikethrough) and undo. 8 UI languages (ko · en · ja · zh · de · fr · it · vi).

```bash
npm install @ehfuse/outliner @mui/material @mui/icons-material @emotion/react @emotion/styled
```

```tsx
import { useState } from "react";
import { Outliner, createTree, type TreeNode } from "@ehfuse/outliner";

export function Notes() {
    const [tree, setTree] = useState<TreeNode>(createTree("Topic"));
    return <Outliner value={tree} onChange={setTree} locale="en" height={480} />;
}
```

## Keys

| Key | Action |
| --- | --- |
| Enter | New row (first child of an open parent, otherwise next sibling) |
| Tab / Shift+Tab | Indent / outdent |
| Alt+↑ / Alt+↓ | Move among siblings |
| ↑ / ↓ | Previous / next row |
| Backspace on an empty row | Delete the row |
| Ctrl/⌘+Z, Ctrl/⌘+Shift+Z or Ctrl+Y | Undo / redo |

Drag the handle at the start of a row onto another row (upper half = before, lower half = after).

## Data

```ts
interface TreeNode {
    id: string;
    topic: string;
    children?: TreeNode[];
    expanded?: boolean; // false = folded
    style?: { fontSize?: string; color?: string; background?: string; fontWeight?: string; textDecoration?: string };
}
```

Same shape as Mind Elixir `nodeData`. Unknown keys are kept.

## Building blocks

`Outliner` is `FormatToolbar` + `OutlineList` + `useTreeHistory`. Use them directly for a custom layout, and the pure tree
operations (`addChild`, `addSibling`, `indentNode`, `outdentNode`, `moveNode`, `setTopic`, `setNodeStyle`, `toggleFold`, …) for your own UI.

| Prop | Type | |
| --- | --- | --- |
| `value` / `onChange` | `TreeNode` | Controlled tree |
| `locale` | `string` | `ko` · `en` · `ja` · `zh` · `de` · `fr` · `it` · `vi` (default English) |
| `strings` | `Partial<OutlinerStrings>` | Override single labels |
| `readOnly` | `boolean` | |
| `toolbar` | `boolean` | Show the toolbar (default `true`) |
| `toolbarStart` / `toolbarEnd` | `ReactNode` | Your own controls in the toolbar |
| `height` | `number \| string` | Default `100%` |

License: MIT

## Sizing

The toolbar reads the same CSS variables as `@ehfuse/editor`, so one rule sizes both:

```css
:root {
    --editor-toolbar-button-size: 26px; /* default 32px */
    --editor-toolbar-icon-size: 18px;   /* default 20px */
    --editor-toolbar-button-gap: 0px;   /* default 2px */
}
```
