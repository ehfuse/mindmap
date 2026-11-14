/**
 * Formatting toolbar — font size · bold · underline · strike · text color · background · clear format, plus undo / redo.
 * Shared by the outline and the mind map; it edits the style of the selected node.
 * Looks like the @ehfuse/editor toolbar on purpose: same icons (@ehfuse/toolbar-icons), same 32px buttons,
 * same black tooltip and the same color picker (@ehfuse/mui-color-picker).
 * `start` / `end` / `children` let the host add its own controls (view switch, map tools, …).
 */
import { useState, type MouseEvent, type ReactNode } from "react";
import { Box, ButtonBase, Menu, MenuItem, Tooltip } from "@mui/material";
import { ColorPicker } from "@ehfuse/mui-color-picker";
import { BoldIcon, FontColorIcon, FontFillIcon, RedoIcon, RemoveFormatIcon, StrikeIcon, UnderlineIcon, UndoIcon } from "@ehfuse/toolbar-icons";
import { hasDecoration, toggleDecoration, type TreeNodeStyle } from "./tree";
import type { OutlinerStrings } from "./i18n";

export const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32];

export interface FormatToolbarProps {
    strings: OutlinerStrings;
    /** Style of the node being edited (undefined → nothing selected; format buttons are disabled). */
    style: TreeNodeStyle | undefined;
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

/** Same button as the editor toolbar — 32px, 4px radius, light grey when on. */
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
                    // Same CSS variables as @ehfuse/editor — a host can shrink both toolbars at once.
                    width: "var(--editor-toolbar-button-size, 32px)",
                    height: "var(--editor-toolbar-button-size, 32px)",
                    p: 0,
                    border: "none",
                    borderRadius: "4px",
                    bgcolor: active ? "rgba(0, 0, 0, 0.08)" : "transparent",
                    color: disabled ? "rgba(0, 0, 0, 0.26)" : "inherit",
                    cursor: disabled ? "not-allowed" : "pointer",
                    transition: "background-color 150ms cubic-bezier(0.4, 0, 0.2, 1)",
                    "&:hover:not(:disabled)": { bgcolor: active ? "rgba(0, 0, 0, 0.08)" : "rgba(0, 0, 0, 0.04)" },
                    "&:focus": { outline: "none" },
                    "& svg": { width: "var(--editor-toolbar-icon-size, 20px)", height: "var(--editor-toolbar-icon-size, 20px)" },
                }}
            >
                {children}
            </Box>
        </ToolTip>
    );
}

export const ToolDivider = () => <Box sx={{ width: "1px", alignSelf: "stretch", my: "8px", mx: "4px", bgcolor: "#e0e0e0" }} />;

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

export function FormatToolbar({ strings, style, onStyle, canUndo, canRedo, onUndo, onRedo, start, children, end, readOnly }: FormatToolbarProps) {
    const [sizeAnchor, setSizeAnchor] = useState<HTMLElement | null>(null);
    const disabled = Boolean(readOnly) || !style;
    const size = style?.fontSize ? parseFloat(style.fontSize) : null;
    const bold = style?.fontWeight === "bold" || Number(style?.fontWeight) >= 600;
    const hasStyle = Boolean(style && Object.keys(style).length > 0);
    return (
        <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "var(--editor-toolbar-button-gap, 2px)", minHeight: 44, px: 1, py: "4px", borderBottom: "1px solid #e0e0e0", bgcolor: "#fff", color: "#333", flexShrink: 0 }}>
            {start}
            {start ? <ToolDivider /> : null}
            {onUndo ? (
                <>
                    <ToolButton label={strings.undo} disabled={readOnly || !canUndo} onClick={onUndo}>
                        <UndoIcon />
                    </ToolButton>
                    <ToolButton label={strings.redo} disabled={readOnly || !canRedo} onClick={() => onRedo?.()}>
                        <RedoIcon />
                    </ToolButton>
                    <ToolDivider />
                </>
            ) : null}
            <ToolTip title={strings.fontSize}>
                <ButtonBase
                    disabled={disabled}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={(event) => setSizeAnchor(event.currentTarget)}
                    sx={{ height: "var(--editor-toolbar-button-size, 32px)", minWidth: 64, px: 1, gap: 0.5, justifyContent: "space-between", border: "1px solid #d0d0d0", borderRadius: "4px", fontSize: 14, color: disabled ? "rgba(0,0,0,0.26)" : "#333", bgcolor: "#fff", "&:hover": { borderColor: "#999" } }}
                >
                    {size ?? strings.sizeDefault}
                    <Box component="span" sx={{ fontSize: 10, color: "#888" }}>
                        ▼
                    </Box>
                </ButtonBase>
            </ToolTip>
            <Menu open={Boolean(sizeAnchor)} anchorEl={sizeAnchor} onClose={() => setSizeAnchor(null)} transitionDuration={0} disableRestoreFocus slotProps={{ paper: { sx: { maxHeight: 320 } } }}>
                <MenuItem
                    dense
                    selected={size === null}
                    onClick={() => {
                        onStyle({ fontSize: undefined });
                        setSizeAnchor(null);
                    }}
                >
                    {strings.sizeDefault}
                </MenuItem>
                {FONT_SIZES.map((value) => (
                    <MenuItem
                        key={value}
                        dense
                        selected={size === value}
                        onClick={() => {
                            onStyle({ fontSize: `${value}px` });
                            setSizeAnchor(null);
                        }}
                    >
                        {value}
                    </MenuItem>
                ))}
            </Menu>
            <ToolButton label={strings.bold} active={bold} disabled={disabled} onClick={() => onStyle({ fontWeight: bold ? undefined : "bold" })}>
                <BoldIcon />
            </ToolButton>
            <ToolButton label={strings.underline} active={hasDecoration(style, "underline")} disabled={disabled} onClick={() => onStyle({ textDecoration: toggleDecoration(style, "underline") })}>
                <UnderlineIcon />
            </ToolButton>
            <ToolButton label={strings.strike} active={hasDecoration(style, "line-through")} disabled={disabled} onClick={() => onStyle({ textDecoration: toggleDecoration(style, "line-through") })}>
                <StrikeIcon />
            </ToolButton>
            <ColorButton label={strings.textColor} type="color" value={style?.color} disabled={disabled} onPick={(color) => onStyle({ color })} />
            <ColorButton label={strings.background} type="background" value={style?.background} disabled={disabled} onPick={(color) => onStyle({ background: color.toLowerCase() === "#ffffff" ? undefined : color })} />
            <ToolButton
                label={strings.clearFormat}
                disabled={disabled || !hasStyle}
                onClick={() => onStyle({ fontSize: undefined, color: undefined, background: undefined, fontWeight: undefined, textDecoration: undefined })}
            >
                <RemoveFormatIcon />
            </ToolButton>
            {children ? <ToolDivider /> : null}
            {children}
            <Box sx={{ flex: 1 }} />
            {end}
        </Box>
    );
}
