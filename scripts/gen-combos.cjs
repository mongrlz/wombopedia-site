#!/usr/bin/env node
/* Generates src/data/combos.json — "The Combo" source words for each wombo.
 *
 * Source words are parsed from each entry's OWN etymology (never by splitting the
 * headword), then gated for precision: a chain of `a + b (+ c…)` is accepted only when
 *   1. it is the ONLY plus-chain in the etymology (no competing sub-derivation lists),
 *   2. every token is a real word (system dictionary), Gen-Z slang, or another wombo, and
 *   3. the tokens actually leave a ≥3-char trace in the wombo's spelling.
 * Ambiguous entries are omitted rather than guessed. OVERRIDES below hand-correct or add
 * specific entries; SUPPRESS removes a wrong auto-extraction. Re-run after editing data:
 *   node scripts/gen-combos.cjs
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const d = require(path.join(ROOT, 'src/data/wombos.json'));
// hand-curated authoritative map (id -> sources[] | null to suppress). Wins over all auto methods.
let CURATED = {};
try { CURATED = require(path.join(ROOT, 'src/data/combos.curated.json')); } catch {}

const DICT = new Set(
  fs.readFileSync('/usr/share/dict/words', 'utf8').split('\n').map((w) => w.trim().toLowerCase()).filter((w) => w.length > 1),
);
const SLANG = new Set(['rizz','sigma','delulu','sus','cap','capping','bro','af','yeet','maxxing','looksmaxxing','mewing','gyat','aura','npc','opp','huzz','bae','legit','lowkey','highkey','deadass','peak','cinema','glaze','mog','sendy','kirk','peanemis','drip','simp','based','cringe','vibe','clout','stan','cooked','goated','crashout','nonchalant','genuinely','unc','chud','quiche','goat','demure','demurely']);
const STOP = new Set(['the','a','an','and','of','to','its','it','his','her','by','with','as','is','are','was','or','in','on','for','from','that','this','these','those','one','word','words','term','name','sense','here','itself','also','spoken','phrase','single','coinage','wombo','blend','portmanteau','combo','via','cf','esp','etc','two','three','four','five','six','seven','eight','nine','ten','first','second','third','latter','former','element','elements','stage','stages','root','roots','stem','stems']);

// hand-verified corrections + additions (read from the etymologies); win over auto-extraction
const OVERRIDES = {
  deadassionately: ['deadass', 'passionately'],
  labron: ['lebron', 'bro'],
  bigarchenuinely: ['big', 'arch', 'genuinely'],
  dumpflatexemptrolution: ['trump', 'dump', 'inflation', 'exempt', 'revolution'],
  twincipal: ['twin', 'principal'],
  balledge: ['ball', 'knowledge'],
  kirkumcision: ['kirk', 'circumcision'],
  enima: ['enigma', 'cinema'],
};
const SUPPRESS = new Set([
  'bigarcheadassionitdasealibrentologiclowstate', // mega-stack: tiling yields fragments
  'brarpet-clavacuum', 'brarpetclavacuum', // paired entry — two coinages, not one combo
]);

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const WOMBOWORDS = new Set(d.map((w) => norm(w.word)).concat(d.map((w) => w.id)));
const ok = (t) => DICT.has(t) || SLANG.has(t) || WOMBOWORDS.has(t) || (t.endsWith('s') && DICT.has(t.slice(0, -1)));
function echoes(tok, w) {
  if (tok.length < 3) return w.includes(tok);
  for (let i = 0; i + 3 <= tok.length; i++) if (w.includes(tok.slice(i, i + 3))) return true;
  return false;
}
function extract(word, ety) {
  if (!ety) return null;
  const w = norm(word);
  let s = ety;
  for (let k = 0; k < 4; k++) s = s.replace(/\([^()]*\)/g, ' ');
  const chainRe = /[A-Za-z][A-Za-z'’]*-?(?:\s*\+\s*[A-Za-z][A-Za-z'’]*-?)+/g;
  const cands = [];
  let m;
  while ((m = chainRe.exec(s))) {
    const toks = m[0].split('+').map((t) => t.trim().toLowerCase().replace(/-$/, '')).filter(Boolean);
    const clean = toks.filter((t) => t.length >= 2 && !STOP.has(t));
    if (clean.length >= 2 && clean.join('+') !== 'word+combo') cands.push(clean);
  }
  if (cands.length === 1 && cands[0].every(ok)) {
    const c = cands[0];
    const hits = c.map((t) => echoes(t, w));
    const ratio = hits.filter(Boolean).length / c.length;
    if (c.length === 2 && ratio === 1) return c;
    if (c.length >= 3 && hits[0] && ratio >= 0.7) return c;
  }
  const all = [...s.matchAll(/(?:blend|portmanteau|fusion|compound) of ["“]?([A-Za-z][A-Za-z'’-]+)["”]?(?: \([^)]*\))? and ["“]?([A-Za-z][A-Za-z'’-]+)/gi)];
  if (cands.length === 0 && all.length === 1) {
    const a = all[0][1].toLowerCase(), b = all[0][2].toLowerCase();
    if (ok(a) && ok(b) && echoes(a, w) && echoes(b, w)) return [a, b];
  }
  return null;
}

// Recall mode: among AMBIGUOUS +chains, pick the one whose tokens best tile the spelling.
// Lower-confidence than extract() — every result is reviewed and corrected via CURATED.
function bestChain(word, ety) {
  if (!ety) return null;
  const w = norm(word);
  let s = ety;
  for (let k = 0; k < 4; k++) s = s.replace(/\([^()]*\)/g, ' ');
  const chainRe = /[A-Za-z][A-Za-z'’]*-?(?:\s*\+\s*[A-Za-z][A-Za-z'’]*-?)+/g;
  let best = null, m;
  while ((m = chainRe.exec(s))) {
    const toks = m[0].split('+').map((t) => t.trim().toLowerCase().replace(/-$/, '')).filter(Boolean);
    const c = toks.filter((t) => t.length >= 2 && !STOP.has(t));
    if (c.length < 2 || c.join('+') === 'word+combo' || !c.every(ok)) continue;
    const hits = c.map((t) => echoes(t, w));
    const ratio = hits.filter(Boolean).length / c.length;
    const score = ratio + (hits[0] ? 0.5 : 0) + (hits.every(Boolean) ? 0.5 : 0) - m.index * 1e-5;
    if (!best || score > best.score) best = { src: c, score, head: hits[0], ratio };
  }
  return best && best.head && best.ratio >= 0.6 ? best.src : null;
}

// Method 2 — spelling-tiling: for entries with NO `+` chain, find the etymology words
// that tile the wombo's spelling (e.g. "burger"+"fundamentally" cover "burgundamentally";
// "patty"/"bun" don't). Conservative: real words only, ≥4-char traces, ≥72% coverage.
function bestTrace(src, w) {
  let best = { len: 0, at: -1 };
  for (let i = 0; i < src.length; i++)
    for (let j = i + 3; j <= src.length; j++) {
      const sub = src.slice(i, j);
      const at = w.indexOf(sub);
      if (at >= 0 && sub.length > best.len) best = { len: sub.length, at };
    }
  return best;
}
function tile(word, ety, threshold = 0.72) {
  if (!ety) return null;
  const w = norm(word);
  let s = ety;
  for (let k = 0; k < 4; k++) s = s.replace(/\([^()]*\)/g, ' ');
  const seen = new Set(), cands = [];
  for (const m of s.match(/[A-Za-z][A-Za-z'’-]{3,}/g) || []) {
    const t = m.toLowerCase().replace(/[^a-z]/g, '');
    if (t.length < 4 || t.length > 18 || t === w || seen.has(t) || !ok(t)) continue;
    seen.add(t);
    const tr = bestTrace(t, w);
    if (tr.len >= 4) cands.push({ t, ...tr });
  }
  cands.sort((a, b) => a.at - b.at || b.len - a.len);
  const picked = [];
  let covered = 0, lastEnd = 0;
  for (const cd of cands) if (cd.at >= lastEnd) { picked.push(cd.t); covered += cd.len; lastEnd = cd.at + cd.len; }
  return picked.length >= 2 && picked.length <= 6 && covered >= w.length * threshold ? picked : null;
}

// Does the etymology look like a genuine blend (so a missing combo is worth flagging
// as unverified, vs. an initialism / combining-form that legitimately has no combo)?
const looksLikeBlend = (ety) => !!ety && (/[A-Za-z]\s*\+\s*[A-Za-z]/.test(ety) || /\b(blend|portmanteau|fus(?:es|ing|ion)|smash\w*|telescop\w*|conflat\w*|amalgam\w*)\b/i.test(ety));

const out = {};
const unresolved = []; // ids that should have a combo but we couldn't pin → "unverified" note
const method = {};
const counts = { curated: 0, auto: 0, over: 0, guess: 0, tile: 0, unresolved: 0 };
for (const w of d) {
  if (SUPPRESS.has(w.id)) continue;
  if (Object.prototype.hasOwnProperty.call(CURATED, w.id)) {
    const v = CURATED[w.id];
    if (Array.isArray(v) && v.length >= 2) { out[w.id] = v; method[w.id] = 'curated'; counts.curated++; }
    else if (v === null) { unresolved.push(w.id); counts.unresolved++; } // indeterminate → flag
    // v === false → genuine non-blend: no combo, no flag
    continue;
  }
  if (OVERRIDES[w.id]) { out[w.id] = OVERRIDES[w.id]; method[w.id] = 'override'; counts.over++; continue; }
  const src = extract(w.word, w.etymology);
  if (src) { out[w.id] = src; method[w.id] = 'auto'; counts.auto++; continue; }
  const g = bestChain(w.word, w.etymology);
  if (g) { out[w.id] = g; method[w.id] = 'guess'; counts.guess++; continue; }
  const t = tile(w.word, w.etymology, 0.6);
  if (t) { out[w.id] = t; method[w.id] = 'tile'; counts.tile++; continue; }
  if (looksLikeBlend(w.etymology)) { unresolved.push(w.id); counts.unresolved++; } // blend, but unpinned
}

// review dump: the uncertain methods (guess/tile) with etymology, for hand-correction
const REVIEW = process.argv.includes('--review');
if (REVIEW) {
  const byId = Object.fromEntries(d.map((w) => [w.id, w]));
  const lines = [];
  for (const id of Object.keys(out)) {
    if (method[id] !== 'guess' && method[id] !== 'tile') continue;
    const w = byId[id];
    const ety = (w.etymology || '').replace(/\s+/g, ' ').slice(0, 240);
    lines.push(`[${method[id]}] ${id}\n   GUESS: ${out[id].join(' + ')}\n   ETY: ${ety}\n`);
  }
  fs.writeFileSync('/tmp/combo-review.txt', `${lines.length} uncertain combos to review\n\n${lines.join('\n')}`);
  console.log(`review dump: ${lines.length} uncertain → /tmp/combo-review.txt`);
}
// keep output stable/ordered by id for clean diffs
const ordered = Object.fromEntries(Object.keys(out).sort().map((k) => [k, out[k]]));
fs.writeFileSync(path.join(ROOT, 'src/data/combos.json'), JSON.stringify(ordered, null, 0) + '\n');
fs.writeFileSync(path.join(ROOT, 'src/data/combos-unresolved.json'), JSON.stringify(unresolved.sort()) + '\n');
console.log(`combos.json: ${Object.keys(out).length}/${d.length} — curated ${counts.curated}, auto ${counts.auto}, override ${counts.over}, guess ${counts.guess}, tile ${counts.tile}`);
console.log(`unresolved (unverified note): ${counts.unresolved}`);
