import type { TreeNode } from "@ehfuse/outliner";
import type { MapDirection } from "./layout";

/** Saved mind map — same shape as Mind Elixir's data (extra keys are kept as they are). */
export interface MindMapData {
    nodeData: TreeNode;
    direction?: MapDirection;
    [key: string]: unknown;
}

export type MindMapView = "map" | "outline";
