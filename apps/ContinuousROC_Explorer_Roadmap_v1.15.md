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

# Version v1.15.5.1 — Add ROC File Import to the UI

## A. Goals
- Add **visible UI controls** to import ROC curve JSON files into the Continuous ROC Explorer.
- Support importing one or more ROC curves from a local `.json` file.
- Integrate with the existing ROC JSON parsing and metadata handling implemented in v1.15.4 and v1.15.5:
  - Load ROC curves from file.
  - For curves that contain `metadata.continuous_roc_explorer`, restore the UI state using the existing state-import logic.
- Provide basic error handling and user feedback for invalid or malformed files.

---

## B. Implementation Plan

1. **Add Import Control to the UI (continuous_ROC.html)**
   - In the main controls area (where export and other high-level actions live), add:
     - A visible button, e.g., `Import ROC JSON…`.
     - A hidden file input:
       ```html
       <input id="roc-import-file" type="file" accept=".json,application/json" style="display:none;">
       ```
   - Wire the button's `onclick` to trigger `#roc-import-file.click()` so the user can choose a local JSON file.

2. **Implement File Selection and Reading (continuous_ROC.html)**
   - Add a `change` event listener to `#roc-import-file` that:
     - Gets the selected file (first file only).
     - Uses a `FileReader` to read the file contents as text.
     - On `load`, attempts to parse the text as JSON.
   - If JSON parsing fails:
     - Show a user-friendly error (e.g., `alert("Error: Selected file is not valid JSON.")`).
     - Reset the file input.

3. **Hook into Existing ROC JSON Parsing / Import Logic (ROC_lib.js + continuous_ROC.html)**
   - Identify the function(s) that currently:
     - Parse canonical ROC JSON.
     - Normalize/validate ROC structures.
     - Handle `metadata.continuous_roc_explorer` to restore UI state (from v1.15.5).
   - After successfully parsing the file as JSON:
     - Pass the JSON object into the existing ROC parsing/normalization function.
     - Ensure that if the file contains **multiple ROC curves**, all curves are added to the internal ROC collection as they would be if loaded by other means.

4. **UI State Restoration from Imported Metadata**
   - For each imported curve, check whether it contains `metadata.continuous_roc_explorer`.
   - Choose the **first curve with valid `metadata.continuous_roc_explorer`** as the one that will drive UI state restoration.
   - Call the existing state-import logic (from v1.15.5) to:
     - Restore distributions, parameters, mixture weights, and sampling settings.
     - Reset visibility to all-true.
     - Trigger full redraw of score distributions and ROC plots.
   - Other imported curves **without** metadata should still be added as ROC curves for display/comparison but should not attempt to overwrite UI configuration.

5. **Error Handling for ROC-Level Issues**
   - If the file structure is valid JSON but does **not** match the expected ROC JSON layout:
     - Show a clear error message (e.g., `"The selected file does not contain valid ROC JSON."`).
   - If no curves with `metadata.continuous_roc_explorer` are found:
     - Load curves for display if possible, but skip UI state restoration.
     - Optionally show a non-blocking info message (e.g., `"ROC curves loaded, but no state metadata found to restore settings."`).

6. **Do Not Modify Unrelated Features**
   - Do not change export behavior.
   - Do not alter existing buttons or legends.
   - Only add the minimal UI elements and logic needed to support file import.

---

## C. Codex Prompt
```text
Implement roadmap milestone v1.15.5.1 from `ContinuousROC_Explorer_Roadmap_v1.15.md`.

Goal: Add a UI-based ROC JSON import mechanism that lets the user select a .json file from disk, parses it as ROC JSON, and integrates it with the existing ROC parsing and state-import logic.

Files to modify:
- continuous_ROC.html
- ROC_lib.js
(Do not modify other files.)

Tasks:
1. In continuous_ROC.html, add:
   - A visible "Import ROC JSON…" button in the main controls area.
   - A hidden <input type="file" id="roc-import-file" accept=".json,application/json"> element.
   - Click handler so the button triggers the file input.
2. Add a change handler for #roc-import-file that:
   - Reads the selected file with FileReader.
   - Parses the contents as JSON.
   - On parse failure, shows an error and returns.
3. Pass the parsed JSON into the existing ROC JSON parsing/normalization function in ROC_lib.js (or equivalent), so ROC curves are added just as if they were loaded by other internal mechanisms.
4. For imported curves, if metadata.continuous_roc_explorer is present:
   - Use the first such curve to drive the state-import logic from v1.15.5 (restore distributions, sampling settings, etc., then redraw).
   - Load additional curves for display without overwriting UI configuration.
5. Handle malformed or non-ROC JSON files gracefully with user-facing error messages.
6. Do not modify export behavior or unrelated UI elements.

Follow sections A and B of milestone v1.15.5.1 exactly.
```
---

# Version v1.15.5.2 — Fix Incorrect Export of Distribution Families

## A. Goals
- Correct the export logic so that **each distribution component** (positive and negative) is saved with the correct `distribution` family name.
- Fix the bug that causes **positive Beta distributions to be exported as Normal**.
- Ensure all distribution metadata is preserved accurately:
  - `distribution`
  - `params`
  - `weight`
- Ensure restored UI state exactly matches the original distribution settings upon import.
- Do not modify sampling, UI, or import behavior except where needed to support correct metadata.

---

## B. Implementation Plan

1. **Locate current export code**
   In `continuous_ROC.html` or `ROC_lib.js`, find where metadata for:
   ```js
   metadata.continuous_roc_explorer.posComponents
   metadata.continuous_roc_explorer.negComponents
   ```
   is created.

2. **Identify incorrect distribution assignment**
   The bug arises because the exported component object is populated with:
   ```js
   distribution: "Normal"
   ```
   instead of:
   ```js
   distribution: state.posComponents[i].distribution
   ```
   This may come from:
   - A hard-coded fallback.
   - A mapping function that defaults to Normal.
   - Parameter-based inference of distribution family.
   - Shallow-copy of the wrong object.

3. **Fix the export logic**
   Update export logic so that for each component:
   ```js
   exportedComponent.distribution = originalComponent.distribution;
   exportedComponent.params = clone(originalComponent.params);
   exportedComponent.weight = originalComponent.weight;
   ```
   Ensure that **no inference is performed** based on parameter count.

4. **Verify correct handling of jstat_extras distributions**
   - Ensure that all distributions added in earlier milestones (including Beta, LogNormal, Gamma, etc.) are exported with their correct names.
   - Ensure no transformation of the distribution name occurs.

