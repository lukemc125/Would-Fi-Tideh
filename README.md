# Wud fi Tideh

A colourful, self-contained web page celebrating Jamaican Patois proverbs from
Donald Thompson's "Wud fi Tideh" podcast.

- **The Daily Wud** — today's proverb with its English translation and meaning,
  plus up to two shuffles: 3 wuds per day, then come back tomorrow.
- **Wuds of Wisdom** — the day's five proverbs (randomly chosen but fixed for
  the day, fresh tomorrow) as a two-host radio segment with a live transcript,
  plus a "Mix up anodda five" button for a different random session on demand.
  Proverb lines prefer Donald's real recordings (see "Real recordings" below),
  then the generated clips, then the browser voice.
- **Test yu Patois** — a Duolingo-style quiz in a full-screen takeover: fill
  di blank, build di phrase from word chips, ear tests on the authentic audio,
  and match di meaning — with hearts, combos, ranks (Newcomer → Real Yardie),
  a daily streak, synthesized sound effects and confetti. Each day serves one
  seeded game of 5–7 questions (the same for everyone, fixed until midnight);
  you can replay it to practise, and a live countdown shows when the next game
  unlocks. Progress lives in localStorage; no accounts.
- **Legends** — tributes, in memorial style, to The Hon. Louise Bennett-Coverley
  ("Miss Lou"), The Rt. Excellent Marcus Mosiah Garvey (with his "the tongue is
  mightier" reflection), and Claude McKay — the voices who made Patois, and the
  spoken word, a source of power.
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

## Real recordings

The spreadsheet's "Audio File" column names a real recording for every proverb
(`<slug>.ogg` or `<slug>.mp3`). Drop those files into `audio/recordings/` —
keeping the exact filenames — and commit them. Wherever a proverb is spoken
(Daily Wud "Hear it", the patois lines in Wuds of Wisdom), the site plays the
real recording first, falling back to the generated clip (and then the browser
voice) if the file is missing or the browser can't decode it. The quiz's ear
tests deliberately stay on the generated clips so the blanked word is always a
clean, single phrase.

## Legend portraits (black-and-white photos)

The Legends memorial shows a real black-and-white portrait for each figure when
the file is present, and a monogram (LB / MG / CM) until then. Drop images into
`assets/legends/` with these exact names and commit them:

- `miss-lou.jpg` — Louise Bennett-Coverley
- `marcus-garvey.jpg` — Marcus Garvey
- `claude-mckay.jpg` — Claude McKay

They're auto-cropped to a circle and rendered in grayscale, so any portrait-ish
photo works. **Use properly-licensed images:** Marcus Garvey and Claude McKay
have well-known public-domain photographs (e.g. on Wikimedia Commons); Miss Lou
(d. 2006) is more likely still under copyright, so source hers with care.

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
