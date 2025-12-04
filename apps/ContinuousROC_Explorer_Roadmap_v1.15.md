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
- Compute **95% pointwise confidence bands** from sampled ROC curves.
- Use a fixed FPR grid (e.g., 0, 0.01, …, 1).
- Interpolate all sampled ROC curves onto this grid.
- Compute 2.5th and 97.5th percentiles of TPR at each grid point.
- Render:
  - Upper boundary curve
  - Lower boundary curve
  - Filled region between bounds
- Add a single **interactive legend entry** controlling both the boundary curves and the shading.
- Ensure all band graphics remain clipped to the ROC plot area.

---

## B. Implementation Plan

### 1. Define a fixed FPR grid
- In `continuous_ROC.html`, before computing the band, construct:
  ```js
  const fprGrid = d3.range(0, 1.000001, 0.01);
  ```
- Store it in a local variable; no need for global state.

### 2. Interpolate each sampled ROC curve onto the grid
For each `state.samplesROC[i]`:
- Extract arrays: `fpr[]` and `tpr[]`.
- For each grid point `fprGrid[k]`, compute the interpolated TPR:
  - If `fprGrid[k]` matches a sample FPR exactly, use that TPR.
  - Else find the interval `[fpr[j], fpr[j+1]]` containing `fprGrid[k]`.
  - Use linear interpolation:
    ```js
    const alpha = (fprGrid[k] - fpr[j]) / (fpr[j+1] - fpr[j]);
    const tprInterp = tpr[j] + alpha * (tpr[j+1] - tpr[j]);
    ```
- If the grid point lies beyond the last FPR, extrapolate flat using the nearest endpoint.
- Collect all interpolated TPRs into a 2D structure: `tprGrid[sampleIndex][k]`.

### 3. Compute lower and upper quantile curves
- For each grid point `k`:
  ```js
  const arr = tprGrid.map(row => row[k]);
  const lower = d3.quantile(arr, 0.025);
  const upper = d3.quantile(arr, 0.975);
  ```
- Store results in arrays:
  ```js
  state.confBand = {
    fpr: fprGrid,
    lower: lowerArray,
    upper: upperArray
  };
  ```

### 4. Render the confidence band in drawRocPlot()
- Create SVG paths for boundary curves:
  ```js
  rocSvg.append('path')
    .attr('class', 'roc-conf-lower');

  rocSvg.append('path')
    .attr('class', 'roc-conf-upper');
  ```
- Create a polygon (or a D3 area generator) for the shading:
  ```js
  const area = d3.area()
    .x(d => xScale(d.fpr))
    .y0(d => yScale(d.lower))
    .y1(d => yScale(d.upper));
  ```
- Draw only when `visibilityState.rocPlot.confidenceBand` is `true`.
- Apply the existing ROC clipPath (`url(#rocClip)`).

### 5. Integrate with legend
- Add one legend entry: **“Confidence band”**.
- Legend click handler toggles:
  ```js
  visibilityState.rocPlot.confidenceBand
  ```
- This toggles *both* boundary curves and the shaded region.

### 6. Testing
- Generate 50–100 samples.
- Verify the band appears smooth and stable.
- Confirm legend toggle hides both boundaries and shading.
- Confirm ROC plot dimensions remain fixed.
- Confirm zoom/resize behavior stays unchanged.

---

## C. Codex Prompt
```
Implement milestone v1.15.8 from `ContinuousROC_Explorer_Roadmap_v1.15.md`.

Goal: Compute and render 95% pointwise confidence bands using sampled ROC curves.

Files to modify:
  • continuous_ROC.html
  • ROC_lib.js (only if minor helpers are needed)

Steps:
1. In continuous_ROC.html, in the sampling display logic, after computing state.samplesROC:
   - Construct a fixed FPR grid using d3.range(0, 1.000001, 0.01).
   - For each sample ROC, interpolate TPR values at these FPR grid points using linear interpolation.
   - Build arrays `lower[]` and `upper[]` using d3.quantile for the 2.5% and 97.5% quantiles.
   - Store in:
       state.confBand = { fpr: fprGrid, lower: [...], upper: [...] };

2. In drawRocPlot():
   - Add paths for upper and lower boundary curves.
   - Add a shaded region using a d3.area() generator.
   - Clip all band graphics with the existing ROC clipPath.
   - Wrap all rendering in a conditional based on:
       visibilityState.rocPlot.confidenceBand

3. Add a new legend entry labeled “Confidence band”.
   - On click, toggle visibilityState.rocPlot.confidenceBand.
   - Ensure both boundary curves and shading are hidden/shown together.

4. Do not modify sampling logic or distribution logic.
5. Test using 50–100 samples to verify band shape and toggling behavior.

Follow all steps precisely while maintaining the code style and structure.
```

---

# Version v1.15.9 — DeLong Analytic ROC Confidence Bands (Prototype)

## A. Goals
- Add an **analytic, nonparametric DeLong-based method** to compute confidence information for ROC curves.
- Use raw score arrays (positives and negatives) to compute DeLong-style **pointwise ROC confidence bands**.
- Provide an alternative to bootstrap bands (v1.15.8). User can choose either method.
- Integrate DeLong bands into the existing ROC rendering pipeline with shared band-drawing logic.
- Provide a UI control to select band source: None / Bootstrap / DeLong.
- Maintain full compatibility with legend-based visibility toggling.

---

## B. Implementation Plan

### 1. Add DeLong computation function in ROC_lib.js
Create:
```js
ROCUtils.computeDelongRocBand = function(positiveScores, negativeScores, fprGrid, alpha) {
  // Returns { fpr: fprGrid, tpr: [...], lower: [...], upper: [...] }
};
```
Steps inside the function:
1. Compute empirical ROC from raw positive and negative score arrays.
2. Construct DeLong influence functions for positives and negatives.
3. Compute variance of TPR at each FPR in the grid using DeLong’s U-statistic formulas.
4. Compute 95% pointwise normal-theory CI:
   - lower = tpr − z * se
   - upper = tpr + z * se
5. Clamp lower/upper to [0,1].
6. Return full band object.

### 2. Compute DeLong band in continuous_ROC.html
- After obtaining empirical samples (`getProcessedEmpiricalSamples()`):
```js
state.delongBand = ROCUtils.computeDelongRocBand(emp.positives, emp.negatives, fprGrid, 0.05);
```
- Only compute if both arrays are nonempty.

### 3. Refactor ROC band renderer (shared drawing logic)
Create helper:
```js
function drawRocBand(band, cssPrefix) { ... }
```
This function:
- Draws filled band area (`d3.area()`), clipped to #rocClip.
- Draws upper and lower confidence boundary paths.
- Applies cssPrefix-specific classes.

Use:
```js
drawRocBand(state.confBand, 'bootstrap');
drawRocBand(state.delongBand, 'delong');
```
Render only the band corresponding to the selected mode.

### 4. Add UI selector for band type
Add a simple control (radio or dropdown):
- None
- Bootstrap
- DeLong
Bind to:
```js
state.rocBandMode
```
Integrate into existing redraw pipeline.

### 5. Legend integration
- Maintain a **single** legend entry labeled “Confidence band”.
- This entry toggles the visibility of the currently selected band’s components:
  - shading polygon
  - upper/lower boundary paths

### 6. Testing
- Use moderate sample sizes to confirm smoothness.
- Confirm Bootstrap mode still works.
- Confirm DeLong computations are fast.
- Check that legend toggle hides/shows band correctly.

---

## C. Codex Prompt
```
Implement milestone v1.15.9 from `ContinuousROC_Explorer_Roadmap_v1.15.md`.

Goal: Add an analytic DeLong-based ROC confidence band as an alternative to the existing bootstrap band.

Modify only:
  • ROC_lib.js
  • continuous_ROC.html

Steps:
1. In ROC_lib.js, add a new function:
     ROCUtils.computeDelongRocBand(positiveScores, negativeScores, fprGrid, alpha)
   It must:
   - Compute empirical ROC from raw scores.
   - Compute DeLong influence values.
   - Estimate variance of TPR for each FPR in fprGrid.
   - Compute pointwise CI using normal approximation.
   - Return { fpr, tpr, lower, upper }.

2. In continuous_ROC.html:
   - After computing empirical samples, compute:
       state.delongBand = ROCUtils.computeDelongRocBand(emp.positives, emp.negatives, fprGrid, 0.05)
     when both arrays are nonempty.

3. Create shared band renderer:
   - Add drawRocBand(band, cssPrefix) to handle area + boundaries.
   - Apply existing #rocClip clipping.
   - Use:
       drawRocBand(state.confBand, 'bootstrap');
       drawRocBand(state.delongBand, 'delong');

4. Add a UI control for selecting:
   • None
   • Bootstrap
   • DeLong
   Bind its value to state.rocBandMode and render the correct band in drawRocPlot().

5. Keep a single legend entry “Confidence band”.
   It must hide/show the shading and boundaries for whichever band mode is active.

6. Test correctness and performance using realistic score arrays.

Follow the roadmap instructions exactly. Do not modify unrelated code.
```


=====

# Technical Appendix: DeLong-Based Analytic Confidence Bands for ROC Curves

*(with annotated references and implementation guidance)*

---

## 1. Overview

DeLong’s method (DeLong, DeLong & Clarke-Pearson 1988) is widely used for computing the variance of the area under an ROC curve (AUC) via **nonparametric U-statistics**. Although originally applied to AUC, the same influence-function machinery extends naturally to **pointwise inference for the ROC curve** itself—allowing analytic computation of ROC confidence bands.

This appendix provides:
- The theoretical foundation behind DeLong-type bands
- The key references supporting each step
- Explicit connections to your JavaScript implementation

---

## 2. Theoretical Foundations

### 2.1 Basic ROC Definitions
Let:
- \( X_1, \dots, X_m \): positive scores
- \( Y_1, \dots, Y_n \): negative scores

ROC definitions:
\[
TPR(t) = P(X > t), \qquad FPR(t) = P(Y > t)
\]

A ROC point corresponds to a threshold \(t\), or equivalently to a specific FPR value.

---

## 3. DeLong’s U-Statistic Structure

### 3.1 Pairwise comparisons
Define the indicator:
\[
\phi(X_i, Y_j) =
\begin{cases}
1 & X_i > Y_j \\
0.5 & X_i = Y_j \\
0 & X_i < Y_j
\end{cases}
\]

