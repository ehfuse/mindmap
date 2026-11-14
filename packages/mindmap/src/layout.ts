/**
 * Map layout — root in the middle, branches to the right / left / both sides.
 * Node sizes come from measured text (no DOM pass), so layout is a pure function of the data.
 */
import { measureText, type TreeNode } from "@ehfuse/outliner";

/** 0 = left, 1 = right, 2 = both sides (same values as Mind Elixir). */
export type MapDirection = 0 | 1 | 2;

export interface LayoutNode {
    id: string;
    node: TreeNode;
    depth: number;
    x: number;
    y: number;
    w: number;
    h: number;
    /** 1 = grows to the right, -1 = to the left, 0 = root. */
    side: 1 | -1 | 0;
    color: string;
    parentId: string | null;
    fontSize: number;
    fontWeight: string;
}

export interface LayoutEdge {
    from: LayoutNode;
    to: LayoutNode;
    color: string;
}

export interface MapLayout {
    nodes: LayoutNode[];
    byId: Map<string, LayoutNode>;
    edges: LayoutEdge[];
    bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

export const BRANCH_COLORS = ["#e8710a", "#1a73e8", "#188038", "#d93025", "#9334e6", "#f9ab00", "#12b5cb", "#c2185b"];
const H_GAP_ROOT = 64;
const H_GAP = 40;
const V_GAP = 14;

/** Default text size / weight by depth (a node's own style wins). */
export function nodeFont(node: TreeNode, depth: number) {
    const fontSize = node.style?.fontSize ? parseFloat(node.style.fontSize) : depth === 0 ? 22 : depth === 1 ? 16 : 14;
    const fontWeight = node.style?.fontWeight ?? (depth === 0 ? "700" : depth === 1 ? "500" : "400");
    return { fontSize, fontWeight };
}

export function nodeSize(node: TreeNode, depth: number) {
    const { fontSize, fontWeight } = nodeFont(node, depth);
    const padX = depth === 0 ? 28 : depth === 1 ? 16 : 12;
    const padY = depth === 0 ? 14 : depth === 1 ? 8 : 6;
    const textW = measureText(node.topic || " ", fontSize, fontWeight);
    return {
        w: Math.max(depth === 0 ? 100 : 48, Math.ceil(textW) + padX * 2),
        h: Math.ceil(fontSize * 1.4) + padY * 2,
        fontSize,
        fontWeight,
    };
}

const visibleKids = (node: TreeNode) => (node.expanded === false ? [] : (node.children ?? []));

export function layoutMap(root: TreeNode, direction: MapDirection = 2): MapLayout {
    const heights = new Map<string, number>();
    const subtree = (node: TreeNode, depth: number): number => {
        const own = nodeSize(node, depth).h;
        const kids = visibleKids(node);
        const sum = kids.reduce((acc, kid) => acc + subtree(kid, depth + 1), 0) + V_GAP * Math.max(0, kids.length - 1);
        const value = Math.max(own, sum);
        heights.set(node.id, value);
        return value;
    };

    const nodes: LayoutNode[] = [];
    const edges: LayoutEdge[] = [];
    const rootSize = nodeSize(root, 0);
    const rootLN: LayoutNode = { id: root.id, node: root, depth: 0, x: -rootSize.w / 2, y: -rootSize.h / 2, w: rootSize.w, h: rootSize.h, side: 0, color: "#3b3f5c", parentId: null, fontSize: rootSize.fontSize, fontWeight: rootSize.fontWeight };
    nodes.push(rootLN);

    const place = (parent: LayoutNode, kids: TreeNode[], side: 1 | -1, depth: number, colorOf: (kid: TreeNode, i: number) => string) => {
        kids.forEach((kid) => subtree(kid, depth));
        const total = kids.reduce((acc, kid) => acc + (heights.get(kid.id) ?? 0), 0) + V_GAP * Math.max(0, kids.length - 1);
        let top = parent.y + parent.h / 2 - total / 2;
        const gap = depth === 1 ? H_GAP_ROOT : H_GAP;
        kids.forEach((kid, i) => {
            const sh = heights.get(kid.id) ?? 0;
            const size = nodeSize(kid, depth);
            const cy = top + sh / 2;
            const x = side > 0 ? parent.x + parent.w + gap : parent.x - gap - size.w;
            const color = colorOf(kid, i);
            const ln: LayoutNode = { id: kid.id, node: kid, depth, x, y: cy - size.h / 2, w: size.w, h: size.h, side, color, parentId: parent.id, fontSize: size.fontSize, fontWeight: size.fontWeight };
            nodes.push(ln);
            edges.push({ from: parent, to: ln, color });
            place(ln, visibleKids(kid), side, depth + 1, () => color);
            top += sh + V_GAP;
        });
    };

    const kids = visibleKids(root);
    const all = root.children ?? [];
    const colorFor = (kid: TreeNode) => BRANCH_COLORS[Math.max(0, all.indexOf(kid)) % BRANCH_COLORS.length];
    const sideOf = (kid: TreeNode, i: number): 1 | -1 => {
        if (direction === 0) return -1;
        if (direction === 1) return 1;
        if (kid.direction === 0) return -1;
        if (kid.direction === 1) return 1;
        // Both sides: first half right, second half left (keeps reading order top-down on each side).
        return i < Math.ceil(kids.length / 2) ? 1 : -1;
    };
    const right = kids.filter((kid, i) => sideOf(kid, i) === 1);
    const left = kids.filter((kid, i) => sideOf(kid, i) === -1);
    place(rootLN, right, 1, 1, colorFor);
    place(rootLN, left, -1, 1, colorFor);

    const bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
    for (const n of nodes) {
        bounds.minX = Math.min(bounds.minX, n.x);
        bounds.minY = Math.min(bounds.minY, n.y);
        bounds.maxX = Math.max(bounds.maxX, n.x + n.w);
        bounds.maxY = Math.max(bounds.maxY, n.y + n.h);
    }
    return { nodes, byId: new Map(nodes.map((n) => [n.id, n])), edges, bounds };
}

/** Curved connector from the parent's side to the child's near side. */
export function edgePath(edge: LayoutEdge): string {
    const { from, to } = edge;
    const side = to.side >= 0 ? 1 : -1;
    const x1 = from.depth === 0 ? from.x + from.w / 2 + (side * from.w) / 2 - side * 12 : side > 0 ? from.x + from.w : from.x;
    const y1 = from.y + from.h / 2;
    const x2 = side > 0 ? to.x : to.x + to.w;
    const y2 = to.y + to.h / 2;
    const dx = (x2 - x1) * 0.5;
    return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
}

/** Visual look of a node (fill · border · text color · radius) — shared by the map and the SVG export. */
export function nodeLook(ln: LayoutNode) {
    const style = ln.node.style ?? {};
    if (ln.depth === 0) return { fill: style.background ?? "#3b3f5c", stroke: "none", strokeWidth: 0, text: style.color ?? "#ffffff", radius: ln.h / 2 };
    if (ln.depth === 1) return { fill: style.background ?? "#ffffff", stroke: ln.color, strokeWidth: 2, text: style.color ?? "#1f2328", radius: ln.h / 2 };
    return { fill: style.background ?? "#ffffff", stroke: "#d0d4da", strokeWidth: 1, text: style.color ?? "#1f2328", radius: 8 };
}
