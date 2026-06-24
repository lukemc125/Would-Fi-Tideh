# Wud fi Tideh

A colourful, self-contained web page celebrating Jamaican Patois proverbs from
Donald Thompson's "Wud fi Tideh" podcast.

- **The Daily Wud** — today's proverb with its English translation and meaning.
- **Wuds of Wisdom** — five random proverbs turned into a two-host radio
  segment with a live transcript. Plays authentic per-proverb clips when present
  (see "Better voices" below), falling back to the browser voice otherwise.
- **Legends** — a tribute to Louise Bennett-Coverley ("Miss Lou") and Claude
  McKay, who made Patois a literary language.
- Day/night theme: **Sunsplash** by day, **Reggae Dusk** by night.

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
approximates Patois. For authentic Jamaican-accent audio, pre-generate a clip
for every proverb with [ElevenLabs](https://elevenlabs.io) (which has real
Jamaican voices). It's a one-time, offline step — no backend, no API key in the
browser — and the ~34 short proverbs sit well under the free tier.

1. Make a free ElevenLabs account, open **Voices → Voice Library**, add a
   Jamaican voice, and copy its **Voice ID**.
2. Generate the clips into `audio/proverbs/<slug>.mp3`:

   ```bash
   ELEVENLABS_API_KEY=your_key ELEVENLABS_VOICE_ID=your_voice_id npm run build:audio
   ```

   (Optional `ELEVENLABS_MODEL`, default `eleven_multilingual_v2`. Append
   `-- --force` to regenerate clips that already exist.)
3. Commit the generated `audio/proverbs/*.mp3` so they deploy with the site.

"Daily Wud → Hear it" and the patois lines in "Wuds of Wisdom" use these clips
automatically; anything missing falls back to the browser voice.

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
