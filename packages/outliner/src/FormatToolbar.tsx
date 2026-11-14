/**
 * Formatting toolbar — font size · bold · underline · strike · text color · background, plus undo / redo.
 * Shared by the outline and the mind map; it edits the style of the selected node(s).
 * `start` / `end` / `children` let the host add its own controls (view switch, map tools, …).
 */
import { useState, type ReactNode } from "react";
import { Box, ButtonBase, Divider, IconButton, Menu, MenuItem, Popover, Tooltip } from "@mui/material";
import FormatBoldIcon from "@mui/icons-material/FormatBold";
import FormatUnderlinedIcon from "@mui/icons-material/FormatUnderlined";
import StrikethroughSIcon from "@mui/icons-material/StrikethroughS";
import FormatColorTextIcon from "@mui/icons-material/FormatColorText";
import FormatColorFillIcon from "@mui/icons-material/FormatColorFill";
import UndoIcon from "@mui/icons-material/Undo";
import RedoIcon from "@mui/icons-material/Redo";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import FormatColorResetIcon from "@mui/icons-material/FormatColorReset";
import { hasDecoration, toggleDecoration, type TreeNodeStyle } from "./tree";
import type { OutlinerStrings } from "./i18n";

export const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28];
export const TEXT_COLORS = ["#1f2328", "#5f6368", "#d93025", "#e8710a", "#f9ab00", "#188038", "#1a73e8", "#9334e6", "#c2185b", "#ffffff"];
export const BACKGROUND_COLORS = ["#fde2e1", "#feefc3", "#fff8c5", "#ceead6", "#d2e3fc", "#e9d7fe", "#fad2e1", "#e8eaed", "#3c4043", "#1a73e8"];

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

const btnSx = (active = false) => ({
    width: 30,
    height: 30,
    borderRadius: 1,
    color: active ? "primary.main" : "text.secondary",
    bgcolor: active ? "rgba(25,118,210,0.10)" : "transparent",
    "&:hover": { bgcolor: active ? "rgba(25,118,210,0.16)" : "rgba(0,0,0,0.06)" },
});

export function ToolButton({ label, active, disabled, onClick, children }: { label: string; active?: boolean; disabled?: boolean; onClick: () => void; children: ReactNode }) {
    return (
        <Tooltip title={label} disableInteractive>
            <span>
                <IconButton size="small" aria-label={label} aria-pressed={active} disabled={disabled} onMouseDown={(event) => event.preventDefault()} onClick={onClick} sx={btnSx(active)}>
                    {children}
                </IconButton>
            </span>
        </Tooltip>
    );
}

export const ToolDivider = () => <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 0.75 }} />;

function ColorButton({ label, icon, value, colors, noneLabel, disabled, onPick }: { label: string; icon: ReactNode; value?: string; colors: string[]; noneLabel: string; disabled: boolean; onPick: (color: string | undefined) => void }) {
    const [anchor, setAnchor] = useState<HTMLElement | null>(null);
    return (
        <>
            <Tooltip title={label} disableInteractive>
                <span>
                    <IconButton size="small" aria-label={label} disabled={disabled} onMouseDown={(event) => event.preventDefault()} onClick={(event) => setAnchor(event.currentTarget)} sx={{ ...btnSx(false), flexDirection: "column", gap: 0 }}>
                        {icon}
                        <Box sx={{ width: 16, height: 3, mt: "-3px", borderRadius: 0.5, bgcolor: value ?? "transparent", border: value ? 0 : "1px solid #c4c7cc" }} />
                    </IconButton>
                </span>
            </Tooltip>
            <Popover open={Boolean(anchor)} anchorEl={anchor} onClose={() => setAnchor(null)} transitionDuration={0} anchorOrigin={{ vertical: "bottom", horizontal: "left" }} disableRestoreFocus>
                <Box sx={{ p: 1, display: "grid", gridTemplateColumns: "repeat(5, 24px)", gap: 0.75 }}>
                    {colors.map((color) => (
                        <ButtonBase
                            key={color}
                            aria-label={color}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => {
                                onPick(color);
                                setAnchor(null);
                            }}
                            sx={{ width: 24, height: 24, borderRadius: 0.75, bgcolor: color, border: "1px solid rgba(0,0,0,0.12)", outline: value?.toLowerCase() === color ? "2px solid #1a73e8" : "none", outlineOffset: 1 }}
                        />
                    ))}
                    <ButtonBase
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                            onPick(undefined);
                            setAnchor(null);
                        }}
                        sx={{ gridColumn: "1 / -1", height: 26, borderRadius: 0.75, fontSize: 13, color: "text.secondary", gap: 0.5, "&:hover": { bgcolor: "rgba(0,0,0,0.05)" } }}
                    >
                        <FormatColorResetIcon sx={{ fontSize: 16 }} />
                        {noneLabel}
                    </ButtonBase>
                </Box>
            </Popover>
        </>
    );
}

