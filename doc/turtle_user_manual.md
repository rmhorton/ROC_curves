# Turtle Path ROC Curve – User Manual

## 1. Overview

The Turtle Path ROC Curve app is an interactive, browser-based visualization for explaining how a binary classifier “walks” a Receiver Operating Characteristic (ROC) curve. Each step represents moving the decision threshold past one or more cases. The app shows:

- The ROC path traced on a 0–1 grid.
- A “turtle” marker that marches along the path step-by-step.
- Case symbols (positive circles, negative diamonds, mixed tie squares) that highlight when they participate in the current step.
- A confusion matrix that updates in real time.

Everything runs client-side. Opening `turtle_path.html` in any modern browser is enough to try the app. Styling, behaviour, and datasets are configurable through `turtle_config.js`.

---

## 2. Project Layout

```
turtle_path.html          # Main application page
turtle_config.js         # Configuration: strings, colours, datasets, layout
turtle_user_manual.md    # This document
```

Only the highlighted HTML and JS files are required for the app; the rest provide supporting material.

---

## 3. Getting Started

1. **Ensure both files are together:** `turtle_path.html` and `turtle_config.js` must reside in the same directory.
2. **Open the page:** Double-click `turtle_path.html` or drag it into a browser window (Chrome, Edge, Firefox, Safari).
3. **Grant local file access if prompted:** Some browsers require you to grant access for local scripts or data.
4. **Initial state:**  
   - If the Play/Pause control is **enabled** (default), the animation loads *paused*. Hit **Play** to begin.  
   - If the control is **disabled**, the turtle begins walking immediately.

---

## 4. UI Tour

| Region | Description |
| --- | --- |
| **Plot area** | A square grid that spans 0 → 1 on both axes. The background is configurable and shows the walking area for the turtle. |
| **Grid lines** | Optional; one column per negative case and one row per positive case so you can see the discrete steps. |
| **ROC curve** | Thick blue polyline (`PALETTE.rocStroke`) joining all path points in threshold order. |
| **Case symbols** | Positive cases are circles, negative cases are diamonds, and mixed-score steps are purple squares. Idle symbols are partially transparent; active symbols brighten to full opacity. |
| **Turtle** | A square (by default) that marks the current threshold step. You can replace it with a custom SVG. |
| **Confusion matrix** | Displays TP/FP/FN/TN counts. It’s draggable — grab the panel to move it away from the plot. |
| **Controls** | A dataset selector and Play/Pause button. Either or both can be disabled via configuration. |

---

## 5. Animation Flow

1. Datasets are sorted by score (descending) and grouped by equal score.
2. Each step consumes all cases at a given score:
   - Positive cases increase the True Positive Rate (TPR).
   - Negative cases increase the False Positive Rate (FPR).
3. The turtle translates to the new ROC coordinate.
4. The confusion matrix increments/decrements the relevant counts.
5. Idle case symbols are semi-transparent (opacity from `LAYOUT.opacities.idle`), while cases in the current step fade to full opacity (1.0).
6. When the turtle reaches the final point, it pauses for `LAYOUT.animation.resetDelay` and restarts from the origin.

---

## 6. Controls

| Control | Behaviour | Config toggle |
| --- | --- | --- |
| **Play / Pause** | Starts or halts the walk. When enabled the app loads *paused* so the user explicitly starts playback. | `LAYOUT.controls.showPlayPause` (default `true`) |
| **Dataset selector** | Switches between predefined datasets. Selecting a new dataset resets the animation and confusion matrix. | `LAYOUT.controls.showDatasetSelector` (default `true`) |

If you hide the Play/Pause button, the animation auto-runs. If you hide the selector, the first dataset in `DATASET_ORDER` loads automatically.

---

## 7. Configuration Reference (`turtle_config.js`)

The configuration file exports four constants. Editing them lets you localise text, adjust styling, supply new data, or tweak behaviour without touching the main HTML.

### 7.1 `STRINGS`

| Key | Purpose |
| --- | --- |
| `pageTitle` | Title bar text. |
| `datasetLabel` | Label shown next to the dataset selector. |
| `control.play`, `control.pause` | Labels for the Play/Pause button. |
| `confusion` | Header text for each confusion matrix cell. |
| `tooltip` | Labels used inside `<title>` tooltips for case symbols. |
| `datasets` | Human-readable names for each dataset in `DATASETS`. |
| `axes.xLabel`, `axes.yLabel` | Axis captions. For specificity, set `xLabel` accordingly. |

### 7.2 `PALETTE`

| Key | Purpose |
| --- | --- |
| `positive`, `negative`, `tie` | Base colours for positive cases, negative cases, and mixed-score (tie) squares. |
| `tieRegionFill` | Fill colour for mixed-score rectangles. Set this to match `gridBackground` if you prefer not to display tie regions. |
| `areaBelowCurve`, `areaAboveCurve` | Colours used to shade grid cells below or above the ROC curve once the turtle has passed them. Match these to `gridBackground` to hide the shading. |
| `pointStroke`, `shapeStroke` | Outline colours for case symbols. |
| `originFill`, `originStroke` | Styling for the origin point. |
| `baselineStroke` | Colour for the diagonal baseline. |
| `turtleStroke` | Outline colour for the turtle marker. |
| `plotBackground` | Fill colour for the entire plot canvas. |
| `gridBackground` | Fill colour for the inner grid (if enabled). |
| `gridLine` | Grid line colour. |
| `rocStroke` | Colour for the ROC curve polyline. |
| `panel` / `control` colours | Styles for the drag-able confusion matrix and buttons. |

### 7.3 `DATASETS` and `DATASET_ORDER`

