import { useRef, useState } from "react";
import { Box, Button, MenuItem, Select, Tab, Tabs, Typography } from "@mui/material";
import { MindMap, type MindMapData, type MindMapHandle } from "@ehfuse/mindmap";
import { Outliner, type TreeNode } from "@ehfuse/outliner";
import { SAMPLE } from "./sample";

const LOCALES = ["ko", "en", "ja", "zh", "de", "fr", "it", "vi"];

export function App() {
    const [tab, setTab] = useState(0);
    const [locale, setLocale] = useState("ko");
    const [map, setMap] = useState<MindMapData>(SAMPLE);
    const [tree, setTree] = useState<TreeNode>(SAMPLE.nodeData);
    const [svg, setSvg] = useState("");
    const mapRef = useRef<MindMapHandle | null>(null);

    return (
        <Box sx={{ height: "100vh", display: "flex", flexDirection: "column", bgcolor: "#f5f6f8" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, px: 2, py: 1, bgcolor: "#fff", borderBottom: "1px solid #e0e0e0", flexWrap: "wrap" }}>
                <Typography sx={{ fontWeight: 700 }}>@ehfuse/mindmap · @ehfuse/outliner</Typography>
                <Tabs value={tab} onChange={(_e, v) => setTab(v)} sx={{ minHeight: 40, "& .MuiTab-root": { minHeight: 40 } }}>
                    <Tab label="MindMap" />
                    <Tab label="Outliner" />
                </Tabs>
                <Box sx={{ flex: 1 }} />
                <Select size="small" value={locale} onChange={(e) => setLocale(e.target.value)}>
                    {LOCALES.map((l) => (
                        <MenuItem key={l} value={l}>
                            {l}
                        </MenuItem>
                    ))}
                </Select>
            </Box>
            {tab === 0 ? (
                <Box sx={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 360px" }, gap: 2, p: 2 }}>
                    <Box sx={{ minHeight: 480, border: "1px solid #e0e0e0", borderRadius: 1, overflow: "hidden", bgcolor: "#fff" }}>
                        <MindMap ref={mapRef} value={map} onChange={setMap} locale={locale} />
                    </Box>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1, minHeight: 0 }}>
                        <Button variant="contained" disableElevation onClick={() => setSvg(mapRef.current?.exportSvg() ?? "")}>
                            Export SVG
                        </Button>
                        {svg ? <Box component="img" src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`} sx={{ maxWidth: "100%", border: "1px solid #e0e0e0", borderRadius: 1, bgcolor: "#fff" }} /> : null}
                        <Box component="pre" sx={{ flex: 1, minHeight: 0, overflow: "auto", m: 0, p: 1, fontSize: 12, bgcolor: "#fff", border: "1px solid #e0e0e0", borderRadius: 1 }}>
                            {JSON.stringify(map, null, 2)}
                        </Box>
                    </Box>
                </Box>
            ) : (
                <Box sx={{ flex: 1, minHeight: 0, p: 2 }}>
                    <Box sx={{ height: "100%", maxWidth: 720, mx: "auto", border: "1px solid #e0e0e0", borderRadius: 1, overflow: "hidden", bgcolor: "#fff" }}>
                        <Outliner value={tree} onChange={setTree} locale={locale} />
                    </Box>
                </Box>
            )}
        </Box>
    );
}
