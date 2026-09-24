# 🎨 Purble Place Bakery - Sprite Replacement Guide

All game graphics have been split into modular placeholder sprites located in [`public/sprites/`](public/sprites/). You can drop in your own PNG or SVG image files with the same filenames to completely customize the visuals.

---

## 📂 Sprite Manifest & Dimensions

| Filename | Recommended Size | Description & Role |
| :--- | :--- | :--- |
| **`dispenser_batter.png`** | $140 \times 180\text{ px}$ | Overhead cake batter dispenser vat with pipe & mixing whisk |
| **`dispenser_icing.png`** | $140 \times 180\text{ px}$ | Overhead frosting piping dispenser with candy-striped tube |
| **`dispenser_sprinkles.png`** | $140 \times 180\text{ px}$ | Overhead glass globe dispenser filled with colorful sprinkles |
| **`order_tv.png`** | $160 \times 110\text{ px}$ | Wall-mounted TV screen displaying the target cake order |
| **`cake_plate.png`** | $140 \times 36\text{ px}$ | Scalloped paper napkin, doily, or metal baking pan under each cake |
| **`cake_bottom_layer.png`** | $120 \times 42\text{ px}$ | Strawberry pink bottom cake sponge layer |
| **`cake_cream.png`** | $114 \times 18\text{ px}$ | Wavy whipped white cream filling between cake layers |
| **`cake_middle_layer.png`** | $106 \times 38\text{ px}$ | Chocolate sponge middle cake layer |
| **`cake_top_layer.png`** | $92 \times 34\text{ px}$ | Golden lemon yellow top cake layer |
| **`cake_topper_smiley.png`** | $48 \times 48\text{ px}$ | Yellow smiley face sugar decoration |
| **`cake_topper_strawberry.png`** | $48 \times 48\text{ px}$ | Fresh cherry or strawberry decoration |
| **`conveyor_belt.png`** | $128 \times 80\text{ px}$ | Repeating seamless conveyor belt tread segment |
| **`conveyor_roller.png`** | $48 \times 48\text{ px}$ | Mechanical spinning roller wheel under the belt |
| **`console_panel.png`** | $640 \times 180\text{ px}$ | Purble Place console with cake pan, batter, and icing buttons |
| **`trash_can.png`** | $100 \times 180\text{ px}$ | Metal disposal trash chute on the right side of the conveyor |
| **`plate.png`** | $592 \times 212\text{ px}$ | Empty white ceramic plate that arrives first on the conveyor belt |
| **`cake.png`** | $729 \times 342\text{ px}$ | Sponge cake layer that drops from the overhead Bake machine nozzle |
| **`cake_plate.png`** | $348 \times 254\text{ px}$ | Golden sponge cake resting on plate (Stage 1 completed item) |
| **`frosting.png`** | $505 \times 494\text{ px}$ | Strawberry frosting droplet with rainbow sprinkles dropping from Glaze machine |
| **`cake_glazed.png`** | $343 \times 231\text{ px}$ | Glazed cake with strawberry frosting, sprinkles & cherry on plate (Stage 2 completed item) |
| **`box.png`** | $342 \times 221\text{ px}$ | Clear translucent bakery display box dropping from Packaging machine |
| **`cake_boxed.png`** | $342 \times 207\text{ px}$ | Finished glazed cake packaged inside the display box (Stage 3 completed item) |
| **`button_green.png`** | $72 \times 72\text{ px}$ | Chunky green push button (sets speed to 1.0 GHz) |
| **`button_purple.png`** | $72 \times 72\text{ px}$ | Chunky purple turbo push button (sets speed to 5.0 GHz) |

---

## 💡 How to Replace Sprites

1. Create or export your PNG image with transparency.
2. Save it directly to `public/sprites/<filename>.png` replacing the placeholder.
3. Refresh your browser window—the game will immediately display your new artwork!

