# Wud fi Tideh

A colourful, self-contained web page celebrating Jamaican Patois proverbs from
Donald Thompson's "Wud fi Tideh" podcast.

- **The Daily Wud** — today's proverb with its English translation and meaning.
- **Wuds of Wisdom** — five random proverbs turned into a two-host radio
  segment with a live transcript. Plays authentic per-proverb clips when present
  (see "Better voices" below), falling back to the browser voice otherwise.
- **Legends** — a tribute to Louise Bennett-Coverley ("Miss Lou") and Claude
  McKay, who made Patois a literary language.
- Day/night theme: **Sunsplash** by day, **Reggae Dusk** by night — with a
  living sky in the hero (the sun tracks the visitor's clock; moon and stars
  after dark).
- A **yaad radio studio**: illustrated Auntie Pearl & Uncle Roy light up and
  mouth along as their lines play, under an ON AIR sign and an audio-driven VU
  meter, with an optional synthesized island-ambience toggle (surf by day,
  crickets at night).
- The **Doctor Bird** — Jamaica's national hummingbird — hovers beside whatever
  you're reading, flies over to follow you when you scroll, and lands on the
  shoulder of whoever is speaking during a radio session.

## Run it

No build step. Serve the folder with any static server:

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

(Open over http rather than file:// so the audio and fonts load cleanly.)

## Add the original podcast

Drop the mp3 at `audio/wud-fi-tideh.mp3`. The "Hear the Original" player
activates automatically; until then it shows a "coming soon" note.

## Better voices (authentic Jamaican audio)

By default the spoken audio uses the browser's built-in speech, which only
approximates Patois. For authentic Jamaican-accent audio, generate clips with
[ElevenLabs](https://elevenlabs.io) (which has real Jamaican voices) into
`audio/proverbs/`. The site uses them automatically; anything missing falls back
to the browser voice.

**Automated, both hosts (paid API):** using Voice Library voices via the API
needs a paid plan (Starter and up) plus a full-access API key. This generates
the whole two-host segment — Auntie Pearl (`VOICE_A`, female) reads each proverb
and its meaning, Uncle Roy (`VOICE_B`, male) gives the translation:

```bash
ELEVENLABS_API_KEY=your_key \
  ELEVENLABS_VOICE_A=female_voice_id \
  ELEVENLABS_VOICE_B=male_voice_id \
  npm run build:audio
```

(Optional `ELEVENLABS_MODEL`, default `eleven_multilingual_v2`. Append
`-- --force` to regenerate existing clips.) Commit the generated mp3s so they
deploy with the site. The script regenerates only missing clips, so it's safe to
re-run.

**Free, by hand (the website):** the free tier lets you use Voice Library voices
on elevenlabs.io itself — just not via the API. For a minimal version, generate
the proverb readings in one voice following
[`audio/GENERATION_GUIDE.md`](audio/GENERATION_GUIDE.md) and drop them into
`audio/proverbs/`.

## Update the proverbs

The data is embedded in `js/data.js`, generated from `data/wud-fi-tideh.csv`:

```bash
npm run build:data
```

## Test

```bash
npm test   # Node's built-in runner; no dependencies
```

## Deploy (GitHub Pages)

Push to GitHub, then enable Pages → Deploy from branch → `main` / root. The site
is plain static files at the repo root.

## Credits

Proverbs from the "Wud fi Tideh" podcast by Donald Thompson. Built as a tribute
to the Jamaican literary tradition.