5. **Add defensive validation** (optional but recommended)
   Before export, validate that:
   ```js
   typeof comp.distribution === "string"
   comp.params is an object
   ```
   If validation fails, throw a clear error.

6. **Do not modify import code**
   Import logic is functioning correctly; once the exported distribution names are correct, re-import will work.

7. **Do not modify sampling or ROC-generation code**
   Only update export logic for distribution metadata.

---

## C. Codex Prompt
```text
Implement roadmap milestone v1.15.5.2 from `ContinuousROC_Explorer_Roadmap_v1.15.md`.

Goal: Fix incorrect export of distribution families so that each component saves the correct `distribution` field (e.g., Beta rather than Normal).

Files to modify:
- continuous_ROC.html
- ROC_lib.js
(Only these files.)

Tasks:
1. Find where `metadata.continuous_roc_explorer.posComponents` and `.negComponents` are constructed.
2. Replace any hard-coded or inferred distribution assignment with:
   component.distribution = originalComponent.distribution;
3. Ensure `params` and `weight` are copied directly from the original state component, without modification or inference.
4. Remove any logic that infers a distribution family based on parameter count or shape.
5. Add defensive validation: if a component lacks a valid `distribution` string, throw an error.
6. Do NOT change sampling logic, import logic, or ROC computation.
7. Ensure the export JSON preserves EXACT distribution identifiers used in the UI, including those from jstat_extras.

Follow sections A and B of milestone v1.15.5.2 exactly.
```
---

# Version v1.15.5.3 — Use Internal Distribution Keys for Export/Import

## A. Goals
- Ensure exported ROC metadata always uses **internal distribution keys** (the keys of `DISTRIBUTIONS`) rather than user-visible labels.
- Guarantee imported JSON fully restores the correct distribution families independent of UI language or label customization.
- Remove all dependencies on user-visible distribution names during export/import.
- Preserve forward/backward compatibility by:
  - exporting canonical internal keys,
  - accepting only internal keys on import,
  - mapping internal keys → display labels *only* in the UI.
- Leave sampling, ROC computation, and UI rendering unchanged unless they depend on distribution identification.

---

## B. Implementation Plan

1. **Update Export Logic** (continuous_ROC.html or ROC_lib.js)
   - Locate where distribution components are serialized into:
     ```js
     metadata.continuous_roc_explorer.posComponents
     metadata.continuous_roc_explorer.negComponents
     ```
   - Replace any usage of:
     ```js
     component.label
     component.displayName
     component.uiName
     ```
     with:
     ```js
     component.distribution   // INTERNAL KEY
     ```
   - Ensure parameters and weights are saved unchanged.

2. **Add Defensive Export Validation**
   - Before writing each component:
     ```js
     if (!DISTRIBUTIONS[component.distribution]) {
       console.error("Export error: Unknown distribution key", component.distribution);
     }
     ```
   - Do NOT substitute a fallback.
   - Always export the internal key exactly.

3. **Update Import Logic**
   - When importing a component:
     - Check that `src.distribution` exists in `DISTRIBUTIONS`.
     - If it does, proceed normally.
     - If it does not:
       - Skip the component **or** (optional) display a warning.
   - Ensure `cloneComponent()` uses:
     ```js
     src.distribution
     ```
     directly as the distribution identifier.

4. **Remove any mapping based on visible labels**
   - If any import logic attempts to match user-visible names (e.g., from the dropdown), remove or replace with internal-key matching.

5. **Ensure internal-key → UI label mapping happens only during UI rendering**
   - Distribution dropdowns should show:
     ```js
     DISTRIBUTIONS[key].label
     ```
   - But should store `key` in component state.

6. **Do not modify unrelated logic**
   - Do not alter sampling, ROC generation, visualization, or legends.
   - Only modify code paths that read/write distributions during state export/import.

---

## C. Codex Prompt
```text
Implement roadmap milestone v1.15.5.3 from `ContinuousROC_Explorer_Roadmap_v1.15.md`.

Goal: Ensure all distribution metadata in exported JSON uses INTERNAL distribution keys (the keys of `DISTRIBUTIONS`) and not user-visible labels. Update import logic so that distribution keys map directly back to DISTRIBUTIONS without inference. UI labels should only be used for display.

Files to modify:
- continuous_ROC.html
- ROC_lib.js
(Do not modify unrelated files.)

Tasks:
1. Update export logic so each component writes:
   component.distribution   // internal key
   instead of any label/translated/UI name.
2. Verify that params and weight are exported unchanged.
3. Add validation before export: if DISTRIBUTIONS[component.distribution] is missing, log an error.
4. Update import logic to:
   - Accept only internal keys,
   - Ignore or warn about unrecognized keys,
   - Pass the internal key directly into cloneComponent or the distribution-construction path.
5. Remove all matching logic based on display labels.
6. Leave sampling, ROC generation, and visualization unchanged.
7. Do not modify unrelated code.

Follow sections A and B of milestone v1.15.5.3 exactly.
```
---

# Version v1.15.5.4 — Correct Import of Distribution Families (Internal-Key Alignment)

## A. Goals
- Fix the import logic so that **distribution families are restored correctly** using stable internal keys.
- Ensure `DISTRIBUTIONS` is indexed **only by internal keys**, not by UI-visible labels.
- Ensure state import uses **only** these internal keys to reconstruct components.
- Guarantee that all distributions—including `betaMeanPrecision` and any added in `jstat_extras`—import correctly.
- Eliminate fallback-to-Normal behavior caused by mismatched label→key assumptions.
- Preserve full compatibility with saved JSON files created under v1.15.5.3.

---

## B. Implementation Plan

### 1. **Refactor Construction of DISTRIBUTIONS (continuous_ROC.html)**
- Locate where the `DISTRIBUTIONS` object is created.
- Ensure that **keys** of `DISTRIBUTIONS` are the **internal distribution identifiers**, such as:
  - `normal`
  - `betaMeanPrecision`
  - `beta`
  - `gamma`
  - others from `jstat_extras`
- Ensure **values** contain:
  - a `label` (localized UI string from `STRINGS`),
  - parameter descriptors,
  - generator functions.
- Remove any code that assigns user-visible strings (e.g., "Beta (mean/precision)") as **keys**.

### 2. **Update Distribution Dropdown Population**
- When building `<option>` elements for the distribution selector:
  ```html
  <option value="<internalKey>">LocalizedLabel</option>
  ```
