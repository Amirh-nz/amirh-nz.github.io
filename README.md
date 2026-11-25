# Amirhossein Nazari – personal site

A static site: no build step, no framework. Open `index.html` in a browser.
(To test the weather widget and keep everything identical to production, serve the folder instead:
`python -m http.server` in this folder, then open http://localhost:8000)

## Structure

```
index.html            page content (About, Research, Projects, Music) + navigation
css/style.css         all styling (colours are the variables at the top of :root)
js/scene.js           3D silver watershed background (three.js)
js/tracks.js          YOUR PLAYLIST – edit this to add or change music
js/player.js          music player, playlist and beat sync
js/router.js          page switching (#about, #research, ...)
js/weather.js         local weather widget (Open-Meteo; IP location, precise if permission is on)
music/                audio files and their beat maps (*.beats.js)
tools/make_beatmap.py makes a beat map for a new track
```

## Common edits

- **Text and links:** edit `index.html`. Each page is a `<section class="view" id="...">`.
- **Add a publication/project:** copy one `<li class="item">…</li>` line and change it.
- **Add a page:** add `<a href="#blog">Blog</a>` to the `<nav>`, and a `<section class="view" id="blog">…</section>` next to the others. No JavaScript changes needed.
- **Add a track:** put the file in `music/`, add a line to `js/tracks.js`.
  For the background to pulse with it, run `python tools/make_beatmap.py music/yoursong.mp3`
  (needs ffmpeg + `pip install numpy scipy`) and add `beats:'music/yoursong.beats.js'` to that line.
  Without a beat map the track plays normally and the background just keeps flowing.
- **Colours / font:** `:root` at the top of `css/style.css`; the font is loaded from Google Fonts in `index.html`.
- **Background look:** `js/scene.js` – river count (`k<34`), rotation speed (`rot+=dt*.05`).

## Publishing

Upload the whole folder (keep the structure) to Netlify, GitHub Pages or Vercel.