AUC estimator (U-statistic):
\[
\widehat{AUC} = \frac{1}{mn} \sum_{i=1}^m \sum_{j=1}^n \phi(X_i, Y_j)
\]

### 3.2 Influence functions
For variance estimation:
\[
V_i = \frac{1}{n} \sum_{j=1}^n \phi(X_i, Y_j), \qquad
W_j = \frac{1}{m} \sum_{i=1}^m \phi(X_i, Y_j)
\]

These represent the influence each observation has on the estimator.

**Primary Reference:**  
DeLong ER, DeLong DM, Clarke-Pearson DL. *Biometrics* 1988.

---

## 4. Extending DeLong to the ROC Curve

To obtain analytic ROC confidence bands, DeLong’s U-statistic machinery is extended to estimate the variance of **TPR at fixed FPR**.

### Annotated References
1. **Hsieh & Turnbull (1996)** — Derive asymptotic distribution for nonparametric ROC estimators and provide the foundation for analytic ROC bands.
2. **Pepe (2003)** — Applies influence functions to ROC points; gives clear formulas.
3. **Zhou et al. (2002)** — Practical guide for diagnostic ROC methods.

---

## 5. Influence Functions for ROC Points

At threshold \(t\):
\[
\widehat{TPR}(t) = \frac{1}{m} \sum I(X_i > t), \qquad
\widehat{FPR}(t) = \frac{1}{n} \sum I(Y_j > t)
\]

Influence functions define how individual observations shift these quantities.

Variance at FPR \(f\):
\[
Var[\widehat{TPR}(f)] \approx \frac{1}{m}\widehat{TPR}(f)(1-\widehat{TPR}(f))
+ \frac{1}{n} \int [G^{-1}(f)]'^2 d\widehat{H}
\]

(Hsieh & Turnbull 1996).

This defines the analytic structure behind ROC pointwise CIs.

---

## 6. Practical Computation (For Implementation)

For each FPR grid point:
1. Convert FPR → threshold for negatives.
2. Compute empirical TPR.
3. Build influence values:
   - Positives: \( I(X_i > t_f) - TPR(f) \)
   - Negatives: analogous term reflecting threshold perturbation.
4. Estimate variance:
   \[
   Var[\widehat{TPR}(f)] = \frac{1}{m} \sum (IF_i^{(+)})^2 + \frac{1}{n} \sum (IF_j^{(-)})^2
   \]
5. Compute pointwise CI:
   \[
   TPR(f) \pm 1.96 \sqrt{Var}
   \]

This matches the computational target in milestone **v1.15.9**.

---

## 7. Bootstrap vs. DeLong Bands

| Property | Bootstrap (v1.15.8) | DeLong (v1.15.9) |
|---------|----------------------|-------------------|
| Cost | High | Very low |
| Shape | Jagged | Smooth |
| Assumptions | Almost none | Asymptotic normality |
| Band type | Pointwise | Pointwise (analytic) |
| Teaching value | High | Advanced |

Bootstrap bands show sampling variability; DeLong bands give analytic precision.

---

## 8. Recommended Citation

Use this compact citation in your code or roadmap:

> *Analytic ROC confidence bands are computed using the nonparametric U-statistic influence-function method of DeLong, DeLong & Clarke-Pearson (1988), extended to ROC curves per Hsieh & Turnbull (1996), and as described by Pepe (2003) and Zhou et al. (2002).*

---

## 9. Annotated References

**1. DeLong ER, DeLong DM, Clarke-Pearson DL (1988).**
*Comparing the areas under two or more correlated ROC curves: A nonparametric approach.* Biometrics 44(3): 837–845.  
Defines U-statistic variance estimator and influence-function framework.

**2. Hsieh H, Turnbull BW (1996).**
*Nonparametric and semiparametric estimation of the ROC curve.* Annals of Statistics 24(1): 25–40.  
Derives asymptotic ROC distribution; foundation for analytic bands.

**3. Pepe MS (2003).**
*The Statistical Evaluation of Medical Tests for Classification and Prediction.* Oxford University Press.  
Accessible derivations and formulas for ROC intervals.

**4. Zhou X, Obuchowski N, McClish DK (2002).**
*Statistical Methods in Diagnostic Medicine.* Wiley.  
Practical formulas and variance approximations.

**5. Robin X et al. (2011).**
*pROC: an open-source package for R and S+ to analyze and compare ROC curves.* BMC Bioinformatics.  
Shows applied computation of analytic ROC confidence intervals.

---



# Version v1.15.10 — ROC Sample Animation (Playback Only)  ** SKIPPED **

## A. Goals
- Add **animated playback** of sampled ROC curves directly inside the existing ROC plot SVG.
- During animation:
  - Only **one sample curve** is visible at a time.
  - Continuous ROC curve and confidence band remain visible.
  - All non-animated sample curves are hidden.
- Provide UI controls:
  - **Play / Pause** button
  - **Replay** / Restart button
  - **Frame rate slider** (1–30 FPS)
  - **Loop animation** checkbox
- Ensure animation uses the same scales, axes, and clipPaths as the ROC plot.
- Prepare infrastructure for v1.15.11 (APNG export), but no export functionality yet.

---
## B. Implementation Plan

### 1. Add UI controls
In `continuous_ROC.html`, below the ROC plot controls, add a new section:
- `<button id="animPlay">Play</button>`
- `<button id="animPause">Pause</button>`
- `<button id="animRestart">Restart</button>`
- `<input type="range" id="animFPS" min="1" max="30" value="10">`
- `<input type="checkbox" id="animLoop"> Loop animation`

Wrap them in a container `#rocAnimationControls`.

### 2. Add animation state object
In your global `state` object:
```js
state.animation = {
  playing: false,
  index: 0,
  fps: 10,
  loop: false,
  timerID: null
};
```

### 3. Create a dedicated animation layer in the ROC SVG
Inside the ROC plot’s `<svg>` creation (after axes):
```js
const animationLayer = rocSvg.append('g')
  .attr('id', 'rocAnimationLayer')
  .attr('clip-path', 'url(#rocClip)');
```
This layer will hold exactly **one** `<path>` at a time.

### 4. Write function to render one sample curve
Add to ROC drawing code:
```js
function drawAnimatedSample(index) {
  const curve = state.samplesROC[index];
  if(!curve) return;

  const line = d3.line()
    .x(d => xScale(d.fpr))
    .y(d => yScale(d.tpr))
    .curve(d3.curveLinear);

  const pathData = line(curve.points);

  const layer = d3.select('#rocAnimationLayer');
  const p = layer.selectAll('path').data([pathData]);

  p.enter().append('path')
    .merge(p)
    .attr('d', pathData)
    .attr('class', 'animated-sample')
    .attr('stroke', state.config.colors.sampleAnimation)
    .attr('stroke-width', 2)
    .attr('fill', 'none');

  p.exit().remove();
}
```

### 5. Implement animation loop
In `continuous_ROC.html`:
```js
function stepAnimation() {
  if(!state.animation.playing) return;

  drawAnimatedSample(state.animation.index);
  state.animation.index++;

  if(state.animation.index >= state.samplesROC.length) {
    if(state.animation.loop) {
      state.animation.index = 0;
    } else {
      state.animation.playing = false;
      return;
    }
  }

  state.animation.timerID = setTimeout(stepAnimation, 1000 / state.animation.fps);
}
```

### 6. Attach UI event handlers
```js
document.getElementById('animPlay').onclick = () => {
  if(!state.samplesROC || !state.samplesROC.length) return;
  state.animation.playing = true;
  stepAnimation();
};

document.getElementById('animPause').onclick = () => {
  state.animation.playing = false;
  clearTimeout(state.animation.timerID);
};

document.getElementById('animRestart').onclick = () => {
  state.animation.index = 0;
  drawAnimatedSample(0);
};

document.getElementById('animFPS').oninput = (e) => {
  state.animation.fps = +e.target.value;
};

document.getElementById('animLoop').onchange = (e) => {
  state.animation.loop = e.target.checked;
};
```

### 7. Hide all static sample curves during animation
In `drawRocPlot()`:
```js
if(state.animation.playing) {
  d3.select('#rocSampleGroup').attr('display', 'none');
} else {
  d3.select('#rocSampleGroup').attr('display', null);
}
```
This ensures only the animated curve is visible.

### 8. Testing
- Generate 5–50 samples.
- Verify animation cycles through them at selected FPS.
- Verify loop mode works.
- Verify pause/resume works.
- Ensure animation layer uses existing ROC clipPath.

---
## C. Codex Prompt
```
Implement milestone v1.15.10 from `ContinuousROC_Explorer_Roadmap_v1.15.md`.

Goal: Add sampled ROC curve animation inside the existing ROC plot SVG.

Modify:
  • continuous_ROC.html (UI + logic + SVG layer)

Steps:
1. Add new UI controls (Play, Pause, Restart, FPS slider, Loop checkbox).
2. Add state.animation object.
3. Add a new <g id="rocAnimationLayer"> inside the ROC SVG, clipped with #rocClip.
4. Add drawAnimatedSample(index) that draws a single ROC sample curve.
5. Add stepAnimation() loop using setTimeout and current FPS.
6. Add event handlers for play/pause/restart/FPS/loop.
7. In drawRocPlot(), hide static sample curves when animation is active.
8. Test with generated samples to ensure playback works correctly.

Do not modify unrelated code.
```

---


# Version v1.15.11 — Export ROC Sample Animation as APNG ** SKIPPED **

## A. Goals
- Add **APNG export** for the sampled ROC curve animation created in v1.15.10.
- Export the animation **exactly as it appears in the existing ROC plot SVG**, including:
  - One sample curve per frame
  - Continuous ROC curve (visible)
  - CI band (if visible)
  - Axis lines and labels
- Use a **fixed frame rate** set by the user
- Support looping (respect the `Loop animation` checkbox)
- Produce a downloadable `.png` / `.apng` file
- Ensure APNG export is **pixel-perfect** and identical to the preview animation

---

## B. Implementation Plan

### 1. Add a new export button
In `continuous_ROC.html`, under animation controls, add:
```html
<button id="animExport">Export Animation (APNG)</button>
```

