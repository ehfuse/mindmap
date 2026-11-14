/**
 * Tree data and edit operations shared by the outline and the mind map.
 *
 * The shape follows Mind Elixir's `nodeData` so data saved by it opens unchanged:
 * `{ id, topic, children?, expanded?, style? }` — unknown keys are carried along untouched.
 * Every operation is pure: it returns a new root (structural copy) and, when useful,
 * the id that should be focused next.
 */

/** Text style of one node (same keys as Mind Elixir `style`). */
export interface TreeNodeStyle {
    fontSize?: string;
    color?: string;
    background?: string;
    fontWeight?: string;
    textDecoration?: string;
}

export interface TreeNode {
    id: string;
    topic: string;
    children?: TreeNode[];
    /** `false` = folded. Missing means expanded. */
    expanded?: boolean;
    style?: TreeNodeStyle;
    [key: string]: unknown;
}

export interface TreeEdit {
    root: TreeNode;
    /** Node to select / focus after the edit. */
    focusId?: string;
}

export interface TreeRow {
    node: TreeNode;
    depth: number;
    parentId: string | null;
}

/** Short random id (hex, like Mind Elixir). */
export const newNodeId = () => Math.random().toString(16).slice(2, 18);

export const createTree = (topic: string): TreeNode => ({ id: "root", topic, children: [] });

const clone = (root: TreeNode): TreeNode => structuredClone(root) as TreeNode;

/** Finds a node with its parent and index (in the given tree). */
export function locateNode(root: TreeNode, id: string): { node: TreeNode; parent: TreeNode | null; index: number } | null {
    if (root.id === id) return { node: root, parent: null, index: 0 };
    const stack: TreeNode[] = [root];
    while (stack.length) {
        const parent = stack.pop()!;
        const list = parent.children ?? [];
        for (let i = 0; i < list.length; i++) {
            if (list[i].id === id) return { node: list[i], parent, index: i };
            stack.push(list[i]);
        }
    }
    return null;
}

/** True when `id` is `node` itself or one of its descendants. */
export const containsNode = (node: TreeNode, id: string): boolean => node.id === id || (node.children ?? []).some((child) => containsNode(child, id));

/** Depth of a node (root = 0); -1 when not found. */
export function nodeDepth(root: TreeNode, id: string): number {
    const walk = (node: TreeNode, depth: number): number => {
        if (node.id === id) return depth;
        for (const child of node.children ?? []) {
            const found = walk(child, depth + 1);
            if (found >= 0) return found;
        }
        return -1;
    };
    return walk(root, 0);
}

export const isFolded = (node: TreeNode) => node.expanded === false && (node.children?.length ?? 0) > 0;

/** Rows that are visible (folded subtrees hidden), in reading order. */
export function visibleRows(root: TreeNode): TreeRow[] {
    const rows: TreeRow[] = [];
    const walk = (node: TreeNode, depth: number, parentId: string | null) => {
        rows.push({ node, depth, parentId });
        if (node.expanded !== false) for (const child of node.children ?? []) walk(child, depth + 1, node.id);
    };
    walk(root, 0, null);
    return rows;
}

/** Runs `run` on a copy; returns null when nothing changed (run returned false). */
function edit(root: TreeNode, run: (copy: TreeNode) => string | void | false): TreeEdit | null {
    const copy = clone(root);
    const focusId = run(copy);
    if (focusId === false) return null;
    return { root: copy, focusId: focusId || undefined };
}

/** New child at the end (or `first`). */
export const addChild = (root: TreeNode, id: string, topic = "", first = false) =>
    edit(root, (copy) => {
        const at = locateNode(copy, id);
        if (!at) return false;
        const fresh: TreeNode = { id: newNodeId(), topic };
        at.node.children = first ? [fresh, ...(at.node.children ?? [])] : [...(at.node.children ?? []), fresh];
        at.node.expanded = true;
        return fresh.id;
    });

/** New sibling right after (root → first child). */
export const addSibling = (root: TreeNode, id: string, topic = "") =>
    edit(root, (copy) => {
        const at = locateNode(copy, id);
        if (!at) return false;
        const fresh: TreeNode = { id: newNodeId(), topic };
        if (!at.parent) {
            at.node.children = [fresh, ...(at.node.children ?? [])];
            at.node.expanded = true;
        } else at.parent.children!.splice(at.index + 1, 0, fresh);
        return fresh.id;
    });

