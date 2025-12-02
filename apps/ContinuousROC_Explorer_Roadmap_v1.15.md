# Continuous ROC Explorer Development Roadmap (v1.15.x)

**Canonical roadmap filename:** `ContinuousROC_Explorer_Roadmap_v1.15.md`

This document specifies a sequence of small, incremental versions for the **Continuous ROC Explorer** starting from **v1.15.0**. Each minor version (v1.15.N) is intended to be implemented in a **single Codex session** in VS Code.

Codex will:
- Have access to the project files (e.g., `continuous_ROC.html`, `ROC_lib.js`, `continuous_ROC_config.js`, `jstat_extra.js`).
- Have access to this roadmap file and may be told explicitly to consult it.

---

# Version v1.15.1 — Mixture Component Removal & Per-Class Normalization

## A. Goals
- Allow users to **remove mixture components** for both positive and negative distributions, with the constraint that **each class must always retain at least one component**.
- Add **separate "Normalize Weights" buttons** for:
  - Positive components
  - Negative components
- Normalization rule:
  - For the **positive class**, component weights must sum to 1.
  - For the **negative class**, component weights must sum to 1.
- Normalizing weights should:
  - Update the internal state and weight input fields.
  - Trigger the standard redraw pipeline.
  - Not change the ROC shape beyond floating‑point rounding (since mixture weights are within-class and prevalence is controlled elsewhere).

## B. Implementation Plan
1. **Add remove (“X”) buttons for components**
   - In `continuous_ROC.html`, locate the UI section that renders the **positive** mixture components list (rows for distribution family, parameters, weight).
   - For each positive component row:
     - Add an “X” remove button or link **only for components with index > 0**.
     - Use a class like `.remove-positive-component` and include a `data-index` attribute indicating the component index.
   - Repeat the same pattern for **negative** mixture components with class `.remove-negative-component`.
   - Ensure no remove button is shown when there is only a single component in that class.

2. **Implement remove handlers**
   - In the main script in `continuous_ROC.html` (or associated JS logic, if separated):
     - Add event listeners (ideally via event delegation) for `.remove-positive-component` and `.remove-negative-component` clicks.
     - On click:
       - Read the component index from `data-index`.
       - Remove the corresponding entry from the appropriate in-memory array (positive or negative components).
       - Ensure the class still has at least one component. If removing would leave zero components, disallow the action.
       - Re-render the component list for that class.
       - Ensure that remove buttons are only visible for indices > 0 and only when there are ≥ 2 components.
       - Call the existing update/redraw function used when users change parameters or weights.

3. **Add per-class Normalize Weights buttons**
   - In the positive component UI block:
     - Add a `Normalize weights` button (e.g., `<button id="normalize-positive-weights">Normalize weights</button>`).
     - This button should be shown **only when the positive class has at least 2 components** (hide otherwise).
   - In the negative component UI block:
     - Add a `Normalize weights` button (e.g., `<button id="normalize-negative-weights">Normalize weights</button>`).
     - Show only if the negative class has at least 2 components.

4. **Implement normalization function**
   - In `continuous_ROC.html` or `ROC_lib.js`, implement a helper such as:
     - `normalizeWeightsForClass(className)` where `className` is `'positive'` or `'negative'`.
   - Behavior:
     - Access the relevant components array (positive or negative).
     - Extract the current weights into an array `w`.
     - Compute `sumW = sum(w)`.
     - If `sumW <= 0`, log a warning and do not change weights.
     - Otherwise, for each component, set `newWeight = oldWeight / sumW`.
     - Update both:
       - The internal state weights.
       - The corresponding weight input fields in the DOM.
     - Call the standard update/redraw function.

5. **Wire buttons to normalization**
   - Add click handlers:
     - `#normalize-positive-weights` → `normalizeWeightsForClass('positive')`.
     - `#normalize-negative-weights` → `normalizeWeightsForClass('negative')`.

6. **Testing**
   - Verify that:
     - You cannot remove the **first** component in each class.
     - You cannot remove the **only remaining** component in a class.
     - Normalize buttons appear only when there are ≥ 2 components in that class.
     - Normalization updates weights correctly and does not break plotting.
     - ROC curves are visually unchanged before vs after normalization (except for negligible rounding).

