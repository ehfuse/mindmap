/**
 * Outline rows — one node per line, fold / unfold, indent / outdent, reorder, drag to move, per-node style.
 *
 * Keys: Enter new line · Tab indent · Shift+Tab outdent · Alt+↑/↓ reorder · ↑/↓ previous / next row ·
 * Backspace on an empty row deletes it · Ctrl/⌘+Z undo · Ctrl/⌘+Shift+Z or Ctrl+Y redo.
 * Dragging follows the pointer directly (native drag & drop doesn't fire drops reliably inside drawers / modals).
 */
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { Box, IconButton } from "@mui/material";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import {
    addBelow,
    containsNode,
    indentNode,
    locateNode,
    moveNode,
    outdentNode,
    removeNode,
    setTopic,
    shiftNode,
    toggleFold,
    visibleRows,
    type TreeEdit,
    type TreeNode,
    type TreeNodeStyle,
} from "./tree";
import type { OutlinerStrings } from "./i18n";
import { measureText } from "./measure";

const INDENT = 22;
const BASE_FONT = 15;

export interface OutlineListProps {
    root: TreeNode;
    /** A change; `mergeKey` is set for typing so history can merge it. */
    onEdit: (root: TreeNode, mergeKey?: string) => void;
    selectedId?: string | null;
    onSelect?: (id: string) => void;
    strings: OutlinerStrings;
    readOnly?: boolean;
    onUndo?: () => void;
    onRedo?: () => void;
    /** Extra space above the first row / below the last row (px). */
    paddingTop?: number;
    paddingBottom?: number;
}

/** Node style → input style (font size is clamped so the list stays a list). */
export function outlineTextStyle(style: TreeNodeStyle | undefined, depth: number): CSSProperties {
    const size = style?.fontSize ? Math.min(28, Math.max(12, parseFloat(style.fontSize))) : BASE_FONT;
    return {
        fontSize: size,
        fontWeight: style?.fontWeight ?? (depth === 0 ? 700 : 400),
        color: style?.color,
        textDecoration: style?.textDecoration,
        background: style?.background,
    };
}

