/**
 * Formatting toolbar — font size · bold · underline · strike · text color · background · clear format, plus undo / redo.
 * Shared by the outline and the mind map; it edits the style of the selected node.
 * Looks like the @ehfuse/editor toolbar on purpose: same icons (@ehfuse/toolbar-icons), same 32px buttons,
 * same black tooltip and the same color picker (@ehfuse/mui-color-picker).
 * `start` / `end` / `children` let the host add its own controls (view switch, map tools, …).
 */
import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { Box, InputBase, Tooltip } from "@mui/material";
import { ColorPicker } from "@ehfuse/mui-color-picker";
import { BoldIcon, FontColorIcon, FontFillIcon, RedoIcon, RemoveFormatIcon, StrikeIcon, UnderlineIcon, UndoIcon } from "@ehfuse/toolbar-icons";
import { hasDecoration, toggleDecoration, type TreeNodeStyle } from "./tree";
import type { OutlinerStrings } from "./i18n";

/** Same list as the editor's size box. */
export const FONT_SIZES = [8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 24, 28, 30, 36, 40, 44, 48];

const SIZE_MIN = 1;
const SIZE_MAX = 200;

const Arrow = ({ up, size }: { up?: boolean; size: number }) => (
    <svg width={size} height={size} viewBox="0 0 10 10" aria-hidden="true" style={{ display: "block" }}>
        <path d={up ? "M1 7 L5 3 L9 7 Z" : "M1 3 L5 7 L9 3 Z"} fill="currentColor" />
    </svg>
);

/**
 * Font size box — the editor's size box in stepper form (as Changupboguk's article editor uses it):
 * the number of the selected node's real size, type a number + Enter, ↑ / ↓ keys or the ▲ ▼ buttons step by 1. No unit, no list.
 * 32px tall like the editor's box (it stays that height even when toolbar buttons are smaller).
 */
function SizeBox({ label, value, disabled, onApply }: { label: string; value: number | undefined; disabled: boolean; onApply: (px: number) => void }) {
    const [text, setText] = useState("");
    useEffect(() => setText(value === undefined ? "" : String(Math.round(value * 10) / 10)), [value]);
    const apply = (next: number) => {
        if (!Number.isFinite(next)) return;
        const px = Math.min(SIZE_MAX, Math.max(SIZE_MIN, Math.round(next * 10) / 10));
        setText(String(px));
        onApply(px);
    };
    const step = (delta: 1 | -1) => apply((parseFloat(text) || value || 14) + delta);
    const stepSx = {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flex: 1,
        width: 18,
        p: 0,
        border: "none",
        bgcolor: "transparent",
        color: "rgba(0, 0, 0, 0.6)",
        cursor: disabled ? "default" : "pointer",
        "&:hover:not(:disabled)": { bgcolor: "rgba(0, 0, 0, 0.06)", color: "rgba(0, 0, 0, 0.87)" },
    } as const;
    return (
        <ToolTip title={label}>
            <Box
                className="ehfuse-size-selector"
                sx={{
                    display: "inline-flex",
                    alignItems: "stretch",
                    height: 32,
                    border: "1px solid rgba(0, 0, 0, 0.23)",
                    borderRadius: "4px",
                    bgcolor: "#fff",
                    boxSizing: "border-box",
                    opacity: disabled ? 0.5 : 1,
                    "&:hover": { borderColor: disabled ? "rgba(0, 0, 0, 0.23)" : "rgba(0, 0, 0, 0.87)" },
                    "&:focus-within": { borderColor: "#1976d2" },
                }}
            >
                <InputBase
                    value={text}
                    disabled={disabled}
                    onFocus={(event) => event.target.select()}
                    onChange={(event) => setText(event.target.value.replace(/[^\d.]/g, ""))}
                    onKeyDown={(event) => {
                        if (event.key === "Enter") {
                            event.preventDefault();
                            apply(parseFloat(text));
                        } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
                            event.preventDefault();
                            step(event.key === "ArrowUp" ? 1 : -1);
                        } else if (event.key === "Escape") {
                            event.preventDefault();
                            setText(value === undefined ? "" : String(value));
                        }
                    }}
                    onBlur={() => setText(value === undefined ? "" : String(Math.round(value * 10) / 10))}
                    inputProps={{ inputMode: "decimal", "aria-label": label }}
                    sx={{ width: 48, fontSize: "14px", "& input": { padding: "0 8px", textAlign: "right" } }}
                />
                <Box sx={{ display: "flex", flexDirection: "column", borderLeft: "1px solid rgba(0, 0, 0, 0.12)" }}>
                    <Box component="button" type="button" aria-label={`${label} +`} disabled={disabled} onMouseDown={(event: MouseEvent) => event.preventDefault()} onClick={() => step(1)} sx={stepSx}>
                        <Arrow up size={8} />
                    </Box>
                    <Box component="button" type="button" aria-label={`${label} −`} disabled={disabled} onMouseDown={(event: MouseEvent) => event.preventDefault()} onClick={() => step(-1)} sx={stepSx}>
                        <Arrow size={8} />
                    </Box>
                </Box>
            </Box>
        </ToolTip>
    );
}

