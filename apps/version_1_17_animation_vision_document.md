# Version 1.17 — Animation & State Snapshot Vision Document

This document defines the *conceptual requirements* and long-term vision for a comprehensive **state-snapshot animation system** to be implemented in version **1.17** of the Continuous ROC Explorer. It describes goals, design philosophy, and architectural structures to keep in mind while working on version 1.16.

It is **not implementation-ready**, and no Codex prompts are included.

---

## 1. OVERALL GOALS

Version 1.17 introduces a general-purpose system for:

- **Capturing state snapshots** of the entire application in a stable, semantic format.
- **Creating animations** by sequencing these snapshots as keyframes.
- Allowing teachers and expert users to produce **clear, uncluttered, pedagogically meaningful visualizations**.
- Ensuring animations are **configuration-driven**, **shareable**, and **replayable**.

Version 1.17 focuses on versatility:

- Animations of **sample ROC variability** (one sample at a time).
- Animations of **parameter sweeps** (e.g., μ or σ changing over time).
- Animations illustrating **threshold motion**, **ROC operating point movement**, etc.
- Animations captured *from user-driven interactions* without adding UI clutter.

---

## 2. STATE SNAPSHOT SYSTEM

### 2.1. Purpose
A state snapshot represents a **complete, reproducible app configuration**. Replay of a snapshot must produce identical displays (distributions, ROC curves, histograms, legends, threshold, UI layout state, etc.).

### 2.2. What a Snapshot Captures
A snapshot captures **semantic state only**, not ephemeral UI state. Examples:

#### Metrics & Theoretical Model
- Selected distributions for positives and negatives
- Distribution parameters
- Prevalence
- Threshold
- Derived metrics (display-only)

#### Data State
- Whether empirical data is loaded
- Empirical dataset values
- Sampled datasets generated from the model
- Estimated ROC curve and confidence band
- Visibility settings for all plottable elements

#### UI Panels
- Collapsed/expanded states (if implemented later)

### 2.3. What a Snapshot Must NOT Capture
Snapshots must **never** contain:

- Pointer position
- Hover state
- Tooltip text or activation
- Transient animations

Tooltips are not conceptual and must not be stored.

### 2.4. Snapshot Schema (Conceptual)
```
{
  "version": "1.17-snapshot",
  "model": {
    "positive": { "dist": ..., "params": {...} },
    "negative": { "dist": ..., "params": {...} }
  },
  "prevalence": ...,
  "threshold": ...,
  "empirical_data": {
    "present": true/false,
    "scores": [...],
    "labels": [...]
  },
  "samples": [...],
  "estimated_curve": {...},
  "confidence_band": {...},
  "visibility": {
    "theoretical_curve": true/false,
    "sample_curves": true/false,
    "imported_empirical": true/false,
    "confidence_bands": true/false
  },
  "annotation": "Optional teacher-added note"
}
```

This schema will evolve but serves as a conceptual starting point.

---

## 3. KEYFRAME-BASED ANIMATION SYSTEM

Animations will be built from **ordered sequences** of snapshots.

### 3.1. Animation Structure (Conceptual)
```
{
  "version": "1.17-animation",
  "keyframes": [
      { "snapshot": { ... }, "duration": 800, "annotation": "..." },
      { "snapshot": { ... }, "duration": 800 },
      ...
  ],
  "metadata": {
      "title": "...",
      "description": "..."
  }
}
```

### 3.2. Types of Animations Supported

#### 3.2.1. Sample-Variability Animations
- Theoretical curve remains fixed.
- Sample ROC curves are shown **one at a time**.
- Histograms update only for the active sample.
- Threshold moves (optionally) along sample curves.

#### 3.2.2. Parameter-Sweep Animations
- Distribution parameters vary from frame to frame.
- All derived plots update.
- Useful for teaching how ROC curves respond to model changes.

#### 3.2.3. Threshold-Only Animations
- Animate the movement of the operating point.
- Useful for teaching threshold selection.

### 3.3. Recording Animations
Recording is done implicitly by storing snapshots:

**Two possible approaches:**

#### Option A — Full Scripted Workflow (Teacher Mode)
- Teacher explicitly clicks “New Keyframe”.
- The current state is saved.
- Teacher optionally adds annotation text.
- Frames can be reordered or edited.

#### Option B — Implicit Capture Mode
- A temporary “record” mode captures a snapshot at each significant step:
  - parameter change
  - threshold change
  - sampling action

Teachers can later delete irrelevant frames.

### 3.4. Interaction with UI
Animations must not clutter the main UI. The animation subsystem should appear only when in **Animation Creation Mode**.

---

## 4. ROLE OF THE CONFIGURATION SYSTEM

### 4.1. Configurable Layout & Panel Visibility
Teachers can build **lesson-specific configurations**:
- Hide entire panels
- Lock some parameters
- Preload with specific model values
- Disable sampling
- Show only ROC plot

Animations created under such configurations must replay correctly.

### 4.2. “Replay-Only Configurations”
Configurations can include a flag:
```
"mode": "replay-only"
```
This prevents accidental edits and ensures stable animations.

### 4.3. Scriptability
A future extension may allow scripted parameter changes:
```
script: [
  { "action": "set", "path": "model.positive.params.mean", "value": 0.1 },
  { "action": "set", "path": "threshold", "value": 0.3 }
]
```
This is not required for 1.17 but is a possible extension.

---

## 5. FRAME EXPORT & APNG GENERATION

Animations will be rendered to APNG using a consistent mechanism:

- Each keyframe snapshot is rendered headlessly to SVG/PNG.
- Frames are stitched into APNG.
- Teacher chooses frame duration, loop behavior, etc.

Confidence bands, sample curves, histograms, and threshold markers must display exactly as in snapshot playback.

---

## 6. PRINCIPLES & CONSTRAINTS

1. **No UI clutter** in normal mode.
2. **Configuration-first design** — everything visible must be specifiable via the config file.
3. **Deterministic rendering** — snapshots must produce identical plots everywhere.
4. **No ephemeral UI state** in snapshots (no tooltips, no hover states).
5. **Teachers first** — animations are a teaching aid; students are not expected to use them.
6. **Separation of concerns** — snapshotting, rendering, and animation are separate modules.

---

## 7. SUMMARY OF WHAT VERSION 1.17 WILL DELIVER

- A robust, deterministic **state snapshot engine**.
- A flexible **keyframe-based animation builder**.
- Optional teacher annotations for each keyframe.
- Clear separation between app state and UI effects.
- Config-driven layouts enabling simplified teaching views.
- Exportable APNG animations.

This system will integrate cleanly with v1.16 improvements, especially the refactored panels, tooltips, visibility logic, and improved configuration model.

---

End of v1.17 Vision Document.
