# ROC Utility App Roadmap

## 1. Purpose and Vision

The ROC Utility app visualizes cost-benefit tradeoffs and uncertainty over ROC space. Version 2 aims to transform it from a static teaching demo into a fully configurable and pedagogically rich analysis environment. Enhancements will focus on three pillars:

1. **Interactive modeling:** users can upload, explore, and compare precomputed ROC curves under varying cost, prevalence, and threshold assumptions — without altering the ROC data itself.
2. **Pedagogical clarity:** improved visualization, scenario presets, and narrative modes for teaching.
3. **Data portability and configurability:** self-contained CSV formats and JSON configuration files for teacher control.

---

## 2. Functional Roadmap

### 2.1 Data and Model Layer

| Feature | Description | Implementation Notes |
|----------|--------------|-----------------------|
| **Dynamic ROC import** | Allow file upload (CSV/JSON) defining ROC curves and uncertainty bands. | Parse CSV using header conventions described in Section 5; JSON uses pre-parsed structure. |
| **Multiple curve overlay** | Support comparing several ROC curves in one plot. | Color-coded lines; legend auto-generated from curve_id values. |
| **Confidence and credible bands** | Support nested arrays of lower/upper bounds for multiple intervals. | Extend `tpr_lower` / `tpr_upper` logic to handle arrays per curve. |
| **Parametric generation** | Generate ROC curves from analytic distributions (binormal, bibeta). | Use jstat or internal generator for simulated examples. |
| **Threshold-aware ROC format** | Each ROC curve file includes its own `threshold` column, representing score cutoffs on a shared scale. | Enables payoff-vs-threshold plotting and model comparison across a common score domain. |
| **CSV and JSON import** | App can read ROC data from CSV (parsed to JSON) or load JSON directly. | JSON format matches parser output with arrays for threshold, fpr, tpr, and bands. |

### 2.2 Utility and Cost Framework

| Feature | Description | Implementation Notes |
|----------|--------------|-----------------------|
| **Editable payoff matrix** | UI table showing TP, FP, TN, FN payoffs linked to sliders. | Maintain bidirectional sync with slider values. |
| **Alternative cost models** | Nonlinear and soft-cap cost functions. | Extend `utility()` to accept user-selected model. |
| **Optimal threshold visualization** | Draw the line or point maximizing expected utility. | Derived from heatmap grid. |
| **Expected value reports** | Compute ΔUtility vs baseline or random. | Display numeric summary below chart. |

### 2.3 Visualization Layer

| Feature | Description | Implementation Notes |
|----------|--------------|-----------------------|
| **Iso-utility contours** | Replace linear dashed lines with smooth interpolated contours. | Implement marching squares algorithm. |
| **Color legend and scale bar** | Display numeric utility color map. | Gradient canvas or SVG legend. |
| **Tooltip enhancement** | Include TP, FP, TN, FN counts and utility. | Extend mousemove handler. |
| **Zoom/pan** | Allow fine inspection of ROC regions. | Canvas transform or mini-map control. |
| **New plot: Payoff vs Threshold** | Plot threshold (shared score scale) on x-axis and expected utility on y-axis. Each ROC curve file supplies its own threshold set; curves are drawn as lines using distinct colors or styles. | Compute utility dynamically for each curve using cost sliders and prevalence. Hovering highlights corresponding ROC points. |

### 2.4 User Interface and Pedagogy

| Feature | Description | Implementation Notes |
|----------|--------------|-----------------------|
| **Scenario presets** | Predefined cost/prevalence settings (screening, fraud, etc.). | JSON templates selectable via dropdown. |
| **Snapshot export** | Save current state as PNG or JSON. | Use `canvas.toDataURL()` and `Blob` download. |
| **Narrative/teaching mode** | Step-by-step overlay highlighting key points. | Modal with arrows and captions. |
| **Interactive formula view** | Show equations with MathJax; link to visible components. | Toggle panel below chart. |

### 2.5 Configuration System (Teacher Control & Lesson Modes)