- `DATASETS` maps a name to `scores` (descending numeric values) and `labels` (1 = positive, 0 = negative).
- `DATASET_ORDER` controls which datasets appear in the selector and the order they load.
- **Rule:** Each dataset must contain at least one positive and one negative case. Otherwise the app alerts and skips rendering.

You can add new datasets by defining a new object and referencing its key in `DATASET_ORDER`.

### 7.4 `LAYOUT`

| Section | Keys | Description |
| --- | --- | --- |
| `margin` | `top`, `right`, `bottom`, `left` | Padding around the plot inside the SVG. Increase these values if custom axis labels are clipped. |
| `symbolSizes` | `originRadius`, `positiveRadius`, `negativeRadius`, `tieSize`, `turtleRadius` | Dimensions (in pixels) for the various symbols. Only the turtle size is used when the fallback circle is active. |
| `opacities` | `idle` | Idle opacity applied to every non-active element (points, segments, tie areas). Active items are rendered at full opacity (`1`). |
| `animation` | `stepDelay`, `resetDelay` | Delay (ms) between steps and the pause before restarting at the origin. |
| `layoutOffsets` | `confusionQuadrantX`, `confusionQuadrantY`, `minPadding` | Default position for the confusion matrix relative to the plot. Adjust if the panel overlaps other content. |
| `grid` | `enabled`, `lineWidth`, `showOuterBorder`, `axisLabelOffset` | Show or hide the grid, change stroke width/offset, and configure label distance from axes. |
| `turtle` | `shape`, `size`, `strokeWidth`, `useSvgCursor`, `svgUrl`, `svgOffsetX`, `svgOffsetY`, `rotateWithPath` | Switch between the built-in square/circle markers or load a custom SVG cursor. `size` controls the overall footprint; offsets let you nudge the art after export. Set `rotateWithPath=false` to keep the cursor upright. |
| `axes` | `xDirection` | `"ltr"` for False Positive Rate, `"rtl"` for Specificity (reverses the axis and labels). |
| `controls` | `showPlayPause`, `showDatasetSelector` | Toggle UI elements. See §6 for details. |

---

## 8. Reading the Visualisation

1. **Idle state (paused)**  
   - All case symbols appear with partial transparency.  
   - The turtle sits at the origin (0,0).  
   - Confusion matrix counts show full positives as FN and full negatives as TN.

2. **During playback**  
   - Each step highlights the active case symbols at full opacity.  
   - The turtle moves to the next node along the ROC curve.  
   - Confusion matrix counts update accordingly.  
   - Each grid column the turtle has passed fills in: cells below the curve use `areaBelowCurve`, cells above use `areaAboveCurve`, and tie rectangles use `tieRegionFill`. Set these colours to match `gridBackground` if you prefer no shading.

3. **Looping**  
   - When the turtle reaches the final point (1,1), the animation pauses for `resetDelay`, resets counts, and restarts.

---

## 9. Customising the Turtle Marker

The app currently draws the turtle as a square or circle based on `LAYOUT.turtle.shape`. To substitute a custom SVG:

1. Export or draw your turtle so that the design is centred in the SVG canvas (the point you want aligned with the ROC threshold should sit at the page origin). If you want the turtle to lead the threshold slightly, simply nudge the drawing upward before exporting.
2. Place the exported file in the project and point `LAYOUT.turtle.svgUrl` to it. Adjust `size` for overall scale and, if needed, tweak `svgOffsetX`/`svgOffsetY` for fine positioning (defaults are `0`). Set `rotateWithPath` to `false` if your cursor should remain upright.

The renderer reads the SVG’s intrinsic dimensions at runtime, centres it automatically, then applies the scale/offset so the turtle glides directly atop each threshold point.

---

## 10. Tips and Troubleshooting

| Symptom | Likely Cause | Fix |
| --- | --- | --- |
| **Axes/grid disappear** | JavaScript error due to malformed config or page cached prior to rebuild. | Check browser console; ensure `turtle_config.js` loads without syntax errors. Refresh with cache disabled. |
| **No animation** | Dataset lacks positives or negatives; Play/Pause hidden but animation paused. | Confirm dataset counts; if Play/Pause is shown, click Play. |
| **Confusion matrix overlaps plot** | Window rescaled, panel dragged off-screen. | Drag the panel to a new position or edit `LAYOUT.layoutOffsets`. |
| **Turtle jumps erratically** | Custom SVG not centered or transforms misordered. | Ensure the turtle graphic is centered at the origin before translation. |

---

## 11. Extending the App

- **More datasets:** Add to `DATASETS`, append the key to `DATASET_ORDER`, and optionally update `STRINGS.datasets`.
- **Internationalisation:** Translate labels in `STRINGS` and adapt axis direction for specificity (`LAYOUT.axes.xDirection = "rtl"`).
- **Styling:** Adjust `PALETTE` colours and `LAYOUT.opacities` to meet branding needs.
- **Embedding in HTML widgets:** Refactor the animation and configuration code into a factory function to integrate with frameworks such as R’s `htmlwidgets`, Shiny, or React (see suggestions in the source comments).

---

## 12. Version History Highlights

- **Turtle-aware configuration:** `LAYOUT.controls` toggles interactions; turtle can pause on load.
- **Axis direction handling:** `LAYOUT.axes.xDirection` flips the x-axis for specificity.
- **Grid enhancements:** Configurable fill colour and optional border with per-case divisions.
- **Colour simplification:** Single colour per case category with adjustable idle opacity.

Keep this manual alongside the project for quick reference when onboarding new users or tweaking the visual. Happy ROC-walking!
