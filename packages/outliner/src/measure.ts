/** Text width with a cached canvas (used for highlight width in the outline and node sizes in the map). */
let ctx: CanvasRenderingContext2D | null = null;
const cache = new Map<string, number>();

export const DEFAULT_FONT_FAMILY = "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans KR', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif";

export function measureText(text: string, fontSize: number, fontWeight: string | number = 400, fontFamily = DEFAULT_FONT_FAMILY): number {
    const font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    const key = `${font}|${text}`;
    const hit = cache.get(key);
    if (hit !== undefined) return hit;
    if (!ctx && typeof document !== "undefined") ctx = document.createElement("canvas").getContext("2d");
    // No canvas (SSR / tests) — rough guess: wide glyphs 1em, others 0.55em.
    let width = 0;
    if (ctx) {
        ctx.font = font;
        width = ctx.measureText(text).width;
    } else for (const ch of text) width += (/[ᄀ-ￜ]/.test(ch) ? 1 : 0.55) * fontSize;
    if (cache.size > 5000) cache.clear();
    cache.set(key, width);
    return width;
}