| Feature | Description | Implementation Notes |
|----------|--------------|-----------------------|
| **Configuration file support** | Teachers can define lesson complexity and visibility of UI elements via configuration JSON. | Loaded at startup or user selection; determines which features and datasets are active. |
| **UI control via config** | Flags enable or hide panels (utility surface, threshold plot, equations, etc.). | App reads from `config.ui.*` properties to toggle components. |
| **Pedagogical guidance** | Enable narrative sequences, simplified payoff structures, or locked sliders. | Controlled by `config.pedagogy` block. |
| **Data and visualization settings** | Preload default curves, restrict uploads, define themes. | Use `config.data` and `config.visual` blocks. |
| **i18n text structure** | Configuration includes a `STRINGS` object mapping text keys to human-readable strings for UI elements. | Teachers may create separate translated configuration files for different languages; multiple languages in one file are not required. |

**Example configuration (simplified):**

```json
{
  "title": "Introductory ROC Lesson",
  "ui": {
    "show_utility_surface": false,
    "show_threshold_plot": true,
    "show_uncertainty_bands": false,
    "enable_slider_edit": true
  },
  "data": {
    "default_curves": ["logistic.csv"],
    "allow_file_upload": false
  },
  "pedagogy": {
    "show_equations": false,
    "show_guided_narrative": true
  },
  "STRINGS": {
    "app_title": "ROC Utility Explorer",
    "tooltip_fpr": "False Positive Rate"
  }
}
```

---

## 2.6 Narrative Modes (Guided Learning System)

**Purpose:**  
Narrative modes transform the app into an interactive storytelling environment, where students are guided through a sequence of explanations, highlights, and small interactive tasks. This system helps teachers present complex ROC and decision-utility concepts in a structured, stepwise fashion.

### Design Principles

- **Guided discovery:** The app presents a sequence of steps, each accompanied by explanatory text and focused visuals.
- **Progressive complexity:** Concepts are introduced gradually—starting with ROC basics and moving toward thresholds, payoffs, and uncertainty.
- **Teacher configurability:** Teachers can define their own lesson sequences in the configuration file (JSON format) without editing any code.
- **Student engagement:** Each step can prompt the learner to perform an action (move a slider, observe a plot change, etc.).

### Implementation Structure

Each narrative is defined in the configuration file under a `narrative` block:

```json
"narrative": {
  "enabled": true,
  "steps": [
    {
      "id": "intro",
      "title": "What is an ROC Curve?",
      "text": "The ROC curve shows how sensitivity and specificity change with threshold.",
      "highlight": "roc_canvas",
      "action": "show_curve"
    },
    {
      "id": "threshold_effect",
      "title": "Changing Thresholds",
      "text": "As you move the threshold slider, the point on the ROC curve moves.",
      "highlight": "threshold_slider",
      "action": "enable_slider"
    },
    {
      "id": "payoff_surface",
      "title": "Utility Surface",
      "text": "Different payoff settings change the shape of the utility surface. Try adjusting the sliders.",
      "highlight": "utility_canvas",
      "action": "enable_cost_sliders"
    }
  ]
}
```

### Example Lesson Sequences

#### Example 1 — *Introduction to ROC Curves*
1. Step 1: Display only ROC axes with labels (FPR and TPR).  
   → Text explains how each axis is defined.
2. Step 2: Fade in a simple ROC curve.  
   → Text explains what each point represents.
3. Step 3: Animate threshold movement along the curve.  
   → Highlight changing TPR and FPR values.
4. Step 4: Reveal AUC value.  
   → Explain that it summarizes model performance.

#### Example 2 — *Utility and Decision-Making*
1. Step 1: Introduce payoff sliders (TP, FP, TN, FN).  
   → Explain how payoffs affect decisions.
2. Step 2: Show changes in the utility surface when payoffs vary.  
   → Highlight shifts in the optimal threshold.
3. Step 3: Open the payoff-vs-threshold plot.  
   → Demonstrate how the best threshold maximizes expected utility.
4. Step 4: Summarize tradeoffs between sensitivity, specificity, and cost.

### Behavior

- A small control panel (“Next”, “Back”, “Skip”) navigates through steps.  
- Steps can highlight or dim parts of the interface and display overlay text boxes.  
- All steps are defined in JSON, making them editable and shareable between lessons.  
- Exiting the narrative returns the app to full interactive mode.

---

## 2.7 Compact Payoff Grid Layout

