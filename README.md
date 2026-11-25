# Norvane website

The marketing site for Norvane. Built with [Astro](https://astro.build) as a fully static site, with motion by [GSAP](https://gsap.com) (ScrollTrigger, SplitText) and [Lenis](https://lenis.darkroom.engineering) smooth scrolling.

## Run it locally

```sh
npm install
npm run dev       # http://localhost:4321
npm run build     # writes the static site to dist/
npm run preview   # serves dist/ locally
```

## Branches and environments

| Branch    | Where it goes                          |
| --------- | -------------------------------------- |
| `staging` | Vercel preview, for reviewing changes  |
| `main`    | Vercel production                      |

Work on `staging`, check the Vercel preview, then merge into `main`.

## Moving to Hostinger later

The site has no server code. Run `npm run build` and upload the contents of `dist/` to `public_html` on Hostinger. Nothing else is needed.

## Where things live

- `src/config.ts`: office city, time zone and opening hours used by the live status line
- `src/styles/`: brand tokens and global styles
- `src/components/`: one file per page section
- `src/scripts/`: motion, the bearing field canvas and the office status
- `public/`: favicon and static files

## Still to fill in

Grey bracketed text on the page marks details only the team can supply: prices, address, phone, hours, founder note, engineer names, insurance and certifications. Dashed boxes are photo placeholders.