- Internally store only `<internalKey>`.
- Display only the localized label.

### 3. **Correct the Import Logic for Distribution Keys**
- In the function that restores imported metadata (search for `applyImportedContinuousMetadata` or similar):
  - Replace:
    ```js
    const distKey = entry.distribution || entry.family || entry.type;
    ```
    with:
    ```js
    const distKey = entry.distribution;  // MUST be the internal key
    ```
  - Check validity:
    ```js
    if (!DISTRIBUTIONS[distKey]) {
       console.warn("Unknown distribution key during import:", distKey);
       return;   // Skip this component
    }
    ```
  - Do NOT attempt to interpret display labels.
  - Do NOT fall back to Normal.

### 4. **Update Component Construction (cloneComponent)**
- Ensure `cloneComponent({ distribution: distKey, ... })` trusts the internal key.
- Remove any logic reverting to `fallback` unless the key is literally missing.
- Confirm that cloneComponent accesses:
  ```js
  DISTRIBUTIONS[distKey]
  ```
  based on internal keys.

### 5. **Ensure Export Logic Already Uses Internal Keys**
- Confirm that in v1.15.5.3, export writes:
  ```js
  distribution: component.distribution
  ```
  and not display labels.
- If any remaining export sites use labels, update them to use internal keys.

### 6. **Test with Provided JSON File**
- Load the provided file:
  `beta_beta_2_samples_1_15_5_3.json`
- Confirm that both positive and negative distributions:
  - restore to Beta (mean/precision),
  - appear correctly in the UI,
  - reconstruct all parameters and weights.

### 7. **Leave All Unrelated Logic Unchanged**
- Do not modify sampling, ROC generation, legends, or plotting.

---

## C. Codex Prompt
```text
Implement roadmap milestone v1.15.5.4 from `ContinuousROC_Explorer_Roadmap_v1.15.md`.

Goal: Ensure distribution families import correctly by enforcing internal distribution keys for all import operations. Fix any mismatch between exported internal keys and DISTRIBUTIONS lookup.

Files to modify:
- continuous_ROC.html
- ROC_lib.js
(Do not modify unrelated files.)

Tasks:
1. Update the construction of the DISTRIBUTIONS object so that its keys are always internal distribution keys (e.g., normal, betaMeanPrecision, etc.). User-visible labels should appear only as values.
2. Update the distribution dropdown builders so that each <option> has:
   - value = internalKey
   - textContent = localized label
3. Update import logic:
   - Replace any use of entry.family or entry.type when importing distributions.
   - Accept only entry.distribution as the internal key.
   - Validate internal key with: if (!DISTRIBUTIONS[distKey]) skip or warn.
4. Update cloneComponent and component-restoration logic to trust the internal key directly.
5. Remove any fallback-to-Normal behavior caused by label mismatch.
6. Verify export logic continues to save internal keys only.
7. Do not modify sampling or ROC generation.

Follow sections A and B of milestone v1.15.5.4 exactly.
```
---

# Version v1.15.5.5 — Unify Distribution Registry and Fix Import Logic

## A. Goals
- Fix the remaining import failure where valid internal keys such as `betaMeanPrecision` are rejected during ROC JSON import.
- Unify the distribution family registry so that **only one authoritative source of distribution definitions exists**.
- Remove or bypass outdated distribution validation inside `ROC_lib.js` that currently rejects valid keys.
- Ensure ROC import always validates distribution keys against the UI’s canonical `DISTRIBUTIONS` table (the one containing internal keys such as `normal`, `beta`, `betaMeanPrecision`, etc.).
- Maintain full backward compatibility with JSON files exported by versions ≥ v1.15.5.3.
- Prevent all future divergence: UI distributions and ROC-lib distributions must never drift out of sync again.

---

## B. Implementation Plan

### 1. Identify the legacy distribution validation in ROC_lib.js
- Locate the block near line ~257 (based on the console message):
  ```js
  console.warn("Skipping unknown distribution key during metadata extraction:", distKey);
  ```
- This block checks `distKey` against a **separate** set of known distributions (in ROC_lib.js).
- This registry does NOT include `betaMeanPrecision`, causing the import failure.

### 2. Remove the distribution whitelist from ROC_lib.js
- Delete or bypass any check resembling:
  ```js
  if (!someInternalTable[distKey]) return;
  ```
- Replace with unconditional acceptance:
  ```js
  callback({ distribution: distKey, params: entry.params, weight: entry.weight });
  ```
- ROC_lib.js **must not** maintain its own table of allowable distributions.
- ROC_lib.js must treat distribution keys as opaque strings.

### 3. Pass distribution metadata forward to continuous_ROC.html
- Modify the extraction function so that it ALWAYS forwards:
  ```js
  { distribution: distKey, params: entry.params, weight: entry.weight }
  ```
- No validation occurs in ROC_lib.js.
- No fallback to Normal.
- No skipping of components.

### 4. Validate distribution keys ONLY in continuous_ROC.html
- In the existing logic (from v1.15.5.4), the authoritative validation is:
  ```js
  if (!DISTRIBUTIONS[distKey]) { warn and skip }
  ```
- Leave this as-is.
- This ensures:
  - UI config file controls valid distributions.
  - Localization does not affect internal keys.
  - Only one registry must be maintained.

### 5. Ensure dropdown builder uses internal keys → labels mapping
- Confirm that `<option value="key">label</option>` is used.
- No changes needed if v1.15.5.3 and v1.15.5.4 were applied correctly.

### 6. Test using the provided file `beta_beta_2_samples_1_15_5_3.json`
- Import the JSON.
- Validate that both:
  - Positive component → Beta (mean/precision)
  - Negative component → Beta (mean/precision)
  now import correctly.

### 7. Do not modify unrelated logic
- Sampling, histogram generation, ROC computation, plotting, legends, or export logic should remain unchanged.

---

