# Wud fi Tideh

A colourful, self-contained web page celebrating Jamaican Patois proverbs from
Donald Thompson's "Wud fi Tideh" podcast.

- **The Daily Wud** — today's proverb with its English translation and meaning.
- **Wuds of Wisdom** — five random proverbs turned into a two-host radio
  segment, spoken aloud by the browser, with a live transcript.
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