### 2. Determine frame sequence
- Use the same sample order as the animation layer in v1.15.10.
- Frame count = number of sample ROC curves.
- Time per frame = `1000 / state.animation.fps` (in ms).
- Looping: if `state.animation.loop` is true, embed APNG loop info.

### 3. Convert each frame to a raster image
APNG requires raster frames, so for each sample curve:
1. Draw the frame into the **existing ROC plot SVG** as in v1.15.10:
   ```js
   drawAnimatedSample(i);
   ```
2. Convert the current ROC SVG to a `<canvas>` using:
   - `XMLSerializer()` to get SVG XML
   - Create a Blob URL
   - Draw onto `<canvas>` via an `<img>`
3. Obtain PNG binary data for this frame:
   ```js
   const pngData = canvas.toDataURL('image/png');
   ```

### 4. Build an APNG encoder
Use a browser-compatible APNG encoder (JavaScript implementation). For example:
- UPNG.js (widely used, no dependencies)
- Or implement minimal APNG assembly manually (recommended: UPNG for reliability)

Add UPNG.js directly into the HTML:
```html
<script src="UPNG.js"></script>
```
(Place this next to your existing JS includes.)

### 5. Construct APNG using UPNG.js
After generating all PNG frames:
```js
const apng = UPNG.encode(framesRGBAArray, width, height, 0, frameDelaysArray);
const blob = new Blob([apng], {type: "image/png"});
```
where:
- `framesRGBAArray` is an array of `Uint8Array` RGBA buffers (one per frame)
- `frameDelaysArray` contains delays in **milliseconds** per frame
- Width/height match the rendered canvas

### 6. Trigger download
Add code:
```js
const url = URL.createObjectURL(blob);
const a = document.createElement("a");
a.href = url;
a.download = "roc_animation.apng";
a.click();
URL.revokeObjectURL(url);
```

### 7. UI integration
Bind the button:
```js
document.getElementById('animExport').onclick = async () => {
  await exportRocAnimationAPNG();
};
```

### 8. Add exportRocAnimationAPNG() function
In `continuous_ROC.html` add:
```js
async function exportRocAnimationAPNG() {
  const fps = state.animation.fps;
  const delay = Math.round(1000 / fps);
  const samples = state.samplesROC;
  if(!samples || !samples.length) return;

  const frames = [];
  const delays = [];

  for(let i = 0; i < samples.length; i++) {
    drawAnimatedSample(i);
    const png = await svgToPngCanvasData();  // helper described below
    frames.push(png.rgba);
    delays.push(delay);
  }

  const width = frames[0].width;
  const height = frames[0].height;

  const apng = UPNG.encode(frames.map(f => f.data), width, height, 0, delays);
  const blob = new Blob([apng], {type:"image/png"});

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'roc_animation.apng';
  a.click();
  URL.revokeObjectURL(url);
}
```

### 9. Add the svgToPngCanvasData() helper
```js
function svgToPngCanvasData() {
  return new Promise(resolve => {
    const svg = document.querySelector('#rocPlot svg');
    const xml = new XMLSerializer().serializeToString(svg);
    const svg64 = btoa(unescape(encodeURIComponent(xml)));
    const imgSrc = 'data:image/svg+xml;base64,' + svg64;

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = svg.clientWidth;
      canvas.height = svg.clientHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      resolve({
        data: imageData.data,
        width: canvas.width,
        height: canvas.height
      });
    };
    img.src = imgSrc;
  });
}
```

### 10. Testing
- Run animation preview in-app.
- Export APNG.
- Verify frame sequence and timing.
- Confirm that continuous ROC and CI band match the preview.
- Ensure large frame sets (e.g., 100 frames) export without freezing.

---

## C. Codex Prompt
```
Implement milestone v1.15.11 from `ContinuousROC_Explorer_Roadmap_v1.15.md`.

Goal: Add APNG export for sampled ROC curve animations.

Modify:
  • continuous_ROC.html (UI, APNG logic, SVG→PNG conversion, UPNG integration)

Steps:
1. Add the Export Animation (APNG) button.
2. Add UPNG.js <script> tag for APNG encoding.
3. Add exportRocAnimationAPNG() to:
   - Loop through sample ROC curves
   - Render each into the existing ROC SVG
   - Convert SVG to canvas → RGBA data
   - Collect frames and delays
   - Encode into APNG
   - Trigger file download
4. Add svgToPngCanvasData() helper to rasterize frames.
5. Bind animExport button to export function.
6. Confirm exported APNG matches preview animation.

Do not modify unrelated logic.
```

---

# Version v1.15.12 — Global Busy Indicator & Async Operation Wrapper (No Animation Dependencies)

## A. Goals
- Add a **global busy indicator** to the Continuous ROC Explorer.
- Ensure *any long-running computation* automatically triggers:
  - A visual overlay spinner
  - A `state.busy = true` flag
  - Temporary disabling of UI controls
- Hide the indicator automatically when the operation completes.
- Provide a reusable wrapper:
  ```js
  await withBusy(async () => {
      // long-running work
  });
  ```
- Apply wrapping to current expensive operations:
  - Continuous sampling (v1.15.7)
  - Confidence band computation (v1.15.8)
  - DeLong analytic computation (v1.15.9)
  - Large-file JSON import parsing
- **Exclude animation-related features**, as those milestones were deferred.

---

## B. Implementation Plan

### 1. Add busy indicator HTML
Insert immediately inside `<body>` of `continuous_ROC.html`:
```html
<div id="busyOverlay" style="display:none;">
  <div id="busySpinner"></div>
</div>
```

### Add CSS styling
Add to the existing `<style>` block:
```css
#busyOverlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0,0,0,0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}
#busySpinner {
  width: 60px;
  height: 60px;
  border: 8px solid #eee;
  border-top-color: #4285f4;
  border-radius: 50%;
  animation: spin 0.9s linear infinite;
}
@keyframes spin { 100% { transform: rotate(360deg); } }
```

---

### 2. Add global busy flag
Inside the main `state` object in `continuous_ROC.html`:
```js
state.busy = false;
```

---

### 3. Add withBusy() wrapper
Place near other utility helpers:
```js
async function withBusy(fn) {
  try {
    state.busy = true;
    document.getElementById('busyOverlay').style.display = 'flex';
    disableUiDuringBusy(true);
    return await fn();
  } finally {
    state.busy = false;
    document.getElementById('busyOverlay').style.display = 'none';
    disableUiDuringBusy(false);
  }
}
```

---

### 4. Add disableUiDuringBusy()
```js
function disableUiDuringBusy(disabled) {
  const controls = document.querySelectorAll('input, button, select');
  controls.forEach(el => {
    if (el.id !== 'busyOverlay') el.disabled = disabled;
  });
}
```

---

### 5. Wrap all long-running operations (no animations)

#### Sampling
Replace any call to:
```js
generateSamples();
```
with:
```js
await withBusy(async () => {
  await generateSamples();
});
```

#### Confidence bands
Wrap bootstrap/pointwise CI computation in the same way.

#### DeLong computation
e.g.:
```js
await withBusy(async () => {
  computeDelongRocBand(...);
});
```

#### Heavy JSON import
Wrap the *processing* of imported data (not the file chooser):
```js
await withBusy(async () => {
  await processImportedCurve(jsonData);
});
```

---

### 6. Testing
- Sampling ≥ 50 replicates triggers busy overlay.
- Confidence band computation displays overlay.
- DeLong analytic computation displays overlay.
- Large curve JSON import displays overlay briefly.
- UI controls disabled during busy; restored after.

---

## C. Codex Prompt
```
Implement milestone v1.15.12 from `ContinuousROC_Explorer_Roadmap_v1.15.md`.

Goal: Add a global busy indicator and async wrapper, without referencing any animation features.

Modify only:
  • continuous_ROC.html

Steps:
1. Insert #busyOverlay and #busySpinner markup inside <body>.
2. Add CSS for the overlay and spinner.
3. Add state.busy = false to global state.
4. Add withBusy(fn) helper and disableUiDuringBusy(disabled).
5. Wrap long-running operations using withBusy():
   - sample generation
   - confidence band computation
   - DeLong band computation
   - large JSON import handlers
6. Ensure UI controls disable and re-enable appropriately.
7. Do NOT modify or reference any animation code.
8. Do not change unrelated functions or structures.
```

# Version v1.15.12.1 — Fix Busy Spinner Visibility & Default Band Mode

## A. Goals
- Make the **busy spinner actually visible** during long-running operations by ensuring the browser has a chance to repaint before heavy work starts.
- Set **"None" as the default confidence band mode**, so confidence bands are not computed unless explicitly requested.
- **Avoid forcing resampling on every keystroke** in the sample-size input; updating the sample size should not immediately trigger a full resample for each typed character.
- Keep the global busy indicator design from v1.15.12, but correct its wiring and usage.

---

## B. Implementation Plan

### 1. Make `rocBandMode` default to "none"
In the initial `state` object in `continuous_ROC.html`, change the default band mode:
```js
const state = {
  // ... other fields ...
  rocBandMode: 'none',
  busy: false
};
```

Ensure the `<select id="rocBandMode">` is initialized from `state.rocBandMode` (this should already be in place from prior milestones).

### 2. Guard confidence-band computation by `rocBandMode`
Wherever confidence bands are computed (e.g., inside `regenerateSampleRocs` or a band-related helper):
- Only compute bootstrap bands if `state.rocBandMode === 'bootstrap'`.
- Only compute DeLong bands if `state.rocBandMode === 'delong'`.
- If `state.rocBandMode === 'none'`:
  - Skip band computation entirely.
  - Clear existing band data (`state.confBand`, `state.delongBand`) if needed.

Example pattern:
```js
if (state.rocBandMode === 'bootstrap') {
  computeBootstrapBand();
} else if (state.rocBandMode === 'delong') {
  computeDelongBand();
} else {
  state.confBand = null;
  state.delongBand = null;
}
```

### 3. Refactor `regenerateSampleRocs` to use `withBusy`
Change `regenerateSampleRocs` into an `async` function that wraps heavy work with `withBusy` so the spinner can paint before the sampling loop runs.