## C. Codex Prompt
```text
Implement roadmap milestone v1.15.1 from `ContinuousROC_Explorer_Roadmap_v1.15.md`.

Goal: Enable mixture component removal and per-class weight normalization.

Files to edit:
- continuous_ROC.html
- ROC_lib.js (if needed for shared helpers)

Use the roadmap (sections A and B for v1.15.1) as the authoritative specification.
Make the following changes:
1. Add removable components for positive and negative mixtures (X buttons, never allowing a class to reach 0 components).
2. Add per-class Normalize weights buttons, visible only when a class has ≥ 2 components.
3. Implement normalizeWeightsForClass('positive'|'negative'), normalizing weights within each class so they sum to 1.
4. Ensure normalization and removal both trigger the existing update/redraw pipeline.
5. Manually verify behavior as described in the roadmap.
```

---

# Version v1.15.2 — Config-Driven Color System Using `continuous_ROC_config.js`

## A. Goals
- Move all color configuration for positive/negative curves, histograms, and rugs into the **external configuration file** `continuous_ROC_config.js`, with matching **embedded JS defaults** used if the external file is not found.
- Use a **fixed palette**:
  - Positive: blue family.
  - Negative: red family.
- Represent colors as:
  - Hex hue (e.g., `#1f77b4`, `#d62728`).
  - Separate opacity values for:
    - Density curve (fully opaque).
    - Histogram (lower opacity).
    - Rug ticks (higher opacity than histogram).
- Replace all hard-coded color strings in the D3 rendering code with values derived from this config.

## B. Implementation Plan
1. **Extend `continuous_ROC_config.js` with color entries**
   - In `continuous_ROC_config.js`, add a structured color configuration, for example:

     ```js
     const continuousROCConfig = {
       // existing config fields...
       colors: {
         positive: {
           hue: "#1f77b4",
           opacity_curve: 1.0,
           opacity_histogram: 0.35,
           opacity_rug: 0.7
         },
         negative: {
           hue: "#d62728",
           opacity_curve: 1.0,
           opacity_histogram: 0.35,
           opacity_rug: 0.7
         }
       }
     };
     ```

   - Adjust naming as needed to match existing config patterns, but keep the structure equivalent.

2. **Add embedded defaults in JS**
   - In `continuous_ROC.html` or `ROC_lib.js`, define a JS object containing **default color settings** in case `continuous_ROC_config.js` is not loaded or its `colors` section is missing.
   - At runtime, derive an effective `colorConfig` as:
     - If `continuousROCConfig.colors` exists, use that.
     - Otherwise, fall back to the embedded defaults.

3. **Create a hex+opacity → RGBA helper**
   - Implement a function such as `hexWithOpacityToRgba(hex, opacity)` that returns a CSS color string usable by D3 and SVG.
   - Ensure it handles both `#RGB` and `#RRGGBB` formats (if needed).

4. **Replace hard-coded color usages**
   - In `continuous_ROC.html` (and `ROC_lib.js` if applicable), locate all D3 style/fill/stroke settings for:
     - Positive density curve.
     - Negative density curve.
     - Positive histogram bars.
     - Negative histogram bars.
     - Positive rug ticks.
     - Negative rug ticks.
   - Replace any hard-coded colors with calls to the helper using values from `colorConfig`, for example:
     - Positive curve:
       - `hexWithOpacityToRgba(colorConfig.positive.hue, colorConfig.positive.opacity_curve)`.
     - Positive histogram:
       - `hexWithOpacityToRgba(colorConfig.positive.hue, colorConfig.positive.opacity_histogram)`.
     - Positive rug:
       - `hexWithOpacityToRgba(colorConfig.positive.hue, colorConfig.positive.opacity_rug)`.
     - Similarly for negative.

5. **Maintain opacity relationships**
   - Ensure:
     - `opacity_curve` = 1.0 for both classes.
     - `opacity_histogram` < `opacity_rug` ≤ 1.0.

6. **Testing**
   - Manually edit `continuous_ROC_config.js` to change hues and opacities and verify that:
     - All positive visuals (curve, histogram, rug) update consistently with the positive color.
     - All negative visuals update consistently with the negative color.
   - Temporarily simulate missing `continuous_ROC_config.js` or missing `colors` section and confirm that embedded defaults are used without errors.

