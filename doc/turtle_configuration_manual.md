# Turtle Path ROC Curve – Customisation Manual for Teachers

## 1. Introduction

The Turtle Path ROC Curve app is a browser-based teaching tool that animates how a classifier walks along a Receiver Operating Characteristic (ROC) curve. Every threshold step moves the “turtle”, recolours the ROC grid, and updates the confusion matrix and AUC.  

This manual is written for instructors who plan to adapt the app for their own lessons—across medicine, pharmacology, bioinformatics, statistics, data science, or machine learning. By editing a single configuration file (`turtle_config.js`) you can localise text, swap datasets, adjust colours, change the cursor, and show only the controls that matter for your learners.

---

## 2. Quick Setup

1. Keep `turtle_path.html`, `turtle_config.js`, and the `cursors/` folder together.
2. Open `turtle_path.html` in a modern browser.  
3. Modify `turtle_config.js`, save, and refresh the page to see your changes.

If the Play/Pause button is visible (default), the turtle starts in the paused state so you can describe the layout before playing the animation. If you hide the button, the turtle runs automatically.

---

## 3. What the App Shows

| Region | Behaviour |
| --- | --- |
| **Plot title** | Configurable (`STRINGS.plot.title`). |
| **ROC grid** | The turtle steps through the ROC path. Each time it crosses a new column, the cells below the curve, the cells above the curve, and any tie regions are shaded. |
| **Case symbols** | Positives (circles), negatives (diamonds), and tie steps (squares). Idle symbols use `LAYOUT.opacities.idle`; the current step is fully opaque. |
| **Cursor** | Choose between built-in shapes (None, Circle, Square) or any SVG stored in `cursors/`. Rotation is optional. |
| **Confusion matrix** | Displays TP, FP, FN, TN counts that update with each step. The panel is draggable. |
| **Legend** | Shows the symbols, area colours, and AUC. The legend mirrors the dataset—tie entries only appear when there are tied scores. |
| **Controls** | Dataset selector, Play/Pause button, optional cursor selector. All can be shown or hidden individually. |

---

## 4. Configuration Overview

All options live in `turtle_config.js`. Reload the browser after editing.

### 4.1 Strings (`STRINGS`)

| Key group | Description |
| --- | --- |
| `pageTitle` | Browser tab title. |
| `plot.title` | Title displayed above the ROC chart. |
| `datasetLabel` | Label beside the dataset selector. |
| `control.play`, `control.pause` | Text on the Play/Pause button. |
| `confusion` | Titles and labels for the confusion matrix table. |
| `legend` | Legend header plus row labels for each item and AUC captions. |
| `cursor` | Label and option names for the cursor selector. |
| `tooltip` | Strings used inside point tooltips. |
| `datasets` | Friendly names for each dataset (keys must match `DATASETS`). |
| `axes.xLabel`, `axes.yLabel` | Axis captions (e.g., change to “Specificity” when reversing the x-axis). |

### 4.2 Colours (`PALETTE`)

| Key | Use |
| --- | --- |
| `positive`, `negative`, `tie` | Fill colours for the symbols. |
| `areaBelowCurve`, `areaAboveCurve`, `tieRegionFill` | Colours for the shaded grid cells once the turtle has passed a column. To hide a category, set the colour equal to `gridBackground`. |
| `plotBackground`, `gridBackground`, `gridLine` | Plot backdrop and grid lines. |
| `rocStroke` | Polyline colour. |
| Remaining keys | Style the confusion matrix, legend card, panels, etc. |

### 4.3 Datasets (`DATASETS` & `DATASET_ORDER`)

* Each dataset entry requires `scores` (descending numeric values) and `labels` (1 for positive, 0 for negative).
* Every dataset must contain at least one positive and one negative case.
* Add new datasets, then reference the key in `DATASET_ORDER` to show it in the dropdown. Dataset order follows the array.

### 4.4 Layout & Animation (`LAYOUT`)

| Section | Keys | Purpose |
| --- | --- | --- |
| `margin` | `top`, `right`, `bottom`, `left` | Padding applied inside the SVG so titles, axes, and large cursors fit. |
| `symbolSizes` | Radii for origin, points, tie symbols, turtle fallback | Adjust icon sizes. |
| `opacities.idle` | Idle opacity used across all non-active symbols, segments, and cells. |
| `animation` | `stepDelay`, `resetDelay` | Millisecond delays between steps and before the animation restarts. |
| `layoutOffsets` | `confusionQuadrantX`, `confusionQuadrantY`, `minPadding` | Default position of the confusion/legend panel relative to the plot size. |
| `grid` | `enabled`, `lineWidth`, `showOuterBorder`, `axisLabelOffset` | Controls grid drawing and axis label offset. |