Example transformation:
```js
async function regenerateSampleRocs(force = false) {
  if (!force && !state.autoResample) return;

  await withBusy(async () => {
    const numSamples = Math.max(1, Number(state.numSamples) || 1);
    const { nPos, nNeg } = getSampleCounts();
    const curves = [];

    for (let i = 0; i < numSamples; i++) {
      const posSamples = sampleDistribution('pos', state.posComponents, nPos);
      const negSamples = sampleDistribution('neg', state.negComponents, nNeg);
      const points = [
        ...posSamples.map(score => ({ score, label: 1 })),
        ...negSamples.map(score => ({ score, label: 0 }))
      ];
      const rocPoints = ROCUtils.computeEmpiricalRoc(points);
      const mapped = pointsToRocArrays(rocPoints);
      if (mapped) curves.push(mapped);
    }

    state.samplesROC = curves;
    // (Re)initialize sample visibility and legend
    visibilityState.roc.sample = {};
    state.samplesROC.forEach((_, idx) => { visibilityState.roc.sample[idx] = true; });
    refreshRocLegend();

    // Band computation guarded by rocBandMode
    if (state.rocBandMode === 'bootstrap') {
      computeBootstrapBand();
    } else if (state.rocBandMode === 'delong') {
      computeDelongBand();
    } else {
      state.confBand = null;
      state.delongBand = null;
    }

    update();
  });
}
```

Any existing callers that do `await regenerateSampleRocs(true)` will now allow the spinner to become visible.

### 4. Stop resampling on every keystroke in the sample-size input
Locate the event listener on the sample-size input (e.g., `#sampleSizeInput` or similar). It likely looks roughly like:
```js
sampleSizeInput.addEventListener('input', async () => {
  state.numSamples = Number(sampleSizeInput.value) || 0;
  await regenerateSampleRocs(true);
});
```

Change this behavior so that:
- `input` events **only update `state.numSamples`**.
- Resampling is triggered explicitly by:
  - a "New Sample" button, **or**
  - a `change` event (on blur / Enter), if you prefer.

Example:
```js
if (sampleSizeInput) {
  sampleSizeInput.addEventListener('input', () => {
    state.numSamples = Number(sampleSizeInput.value) || 0;
  });

  // Optional: only resample when the user commits the change
  sampleSizeInput.addEventListener('change', async () => {
    await regenerateSampleRocs(true);
  });
}
```

If you already have a "New Sample" or "Resample" button, you can instead:
- Keep the `input` handler for state updates only.
- Attach `await regenerateSampleRocs(true);` to the explicit **button** click handler.

### 5. Ensure `withBusy` is used only for non-interactive heavy tasks
- Do **not** wrap purely UI interactions that are fast.
- Do wrap:
  - sampling (via `regenerateSampleRocs`)
  - confidence band computation
  - DeLong band computation
  - large JSON import processing

`withBusy` already yields a frame via `requestAnimationFrame`, so once it wraps the heavy code, the spinner overlay will be visible.

### 6. Testing
- Set band mode to **None** and type into the sample-size field:
  - No band computations should run.
  - No resampling on each keystroke.
- Trigger sampling explicitly (button or `change` event):
  - Busy spinner should appear while samples are generated.
- Switch band mode to **Bootstrap** or **DeLong** and trigger sampling:
  - Spinner should remain visible while both sampling and band computation run.

---

## C. Codex Prompt
```
Implement milestone v1.15.12.1 from `ContinuousROC_Explorer_Roadmap_v1.15.md`.

Title: Fix Busy Spinner Visibility & Default Band Mode.

Modify only:
  • continuous_ROC.html

Goals:
  • Make the global busy spinner visible during long-running operations.
  • Set the default confidence band mode to "none".
  • Avoid forcing resampling on every keystroke in the sample-size input.

Steps:
1. In the global state initialization, change:
     rocBandMode: 'bootstrap'
   to:
     rocBandMode: 'none'

2. In the code that computes confidence bands, guard computation by state.rocBandMode:
   • If 'bootstrap' → compute bootstrap band.
   • If 'delong' → compute DeLong band.
   • If 'none' → skip band computation and clear any existing band objects if necessary.

3. Refactor regenerateSampleRocs to be async and to wrap its heavy work in withBusy(async () => { ... }).
   • Inside the withBusy block, perform sampling loops, rebuild state.samplesROC, update visibilityState/legend, compute bands conditioned on rocBandMode, and call update().

4. Update the sample-size input handlers:
   • On 'input': only update state.numSamples from the field value; do not call regenerateSampleRocs.
   • On 'change' (or via an existing explicit "New Sample" button): call await regenerateSampleRocs(true).

5. Do not wrap trivial UI changes in withBusy. Use withBusy only for heavy computations: sampling, band computations, and large JSON import processing.

6. Test:
   • With band mode 'none', typing into sample size should not resample or show the spinner.
   • Triggering sampling explicitly should show the spinner and disable controls until done.
   • Band modes 'bootstrap' and 'delong' should still work, with spinner visible during heavy work.

Do not modify unrelated logic.
```

Uncaught SyntaxError: await is only valid in async functions, async generators and modules continuous_ROC.html:1433:11

---

# Version v1.15.12.2 — Sample-Based Histograms from Last Sample

## A. Goals
- When samples are generated in the **Sampling engine**, the **Score Distributions** plot should show histograms derived from **a single sampled dataset**.
- If multiple samples are generated, the histograms should use the **last sample**.
- The histogram data should:
  - Be stored in `state.samplesHist` in the same shape used by the existing score-plot code.
  - Integrate with the existing `hasSampleHist` / legend logic so that the interactive legend can show/hide them.
- Imported ROC curves with `samplesHist` metadata should continue to work as before.

---

## B. Implementation Plan

### 1. Add a helper to compute histograms from a single sample
The helper remains the same, but all wording now refers to using the **last** sample, not the last.

### 2. Capture the last sample’s scores in `regenerateSampleRocs`
During the sampling loop, overwrite temporary variables on every iteration so the **last** sample replaces earlier ones:

```js
let lastPosSamples = null;
let lastNegSamples = null;

for (let i = 0; i < numSamples; i++) {
  const posSamples = sampleDistribution('pos', state.posComponents, nPos);
  const negSamples = sampleDistribution('neg', state.negComponents, nNeg);

  // Always keep the most recent sample
  lastPosSamples = posSamples;
  lastNegSamples = negSamples;

  const points = [
    ...posSamples.map(score => ({ score, label: 1 })),
    ...negSamples.map(score => ({ score, label: 0 }))
  ];
  const rocPoints = ROCUtils.computeEmpiricalRoc(points);
  const mapped = pointsToRocArrays(rocPoints);
  if (mapped) curves.push(mapped);
}
```

After the loop:
```js
if (lastPosSamples && lastNegSamples) {
  state.samplesHist = computeSampleHistogramsFromSample(lastPosSamples, lastNegSamples);
} else {
  state.samplesHist = null;
}
```

### 3. Preserve imported `samplesHist` behavior
Import logic stays unchanged—imported histograms override local ones.

### 4. Verify integration
- `state.samplesHist` now reflects the most recently generated (last) sample.
- The Score Distributions plot shows this histogram.
- Legend controls remain fully functional.

### 5. Testing
1. Generate multiple samples.
2. Confirm the histogram matches the **last** sample’s distribution.
3. Hide/show via legend.
4. Import metadata with `samplesHist` and confirm correct behavior.

## C. Codex Prompt Codex Prompt
```
Implement milestone v1.15.12.2 from `ContinuousROC_Explorer_Roadmap_v1.15.md`.

Title: Sample-Based Histograms from First Sample.

Modify only:
  • continuous_ROC.html

Goals:
  • After generating samples, populate state.samplesHist from a SINGLE sample (the last one) so that the Score Distributions plot can show histograms.
  • Preserve the behavior for imported ROC curves that already provide samplesHist in metadata.

Steps:
1. Add a helper function computeSampleHistogramsFromSample(posScores, negScores) near computeEmpiricalHistograms:
   - Accept arrays of positive and negative scores.
   - Compute a domain [minX, maxX] from these scores.
   - Construct histogram bins (10–40 bins, like computeEmpiricalHistograms).
   - Store density per bin and return an object {positives, negatives, domain, binCount}.

2. In regenerateSampleRocs:
   - Track the LAST sample’s pos/neg scores in local variables (lastPosSamples, lastNegSamples).
   - After the sampling loop, if lastPosSamples/lastNegSamples exist, call computeSampleHistogramsFromSample and assign the result to state.samplesHist.
   - If no samples are generated, set state.samplesHist = null.
   - Keep the existing samplesROC logic and band-mode branching; only extend it with samplesHist support.

3. Do NOT modify applyImportedContinuousMetadata or the existing score-distribution drawing logic.
   - Imported curves with samplesHist should continue to work as before.

4. Test:
   - Generate samples and confirm histograms appear on the Score Distributions plot using the last sample.
   - Use the legend to hide/show histograms.
   - Import a ROC JSON with samplesHist and confirm imported hist behavior remains correct.

Do not change unrelated logic.

---


# Version v1.15.12.3 — Implement True DeLong Analytic ROC Confidence Bands

## A. Goals
Implement a **mathematically correct DeLong nonparametric analytic confidence band** for ROC curves. This replaces the existing placeholder band (which incorrectly uses a binomial TPR variance formula) with a full U-statistic–based estimator.

A correct DeLong implementation will:
- Use **pairwise sample comparisons** between positive and negative scores.
- Compute **influence functions** for both classes.
- Build **positive-side** and **negative-side** covariance matrices.
- Compute the **AUC covariance structure**.
- Produce **variance and covariance of TPR across thresholds**.
- Construct **pointwise analytic bands**:
  ```
  TPR(fpr) ± z * sqrt(Var[TPR(fpr)])
  ```
- Integrate cleanly with the existing ROC rendering pipeline.
- Control visibility via the ROC legend entry.

**Simultaneous (uniform) bands** are NOT included in this milestone; a separate milestone may build on this analytic foundation.

---

## B. Implementation Plan

### 1. Add a new DeLong implementation module inside `ROC_lib.js`
Insert a new function (near other ROCUtils helpers):
```js
ROCUtils.computeDelongTPRBand = function(posScores, negScores, fprGrid, z=1.96) {
  // 1. U-statistic pairwise comparison matrix
  // 2. Positive and negative influence vectors
  // 3. Covariance estimation (S+, S−)
  // 4. ROC curve computation
  // 5. Variance of TPR at each FPR grid point
  // 6. Compute analytic CI bands
  // 7. Return { lower: [...], upper: [...], fpr: fprGrid }
};
```

#### Step 1. Pairwise comparison matrix
For each positive score `Xp[i]` and negative score `Xn[j]`:
```js
if (Xp[i] > Xn[j]) Vij = 1;
else if (Xp[i] === Xn[j]) Vij = 0.5;
else Vij = 0;
```
Store a `P × N` matrix of these comparisons.

#### Step 2. Influence functions
Positive-side influence vector (length P):
```js
Vpos[i] = mean_j(Vij);
```
Negative-side influence vector (length N):
```js
Vneg[j] = mean_i(Vij);
```

#### Step 3. Covariance components
```js
Spos = variance(Vpos);
Sneg = variance(Vneg);
```
These represent the class-specific components of the AUC covariance.

#### Step 4. Compute empirical ROC
Call an existing helper:
```js
const roc = ROCUtils.computeEmpiricalRoc(points);
```
Interpolate the empirical TPR values to align with `fprGrid`.

#### Step 5. TPR variance across thresholds
DeLong gives:
```
Var(AUC) = Spos / P + Sneg / N
```
But for **TPR at a threshold**, use class-conditional variances:
```
Var(TPR) = Var( I{Xp > threshold} ) / P  +  Var( I{Xn > threshold} ) / N
```
where these binary indicator variances are computed directly from data.

This yields **pointwise DeLong intervals** at each FPR grid location.

#### Step 6. Build CI bands
For each grid point:
```js
se = Math.sqrt(VarTPR);
lower[k] = Math.max(0, tpr[k] - z * se);
upper[k] = Math.min(1, tpr[k] + z * se);
```
Return arrays matching `fprGrid`.

---

### 2. Update the ROC plotting logic (in `continuous_ROC.html`)
Where ROC bands are drawn:
- Add logic so that when:
  ```js
  state.rocBandMode === 'delong'
  ```
  the renderer uses:
  ```js
  state.delongBand.lower, state.delongBand.upper, state.delongBand.fpr
  ```
- Ensure the **confidence-band legend entry** toggles both shaded region and boundary lines.
- Remove all references to the old placeholder band.

---

### 3. Update sampling → band-computation logic
Where sampling completes:
```js
if (state.rocBandMode === 'delong') {
  const pos = /* last sample positive scores */;
  const neg = /* last sample negative scores */;
  const grid = computeFprGrid();
  state.delongBand = ROCUtils.computeDelongTPRBand(pos, neg, grid);
}
```
Ensure bootstrap and “none” modes function unchanged.

---

### 4. Integrate with import/export
Export:
```js
metadata.roc.delongBand = state.delongBand;
```
Import:
```js
state.delongBand = meta.roc.delongBand || null;
```
Do **not** compute the band automatically on import.

---

### 5. Remove old placeholder DeLong code
Delete the previous function that used:
```js
variance = tpr * (1 - tpr) / nPos
```
so that only the correct implementation remains.

---

## C. Codex Prompt
```
Implement milestone v1.15.12.3 from `ContinuousROC_Explorer_Roadmap_v1.15.md`.

