# Continuous ROC Explorer — User Guide (Expanded Edition)

## Overview
The **Continuous ROC Explorer** is an interactive visualization and simulation app for teaching and exploring **Receiver Operating Characteristic (ROC)** curves and related performance metrics. It is designed for flexible classroom use, enabling both quantitative demonstration and conceptual understanding.

This expanded guide provides detailed explanations, conceptual teaching figures, pedagogical scenarios, customization options, and technical documentation for developers (Codex Implementation Checklist).

---

## Conceptual Introduction
ROC analysis is a framework for understanding diagnostic accuracy. It visualizes the tradeoff between sensitivity and specificity across all possible thresholds. Instructors can use this app to show:
- How overlapping score distributions generate false positives and false negatives.
- Why the area under the curve (AUC) summarizes overall performance.
- How prevalence affects predictive values but not ROC shape.
- How different models can share the same AUC yet behave differently at key thresholds.

### Figure 1. Conceptual illustration of positive and negative score distributions
![](images/conceptual_distributions.png)
*Figure 1. Two overlapping score distributions (positive and negative cases) with a threshold dividing predicted positive and negative outcomes.*

### Figure 2. Corresponding ROC curve construction
![](images/roc_curve_construction.png)
*Figure 2. Each threshold on the score axis corresponds to a point on the ROC curve. Sweeping the threshold traces the full curve.*

---

## Pedagogical Scenarios
### Scenario 1 — Varying Separation
Show how increasing the distance between means (μ₊ − μ₋) improves discrimination and increases AUC.
### Scenario 2 — Overlapping Variance
Keep the means fixed but change variance; students can observe how overlap, not just mean difference, controls sensitivity/specificity tradeoffs.
### Scenario 3 — Equal AUC, Different Shapes
Demonstrate that two ROC curves may have the same AUC but differ in slope, curvature, and optimal thresholds.
### Scenario 4 — Prevalence Effects
Adjust prevalence to show how predictive values (PPV, NPV) depend on class balance while ROC shape remains unchanged.
### Scenario 5 — Threshold Sweep
Animate the threshold moving across the distributions while simultaneously updating the confusion matrix and ROC curve.

### Figure 3. Screenshot of annotated app layout
![](images/annotated_app.png)
*Figure 3. The main user interface of the Continuous ROC Explorer, showing the key plots, sliders, and metrics tables.*

---

## Teacher Customization
Teachers can customize the app using the configuration file `continuous_ROC_config.js`. Typical modifications include:
- Default score distributions (Normal, Beta, etc.)
- Sliders, ranges, and default values
- Metrics to display in tables
- Color schemes and labeling
- Language and help text

---

## Figures and Layout Reference
Figures help teachers orient themselves to the app interface.

**Figure 3** above labels the main components:
1. Positive and negative score distributions
2. Threshold marker and shaded regions
3. ROC curve plot
4. Prevalence-independent metrics table
5. Prevalence-dependent metrics table
6. Threshold and prevalence sliders

---

## Metrics Reference
This section defines the metrics used in the app.

### Prevalence-Independent Metrics
- **True Positive Rate (TPR / Sensitivity / Recall)** — TP / (TP + FN)
- **True Negative Rate (TNR / Specificity)** — TN / (TN + FP)
- **False Positive Rate (FPR)** — FP / (FP + TN)
- **False Negative Rate (FNR)** — FN / (FN + TP)
- **Likelihood Ratios:** LR⁺ = TPR/FPR, LR⁻ = FNR/TNR
- **Youden’s J Index:** TPR + TNR − 1
- **Balanced Accuracy:** (TPR + TNR) / 2
- **Diagnostic Odds Ratio:** (TPR × TNR) / (FPR × FNR)
- **Matthews Correlation Coefficient (MCC)** — correlation between predicted and actual labels
- **AUC (Area Under the Curve)** — probability that a randomly chosen positive has a higher score than a randomly chosen negative

### Prevalence-Dependent Metrics
- **PPV (Positive Predictive Value)** = TP / (TP + FP)
- **NPV (Negative Predictive Value)** = TN / (TN + FN)
- **Accuracy** = (TP + TN) / (Total)
- **Error Rate** = 1 − Accuracy
- **F₁ Score** = 2 × (Precision × Recall) / (Precision + Recall)