**Purpose:**  
Reduce the visual footprint of the payoff sliders while making their conceptual meaning clearer by arranging them in a **2×2 grid resembling a confusion matrix**. This layout directly links each payoff (TP, FP, TN, FN) to its corresponding outcome cell.

### Design Options

| Variant | Description | Notes |
|----------|--------------|-------|
| **A. Embedded Mini-Sliders** | Each cell contains a small horizontal slider with a numeric value displayed below. | Compact, intuitive; ideal for continuous adjustment. |
| **B. Click-to-Focus Sliders** | Each cell shows a numeric value; clicking opens a temporary slider for adjustment. | Minimal footprint; good for touch devices. |
| **C. Inline Matrix Rows** | Two rows (“Actual +” and “Actual −”) with paired sliders per row. | Balanced layout for narrow screens. |

### Common Features

- The grid shows **Actual** vs **Predicted** categories, reinforcing the link between payoff parameters and the confusion matrix.
- Color cues: greenish for rewards (TP, TN), reddish for costs (FP, FN).  
- Tooltips explain each parameter’s meaning.  
- Optional normalization toggle scales values relative to the largest magnitude.

### Example Layout

| **Predicted →** | **Positive** | **Negative** |
|-----------------|---------------|---------------|
| **Actual Positive** | TP slider / box | FN slider / box |
| **Actual Negative** | FP slider / box | TN slider / box |

### Configurable Display Modes

The app supports two alternative modes for each payoff cell:
1. **Slider mode** (default): adjustable range input for quick exploration.
2. **Text box mode**: editable numeric input for precise value entry.

Teachers can select the preferred style through the configuration file:

```json
"ui": {
  "payoff_input_mode": "slider"   // or "textbox"
}
```

This enables instructors to choose between intuitive visual manipulation or space-efficient numeric entry.

### Pedagogical Benefit

- Reinforces the structure of the confusion matrix and the idea that each payoff corresponds to one cell.  
- Provides visual economy while preserving intuitive control.  
- Encourages students to think in terms of actual outcomes rather than abstract variables.

---

## 2.8 Progressive Complexity and Lesson Bundles

**Purpose:**  
Enable teachers to control how much of the app’s functionality and complexity is exposed at any given time. Progressive complexity supports scaffolding instruction — starting with basic ROC concepts and introducing cost models, uncertainty, and advanced visualization features later.

### Design Approaches

| Approach | Description | Notes |
|-----------|--------------|-------|
| **Predefined Complexity Levels** | The configuration file may define named levels such as `intro`, `intermediate`, and `advanced`, each enabling a different subset of UI features. | Teachers set the active level at startup or switch dynamically during lessons. |
| **Narrative-Driven Reveal** | Narrative steps progressively reveal more panels or controls as the student advances through the guided lesson. | Keeps the interface uncluttered and supports active learning. |
| **Teacher Runtime Toggle** | An optional control panel allows teachers to change complexity level on the fly during class demonstrations. | Useful for live instruction without editing config files. |
| **Lesson Bundles** | A folder containing multiple numbered configuration files such as `01_intro.json`, `02_thresholds.json`, `03_costs.json`, etc. | Sequential numbering keeps lessons in order and simplifies automated loading or navigation. |

### Pedagogical Benefits

- Reinforces gradual learning and concept layering.  
- Keeps novice students focused on essential ideas before introducing advanced analysis tools.  
- Lets teachers reuse the same app for multiple class sessions with minimal modification.  
- Provides flexibility for self-paced or instructor-led progression.

---

## 2.9 Documentation & Help Panel

**Purpose:**  
Provide an integrated, context-aware reference window within the app to help students and teachers understand key concepts, terminology, and UI features without leaving the interface.

### Design Overview

- **Docked or collapsible panel** accessible via a “?” icon or keyboard shortcut.  
- **Markdown-based content** supports formatted text, equations (MathJax), and embedded images.  
- **Dynamic updates** display relevant documentation for the active plot or control.

### Content Structure

1. **Core Topics** — Built-in help sections explaining:
   - ROC geometry and interpretation.
   - Threshold and decision rules.
   - Utility computation and payoff matrices.
   - Meaning of uncertainty bands.