export function OutlineList({ root, onEdit, selectedId, onSelect, strings, readOnly, onUndo, onRedo, paddingTop = 8, paddingBottom = 40 }: OutlineListProps) {
    const inputs = useRef(new Map<string, HTMLInputElement>());
    const rowEls = useRef(new Map<string, HTMLDivElement>());
    const [focus, setFocus] = useState<string | null>(null);
    const [drop, setDrop] = useState<{ id: string; place: "before" | "after" } | null>(null);
    const [dragging, setDragging] = useState<string | null>(null);
    const rows = visibleRows(root);

    useEffect(() => {
        if (!focus) return;
        const el = inputs.current.get(focus);
        if (!el) return;
        el.focus();
        el.setSelectionRange(el.value.length, el.value.length);
        setFocus(null);
    }, [focus, root]);

    const apply = (result: TreeEdit | null, mergeKey?: string) => {
        if (!result) return;
        onEdit(result.root, mergeKey);
        if (result.focusId) {
            setFocus(result.focusId);
            onSelect?.(result.focusId);
        }
    };

    const onKey = (event: KeyboardEvent<HTMLInputElement>, index: number) => {
        if (event.nativeEvent.isComposing) return;
        const row = rows[index];
        const id = row.node.id;
        const mod = event.ctrlKey || event.metaKey;
        if (mod && (event.key === "z" || event.key === "Z")) {
            event.preventDefault();
            if (event.shiftKey) onRedo?.();
            else onUndo?.();
            return;
        }
        if (mod && (event.key === "y" || event.key === "Y")) {
            event.preventDefault();
            onRedo?.();
            return;
        }
        if (readOnly) return;
        if (event.key === "Enter") {
            event.preventDefault();
            apply(addBelow(root, id));
        } else if (event.key === "Tab") {
            event.preventDefault();
            apply(event.shiftKey ? outdentNode(root, id) : indentNode(root, id));
        } else if (event.altKey && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
            event.preventDefault();
            apply(shiftNode(root, id, event.key === "ArrowUp" ? -1 : 1));
        } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
            const next = rows[index + (event.key === "ArrowUp" ? -1 : 1)];
            if (next) {
                event.preventDefault();
                setFocus(next.node.id);
                onSelect?.(next.node.id);
            }
        } else if (event.key === "Backspace" && event.currentTarget.value === "" && row.depth > 0 && !(row.node.children?.length ?? 0)) {
            event.preventDefault();
            const result = removeNode(root, id);
            if (result) apply({ root: result.root, focusId: rows[index - 1]?.node.id });
        }
    };

    // Drag — follow the pointer on the handle; drop before / after the row under it (never into itself).
    const dragNode = dragging ? locateNode(root, dragging)?.node ?? null : null;
    const onHandleDown = (event: PointerEvent<HTMLDivElement>, id: string) => {
        if (event.button !== 0 || readOnly) return;
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        setDragging(id);
        setDrop(null);
    };
    const onHandleMove = (event: PointerEvent<HTMLDivElement>) => {
        if (!dragging || !dragNode) return;
        let next: { id: string; place: "before" | "after" } | null = null;
        for (const row of rows) {
            const el = rowEls.current.get(row.node.id);
            if (!el) continue;
            const r = el.getBoundingClientRect();
            if (event.clientY < r.top || event.clientY >= r.bottom) continue;
            if (!containsNode(dragNode, row.node.id)) next = { id: row.node.id, place: event.clientY < r.top + r.height / 2 ? "before" : "after" };
            break;
        }
        if (next?.id !== drop?.id || next?.place !== drop?.place) setDrop(next);
    };
    const onHandleUp = (event: PointerEvent<HTMLDivElement>) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
        if (dragging && drop) apply(moveNode(root, dragging, drop.id, drop.place));
        setDragging(null);
        setDrop(null);
    };

    return (
        <Box sx={{ position: "relative", height: "100%", overflowY: "auto", bgcolor: "#fff", pt: `${paddingTop}px`, pb: `${paddingBottom}px`, px: 1.5 }}>
            {rows.map((row, index) => {
                const hasKids = (row.node.children?.length ?? 0) > 0;
                const folded = row.node.expanded === false;
                const line = drop?.id === row.node.id ? drop.place : null;
                const text = outlineTextStyle(row.node.style, row.depth);
                return (
                    <Box
                        key={row.node.id}
                        ref={(el: HTMLDivElement | null) => {
                            if (el) rowEls.current.set(row.node.id, el);
                            else rowEls.current.delete(row.node.id);
                        }}
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            minHeight: 26,
                            pl: `${row.depth * INDENT}px`,
                            borderRadius: 0.75,
                            bgcolor: selectedId === row.node.id ? "rgba(26,115,232,0.06)" : "transparent",
                            // Drop line — inset shadow so it takes no height.
                            boxShadow: (theme) =>
                                line === "before" ? `inset 0 2px 0 ${theme.palette.primary.main}` : line === "after" ? `inset 0 -2px 0 ${theme.palette.primary.main}` : "none",
                            opacity: dragging === row.node.id ? 0.4 : 1,
                            "&:hover .ol-handle": { visibility: "visible" },
                        }}
                    >
                        <Box
                            className="ol-handle"
                            title={strings.drag}
                            onPointerDown={row.depth > 0 ? (event: PointerEvent<HTMLDivElement>) => onHandleDown(event, row.node.id) : undefined}
                            onPointerMove={onHandleMove}
                            onPointerUp={onHandleUp}
                            onPointerCancel={onHandleUp}
                            sx={{
                                display: "flex",
                                color: "#b0b4ba",
                                cursor: row.depth > 0 && !readOnly ? (dragging ? "grabbing" : "grab") : "default",
                                visibility: dragging === row.node.id ? "visible" : "hidden",
                                width: 18,
                                flexShrink: 0,
                                touchAction: "none",
                            }}
                        >
                            {row.depth > 0 && !readOnly ? <DragIndicatorIcon sx={{ fontSize: 16 }} /> : null}
                        </Box>
                        {hasKids ? (
                            <IconButton
                                size="small"
                                aria-label={folded ? strings.unfold : strings.fold}
                                title={folded ? strings.unfold : strings.fold}
                                onClick={() => apply(toggleFold(root, row.node.id))}
                                sx={{ width: 22, height: 22, p: 0, color: "text.secondary" }}
                            >
                                {/* Chevrons (∨ / ›) rather than filled triangles. */}
                                {folded ? <ChevronRightIcon sx={{ fontSize: 18 }} /> : <ExpandMoreIcon sx={{ fontSize: 18 }} />}
                            </IconButton>
                        ) : (
                            <Box sx={{ width: 22, display: "flex", justifyContent: "center", flexShrink: 0 }}>
                                <Box sx={{ width: 5, height: 5, borderRadius: "50%", bgcolor: "#9aa0a6" }} />
                            </Box>
                        )}
                        <Box sx={{ flex: 1, minWidth: 0, display: "flex", ml: 0.5 }}>
                            <input
                                ref={(el) => {
                                    if (el) inputs.current.set(row.node.id, el);
                                    else inputs.current.delete(row.node.id);
                                }}
                                value={row.node.topic}
                                readOnly={readOnly}
                                placeholder={row.depth === 0 ? strings.root : ""}
                                spellCheck={false}
                                autoComplete="off"
                                onFocus={() => onSelect?.(row.node.id)}
                                onChange={(event) => apply(setTopic(root, row.node.id, event.target.value), `topic:${row.node.id}`)}
                                onKeyDown={(event) => onKey(event, index)}
                                style={{
                                    // Background hugs the text like a highlighter; the input keeps full width for clicks.
                                    width: text.background ? Math.ceil(measureText(row.node.topic || " ", Number(text.fontSize), text.fontWeight as string)) + 16 : "100%",
                                    maxWidth: "100%",
                                    border: 0,
                                    outline: 0,
                                    font: "inherit",
                                    padding: text.background ? "2px 6px" : "2px 0",
                                    borderRadius: 4,
                                    background: text.background ?? "transparent",
                                    color: text.color ?? "inherit",
                                    fontSize: text.fontSize,
                                    fontWeight: text.fontWeight,
                                    textDecoration: [text.textDecoration, folded && hasKids ? "underline dotted #9aa0a6" : ""].filter(Boolean).join(" ") || undefined,
                                }}
                            />
                        </Box>
                    </Box>
                );
            })}
        </Box>
    );
}