## C. Codex Prompt
```text
Implement roadmap milestone v1.15.5.5 from `ContinuousROC_Explorer_Roadmap_v1.15.md`.

Goal: Unify the distribution registry so that ROC JSON import uses the UI’s canonical DISTRIBUTIONS table. Remove outdated distribution validation from ROC_lib.js that causes internal keys such as betaMeanPrecision to be rejected.

Files to modify:
- ROC_lib.js
- continuous_ROC.html (only if needed to adjust the import pipeline; do not modify export logic)

Tasks:
1. In ROC_lib.js, locate distribution-validation logic near the code that logs:
   "Skipping unknown distribution key during metadata extraction: ..."
2. Remove or bypass this validation completely. ROC_lib.js must *not* maintain its own set of known distribution keys.
3. Modify the metadata extraction so it always forwards:
   { distribution: distKey, params: entry.params, weight: entry.weight }
   without checking whether the key exists.
4. Ensure continuous_ROC.html remains the sole authority that validates distribution keys against the UI’s DISTRIBUTIONS object.
5. Do not add fallback-to-Normal behavior.
6. Do not modify sampling logic, ROC computation, or export logic.
7. Test by importing beta_beta_2_samples_1_15_5_3.json to ensure that betaMeanPrecision is now accepted and restored correctly.

Follow sections A and B of milestone v1.15.5.5 exactly.
```

---

# Version v1.15.5.6 — Prevent Dropdown Event Overwrite on Import

## A. Goals
- Fix the bug where the **positive distribution dropdown resets to “Normal”** after importing a saved ROC JSON file.
- Ensure that restoring imported state **never triggers unwanted `change` events** on distribution-family dropdowns.
- Ensure UI reconstruction does **not overwrite imported distribution selections**.
- Remove unnecessary backward-compatibility code — the project does not require support for prior formats.
- Leave negative distribution behavior unchanged.

---

## B. Implementation Plan

### 1. Add a global flag to suppress UI event handlers during metadata restoration
In `continuous_ROC.html`, before any import logic modifies selectors, define:
```js
let isRestoringImportedState = false;
```

### 2. Wrap the import-application code in this flag
Where the UI applies imported state (inside the function that processes cleaned metadata), wrap the process:
```js
isRestoringImportedState = true;
// apply imported distributions, parameters, weights, etc.
isRestoringImportedState = false;
```

### 3. Modify positive distribution dropdown handler
Find the handler registered on the positive-family `<select>` element:
```js
document.getElementById("positive-dist-family").addEventListener("change", onPositiveDistChange);
```

Inside `onPositiveDistChange`, **add this guard at the top**:
```js
if (isRestoringImportedState) return;
```

This ensures that setting:
```js
positiveDistSelector.value = importedKey;
```
does **not** fire logic that rebuilds the distribution using default settings.

### 4. Prevent dropdown rebuild code from resetting value during import
If the UI rebuilds the positive distribution selector (e.g., repopulates `<option>` elements), add:
```js
if (isRestoringImportedState) preserve existing value;
```
Implementation:
- Store the current value:
  ```js
  const current = positiveDistSelector.value;
  ```
- Rebuild options
- If `isRestoringImportedState === true`, restore:
  ```js
  positiveDistSelector.value = current;
  ```
- **Do not** trigger `.dispatchEvent(new Event("change"))` during restoration.

### 5. Apply the same guard to any code that reinitializes sliders/parameter widgets
If UI parameter widgets are reconstructed from scratch (e.g., for Beta mean/precision sliders), add:
```js
if (isRestoringImportedState) skipDefaultInitialization;
```

### 6. Remove legacy backward-compatibility conditions
Since the project does not require backward support:
- Remove branches handling `meta.distributions.negative` (singular).
- Remove legacy parameter branching, keeping only:
  ```js
  params: item.params
  ```
- Ensure distribution metadata is always read from:
  ```js
  meta.distributions.positive
  meta.distributions.negatives
  ```

### 7. Testing procedure
1. Start a fresh session.
2. Create a positive Beta(mean/precision) distribution with any parameters.
3. Create a negative Beta(mean/precision) distribution.
4. Export JSON.
5. Reload the app.
6. Import the JSON.

Expected behavior:
- **Both** positive and negative distributions appear as Beta(mean/precision).
- All parameters and weights load correctly.
- No dropdown resets to Normal.
- Console shows no warnings.

---

## C. Codex Prompt
```text
Implement roadmap milestone v1.15.5.6 from `ContinuousROC_Explorer_Roadmap_v1.15.md`.

Goal: Prevent the positive distribution dropdown from overwriting imported distributions by firing its change handler or being rebuilt incorrectly.

Files to modify:
- continuous_ROC.html
(Do not modify ROC_lib.js for this milestone.)

Tasks:
1. Add a global flag:
   let isRestoringImportedState = false;
2. Surround the entire metadata-application code for imports with:
   isRestoringImportedState = true;
   ...restore UI and internal state...
   isRestoringImportedState = false;
3. In the positive distribution "change" handler, add at the top:
   if (isRestoringImportedState) return;
4. If the code reconstructs the positive distribution dropdown or its parameter widgets, modify that code so that:
   - When isRestoringImportedState === true, it preserves the current value;
   - It does NOT trigger a change event;
5. Remove any outdated backward-compatibility logic involving singular "negative" keys or legacy parameter names.
6. Ensure that after importing JSON, neither positive nor negative distributions are overwritten.
7. Do not modify unrelated rendering or sampling code.

Follow sections A and B of milestone v1.15.5.6 exactly.
```

# Version v1.15.5.7 — Clean Up Legacy Import Logic (No Backward Compatibility Required)

## A. Goals
- Remove all backward-compatibility paths in the metadata import pipeline.
- Eliminate support for obsolete field names, obsolete array structures, and legacy parameter formats.
- Simplify and modernize the JSON import structure to match the **current canonical export format only**.
- Ensure the importer is deterministic, minimal, and fully consistent with the exporter.
- Reduce maintenance burden by removing conditional logic for formats that will never appear in future files.
- Leave ROC computation, sampling, plotting, legends, and UI logic unchanged.

---

## B. Implementation Plan

### 1. Remove support for obsolete distribution keys and field names
In `ROC_lib.js` and `continuous_ROC.html`, delete branches that handle any of the following legacy fields:
- `meta.distributions.negative` (singular)
- `item.parameters` (legacy name; use only `params`)
- `meta.samplesROC` formats older than v1.15.5.4
- Any field representing distributions outside the canonical format:
  ```json
  {
    "distributions": {
      "positive": [...],
      "negatives": [...]
    }
  }
  ```

### 2. Replace coerceDist with strict parsing
In `ROCUtils.extractContinuousRocMetadata`, replace:
```js
const params = (item.params && ...) ? item.params : (item.parameters && ...) ? item.parameters : {};
```
with:
```js
const params = (item.params && typeof item.params === "object") ? item.params : {};
```

