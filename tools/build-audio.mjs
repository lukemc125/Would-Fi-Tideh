// Generate authentic Jamaican-accent audio for the whole radio segment using
// ElevenLabs, saved as static mp3s under audio/proverbs/<clip>.mp3. Run ONCE
// (and again when proverbs change). The site plays these clips and falls back to
// the browser voice for any that are missing, so this step is optional.
//
//   ELEVENLABS_API_KEY=...  ELEVENLABS_VOICE_A=<female>  ELEVENLABS_VOICE_B=<male> \
//     node tools/build-audio.mjs
//
// VOICE_A is Auntie Pearl (reads each proverb + its meaning); VOICE_B is Uncle
// Roy (reads the translation). Using Voice Library (e.g. Jamaican) voices via the
// API needs a PAID ElevenLabs plan. Flags: --force re-generates existing clips.

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { WUD_DATA } = require('../js/data.js');
const { audioManifest } = require('../js/proverbs.js');

const OUT_DIR = join(__dirname, '..', 'audio', 'proverbs');
const API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE = {
  a: process.env.ELEVENLABS_VOICE_A || process.env.ELEVENLABS_VOICE_ID,
  b: process.env.ELEVENLABS_VOICE_B
};
const MODEL = process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2';
const FORCE = process.argv.includes('--force');

function fail(msg) { console.error('\n  ' + msg + '\n'); process.exit(1); }

if (!API_KEY) fail('Set ELEVENLABS_API_KEY (a paid plan is required to use library voices via the API).');
if (!VOICE.a) fail('Set ELEVENLABS_VOICE_A — the female voice (Auntie Pearl, reads proverbs + meanings).');
if (!VOICE.b) fail('Set ELEVENLABS_VOICE_B — the male voice (Uncle Roy, reads translations).');

mkdirSync(OUT_DIR, { recursive: true });

async function synth(text, voiceId) {
  const url = 'https://api.elevenlabs.io/v1/text-to-speech/' + voiceId + '?output_format=mp3_44100_128';
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'xi-api-key': API_KEY, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg' },
    body: JSON.stringify({
      text: text,
      model_id: MODEL,
      voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.3, use_speaker_boost: true }
    })
  });
  if (res.status === 401) fail('ElevenLabs rejected the API key (401). Check ELEVENLABS_API_KEY and its permissions.');
  if (res.status === 402) fail('Payment required (402) — library voices via the API need a paid plan.');
  if (res.status === 422) fail('Request rejected (422) — usually a bad voice id.');
  if (res.status === 429) fail('Rate limited / quota exhausted (429). Wait, or upgrade the plan.');
  if (!res.ok) fail('ElevenLabs error ' + res.status + ': ' + (await res.text()).slice(0, 300));
  return Buffer.from(await res.arrayBuffer());
}

const manifest = audioManifest(WUD_DATA);
let made = 0, skipped = 0, chars = 0;

console.log('Generating ' + manifest.length + ' clips (model: ' + MODEL + ')…\n');

for (const item of manifest) {
  const out = join(OUT_DIR, item.clip + '.mp3');
  if (existsSync(out) && !FORCE) { skipped++; continue; }
  const voiceId = VOICE[item.voice];
  process.stdout.write('  ' + item.clip + ' [' + item.voice + '] … ');
  const audio = await synth(item.text, voiceId);
  writeFileSync(out, audio);
  made++; chars += item.text.length;
  console.log('ok (' + audio.length + ' bytes)');
}

const cost = (chars / 1000) * 0.03;
console.log('\nDone. Generated ' + made + ', skipped ' + skipped + ' existing.');
console.log('Characters this run: ' + chars + ' (~$' + cost.toFixed(2) + ' at $0.03/1k).');
console.log('Clips are in audio/proverbs/. Commit them so they deploy with the site.');