/** Outline "Enter": first child when the row is an open parent, otherwise next sibling. */
export const addBelow = (root: TreeNode, id: string) => {
    const at = locateNode(root, id);
    if (at && (!at.parent || ((at.node.children?.length ?? 0) > 0 && at.node.expanded !== false))) return addChild(root, id, "", true);
    return addSibling(root, id);
};

/** Removes the node (not the root). Focus goes to the previous sibling, else the parent. */
export const removeNode = (root: TreeNode, id: string) =>
    edit(root, (copy) => {
        const at = locateNode(copy, id);
        if (!at?.parent) return false;
        at.parent.children!.splice(at.index, 1);
        return at.parent.children![at.index - 1]?.id ?? at.parent.id;
    });

/** Becomes the last child of the previous sibling. */
export const indentNode = (root: TreeNode, id: string) =>
    edit(root, (copy) => {
        const at = locateNode(copy, id);
        if (!at?.parent || at.index === 0) return false;
        const prev = at.parent.children![at.index - 1];
        at.parent.children!.splice(at.index, 1);
        prev.children = [...(prev.children ?? []), at.node];
        prev.expanded = true;
        return id;
    });

/** Becomes the sibling right after its parent. */
export const outdentNode = (root: TreeNode, id: string) =>
    edit(root, (copy) => {
        const at = locateNode(copy, id);
        if (!at?.parent) return false;
        const up = locateNode(copy, at.parent.id);
        if (!up?.parent) return false;
        at.parent.children!.splice(at.index, 1);
        up.parent.children!.splice(up.index + 1, 0, at.node);
        return id;
    });

/** Moves one step among its siblings. */
export const shiftNode = (root: TreeNode, id: string, step: -1 | 1) =>
    edit(root, (copy) => {
        const at = locateNode(copy, id);
        if (!at?.parent) return false;
        const list = at.parent.children!;
        const to = at.index + step;
        if (to < 0 || to >= list.length) return false;
        [list[at.index], list[to]] = [list[to], list[at.index]];
        return id;
    });

/** Moves `from` before / after `to`, or into `to` as its last child. */
export const moveNode = (root: TreeNode, from: string, to: string, place: "before" | "after" | "child") =>
    edit(root, (copy) => {
        const src = locateNode(copy, from);
        if (!src?.parent || containsNode(src.node, to)) return false;
        src.parent.children!.splice(src.index, 1);
        const dst = locateNode(copy, to);
        if (!dst) return false;
        if (place === "child" || !dst.parent) {
            dst.node.children = [...(dst.node.children ?? []), src.node];
            dst.node.expanded = true;
        } else dst.parent.children!.splice(dst.index + (place === "after" ? 1 : 0), 0, src.node);
        return from;
    });

export const setTopic = (root: TreeNode, id: string, topic: string) =>
    edit(root, (copy) => {
        const at = locateNode(copy, id);
        if (!at || at.node.topic === topic) return false;
        at.node.topic = topic;
    });

export const toggleFold = (root: TreeNode, id: string, expanded?: boolean) =>
    edit(root, (copy) => {
        const at = locateNode(copy, id);
        if (!at || !(at.node.children?.length ?? 0)) return false;
        at.node.expanded = expanded ?? at.node.expanded === false;
    });

/** Merges a style patch; `undefined` values remove the key. */
export const setNodeStyle = (root: TreeNode, ids: string[], patch: Partial<TreeNodeStyle>) =>
    edit(root, (copy) => {
        let changed = false;
        for (const id of ids) {
            const at = locateNode(copy, id);
            if (!at) continue;
            const next: TreeNodeStyle = { ...(at.node.style ?? {}) };
            for (const [key, value] of Object.entries(patch) as [keyof TreeNodeStyle, string | undefined][]) {
                if (value === undefined || value === "") delete next[key];
                else next[key] = value;
            }
            at.node.style = Object.keys(next).length ? next : undefined;
            if (!at.node.style) delete at.node.style;
            changed = true;
        }
        return changed ? undefined : false;
    });

/** `textDecoration` holds both underline and line-through. */
export function hasDecoration(style: TreeNodeStyle | undefined, kind: "underline" | "line-through") {
    return (style?.textDecoration ?? "").split(/\s+/).includes(kind);
}
export function toggleDecoration(style: TreeNodeStyle | undefined, kind: "underline" | "line-through"): string | undefined {
    const set = new Set((style?.textDecoration ?? "").split(/\s+/).filter(Boolean));
    if (set.has(kind)) set.delete(kind);
    else set.add(kind);
    return set.size ? [...set].join(" ") : undefined;
}