Remove support for:
- `item.parameters`
- null/undefined fallback formats

### 3. Enforce a strict distribution metadata structure
The importer should only accept distribution components in this exact format:
```json
{
  "distribution": "internalKey",
  "params": { ... },
  "weight": 0.123
}
```
Any deviation should be ignored or warned about.

Update `coerceDist` accordingly:
```js
if (!item.distribution || typeof item.distribution !== "string") return null;
if (!item.params || typeof item.params !== "object") return null;
if (typeof item.weight !== "number") return null;
```

### 4. Remove normalization of samplesROC for row-based samples
Since v1.15.5.4 introduced the canonical column-based sample ROC format, eliminate the conversion logic for older row-based exports.

Delete:
```js
normalizeSamplesRocArray(...)
```
Replace with:
```js
cleaned.samplesROC = meta.samplesROC; // assume canonical export
```

### 5. Remove support for older `meta.roc`, `meta.sampling` fallback formats
Only accept the fields exactly as exported by current versions:
- `meta.roc`
- `meta.sampling`

No value-shifting, aliasing, or renaming should occur.

### 6. Update documentation within the code
Add a short inline comment:
```js
// Import logic expects canonical metadata only (no backward compatibility).
```

### 7. Test the new strict importer
1. Export a file using current app version.
2. Reload app.
3. Import the exported file.
4. Confirm that:
   - Positive and negative distributions restore without modification.
   - All parameters and weights restore correctly.
   - Sample ROC curves restore as expected.
   - No console warnings occur (unless the file structure is invalid).


---

## C. Codex Prompt
```text
Implement roadmap milestone v1.15.5.7 from `ContinuousROC_Explorer_Roadmap_v1.15.md`.

Goal: Simplify and modernize the JSON import pipeline by removing all backward-compatibility support. The importer should now only recognize the canonical export format used by current versions of the Continuous ROC Explorer.

Files to modify:
- ROC_lib.js
- continuous_ROC.html

Tasks:
1. In ROCUtils.extractContinuousRocMetadata, remove all support for legacy fields, including:
   - singular "negative"
   - legacy "parameters" field
   - row-based samplesROC formats
2. Enforce strict parsing rules for distribution entries:
   - distribution (string, required)
   - params (object, required)
   - weight (number, required)
3. Replace coerceDist logic with the stricter version defined in the roadmap.
4. Remove normalizeSamplesRocArray or any backward-conversion logic for sample ROC.
5. Ensure the importer only accepts the canonical structure:
   meta.distributions.positive
   meta.distributions.negatives
   meta.roc
   meta.sampling
   meta.samplesROC (canonical column format)
6. Remove any aliasing, fallback, or compatibility code paths throughout the import pipeline.
7. Add inline comments noting that the importer now assumes canonical format only.

Follow sections A and B of milestone v1.15.5.7 exactly.
```

---


# Version v1.15.5.8 — Align Import Schema With Canonical Export

## A. Goals
- Make the import pipeline match the **canonical export schema** now used in v1.15.5.7 and later.
- Ensure distributions import correctly for both positives and negatives.
- Replace old singular/plural mismatches (`positive` vs. `positives`).
- Replace obsolete parameter key (`params`) with the canonical `parameters`.
- Align sampling metadata (`samplingSettings` instead of `sampling`).
- Eliminate all remaining structural mismatches so JSON round-trips work reliably.

---

## B. Implementation Plan

### 1. Update distribution extraction in `ROC_lib.js`
Modify `ROCUtils.extractContinuousRocMetadata` so it reads **only** the canonical keys used in current exports:

- `meta.distributions.positives`
- `meta.distributions.negatives`

Replace older code such as:
```js
positive: coerceDist(meta.distributions.positive)
negatives: coerceDist(meta.distributions.negatives || meta.distributions.negative)
```
with:
```js
const src = meta.distributions;
cleaned.distributions = {
  positives: coerceDist(src.positives),
  negatives: coerceDist(src.negatives)
};
```

### 2. Fix `coerceDist` to match canonical component format
Canonical component format is:
```json
{
  "distribution": "<internalKey>",
  "weight": <number>,
  "parameters": { ... }
}
```

Implement strict parsing:
```js
const distribution = (typeof item.distribution === "string") ? item.distribution.trim() : "";
if (!distribution) return null;

const weight = (typeof item.weight === "number") ? item.weight : null;
if (weight === null) return null;

const parameters = (item.parameters && typeof item.parameters === "object")
  ? item.parameters
  : {};

return { distribution, weight, parameters };
```

Remove all support for:
- `item.params`
- `item.parameters` as a fallback (it is now canonical)
- singular `negative`

### 3. Import sampling metadata using canonical field name
Replace:
```js
if (meta.sampling) cleaned.sampling = { ... }
```
with:
```js
if (meta.samplingSettings && typeof meta.samplingSettings === "object") {
  cleaned.samplingSettings = { ...meta.samplingSettings };
}
```

### 4. Update `applyImportedContinuousMetadata` (in `continuous_ROC.html`)
Ensure it reads:
```js
meta.distributions.positives
meta.distributions.negatives
```
and applies those directly to internal state:
```js
state.posComponents = meta.distributions.positives.map(cloneComponent);
state.negComponents = meta.distributions.negatives.map(cloneComponent);
```
where `cloneComponent` must map:
```js
{
  distribution: entry.distribution,
  weight: entry.weight,
  parameters: { ...entry.parameters }
}
```
into a properly structured UI component object.

### 5. Update UI restore logic for sampling
Restore sampling settings using:
```js
if (meta.samplingSettings) applySamplingSettings(meta.samplingSettings);
```
Remove all references to `meta.sampling`.

### 6. Ensure consistency across exporter and importer
Confirm:
- Exporter writes `positives/negatives` arrays
- Exporter uses `parameters`, not `params`
- Exporter writes `samplingSettings`

After re-aligning importer, both sides must match exactly.

### 7. Test with the new gamma/gamma JSON (`GG_2_samp.json`)
Expected:
- Positive distribution restored as Gamma
- Negative distribution restored as Gamma
- Both sets of parameters (`k`, `theta`) restored
- No unintended resets to Normal
- No missing keys in console

---

