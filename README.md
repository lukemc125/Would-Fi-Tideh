# Wud fi Tideh

A colourful, self-contained web page celebrating Jamaican Patois proverbs from
Donald Thompson's "Wud fi Tideh" podcast.

- **The Daily Wud** — the day's three proverbs, each with its English translation
  and meaning. "Gimme anodda one" cycles through the three (fixed for the day,
  fresh tomorrow); "Back to today" returns to the first. The same three feed
  Wuds of Wisdom.
- **Wuds of Wisdom** — a studio with switchable **channels**. *Di Daily Three*
  voices the day's three proverbs (the same set as The Daily Wud — seeded, fixed
  for the day, fresh tomorrow) as a two-host radio segment with a live transcript;
  its proverb lines prefer Donald's real recordings (see "Real recordings" below),
  then the generated clips, then the browser voice. Alongside it, the studio
  unlocks **one real podcast episode per Jamaica calendar day** — the same episode
  for everyone, with tomorrow's episode available only through a small preview
  control.
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

Donald's real recorded readings live in `audio/recordings/` as `<slug>.mp3`, one
per proverb. Wherever a proverb is spoken (Daily Wud "Hear it", the patois lines
in Wuds of Wisdom), the site plays the real recording first, falling back to the
generated clip (and then the browser voice) if the file is missing or can't
decode. To replace a reading, drop a new `<slug>.mp3` with the same name. The
quiz's ear
tests deliberately stay on the generated clips so the blanked word is always a
clean, single phrase.

## Real episodes

The studio unlocks one of Donald's actual, longer podcast episodes each day —
his two-host NotebookLM sessions, one per theme. They live in
`audio/episodes/` as `<theme>.mp3` (mono, ~96 kbps — the sources are mono-summed,
so nothing is lost):

- `accountability.mp3`, `clarity.mp3`, `faith.mp3`, `family.mp3`, `work.mp3`

Everyone receives the same daily episode in a five-day rotation; tomorrow is
always the next theme. The visible **Preview tomorrow** control is for testing
the next unlock without waiting until midnight. Each episode rides the same
studio pipeline as a one-clip session, so the ON AIR sign,
VU meter, and host avatars all react to the real audio. Because the recordings
are a single mono mix (no per-speaker channel, and no local transcript), the two
on-screen hosts can't be truly diarised — instead their turn-taking is **derived
from the audio itself**: when the level drops into a gap and picks back up, the
mic hands to the other host (`Studio.autoTurns`, tuned by `TURN_*` in
[`js/studio.js`](js/studio.js)). To swap an episode, drop a replacement `.mp3`
with the same name; to add a theme, add a file plus an entry in `EPISODES`
([`js/app.js`](js/app.js)).

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
