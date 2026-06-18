# WOMBOS · Wombopedia

The canonical scholarly dictionary of **wombos** — words smashed into other words — the
comedic discipline founded by TikTok creator [Professor Sendy](https://www.tiktok.com/@professorsendy).
A tribute, not a monetized product. Built by [mongrlz 🦉](https://kick.com/mongrlz).

A deadpan, printed-dictionary aesthetic: warm parchment, Libre Baskerville + EB Garamond,
a single library-stamp-red accent, double-rule dividers, real small caps and oldstyle figures.
Every entry is a Merriam-Webster–style article with senses, etymology, a word family, and —
where the source words are known — **The Combo** (the words the wombo was smashed from).

## Highlights

- **600+ entries** in `src/data/wombos.json` (the dataset — keep its shape intact).
- **The Combo** — `A + B (+ C…) = wombo`, derived from each entry's own etymology, never by
  splitting the headword. Coverage + corrections live in `src/data/combos.curated.json`.
- **Live collision hero** — the masthead performs a wombo on load, rotating through verified
  specimens (reduced-motion friendly).
- **Site-wide command palette** — `⌘K` / `/` instant search over the whole lexicon.
- **Source attestations** — entries link back to the original Professor Sendy video.
- Dark mode, full keyboard access, static + fast.

## Develop

```sh
npm install
npm run dev      # http://localhost:4321
npm run build    # static output → dist/
```

## Regenerating The Combo data

Combos are generated from the etymologies, then hand-corrected:

```sh
node scripts/gen-combos.cjs            # writes src/data/combos.json + combos-unresolved.json
node scripts/gen-combos.cjs --review   # also dumps uncertain guesses for review
```

Edit `src/data/combos.curated.json` to set sources (`["a","b"]`), mark a genuine
non-blend (`false`), or flag one as unverified (`null`), then re-run.

## Structure

```
src/
  data/        wombos.json (entries) · combos*.json (the combo layer) · unlisted.json
  layouts/     Base.astro (shell, header, command palette, theme)
  pages/       index.astro · word/[id].astro · browse/[letter].astro · about · saved · issues
  lib/         wombos.ts (data helpers, combo + respelling derivation)
  styles/      global.css (the whole design system)
scripts/       gen-combos.cjs
```

## Credit

All credit for the discipline of wombos to **@ProfessorSendy**, its inventor.