2. **Teacher-Defined Notes** — Configuration files can include a `docs` section with custom markdown or HTML text, e.g.:

   ```json
   "docs": {
     "threshold_plot": "This plot shows how payoff changes with decision threshold.",
     "payoff_matrix": "The payoff grid links each payoff to an outcome in the confusion matrix."
   }
   ```

3. **Narrative Integration** — The panel can automatically synchronize with narrative steps, expanding relevant explanations as the student progresses through the guided lesson.

### Interactive Features

| Interaction | Behavior |
|--------------|-----------|
| Hover over control | Highlights related text in the documentation panel. |
| Click “?” on plot title | Opens contextual documentation for that component. |
| Narrative step active | Displays the explanation matching the current step. |
| Teacher config flag | Allows simplified or locked-down documentation for specific lessons. |

### Implementation Notes

- Render markdown via `marked.js` or similar library.  
- Use MathJax for inline mathematical notation.  
- Reference elements through `data-doc-id` attributes for linking.  
- Collapsible panel layout to minimize screen usage on small devices.

### Pedagogical Benefits

- Provides on-demand explanations, reinforcing understanding while exploring interactively.  
- Allows teachers to embed custom explanations, instructions, or reflective questions.  
- Reduces reliance on external handouts or slides, keeping focus within the learning environment.

---

## 2.10 Multi-ROC Comparison View

**Purpose:**  
Provide a dedicated visualization for comparing multiple ROC curves side by side without the distraction of the utility heatmap background. This view complements the existing payoff-vs-threshold plot and utility surface by focusing solely on ROC geometry and relative performance.

### Design Overview

| Plot | Description | Notes |
|------|--------------|-------|
| **Utility Surface** | Displays expected utility for a single active curve. | Colored background; used for threshold/utility exploration. |
| **Payoff vs Threshold** | Compares utility as a function of threshold for multiple models. | Neutral background; one line per curve. |
| **Multi-ROC Comparison (new)** | Shows multiple ROC curves on the same axes without utility shading. | For visual comparison of model performance. |

### Features

- **Axes:** FPR (x-axis), TPR (y-axis).  
- **Curves:** Each model drawn with distinct color/style.  
- **Uncertainty Bands:** Optional semi-transparent ribbons (`tpr_lower`, `tpr_upper`).  
- **Legend:** Curve identifiers (`curve_id`) with toggle checkboxes for visibility.  
- **Interactions:**
  - Hover → highlight curve and show tooltip (TPR, FPR, threshold).  
  - Click → set curve as “active” model for utility surface.  
  - Zoom/Pan for detailed inspection.  

### Configuration Control

Teachers can include or omit the multi-ROC comparison view through configuration:

```json
"ui": {
  "show_multi_roc_plot": true
}
```

### Optional Enhancements

- **AUC Labels:** Display AUC values in legend or near curve endpoints.  
- **Curve Grouping:** Group curves by model type or scenario.  
- **Layout Options:**
  - Tabbed interface (Utility | Payoff | Comparison).  
  - Split screen (Utility on left, ROC comparison on right).  

### Pedagogical Benefits

- Simplifies the visual space, focusing attention on ROC shape rather than background utility.  
- Reinforces conceptual separation between *model discrimination* (ROC shape) and *decision utility* (cost surface).  
- Enables side-by-side model comparison while keeping the main heatmap view uncluttered.  
- Fits naturally into progressive complexity: first compare ROC curves, then explore threshold and cost effects in deeper views.

---

## 3. Technical Refactor

| Task | Purpose |
|------|----------|
| **Code modularization** | Split logic into data, utility, and drawing modules using ES6 imports. |
| **Performance optimization** | Cache heatmap image layers and reuse when parameters unchanged. |
| **Accessibility improvements** | Keyboard navigation, ARIA labels for sliders. |
| **Dark mode support** | Automatic palette switch using CSS media queries. |

---

## 4. Version Milestones

Each minor version represents a self-contained development step suitable for implementation by Codex in a single prompt–response cycle. The sequence minimizes confusion while maintaining efficiency in testing and review.

