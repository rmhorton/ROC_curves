# Continuous ROC Explorer Development Roadmap

**This roadmap document will be saved as `ContinuousROC_Explorer_Roadmap_v1.15.md`. Codex may reference this filename directly.** (Starting at v1.15.1)

*(Full multi-version roadmap with Codex prompts for each minor version. Each version is small enough for a single Codex session.)*

---

# Version v1.15.1 — Mixture Component Removal + Per-Class Normalize Buttons

## A. Goals
- Add "X" remove buttons for mixture components (positive & negative).
- First component in each class cannot be removed.
- Add **Separate** Normalize Weights buttons:
  - `Normalize Positive Weights`
  - `Normalize Negative Weights`
- Normalization ensures each class's weights sum to 1.
- Trigger standard redraw; ROC shapes remain unchanged.

## B. Implementation Plan
- Modify UI in `continuous_ROC.html` where mixture components are rendered.
- Add **remove** buttons for indices > 0.
- Add event delegation to remove the component and re-render.
- Add two Normalize Weight buttons, visible only if component count ≥ 2.
- Implement `normalizeWeightsForClass('positive'|'negative')`.
- Trigger the same update pipeline used when editing parameters.
- Ensure minimum 1 component per class.

## C. Codex Prompt
```
Implement roadmap milestone v1.15.1 from the roadmap document `ContinuousROC_Explorer_Roadmap_v1.15.md`.

Goal: Add removable mixture components and per-class Normalize Weights buttons.

Files: continuous_ROC.html, ROC_lib.js
Roadmap section: v1.15.1

Tasks:
1. Add X buttons to each mixture component row (positive and negative) except index 0.
2. Add click handlers to remove components and re-render.
3. Ensure that the first component and the last remaining component cannot be removed.
4. Add Normalize buttons for each class, only visible when component count >= 2.
5. Implement normalizeWeightsForClass(className) and hook into update pipeline.
6. Test manually.

Follow the details in the v1.15.1 roadmap section.
```

---

# Version v1.15.2 — Config-Driven Color System

## A. Goals
- Introduce `roc_colors.json` configuration file.
- Positive = blue family, Negative = red family.
- Use hex hue + opacity for curve/histogram/rug.
- Replace all hard-coded colors with config-derived values.

## B. Implementation Plan
- Create `config/roc_colors.json` with positive/negative hue + opacity fields.
- Add helper in JS to convert hex + opacity to rgba.
- Replace all color assignments for curves/histograms/rugs.

## C. Codex Prompt
```
Implement roadmap milestone v1.15.2.

Goal: Replace all hard-coded colors with config-driven hues and opacities.

Files: continuous_ROC.html, ROC_lib.js, create new config/roc_colors.json
Roadmap section: v1.15.2

Steps:
1. Create roc_colors.json per roadmap.
2. Implement helper hex + opacity -> rgba.
3. Replace all occurrences of positive/negative colors in D3 drawing code using the config.
4. Verify consistency.

Follow roadmap details exactly.
```

---

# Version v1.15.3 — Interactive D3 Legends (Score Distributions & ROC)

## A. Goals
- Add interactive legends below both plots.
- Legend entries (swatches only clickable) toggle visibility.
- Remove show/hide checkboxes.
- Visibility persists across redraws.

## B. Implementation Plan
- Add `visibilityState` global object.
- Build SVG or HTML legends.
- Wire swatch click → toggle → redraw.
- Remove old checkboxes.

## C. Codex Prompt
```
Implement roadmap milestone v1.15.3.

Goal: Add interactive legends for Score Distributions and ROC plots.

Files: continuous_ROC.html
Roadmap: v1.15.3

Steps:
1. Add visibilityState object.
2. Build legends with clickable swatches.
3. Modify draw functions to respect visibilityState.
4. Remove old checkboxes.
5. Ensure visibility persists across redraws.

Follow roadmap.
```

---

# Version v1.15.4 — State Export in ROC Metadata

## A. Goals
- Store distribution definitions, parameters, weights, sampling settings, ROC points for samples, histograms, curve name, AUC.
- Store under `metadata.continuous_roc_explorer`.
- Exclude display settings.

## B. Implementation Plan
- Identify where metadata is attached to curve JSON.
- Add `state = { distributions, samplingSettings, samplesROC, samplesHist, auc, name }`.
- Ensure sampling settings include all to reproduce future samples.

## C. Codex Prompt
```
Implement milestone v1.15.4.

Goal: Add state export under metadata.continuous_roc_explorer.

Files: continuous_ROC.html, ROC_lib.js
Roadmap: v1.15.4

Tasks:
1. Build state object as specified.
2. Add to metadata when exporting curves.
3. Ensure no display settings are included.
4. Include AUC and curve name.

Follow roadmap.
```

---

# Version v1.15.5 — State Import (Full UI Restore)

## A. Goals
- Import curve JSON and restore UI state.
- Restore distributions, parameters, mixture weights, sampling settings.
- All elements visible upon import.
- Ignore missing fields (fallback to current UI values).