export function FormatToolbar({ strings, style, onStyle, canUndo, canRedo, onUndo, onRedo, start, children, end, readOnly }: FormatToolbarProps) {
    const [sizeAnchor, setSizeAnchor] = useState<HTMLElement | null>(null);
    const disabled = readOnly || !style;
    const size = style?.fontSize ? parseFloat(style.fontSize) : null;
    const bold = style?.fontWeight === "bold" || Number(style?.fontWeight) >= 600;
    return (
        <Box
            sx={{
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 0.25,
                minHeight: 40,
                px: 1,
                borderBottom: "1px solid #e0e0e0",
                bgcolor: "#fff",
                flexShrink: 0,
            }}
        >
            {start}
            {start ? <ToolDivider /> : null}
            {onUndo ? (
                <>
                    <ToolButton label={strings.undo} disabled={readOnly || !canUndo} onClick={onUndo}>
                        <UndoIcon sx={{ fontSize: 18 }} />
                    </ToolButton>
                    <ToolButton label={strings.redo} disabled={readOnly || !canRedo} onClick={() => onRedo?.()}>
                        <RedoIcon sx={{ fontSize: 18 }} />
                    </ToolButton>
                    <ToolDivider />
                </>
            ) : null}
            <Tooltip title={strings.fontSize} disableInteractive>
                <span>
                    <ButtonBase
                        disabled={disabled}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={(event) => setSizeAnchor(event.currentTarget)}
                        sx={{ height: 30, px: 0.75, borderRadius: 1, fontSize: 13, color: disabled ? "text.disabled" : "text.primary", minWidth: 52, justifyContent: "space-between", "&:hover": { bgcolor: "rgba(0,0,0,0.06)" } }}
                    >
                        {size ?? strings.sizeDefault}
                        <ArrowDropDownIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                    </ButtonBase>
                </span>
            </Tooltip>
            <Menu open={Boolean(sizeAnchor)} anchorEl={sizeAnchor} onClose={() => setSizeAnchor(null)} transitionDuration={0} disableRestoreFocus>
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
                <FormatBoldIcon sx={{ fontSize: 19 }} />
            </ToolButton>
            <ToolButton label={strings.underline} active={hasDecoration(style, "underline")} disabled={disabled} onClick={() => onStyle({ textDecoration: toggleDecoration(style, "underline") })}>
                <FormatUnderlinedIcon sx={{ fontSize: 19 }} />
            </ToolButton>
            <ToolButton label={strings.strike} active={hasDecoration(style, "line-through")} disabled={disabled} onClick={() => onStyle({ textDecoration: toggleDecoration(style, "line-through") })}>
                <StrikethroughSIcon sx={{ fontSize: 19 }} />
            </ToolButton>
            <ColorButton label={strings.textColor} icon={<FormatColorTextIcon sx={{ fontSize: 17 }} />} value={style?.color} colors={TEXT_COLORS} noneLabel={strings.noColor} disabled={disabled} onPick={(color) => onStyle({ color })} />
            <ColorButton label={strings.background} icon={<FormatColorFillIcon sx={{ fontSize: 17 }} />} value={style?.background} colors={BACKGROUND_COLORS} noneLabel={strings.noColor} disabled={disabled} onPick={(color) => onStyle({ background: color })} />
            {children ? <ToolDivider /> : null}
            {children}
            <Box sx={{ flex: 1 }} />
            {end}
        </Box>
    );
}
