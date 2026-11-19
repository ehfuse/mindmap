/**
 * MindMap — one tree shown as a map or as a list (outline), with one formatting toolbar for both.
 * Controlled: pass `value` and `onChange`. Undo history lives inside (map and list share it).
 */
import { forwardRef, useImperativeHandle, useRef, useState, type ReactNode } from "react";
import { Box, ButtonBase } from "@mui/material";
import { BranchBothIcon, BranchLeftIcon, BranchRightIcon, FitCenterIcon, IndentIcon, OutdentIcon, ZoomInIcon, ZoomOutIcon } from "@ehfuse/toolbar-icons";
import { FormatToolbar, OutlineList, ToolButton, ToolDivider, ToolGroup, indentNode, locateNode, nodeDepth, outdentNode, outlineTextStyle, setNodeStyle, useTreeHistory, type TreeNode } from "@ehfuse/outliner";
import { MapView, type MapViewHandle } from "./MapView";
import { mindMapStrings, type MindMapStrings } from "./i18n";
import { nodeFont, type MapDirection } from "./layout";
import type { MindMapData, MindMapView } from "./types";
import { exportMindMapSvg } from "./exportSvg";

export interface MindMapProps {
    value: MindMapData;
    onChange: (value: MindMapData) => void;
    locale?: string;
    strings?: Partial<MindMapStrings>;
    readOnly?: boolean;
    /** Controlled view; or use `defaultView`. */
    view?: MindMapView;
    defaultView?: MindMapView;
    onViewChange?: (view: MindMapView) => void;
    /** Extra controls at the right end of the toolbar. */
    toolbarEnd?: ReactNode;
    /** Show the one-line help at the bottom (default true). */
    hint?: boolean;
    height?: number | string;
}

export interface MindMapHandle {
    exportSvg: () => string;
    center: () => void;
}

const DIRECTIONS: Array<{ value: MapDirection; key: "dirSide" | "dirRight" | "dirLeft"; icon: ReactNode }> = [
    { value: 2, key: "dirSide", icon: <BranchBothIcon /> },
    { value: 1, key: "dirRight", icon: <BranchRightIcon /> },
    { value: 0, key: "dirLeft", icon: <BranchLeftIcon /> },
];