| Version | Scope | Codex Prompt |
|----------|--------|--------------|
| **v1.0.1 – CSV Import and Parser** | Implement loading of ROC curve data from CSV files following the Section 5 schema. Parse headers (`threshold`, `fpr`, `tpr`, etc.) and convert to JSON objects stored in memory. | “Modify the app so that it can import ROC curve data from CSV files, parse the headers according to the roadmap schema, and store each curve as a JSON object ready for plotting.” "Please create a folder for ROC data files. Put in the samples from the roadmap, and also translate the existing examples from the app to CSV format. Then populate the ROC curve dropdown selector with the options parsed from the CSV files."|
| **v1.0.2 – JSON Import** | Allow direct loading of pre-parsed JSON files that match the structure produced by the CSV parser. | “Extend the app to allow users to load ROC data directly from JSON files formatted like the parser output.” "Add a function to save an ROC curve to a JSON file, then save versions of all the ROC curves currently available in the roc_data directory back to the same directory. File selection shuold automatically load either CSV or JSON files."|
| **v1.0.3 – Multi-Curve Handling** | Support loading and storing multiple curves at once, with a dropdown or legend for curve selection. Only one curve displayed on the utility surface at a time. | “Update the app to handle multiple ROC curves: load several CSV/JSON files, list them in a dropdown, and allow selecting which curve to display on the existing ROC plot.” SKIPPED.|
| **v1.0.4 – Payoff-vs-Threshold Plot** | Add new plot showing payoff (utility) on y-axis vs threshold on x-axis, allowing multiple curves to appear simultaneously. | “Add a payoff-vs-threshold plot that displays expected utility as a function of threshold for all loaded ROC curves, using the cost sliders and prevalence input.” |
| **v1.0.5 – Configuration Loader** | Implement reading of configuration JSON to toggle visibility of UI components (`show_threshold_plot`, `show_utility_surface`, etc.). | “Integrate configuration loading from a JSON file so that UI elements (plots, sliders, etc.) appear or hide based on config settings.” "All text strings in the app should be specified in the config file." |
| **v1.0.6 – Compact Payoff Grid Layout** | Replace existing payoff sliders with the 2×2 confusion-matrix grid, supporting both slider and text-box modes. | “Implement the compact payoff grid layout as a 2×2 matrix with configurable slider or text-box input mode, replacing the old payoff sliders.” |
| **v1.0.7 – Narrative Mode Skeleton** | Introduce the basic framework for narrative sequences (Next/Back navigation, highlighting elements). | “Add the skeleton for narrative mode: read a list of steps from config, show one caption at a time with Next/Back buttons, and highlight referenced UI elements.” |
| **v1.0.8 – Documentation Panel** | Add collapsible side panel with markdown help content, including links to UI elements. | “Add a collapsible documentation/help panel that displays markdown text and updates contextually when users click ‘?’ icons.” |
| **v1.0.9 – Progressive Complexity + Lesson Bundles** | Support multiple numbered config files and live switching between complexity levels. | “Add support for numbered lesson configuration files and a control that lets the teacher switch between complexity levels (‘intro’, ‘advanced’, etc.) at runtime.” |
| **v2.0 – Multi-ROC Comparison View** | Implement the new neutral-background multi-ROC comparison plot with uncertainty bands, synchronized with curve selection. | “Add a multi-ROC comparison view that displays the set of ROC curves together on a neutral background, with toggleable uncertainty ribbons and selection sync with the main utility view. The selected curve should be highlighted.” |

---

## 5. ROC Data Exchange Specification

This specification defines the interchange format used by the ROC Utility app and any companion tools (generators, dashboards, lesson editors). Every application in the suite must accept at least the “core columns” described below and ignore unrecognised optional fields gracefully.

### 5.1 Overview

- **Format**: UTF-8 CSV, optionally accompanied by JSON that mirrors the parsed output.
- **Granularity**: either *per-curve* (one ROC curve per file) or *multi-curve bundle* (several curves in one file).
- **Row order**: ascending or descending by `threshold` is allowed, but values must correspond row-wise across columns.
- **Coordinate system**: `fpr` and `tpr` numeric in `[0,1]`, `threshold` on the source model’s score scale (often `[0,1]`, but arbitrary real numbers permitted).

### 5.2 Core Columns (Required unless noted)

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `curve_id` | string | ✅ | Unique identifier for the ROC curve within the file; repeated on each row belonging to that curve. |
| `fpr` | number ∈ [0,1] | ✅ | False positive rate at the given threshold. |
| `tpr` | number ∈ [0,1] | ✅ | True positive rate (recall) at the given threshold. |
| `threshold` | number | ⚠️ Recommended | Decision threshold applied to the model score. When omitted, downstream tools may disable threshold-based plots and will fall back to row index or FPR position. |