Goal: Replace the existing placeholder "DeLong" band with a mathematically correct
U-statistic–based DeLong analytic ROC confidence band.

Modify only:
  • ROC_lib.js
  • continuous_ROC.html

Steps:
1. In ROC_lib.js, add a new function:
      ROCUtils.computeDelongTPRBand(posScores, negScores, fprGrid, z)
   implementing the full U-statistic method:
   - Construct the pairwise comparison matrix Vij.
   - Compute influence vectors Vpos and Vneg.
   - Compute Spos and Sneg.
   - Compute empirical ROC and interpolate TPR to fprGrid.
   - Compute pointwise DeLong variance of TPR.
   - Build lower/upper CI band arrays.
   - Return { lower, upper, fpr: fprGrid }.

2. Remove the old placeholder DeLong function (the one using tpr*(1-tpr)/nPos).

3. In continuous_ROC.html, update the ROC rendering logic so that:
   - When state.rocBandMode === 'delong', the plot uses state.delongBand.
   - Ensure the legend entry for confidence bands toggles visibility for the
     shading and boundary lines.

4. Update the sampling-completion logic so that when rocBandMode === 'delong':
   - Compute state.delongBand by calling ROCUtils.computeDelongTPRBand with
     the last sample’s positive and negative score arrays.

5. Update import/export logic so metadata includes delongBand and restores it
   when present.

Do not modify unrelated functionality.
```

---

# Version v1.15.12.5 — Estimated ROC Curve & Unified Sample Legend with Bands

## A. Goals

1. **Estimated ROC Curve from Samples**
   - After a sampling run, compute a **pooled / estimated ROC curve** from the set of sampled empirical ROC curves.
   - Name this curve using the pattern:
     
     > `"<baseCurveName> (estimated)"`

   - Treat this as a canonical ROC curve object (with `fpr`, `tpr`, `auc`, and `bands`) **separate from** the analytic continuous curve.

2. **Attach Confidence Bands to the Estimated Curve (Not the Analytic Curve)**
   - Compute pointwise confidence bands (bootstrap or DeLong) over an FPR grid from the sampled ROC curves.
   - Attach bands to the **estimated curve only**, using the canonical `bands[]` structure already supported by `ROC_lib.js`.
   - Include method metadata so other apps (e.g., `ROC_utility`) know how the band was computed.

3. **Legend Consolidation for Samples & Estimated Curve**
   - Provide **one ROC legend entry** that toggles visibility of **all sample curves** as a group.
   - Give the estimated curve its **own legend entry** (distinct color), separate from both the analytic curve and the sample bundle.
   - Keep the existing legend entry for the **confidence band** that toggles band shading and boundaries together.

4. **Interoperable Export/Import**
   - Export the estimated curve and its bands via the canonical ROC JSON used throughout the app ecosystem.
   - Import that JSON back into Continuous ROC Explorer and make the estimated curve usable in the UI.
   - Ensure other apps (especially `ROC_utility`) can consume the estimated curve and its bands without changes to their core logic.

---

## B. Implementation Plan

### 1. Compute the Estimated ROC Curve After Sampling

**Files:** `continuous_ROC.html`

1. Identify where sampled ROC curves are stored after a sampling run (e.g., `state.samplesROC`, `state.sampling.samples`, or similar structures derived from `ROC_lib`).
2. Define an internal FPR grid for the estimated curve (e.g., shared with the existing band computation grid):
   ```js
   const estimatedFprGrid = d3.range(0, 1 + 1e-9, config.sampling.fprStep || 0.01);
   ```
3. For each sampled ROC curve:
   - Extract its `(fpr, tpr)` points.
   - Interpolate `tpr` onto `estimatedFprGrid` using linear interpolation.
4. Compute the **estimated ROC curve** as the pointwise mean across samples:
   ```js
   const tprMean = estimatedFprGrid.map((fpr, i) => mean(samplesTprByGrid[i]));
   ```
5. Compute the AUC for this estimated curve using existing ROC utilities (`ROCUtils.aucFromCurve` or equivalent helper). Store:
   ```js
   const estimatedCurve = {
     fpr: estimatedFprGrid,
     tpr: tprMean,
     auc: estimatedAuc,
     bands: [],
     metadata: {
       source: "continuous_roc_explorer",
       role: "estimated_from_samples"
     }
   };
   ```
6. Use the base curve name (current continuous curve name) to construct the **estimated curve name**:
   ```js
   const baseName = state.currentCurveName; // or equivalent
   const estimatedName = `${baseName} (estimated)`;
   ```
7. Store the estimated curve in the app’s internal curve collection so it can be exported via the canonical JSON path (e.g., in the structure passed into `ROCUtils.toCanonicalRocObject` / exporter):
   ```js
   state.estimatedCurves[estimatedName] = estimatedCurve;
   ```

### 2. Compute Confidence Bands on the Estimated Curve

**Files:** `continuous_ROC.html`, `ROC_lib.js` (for helpers if needed)

1. Using the same interpolated per-sample TPR values from Step 1, compute pointwise quantiles for a 95% band:
   ```js
   const lower = quantile(samplesTprByGrid[i], 0.025);
   const upper = quantile(samplesTprByGrid[i], 0.975);
   ```
2. Add a band entry to `estimatedCurve.bands` using the **canonical `bands[]` structure** already understood by `ROC_lib.js`:
   ```js
   estimatedCurve.bands.push({
     level: 0.95,
     lower,
     upper,
     method: state.sampling.bandMethod || "bootstrap", // or "delong"
     n_samples: state.sampling.numSamples || samplesCount,
     grid: "fpr",
     source: "continuous_roc_explorer"
   });
   ```
3. Ensure `lower.length` and `upper.length` exactly match `estimatedCurve.fpr.length` so that `ROCUtils.normalizeRocJson` will accept the band and downstream apps can use it without special-casing.
4. If DeLong analytic bands are used instead of bootstrap, compute them on the same FPR grid and store them in a separate band object with `method: "delong"` (or similar identifier).

### 3. Legend Consolidation: Samples & Estimated Curve

**Files:** `continuous_ROC.html`

1. **Sample ROC curves legend entry**:
   - Remove any existing code that creates one legend entry per sample curve.
   - Add a single entry during ROC legend construction:
     ```js
     addLegendItem({
       key: "sampleCurves",
       label: "Sample ROC Curves",
       color: config.colors.sampleCurve,
       visible: visibilityState.rocPlot.sampleCurves
     });
     ```
   - In the legend click handler:
     ```js
     if (item.key === "sampleCurves") {
       visibilityState.rocPlot.sampleCurves = !visibilityState.rocPlot.sampleCurves;
       drawROCPlot();
     }
     ```
   - In `drawROCPlot()`, wrap drawing of **all** sample ROC curves with:
     ```js
     if (visibilityState.rocPlot.sampleCurves) {
       // draw each sample curve
     }
     ```

2. **Estimated curve legend entry**:
   - When building legend entries for canonical curves, include an entry for the estimated curve using the generated name:
     ```js
     addLegendItem({
       key: `curve-${estimatedName}`,
       label: estimatedName,
       color: config.colors.estimatedCurve,
       visible: visibilityState.rocPlot.estimatedCurves[estimatedName] !== false
     });
     ```
   - In the click handler, toggle the visibility flag for that curve and redraw.
   - In `drawROCPlot()`, when iterating over curves, check this visibility flag before drawing the estimated curve.

3. **Confidence band legend entry (existing)**:
   - Keep the existing legend entry for the confidence band (e.g., `"Confidence band"`) that toggles band shading and boundary curves.
   - Ensure it uses the band attached to the **estimated curve** (if present) when drawing.

### 4. Export: Include Estimated Curve & Bands in Canonical JSON

**Files:** `continuous_ROC.html`, `ROC_lib.js`

1. Wherever the app aggregates curves to export (e.g., a call to `ROCUtils.toCanonicalRocObject` or a manual construction of the canonical JSON):
   - Add the `estimatedCurve` under its own key:
     ```js
     canonical[estimatedName] = estimatedCurve; // normalized before export
     ```
2. Ensure `estimatedCurve` conforms to the canonical ROC schema:
   - `fpr` and `tpr` numeric arrays
   - `auc` numeric scalar (optional but recommended)
   - `bands` normalized via `ROCUtils.normalizeRocJson` (and `normalizeBand` must handle extra fields `method`, `n_samples`, `grid`, `source`).
3. Preserve any app-specific extras under `metadata.continuous_roc_explorer` but do not rely on them for band consumption in other apps.

### 5. Import: Restore Estimated Curve & Bands

**Files:** `continuous_ROC.html`, `ROC_lib.js`

1. During import of canonical ROC JSON:
   - Detect curves whose names end with `" (estimated)"`.
   - Store them in `state.estimatedCurves` and make them available in the ROC plot.
2. If an imported estimated curve has `bands[]`:
   - Use the first band (or the band with highest `level`) as the default band to display in the Explorer.
   - Populate any existing internal band state (`state.rocPlot.confidenceBandData`) from that band’s `lower`/`upper` arrays and the curve’s `fpr` grid.
3. If additional metadata fields (`method`, `n_samples`) are present:
   - Optionally show them in the UI (e.g., band details panel).
   - Do **not** require them for correctness.

### 6. ROC_lib & ROC_utility Compatibility

**Files:** `ROC_lib.js`, optionally `ROC_utility.html`

1. Update `normalizeBand` in `ROC_lib.js` (if not already done) to:
   - Preserve extra fields `method`, `n_samples`, `grid`, `source`, `notes`.
   - Continue to guarantee `level`, `lower`, and `upper` exist for plotting.
2. Because the estimated curve is exported as a normal canonical ROC curve with `bands[]`, `ROC_utility.html` does not need structural changes to consume and plot the band:
   - It can treat the estimated curve like any other curve.
   - It may optionally read `method` and `n_samples` for display purposes.

### 7. Testing

- Run sampling from the Continuous ROC Explorer.
- Verify that:
  - Sample ROC curves can be shown/hidden using a single legend entry.
  - An estimated curve named `"<baseName> (estimated)"` appears in the ROC legend and can be toggled independently.
  - The estimated curve has a sensible shape (smoother than individual samples).
  - Confidence bands are attached to the estimated curve and are shown/hidden via the band legend entry.
  - Exporting to JSON includes the estimated curve and its band in canonical form.
  - Importing that JSON into Continuous ROC Explorer reproduces the estimated curve and band.
  - The same JSON can be opened in `ROC_utility.html` and the estimated curve band can be plotted without code changes.

---

## C. Codex Prompt

```
Implement milestone v1.15.12.5 from `ContinuousROC_Explorer_Roadmap_v1.15.md`.

