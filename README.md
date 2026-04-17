# Annie-soulschool.github.io
Github repo for the liberation of all sentient beings. 


# Soul School Portal: Updating the Photo Carousel

> A gentle guide for future you (or anyone helping).

The carousel is meant to be easy to refresh. **You do not need to touch JavaScript to update photos** — just one HTML section.

---

## Where to Edit

Open `soul-school-portal.html` and find the **Carousel section**.

---

## Quick Update Flow

1. Add your new photo files to the folder `assets/Carousel-img/`
2. In the Carousel section, duplicate an existing image line
3. Replace the filename in `src` with your new file name
4. Update the `alt` text so it describes the image clearly
5. Repeat for each new photo
6. Delete any placeholder boxes you do not want

**Example image line:**
```html
<img src="../assets/Carousel-img/your-photo.jpg" alt="Short, clear description of the photo" class="carousel-image">
```

---

## Reorder Photos

The order on the page matches the order of image lines in the HTML. Move lines up or down to change which image appears first.

---

## Remove a Photo

Delete that image line from the Carousel section.

---

## Good Alt Text (Important)

Use simple, human descriptions:

- `"Soul School community gathering outdoors"`
- `"Small group in circle during evening session"`

Avoid vague alt text like `"image1"` or `"photo"`.

---

## Troubleshooting

### If an image does not appear
1. Check the file is actually in `assets/Carousel-img/`
2. Check spelling and capitalization match exactly
3. Confirm the path starts with `../assets/Carousel-img/`

### If images look cropped
That is normal with mixed photo shapes. The site uses `cover` styling so images fill the frame. If needed, use a wider image or crop before uploading.