export const MindMap = forwardRef<MindMapHandle, MindMapProps>(function MindMap(
    { value, onChange, locale, strings: overrides, readOnly, view: viewProp, defaultView = "map", onViewChange, toolbarEnd, hint = true, height = "100%" },
    ref
) {
    const strings = mindMapStrings(locale, overrides);
    const [ownView, setOwnView] = useState<MindMapView>(defaultView);
    const view = viewProp ?? ownView;
    const setView = (next: MindMapView) => {
        setOwnView(next);
        onViewChange?.(next);
        if (next === "map") requestAnimationFrame(() => mapRef.current?.center());
    };
    const [selected, setSelected] = useState<string | null>(null);
    const [focusRequest, setFocusRequest] = useState<{ id: string } | null>(null);
    /** Indent / outdent the selected row from the toolbar and keep typing in it. */
    const shiftLevel = (run: typeof indentNode) => {
        const result = selected ? run(root, selected) : null;
        if (!result || !selected) return;
        commit(result.root);
        setFocusRequest({ id: selected });
    };
    const history = useTreeHistory();
    const mapRef = useRef<MapViewHandle | null>(null);
    const root = value.nodeData;
    const direction = (value.direction ?? 2) as MapDirection;

    const commit = (next: TreeNode, mergeKey?: string) => {
        history.record(root, mergeKey);
        onChange({ ...value, nodeData: next });
    };
    const undo = () => {
        const prev = history.undo(root);
        if (prev) onChange({ ...value, nodeData: prev });
    };
    const redo = () => {
        const next = history.redo(root);
        if (next) onChange({ ...value, nodeData: next });
    };
    useImperativeHandle(ref, () => ({ exportSvg: () => exportMindMapSvg(value), center: () => mapRef.current?.center() }), [value]);

    const selectedNode = selected ? locateNode(root, selected)?.node : undefined;
    const viewSwitch = (
        <Box sx={{ display: "flex", p: 0.25, borderRadius: 1, bgcolor: "#f1f3f4" }}>
            {(["map", "outline"] as const).map((item) => (
                <ButtonBase
                    key={item}
                    aria-pressed={view === item}
                    onClick={() => setView(item)}
                    sx={{
                        height: 26,
                        px: 1.25,
                        borderRadius: 0.75,
                        fontSize: 13,
                        fontWeight: view === item ? 600 : 400,
                        color: view === item ? "primary.main" : "text.secondary",
                        bgcolor: view === item ? "#fff" : "transparent",
                        boxShadow: view === item ? "0 1px 2px rgba(0,0,0,0.15)" : "none",
                    }}
                >
                    {item === "map" ? strings.map : strings.outline}
                </ButtonBase>
            ))}
        </Box>
    );

    return (
        <Box sx={{ display: "flex", flexDirection: "column", height, minHeight: 0, bgcolor: "#fff" }}>
            <FormatToolbar
                strings={strings}
                style={selectedNode ? (selectedNode.style ?? {}) : undefined}
                // Size box shows the size the branch really has in this view (map: 22 / 16 / 14 by depth, list: 15).
                fontSize={selectedNode ? (view === "map" ? nodeFont({ ...selectedNode, style: undefined }, nodeDepth(root, selectedNode.id)).fontSize : Number(outlineTextStyle(undefined, nodeDepth(root, selectedNode.id)).fontSize)) : undefined}
                onStyle={(patch) => {
                    if (!selected) return;
                    const result = setNodeStyle(root, [selected], patch);
                    if (result) commit(result.root);
                }}
                canUndo={history.canUndo}
                canRedo={history.canRedo}
                onUndo={undo}
                onRedo={redo}
                start={viewSwitch}
                end={toolbarEnd}
                readOnly={readOnly}
            >
                {view === "map" ? (
                    <>
                        <ToolGroup>
                            {DIRECTIONS.map((item) => (
                                <ToolButton key={item.value} label={strings[item.key]} active={direction === item.value} disabled={readOnly} onClick={() => onChange({ ...value, direction: item.value })}>
                                    {item.icon}
                                </ToolButton>
                            ))}
                        </ToolGroup>
                        <ToolDivider />
                        <ToolGroup>
                            <ToolButton label={strings.zoomOut} onClick={() => mapRef.current?.zoomBy(1 / 1.2)}>
                                <ZoomOutIcon />
                            </ToolButton>
                            <ToolButton label={strings.zoomIn} onClick={() => mapRef.current?.zoomBy(1.2)}>
                                <ZoomInIcon />
                            </ToolButton>
                            <ToolButton label={strings.center} onClick={() => mapRef.current?.center()}>
                                <FitCenterIcon />
                            </ToolButton>
                        </ToolGroup>
                    </>
                ) : (
                    // List view: indent / outdent buttons (0.2.10) — phones have no Tab key, so without these a step-style list could not be made on a phone.
                    <>
                        <ToolDivider />
                        <ToolGroup>
                            <ToolButton
                                label={strings.outdent}
                                disabled={readOnly || !selected}
                                onClick={() => shiftLevel(outdentNode)}
                            >
                                <OutdentIcon />
                            </ToolButton>
                            <ToolButton
                                label={strings.indent}
                                disabled={readOnly || !selected}
                                onClick={() => shiftLevel(indentNode)}
                            >
                                <IndentIcon />
                            </ToolButton>
                        </ToolGroup>
                    </>
                )}
            </FormatToolbar>
            <Box sx={{ position: "relative", flex: 1, minHeight: 0 }}>
                {view === "map" ? (
                    <MapView ref={mapRef} root={root} direction={direction} onEdit={commit} selectedId={selected} onSelect={setSelected} strings={strings} readOnly={readOnly} onUndo={undo} onRedo={redo} hint={hint} />
                ) : (
                    <>
                        <OutlineList root={root} onEdit={commit} selectedId={selected} onSelect={setSelected} strings={strings} readOnly={readOnly} onUndo={undo} onRedo={redo} focusRequest={focusRequest} />
                        {hint ? (
                            <Box sx={{ position: "absolute", left: 12, right: 12, bottom: 8, fontSize: 12, lineHeight: 1.5, color: "text.secondary", pointerEvents: "none" }}>
                                <Box component="span" sx={{ bgcolor: "rgba(255,255,255,0.9)" }}>
                                    {strings.hint}
                                </Box>
                            </Box>
                        ) : null}
                    </>
                )}
            </Box>
        </Box>
    );
});
