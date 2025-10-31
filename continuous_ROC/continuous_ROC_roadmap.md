# Continuous ROC Explorer — Future Development Roadmap

## 1. Core Functionality Enhancements

### 1.1 Extended Distribution Support
- **Add custom user-defined distributions** via functional expressions or parameterized formulas.
- **Incorporate discrete distributions** (e.g., Poisson, Binomial) with automatic normalization for mixed-type ROC interpretation.
- **Add correlation structures** for multivariate or dependent sampling.

#### Explanation: Correlation Structures for Dependent or Multivariate Sampling

The goal of adding correlation structures is to let teachers illustrate how dependencies between scores or models influence ROC curves and AUC estimation.

##### 1. Between-Class Correlation (Shared Noise)
Each simulated case has a single score, but positive and negative distributions may be affected by shared sources of variation. Introducing a controllable correlation (ρ) between draws for positive and negative samples simulates shared noise or contextual drift.

**Pedagogical Use:**
- Demonstrates that ROC curves are invariant to monotonic transformations that move both distributions together.
- Shows how shared bias or measurement noise reduces apparent separability without altering true AUC.
- Helps explain why correlated dataset shifts can confuse naive interpretations of model stability.

**Implementation Sketch:**
```js
let z = jStat.normal.sample(0,1); // shared latent noise
let pos = muPos + sigmaPos*(rho*z + Math.sqrt(1-rho**2)*randn());
let neg = muNeg + sigmaNeg*(rho*z + Math.sqrt(1-rho**2)*randn());
```
A correlation slider (ρ ∈ [-1,1]) would control the degree of shared noise, allowing visual comparison of PDF and ROC stability.

**Codex Prompt:**
> Extend the Continuous ROC Explorer to include a “Shared Noise” parameter that correlates the random draws for positive and negative score distributions. Implement this via a shared latent variable (Gaussian copula or simple additive model). Add a slider labeled “Shared Noise (ρ)” and update both distributions interactively. Ensure the ROC curve and AUC remain dynamically computed and export ρ as part of the configuration JSON.

##### 2. Multi-Model Correlation (Correlated Classifier Outputs)
Instead of one model, simulate two or more correlated scoring systems that evaluate the same cases. The degree of correlation (ρ) between models reflects how similar their predictions are.

**Pedagogical Use:**
- Demonstrates why combining correlated classifiers yields diminishing returns: when models share the same errors, ensemble AUC improvement is limited.
- Enables illustration of ensemble averaging and the difference between macro- and micro-averaged ROC curves.
- Lets students visualize how averaging ROC curves across correlated models can distort the apparent performance, highlighting why ROC averaging is not linear in probability space.

**Concept:**
Each case receives multiple correlated scores from different models:
(s1, s2) ~ BVN(μ, Σ)
where off-diagonal covariance introduces model-to-model correlation.

**Implementation Sketch:**
```js
const L = numeric.cholesky([[1, rho],[rho,1]]);
const z = L.map(row => row.map(() => jStat.normal.sample(0,1)));
const scores = z.map(v => jStat.normal.cdf(v)); // two correlated score sets
```
Teachers can toggle “Model 1 / Model 2 / Average / Both” views to show how ROC averaging behaves under correlation.

**Codex Prompt:**
> Extend the Continuous ROC Explorer to simulate two correlated scoring systems for the same cases. Use a Gaussian copula or bivariate Normal to generate correlated score pairs with user-controlled ρ. Plot ROC curves for each model and their average, and show how ROC-averaging becomes misleading when ρ > 0. Include an overlay that highlights macro- vs micro-averaging differences and quantify AUC gains or losses under correlation.

### 1.2 Sampling and Simulation Improvements
- Replace pure random sampling with **quasi-random (Sobol)** and **stratified sampling** options for smoother ROC curves.
- Add **seed control and reproducibility options** for consistent classroom demonstrations.
- Include **Monte Carlo error estimation overlays** to show sampling variability.