### 4.5 Cursor Options (`LAYOUT.turtle`)

| Key | Description |
| --- | --- |
| `shape` | Fallback shape when no SVG is selected (`"square"` or `"circle"`). |
| `size` | Maximum dimension used both for fallback shapes and for scaling SVG cursors. |
| `useSvgCursor` | Enables SVG cursor support. |
| `svgUrl` | Default SVG file (relative path). |
| `svgOffsetX`, `svgOffsetY` | Fine alignment tweaks applied after scaling. |
| `rotateWithPath` | Whether the cursor rotates toward the next ROC step. |
| `defaultOption` | Which cursor is selected on load (value from the list below). |
| `availableOptions` | Array of custom cursor entries: `{ label, value, svgOffsetX, svgOffsetY, size, rotateWithPath }`. |

**Adding custom cursors**

1. Draw or edit the icon in Inkscape (or similar) so the turtle/arrow is centred and upright.  
2. Save the SVG to the `cursors/` directory.  
3. Add an entry in `availableOptions` with the relative path (e.g., `"cursors/arrow.svg"`).  
4. Optional: override `size`, `svgOffsetX`, `svgOffsetY`, or `rotateWithPath` for that specific cursor.

### 4.6 UI Controls (`LAYOUT.controls`)

| Flag | Behaviour |
| --- | --- |
| `showPlayPause` | Displays the Play/Pause button. |
| `showDatasetSelector` | Displays the dataset dropdown. |
| `showCursorSelector` | Displays the cursor dropdown. |
| `showConfusionMatrix` | Show/hide the confusion matrix table. |
| `showLegend` | Show/hide the legend and AUC display. |
| `showPartialAuc` | When false, AUC is hidden until the turtle finishes the walk. |

---

## 5. Shaded ROC Grid & AUC

* **Below curve** cells (default `#ffeeaa`) represent pairwise wins.  
* **Above curve** cells (`#ff3333`) represent losses.  
* **Tie cells** (`#ff9900`) indicate equal scores.  
* As the turtle passes each column, the corresponding cells become opaque and the AUC updates:

  \[
  \text{AUC} = \frac{\text{cells below} + 0.5 \times \text{tie cells}}{\text{total cells}}
  \]

* When `showPartialAuc` is true, the legend displays “AUC (partial)” until all columns are processed. Set `showPartialAuc` to false to withhold the number until the animation completes.
* If you prefer not to colour certain regions, set `areaBelowCurve`, `areaAboveCurve`, or `tieRegionFill` to the same value as `gridBackground`.

---

## 6. Cursor Selector

When `showCursorSelector` is enabled:

* The dropdown includes built-in options (None, Circle, Square) and every SVG defined in `availableOptions`.
* Learners can explore different cursors while the animation runs.
* Disable the selector (`showCursorSelector: false`) to lock in a single cursor.

---

## 7. Confusion Matrix & Legend

* Both titles use the same font size and are centred.  
* The legend lives in a light-grey card that matches the confusion matrix.  
* The entire panel is draggable so you can reposition it away from important geometry.  
* `showConfusionMatrix` and `showLegend` can be toggled independently; the panel disappears entirely if both are false.

---

## 8. Extending the App

* **Styling beyond config:** The CSS block at the top of `turtle_path.html` can be edited for further branding (fonts, panel colours, etc.).  
* **Extra controls:** Follow the pattern of the cursor selector to add new dropdowns or buttons (e.g., speed sliders).  
* **Embedding:** Wrap the page in an `<iframe>` or load both files in platforms like R Shiny or htmlwidgets; the configuration file remains the single source of truth.

---

## 9. Customisation Checklist

1. Update `STRINGS` with localised plot titles, labels, and legend wording.  
2. Tailor datasets in `DATASETS` and `DATASET_ORDER`.  
3. Set colours in `PALETTE`; match area colours to `gridBackground` to hide them.  
4. Adjust `LAYOUT.turtle` so the default cursor and available choices reflect your lesson.  
5. Toggle visibility of controls and panels via `LAYOUT.controls`.  
6. Tune `LAYOUT.animation` and margins.  
7. Save and reload `turtle_path.html`, then walk through the complete ROC path to confirm behaviour.  
8. Package your customised app with lesson handouts or embed it in a slide deck/web page.

Adapting the Turtle Path ROC Curve app is intentionally flexible. With a few edits you can align the visuals, text, and interaction with whichever ROC-focused story you need to teach. Happy customising, and may your students enjoy following the turtle on its journey!***
