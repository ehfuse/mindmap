/**
 * Map view — draws the tree as a mind map and edits it in place.
 *
 * Mouse: click to select · double-click to edit · drag a branch onto another (middle = into it, top / bottom edge = before / after)
 *        · drag empty space to pan · Ctrl/⌘ + wheel to zoom (a plain wheel scrolls the page, not the map).
 * Keys (map focused): Tab child · Enter sibling · F2 edit · Delete / Backspace remove · Space fold · arrows move the selection ·
 *        Ctrl/⌘+Z undo · Ctrl/⌘+Shift+Z / Ctrl+Y redo.
 */
import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { Box, IconButton, Tooltip } from "@mui/material";
import SubdirectoryArrowRightIcon from "@mui/icons-material/SubdirectoryArrowRight";
import AddIcon from "@mui/icons-material/Add";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import {
    DEFAULT_FONT_FAMILY,
    addChild,
    addSibling,
    containsNode,
    locateNode,
    measureText,
    moveNode,
    removeNode,
    setTopic,
    toggleFold,
    type TreeEdit,
    type TreeNode,
} from "@ehfuse/outliner";
import { edgePath, layoutMap, nodeLook, type LayoutNode, type MapDirection } from "./layout";
import type { MindMapStrings } from "./i18n";

export interface MapViewHandle {
    center: () => void;
    zoomBy: (factor: number) => void;
}

export interface MapViewProps {
    root: TreeNode;
    direction: MapDirection;
    onEdit: (root: TreeNode, mergeKey?: string) => void;
    selectedId: string | null;
    onSelect: (id: string | null) => void;
    strings: MindMapStrings;
    readOnly?: boolean;
    onUndo?: () => void;
    onRedo?: () => void;
    /** Show the one-line help at the bottom (default true). */
    hint?: boolean;
}

const ZOOM_MIN = 0.3;
const ZOOM_MAX = 2.5;
const DRAG_START = 5;

type DropPlace = "before" | "after" | "child";