### Ambiguous or Context-Dependent Metrics
These require instructor clarification before use:
- **Cohen’s Kappa**, **Markedness**, **Informedness**, **Expected Utility**, **Bias Index**, **PABAK**, **Fβ Variants**

---

## Unified Annotations in App State & Configuration–State Separation
Annotations (draggable, styled text boxes) are part of the saved **state**, not the configuration. States can be shared or replayed across configurations with different languages, labels, or color themes.

---

## Teacher Workflow Summary
### Step 1 — Configure Starting State
Set up the desired scenario and add explanatory annotations.
### Step 2 — Define Subsequent States
Modify parameters or annotations to illustrate changes.
### Step 3 — Preview and Animate
Play through state transitions to visualize evolving ROC curves.
### Step 4 — Export and Share
Export as JSON, GIF, or WebM for classroom presentation.
### Step 5 — Reuse and Adapt
Use saved states to teach related concepts or compare tests.

---

## Future Features & Roadmap
Planned features include:
- Dataset export functions (simulate scores and outcomes)
- Additional metrics (Cohen’s Kappa, Informedness)
- Dual-scenario view for comparative teaching
- Animation scripting using saved states as keyframes
- Annotation layer with full formatting controls
- JSON-based localization for multi-language use

---

# Codex Implementation Checklist
(unchanged from prior version)

### 1. Metrics Implementation
**Prevalence-Independent:** TPR, TNR, FPR, FNR, LR⁺, LR⁻, Youden’s J, Balanced Accuracy, Diagnostic Odds Ratio, MCC, AUC.
**Prevalence-Dependent:** PPV, NPV, Accuracy, Error Rate, F₁ Score.
**Clarification Needed:** Cohen’s Kappa, Markedness, Informedness, Expected Utility, Bias Index, PABAK, Fβ.

---

### 2. Analytical & Statistical Tools
- Support new distributions: **Poisson**, **Triangular** (add without removing existing families like Normal, Beta, Gamma, Logistic, Log-Normal, etc.).
- Fix Student’s T to include mean and SD parameters.
- Fit distributions to data (parametric & nonparametric KDE).
- Simulated dataset generation respecting prevalence & sample size.
  - Export as CSV.
  - **Stochastic sampling simulation for ROC variability:** repeatedly resample synthetic datasets from defined distributions to estimate variability and visualize ROC/AUC uncertainty as shaded bands or overlays.
  - Compute confidence intervals for AUC and other metrics.
- Generate heatmaps of metric sensitivity vs. prevalence and threshold.

---

### 3. State Management / Persistence
- `getCurrentState()` returns JS object.
- `applyState(stateObj)` updates UI.
- `resetState()` restores defaults.
- **Save Scenario:** serialize state as JSON.
- **Load Scenario:** import and validate.
- Include version key for backward compatibility.

---

### 4. Unified Annotations & Configuration–State Separation
- Implement draggable, resizable text box annotations with formatting controls.
- Store annotation data (content, position, size, style) in state JSON.
- Exclude configuration data (strings, features, distributions) from state.
- Validate and substitute missing config entries on load.
- Ensure consistent rendering in static and animated modes.

---

### 5. Visualization & Export
- Interactive metric trace plots (metric vs threshold).
- Dual-scenario comparison view.
- Export plots as PNG/SVG.
- Tooltip popups for metrics and parameters.
  - Hover text defines metrics and parameters, styled consistently.
- Presentation themes (light/dark/color-blind).
- Screenshot/SVG export of plots or entire app.

---

### 6. Pedagogical & Interactive Tools
- Exercise mode (teacher tasks).
- Quiz mode (JSON question packs).
- Narrative mode (guided manual walkthrough distinct from animation).
- Side-by-side scenario comparison for teaching.

---

### 7. Developer Integrations
- Metrics API returning JSON.
- Config/schema validation.
- Plugin API for custom metrics.
- Batch mode for parameter sweeps.
- Versioned scenario files.

---

### 8. UI Enhancements
- Resizable panels and persistent layout.
- Improved legends and tooltips.
- Inline reference links.
- Contextual metric help.
- Accessibility: color-blind & high-contrast modes.

---

### 9. Testing & Documentation
- Unit tests for metrics.
- JSON import/export validation.
- Performance profiling.
- Updated documentation.

---

