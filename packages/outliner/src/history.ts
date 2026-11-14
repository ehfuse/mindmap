/**
 * Undo / redo for a controlled tree.
 * Typing into one node within `mergeMs` is merged into one step, so undo doesn't go back one letter at a time.
 */
import { useCallback, useRef, useState } from "react";
import type { TreeNode } from "./tree";

export interface TreeHistory {
    canUndo: boolean;
    canRedo: boolean;
    /** Records the tree before a change. `mergeKey` merges consecutive changes with the same key (e.g. typing in one node). */
    record: (before: TreeNode, mergeKey?: string) => void;
    undo: (current: TreeNode) => TreeNode | null;
    redo: (current: TreeNode) => TreeNode | null;
    clear: () => void;
}

export function useTreeHistory(limit = 100, mergeMs = 1200): TreeHistory {
    const past = useRef<TreeNode[]>([]);
    const future = useRef<TreeNode[]>([]);
    const last = useRef<{ key: string; at: number } | null>(null);
    const [, bump] = useState(0);
    const refresh = () => bump((n) => n + 1);

    const record = useCallback(
        (before: TreeNode, mergeKey?: string) => {
            const now = Date.now();
            const merge = mergeKey && last.current?.key === mergeKey && now - last.current.at < mergeMs;
            last.current = mergeKey ? { key: mergeKey, at: now } : null;
            future.current = [];
            if (!merge) {
                past.current.push(before);
                if (past.current.length > limit) past.current.shift();
            }
            refresh();
        },
        [limit, mergeMs]
    );
    const undo = useCallback((current: TreeNode) => {
        const prev = past.current.pop();
        if (!prev) return null;
        future.current.push(current);
        last.current = null;
        refresh();
        return prev;
    }, []);
    const redo = useCallback((current: TreeNode) => {
        const next = future.current.pop();
        if (!next) return null;
        past.current.push(current);
        last.current = null;
        refresh();
        return next;
    }, []);
    const clear = useCallback(() => {
        past.current = [];
        future.current = [];
        last.current = null;
        refresh();
    }, []);
    return { canUndo: past.current.length > 0, canRedo: future.current.length > 0, record, undo, redo, clear };
}
