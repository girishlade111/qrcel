# QRCel — Artistic QR Code Generator

QRCel is a client-side web app that turns any text or URL into a **stylized, artistic QR code**. Instead of the plain black-and-white squares you get from standard generators, QRCel applies creative canvas transforms — gradient noise patterns, homography (perspective) warping, and triangle-mask overlays — to produce QR codes with a distinctive generative-art look, rendered live as you type.

## What it does

- Enter any text or URL and get a scannable QR code rendered on a canvas in real time.
- Applies a hardcoded set of artistic transforms for a unique aesthetic:
  - **Gradient noise pattern** — module-level gradient noise with configurable intensity, direction (diagonal, top-bottom, left-right, radial) and white/black stop points.
  - **Homography (perspective) warp** — a 3×3 transformation matrix applied to the QR matrix for a skewed, dynamic look.
  - **Triangle mask overlay** — a large triangle cutout/overlay positioned over the code.
- **Dark mode toggle** for the app UI.
- **Download** the generated QR code as a PNG image.

> Note: heavy artistic transforms can reduce scanner readability. Test the output with your target QR scanner before printing or publishing critical codes.

## Features

- Live QR generation while typing (debounced input)
- Artistic canvas rendering pipeline (noise → homography → triangle mask → crop)
- Dark / light UI theme
- One-click PNG download of the generated code
- Fully responsive layout
- 100% client-side — no backend, no API keys, no data leaves the browser

## Tech stack

- [Next.js 15](https://nextjs.org/) (App Router, static export)
- [React 19](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) components (Radix UI primitives)
- [`qrcode`](https://www.npmjs.com/package/qrcode) npm package for the core QR matrix generation
- Canvas 2D API for the artistic post-processing pipeline
- TypeScript throughout

## Quick start

```bash
# install dependencies (pnpm recommended)
pnpm install

# run the dev server
pnpm dev
# open http://localhost:3000

# production static build (outputs to ./out)
pnpm build
```

To serve the static build locally:

```bash
npx serve out
```

## Project structure

```
qrcel/
├── app/
│   ├── page.tsx        # main QR generator UI + canvas transform pipeline ("use client")
│   ├── layout.tsx      # root layout, theme provider, fonts
│   └── globals.css     # global styles
├── components/
│   ├── theme-provider.tsx
│   └── ui/             # shadcn/ui components (if present)
├── lib/
│   └── utils.ts        # shared helpers
├── public/             # static assets
├── next.config.mjs     # output: 'export' for static hosting
└── package.json
```

## Environment variables

None. The app is fully client-side and needs no configuration.

## Deployment

The app is a pure static export (`output: 'export'` in `next.config.mjs`), so it can be hosted on any static file host:

1. `pnpm build` — generates the `out/` directory.
2. Deploy the contents of `out/` to GitHub Pages, Cloudflare Pages, Vercel, or Netlify.

`basePath: '/qrcel'` is set for the GitHub Pages subpath deployment. If you deploy to a custom domain or a root path, remove the `basePath` line from `next.config.mjs` and rebuild.

## How it works (technical)

1. The `qrcode` library generates the raw QR module matrix from the input text.
2. The matrix is drawn to an offscreen canvas with per-module gradient noise applied (module size, white/black stop points and intensity are tunable constants).
3. A homography transform warps the canvas for the perspective effect.
4. A triangle mask is composited over the result, and the final image is cropped and drawn to the visible canvas.
5. The canvas is exported to a data URL for download.

## License

MIT.

---

Built by Girish Lade — https://ladestack.in