## C. Codex Prompt
```text
Implement roadmap milestone v1.15.2 from `ContinuousROC_Explorer_Roadmap_v1.15.md`.

Goal: Move all hard-coded positive/negative colors into the external configuration file `continuous_ROC_config.js`, with JS defaults for fallback, and use them consistently for curves, histograms, and rugs.

Files to edit:
- continuous_ROC.html
- ROC_lib.js (if color helpers or defaults live there)
- continuous_ROC_config.js

Use the roadmap (sections A and B for v1.15.2) as the authoritative specification.
Implement:
1. A color configuration structure under a `colors` key in `continuous_ROC_config.js`.
2. Matching JS default color settings for when the external config is missing or incomplete.
3. A helper to convert hex + opacity to an RGBA string.
4. Replacement of all hard-coded positive/negative color strings in the D3 drawing code with values from the effective color configuration.
5. Manual tests that changing `continuous_ROC_config.js` updates the app as described in the roadmap.
```

---

# Version v1.15.3 — Interactive D3 Legends (Score Distributions & ROC)

## A. Goals
- Add interactive legends **below** both main plots:
  - Score Distributions plot.
  - ROC Curve plot.
- Each legend entry:
  - Has a color swatch and a label.
  - **Only the swatch is clickable** (label is non-clickable).
- Legends control visibility of individual plot elements.
- Remove old show/hide checkboxes.
- Visibility state persists across redraws (parameter changes, sampling, etc.) within a session.

## B. Implementation Plan
1. **Add a global visibility state object**
   - In `continuous_ROC.html`, create a JS object such as:

     ```js
     const visibilityState = {
       scoreDistributions: {
         posCurve: true,
         posHistogram: true,
         posRug: true,
         negCurve: true,
         negHistogram: true,
         negRug: true
       },
       rocPlot: {
         theoretical: true,
         empirical: true,
         thresholds: true,
         confidenceBand: true, // shading + boundaries
         sampleCurves: true
       }
     };
     ```

   - Ensure this object is defined only once and reused by all drawing functions.

2. **Legend for Score Distributions plot**
   - Below the Score Distributions SVG, create a legend group (SVG or HTML) containing six entries:
     - Positive density curve
     - Positive histogram
     - Positive rug
     - Negative density curve
     - Negative histogram
     - Negative rug
   - For each entry:
     - Render a color swatch (matching the element’s color) and a label.
     - Attach a click handler to the **swatch** that toggles the corresponding `visibilityState.scoreDistributions` flag and triggers a redraw of the Score Distributions plot.

3. **Legend for ROC plot**
   - Below the ROC SVG, create a legend with entries for:
     - Theoretical ROC curve
     - Empirical ROC curve
     - Threshold labels
     - Confidence band (both shading and boundaries)
     - Sample ROC curves
   - As with Score Distributions, make only the swatch clickable, toggling `visibilityState.rocPlot` flags and triggering a redraw.

4. **Update drawing functions to respect visibility**
   - In the Score Distributions drawing logic:
     - Before drawing or updating each element (curve/histogram/rug), check the relevant flag in `visibilityState.scoreDistributions`.
     - If the flag is false, do not draw (or hide) that element.
   - In the ROC drawing logic:
     - Draw/hide each element (theoretical ROC, empirical ROC, threshold labels, confidence band, sample ROC curves) based on `visibilityState.rocPlot`.

5. **Remove old checkboxes**
   - Identify and remove the UI checkboxes and handlers for:
     - “Show empirical histograms”
     - “Show empirical ROC”
     - “Show empirical data points” (for the ROC plot)
   - Ensure their functionality is fully replaced by the legends.

6. **Persistence across redraws**
   - Confirm that `visibilityState` is not reinitialized during redraws.
   - Ensure all redraw triggers (e.g., parameter changes, sample size changes, etc.) respect the current visibility flags.

7. **Testing**
   - Hide various elements using legend swatches and then:
     - Change mixture parameters.
     - Change sample size or number of samples (once implemented).
     - Verify hidden elements remain hidden and visible elements remain visible.

## C. Codex Prompt
```text
Implement roadmap milestone v1.15.3 from `ContinuousROC_Explorer_Roadmap_v1.15.md`.

Goal: Add interactive D3 legends below the Score Distributions and ROC plots that control visibility of individual elements, replacing the old checkboxes, with state persisting across redraws.

Files to edit:
- continuous_ROC.html

Use the roadmap (sections A and B for v1.15.3) as the authoritative specification.
Implement:
1. A global visibilityState object for Score Distributions and ROC elements.
2. Legends below each plot with clickable swatches that toggle visibilityState and trigger redraws.
3. Drawing logic that respects visibilityState for all relevant elements.
4. Removal of the old show/hide checkboxes and associated code.
5. Manual tests confirming that visibility persists across redraws.
```