## C. Codex Prompt
```text
Implement roadmap milestone v1.15.5.8 from `ContinuousROC_Explorer_Roadmap_v1.15.md`.

Goal: Align the import schema with the canonical export format (positives/negatives arrays, parameters key, samplingSettings). Fix distribution import so that the JSON exported by the current app version imports cleanly.

Files to modify:
- ROC_lib.js
- continuous_ROC.html

Tasks:
1. In ROC_lib.js, update ROCUtils.extractContinuousRocMetadata:
   - Read distributions only from meta.distributions.positives and meta.distributions.negatives.
   - Remove legacy singular (positive/negative) handling.
   - Replace coerceDist with strict parsing:
       distribution (string, required)
       weight (number, required)
       parameters (object, required)
   - Remove support for item.params; use only item.parameters.
2. Update sampling import: read meta.samplingSettings instead of meta.sampling.
3. Ensure returned object structure is:
   cleaned.distributions = { positives: [...], negatives: [...] }
   cleaned.samplingSettings = { ... }
   cleaned.roc = { ... }
   cleaned.samplesROC = [ ... ]
4. In continuous_ROC.html, update applyImportedContinuousMetadata:
   - Use meta.distributions.positives and meta.distributions.negatives exclusively.
   - Clone each component using distribution, weight, parameters.
   - Apply samplingSettings instead of sampling.
5. Remove any remaining compatibility logic for old JSON formats.
6. Test by importing the provided GG_2_samp.json file.

Follow sections A and B of milestone v1.15.5.8 exactly.
```
---

# Version v1.15.5.8 — Align Import Schema With Canonical Export

## A. Goals
- Ensure imported continuous ROC curves correctly restore sample ROC curves using the canonical export schema.
- Support only the canonical field names:
  - `distributions.positives`
  - `distributions.negatives`
  - `samplingSettings`
  - `samplesROC`
- Correctly populate `state.samplesROC`.
- Update the ROC plot renderer and legend logic to display sample ROC curves.
- Remove all legacy or backward-compatible code paths.

## B. Implementation Plan

### 1. Update importer → state assignment
After extracting metadata via `ROCUtils.extractContinuousRocMetadata`, ensure:
```js
state.samplesROC = metadata.samplesROC ?? [];
```
This must occur at the same stage where distributions and samplingSettings are restored.

### 2. Update ROC plot rendering in `drawRocPlot()`
Add logic to display each sample ROC curve:
- Use `metadata.samplesROC` array.
- For each sample:
  - Plot as a polyline using `fpr`, `tpr`, `thr` arrays.
  - Use thinner stroke width (e.g. 1px).
  - Color: `CONFIG.COLORS.sample` or fallback to a default.
- Ensure sample curves render **beneath** the main continuous ROC.

### 3. Add sample curves to interactive legend
Extend the legend creation logic:
- Add entries: `Sample ROC 1`, `Sample ROC 2`, ...
- Each entry toggles visibility via:
```js
visibilityState.roc.sample[k]
```
- Default visibility: `true` for all samples on import.

### 4. Initialize `visibilityState.roc.sample` properly
During import:
```js
visibilityState.roc.sample = {};
state.samplesROC.forEach((_, i) => {
  visibilityState.roc.sample[i] = true;
});
```

### 5. Strict canonical import schema
Remove all support for:
- `meta.samples`
- `meta.sampleRoc`
- `meta.samples_roc`
- old naming such as `meta.sampling`

Only accept:
- `meta.samplesROC`
- `meta.samplingSettings`

### 6. Testing
Use the file `BB_2_samp.json`:
- Continuous curve must load.
- Sample curves must appear automatically.
- Sample curves must be toggleable via legend.
- No console errors.

---

## C. Codex Prompt
```
Implement roadmap milestone v1.15.5.8 from `ContinuousROC_Explorer_Roadmap_v1.15.md`.

Files to modify:
  • continuous_ROC.html
  • ROC_lib.js

Tasks:
1. Update import logic:
   - After extracting metadata, set:
       state.samplesROC = metadata.samplesROC ?? [];
   - Use only canonical keys:
       distributions.positives
       distributions.negatives
       samplingSettings
       samplesROC
   - Remove support for legacy field names.

2. In continuous_ROC.html, update applyImportedContinuousMetadata:
   - Assign sample ROC curves to state.samplesROC.
   - Initialize visibilityState.roc.sample for each sample.

3. Update drawRocPlot():
   - Render each sample ROC curve as a polyline using fpr/tpr/thr.
   - Use thin stroke and color from CONFIG.COLORS.sample.
   - Ensure curves are appended behind the main continuous ROC curve.

4. Update legend rendering code:
   - Add entries “Sample ROC 1”, “Sample ROC 2”, ...
   - Each toggles visibilityState.roc.sample[k], and triggers redraw.

5. Test using BB_2_samp.json:
   - Continuous ROC loads.
   - Sample ROC curves display.
   - Sample curves respond to legend toggles.

Follow the roadmap instructions precisely and do not alter unrelated code.
```

---

# Version v1.15.5.9 — Fix Sample ROC & Histogram Display After Import

## A. Goals
- Ensure **all** imported sample ROC curves are drawn on the ROC plot (not just the first one).
- Wire sample ROC curves correctly into the **interactive legend**, so legend toggles control their visibility.
- Ensure **sample histograms** (for sampled datasets) are restored from metadata and rendered in the Score Distributions plot.
- Keep behavior consistent between:
  - fresh sampling inside the app, and
  - importing previously exported JSON.
- Do not change the canonical JSON schema that was established in v1.15.5.8.

---

## B. Implementation Plan

### 1. State wiring for sample ROC curves and histograms

1.1 **Confirm state properties** in `continuous_ROC.html`:
- There should be state properties for sample curves and histograms, e.g.:
  - `state.samplesROC` (array of sample ROC objects)
  - `state.samplesHist` (histogram data for samples, if present)

1.2 **On import**, after metadata extraction (from v1.15.5.8):
- Ensure that:
  ```js
  state.samplesROC = metadata.samplesROC || [];
  state.samplesHist = metadata.samplesHist || null;
  ```
- This must be done in the same function that restores:
  - distributions
  - samplingSettings
  - continuous ROC data

1.3 **Initialize sample visibility state**:
- Ensure `visibilityState.roc.sample` is an object keyed by sample index:
  ```js
  visibilityState.roc.sample = {};
  state.samplesROC.forEach((_, i) => {
    visibilityState.roc.sample[i] = true; // default ON
  });
  ```
- This must run **every time** new samples are loaded (both after import and after new sampling runs).

---

### 2. Draw all sample ROC curves in drawRocPlot()