### 10. Unified State-Based Animation System
- Use the existing state object for frames.
- Append current state to animation JSON.
- Interpolate sequential playback.
- Default/optional durations.
- Text updates discretely between frames.
- Backward compatible with single-state saves.
- Export JSON or WebM/GIF playback.
- Parameter sweep animation (means, variances, weights).
- Targeted ROC Set Generator.
- Unified Animation Configuration & Recording System.

---

## Credits
- Built with **D3.js** and **jStat**.
- Designed for **interactive teaching of statistical concepts**.
- Configuration-driven for easy classroom adaptation.
# Continuous ROC Explorer — User Guide

## Overview
The **Continuous ROC Explorer** is an interactive, browser-based tool designed for teaching and exploring Receiver Operating Characteristic (ROC) curves and performance metrics. It allows instructors and students to visualize how the shape of score distributions, thresholds, and prevalence affect diagnostic test performance.

This guide describes how to use and customize the app, how to integrate it into lectures, and how to extend its features using Codex.

---

## Getting Started
1. Open `continuous_ROC.html` in a modern browser (Chrome, Edge, Firefox).
2. Adjust positive and negative score distributions using sliders or numeric input boxes.
3. Move the threshold slider to observe changes in the confusion matrix, ROC curve, and calculated metrics.
4. Adjust prevalence to visualize how population composition affects predictive values.

---

## Teacher Customization
Teachers can modify the app using the configuration file `continuous_ROC_config.js`. Customizable elements include:
- Default distributions and parameters.
- Displayed metrics (add or remove columns in the metrics tables).
- Plot colors, fonts, and background themes.
- Language, labels, and tooltips.
- Ranges and step sizes for sliders.

To modify these:
1. Open `continuous_ROC_config.js` in a text editor.
2. Edit the configuration variables (each has inline comments for guidance).
3. Save the file and refresh the HTML app to see the changes.

---

## Figures and Layout Reference
Annotated figures (stored in `images/`) show the layout of the app’s components:
- Score distribution plots
- Threshold marker and shaded areas
- ROC curve plot
- Prevalence-dependent metrics table
- Prevalence-independent metrics table
- Controls and sliders

Each numbered element is described in a legend to help teachers identify where to customize features or refer to them in lessons.

---

## Metrics Reference
### Prevalence-Independent Metrics
- **True Positive Rate (TPR/Sensitivity/Recall)**
- **True Negative Rate (TNR/Specificity)**
- **False Positive Rate (FPR)**
- **False Negative Rate (FNR)**
- **Likelihood Ratios (LR⁺, LR⁻)**
- **Youden’s J**, **Balanced Accuracy**, **Diagnostic Odds Ratio**, **Matthews Correlation Coefficient (MCC)**, **AUC**

### Prevalence-Dependent Metrics
- **Positive Predictive Value (PPV)**, **Negative Predictive Value (NPV)**, **Accuracy**, **Error Rate**, **F₁ Score**

### Ambiguous or Context-Dependent Metrics
Require clarification before implementation:
- **Cohen’s Kappa**, **Markedness**, **Informedness**, **Expected Utility**, **Bias Index**, **PABAK**, **Fβ Variants**

---

## 🧩 Unified Annotations in App State & Configuration–State Separation
Annotations (draggable, styled text boxes) are saved as part of the **state** rather than the configuration. This allows animations and saved scenarios to be replayed under alternate configurations — e.g., translated text or different color themes.

Example state structure:
```json
{
  "positives": { "distribution": "beta", "parameters": {"a": 3, "b": 2} },
  "negatives": { "distribution": "beta", "parameters": {"a": 2, "b": 3} },
  "threshold": 0.45,
  "prevalence": 0.2,
  "annotations": [
    { "id": "note_1", "content": "Overlap between classes reduces AUC", "x": 0.63, "y": 0.28 }
  ]
}
```

Annotations persist through state save/load, but the configuration file defines the environment (UI text, colors, feature toggles). This design enables **portability**, **localization**, and **reusability**.

---

## 🧑‍🏫 Teacher Workflow Summary: Creating and Exporting Animations

### Step 1 — Configure the Starting State
- Adjust distributions, threshold, prevalence.
- Add annotations.
- Save the state as the first keyframe.

### Step 2 — Define Subsequent States
- Modify parameters for each teaching moment.
- Add or adjust annotations.
- Save each as a new frame.