---

# Version v1.15.4 — State Export in ROC Metadata (Model & Sampling Settings)

## A. Goals
- When exporting ROC curves to JSON, include a **state block** under `metadata.continuous_roc_explorer` that captures:
  - Distribution definitions for positive and negative classes:
    - Distribution family names.
    - Parameters for each component.
    - Mixture weights within each class.
  - Sampling-related settings necessary to reproduce samples later:
    - Sample size.
    - Number of replicates (if defined at this stage).
    - Prevalence.
    - Any other sample-related controls that already exist.
  - ROC-level metadata:
    - Curve name.
    - AUC (continuous/theoretical AUC for the current setup).
- **Do not** include display settings (legend visibility, axis ranges, colors, etc.).
- This milestone focuses on model and sampling settings, not yet on per-sample curves/histograms (which will appear in a later version).

## B. Implementation Plan
1. **Define the metadata structure**
   - In `ROC_lib.js` or wherever curve JSON is constructed, define a structure like:

     ```js
     metadata: {
       continuous_roc_explorer: {
         distributions: {
           positive: [
             { family: "...", params: { ... }, weight: ... },
             // ... more components
           ],
           negative: [
             { family: "...", params: { ... }, weight: ... }
           ]
         },
         sampling: {
           sampleSize: ...,
           numReplicates: ...,
           prevalence: ...
           // any other sampling controls currently present
         },
         roc: {
           name: "...",
           auc: ...
         }
       }
     }
     ```

   - Adjust field names to match existing code style.

2. **Collect distribution state**
   - Identify where the positive and negative components are stored in memory.
   - Construct `distributions.positive` and `distributions.negative` arrays from that state:
     - Each entry should include the distribution family, a parameter object, and the weight.

3. **Collect sampling state**
   - Identify the UI controls and state variables representing:
     - Sample size.
     - Number of replicates (even if not yet used for full sampling).
     - Prevalence.
   - Store these in `sampling` as key/value pairs.

4. **Collect ROC-level metadata**
   - Identify how AUC is computed in the app.
   - Ensure a scalar `auc` value is available to include in `roc.auc`.
   - Use the existing curve name or add a name field to UI state and include it in `roc.name`.

5. **Integrate metadata into export**
   - Modify the export function so that when a curve is serialized to JSON, it includes the `metadata.continuous_roc_explorer` block constructed above.

6. **Testing**
   - Export a ROC curve and inspect the JSON:
     - Confirm `metadata.continuous_roc_explorer` exists.
     - Confirm distributions, sampling settings, and roc name/auc are present.
     - Confirm no display settings are included.

## C. Codex Prompt
```text
Implement roadmap milestone v1.15.4 from `ContinuousROC_Explorer_Roadmap_v1.15.md`.

Goal: When exporting a ROC curve to JSON, include a metadata.continuous_roc_explorer block containing the model and sampling state (but no display settings).

Files to edit:
- ROC_lib.js (or whichever file constructs the ROC JSON export)
- continuous_ROC.html (if necessary to access UI state or curve names)

Use the roadmap (sections A and B for v1.15.4) as the authoritative specification.
Implement:
1. A metadata.continuous_roc_explorer structure capturing distributions, sampling settings, and ROC-level metadata (name and AUC).
2. Logic to fill this structure from the existing in-memory state and AUC computation.
3. Integration of this metadata into the exported JSON.
4. Manual checks to verify the resulting JSON matches the roadmap specification.
```

---

# Version v1.15.4.1 — Correct Sample ROC JSON Format

## A. Goals
- Fix the incorrect format currently used to store sampled ROC curves in exported JSON.
- Adopt **Option A** (canonical structure): store each sampled ROC curve as its own ROC object with column-major arrays:
  ```json
  "samplesROC": [
    { "fpr": [...], "tpr": [...], "thr": [...] },
    { "fpr": [...], "tpr": [...], "thr": [...] }
  ]
  ```
- Ensure sampling, export, import, confidence-band computation, and animations all operate using this correct structure.
- Maintain backward compatibility: ignore malformed sample ROC entries from older files.