2.1 **Bind data correctly**:
- In `drawRocPlot()` (or equivalent), ensure that sample curves are drawn with a standard D3 data join:
  ```js
  const samples = state.samplesROC || [];

  const sampleSel = rocSvg.selectAll(".sample-roc")
    .data(samples);

  sampleSel.exit().remove();

  const sampleEnter = sampleSel.enter()
    .append("path")
    .attr("class", "sample-roc");

  const sampleMerge = sampleEnter.merge(sampleSel);
  ```
- Do **not** use only `samples[0]` or a single path for all samples.

2.2 **Respect visibilityState.roc.sample[i]**:
- When computing the path for each sample, check visibility:
  ```js
  sampleMerge
    .attr("display", (d, i) => visibilityState.roc.sample && visibilityState.roc.sample[i] ? null : "none")
    .attr("d", d => sampleRocLine(d))  // sampleRocLine uses d.fpr / d.tpr
    .attr("stroke-width", 1)           // thin line
    .attr("stroke", CONFIG.COLORS.sample || "#666")
    .attr("fill", "none");
  ```

2.3 **Define sampleRocLine helper if needed**:
- Implement a helper similar to the main ROC line generator, but for sample curves:
  ```js
  const sampleRocLine = d3.line()
    .x((_, i) => xScale(d.fpr[i]))
    .y((_, i) => yScale(d.tpr[i]));
  ```
- Or adapt existing line code to use `d.fpr` / `d.tpr` arrays.

---

### 3. Integrate sample ROC curves into the interactive legend

3.1 **Extend legend items to include sample curves**:
- In the ROC legend-building code, after adding entries for:
  - continuous ROC
  - empirical ROC (if present)
- Add entries for each sample, e.g.:
  ```js
  state.samplesROC.forEach((_, i) => {
    legendItems.push({
      key: `sample-${i}`,
      label: `Sample ROC ${i + 1}`,
      type: "sample",
      index: i
    });
  });
  ```

3.2 **Wire legend toggles to visibilityState.roc.sample**:
- In the legend event handler, add a branch for `item.type === "sample"`:
  ```js
  if (item.type === "sample") {
    const idx = item.index;
    const current = !!visibilityState.roc.sample[idx];
    visibilityState.roc.sample[idx] = !current;
    drawRocPlot();
    return;
  }
  ```

3.3 **Visual feedback in legend**:
- Toggle a CSS class or opacity to show when a sample is hidden:
  ```js
  legendEntry
    .classed("legend-off", !visibilityState.roc.sample[item.index]);
  ```

---

### 4. Restore and display sample histograms in Score Distributions plot

4.1 **State assignment from metadata**:
- Ensure that metadata extraction includes sample histograms, using the canonical name:
  ```js
  if (meta.samplesHist && typeof meta.samplesHist === "object") {
    cleaned.samplesHist = meta.samplesHist;
  }
  ```
- In `continuous_ROC.html`, assign:
  ```js
  state.samplesHist = metadata.samplesHist || null;
  ```

4.2 **Update Score Distributions renderer**:
- In the function that draws score distributions (e.g., `drawScoreDistributions()`):
  - Continue drawing theoretical density curves and empirical histograms.
  - Add logic to draw **sample histograms** (e.g., aggregated, or a representative sample):
    ```js
    if (state.samplesHist) {
      const hist = state.samplesHist; // expect hist.positives, hist.negatives
      // Draw positive sample histogram bars
      // Draw negative sample histogram bars
    }
    ```
- Use subdued colors or transparency so they do not overwhelm the main histograms.

4.3 **Legend / visibility integration for sample histograms** (optional for this milestone):
- For now, it is acceptable if sample histograms are always shown when `state.samplesHist` is present.
- Future versions can add a dedicated legend toggle for sample histograms.

---

### 5. Testing

Use at least two test files exported from v1.15.5.8 or later, including one with multiple samples (e.g., `BB_2_samp.json`):

1. Load the app in a fresh session.
2. Import the JSON file.
3. Verify:
   - Continuous ROC curve appears.
   - **All** sample ROC curves are visible.
   - Each sample ROC curve has a corresponding legend entry.
   - Clicking the legend entry hides/shows its sample curve.
   - Sample histograms (if present in metadata) appear in the Score Distributions plot.
   - No errors or warnings in the console.

---

## C. Codex Prompt
```text
Implement roadmap milestone v1.15.5.9 from `ContinuousROC_Explorer_Roadmap_v1.15.md`.

Goal: Fix sample ROC and histogram display after import so that all imported samples draw correctly, respond to legend toggles, and show their histograms in the Score Distributions plot.

Files to modify:
- continuous_ROC.html
- ROC_lib.js (only if needed to include samplesHist in metadata extraction)

Tasks:
1. Ensure that after metadata import, the following assignments occur:
   state.samplesROC = metadata.samplesROC || [];
   state.samplesHist = metadata.samplesHist || null;
   visibilityState.roc.sample = {};
   state.samplesROC.forEach((_, i) => { visibilityState.roc.sample[i] = true; });

2. In drawRocPlot(), update the sample ROC rendering:
   - Bind data with selectAll(".sample-roc").data(state.samplesROC).
   - Enter/exit/update paths correctly.
   - Use fpr/tpr arrays to generate the path.
   - Respect visibilityState.roc.sample[i] when setting display.

3. Extend the ROC legend builder to create one entry per sample ROC curve:
   - Labels like "Sample ROC 1", "Sample ROC 2", etc.
   - Each legend entry toggles visibilityState.roc.sample[index] and triggers drawRocPlot().

4. In ROCUtils.extractContinuousRocMetadata (ROC_lib.js), ensure that samplesHist is read from meta.samplesHist and passed through as cleaned.samplesHist.

5. In the Score Distributions renderer (continuous_ROC.html), add logic to draw sample histograms when state.samplesHist is present.

6. Remove any reliance on legacy sample or histogram field names; use only:
   samplesROC, samplesHist, samplingSettings.

7. Test with a JSON file generated by v1.15.5.8 that contains multiple samples. Confirm that:
   - All sample curves draw.
   - Legend toggles work for each sample.
   - Sample histograms appear on the Score Distributions plot.

Follow sections A and B of milestone v1.15.5.9 exactly and do not alter unrelated code.
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

```
# v1.15.7.1 — Fix ROC Plot Resizing & Layout Stability When Adding Sampled Curves