export const MapView = forwardRef<MapViewHandle, MapViewProps>(function MapView({ root, direction, onEdit, selectedId, onSelect, strings, readOnly, onUndo, onRedo, hint = true }, ref) {
    const boxRef = useRef<HTMLDivElement | null>(null);
    const [size, setSize] = useState({ w: 0, h: 0 });
    const [view, setView] = useState({ x: 0, y: 0, z: 1 });
    const viewRef = useRef(view);
    viewRef.current = view;
    const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
    const [drag, setDrag] = useState<{ id: string; px: number; py: number; target: { id: string; place: DropPlace } | null } | null>(null);
    const pointer = useRef<{ kind: "pan" | "node"; id?: string; sx: number; sy: number; vx: number; vy: number; moved: boolean } | null>(null);
    const layout = useMemo(() => layoutMap(root, direction), [root, direction]);

    // Size — center the map the first time the box has a size.
    const centered = useRef(false);
    useLayoutEffect(() => {
        const el = boxRef.current;
        if (!el) return;
        const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
        ro.observe(el);
        setSize({ w: el.clientWidth, h: el.clientHeight });
        return () => ro.disconnect();
    }, []);
    const center = useCallback(() => {
        const { minX, minY, maxX, maxY } = layout.bounds;
        const z = viewRef.current.z;
        setView({ x: size.w / 2 - ((minX + maxX) / 2) * z, y: size.h / 2 - ((minY + maxY) / 2) * z, z });
    }, [layout, size]);
    useEffect(() => {
        if (centered.current || size.w === 0) return;
        centered.current = true;
        center();
    }, [size, center]);
    const zoomAt = useCallback((factor: number, cx: number, cy: number) => {
        setView((v) => {
            const z = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, v.z * factor));
            return { x: cx - (cx - v.x) * (z / v.z), y: cy - (cy - v.y) * (z / v.z), z };
        });
    }, []);
    useImperativeHandle(ref, () => ({ center, zoomBy: (factor) => zoomAt(factor, size.w / 2, size.h / 2) }), [center, zoomAt, size]);

    // Ctrl/⌘ + wheel zooms at the cursor; a plain wheel is left to the page (it must not pan the map).
    useEffect(() => {
        const el = boxRef.current;
        if (!el) return;
        const onWheel = (event: WheelEvent) => {
            if (!(event.ctrlKey || event.metaKey)) return;
            event.preventDefault();
            const r = el.getBoundingClientRect();
            zoomAt(event.deltaY < 0 ? 1.1 : 1 / 1.1, event.clientX - r.left, event.clientY - r.top);
        };
        el.addEventListener("wheel", onWheel, { passive: false });
        return () => el.removeEventListener("wheel", onWheel);
    }, [zoomAt]);

    const apply = (result: TreeEdit | null, mergeKey?: string, editNew = false) => {
        if (!result) return;
        onEdit(result.root, mergeKey);
        if (result.focusId) {
            onSelect(result.focusId);
            if (editNew) setEditing({ id: result.focusId, text: "" });
        }
    };
    const startEdit = (id: string) => {
        if (readOnly) return;
        const at = locateNode(root, id);
        if (at) setEditing({ id, text: at.node.topic });
    };
    const commitEdit = () => {
        if (!editing) return;
        apply(setTopic(root, editing.id, editing.text));
        setEditing(null);
        boxRef.current?.focus({ preventScroll: true });
    };

    const toCanvas = (clientX: number, clientY: number) => {
        const r = boxRef.current!.getBoundingClientRect();
        return { x: (clientX - r.left - view.x) / view.z, y: (clientY - r.top - view.y) / view.z };
    };
    const dropAt = (clientX: number, clientY: number, dragged: TreeNode): { id: string; place: DropPlace } | null => {
        const p = toCanvas(clientX, clientY);
        for (const ln of layout.nodes) {
            if (p.x < ln.x - 4 || p.x > ln.x + ln.w + 4 || p.y < ln.y - 4 || p.y > ln.y + ln.h + 4) continue;
            if (containsNode(dragged, ln.id)) return null;
            if (ln.depth === 0) return { id: ln.id, place: "child" };
            const rel = (p.y - ln.y) / ln.h;
            return { id: ln.id, place: rel < 0.25 ? "before" : rel > 0.75 ? "after" : "child" };
        }
        return null;
    };

    const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
        if (event.button !== 0) return;
        const target = event.target as HTMLElement;
        if (target.closest("[data-mm-ui]")) return;
        if (editing && !target.closest("[data-mm-edit]")) commitEdit();
        if (target.closest("[data-mm-edit]")) return;
        const fold = target.closest("[data-mm-fold]") as HTMLElement | null;
        if (fold) {
            apply(toggleFold(root, fold.dataset.mmFold!));
            return;
        }
        const nodeEl = target.closest("[data-mm-node]") as HTMLElement | null;
        boxRef.current?.focus({ preventScroll: true });
        // Capture the pointer only once a drag starts — capturing on press retargets the double-click to the box, so editing never opened.
        if (nodeEl) {
            const id = nodeEl.dataset.mmNode!;
            onSelect(id);
            pointer.current = { kind: "node", id, sx: event.clientX, sy: event.clientY, vx: view.x, vy: view.y, moved: false };
        } else {
            onSelect(null);
            pointer.current = { kind: "pan", sx: event.clientX, sy: event.clientY, vx: view.x, vy: view.y, moved: false };
        }
    };
    const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
        const p = pointer.current;
        if (!p) return;
        const dx = event.clientX - p.sx;
        const dy = event.clientY - p.sy;
        if (!p.moved && Math.hypot(dx, dy) < DRAG_START) return;
        if (!p.moved && !boxRef.current?.hasPointerCapture(event.pointerId)) boxRef.current?.setPointerCapture(event.pointerId);
        p.moved = true;
        if (p.kind === "pan") {
            setView((v) => ({ ...v, x: p.vx + dx, y: p.vy + dy }));
            return;
        }
        if (readOnly || p.id === root.id) return;
        const dragged = locateNode(root, p.id!)?.node;
        if (!dragged) return;
        const r = boxRef.current!.getBoundingClientRect();
        setDrag({ id: p.id!, px: event.clientX - r.left, py: event.clientY - r.top, target: dropAt(event.clientX, event.clientY, dragged) });
    };
    const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
        const p = pointer.current;
        pointer.current = null;
        if (boxRef.current?.hasPointerCapture(event.pointerId)) boxRef.current.releasePointerCapture(event.pointerId);
        if (p?.kind === "node" && drag?.target) apply(moveNode(root, drag.id, drag.target.id, drag.target.place));
        setDrag(null);
    };

    const neighbor = (ln: LayoutNode, key: string): string | null => {
        const at = locateNode(root, ln.id);
        if (!at) return null;
        if (key === "ArrowUp" || key === "ArrowDown") {
            if (!at.parent) return null;
            const sibs = (at.parent.children ?? []).filter((kid) => layout.byId.get(kid.id)?.side === ln.side);
            const i = sibs.findIndex((kid) => kid.id === ln.id);
            return sibs[i + (key === "ArrowUp" ? -1 : 1)]?.id ?? null;
        }
        const outward = (key === "ArrowRight" && ln.side >= 0) || (key === "ArrowLeft" && ln.side <= 0);
        if (outward) {
            const kids = at.node.expanded === false ? [] : (at.node.children ?? []);
            const want = ln.side === 0 ? (key === "ArrowRight" ? 1 : -1) : ln.side;
            return kids.find((kid) => layout.byId.get(kid.id)?.side === want)?.id ?? null;
        }
        return ln.parentId;
    };
    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (editing || (event.target as HTMLElement).tagName === "INPUT") return;
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
        const ln = selectedId ? layout.byId.get(selectedId) : null;
        if (!ln) return;
        if (event.key.startsWith("Arrow")) {
            const next = neighbor(ln, event.key);
            event.preventDefault();
            if (next) onSelect(next);
            return;
        }
        if (readOnly) return;
        if (event.key === "Tab") {
            event.preventDefault();
            apply(addChild(root, ln.id), undefined, true);
        } else if (event.key === "Enter") {
            event.preventDefault();
            apply(addSibling(root, ln.id), undefined, true);
        } else if (event.key === "F2") {
            event.preventDefault();
            startEdit(ln.id);
        } else if (event.key === "Delete" || event.key === "Backspace") {
            event.preventDefault();
            apply(removeNode(root, ln.id));
        } else if (event.key === " ") {
            event.preventDefault();
            apply(toggleFold(root, ln.id));
        }
    };

    const selected = selectedId ? layout.byId.get(selectedId) : undefined;
    const editingLN = editing ? layout.byId.get(editing.id) : undefined;
    const dragLN = drag ? layout.byId.get(drag.id) : undefined;
    const dropLN = drag?.target ? layout.byId.get(drag.target.id) : undefined;
    const barButton = (key: string, label: string, icon: React.ReactNode, onClick: () => void) => (
        <Tooltip key={key} title={label} disableInteractive>
            <IconButton size="small" aria-label={label} onMouseDown={(event) => event.preventDefault()} onClick={onClick} sx={{ width: 28, height: 28, color: "text.secondary", "&:hover": { color: "primary.main" } }}>
                {icon}
            </IconButton>
        </Tooltip>
    );

    return (
        <Box
            ref={boxRef}
            tabIndex={0}
            onKeyDown={onKeyDown}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onDoubleClick={(event) => {
                const nodeEl = (event.target as HTMLElement).closest("[data-mm-node]") as HTMLElement | null;
                if (nodeEl) startEdit(nodeEl.dataset.mmNode!);
            }}
            sx={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", bgcolor: "#f7f8fa", outline: "none", touchAction: "none", userSelect: "none", cursor: pointer.current?.kind === "pan" ? "grabbing" : "default" }}
        >
            <Box sx={{ position: "absolute", left: 0, top: 0, transform: `translate(${view.x}px, ${view.y}px) scale(${view.z})`, transformOrigin: "0 0" }}>
                <svg style={{ position: "absolute", left: 0, top: 0, width: 1, height: 1, overflow: "visible" }}>
                    {layout.edges.map((edge) => (
                        <path key={edge.to.id} d={edgePath(edge)} fill="none" stroke={edge.color} strokeWidth={edge.to.depth === 1 ? 2.5 : 1.75} strokeLinecap="round" />
                    ))}
                </svg>
                {layout.nodes.map((ln) => {
                    const look = nodeLook(ln);
                    const kids = ln.node.children?.length ?? 0;
                    const folded = ln.node.expanded === false && kids > 0;
                    const isSel = ln.id === selectedId;
                    return (
                        <Box
                            key={ln.id}
                            data-mm-node={ln.id}
                            sx={{
                                position: "absolute",
                                left: ln.x,
                                top: ln.y,
                                width: ln.w,
                                height: ln.h,
                                boxSizing: "border-box",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                borderRadius: `${look.radius}px`,
                                bgcolor: look.fill,
                                border: look.stroke !== "none" ? `${look.strokeWidth}px solid ${look.stroke}` : 0,
                                color: look.text,
                                fontFamily: DEFAULT_FONT_FAMILY,
                                fontSize: ln.fontSize,
                                fontWeight: ln.fontWeight,
                                textDecoration: ln.node.style?.textDecoration,
                                whiteSpace: "nowrap",
                                cursor: readOnly ? "default" : "pointer",
                                boxShadow: isSel ? "0 0 0 2px #fff, 0 0 0 4px #1a73e8" : ln.depth === 0 ? "0 2px 6px rgba(0,0,0,0.18)" : "none",
                                opacity: drag?.id === ln.id ? 0.35 : 1,
                                "&:hover .mm-fold": { opacity: 1 },
                            }}
                        >
                            {editing?.id === ln.id ? null : ln.node.topic || " "}
                            {kids > 0 && ln.depth > 0 ? (
                                <Box
                                    className="mm-fold"
                                    data-mm-fold={ln.id}
                                    title={folded ? strings.unfold : strings.fold}
                                    sx={{
                                        position: "absolute",
                                        top: "50%",
                                        [ln.side > 0 ? "left" : "right"]: "100%",
                                        transform: `translate(${ln.side > 0 ? 4 : -4}px, -50%)`,
                                        minWidth: 18,
                                        height: 18,
                                        px: folded ? 0.5 : 0,
                                        boxSizing: "border-box",
                                        borderRadius: 9,
                                        bgcolor: "#fff",
                                        border: `1.5px solid ${ln.color}`,
                                        color: ln.color,
                                        fontSize: 11,
                                        fontWeight: 600,
                                        lineHeight: "15px",
                                        textAlign: "center",
                                        cursor: "pointer",
                                        opacity: folded || isSel ? 1 : 0,
                                        textDecoration: "none",
                                    }}
                                >
                                    {folded ? kids : "−"}
                                </Box>
                            ) : null}
                        </Box>
                    );
                })}
                {/* Drop target — into (outline) or before / after (line). */}
                {dropLN && drag?.target ? (
                    drag.target.place === "child" ? (
                        <Box sx={{ position: "absolute", left: dropLN.x - 4, top: dropLN.y - 4, width: dropLN.w + 8, height: dropLN.h + 8, border: "2px dashed #1a73e8", borderRadius: 2, pointerEvents: "none" }} />
                    ) : (
                        <Box sx={{ position: "absolute", left: dropLN.x, top: drag.target.place === "before" ? dropLN.y - 6 : dropLN.y + dropLN.h + 4, width: dropLN.w, height: 3, borderRadius: 2, bgcolor: "#1a73e8", pointerEvents: "none" }} />
                    )
                ) : null}
                {editingLN && editing ? (
                    <input
                        data-mm-edit=""
                        autoFocus
                        value={editing.text}
                        spellCheck={false}
                        onFocus={(event) => event.currentTarget.select()}
                        onChange={(event) => setEditing({ id: editing.id, text: event.target.value })}
                        onBlur={commitEdit}
                        onKeyDown={(event) => {
                            event.stopPropagation();
                            if (event.nativeEvent.isComposing) return;
                            if (event.key === "Enter") {
                                event.preventDefault();
                                commitEdit();
                            } else if (event.key === "Escape") {
                                event.preventDefault();
                                setEditing(null);
                                boxRef.current?.focus({ preventScroll: true });
                            } else if (event.key === "Tab") {
                                event.preventDefault();
                                const id = editing.id;
                                const text = editing.text;
                                setEditing(null);
                                const named = setTopic(root, id, text);
                                apply(addChild(named?.root ?? root, id), undefined, true);
                            }
                        }}
                        style={{
                            position: "absolute",
                            left: editingLN.x,
                            top: editingLN.y,
                            width: Math.max(editingLN.w, Math.ceil(measureText(editing.text || " ", editingLN.fontSize, editingLN.fontWeight)) + 40),
                            height: editingLN.h,
                            boxSizing: "border-box",
                            padding: "0 12px",
                            border: "2px solid #1a73e8",
                            borderRadius: 8,
                            outline: "none",
                            textAlign: "center",
                            fontFamily: DEFAULT_FONT_FAMILY,
                            fontSize: editingLN.fontSize,
                            fontWeight: editingLN.fontWeight,
                            color: "#1f2328",
                            background: "#fff",
                            zIndex: 5,
                        }}
                    />
                ) : null}
            </Box>
            {/* Dragged branch follows the pointer. */}
            {drag && dragLN ? (
                <Box sx={{ position: "absolute", left: drag.px + 10, top: drag.py + 10, px: 1.5, py: 0.5, borderRadius: 2, bgcolor: "#fff", border: `1.5px solid ${dragLN.color}`, fontSize: 13, opacity: 0.9, pointerEvents: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
                    {dragLN.node.topic || " "}
                </Box>
            ) : null}
            {/* Buttons above the selected branch — growing the map without knowing the keys. */}
            {selected && !editing && !drag && !readOnly ? (
                <Box
                    data-mm-ui=""
                    sx={{
                        position: "absolute",
                        left: view.x + (selected.x + selected.w / 2) * view.z,
                        top: view.y + selected.y * view.z,
                        transform: "translate(-50%, calc(-100% - 8px))",
                        display: "flex",
                        gap: 0.25,
                        p: 0.25,
                        bgcolor: "#fff",
                        border: "1px solid #e0e0e0",
                        borderRadius: 1,
                        boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
                        zIndex: 6,
                    }}
                >
                    {barButton("child", strings.addChild, <SubdirectoryArrowRightIcon sx={{ fontSize: 18 }} />, () => apply(addChild(root, selected.id), undefined, true))}
                    {selected.depth > 0 ? barButton("sibling", strings.addSibling, <AddIcon sx={{ fontSize: 18 }} />, () => apply(addSibling(root, selected.id), undefined, true)) : null}
                    {barButton("edit", strings.edit, <EditOutlinedIcon sx={{ fontSize: 17 }} />, () => startEdit(selected.id))}
                    {selected.depth > 0 ? barButton("delete", strings.remove, <DeleteOutlineIcon sx={{ fontSize: 18 }} />, () => apply(removeNode(root, selected.id))) : null}
                </Box>
            ) : null}
            {hint ? (
                <Box sx={{ position: "absolute", left: 12, right: 12, bottom: 8, fontSize: 12, lineHeight: 1.5, color: "text.secondary", pointerEvents: "none" }}>
                    <Box component="span" sx={{ bgcolor: "rgba(247,248,250,0.85)" }}>
                        {strings.mapHint}
                    </Box>
                </Box>
            ) : null}
        </Box>
    );
});