Goal: After sampling, compute an estimated ROC curve from the sample set, attach
confidence bands to that estimated curve (not the analytic curve), consolidate
sample-curve legend entries into a single toggle, and ensure the estimated curve
and its bands export/import correctly via the canonical ROC JSON.

Modify:
  • continuous_ROC.html
  • ROC_lib.js
  • (Optionally) ROC_utility.html only for cosmetic display of band metadata.

Key requirements:
1. After sampling, compute an estimated ROC curve on an FPR grid from all
   sampled ROC curves. Name it "<baseCurveName> (estimated)" and store it as a
   canonical ROC object (fpr, tpr, auc, bands, metadata).

2. Compute a 95% pointwise confidence band from the sampled curves and attach it
   to the estimated curve using the canonical bands[] structure, with
   method ("bootstrap" or "delong") and n_samples metadata.

3. Update the ROC legend so that:
   - there is ONE legend entry labeled "Sample ROC Curves" that toggles
     visibility of all sample curves; and
   - the estimated curve has its own legend entry with a distinct color
     (config.colors.estimatedCurve).

4. Ensure the confidence band legend entry uses the band attached to the
   estimated curve and continues to hide/show both shading and boundaries.

5. Update export logic to include the estimated curve and its bands in the
   canonical ROC JSON without changing the structure for existing curves.

6. Update import logic so that curves whose names end with " (estimated)" are
   recognized as estimated curves and used to restore band display and legend
   entries. Bands must remain usable by other apps (e.g., ROC_utility) without
   additional structural changes.

7. Update ROC_lib.normalizeBand (if needed) to preserve extra metadata fields
   (method, n_samples, grid, source) while still normalizing level, lower,
   and upper.

8. Do not modify unrelated code. Keep all changes minimal and localized.
```
---

# Version v1.15.12.7 — Canonical Export/Import Finalization

## A. Goals

This milestone finalizes the Continuous ROC Explorer’s export/import behavior so that:

1. **Only two canonical ROC curves are exported at the top level:**
   - The **analytic continuous curve** (no bands)
   - The **sample-estimated ROC curve** (with confidence bands)

2. **All other sampling information** (raw sample ROC curves, sampling settings, distributions, etc.) is placed inside:
   ```json
   metadata.continuous_roc_explorer
   ```
   and NOT exposed as top-level canonical curves.

3. **Import behavior is symmetric:**
   - Continuous curve is restored exactly.
   - Estimated curve (and its bands) are restored as full canonical ROC curves.
   - Sampling metadata is restored but does not force sample curves to be displayed.

4. **Legend behavior is consistent:**
   - Only continuous curve, estimated curve, and the unified “Sample ROC Curves” toggle appear.
   - No phantom or unhideable curves appear.

5. **Cross-app compatibility achieved:**
   - ROC_utility and future tools can read the exported ROC files without needing any Continuous-ROC-specific logic.
   - Bands display correctly in other apps because they follow ROC_lib’s canonical shape.

---

## B. Implementation Plan

### 1. Canonicalize Export of Continuous Curve
**File:** `continuous_ROC.html`

Where the canonical JSON is assembled (export function):

- Ensure the continuous curve is written as:
  ```js
  canonical[curveName] = {
    fpr: continuous.fpr,
    tpr: continuous.tpr,
    thr: continuous.thr,
    auc: continuous.auc,
    bands: [],    // always empty for analytic curve
    metadata: {
      continuous_roc_explorer: {
        distributions: { positive: [...], negative: [...] },
        sampling: state.samplingSettings,  // optional
        samplesROC: state.samplesROC       // optional
      }
    }
  };
  ```

- Confirm no confidence band is attached to the analytic curve.

---

### 2. Canonicalize Export of Estimated Curve + Bands
**File:** `continuous_ROC.html`

After sampling, ensure `state.estimatedCurve` has the shape:
```js
{
  name: `${baseName} (estimated)`,
  fpr: [... grid ...],
  tpr: [... mean across samples ...],
  auc: auc_estimate,
  bands: [
    {
      level: 0.95,
      lower: [...],  // aligned to fpr
      upper: [...],  // aligned to fpr
      method: "bootstrap" | "delong"
    }
  ],
  metadata: {
    continuous_roc_explorer: {
      sampling: state.samplingSettings,
      samplesROC: state.samplesROC
    }
  }
}
```

Modify export so:
```js
canonical[estimatedName] = state.estimatedCurve;
```

Do **not** export sample ROC curves as top-level objects.

---

### 3. Update Import Path: Restore Estimated Curve + Bands
**Files:** `continuous_ROC.html`, possibly helpers in `ROC_lib.js`

When importing a ROC JSON:

1. **Identify estimated curve** by the naming pattern:
   ```js
   curveName.endsWith(" (estimated)")
   ```

2. Store it as:
   ```js
   state.estimatedCurve = importedCanonical[curveName];
   ```

3. Restore its bands:
   ```js
   state.estimatedBands = state.estimatedCurve.bands || [];
   ```

4. Rebuild the legend entries for:
   - Continuous curve
   - Estimated curve
   - Unified “Sample ROC Curves” toggle

5. Rebuild the ROC display by calling:
   ```js
   refreshRocLegend();
   drawROCPlot();
   ```

6. Do **not** auto-show raw sample curves; they remain in:
   ```js
   metadata.continuous_roc_explorer.samplesROC
   ```
   and only the **estimated curve** is displayed.

---

### 4. Unified Sample-Curve Legend Behavior

Ensure the ROC legend logic:

- Has exactly **one** sample legend entry:
  ```js
  { key: "sampleCurves", label: "Sample ROC Curves", ... }
  ```

- Controls all sample curves internally if they are ever displayed.

- Sample curves are **not** displayed by default on import.

---

### 5. Cleanup of Old Structures

Remove or disable any older logic that:

- Adds per-sample ROC curves as top-level curves.
- Creates legend entries for individual samples.
- Attaches confidence bands to the continuous curve.
- Uses `state.confBand` in any way other than via estimated curve bands.

All band display must now come from:
```js
state.estimatedCurve.bands
```

---

### 6. Testing Checklist

#### **Export**
- Export after sampling → JSON should contain exactly two canonical curves:
  1. `"MyCurve"`
  2. `"MyCurve (estimated)"`

- Estimated curve must include:
  - `fpr`, `tpr`, `auc`
  - `bands[0].lower` & `bands[0].upper` aligned with `fpr`

#### **Import**
- Importing JSON → Continuous ROC Explorer must:
  - Show both the analytic and estimated curves
  - Display estimated curve bands
  - Have functional legend toggles
  - Have no unhideable sample curves

#### **Cross-App Testing**
- Import the same JSON in **ROC_utility** → estimated curve and bands must appear as normal canonical ROC objects.

---

## C. Codex Prompt
```
Implement milestone v1.15.12.7 from `ContinuousROC_Explorer_Roadmap_v1.15.md`.

