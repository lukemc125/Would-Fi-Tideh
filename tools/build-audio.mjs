// Generate authentic Jamaican-accent audio for every proverb using ElevenLabs,
// saved as static mp3s under audio/proverbs/<slug>.mp3. Run ONCE (and again when
// proverbs change). The site plays these clips and falls back to the browser
// voice for any that are missing, so this step is optional but recommended.
//
//   ELEVENLABS_API_KEY=...  ELEVENLABS_VOICE_ID=...  node tools/build-audio.mjs
//
// Get a free key + pick a Jamaican voice at https://elevenlabs.io (Voices ->
// Voice Library -> add a Jamaican voice -> copy its Voice ID). 34 short proverbs
// is well under the free tier's 10,000 chars/month.
//
// Flags: --force re-generates clips that already exist.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { WUD_DATA } = require('../js/data.js');

const OUT_DIR = join(__dirname, '..', 'audio', 'proverbs');
const API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID;
const MODEL = process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2';
const FORCE = process.argv.includes('--force');

function fail(msg) { console.error('\n  ' + msg + '\n'); process.exit(1); }

if (!API_KEY) fail('Set ELEVENLABS_API_KEY (get a free key at https://elevenlabs.io).');
if (!VOICE_ID) fail('Set ELEVENLABS_VOICE_ID (Voice Library -> add a Jamaican voice -> copy its Voice ID).');

mkdirSync(OUT_DIR, { recursive: true });

function slugMissing(p) { return !p.slug || !p.original; }

async function synth(text) {
  const url = 'https://api.elevenlabs.io/v1/text-to-speech/' + VOICE_ID + '?output_format=mp3_44100_128';
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'xi-api-key': API_KEY, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg' },
    body: JSON.stringify({
      text: text,
      model_id: MODEL,
      voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.3, use_speaker_boost: true }
    })
  });
  if (res.status === 401) fail('ElevenLabs rejected the API key (401). Check ELEVENLABS_API_KEY.');
  if (res.status === 422) fail('ElevenLabs rejected the request (422) — usually a bad ELEVENLABS_VOICE_ID.');
  if (res.status === 429) fail('Rate limited / quota exhausted (429). Wait, or upgrade the ElevenLabs plan.');
  if (!res.ok) fail('ElevenLabs error ' + res.status + ': ' + (await res.text()).slice(0, 300));
  return Buffer.from(await res.arrayBuffer());
}

const items = WUD_DATA.filter(function (p) { return !slugMissing(p); });
let made = 0, skipped = 0, chars = 0;

console.log('Generating patois audio for ' + items.length + ' proverbs (model: ' + MODEL + ')…\n');

for (const p of items) {
  const out = join(OUT_DIR, p.slug + '.mp3');
  if (existsSync(out) && !FORCE) { skipped++; continue; }
  process.stdout.write('  ' + p.slug + ' … ');
  const audio = await synth(p.original);
  writeFileSync(out, audio);
  made++; chars += p.original.length;
  console.log('ok (' + audio.length + ' bytes)');
}

const cost = (chars / 1000) * 0.03;
console.log('\nDone. Generated ' + made + ', skipped ' + skipped + ' existing.');
console.log('Characters this run: ' + chars + ' (~$' + cost.toFixed(3) + ' at $0.03/1k; free tier covers 10,000/mo).');
console.log('Clips are in audio/proverbs/. Commit them so they deploy with the site.');