### Step 3 — Preview the Animation
- Open the animation panel.
- Interpolate between states; review transitions.
- Adjust playback speed and looping.

### Step 4 — Export Options
| Format | Description | Recommended Use |
|---------|--------------|-----------------|
| **WebM** | Smooth video | PowerPoint, Keynote |
| **GIF** | Looping animation | Slides, LMS uploads |
| **APNG** | Transparent animation | Web or docs |
| **JSON** | Scenario sequence | Reproducible scripts |

### Step 5 — Reuse and Share
States and animations are portable; replay them under any compatible config.

### Step 6 — Optional Manual Editing
Edit animation JSONs directly to reorder, adjust timing, or translate annotations.

---

# Codex Implementation Checklist

### 1. Metrics Implementation
**Prevalence-Independent:** TPR, TNR, FPR, FNR, LR⁺, LR⁻, Youden’s J, Balanced Accuracy, Diagnostic Odds Ratio, MCC, AUC.
**Prevalence-Dependent:** PPV, NPV, Accuracy, Error Rate, F₁ Score.
**Clarification Needed:** Cohen’s Kappa, Markedness, Informedness, Expected Utility, Bias Index, PABAK, Fβ.

---

### 2. Analytical & Statistical Tools
- Support new distributions: **Poisson**, **Triangular** (add without removing existing families like Normal, Beta, Gamma, Logistic, Log-Normal, etc.).
- Fix Student’s T to include mean and SD parameters.
- Fit distributions to data (parametric & nonparametric KDE).
- Simulated dataset generation respecting prevalence & sample size.
  - Export as CSV.
  - **Stochastic sampling simulation for ROC variability:** repeatedly resample synthetic datasets from defined distributions to estimate variability and visualize ROC/AUC uncertainty as shaded bands or overlays.
  - Compute confidence intervals for AUC and other metrics.
- Generate heatmaps of metric sensitivity vs. prevalence and threshold.

---

### 3. State Management / Persistence
- `getCurrentState()` returns JS object.
- `applyState(stateObj)` updates UI.
- `resetState()` restores defaults.
- **Save Scenario:** serialize state as JSON.
- **Load Scenario:** import and validate.
- Include version key for backward compatibility.

---

### 4. Unified Annotations & Configuration–State Separation
- Implement draggable, resizable text box annotations with formatting controls.
- Store annotation data (content, position, size, style) in state JSON.
- Exclude configuration data (strings, features, distributions) from state.
- Validate and substitute missing config entries on load.
- Ensure consistent rendering in static and animated modes.

---

### 5. Visualization & Export
- Interactive metric trace plots (metric vs threshold).
- Dual-scenario comparison view.
- Export plots as PNG/SVG.
- Tooltip popups for metrics and parameters.
  - Hover text defines metrics and parameters, styled consistently.
- Presentation themes (light/dark/color-blind).
- Screenshot/SVG export of plots or entire app.

---

### 6. Pedagogical & Interactive Tools
- Exercise mode (teacher tasks).
- Quiz mode (JSON question packs).
- Narrative mode (guided manual walkthrough distinct from animation).
- Side-by-side scenario comparison for teaching.

---

### 7. Developer Integrations
- Metrics API returning JSON.
- Config/schema validation.
- Plugin API for custom metrics.
- Batch mode for parameter sweeps.
- Versioned scenario files.

---

### 8. UI Enhancements
- Resizable panels and persistent layout.
- Improved legends and tooltips.
- Inline reference links.
- Contextual metric help.
- Accessibility: color-blind & high-contrast modes.

---

### 9. Testing & Documentation
- Unit tests for metrics.
- JSON import/export validation.
- Performance profiling.
- Updated documentation.

---

### 10. Unified State-Based Animation System
- Use the existing state object for frames.
- Append current state to animation JSON.
- Interpolate sequential playback.
- Default/optional durations.
- Text updates discretely between frames.
- Backward compatible with single-state saves.
- Export JSON or WebM/GIF playback.
- Parameter sweep animation (means, variances, weights).
- Targeted ROC Set Generator.
- Unified Animation Configuration & Recording System.

---

## Credits
- Built with **D3.js** and **jStat**.
- Designed for **interactive teaching of statistical concepts**.
- Configuration-driven for easy classroom adaptation.