---

## B. Implementation Plan
1. **Update Sampling Engine (in the files provided by the user)**
   - Ensure each replicate produces a complete ROC object:
     ```js
     { fpr: [...], tpr: [...], thr: [...] }
     ```
   - Remove any logic that generates row-based or flattened structures.
   - Build an array of such objects, one per replicate.

2. **Update Export Logic**
   - Assign the array of ROC objects to:
     ```js
     metadata.continuous_roc_explorer.samplesROC = samplesArray;
     ```
   - Ensure this overwrites any older, incorrect structure.

3. **Update Import Logic**
   - When reading metadata:
     - Verify that `samplesROC` is an array.
     - Verify that each element contains `fpr` and `tpr` arrays.
     - Ignore malformed entries (for backward compatibility).

4. **Update Downstream Logic**
   - Confidence-band computation must iterate over the array of ROC objects.
   - Animation generation must iterate over the array of ROC objects.
   - Visualization functions must treat each sample curve as a separate ROC.

5. **Do not modify unrelated code.**

---

## C. Codex Prompt
```
Implement roadmap milestone v1.15.4.1 from `ContinuousROC_Explorer_Roadmap_v1.15.md`.

Goal: Correct the JSON structure used for sampled ROC curves so each sample is stored as its own ROC object with column-major arrays.

Files to modify:
- continuous_ROC.html
- ROC_lib.js
(Do not modify other files.)

Tasks:
1. Update the sampling engine to produce objects of the form:
   { fpr: [...], tpr: [...], thr: [...] }.
2. Store all sample ROC objects in an array assigned to:
   metadata.continuous_roc_explorer.samplesROC.
3. Remove any code that flattens or row-encodes sample ROC points.
4. Update export logic to use this corrected structure.
5. Update import logic to:
   - Accept arrays of ROC objects,
   - Validate each object,
   - Ignore malformed entries.
6. Update all downstream functions (confidence bands, animations, plotting) to iterate over the corrected samplesROC array.
7. Do not modify unrelated code.

Follow sections A and B of milestone v1.15.4.1 exactly.
```

# Version v1.15.5 — State Import (Full UI Restore)

## A. Goals
- When importing a ROC curve JSON that contains `metadata.continuous_roc_explorer`, restore:
  - Positive and negative distributions (families, parameters, weights).
  - Sampling settings (sample size, number of replicates, prevalence, etc.).
  - ROC name and AUC (for display where appropriate).
- After importing state:
  - All plot elements should default to **visible** (legend visibility is reset to all-true).
  - The UI controls should reflect the imported values.
  - Plots should be fully regenerated based on the new state.
- Missing fields in `metadata.continuous_roc_explorer` should be **ignored**, falling back to current UI values (for backward compatibility).

## B. Implementation Plan
1. **Read metadata on import**
   - In the curve import logic (likely in `ROC_lib.js` or `continuous_ROC.html`), detect whether `metadata.continuous_roc_explorer` exists.
   - If present, extract:
     - `distributions.positive` and `distributions.negative`.
     - `sampling`.
     - `roc`.

2. **Apply distributions to UI and state**
   - Replace current positive/negative component arrays with the imported ones.
   - Update all related UI controls (family dropdowns, parameter inputs, weight inputs) to match.

3. **Apply sampling settings**
   - For each sampling field present (e.g., `sampleSize`, `numReplicates`, `prevalence`):
     - Update the corresponding UI controls and internal variables.
   - If a field is missing, leave the current value unchanged.

4. **Apply ROC name and AUC**
   - If `roc.name` is present, set the curve name in the UI/state.
   - If `roc.auc` is present, store it for display if needed; otherwise recompute as current code does.

5. **Reset visibility and redraw plots**
   - Set all `visibilityState` flags to `true` so everything is initially visible.
   - Trigger the standard redraw functions for Score Distributions and ROC plots.

6. **Handle missing or partial metadata**
   - If `metadata.continuous_roc_explorer` is missing entirely, fall back to current behavior (e.g., just load the ROC curve without restoring state).
   - If some subfields (e.g., `sampling`) are missing, preserve current settings rather than overwriting with `undefined`.

7. **Testing**
   - Export a curve from v1.15.4+, then re-import it and verify that:
     - Distributions, sampling settings, and curve name are restored.
     - All plot elements are visible.
     - Plots match the original state.
   - Import older JSON without metadata and confirm the app still behaves sensibly.

