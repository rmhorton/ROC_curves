## Development History – Turtle Path ROC Curve App

### Overview
This document records the key design decisions, implementation steps, and course corrections made while building the Turtle Path ROC Curve application. It is written to provide both a permanent record of work completed and a guide for future feature development with a language model assistant.

---

### Feature Timeline

1. **Initial ROC Animation**
   - Implemented the ROC plot using D3.js, animating a turtle cursor that walks the ROC path step-by-step.
   - Confusion matrix updates synchronously with each step; grid lines and axis labels were rendered for reference.

2. **Cursor and Symbol Styling**
   - Unified symbol colours (positives, negatives, ties) and controlled idle states with a single opacity value.
   - Added support for custom SVG cursors; the turtle cursor now loads from the `/cursors` directory.
   - Introduced cursor rotation so the turtle faces the next ROC segment (formula refined to `Math.atan2(dy, dx) * 180 / Math.PI + 90`).
   - Bug fix: cursor initially sat in the upper-left. Adjusted the default transform so it starts at the ROC origin.
   - Added `rotateWithPath` flag and cursor selector dropdown to switch between built-in shapes or SVGs at runtime.

3. **Legend, Tie Regions, and ROC Grid Shading**
   - Replaced individual legend icons with full-sized SVG shapes to match plot symbols.
   - Moved tie region highlighting from special overlays to the grid shading logic so ties persist after the turtle passes.
   - Calculated shading categories per grid cell (below curve, above curve, tie); colouring is triggered column-by-column.
   - Corrected classification of above/below cells—initial implementation mislabelled some overlapping cells.
   - Configurable palette entries (`areaBelowCurve`, `areaAboveCurve`, `tieRegionFill`) allow shading to be hidden by matching the grid background.

4. **Partial AUC and Legend Enhancements**
   - Legend displays live AUC; partial values show until the turtle has coloured every column.
   - Added `showPartialAuc` configuration to defer the AUC display until the animation completes.
   - Titles for “Confusion Matrix” and “Legend” use matching typography and the entire legend sits in a light-grey card.
   - AUC computation includes tie cells (counted as half credit) and updates each time a new column is processed.

5. **Configuration Improvements**
   - Centralised all strings in `STRINGS`, including plot title, legend text, cursor labels, and confusion matrix header.
   - Added `LAYOUT.controls` flags to toggle the dataset selector, cursor selector, Play/Pause button, confusion matrix, legend, and partial AUC mode.
   - Added `LAYOUT.turtle.availableOptions` so all cursors listed in `/cursors` can be offered in the dropdown.
   - Ensured custom cursor offsets, scaling, and rotation are read from configuration; they override global defaults when present.

6. **User Documentation**
   - Replaced the user manual with a teacher-focused customisation guide. It explains every configuration option, shading logic, cursor workflow, and provides a checklist for preparing course-specific builds.

---

### Notable Corrections Along the Way
| Issue | Resolution |
| --- | --- |
| **Cursor ahead of path** – After tie/segment shading changes, the turtle ended up above-left of ROC points. | Tuned the SVG scaling and offsets, then anchored the turtle group at the origin before starting the animation. |
| **Misclassified grid cells** – Some cells above the ROC curve were coloured as “below”. | Revised the classification to compare cell row boundaries against the column’s pre-step TPR (`yBefore`). |
| **Tie shading fading out** – Tie rectangles turned transparent after the turtle moved on. | Removed the old overlay approach and relied on the grid colouring logic to keep tie cells opaque once revealed. |
| **Partial AUC request** – Teachers needed the option to hide partial AUC values. | Added `showPartialAuc` flag; legend stays blank until completion when set to false. |
| **Legend symbols too small** – Initial legend used characters inside grey circles. | Replaced with full SVG renderings that mirror the actual plot symbols. |
| **Context window overflow** – Development history grew large during iterative edits. | Trimmed conversation context and restarted instructions when necessary. |

---

### Reproducible Build Instructions
The following steps describe exactly how to recreate the current application. They can be used as prompts for a language model in a future development session.

1. **Project Structure**
   - Create a directory containing:
     - `turtle_path.html`
     - `turtle_config.js`
     - `cursors/` folder (place SVGs such as `turtle.svg`, `arrow.svg`, `smiley.svg`, `star.svg`)
     - `turtle_user_manual.md`
     - `development_history.md` (this file)

2. **HTML / D3 Animation**
   - Use D3.js (v7) to build the ROC chart:
     - Define margins, scales (`projectX` to handle `rtl` direction), and axes.
     - Animate a turtle group that translates to each ROC vertex; rotate it using `Math.atan2(dy, dx) * 180 / Math.PI + 90` when rotation is enabled.
     - Draw line segments, shading cells, and tie regions; apply opacity transitions based on the turtle’s step index.
     - Update the confusion matrix counters and the AUC after each step.
   - Ensure grid shading is computed per column, with categories `below`, `above`, and `tie`.
   - Add draggable confusion-matrix/legend container; initialise the turtle at the ROC origin.

3. **Configuration File (`turtle_config.js`)**
   - Export four objects: `STRINGS`, `PALETTE`, `DATASETS`, and `LAYOUT`.
   - Populate all text strings, dataset names, and axis labels.
   - Supply colours for symbols, shading regions, background, grid, and ROC stroke.
   - Provide datasets (scores/labels) and an ordered list in `DATASET_ORDER`.
   - Include layout options (margins, symbol sizes, idle opacity, animation delays, offsets).
   - Define controls (`showPlayPause`, `showDatasetSelector`, `showCursorSelector`, `showConfusionMatrix`, `showLegend`, `showPartialAuc`).
   - Specify cursor defaults (`defaultOption`, `availableOptions`) and per-cursor settings (offsets, size, rotation).

4. **UI Controls**
   - Render dataset selector, Play/Pause button, and optional cursor selector based on configuration flags.
   - Wiring:
     - Dataset change → rebuild visualisation for the new dataset.
     - Cursor change → rebuild turtle marker using `resolveCursor`.
     - Play/Pause → toggle `paused` and resume animation when re-enabled.

5. **Legend & AUC**
   - Rebuild the legend whenever datasets load or the shading is reset.
   - Include symbol entries for positive/negative and tie (if present) and colour entries for grid areas.
   - Compute AUC as `(#below + 0.5 * #tie) / totalCells`; suppress display when partial AUC is disabled and the animation is still in progress.

6. **Documentation**
   - Provide `turtle_user_manual.md` as a teacher-focused customisation guide (include configuration reference, shading notes, cursor instructions, and a checklist).
   - Maintain `development_history.md` (this document) alongside the project.

Following these instructions re-creates the current version of the Turtle Path ROC Curve app and provides a template for additional enhancements in future conversations.***
