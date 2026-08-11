# Matheus Ribeiro — Portfolio / Online CV

Personal portfolio site, live at [matheusribeiro.dev.br](https://matheusribeiro.dev.br), deployed on Firebase Hosting.

## Stack

- Plain HTML + vanilla JS (`public/js/main.js`) — no framework, no build step beyond CSS
- Tailwind CSS, compiled from `src/input.css` into `public/css/style.css`
- Content is data-driven from `public/data/cv-data.json` (bilingual PT/EN + a shared `common` block) — **edit content there, not in `index.html`**
- PDF export via [html2pdf.js](https://github.com/eKoopmans/html2pdf.js), loaded lazily only when the download button is clicked
- Firebase Hosting for deploy

## Scripts

```bash
npm run build   # compile Tailwind once, minified (also runs automatically as predeploy)
npm run watch   # compile Tailwind on file change, for local dev
```

There's no dev server script — just open `public/index.html` directly in a browser, or serve `public/` with any static file server.

## Structure

```
public/
  index.html          # page shell + hidden #cv-template block used for PDF export
  css/style.css        # compiled Tailwind output — generated, don't hand-edit
  js/main.js            # all rendering logic: language/theme toggles, PDF generator, command palette (Cmd/Ctrl+K)
  data/cv-data.json    # all CV content: pt/en profile+experience+education+projects+ui labels, common skills/languages
  images/, favicon.ico
src/input.css          # Tailwind source — edit this, not the compiled CSS
tailwind.config.js
firebase.json / .firebaserc   # Firebase Hosting config
```

## Deploy

```bash
firebase deploy
```

Requires the Firebase CLI logged in with access to the project in `.firebaserc`.

## Updating content

Everything text-facing (name, summary, experience, projects, skills, languages, education, UI labels) lives in `public/data/cv-data.json`. Keep the `pt` and `en` blocks parallel — every key that exists in one should exist in the other. The `common` block (skills, languages) is shared and not duplicated per language.

If you add or remove a section, remember there are **two render paths** that both need updating in `public/js/main.js`: the live page (`renderPage()` and its helpers) and the hidden PDF template (`renderPDFTemplate()`, targeting `#cv-template` in `index.html`) — they're separate DOM trees so a change to one doesn't automatically show up in the other.

## Notes for future work

See `../PROGRESS.md` (one level up, in the `pessoal` folder) for the active redesign initiative and every decision already made — read that before re-exploring this repo from scratch.
