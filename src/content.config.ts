import { defineCollection, z } from 'astro:content';
import { file } from 'astro/loaders';

const example = z.object({
  year: z.string().optional(),
  source: z.string().optional(),
  text: z.string(),
});

const sense = z.object({
  num: z.union([z.number(), z.string()]).optional(),
  def: z.string(),
  attributive: z.boolean().optional(),
  subsenses: z
    .array(
      z.object({
        letter: z.string(),
        def: z.string(),
        example: example.optional(),
        subsub: z.array(z.object({ n: z.string(), def: z.string() })).optional(),
      }),
    )
    .optional(),
  examples: z.array(example).optional(),
});

const part = z.object({
  pos: z.string().default(''),
  label: z.string().optional(),
  forms: z.string().optional(),
  senses: z.array(sense),
});

const wombos = defineCollection({
  loader: file('src/data/wombos.json'),
  schema: z.object({
    word: z.string(),
    ipa: z.array(z.string()).default([]),
    origin: z.string().default('Professor Sendy'),
    status: z.string().optional(),
    tier: z.enum(['sendy-original', 'deep-cut']).default('sendy-original'),
    firstKnownUse: z.string().optional(),
    etymology: z.string().optional().default(''),
    synonyms: z.array(z.string()).default([]),
    video: z.string().optional(),
    parts: z.array(part).default([]),
  }),
});

export const collections = { wombos };