> **Notes**
> - When `threshold` is omitted, downstream utilities assume a monotonically decreasing decision threshold but will not attempt to infer absolute values.
> - Multiple curves can share identical `curve_id` values across files; the fully qualified identity is `(source_file, curve_id)`.

### 5.3 Uncertainty Columns (Optional)

Uncertainty bands are encoded through paired `tpr_lower_*` and `tpr_upper_*` columns, where the suffix denotes the confidence/credible level. Levels may be integers (e.g. `95`) or decimals (e.g. `0.95`). Matching pairs are mandatory; isolated lower/upper columns are ignored.

```
... , tpr_lower_95 , tpr_upper_95 , tpr_lower_80 , tpr_upper_80 , ...
```

Rules:

- Levels are sorted numerically during parsing.
- Values must lie within `[0,1]`.
- Bands are assumed symmetric around the posterior mean unless otherwise documented; tooling treats them as generic envelopes.

### 5.4 Additional Metadata Columns

Applications may append arbitrary columns for descriptive metadata. To ensure predictability:

- Prefix free-form columns with `meta_` (e.g. `meta_auc`, `meta_dataset`, `meta_training_notes`).
- Metadata should not conflict with reserved names (`curve_id`, `fpr`, `tpr`, `threshold`, `tpr_lower_*`, `tpr_upper_*`).
- Downstream consumers should surface metadata when present but must ignore unknown keys.

### 5.5 File Layouts

**Per-curve file** – single curve identified by one `curve_id` value (recommended for generated content).

```csv
curve_id,threshold,fpr,tpr,tpr_lower_95,tpr_upper_95
logistic,1.00,0.00,0.00,0.00,0.00
logistic,0.80,0.10,0.40,0.30,0.50
logistic,0.60,0.20,0.65,0.55,0.75
logistic,0.40,0.35,0.80,0.70,0.90
logistic,0.20,0.60,0.90,0.80,0.95
logistic,0.00,1.00,1.00,1.00,1.00
```

**Multi-curve bundle** – aggregate several curves in one file (must repeat `curve_id`).

```csv
curve_id,threshold,fpr,tpr,meta_auc
rf_v1,0.90,0.02,0.32,0.86
rf_v1,0.70,0.08,0.58,0.86
rf_v1,0.50,0.18,0.74,0.86
log_v2,0.90,0.03,0.28,0.82
log_v2,0.70,0.12,0.55,0.82
log_v2,0.50,0.23,0.69,0.82
```

When bundling curves, rows belonging to the same `curve_id` should remain contiguous to simplify streaming parsers, although the loader is tolerant of interleaving.

### 5.6 Validation Requirements

1. **Column presence**: Reject files missing any required column (`curve_id`, `fpr`, `tpr`). `threshold` is optional but recommended.
2. **Numeric coercion**: Non-numeric `fpr`/`tpr` rows are skipped; tooling should log warnings.
3. **Bounds checking**: Clamp or reject `fpr`/`tpr` values outside `[0,1]`. Thresholds may be any finite number.
4. **Uncertainty parity**: A `tpr_lower_<L>` column must be accompanied by `tpr_upper_<L>` with equal row counts.
5. **Row completeness**: Empty lines and comment lines (starting with `#`) are ignored.

### 5.7 Derived Metadata

During parsing, applications should compute:

| Derived Field | Description |
|---------------|-------------|
| `threshold_range` | `[min(threshold), max(threshold)]` per curve when thresholds supplied. |
| `levels` | Sorted list of numeric levels extracted from uncertainty column suffixes. |
| `has_uncertainty` | Boolean flag indicating whether at least one lower/upper pair was found. |
| `metadata` | Object composed of `meta_*` columns plus loader provenance (e.g. `source_file`, `source`). |

These derived fields appear in the in-memory JSON representation and in exported JSON files.

### 5.8 Reference Parsing Logic (JS Pseudocode)