### 1.3 ROC Metrics Extensions
- Expand available metrics: **partial AUC, AUC variance, F1, MCC, Youden’s J, balanced accuracy**.
- Add **curve-smoothing options** (parametric, spline, or binormal fits).
- Implement **isocost or iso-utility contours** for decision-theory demonstrations.

---

## 2. User Interface & Interaction

### 2.1 Visualization Refinements
- Add **interactive legends** to toggle visibility of components.
- Support **zoom/pan and focused subplots** for both ROC and PDF displays.

#### Explanation: Interactive Legend for Distribution Visibility
An interactive legend is a clickable key next to the chart that lets users **show/hide individual plotted components** (e.g., Positive PDF, Negative PDF, fitted/smoothed curves, parameter-sweep overlays). This declutters busy displays and supports stepwise teaching.

**Behavior**
- Click a legend item to toggle the corresponding layer’s visibility.
- Hidden layers appear dimmed in the legend (reduced opacity).
- Hovering a legend item highlights its layer on the plot.
- Toggled states persist across UI updates and are included in exported configuration.

**Minimal D3 Pattern**
```js
legend.selectAll('rect')
  .data(legendData)
  .enter().append('rect')
  .attr('fill', d => d.color)
  .attr('opacity', d => d.visible ? 1 : 0.3)
  .on('click', (e,d) => {
    d.visible = !d.visible;
    d3.select('#' + d.id).style('display', d.visible ? null : 'none');
    d3.select(e.currentTarget).attr('opacity', d.visible ? 1 : 0.3);
  });
```

**Codex Prompt**
> You are working on `continuous_ROC.html`. Implement an **interactive legend** that toggles visibility of each plotted component (e.g., Positive PDF, Negative PDF, optional overlays). When a legend item is clicked, hide/show the associated SVG layer and fade the legend swatch to indicate state. On hover, temporarily highlight the associated layer. Persist the visibility map in the app’s configuration and include it in exports.

### 2.2 Component and Parameter Management
- Allow **drag-and-drop reordering** of distribution components.
- Add **copy/paste templates** for reusing configuration setups.
- Display **real-time normalization indicators** for component weights.

### 2.3 Existing Features – Refinement Goals
- Maintain the **draggable threshold–ROC synchronization**, but smooth transitions and optimize tooltip behavior.
- Optimize **real-time metric updates** for efficiency when sample sizes are large.
- Streamline **distribution parameter sliders** with grouped control panels and keyboard input options.

---

## 3. Export & Data Exchange

### 3.1 CSV/JSON Enhancements
- Extend current CSV export to include **metadata** (AUC, prevalence, timestamp, seed, app version).
- Support **bidirectional JSON import/export** of configuration states.
- Enable **multi-scenario batch export** for classroom exercises.

### 3.2 Figure Export
- Add **SVG/PNG export** for both ROC and PDF plots with annotations.
- Include **automatic figure caption templates** for documentation and teaching materials.

---

## 4. Educational Features

### 4.1 Guided Learning Mode
- Implement **narrative overlays** to explain how ROC curves evolve with parameter changes.
- Provide **pedagogical toggles** to highlight confusion regions, probability shading, or cost trade-offs.
- Add **interactive quiz steps** asking users to predict metrics before revealing results.

### 4.2 Comparative Scenarios
- Allow **side-by-side or overlay comparisons** of two ROC configurations.
- Enable **parameter sweeps** (e.g., varying mean difference or variance ratio) with animated transitions.
- Introduce **pedagogical presets** to demonstrate concepts like overlap, separability, and threshold bias.

---

## 5. Technical Architecture

### 5.1 Modularization
- Refactor code into **ES6 modules**: core math (roc_core.js), UI (roc_ui.js), and rendering (roc_plot.js).
- Create a **configuration-driven initialization API** for embedding in other ROC-related teaching apps.
- Store configuration and localization data as JSON schema.

### 5.2 Performance Optimization
- Use **Web Workers** for computationally heavy sampling tasks.
- Add **memoization** for static PDF/CDF computations.
- Benchmark and optimize **D3 rendering performance** on large samples.

---

