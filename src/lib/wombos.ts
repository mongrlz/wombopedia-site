import { getCollection, type CollectionEntry } from 'astro:content';
import unlisted from '../data/unlisted.json';
import combos from '../data/combos.json';
import combosUnresolved from '../data/combos-unresolved.json';

export type Wombo = CollectionEntry<'wombos'>;

/** Curated set of genuine wombos seen in sentences but not yet catalogued (no false positives). */
const UNLISTED = new Set(unlisted as string[]);

export const LETTERS = '#ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export async function allWombos(): Promise<Wombo[]> {
  const all = await getCollection('wombos');
  return all.sort((a, b) =>
    a.data.word.toLowerCase().localeCompare(b.data.word.toLowerCase()),
  );
}

export function gloss(w: Wombo): string {
  return w.data.parts?.[0]?.senses?.[0]?.def ?? '';
}

export function firstPos(w: Wombo): string {
  return w.data.parts?.[0]?.pos ?? '';
}

/** First A–Z letter, ignoring leading hyphens/symbols; non-letters bucket to '#'. */
export function letterOf(w: Wombo): string {
  const c = (w.data.word.replace(/^[^a-z0-9]+/i, '').charAt(0) || '#').toUpperCase();
  return /[A-Z]/.test(c) ? c : '#';
}

export function letterSlug(letter: string): string {
  return letter === '#' ? 'sym' : letter.toLowerCase();
}

/** Map of normalized headword/part-label/id -> entry id, for linking wombos inside text. */
let _map: Map<string, string> | null = null;
export async function wordMap(): Promise<Map<string, string>> {
  if (_map) return _map;
  const m = new Map<string, string>();
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const w of await allWombos()) {
    const add = (s?: string) => {
      const k = norm(s ?? '');
      if (k.length > 2 && !m.has(k)) m.set(k, w.id);
    };
    add(w.data.word);
    add(w.id);
    for (const p of w.data.parts) add(p.label);
  }
  _map = m;
  return m;
}

/** Sibling/derivative wombos that share a root (analvision → analvisions → analvisionary). */
export function relatives(
  word: string,
  all: { id: string; word: string }[],
  selfId: string,
): { id: string; word: string }[] {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const nt = norm(word);
  const out: { id: string; word: string; cp: number }[] = [];
  for (const x of all) {
    if (x.id === selfId) continue;
    const nx = norm(x.word);
    let i = 0;
    const m = Math.min(nt.length, nx.length);
    while (i < m && nt[i] === nx[i]) i++;
    // shared leading root of ≥6 chars covering at least half the shorter word
    if (i >= 6 && i >= m * 0.5) out.push({ id: x.id, word: x.word, cp: i });
  }
  out.sort((a, b) => b.cp - a.cp || a.word.length - b.word.length);
  return out.slice(0, 12).map(({ id, word }) => ({ id, word }));
}

/* "The Combo" — the source words a wombo is smashed from (2 or more; Sendy's wombos
   escalate to 20-element stacks). Looked up from src/data/combos.json, which is generated
   by scripts/gen-combos.cjs: precision-parsed from each entry's OWN etymology, then
   hand-corrected. Returns null when not confidently derivable, so the equation is omitted
   rather than guessed. Re-run the generator after editing etymologies. */
export function combo(id: string): string[] | null {
  const c = (combos as Record<string, string[]>)[id];
  return c && c.length >= 2 ? c : null;
}

/* True when an entry plainly is a blend but its source words aren't yet pinned down
   (e.g. a long telescoping stack) — used to invite submissions, never shown for
   initialisms or combining forms, which legitimately have no combo. */
const UNRESOLVED = new Set(combosUnresolved as string[]);
export function comboUnresolved(id: string): boolean {
  return UNRESOLVED.has(id);
}

/* IPA → a friendly Merriam-Webster-style respelling: phonemes swapped for readable
   digraphs, syllable dots → hyphens, stress marks kept. A reading aid shown beside the
   real IPA (which stays authoritative). Derived, not authored — best-effort. */
const RESPELL_SEQ: [string, string][] = [
  ['t͡ʃ', 'ch'], ['d͡ʒ', '\u0001'], ['tʃ', 'ch'], ['dʒ', '\u0001'],
  ['eɪ', 'ay'], ['aɪ', 'y'], ['aʊ', 'ow'], ['ɔɪ', 'oy'], ['oʊ', 'oh'], ['əʊ', 'oh'],
  ['ɑː', 'ah'], ['ɔː', 'aw'], ['uː', 'oo'], ['iː', 'ee'], ['ɜː', 'ur'],
  ['ɛə', 'air'], ['ʊə', 'oor'], ['ɪə', 'eer'],
  ['ʃ', 'sh'], ['ʒ', 'zh'], ['θ', 'th'], ['ð', 'th'], ['ŋ', 'ng'], ['j', 'y'],
];
const RESPELL_ONE: Record<string, string> = {
  'ɑ': 'ah', 'æ': 'a', 'ʌ': 'uh', 'ə': 'uh', 'ɔ': 'aw', 'ɒ': 'o', 'ʊ': 'uu', 'u': 'oo',
  'ɪ': 'i', 'i': 'ee', 'ɛ': 'e', 'e': 'e', 'ɚ': 'ur', 'ɝ': 'ur', 'ɜ': 'ur',
  'x': 'k', 'ʔ': '', 'ɡ': 'g', 'ɹ': 'r',
};
export function respell(ipa?: string): string {
  if (!ipa) return '';
  let s = ipa.trim().replace(/^\/|\/$/g, '').replace(/^\[|\]$/g, '');
  for (const [a, b] of RESPELL_SEQ) s = s.split(a).join(b);
  let out = '';
  for (const ch of s) {
    if (ch === 'ˈ' || ch === 'ˌ') out += ch; // keep stress marks
    else if (ch === '.') out += '-'; // syllable break → hyphen
    else if (ch === 'ː') continue; // length mark → drop
    else out += RESPELL_ONE[ch] ?? ch;
  }
  return out.replace(/\u0001/g, 'j').replace(/-{2,}/g, '-').replace(/^-|-$/g, '');
}

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

/** Escape text + wrap any known-wombo token in a link to its page (skips selfId). */
export function linkify(text: string, map: Map<string, string>, selfId?: string): string {
  let out = '';
  let last = 0;
  const re = /[A-Za-z][A-Za-z0-9'’%^-]*/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    out += esc(text.slice(last, m.index));
    const tok = m[0];
    const id = map.get(tok.toLowerCase().replace(/[^a-z0-9]/g, ''));
    if (id && id !== selfId) {
      out += `<a class="wlink" href="/word/${id}/">${esc(tok)}</a>`;
    } else if (UNLISTED.has(tok)) {
      // a genuine wombo we've seen in the wild but not yet catalogued — flag it to submit
      out += `<a class="wombo-unlisted" href="/issues/?type=missing&word=${encodeURIComponent(tok)}" title="Not yet in the lexicon — click to submit it">${esc(tok)}</a>`;
    } else {
      out += esc(tok);
    }
    last = m.index + tok.length;
  }
  out += esc(text.slice(last));
  return out;
}