```js
function parseROCCSV(headers) {
  const bandLevels = [];
  const bandMap = {};
  headers.forEach(h => {
    const m = h.match(/^tpr_(lower|upper)_(\d+(?:\.\d+)*)$/);
    if (m) {
      const type = m[1];
      const level = parseFloat(m[2]);
      if (!bandMap[level]) bandMap[level] = {};
      bandMap[level][type] = h;
      if (!bandLevels.includes(level)) bandLevels.push(level);
    }
  });
  bandLevels.sort((a,b)=>a-b);
  return { bandLevels, bandMap };
}
```

This helper is complemented by row-wise coercion that:

```js
const fpr = Number(row[fprIdx]);
const tpr = Number(row[tprIdx]);
if (!Number.isFinite(fpr) || !Number.isFinite(tpr)) skipRow();
```

### 5.9 Backward Compatibility & Future-Proofing

- **Missing thresholds**: loaders must still ingest the curve; payoff-vs-threshold views fall back to FPR ordering or synthetic indices (flagged in metadata).
- **Non-standard additions**: any unknown column (not matching reserved names or the `meta_` prefix) is stored under `metadata.extra_columns` for downstream inspection.
- **Extension fields**: future versions may introduce count columns (`tp_count`, `fp_count`, ...); tools should ignore them until formally adopted.
- **Versioning**: include `meta_schema_version` when breaking changes are introduced so consumers can branch logic if needed.

---

## 6. Working with Codex

**Purpose:**  
This section describes the recommended workflow for using OpenAI Codex (or equivalent model-based coding agents) to implement each milestone defined in Section 4. The approach ensures reproducibility, minimizes confusion, and maintains code stability.

### Workflow Overview

1. **One milestone at a time:** Work sequentially through the roadmap. Each version (v1.x.y) should be developed in a separate Codex session.  
2. **Inputs to Codex:**  
   - The full current app code (e.g. `ROC_utility.html`).  
   - The Codex prompt for the next milestone (from Section 4).  
   - *Do not include the entire roadmap in the Codex input.* Use it only as a guide.  
3. **Outputs:** Codex should return a complete, runnable app with the requested feature added. Save and test it as `ROC_utility_vX.Y.Z.html` before proceeding.

### Initial Session Prompt

Use this prompt to start a new Codex session for this project:

```
You are Codex, working as a collaborative coding assistant.
I will give you the current version of a client-side HTML/JS ROC utility app.
Your task is to modify it according to the roadmap prompt I’ll provide,
implementing one incremental version step (v1.x.y).
Keep all existing functionality intact, make minimal diffs,
and return the complete, runnable code.
```

Then append the appropriate milestone prompt (for example, v1.0.1):

```
Modify the app so that it can import ROC curve data from CSV files, parse the headers according to the roadmap schema, and store each curve as a JSON object ready for plotting.
```

Finally, paste the full app code below that prompt.

### Best Practices

| Tip | Reason |
|------|---------|
| Keep prompts concise and self-contained. | Codex performs best with focused, bounded tasks. |
| Always include the current working code. | Ensures Codex understands the existing context. |
| Test after each milestone. | Confirms stability and incremental correctness. |
| Save versions separately. | Facilitates rollback and reproducibility. |
| Avoid multi-feature requests. | Prevents scope drift and model confusion. |

### Optional Initialization for New Collaborators

If setting up a new workspace or collaborator, begin with this one-time introduction prompt:

```
You are Codex, and we will be iteratively implementing features in a client-side HTML ROC Utility App.
We will work one minor version at a time following an external roadmap document.
The full code of the current working version will always be in the file "ROC_utility.html", plus a configuration file at some point, and various data files.
I will provide a concise prompt for you to create the next version.
Your output should be a complete, runnable app with the new feature added and no regressions.
```

This primes Codex to follow the incremental development protocol described in this document.

---

## 7. Summary of Next Actions

1. Finalize CSV schema and parsing contract for Codex implementation.  
2. Prototype loader supporting per-curve threshold arrays and uncertainty bands.  
3. Implement payoff-vs-threshold plotting overlaying multiple models on a shared score axis.  
4. Integrate configuration loader with UI toggle logic and STRINGS-based text system.  
5. Add documentation panel summarizing threshold semantics, configuration options, and CSV conventions.

---

**End of Document — ROC Utility App Roadmap (v2.0 Development Specification)**