export interface FormatToolbarProps {
    strings: OutlinerStrings;
    /** Style of the node being edited (undefined → nothing selected; format buttons are disabled). */
    style: TreeNodeStyle | undefined;
    /** Size the selected node shows when it has no own `fontSize` (px) — the size box shows it instead of a "default" label. */
    fontSize?: number;
    onStyle: (patch: Partial<TreeNodeStyle>) => void;
    canUndo?: boolean;
    canRedo?: boolean;
    onUndo?: () => void;
    onRedo?: () => void;
    start?: ReactNode;
    children?: ReactNode;
    end?: ReactNode;
    readOnly?: boolean;
}

/** Same tooltip as the editor toolbar — black, 14px, arrow, below. */
export function ToolTip({ title, children }: { title: string; children: ReactNode }) {
    return (
        <Tooltip
            title={title}
            placement="bottom"
            arrow
            disableInteractive
            leaveDelay={0}
            slotProps={{ tooltip: { sx: { bgcolor: "#000000", color: "#ffffff", fontSize: "14px", fontWeight: "normal", "& .MuiTooltip-arrow": { color: "#000000" } } } }}
        >
            {/* inline-flex — a plain span adds line descent under the button and lifts it 2px off center. */}
            <span style={{ display: "inline-flex" }}>{children}</span>
        </Tooltip>
    );
}

/** Same button as the editor toolbar — 28px (icon 18px) by default, 4px radius, light grey when on. */
export function ToolButton({ label, active = false, disabled = false, onClick, children }: { label: string; active?: boolean; disabled?: boolean; onClick: (event: MouseEvent<HTMLElement>) => void; children: ReactNode }) {
    return (
        <ToolTip title={label}>
            <Box
                component="button"
                type="button"
                aria-label={label}
                aria-pressed={active}
                disabled={disabled}
                onMouseDown={(event: MouseEvent) => event.preventDefault()}
                onClick={(event: MouseEvent<HTMLElement>) => {
                    event.preventDefault();
                    if (!disabled) onClick(event);
                }}
                sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    // Same CSS variables and colors as @ehfuse/editor — a host can shrink both toolbars at once.
                    width: "var(--editor-toolbar-button-size, 28px)",
                    height: "var(--editor-toolbar-button-size, 28px)",
                    minWidth: "var(--editor-toolbar-button-size, 28px)",
                    p: 0,
                    border: "none",
                    borderRadius: "4px",
                    bgcolor: active ? "var(--editor-active-bg-color, #e3f2fd)" : "transparent",
                    color: disabled ? "rgba(0, 0, 0, 0.26)" : active ? "var(--editor-selected-icon-color, #0066cc)" : "var(--editor-icon-color, #444)",
                    cursor: disabled ? "not-allowed" : "pointer",
                    transition: "background-color 150ms cubic-bezier(0.4, 0, 0.2, 1)",
                    "&:hover:not(:disabled)": { bgcolor: "var(--editor-border-color, #e0e0e0)", color: "var(--editor-selected-icon-color, #0066cc)" },
                    "&:focus": { outline: "none" },
                    "& svg": { width: "var(--editor-toolbar-icon-size, 18px)", height: "var(--editor-toolbar-icon-size, 18px)" },
                }}
            >
                {children}
            </Box>
        </ToolTip>
    );
}

/** Group divider — same as the editor (1px × 24px, #e0e0e0). */
export const ToolDivider = () => <Box sx={{ flex: "none", width: "1px", height: "24px", mx: "1px", alignSelf: "center", bgcolor: "var(--editor-border-color, #e0e0e0)" }} />;

/** A group of buttons — the editor's `ehfuse-toolbar-group` (1px between buttons). */
export function ToolGroup({ children }: { children: ReactNode }) {
    return <Box sx={{ display: "flex", alignItems: "center", gap: "var(--editor-toolbar-button-gap, 1px)" }}>{children}</Box>;
}

