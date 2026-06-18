import type { APIRoute } from 'astro';
import { allWombos, gloss, firstPos } from '../lib/wombos';

export const GET: APIRoute = async () => {
  const list = (await allWombos()).map((w) => ({
    id: w.id,
    word: w.data.word,
    pos: firstPos(w),
    tier: w.data.tier,
    gloss: gloss(w).slice(0, 90),
  }));
  return new Response(JSON.stringify(list), {
    headers: { 'Content-Type': 'application/json' },
  });
};