## C. Codex Prompt
```text
Implement roadmap milestone v1.15.5 from `ContinuousROC_Explorer_Roadmap_v1.15.md`.

Goal: When importing a ROC curve JSON with metadata.continuous_roc_explorer, restore distributions and sampling state into the UI and regenerate plots, with all elements visible.

Files to edit:
- ROC_lib.js (or wherever curve JSON is parsed)
- continuous_ROC.html (for applying UI updates and triggering redraws)

Use the roadmap (sections A and B for v1.15.5) as the authoritative specification.
Implement:
1. Detection and parsing of metadata.continuous_roc_explorer on import.
2. Application of imported distributions and sampling settings to internal state and UI controls.
3. Reset of visibilityState to all-true and full plot redraw.
4. Graceful handling of missing or partial metadata.
5. Manual tests demonstrating successful round-trip (export → import → same state).
```

---

# Version v1.15.6 — Integrate All Distributions from `jstat_extra.js`

## A. Goals
- Make **all distributions** defined in `jstat_extra.js` available in the distribution-family dropdowns.
- Place these additional distributions **at the end** of the dropdown list, after existing families.
- For each new distribution family:
  - Expose **all parameters** used by its implementation as numeric inputs in the UI.
  - Provide reasonable default parameter values for new components.
- Use numerical methods as needed for PDF/CDF/quantiles.
- Show a **busy indicator** (e.g., hourglass cursor or overlay) during longer numeric computations.

## B. Implementation Plan
1. **Survey `jstat_extra.js`**
   - Enumerate all distribution families implemented there (names and parameters).
   - Decide internal identifiers and display labels for each.

2. **Extend distribution family dropdowns**
   - In `continuous_ROC.html`, where the distribution family dropdown is built:
     - Append new options for each distribution from `jstat_extra.js` after the existing ones.
   - Ensure the internal identifiers used here match those used in evaluation functions.

3. **Parameter UI wiring**
   - For each new family, define the UI controls for its parameters (e.g., location, scale, shape, skewness) consistent with how existing families are handled.
   - Ensure that when the user selects a `jstat_extra` family:
     - The correct parameter inputs appear.
     - They are initialized with reasonable defaults.

4. **Evaluation logic integration**
   - In `ROC_lib.js` (or wherever PDFs/CDFs are evaluated):
     - Add cases for each new distribution family, using the corresponding functions from `jstat_extra.js`.
   - Where closed-form CDFs/inverse CDFs are not available:
     - Implement numerical approximations (e.g., numeric integration or root-finding) as needed.
   - Wrap longer computations in a busy indicator:
     - Set an hourglass cursor or overlay when such computations start.
     - Clear it when they finish.

5. **Testing**
   - For each new distribution family:
     - Create a simple one-component positive distribution and verify that the density and ROC behave sensibly.
     - Test a few parameter values to ensure numerical methods are stable.

## C. Codex Prompt
```text
Implement roadmap milestone v1.15.6 from `ContinuousROC_Explorer_Roadmap_v1.15.md`.

Goal: Integrate all distribution families from `jstat_extra.js` into the app's distribution-family dropdowns, with full parameter exposure and numerical evaluation support.

Files to edit:
- continuous_ROC.html
- ROC_lib.js
- jstat_extra.js (read-only for definitions; do not modify unless necessary)

Use the roadmap (sections A and B for v1.15.6) as the authoritative specification.
Implement:
1. Addition of all `jstat_extra.js` distributions to the dropdowns (at the end of the list).
2. UI parameter inputs for each new family with reasonable defaults.
3. PDF/CDF (and quantile if needed) hooks into `jstat_extra.js`, using numerical methods where required.
4. A busy indicator during expensive numerical computations.
5. Manual tests verifying that each new family produces sensible densities and ROC curves.
```

---

# Version v1.15.7 — Sampling Engine (Generate Samples & Sampled ROC Curves)

## A. Goals
- Add a **sampling engine** that, for each replicate:
  - Draws positive scores from the current positive distribution.
  - Draws negative scores from the current negative distribution.
  - Uses **sample size** and **prevalence** to determine counts per class.
- For each replicate dataset:
  - Compute an empirical ROC curve.
- On the ROC plot:
  - Render each sample ROC curve as a **faint, partially transparent line**.
  - Sample curves are **visible by default** but can be toggled via the ROC legend.