function ColorButton({ label, type, value, disabled, onPick }: { label: string; type: "color" | "background"; value?: string; disabled: boolean; onPick: (color: string) => void }) {
    const [anchor, setAnchor] = useState<HTMLElement | null>(null);
    const shown = value ?? (type === "color" ? "#000000" : "#FFFFFF");
    return (
        <>
            <ToolButton label={label} disabled={disabled} onClick={(event) => setAnchor(event.currentTarget)}>
                {type === "color" ? <FontColorIcon width="20px" height="20px" barColor={shown} /> : <FontFillIcon width="20px" fillColor={shown} />}
            </ToolButton>
            {anchor ? (
                <ColorPicker
                    value={shown}
                    onChange={(hex: string) => {
                        onPick(hex);
                        setAnchor(null);
                    }}
                    anchor={anchor}
                    anchorMode="auto"
                    onClose={() => setAnchor(null)}
                    position="bottomCenter"
                    advanced={{ position: "bottom" }}
                    shape="square"
                    colorSize={16}
                    gap={4}
                    padding={5}
                    popover={{ disableEnforceFocus: true, disableAutoFocus: true, disableRestoreFocus: true, sx: { zIndex: 10001 } }}
                />
            ) : null}
        </>
    );
}

export function FormatToolbar({ strings, style, fontSize, onStyle, canUndo, canRedo, onUndo, onRedo, start, children, end, readOnly }: FormatToolbarProps) {
    const disabled = Boolean(readOnly) || !style;
    // Like the editor: show the size the text really has — its own size, otherwise the host's default for that node.
    const shownSize = style ? (style.fontSize ? parseFloat(style.fontSize) : fontSize) : undefined;
    const bold = style?.fontWeight === "bold" || Number(style?.fontWeight) >= 600;
    const hasStyle = Boolean(style && Object.keys(style).length > 0);
    return (
        // Same strip as the editor toolbar: light grey background, 6px padding, groups 4px apart with a divider between.
        <Box
            sx={{
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "var(--editor-toolbar-group-gap, 4px)",
                p: "var(--editor-toolbar-padding, 6px)",
                borderBottom: "1px solid var(--editor-border-color, #e0e0e0)",
                bgcolor: "var(--editor-toolbar-bg-color, #f8f9fa)",
                color: "#333",
                flexShrink: 0,
            }}
        >
            {/* View switch — a little more room before the size box (no divider there). */}
            {start ? <Box sx={{ display: "flex", alignItems: "center", mr: "8px" }}>{start}</Box> : null}
            {/* The size box has its own border — no dividers on either side (2026-11-14). */}
            <ToolGroup>
                <SizeBox label={strings.fontSize} value={shownSize} disabled={disabled} onApply={(px) => onStyle({ fontSize: px === fontSize ? undefined : `${px}px` })} />
            </ToolGroup>
            <ToolGroup>
                <ToolButton label={strings.bold} active={bold} disabled={disabled} onClick={() => onStyle({ fontWeight: bold ? undefined : "bold" })}>
                    <BoldIcon />
                </ToolButton>
                <ToolButton label={strings.underline} active={hasDecoration(style, "underline")} disabled={disabled} onClick={() => onStyle({ textDecoration: toggleDecoration(style, "underline") })}>
                    <UnderlineIcon />
                </ToolButton>
                <ToolButton label={strings.strike} active={hasDecoration(style, "line-through")} disabled={disabled} onClick={() => onStyle({ textDecoration: toggleDecoration(style, "line-through") })}>
                    <StrikeIcon />
                </ToolButton>
            </ToolGroup>
            <ToolDivider />
            <ToolGroup>
                <ColorButton label={strings.textColor} type="color" value={style?.color} disabled={disabled} onPick={(color) => onStyle({ color })} />
                <ColorButton label={strings.background} type="background" value={style?.background} disabled={disabled} onPick={(color) => onStyle({ background: color.toLowerCase() === "#ffffff" ? undefined : color })} />
            </ToolGroup>
            <ToolDivider />
            <ToolGroup>
                <ToolButton
                    label={strings.clearFormat}
                    disabled={disabled || !hasStyle}
                    onClick={() => onStyle({ fontSize: undefined, color: undefined, background: undefined, fontWeight: undefined, textDecoration: undefined })}
                >
                    <RemoveFormatIcon />
                </ToolButton>
            </ToolGroup>
            {children ? (
                <>
                    <ToolDivider />
                    {children}
                </>
            ) : null}
            {/* Undo / redo at the very end (2026-11-14). */}
            {onUndo ? (
                <>
                    <ToolDivider />
                    <ToolGroup>
                        <ToolButton label={strings.undo} disabled={readOnly || !canUndo} onClick={onUndo}>
                            <UndoIcon />
                        </ToolButton>
                        <ToolButton label={strings.redo} disabled={readOnly || !canRedo} onClick={() => onRedo?.()}>
                            <RedoIcon />
                        </ToolButton>
                    </ToolGroup>
                </>
            ) : null}
            <Box sx={{ flex: 1 }} />
            {end}
        </Box>
    );
}
