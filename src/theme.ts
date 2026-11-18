/**
 * Inline script for <head>, runs before paint.
 * - Theme: Beautiful UI switches with a `.dark` class on <html>. The user's choice (localStorage
 *   "theme": light | dark | system) wins; "system" or none follows the OS. Dispatch a
 *   "theme-change" event on window after changing the stored value to re-apply. Other tabs follow
 *   through the "storage" event.
 * - Text size: localStorage "textSize" 1–5 (default 2) becomes data-text-size on <html>;
 *   css/app-shell.css scales the root font size per level. Dispatch "text-size-change" to re-apply
 *   (TextSizeSlider does). Other tabs follow through the "storage" event.
 *
 * Usage: <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} /> and suppressHydrationWarning on <html>.
 */
export const THEME_SCRIPT = `(()=>{const m=matchMedia("(prefers-color-scheme: dark)");const g=(k)=>{try{return localStorage.getItem(k)}catch(e){return null}};const s=()=>{const p=g("theme");document.documentElement.classList.toggle("dark",p==="dark"||(p!=="light"&&m.matches))};s();m.addEventListener("change",s);addEventListener("theme-change",s);addEventListener("storage",e=>{if(e.key==="theme"||e.key===null)s()});const t=()=>{const l=Number(g("textSize"));document.documentElement.dataset.textSize=String(l>=1&&l<=5?l:2)};t();addEventListener("text-size-change",t);addEventListener("storage",e=>{if(e.key==="textSize"||e.key===null)t()});})();`;

/** CSS variable names the font setup must use (next/font `variable` option); css/brand.css and
 * Beautiful UI's foundation.css read them. Fonts: Inter, PT Serif Regular 400, JetBrains Mono. */
export const FONT_VARIABLES = {
  sans: "--font-inter",
  heading: "--font-pt-serif",
  mono: "--font-mono-face",
} as const;