- Sampling is automatically recomputed when sampling settings change.
- Display a busy indicator while sampling is in progress.

## B. Implementation Plan
1. **Sampling controls and state**
   - Ensure UI controls for:
     - Sample size (total cases).
     - Number of samples (replicates).
   - Wire these controls to the internal sampling state.

2. **Sampling implementation**
   - Implement a function to perform sampling given the current distributions, sample size, prevalence, and number of samples:
     - For each replicate:
       - Compute `n_pos = round(sampleSize * prevalence)` and `n_neg = sampleSize - n_pos`.
       - Draw `n_pos` scores from the positive distribution and `n_neg` from the negative distribution.
       - Compute an empirical ROC curve from these scores (e.g., by sorting by score and computing TPR/FPR at thresholds).
   - Store sample ROC curves in an array (e.g., `sampleRocs`), each as a sequence of FPR/TPR points.

3. **Rendering sample ROC curves**
   - In the ROC drawing logic:
     - If `visibilityState.rocPlot.sampleCurves` is true and `sampleRocs` is non-empty:
       - Render each sample ROC as a faint, partially transparent line, using the negative or positive color families as appropriate (or a neutral color if preferred, but consistent).

4. **Automatic recomputation & busy indicator**
   - When sample size or number of samples changes:
     - Show a busy indicator (hourglass cursor or overlay).
     - Re-run sampling.
     - Hide the busy indicator when done.
   - Ensure sampling is triggered only when settings change, not on every minor UI event.

5. **Testing**
   - Test with small sample sizes and a few replicates to verify correctness and performance.
   - Increase number of samples (e.g., 100) and confirm that:
     - Sampling is still responsive.
     - Busy indicator appears during computation.

## C. Codex Prompt
```text
Implement roadmap milestone v1.15.7 from `ContinuousROC_Explorer_Roadmap_v1.15.md`.

Goal: Add a sampling engine that generates replicate datasets, computes empirical ROC curves, and renders them as faint lines on the ROC plot, with automatic recomputation and a busy indicator.

Files to edit:
- continuous_ROC.html
- ROC_lib.js

Use the roadmap (sections A and B for v1.15.7) as the authoritative specification.
Implement:
1. Sampling controls for sample size and number of samples wired into state.
2. A sampling routine that draws from the positive/negative distributions and computes empirical ROC curves for each replicate.
3. Rendering of sample ROC curves as faint lines, controlled by visibilityState.rocPlot.sampleCurves.
4. Automatic recomputation of samples when sampling settings change, with a busy indicator during computation.
5. Manual tests at small and moderate sample sizes.
```

---

# Version v1.15.8 — Confidence Band Computation (95% Pointwise)

## A. Goals
- Using the sampled ROC curves from v1.15.7, compute a **95% pointwise confidence band** over a fixed FPR grid:
  - At each FPR grid point, take the 2.5th and 97.5th percentiles of TPR across all samples.
- Render:
  - Upper and lower band boundary curves.
  - Shaded region between them.
- Control the confidence band visibility via the existing ROC legend entry:
  - Hiding the band hides **both** the shading and the boundary curves.

## B. Implementation Plan
1. **Define an FPR grid**
   - Choose a grid of FPR values between 0 and 1 (e.g., 0, 0.01, ..., 1).

2. **Interpolate sample ROC curves onto the FPR grid**
   - For each sample ROC (sequence of FPR/TPR points):
     - Interpolate TPR values at each FPR grid point (e.g., via linear interpolation between known points).
   - Collect these interpolated TPR values in a 2D structure (grid point × sample index).

3. **Compute quantiles**
   - For each FPR grid point, compute 2.5th and 97.5th percentiles across sample TPR values.
   - Store results as arrays representing the lower and upper confidence band boundary curves.

4. **Render confidence band**
   - In the ROC drawing logic:
     - If `visibilityState.rocPlot.confidenceBand` is true and band data exists:
       - Draw the lower and upper boundary curves.
       - Draw a filled polygon between them to represent the band.

5. **Integration with legend**
   - Ensure the ROC legend entry for "Confidence band" toggles both shading and boundary curves.

6. **Testing**
   - With modest numbers of samples (e.g., 50–100), verify that the band behaves intuitively as distributions change.
   - Confirm that toggling visibility for the band in the legend hides/shows both the shading and