## B. Implementation Plan
- Parse `metadata.continuous_roc_explorer`.
- Set all UI controls accordingly.
- Trigger full redraw.

## C. Codex Prompt
```
Implement milestone v1.15.5.

Goal: State import restores all distribution + sampling settings.

Files: continuous_ROC.html, ROC_lib.js
Roadmap: v1.15.5

Steps:
1. Parse metadata.continuous_roc_explorer.
2. Restore UI controls.
3. Set all visibility flags to true.
4. Trigger full redraw.

Follow roadmap.
```

---

# Version v1.15.6 — Integrate All Distributions from jstat_extra.js

## A. Goals
- Add all families defined in jstat_extra to dropdown.
- Place them at end of list.
- Expose all parameters.
- Use numerical methods if needed.
- Show hourglass during computations.

## B. Implementation Plan
- Import or reference distribution constructors from jstat_extra.js.
- Add UI parameter inputs dynamically.
- Modify distribution evaluation pipeline.

## C. Codex Prompt
```
Implement milestone v1.15.6.

Goal: Add all jstat_extra distributions to dropdown, with full parameter exposure.

Files: continuous_ROC.html, jstat_extra.js, ROC_lib.js
Roadmap: v1.15.6

Steps:
1. Extend distribution-family dropdown.
2. Add UI parameter inputs.
3. Extend distribution/PDF/CDF evaluation.
4. Add busy indicator for numeric methods.

Follow roadmap.
```

---

# Version v1.15.7 — Sampling Engine (Generate Samples & Sampled ROC Curves)

## A. Goals
- Add sampling mechanism: draw positive & negative scores per replicate.
- Compute empirical ROC for each sample.
- Render sample ROC curves as faint lines.
- Integrate with legend controls.

## B. Implementation Plan
- Add sampling controls: sample size, number of samples.
- Sampling auto-runs when controls change.
- Store sample ROC points for export.

## C. Codex Prompt
```
Implement milestone v1.15.7.

Goal: Sampling engine with sample ROC curves.

Files: continuous_ROC.html, ROC_lib.js
Roadmap: v1.15.7

Steps:
1. Implement sampling using positive/negative distributions.
2. Compute empirical ROC for each replicate.
3. Render sample ROC lines using opacity.
4. Use busy indicator.
5. Store sample ROC points.

Follow roadmap.
```

---

# Version v1.15.8 — Confidence Band Computation (95% Pointwise)

## A. Goals
- Using sampled ROC curves, compute 2.5th and 97.5th percentiles per FPR grid.
- Plot upper & lower curves + shaded region.
- Toggle visibility via legend.

## B. Implementation Plan
- Implement fixed FPR grid.
- Interpolate each sample ROC onto grid.
- Compute quantiles.
- Render boundaries + polygon fill.

## C. Codex Prompt
```
Implement milestone v1.15.8.

Goal: 95% pointwise ROC confidence band.

Files: continuous_ROC.html, ROC_lib.js
Roadmap: v1.15.8

Steps:
1. Build fixed FPR grid.
2. Interpolate sample ROC curves.
3. Compute 2.5 and 97.5 percentiles.
4. Render band + boundaries.
5. Integrate with legends.

Follow roadmap.
```

---

# Version v1.15.9 — Sample Collection Export (Integrated into Curve JSON)

## A. Goals
- Save:
  - Sampled ROC curves
  - Per-sample histograms
- Store inside same curve JSON under metadata.

## B. Implementation Plan
- Extend state object to include samples.
- Ensure export is efficient for ~100 samples.

## C. Codex Prompt
```
Implement milestone v1.15.9.

Goal: Export sample collection in same curve JSON.

Files: continuous_ROC.html, ROC_lib.js
Roadmap: v1.15.9

Steps:
1. Add sample ROC + histogram info to metadata.
2. Ensure import (already implemented) ignores if absent.

Follow roadmap.
```

---

# Version v1.15.10 — APNG Animation of Sampled ROC Curves

## A. Goals
- Render sequential frames of sample ROC curves.
- Export as APNG.
- Continuous curve & band visibility follow legend settings.

## B. Implementation Plan
- Add "Export Animation (APNG)" button.
- Use canvas to draw each frame.
- Encode into APNG.

## C. Codex Prompt
```
Implement milestone v1.15.10.

Goal: Export APNG animation of sampled ROC curves.

Files: continuous_ROC.html
Roadmap: v1.15.10

Steps:
1. Add APNG export button.
2. Draw each sample ROC as a frame on canvas.
3. Encode frames into APNG.
4. Respect legend visibility.

Follow roadmap.
```

---

# Future Extensions (No Codex Prompts)
- Advanced ROC confidence bands (DeLong, simultaneous).
- Progressive teaching modes.
- Preset ROC scenarios.
- Batch run scripting.
- Multi-canvas comparison mode.
