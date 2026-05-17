# Julia's Pups 🐾💖

A cute, pale-pink, Tinder-style lookbook for puppy photos. Swipe right to save the cuties to your album, swipe left to pass.

## Features

- 💕 Pale pink theme with floating hearts and a Pacifico script logo
- 🐶 100 puppy photos sourced live from the [Dog CEO API](https://dog.ceo/dog-api/) (golden retrievers, pomeranians, corgis, samoyeds, huskies, malteses, and more)
- 👉 Drag-to-swipe cards with rotation, Love/Nope stamps, and a burst of hearts when you save
- 🔘 Tap buttons for ♥ (save), ✕ (pass), and ↺ (undo)
- 🏷️ Hover any photo to see the breed
- 📔 "My Album" tab with a grid of saved pups, persisted to `localStorage`

## Run it

It's a static site — just open `index.html`, or serve the folder:

```bash
python3 -m http.server 8765
# then visit http://localhost:8765
```

## Files

- `index.html` — markup and views
- `styles.css` — the pink + hearts theme
- `app.js` — fetching, swipe physics, persistence
