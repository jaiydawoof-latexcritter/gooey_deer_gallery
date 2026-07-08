# How to Add Images to Jaiy's Gallery

## Quick Summary
1. Upload image to the right folder on GitHub
2. Edit `gallery.json` (or `refs.json`) to add one entry
3. Commit — site updates automatically

---

## Folder Structure

```
images/
├── gallery/
│   ├── sfw/
│   │   ├── gooey/       ← SFW Gooey art
│   │   ├── pooltoy/     ← SFW Pooltoy art
│   │   ├── normal/      ← SFW Normal art
│   │   ├── fursuit/     ← SFW Fursuit art
│   │   ├── latex/       ← SFW Latex art
│   │   └── other/       ← SFW Other art
│   └── nsfw/
│       ├── gooey/       ← NSFW Gooey art
│       ├── pooltoy/     ← NSFW Pooltoy art
│       ├── normal/      ← NSFW Normal art
│       ├── fursuit/     ← NSFW Fursuit art
│       ├── latex/       ← NSFW Latex art
│       └── other/       ← NSFW Other art
└── refs/
    ├── sfw/
    │   └── ArtistName/  ← rename to actual artist
    └── nsfw/
        └── ArtistName/  ← rename to actual artist
```

---

## Step-by-Step: Adding a Gallery Image

### Step 1 — Upload the image

1. Go to the right folder, for example for a SFW Gooey image:
   `https://github.com/jaiydawoof-latexcritter/gooey_deer_gallery/tree/main/images/gallery/sfw/gooey`
2. Click **Add file → Upload files**
3. Drag your image in
4. **Name it:** `ArtistName_description.jpg`
   - Example: `Rukis_gooey_jaiy.jpg`
   - Example: `WildWuff_latex_commission.png`
5. Click **Commit changes**

### Step 2 — Add an entry to gallery.json

1. Open `gallery.json` in the repo root
2. Click the pencil ✏️ edit button
3. Add a new entry inside the `[` `]` array:

```json
{
  "src": "images/gallery/sfw/gooey/Rukis_gooey_jaiy.jpg",
  "title": "Gooey Jaiy",
  "artist": "Rukis",
  "type": "Gooey",
  "rating": "SFW"
}
```

4. Make sure to add a comma after the previous entry if one exists
5. Click **Commit changes**

---

## Step-by-Step: Adding a Reference Sheet

### Step 1 — Create an artist folder (first time only)

1. Go to: `https://github.com/jaiydawoof-latexcritter/gooey_deer_gallery/new/main`
2. In the filename box type: `images/refs/sfw/ArtistName/.gitkeep`
   (replace ArtistName with the actual artist name)
3. Add a space in the editor, click **Commit changes**

### Step 2 — Upload the ref sheet

1. Navigate to: `images/refs/sfw/ArtistName/`
2. Click **Add file → Upload files**
3. Upload the ref sheet image
4. Click **Commit changes**

### Step 3 — Add an entry to refs.json

```json
{
  "src": "images/refs/sfw/ArtistName/ref_v1.jpg",
  "title": "Jaiy Ref Sheet v1",
  "artist": "ArtistName",
  "rating": "SFW",
  "version": "v1"
}
```

---

## Image Naming Tips

| Do | Don't |
|----|-------|
| `Rukis_gooey_jaiy.jpg` | `IMG_0032.jpg` |
| `WildWuff_latex_2024.png` | `commission final FINAL v2.png` |
| `ArtistName_description.webp` | `untitled.jpg` |

- Start with **ArtistName** — the gallery auto-reads it from the filename
- Use underscores instead of spaces
- Supported formats: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`
- Max recommended size: **25MB** per image (GitHub limit)

---

## Updating gallery.json Automatically (Optional)

If you have Python installed, you can auto-generate `gallery.json` instead of editing it manually:

```bash
# Clone the repo locally
git clone https://github.com/jaiydawoof-latexcritter/gooey_deer_gallery.git
cd gooey_deer_gallery

# Drop images into the right folders, then run:
python build_gallery.py

# Commit and push
git add gallery.json refs.json
git commit -m "Update gallery"
git push
```

---

## Quick Reference — Rating Values

| Value | Meaning |
|-------|---------|
| `SFW` | Safe for work — visible to everyone |
| `NSFW` | Not safe for work — hidden behind age gate |

---

## After Adding Images

The site at **gooeydeer.com** updates automatically within ~2 minutes of committing. No other steps needed!
