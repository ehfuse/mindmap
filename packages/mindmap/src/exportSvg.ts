/**
 * Standalone SVG of the map (for saving a picture next to the data). Built from the layout, not the DOM,
 * so it works while the map is hidden and looks the same in an <img>.
 */
import { DEFAULT_FONT_FAMILY } from "@ehfuse/outliner";
import { edgePath, layoutMap, nodeLook, type MapDirection } from "./layout";
import type { MindMapData } from "./types";

const esc = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function exportMindMapSvg(data: MindMapData, options: { padding?: number; background?: string } = {}): string {
    const padding = options.padding ?? 24;
    const layout = layoutMap(data.nodeData, (data.direction ?? 2) as MapDirection);
    const { minX, minY, maxX, maxY } = layout.bounds;
    const width = Math.ceil(maxX - minX + padding * 2);
    const height = Math.ceil(maxY - minY + padding * 2);
    const ox = padding - minX;
    const oy = padding - minY;
    const parts: string[] = [];
    parts.push(`<rect width="${width}" height="${height}" fill="${options.background ?? "#ffffff"}"/>`);
    parts.push(`<g transform="translate(${ox} ${oy})">`);
    for (const edge of layout.edges) parts.push(`<path d="${edgePath(edge)}" fill="none" stroke="${edge.color}" stroke-width="${edge.to.depth === 1 ? 2.5 : 1.75}" stroke-linecap="round"/>`);
    for (const ln of layout.nodes) {
        const look = nodeLook(ln);
        parts.push(
            `<rect x="${ln.x}" y="${ln.y}" width="${ln.w}" height="${ln.h}" rx="${look.radius}" fill="${look.fill}"${look.stroke !== "none" ? ` stroke="${look.stroke}" stroke-width="${look.strokeWidth}"` : ""}/>`
        );
        const deco = ln.node.style?.textDecoration;
        parts.push(
            `<text x="${ln.x + ln.w / 2}" y="${ln.y + ln.h / 2}" text-anchor="middle" dominant-baseline="central" font-family="${esc(DEFAULT_FONT_FAMILY)}" font-size="${ln.fontSize}" font-weight="${ln.fontWeight}" fill="${look.text}"${deco ? ` text-decoration="${esc(deco)}"` : ""}>${esc(ln.node.topic)}</text>`
        );
        if (ln.node.expanded === false && (ln.node.children?.length ?? 0) > 0 && ln.depth > 0) {
            const cx = ln.side > 0 ? ln.x + ln.w + 10 : ln.x - 10;
            const cy = ln.y + ln.h / 2;
            parts.push(`<circle cx="${cx}" cy="${cy}" r="9" fill="#ffffff" stroke="${ln.color}" stroke-width="1.5"/>`);
            parts.push(`<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" font-family="${esc(DEFAULT_FONT_FAMILY)}" font-size="10" fill="${ln.color}">${ln.node.children!.length}</text>`);
        }
    }
    parts.push("</g>");
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${parts.join("")}</svg>`;
}