## 6. Accessibility & Localization

### 6.1 Accessibility
- Add **keyboard navigation** for all interactive elements.
- Provide **ARIA labels** and accessible descriptions.
- Offer **dark mode and high-contrast themes**.

### 6.2 Localization
- Implement **multi-language support** via a localized `STRINGS` dictionary.
- Add **dynamic locale switching** to support classroom internationalization.

---

## 7. Documentation & Pedagogical Integration

### 7.1 User Guide Expansion
- Include **interactive code examples** for ROC interpretation.
- Add **links to related modules** (probability, decision theory, utility analysis).
- Integrate **literature references** for each modeling approach.

### 7.2 Teacher Customization Toolkit
- Provide **JSON presets** for reproducible classroom scenarios.
- Offer **batch dataset generation tools** for exercises.
- Add **teacher mode UI** to restrict or scaffold controls during instruction.

---

## 8. Future Extensions

- Develop **3D ROC surfaces** for ternary or probabilistic classifiers.
- Add **interactive cost/benefit and utility surface visualizations**.
- Integrate with **Shiny or Jupyter** for cross-platform demonstrations.
- Extend to **Bayesian posterior ROC analysis**, supporting conjugate families (Normal, Beta, Exponential, etc.).
- Simulate **batch effects and temporal autocorrelation** to illustrate non-i.i.d. sampling and its impact on ROC reliability.

#### Explanation: Batch Effects and Temporal Autocorrelation

These extensions simulate dependencies *across cases* rather than between classes or models. They allow teachers to explore how non-independent samples affect ROC interpretation and AUC estimation.

##### 1. Batch Effects (Grouped Dependence)
**Concept:** Simulate multiple experimental or contextual batches where all scores within a batch share a common offset or scaling bias.

**Pedagogical Use:**
- Demonstrates that ignoring batch structure can inflate variance or bias ROC estimates.
- Illustrates how stratified sampling or mixed-effects modeling can correct for grouped variation.

**Implementation Sketch:**
```js
let batchEffect = (Math.random() - 0.5) * batchVariance;
score = baseScore + batchEffect + randomNoise;
```
A control labeled “Batch Variance” could let users adjust the amount of between-batch variation.

**Codex Prompt:**
> Extend the Continuous ROC Explorer to include a “Batch Effects” simulation mode. Group samples into batches, each with a random offset drawn from N(0, σ_batch). Add a slider for σ_batch and update all visualizations to show within- and between-batch variance. Optionally include color-coded batches on the PDF plot.

##### 2. Temporal Autocorrelation
**Concept:** Introduce correlation among consecutive scores, simulating a temporal process such as drift or sequential dependence.

**Pedagogical Use:**
- Shows that AUC estimation assumes independent samples.
- Lets students visualize how correlated sequences reduce effective sample size and alter ROC confidence intervals.

**Implementation Sketch:**
```js
for (let i = 1; i < n; i++) {
  eps[i] = rho * eps[i-1] + Math.sqrt(1 - rho**2) * randn();
  score[i] = mu + sigma * eps[i];
}
```
A “Temporal Correlation (ρ)” slider can control dependence strength.

**Codex Prompt:**
> Extend the app with a “Temporal Dependence” mode that generates autocorrelated scores using an AR(1) process with user-controlled ρ. Visualize how increasing correlation flattens the ROC variance estimate and affects confidence shading. Include tooltips explaining why AUC assumes i.i.d. samples.

## 9. Milestones (Codex Implementation Plan)

Each milestone represents a self-contained feature set designed for a single **Codex** development session.

### v1.1 — Visualization and UI Polish
**Goals:** Add an **interactive legend** to toggle visibility of Positive/Negative PDFs and any future overlays. Prepare stable SVG layer IDs and a `visibility` state map so upcoming features (smoothed ROC, comparison overlays, Monte Carlo samples) can plug in without refactoring.