Goal: Finalize canonical export/import of continuous and estimated ROC curves so
that all apps using ROC_lib can consume these curves without special logic.

Modify only:
  • continuous_ROC.html
  • ROC_lib.js (if needed for band preservation)

Required steps:
1. Ensure export writes exactly two top-level canonical ROC curves:
   - The analytic continuous curve (no bands)
   - The estimated curve (with bands aligned to its fpr grid)

2. Store sample ROC curves and all sampling metadata ONLY inside:
      metadata.continuous_roc_explorer
   Do NOT export sample curves as top-level ROC objects.

3. Update import so that:
   - Curves ending with " (estimated)" are restored as the estimated curve
   - Their bands are restored and used by the band-rendering pipeline
   - Sampling metadata is restored but raw samples are not displayed
   - Legend entries for continuous, estimated, and sample-curves toggle are rebuilt

4. Clean up old logic:
   - Remove any remaining per-sample top-level curves
   - Remove band attachments to continuous curve
   - Remove any legend entries for individual samples

5. Test by exporting and re-importing to ensure the estimated curve and its
   confidence bands render correctly and are fully controllable via the legend.

Do not modify unrelated functions or UI elements.
```

---

# Version v1.15.12.7.1 — Fix Estimated ROC Rendering + Bootstrap Bands + Canonical Export

## A. Goals
This micro‑milestone corrects the issues observed after v1.15.12.7:

1. Estimated ROC curve does not appear on the ROC plot.
2. Bootstrap confidence bands do not compute or display correctly.
3. Export/import must fully support bands for both bootstrap and DeLong.
4. Estimated curve and bands must respond to legend visibility.
5. Leave the consolidated sample‑curve legend entry unchanged.

---

## B. Implementation Plan

### 1. Fix rendering of the Estimated ROC curve

Modify the ROC rendering function in `continuous_ROC.html`:

- Include the estimated curve in the dataset passed to the renderer.
- Create a `<path>` for the estimated curve with:
    - class: `roc-estimated`
    - stroke color from config: `config.colors.estimatedROC`
    - stroke‑width: 2–3px
    - no fill

Bind data using:

    lineGenerator(
        estimatedCurve.fpr.map((f,i) => [f, estimatedCurve.tpr[i]])
    )

Estimated ROC must:
- Draw after the sample curves but before the CI ribbon.
- Respect legend toggling via a single entry:  
  **"Estimated ROC"** toggles only this curve.

---

### 2. Fix Bootstrap Confidence Band Computation

Inside the bootstrap band computation section:

- Use the same **shared FPR grid** used for the estimated curve.
- For each FPR grid value:
    - collect values across all sample ROC curves via interpolation,
    - compute:
        - median (TPR_hat)
        - 2.5% percentile (lower)
        - 97.5% percentile (upper)

Store the band object as:

    {
      method: "bootstrap",
      level: 0.95,
      fpr: [...],
      tpr_hat: [...],
      lower: [...],
      upper: [...],
      n_samples: samples.length
    }

### 3. Fix Rendering of Confidence Bands

Modify the CI ribbon render code:

- Accept band objects from either bootstrap or DeLong.
- Draw `<path>` or `<polygon>` inside a group:
    - class: `roc-ci-band`
- Color:
    - fill: `config.colors.ciFill`
    - opacity: 0.20

Ensure band is only visible when:
- Estimated ROC is visible
- CI mode is active

---

### 4. Fix Export Format (Canonical)

Modify export so ROC JSON resembles:

    {
      "continuous_curve": { fpr: [...], tpr: [...], auc: ... },
      "estimated_curve":  { fpr: [...], tpr: [...], auc: ... },
      "ci_bands": [
        {
          "method": "delong" | "bootstrap",
          "level": 0.95,
          "fpr": [...],
          "tpr_hat": [...],
          "lower": [...],
          "upper": [...],
          "n_samples": 200
        }
      ]
    }

Notes:
- No sample curves exported.
- No UI metadata exported.
- All arrays must be numeric and same length.

---

### 5. Fix Import Logic

`ROC_lib.js` should be updated to recognize:

- `continuous_curve`
- `estimated_curve`
- `ci_bands`

When loaded:

- Render continuous curve as usual.
- Render estimated ROC curve.
- Render CI bands if present.
- Legend:
    - “Continuous ROC”
    - “Estimated ROC”
    - “Show Samples” (toggles sample curves if provided)

Other apps (e.g., ROC_utility) must accept this structure.

---

## C. Codex Patch Prompt

```
Implement milestone v1.15.12.7.1:

Files:
  • continuous_ROC.html
  • ROC_lib.js

Goals:
  • Render estimated ROC curve.
  • Compute and render bootstrap CI bands.
  • Export/import estimated curve + CI bands in canonical format.

Steps:
  1. Ensure estimatedCurve is included in render() input.
  2. Add <path class="roc-estimated"> using config.colors.estimatedROC.
  3. Compute bootstrap band using shared FPR grid and percentiles.
  4. Render CI band into <g class="roc-ci-band">.
  5. Export JSON with:
       continuous_curve, estimated_curve, ci_bands[]
  6. Update import logic to read and pass structures to renderer.
  7. CI band visibility must follow Estimated ROC legend toggle.
  8. Do not export sample curves.

Do not modify unrelated code.
```





# Version v1.15.14 — Full Color Palette Integration via `continuous_ROC_config.js`

## A. Goals
- Ensure **all colors** used by the Continuous ROC Explorer are defined exclusively in:
  - `continuous_ROC_config.js` (external config)
  - the **defaultConfig** object inside `continuous_ROC.html` (fallback)
- Remove any remaining hard-coded color literals in:
  - distribution curves
  - histograms
  - rug plots
  - empirical ROC
  - sample curves
  - animated sample curve
  - confidence band shading and boundaries
  - legend swatches
  - any SVG/HTML element with inline `stroke`, `fill`, or styles
- Expand the configuration’s color palette to include all required roles:
  - `positiveCurve`, `positiveHistogram`, `positiveRug`
  - `negativeCurve`, `negativeHistogram`, `negativeRug`
  - `empiricalCurve`, `empiricalPts`
  - `sampleCurve`, `sampleAnimation`
  - `confidenceBandUpper`, `confidenceBandLower`, `confidenceBandFill`
- Ensure the UI updates correctly when the config is loaded.
- Ensure the animation and APNG export use the configured colors.

---

## B. Implementation Plan

### 1. Expand `defaultConfig` inside `continuous_ROC.html`
Add a complete set of color keys:
```js
defaultConfig.colors = {
  positiveCurve: "#1f77b4",
  positiveHistogram: "rgba(31,119,180,0.25)",
  positiveRug: "#1f77b4",

  negativeCurve: "#d62728",
  negativeHistogram: "rgba(214,39,40,0.25)",
  negativeRug: "#d62728",

  empiricalCurve: "#2ca02c",
  empiricalPts: "#2ca02c",

  sampleCurve: "#888888",
  sampleAnimation: "#ff9900",

  confidenceBandUpper: "#9467bd",
  confidenceBandLower: "#9467bd",
  confidenceBandFill: "rgba(148,103,189,0.25)"
};
```

### 2. Update `continuous_ROC_config.js`
Ensure the external config file uses **the same keys**.
Missing keys should fall back to defaults automatically.

### 3. Add a helper: `getColor(name)`
Add in `continuous_ROC.html`:
```js
function getColor(key) {
  return state.config.colors[key] ?? defaultConfig.colors[key];
}
```
This guarantees fallback behavior.

### 4. Replace all hard-coded colors in ROC rendering
Search for `stroke:`, `fill:`, inline hex codes.
Replace examples such as:
```js
.attr('stroke', '#1f77b4')
```
with:
```js
.attr('stroke', getColor('positiveCurve'))
```
Similarly replace all other literal colors.

Update legend swatches the same way:
```js
swatch.style('background-color', getColor('positiveCurve'));
```

### 5. Update histogram drawing
Replace any use of fixed `rgba(r,g,b,a)` strings with config-driven colors:
```js
.attr('fill', getColor('positiveHistogram'));
```

### 6. Update rug plot colors
Replace any inline CSS or hard-coded color logic.

### 7. Update sampled ROC curve colors
Both static sample curves and animated sample curves must use:
```js
getColor('sampleCurve')
getColor('sampleAnimation')
```

### 8. Update confidence band coloring
Replace:
- Boundary colors → `getColor('confidenceBandUpper')`, `getColor('confidenceBandLower')`
- Fill shading → `getColor('confidenceBandFill')`

### 9. APNG export must respect configured colors
Because APNG export rasterizes the SVG, colors must already be correct in the SVG.
No additional APNG-specific logic is required.

### 10. Testing
- Load app with *no* external config → defaults apply.
- Load app with partial config → defaults fill missing keys.
- Load with custom colors → verify all components update.
- Test APNG export to confirm color fidelity.

---

## C. Codex Prompt
```
Implement milestone v1.15.14 from `ContinuousROC_Explorer_Roadmap_v1.15.md`.

Goal: Integrate all color usage with the configuration system and remove all hard-coded colors.

Modify:
  • continuous_ROC.html
  • continuous_ROC_config.js (ensure matching keys)

Steps:
1. Expand defaultConfig.colors to include all required color roles.
2. Add getColor(key) helper to continuous_ROC.html.
3. Replace all hard-coded stroke/fill colors in the codebase with getColor().
4. Update legend swatches to use config-driven colors.
5. Ensure histogram, rug plot, empirical ROC, sample curves, sample animation, and confidence bands all use config colors.
6. Ensure APNG export reflects the configured colors via SVG rasterization.
7. Test with missing, partial, and full external configs.

