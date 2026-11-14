/**
 * Outliner — toolbar + rows, with its own undo history. Controlled: pass `value` and `onChange`.
 * For a custom layout use `OutlineList` + `FormatToolbar` + `useTreeHistory` directly (the mind map does).
 */
import { useState, type ReactNode } from "react";
import { Box } from "@mui/material";
import { FormatToolbar } from "./FormatToolbar";
import { OutlineList } from "./OutlineList";
import { useTreeHistory } from "./history";
import { outlinerStrings, type OutlinerStrings } from "./i18n";
import { locateNode, nodeDepth, setNodeStyle, type TreeNode } from "./tree";
import { outlineTextStyle } from "./OutlineList";

export interface OutlinerProps {
    value: TreeNode;
    onChange: (value: TreeNode) => void;
    locale?: string;
    strings?: Partial<OutlinerStrings>;
    readOnly?: boolean;
    /** Show the formatting toolbar (default true). */
    toolbar?: boolean;
    toolbarStart?: ReactNode;
    toolbarEnd?: ReactNode;
    height?: number | string;
}

export function Outliner({ value, onChange, locale, strings: overrides, readOnly, toolbar = true, toolbarStart, toolbarEnd, height = "100%" }: OutlinerProps) {
    const strings = outlinerStrings(locale, overrides);
    const history = useTreeHistory();
    const [selected, setSelected] = useState<string | null>(null);
    const commit = (next: TreeNode, mergeKey?: string) => {
        history.record(value, mergeKey);
        onChange(next);
    };
    const undo = () => {
        const prev = history.undo(value);
        if (prev) onChange(prev);
    };
    const redo = () => {
        const next = history.redo(value);
        if (next) onChange(next);
    };
    const selectedNode = selected ? locateNode(value, selected)?.node : undefined;
    return (
        <Box sx={{ display: "flex", flexDirection: "column", height, minHeight: 0, bgcolor: "#fff" }}>
            {toolbar ? (
                <FormatToolbar
                    strings={strings}
                    style={selectedNode ? (selectedNode.style ?? {}) : undefined}
                    fontSize={selected ? Number(outlineTextStyle(undefined, nodeDepth(value, selected)).fontSize) : undefined}
                    onStyle={(patch) => {
                        if (!selected) return;
                        const result = setNodeStyle(value, [selected], patch);
                        if (result) commit(result.root);
                    }}
                    canUndo={history.canUndo}
                    canRedo={history.canRedo}
                    onUndo={undo}
                    onRedo={redo}
                    start={toolbarStart}
                    end={toolbarEnd}
                    readOnly={readOnly}
                />
            ) : null}
            <Box sx={{ flex: 1, minHeight: 0 }}>
                <OutlineList root={value} onEdit={commit} selectedId={selected} onSelect={setSelected} strings={strings} readOnly={readOnly} onUndo={undo} onRedo={redo} />
            </Box>
        </Box>
    );
}