**Codex Prompt:**
> Implement an interactive legend for the plotting panels in `continuous_ROC.html`. Each legend item maps to a specific SVG layer ID. Clicking toggles that layer’s visibility and updates the legend item’s opacity. Hovering a legend item temporarily highlights its layer. Persist the visibility map in the app’s configuration and ensure exports/imports round-trip it correctly.

### v1.2 — Extended Metrics Display
**Goals:** Add new metrics (F1, MCC, Youden’s J, balanced accuracy, partial AUC).

**Codex Prompt:**
> Extend the `update()` function to compute and display new ROC metrics (F1, MCC, Youden’s J, balanced accuracy, partial AUC) below the main statistics panel. Ensure metrics update dynamically when parameters or thresholds change.

### v1.3 — Export Enhancements
**Goals:** Expand CSV export; add JSON import/export.

**Codex Prompt:**
> Extend the export functions to include metadata (AUC, prevalence, timestamp, seed, app version). Add bidirectional JSON import/export buttons and auto-reload of configuration upon import.

### v1.4 — Guided Learning Mode
**Goals:** Step-by-step overlays explaining ROC construction.

**Codex Prompt:**
> Add a “Guided Learning Mode” that highlights key app regions and explains ROC concepts in sequential overlays. Include fade transitions and teacher options to skip or restart the tutorial.

### v1.5 — Comparative Scenarios
**Goals:** Side-by-side or overlay comparison mode.

**Codex Prompt:**
> Add a dual-view interface for comparing two ROC configurations. Each plot should have distinct colors and metrics. Include controls to toggle between single and comparison modes.

### v1.6 — Modular Refactor
**Goals:** Split the app into computation, UI, and rendering modules.

**Codex Prompt:**
> Refactor the main script into modules (`roc_core.js`, `roc_ui.js`, and `roc_plot.js`) and implement a clean initialization API. Ensure no functional regressions.

### v1.7 — Accessibility & Localization
**Goals:** Keyboard control, ARIA labels, multi-language support.

**Codex Prompt:**
> Implement accessibility features (keyboard navigation, ARIA labels) and add localization support with dynamic language switching. Provide English and Spanish strings as defaults.

### v1.8 — Teacher Customization Toolkit
**Goals:** JSON presets, lockable controls, batch export.

**Codex Prompt:**
> Add a teacher mode with options to lock controls, load predefined JSON presets, and generate randomized but reproducible exercise datasets for students.

### v1.9 — Bayesian Posterior ROC Analysis
**Goals:** Implement Bayesian Mode with conjugate posteriors.

**Codex Prompt:**
> Implement a “Bayesian Mode” toggle that supports Normal, Beta, Exponential, and Gamma conjugate posteriors. For each draw, compute ROC curves and display mean and credible bands. Include controls for posterior draws (K) and prior hyperparameters.

### v2.0 — Modular Library API Integration
**Goals:** Convert the app into a reusable library.

**Codex Prompt:**
> Package the Continuous ROC Explorer as a reusable JS module with an initialization API (`ROCExplorer.init(container, config)`). Ensure configuration is JSON-schema–driven and supports integration with other educational ROC visualizers.

### v2.1 — Precision–Recall Curve Integration
**Goals:** Add an optional Precision–Recall (PR) curve panel synchronized with the ROC plot. Enable toggling between ROC and PR displays or viewing them side by side.

**Codex Prompt:**
Extend the Continuous ROC Explorer with a Precision–Recall (PR) curve panel. Compute precision and recall for all thresholds using sorted scores. Plot Precision (y-axis) vs. Recall (x-axis) alongside the existing ROC curve, sharing the threshold marker and interactive slider. Include a dynamic horizontal line showing baseline precision equal to class prevalence. Add optional overlays for F₁-score contours. Ensure both curves update dynamically when prevalence or score distributions change, and that exports include both AUC_ROC and AUC_PR metrics.

**Pedagogical Objective:**
Illustrate how precision–recall trade-offs differ from ROC trade-offs, particularly under class imbalance. Allow teachers to demonstrate that ROC AUC can remain stable even as precision collapses when prevalence decreases, reinforcing the Bayesian interpretation of precision as a posterior probability.
