# AGENTS.md

## Cursor Cloud specific instructions

This is a vanilla static website (HTML + CSS + JS) with **no build step, no package manager, and no dependencies**.

### Running the app

Serve the `/workspace` directory with any static HTTP server:

```bash
python3 -m http.server 8765
# then visit http://localhost:8765
```

The app fetches puppy images live from the [Dog CEO API](https://dog.ceo/api/) — **internet connectivity is required** at runtime.

### Lint / Test / Build

- **No linter** is configured.
- **No automated tests** exist.
- **No build step** — the site is served as-is from `index.html`, `styles.css`, and `app.js`.

### Key files

| File | Purpose |
|------|---------|
| `index.html` | Markup and views |
| `styles.css` | Pink + hearts theme styling |
| `app.js` | Fetching, swipe physics, album persistence (localStorage) |