## A. Goals
- Prevent the ROC plot `<svg>` from suddenly expanding in size when multiple sampled curves are added.
- Ensure the ROC and Score plots **never exceed their intended dimensions**, regardless of the number of curves.
- Lock the ROC plot’s outer container layout so that additional `<path>` elements do not cause:
  - Auto-resizing of the `<svg>`
  - Overflow that expands its parent `.plot-block`
  - Layout shifts relative to the Score plot
- Ensure all curves are clipped cleanly within the plot area.
- Confirm that legends, axes, and curves still behave normally after clipping.

---

## B. Implementation Plan
Perform all modifications in **`continuous_ROC.html`** (CSS and SVG structure) and **`ROC_lib.js`** (ensuring no dynamic resizing).

### 1. Lock ROC SVG dimensions
Locate:
```js
const rocSvg = d3.select('#rocPlot').append('svg')
```
Change it so the SVG keeps a fixed viewBox and CSS-locked size, e.g.:

```html
style="max-width:540px; width:100%; height:auto;"
```

Verify no sampled-curve code modifies:
- `width`
- `height`
- `viewBox`

### 2. Add a clipping rectangle
Add:
```js
rocContent.append('clipPath')
  .attr('id','rocClip')
  .append('rect')
  .attr('x',0)
  .attr('y',0)
  .attr('width',rocWidth)
  .attr('height',rocHeight);
```
Apply to all ROC paths:
```js
.attr('clip-path','url(#rocClip)')
```

### 3. Prevent dynamic SVG resizing
Search in `ROC_lib.js` for code modifying width/height/viewBox during sampling and remove it.

### 4. Add CSS to stabilize layout
```css
#rocPlot svg {
  max-width: 540px;
  width: 100%;
  height: auto;
  overflow: visible;
}

.roc-samples path {
  vector-effect: non-scaling-stroke;
}

#rocLegend {
  flex-wrap: wrap;
  max-width: 540px;
}
```

### 5. Test
Add 1, 5, 10, 20, 50 samples and confirm:
- No plot expansion
- Score plot stays aligned
- No scrollbars appear unexpectedly

---

## C. Codex Prompt
```
Implement roadmap milestone v1.15.7.1 from `ContinuousROC_Explorer_Roadmap_v1.15.md`.

Files:
  - continuous_ROC.html
  - ROC_lib.js

Steps:
1. Lock ROC SVG size in continuous_ROC.html:
   - Add CSS: max-width:540px; width:100%; height:auto.
   - Ensure no dynamic width/height/viewBox adjustments occur.

2. Add a clipPath (#rocClip) sized to rocWidth × rocHeight.
   - Apply clip-path to rocSampleGroup, rocLinePath, and empiricalRocPath.

3. In ROC_lib.js, remove any code that alters SVG dimensions during sampling.

4. Add CSS:
   - #rocPlot svg { max-width:540px; width:100%; height:auto; }
   - .roc-samples path { vector-effect: non-scaling-stroke; }
   - #rocLegend { flex-wrap:wrap; max-width:540px; }

5. Test by generating many samples; ensure SVG and container no longer expand.

Do not modify unrelated logic.
```
```

---

# Version v1.15.7.2 — Multi-Row Wrapping Legend

## A. Goals
- Prevent the ROC legend from expanding horizontally when many sample ROC curves are present.
- Keep the app layout stable regardless of the number of legend items.
- Make legend items automatically wrap onto multiple rows.
- Maintain full interactivity: every legend item must remain clickable.
- Ensure legend width visually matches the ROC plot width so the two remain aligned.
- Make the solution purely structural/CSS (no need to modify metadata or sampling logic).

---

## B. Implementation Plan

### 1. Update CSS for the ROC legend container
Add or modify CSS in `continuous_ROC.html`:

```css
#rocLegend {
  display: flex;
  flex-wrap: wrap;          /* allows multi-row layout */
  justify-content: flex-start;
  align-items: center;
  gap: 6px 12px;            /* vertical and horizontal spacing */
  max-width: 540px;         /* match ROC plot width */
}
```

### 2. Ensure each legend item is a non-stretching flex child
This ensures items align cleanly without unpredictable width expansion.

```css
#rocLegend .legend-item {
  display: flex;
  align-items: center;
  flex: 0 0 auto;            /* prevent stretching */
  white-space: nowrap;       /* prevent internal wrapping */
  cursor: pointer;
}
```

### 3. Optional: enforce a minimum width per item
This stabilizes rows when sample counts are very large.

```css
#rocLegend .legend-item {
  min-width: 120px;         /* approx. 4–5 items per row */
}
```

### 4. Match legend width to plot width
Ensure the ROC plot container uses a consistent fixed width (as in v1.15.7.1).
This allows legend wrapping to behave predictably.

```css
#rocPlot svg {
  max-width: 540px;
  width: 100%;
}
```

### 5. No JavaScript changes needed
Since the legend items are already generated as a list of interactive `<div>` or `<g>` elements, only styling needs to change.
The legend continues to:
- Build one entry per ROC element
- Toggle visibility through click handlers
- Trigger plot redraws

### 6. Testing
After updating CSS:
1. Generate 20–50 sample ROC curves via “New Sample”.
2. Confirm:
   - Legend wraps onto multiple rows.
   - No horizontal scrolling occurs.
   - ROC plot and Score plot stay properly aligned.
   - Legend item visibility toggles still work.
   - Layout remains stable when adding, removing, or toggling legend items.

---

## C. Codex Prompt
```
Implement roadmap milestone v1.15.7.2 from `ContinuousROC_Explorer_Roadmap_v1.15.md`.

Goal: Make the ROC legend automatically wrap onto multiple rows and prevent horizontal expansion when many items are present.

Files to modify:
- continuous_ROC.html (CSS section only)

Steps:
1. Update the #rocLegend CSS rule:
   - Add: display:flex; flex-wrap:wrap;
   - Add: gap:6px 12px;
   - Add: max-width:540px;

2. Update #rocLegend .legend-item:
   - Add: flex:0 0 auto;
   - Add: white-space:nowrap;
   - Add: display:flex; align-items:center;
   - (Optional) Add: min-width:120px;

3. Ensure #rocPlot svg has max-width:540px; for consistent layout.

4. Do not modify the JavaScript legend logic.

5. Test by generating many sample ROC curves. Confirm the legend wraps onto multiple rows and no layout deformation occurs.

Follow the roadmap instructions precisely without altering unrelated code.
```


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