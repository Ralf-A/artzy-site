# ArtzyFoto — automotive photography portfolio

Site for a car photographer (Tallinn), brand "ArtzyFoto". Static HTML, no build step. Serve it over HTTP (`python -m http.server`), not `file://`: the tile photos are uploaded to WebGL textures and Chrome taints `file://` images.

## Files

- `index.html` — landing: hero, one tile per car, about (with the mascot), contact.
- `w140.html`, `c43.html`, `e36.html`, `wrx.html`, `kiirabi.html` — one page per car: head block (name, chassis, location, frame count with "more coming"), a `.grid.gallery` of every frame for that car, contact, footer. Tiles there carry `data-full` and open in the `<dialog class="lb">` lightbox instead of navigating.
- `styles.css`, `tiles.js` — shared by every page. The header/nav/contact/footer markup is copied into each page by hand; there is no templating, so a nav change means editing six files (or generating them — the car pages were first produced from a small Python loop over a car list, which is the sane way to add the next one).
- To add a car: drop the originals in `img/src/`, generate the -800/-2000 variants, add a tile to `index.html` (`.grid.home`) and a `<car>.html` copied from an existing one.

## What exists

- Landing grid `.grid.home`: first tile spans 7 (16:10), second spans 5 (square), the rest span 4 (4:5). Gallery grid `.grid.gallery`: every tile spans 6 at 3:2, a lone tile spans 12.
- Each tile is a WebGL canvas (`class Tile` in the inline script). The fragment shader samples the tile's photo with cover-fit and applies a cursor-driven distortion: velocity-based UV warp, radial push, chromatic split (R/G/B sampled at 1×/1.35×/1.7× displacement), a halogen glow under the cursor, film grain and a vignette. Without a photo it falls back to a procedural scene per `data-scene`.
- Tile markup: `data-src="img/<name>"` is the image base name; the script appends `-800.jpg` or `-2000.jpg` by rendered tile size and loads lazily on first intersection. `data-focus="x y"` (0–1, top-left origin, like CSS `object-position`) picks which part survives the crop. No WebGL → the 2000px JPEG becomes a CSS background.
- `window.setTileImage(index, url)` still works for swapping a photo at runtime.
- Custom cursor (`.cur`) that grows into a "VIEW" disc over tiles; hidden on touch devices.
- Tiles only render while in viewport (IntersectionObserver); DPR capped at 1.5; `prefers-reduced-motion` disables the distortion.

## Images

- Originals live in `img/src/` (gitignored, 6000×4000 JPEGs, ~12 MB each). Never reference them from HTML.
- `img/<name>-2000.jpg` and `img/<name>-800.jpg` are the shipped variants, generated with the PowerShell System.Drawing resize in the session that added them (2000 wide q82, 800 wide q78). Regenerate the same way when adding photos; WebP/AVIF is a later step.
- `img/logo.png` is a copy of `ArtzyFoto.png` (the owner's transparent-background mascot, 531×605). Used in the header at 40px and in the about section.
- Current frames: W140 S420 (night at Freedom Square, dusk farmyard), C43 AMG estate (front, badge detail), E36 M3 (Estoril, detail), GC8 Impreza WRX, Tallinna Kiirabi Sprinter (panned rolling shot).

## Design system

- Palette: ground `#0a0a0c`, surface `#131316`, line `#232328`, ink `#ebe8e2`, muted `#8c8a93`, dim `#55535c`, accent (halogen) `#f0c288`. Dark-only by design — a car studio, not a dashboard. Do not add a light theme unless asked.
- Type: Bebas Neue (display), Michroma (labels/eyebrows, uppercase, tracked), IBM Plex Sans 300/400 (body). Loaded from Google Fonts.
- One effect, deliberately. The tile distortion is the only motion. Don't add scroll-triggered fades, parallax, marquees, or page-load choreography unless the owner explicitly asks.
- Grid: 12 columns, tiles span 7/5, 5/7, 4/4/4; collapses to one column under 820px.

## Contact details (real, confirmed by owner)

- Email `habichtart9@gmail.com`, Instagram `@artzy_foto`. No phone number on the site, by request. No "available from" line.
- The specs list (delivery, formats, kit, area) and the per-car blurbs are plausible but invented; confirm with the photographer.

## Sensible next steps

1. Lightbox prev/next once a car has more than three or four frames.
2. Image pipeline: WebP/AVIF variants, `srcset`, blurred LQIP. Photos are the whole site; don't ship 8 MB JPEGs.
3. Content source: a `content/*.json` per car (filename, caption, focus, location) and a tiny generator, replacing the hand-copied car pages.
4. Deploy: static host (Netlify / Cloudflare Pages / GitHub Pages). No framework needed until there's a reason.

## Conventions

- Vanilla HTML/CSS/JS. No framework, no bundler, until step 3 forces one.
- Keep everything on the CSS custom properties in `:root`; no literal colors in components.
- Keyboard: tiles are `<a>` with a visible focus ring — keep that when restructuring.