Do not modify unrelated logic.
```

---


# Version v1.15.15 — Distribution Fill Colors (TP/FP/TN/FN Distinguishable)

## A. Goals
- Add **configurable fill colors** for the areas under the distribution curves.
- Ensure that:
  - Positive distribution fill color ≠ Negative distribution fill color.
  - The fills correspond meaningfully to **TP / FP / TN / FN** conceptual regions.
  - These colors are specified entirely in:
    - `continuous_ROC_config.js` (external config)
    - `defaultConfig` fallback inside `continuous_ROC.html`.
- Remove any remaining hard-coded fill colors in the distribution PDF rendering.
- Integrate fill colors with the existing D3 drawing logic for the Score Distributions plot.
- Ensure rug plots and legends remain consistent with the new design.

---

## B. Implementation Plan

### 1. Add new color roles to `defaultConfig.colors`
Add to the color section (in `continuous_ROC.html`):
```js
defaultConfig.colors = {
  // positive distribution
  positiveCurve: "#1f77b4",
  positiveCurveFill: "rgba(31,119,180,0.20)",
  positiveRug: "#1f77b4",

  // negative distribution
  negativeCurve: "#d62728",
  negativeCurveFill: "rgba(214,39,40,0.20)",
  negativeRug: "#d62728",

  // empirical
  empiricalCurve: "#2ca02c",
  empiricalPts: "#2ca02c",

  // samples
  sampleCurve: "#888888",
  sampleAnimation: "#ff9900",

  // confidence bands
  confidenceBandUpper: "#9467bd",
  confidenceBandLower: "#9467bd",
  confidenceBandFill: "rgba(148,103,189,0.25)"
};
```

### 2. Add matching entries to `continuous_ROC_config.js`
The external config file should contain the same keys.  
Missing entries should fall back to defaults automatically.

### 3. Add conceptual mapping to TP/FP/TN/FN (explanation)
Although the Score Distribution plot is not a confusion matrix, the filled regions correspond intuitively to:
- Positive PDF area → contributes to **TP** at lower thresholds and **FN** at higher thresholds.
- Negative PDF area → contributes to **FP** at lower thresholds and **TN** at higher thresholds.

No changes to thresholds or ROC logic are needed; colors simply help distinguish the conceptual regions.

### 4. Modify D3 distribution rendering (continuous_ROC.html)
Locate the code that draws the PDFs for positive and negative distributions.  
Replace current fill logic with:
```js
.attr('fill', getColor('positiveCurveFill'))
```
and
```js
.attr('fill', getColor('negativeCurveFill'))
```
where appropriate.

The stroke remains:
```js
.attr('stroke', getColor('positiveCurve'))
```
and
```js
.attr('stroke', getColor('negativeCurve'))
```

### 5. Update legend entries
Legend swatches should also use the new fill colors:
```js
swatch.style('background-color', getColor('positiveCurveFill'));
```
for positive distribution entries, and similarly for negative.

### 6. Ensure rug plots remain outline-only
Rug mark colors should stay as stroke-only (no fill), using:
```js
getColor('positiveRug')
getColor('negativeRug')
```
This keeps the visualization clean.

### 7. Confirm interaction: hiding and showing elements
Interactive legend toggles should hide/show the entire filled PDF region, not just the strokes.

If necessary, wrap each PDF in a `<g class="pdfGroup">` container.

### 8. Testing
- Verify fill colors appear correctly for both distributions.
- Confirm legend swatches match config colors.
- Change config colors in `continuous_ROC_config.js` and reload → verify correct update.
- Import/export continuous ROC states → ensure fill colors are **not** part of data (colors come only from config).
- APNG export should rasterize filled PDFs correctly.

---

## C. Codex Prompt
```
Implement milestone v1.15.15 from `ContinuousROC_Explorer_Roadmap_v1.15.md`.

Goal: Add configurable fill colors for positive and negative distribution PDFs, fully integrated with the external config file.

Modify:
  • continuous_ROC.html
  • continuous_ROC_config.js

Steps:
1. Add new color keys: positiveCurveFill, negativeCurveFill (with defaults).
2. Update external config file to allow overriding the same keys.
3. Replace hard-coded distribution fill colors with getColor('positiveCurveFill') and getColor('negativeCurveFill').
4. Update legend swatches to use the new fill colors.
5. Ensure rug plots still use stroke-only colors (positiveRug, negativeRug).
6. Make sure filled PDFs hide/show correctly via the interactive legend.
7. Confirm APNG export rasterizes fill colors correctly.

Do not modify unrelated logic.
```


The fills for the positive and negative PDF curves arre completely opaque; they need to be semi-transparent. The DEFAULT_COLOR_CONFIG secifies an opacit of 0.08 for these fills; why are you not using that?


---

# Version v1.15.16 — Complete Sampling Settings Import/Export

## A. Goals
- Ensure **all sampling-related settings** are saved and restored through the JSON metadata block of each exported ROC curve.
- Support full round-trip persistence for:
  - Sample size (cases per replicate)
  - Number of replicates
  - Random seed (if present)
  - Sampling method (currently deterministic mixture sampler)
  - Histogram bin settings (if applicable in future versions)
  - Any new sampling-related configuration added later
- Importing a curve should:
  - Restore all sampling settings into the UI
  - Use defaults only for missing fields
  - Trigger necessary redraws
- Exporting a curve should:
  - Include a `sampling` block in metadata reflecting all current UI settings
- **Do not** embed the raw sampled datasets in the metadata (samplesROC already saved separately).

---

## B. Implementation Plan

### 1. Define canonical sampling settings schema
In both export and import logic, the following canonical structure will be used:
```json
sampling: {
  "sampleSize": <number>,
  "numSamples": <number>,
  "randomSeed": <number|null>,
  "method": "mixture" | "otherFutureMethods",
  "histogramBins": <number|null>
}
```

Place this definition in comments in both:
- `continuous_ROC.html`
- `ROC_lib.js` (where metadata is handled)

---

### 2. Extend state object for sampling
In `continuous_ROC.html`, ensure:
```js
state.sampling = {
  sampleSize: 1000,
  numSamples: 50,
  randomSeed: null,
  method: "mixture",
  histogramBins: null
};
```
Overwrite only missing fields if already present.

---

### 3. Export sampling settings
Locate the code that builds metadata for export.
Ensure:
```js
metadata.continuous_roc_explorer.sampling = {
  sampleSize: state.sampling.sampleSize,
  numSamples: state.sampling.numSamples,
  randomSeed: state.sampling.randomSeed,
  method: state.sampling.method,
  histogramBins: state.sampling.histogramBins
};
```

Verify that `samplesROC` continues to export separately.

---

### 4. Import sampling settings from metadata
In `ROCUtils.extractContinuousRocMetadata`, sampling is already extracted into `cleaned.sampling` if present.
Now modify the import handler in `continuous_ROC.html` so that after calling `extractContinuousRocMetadata`:

```js
if(meta.sampling) {
  const s = meta.sampling;
  state.sampling.sampleSize = s.sampleSize ?? state.sampling.sampleSize;
  state.sampling.numSamples = s.numSamples ?? state.sampling.numSamples;
  state.sampling.randomSeed = s.randomSeed ?? state.sampling.randomSeed;
  state.sampling.method = s.method ?? state.sampling.method;
  state.sampling.histogramBins = s.histogramBins ?? state.sampling.histogramBins;
}
```

---

### 5. Update UI elements to reflect imported state
For all sampling UI controls:
- Set their `.value` to the imported `state.sampling.*` values.
- Trigger any necessary change events (`oninput` or custom handlers) so the app stays in sync.

Example:
```js
document.getElementById('sampleSizeInput').value = state.sampling.sampleSize;
document.getElementById('numSamplesInput').value = state.sampling.numSamples;
// etc.
```

---

### 6. Trigger redraws after importing sampling settings
After UI update, trigger:
```js
regenerateIfNeeded();
```
or the equivalent logic to refresh distributions, ROC, and legends.

If samples exist in metadata (`samplesROC`), do *not* auto-regenerate samples — use the imported curves as-is.

---

### 7. Testing scenarios
1. Create a continuous ROC; set non-default sampling settings.
2. Generate sample curves.
3. Export JSON.
4. Reload app; import JSON.
5. Verify:
   - sampling settings populate UI correctly
   - distributions and ROC curves import correctly
   - sample curves import correctly
   - no missing-field errors
6. Change only some sampling fields in config; ensure defaults fill the rest.

---

## C. Codex Prompt
```
Implement milestone v1.15.16 from `ContinuousROC_Explorer_Roadmap_v1.15.md`.

Goal: Add full import/export support for all sampling-related settings.

Modify:
  • continuous_ROC.html
  • ROC_lib.js (only metadata structure comments; keep logic unchanged unless noted)

Steps:
1. Define canonical sampling schema (sampleSize, numSamples, randomSeed, method, histogramBins).
2. Ensure state.sampling contains all fields.
3. Add sampling block to export metadata in continuous_ROC.html.
4. In import logic, fully restore sampling settings into state.sampling.
5. Update UI controls to reflect imported sampling settings.
6. Trigger necessary redraws after import.
7. Verify sample curves (samplesROC) are imported unchanged.

Do not modify unrelated logic.
```

---


# NOTES:

* I skipped the animation milestones (v1.15.10 and v1.15.11).
* I ran this one later, after color configuration: v1.15.12 - Global Busy Indicator & Async Operation Wrapper


I need to re-think animation support:
- sampling variation (sample ROC curves, histograms)
- parameter scans


# ISSUES


Exponential Power distribution:
- sampling is extremely slow, or at least quirky. Samples do not seem to change for this distribution.

Skey Exp Power
- Does not seem to re-sample.

GAMLSS SEP2
- Does not seem to re-sample.

Hutson SEP
- Does not seem to re-sample. (invalid array length)

---



Weibull-Weibull distribution: samples do not match continuous curve for extreme values. See file WW_test.json.

Exponential Power distribution:
- sampling is extremely slow, or at least quirky. Samples do not seem to change for this distribution.

Skey Exp Power
- Does not seem to re-sample.

GAMLSS SEP2
- Does not seem to re-sample.

Hutson SEP
- Does not seem to re-sample. (invalid array length)

What happened to the ability to import an empirical dataset?

The DeLong confidence bands do not reliably cover the samples, though the bootstrap bands do. Are the DeLong bands computed from the whole sample set or from a single sample?

# TO DO

* The "Empirical Dataset" control box should be renamed "Empirical Samples". The 'dataset name' inout and 'export dataset csv' button should be moved to the bottom of that box.

* Change the "Remove component" button label to just "X". Make it gray instead of red.

* All the sample ROC curves should be shown or hidden from a single legend element.

* Sampled curves do not correctly survive export/import. Only one sampled curve is imported, and the confidence bands seem to be around that curve.

* Color configuration should be part of the general configuration system.