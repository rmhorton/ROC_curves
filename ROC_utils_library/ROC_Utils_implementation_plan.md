# Shared ROC JSON Format, ROC_utils.js Library, and VS Code Codex Implementation Plan

This document is intended to live in the **same directory** as your HTML apps, with the filename:

    ROC_Utils_implementation_plan.md

All Codex prompts below assume the VS Code "Codex – OpenAI’s coding agent" extension, which **can read files in your workspace**.

You should open this file in VS Code and copy/paste the version-specific Codex prompts directly into the Codex chat.

-------------------------------------------------------------------------------

0. HOW TO USE THIS PLAN WITH CODEX IN VS CODE

0.1 What Codex Can See

- Codex **can** open and read files in your workspace when you tell it to.
- Codex **cannot** see anything you have not pointed it at.
- This plan is in `ROC_Utils_implementation_plan.md`; Codex can read it if instructed.

Every Codex prompt in section 6 is a **complete, single block** you can paste into VS Code. You do **not** need to paste multiple fragments or manually assemble prompts.


0.2 Global Safety Rules for Codex

These rules apply to **all** implementation steps. They are written here so Codex will see them whenever it opens this plan file.

Codex MUST:

- Read this file: `ROC_Utils_implementation_plan.md` before doing any versioned work.
- Follow the canonical ROC JSON format (section 2).
- Follow the canonical ROC CSV format (section 3).
- Follow the ROC_utils.js API description (section 4).
- Modify **only** the files explicitly listed in a version prompt.
- Keep changes **minimal and surgical**.
- Preserve all existing functionality unless a change is explicitly requested.
- Preserve UI layout and behavior unless explicitly told to change it.

Codex MUST NOT:

- Modify files not listed in a version prompt.
- Create or delete files unless explicitly instructed.
- Perform broad refactors or rewrite entire files unless explicitly instructed.
- Introduce new dependencies or build tools.
- Change directory layout.


0.3 Recommended Workflow in VS Code

For each version step:

1. Open the workspace containing:
   - `continuous_ROC.html`
   - `ROC_utility.html`
   - `ROC_Utils_implementation_plan.md`
   - `ROC_utils.js` (once created)
2. Open the Codex chat panel.
3. Find the version you want in **section 6** of this file.
4. Copy the **entire Codex prompt block** for that version.
5. Paste it into Codex and send.
6. Let Codex open and read this plan, then modify only the listed files.
7. Review diffs in VS Code.
8. Run browser tests (Jasmine) and manual checks.

-------------------------------------------------------------------------------

1. SCOPE AND GOALS

There are two client-side HTML/JS apps that work with ROC curves:

- App A: `continuous_ROC.html` — Continuous ROC Explorer.
- App B: `ROC_utility.html` — ROC Utility / Cost–Benefit app.

Goal:

- Define a **single canonical ROC JSON format**.
- Define a matching **ROC CSV format** for human-readable exchange.
- Implement a shared JavaScript library `ROC_utils.js` used by both apps for:
  - JSON import/export.
  - CSV import/export.
  - Canonicalization and validation.
  - ROC math utilities (AUC, empirical ROC, monotone cleanup).
- Add a **Jasmine browser test harness** for ROC_utils.js.
- Incrementally refactor both apps to use the shared library.

-------------------------------------------------------------------------------

2. CANONICAL ROC JSON SPECIFICATION

A ROC JSON file is the **primary exchange format**.

A ROC JSON file **may contain any number of ROC curves (≥ 1)**.

The top-level structure is always an **object (map)**:

    {
      "curve_id_1": { /* canonical curve object */ },
      "curve_id_2": { /* canonical curve object */ },
      ...
    }


2.1 Canonical Curve Object Schema

Each canonical curve object MUST follow this schema:

Required fields:

- `type` (string)
  - MUST be exactly `"ROC"`.
- `fpr` (array of numbers)
  - False Positive Rate values, each in [0, 1].
  - Sorted, non-decreasing.
  - Non-empty.
- `tpr` (array of numbers)
  - True Positive Rate values.
  - Same length as `fpr`.

Optional fields:

- `name` (string)
  - Human-readable label for this curve.

- `threshold` (array of numbers)
  - Same length as `fpr` when present.
  - Represents the score threshold used to obtain each (fpr, tpr) point.

- `bands` (array of objects)
  - Each band object describes an uncertainty band at a given confidence level.
  - Band object schema:

        {
          "level": 0.95,
          "lower": [ ... ],
          "upper": [ ... ]
        }

    - `level` is a number (e.g., 0.95).
    - `lower` and `upper` are arrays of numbers, same length as `fpr`.

- `metadata` (object)
  - Free-form key/value pairs (e.g., sample size, data source).

Disallowed / legacy fields:

- `tpr_lower`, `tpr_upper`, or any other ad hoc uncertainty arrays that duplicate band behavior.

When exporting, `ROC_utils.js` MUST always use this canonical structure.


2.2 Canonicalization Rules

`ROC_utils.js` must accept several flexible raw shapes and produce a canonical map:

    { curve_id: canonicalCurveObject }

Accepted raw inputs from JSON:

- A single curve object (will be given an auto-generated ID).
- An array of curve objects.
- An object whose enumerable properties are curve objects.
- An object with a property `curves` that is an array of curve objects.

Curve IDs are assigned with this priority:

1. `curve.curve_id` field, if present and non-empty.
2. `curve.name`, if present and unique.
3. Auto-generated IDs: `"curve_1"`, `"curve_2"`, ...

Validation and cleanup:

- `type` is set to `"ROC"` if missing; if present and not `"ROC"`, it is an error.
- `fpr` and `tpr` MUST be arrays of equal length with finite numbers.
- If `threshold` is present, it MUST be the same length as `fpr`.
- If `bands` is present:
  - It MUST be an array of objects with `level`, `lower`, `upper`.
  - `lower` and `upper` MUST match `fpr` length.
- Unrecognized top-level fields are dropped in the canonical result.
- If the curve cannot be validated (missing required fields, mismatched lengths), import MUST throw an Error with a helpful message.


2.3 Example Multi-Curve JSON File

    {
      "modelA": {
        "type": "ROC",
        "fpr": [0, 0.1, 0.3, 1],
        "tpr": [0, 0.4, 0.8, 1],
        "bands": [
          { "level": 0.95, "lower": [0, 0.35, 0.7, 1], "upper": [0, 0.45, 0.85, 1] }
        ],
        "metadata": { "source": "example", "sample_size": 2000 }
      },
      "modelB": {
        "type": "ROC",
        "fpr": [0, 0.05, 0.2, 1],
        "tpr": [0, 0.5, 0.9, 1]
      }
    }

-------------------------------------------------------------------------------

3. CANONICAL CSV SPECIFICATION

CSV is a **human-oriented convenience format** mapping directly to canonical curves.

3.1 Required Columns

- `curve_id`
- `fpr`
- `tpr`

3.2 Optional Columns

- `threshold`
- For each band level `p` (e.g., `0.95`), two columns:
  - `lower_p`
  - `upper_p`

Example band columns for a 95% interval:

- `lower_0.95`
- `upper_0.95`


3.3 CSV Export Rules

For each curve in the canonical map:

- Output one row per ROC point.
- Always include `curve_id`, `fpr`, `tpr`.
- Include `threshold` if the canonical curve has thresholds.
- For each band level present, include corresponding `lower_p` and `upper_p` columns.
- Empty cells are allowed (for missing data) but must be syntactically valid.


3.4 Example Multi-Curve CSV File

    curve_id,fpr,tpr,threshold,lower_0.95,upper_0.95
    modelA,0,0,1,,
    modelA,0.1,0.4,0.8,0.35,0.45
    modelA,0.3,0.8,0.6,0.70,0.85
    modelA,1,1,0,,
    modelB,0,0,1,,
    modelB,0.05,0.5,0.9,,
    modelB,0.2,0.9,0.7,,
    modelB,1,1,0,,

-------------------------------------------------------------------------------

4. ROC_utils.js API SPECIFICATION

`ROC_utils.js` lives in the same directory as the HTML files:

    ROC_utils.js

It exposes a single global object:

    window.ROCUtils = {
      // JSON
      parseRocJsonText,
      normalizeRocJson,
      toCanonicalRocObject,
      toRocJsonBlob,

      // CSV
      parseRocCsvText,
      rocToCsv,

      // Math
      computeEmpiricalRoc,
      ensureMonotoneRoc,
      computeAuc
    };

Brief descriptions:

- `parseRocJsonText(text)`
  - Parse JSON text, normalize it using the rules in section 2, and return a canonical map `{ id -> curve }`.

- `normalizeRocJson(raw)`
  - Accepts raw parsed JSON (any accepted shape) and returns a canonical map.

- `toCanonicalRocObject(obj)`
  - Enforces the canonical curve schema on a single curve, throwing on invalid input.

- `toRocJsonBlob(curves, filename)`
  - Given a canonical map `{ id -> curve }`, create a Blob and trigger a JSON download with the given filename.

- `parseRocCsvText(text)`
  - Parse CSV text following section 3 and return a canonical map `{ id -> curve }`.

- `rocToCsv(curves, options)`
  - Export a canonical map to CSV text following section 3.

- `computeEmpiricalRoc(points)`
  - Given an array of `{ score, label }` objects, compute ROC points.

- `ensureMonotoneRoc(rocPoints)`
  - Clean and enforce monotonic ROC behavior (see 4.1).

- `computeAuc(rocPoints)`
  - Compute the area under the ROC curve.


4.1 Reference Implementation — ensureMonotoneRoc

    ROCUtils.ensureMonotoneRoc = function(points) {
      if (!Array.isArray(points)) return [];

      // 1. Filter invalid entries
      let clean = points.filter(p =>
        Number.isFinite(p.fpr) && Number.isFinite(p.tpr)
      );

      // 2. Sort by FPR ascending
      clean.sort((a, b) => a.fpr - b.fpr);

      // 3. Consolidate duplicate FPR values
      const dedup = [];
      for (let p of clean) {
        const last = dedup[dedup.length - 1];
        if (last && last.fpr === p.fpr) {
          if (p.tpr > last.tpr) last.tpr = p.tpr;
        } else {
          dedup.push({ fpr: p.fpr, tpr: p.tpr, thr: p.thr });
        }
      }

      // 4. Enforce non-decreasing TPR
      for (let i = 1; i < dedup.length; i++) {
        if (dedup[i].tpr < dedup[i-1].tpr) dedup[i].tpr = dedup[i-1].tpr;
      }

      return dedup;
    };

-------------------------------------------------------------------------------

5. JASMINE TEST HARNESS (BROWSER-ONLY)

Directory layout (relative to workspace root):

    continuous_ROC.html
    ROC_utility.html
    ROC_utils.js
    ROC_Utils_implementation_plan.md

    test/
      SpecRunner.html
      lib/
        jasmine.css
        jasmine.js
        jasmine-html.js
        boot.js
      fixtures/
        multi_curve.json
        multi_curve.csv
      specs/
        roc_utils_spec.js


5.1 SpecRunner.html

    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>ROC_utils Jasmine Tests</title>
      <link rel="stylesheet" href="lib/jasmine.css">
      <script src="lib/jasmine.js"></script>
      <script src="lib/jasmine-html.js"></script>
      <script src="lib/boot.js"></script>
    </head>
    <body>
      <!-- Source under test -->
      <script src="../ROC_utils.js"></script>

      <!-- Specs -->
      <script src="specs/roc_utils_spec.js"></script>
    </body>
    </html>

Open `test/SpecRunner.html` in a browser to run tests.


5.2 Fixture Files

`test/fixtures/multi_curve.json`:

    {
      "modelA": {
        "type": "ROC",
        "fpr": [0, 0.1, 0.3, 1],
        "tpr": [0, 0.4, 0.8, 1],
        "bands": [
          { "level": 0.95, "lower": [0, 0.35, 0.7, 1], "upper": [0, 0.45, 0.85, 1] }
        ],
        "metadata": { "source": "fixture", "sample_size": 200 }
      },
      "modelB": {
        "type": "ROC",
        "fpr": [0, 0.05, 0.2, 1],
        "tpr": [0, 0.5, 0.9, 1]
      }
    }

`test/fixtures/multi_curve.csv`:

    curve_id,fpr,tpr,threshold,lower_0.95,upper_0.95
    modelA,0,0,1,,
    modelA,0.1,0.4,0.8,0.35,0.45
    modelA,0.3,0.8,0.6,0.70,0.85
    modelA,1,1,0,,
    modelB,0,0,1,,
    modelB,0.05,0.5,0.9,,
    modelB,0.2,0.9,0.7,,
    modelB,1,1,0,,


5.3 Jasmine Specs (test/specs/roc_utils_spec.js)

    function loadFixture(path) {
      var xhr = new XMLHttpRequest();
      xhr.open("GET", "../test/fixtures/" + path, false);
      xhr.send(null);
      return xhr.responseText;
    }

    // JSON canonicalization
    describe("ROC_utils – JSON Canonicalization", () => {
      it("parses multi-curve JSON and preserves all curves", () => {
        const input = loadFixture("multi_curve.json");
        const curves = ROCUtils.parseRocJsonText(input);
        expect(Object.keys(curves).length).toBe(2);
        expect(curves.modelA.fpr.length).toBe(4);
      });

      it("round-trips JSON → canonical → JSON", () => {
        const input = loadFixture("multi_curve.json");
        const parsed = ROCUtils.parseRocJsonText(input);
        const out = JSON.stringify(parsed);
        const reparsed = JSON.parse(out);
        expect(JSON.stringify(reparsed)).toBe(JSON.stringify(parsed));
      });
    });

    // CSV round trips
    describe("ROC_utils – CSV Round Trips", () => {
      it("parses multi-curve CSV", () => {
        const csv = loadFixture("multi_curve.csv");
        const curves = ROCUtils.parseRocCsvText(csv);
        expect(Object.keys(curves).length).toBe(2);
        expect(curves.modelB.fpr.length).toBe(4);
      });

      it("round-trips CSV → canonical → CSV", () => {
        const csv = loadFixture("multi_curve.csv");
        const parsed = ROCUtils.parseRocCsvText(csv);
        const out = ROCUtils.rocToCsv(parsed);
        const reparsed = ROCUtils.parseRocCsvText(out);
        expect(JSON.stringify(reparsed)).toBe(JSON.stringify(parsed));
      });
    });

    // Inter-format round trip
    describe("ROC_utils – JSON ↔ CSV", () => {
      it("supports JSON → CSV → JSON multi-curve round trip", () => {
        const input = loadFixture("multi_curve.json");
        const curves1 = ROCUtils.parseRocJsonText(input);
        const csv = ROCUtils.rocToCsv(curves1);
        const curves2 = ROCUtils.parseRocCsvText(csv);
        expect(JSON.stringify(curves2)).toBe(JSON.stringify(curves1));
      });
    });

    // Math tests
    describe("ROC_utils – Math", () => {
      it("computes empirical ROC for simple data", () => {
        const pts = [
          { score: 0.9, label: 1 },
          { score: 0.8, label: 1 },
          { score: 0.7, label: 0 },
          { score: 0.2, label: 0 }
        ];
        const roc = ROCUtils.computeEmpiricalRoc(pts);
        expect(roc.length).toBeGreaterThan(2);
        expect(roc[roc.length - 1].tpr).toBe(1);
      });

      it("computes AUC = 0.5 for diagonal ROC", () => {
        const roc = [
          { fpr: 0, tpr: 0 },
          { fpr: 1, tpr: 1 }
        ];
        const auc = ROCUtils.computeAuc(roc);
        expect(auc).toBeCloseTo(0.5, 5);
      });
    });

    // ensureMonotoneRoc tests
    describe("ROC_utils – ensureMonotoneRoc", () => {
      it("sorts by FPR and removes invalid points", () => {
        const pts = [
          { fpr: 0.3, tpr: 0.7 },
          { fpr: NaN, tpr: 0.8 },
          { fpr: 0.1, tpr: 0.4 }
        ];
        const out = ROCUtils.ensureMonotoneRoc(pts);
        expect(out.length).toBe(2);
        expect(out[0].fpr).toBe(0.1);
        expect(out[1].fpr).toBe(0.3);
      });

      it("consolidates duplicate FPR values with max TPR", () => {
        const pts = [
          { fpr: 0.2, tpr: 0.6 },
          { fpr: 0.2, tpr: 0.8 },
          { fpr: 0.2, tpr: 0.7 }
        ];
        const out = ROCUtils.ensureMonotoneRoc(pts);
        expect(out.length).toBe(1);
        expect(out[0].tpr).toBe(0.8);
      });

      it("enforces non-decreasing TPR", () => {
        const pts = [
          { fpr: 0, tpr: 0 },
          { fpr: 0.5, tpr: 0.8 },
          { fpr: 1, tpr: 0.6 }
        ];
        const out = ROCUtils.ensureMonotoneRoc(pts);
        expect(out[2].tpr).toBe(0.8);
      });
    });

    // Error handling
    describe("ROC_utils – Error Handling", () => {
      it("rejects malformed JSON", () => {
        expect(() => ROCUtils.parseRocJsonText("not valid json")).toThrow();
      });

      it("rejects CSV missing fpr/tpr", () => {
        const badCsv = "curve_id,fpr\nA,0";
        expect(() => ROCUtils.parseRocCsvText(badCsv)).toThrow();
      });
    });

-------------------------------------------------------------------------------

6. VERSIONED IMPLEMENTATION PLAN AND CODEX PROMPTS

Each subsection describes a minor version that can be implemented in **one** Codex session.

For each version, you get **one complete Codex prompt**. Copy it from here into VS Code and send it to Codex.

Codex will:

- Open and read `ROC_Utils_implementation_plan.md`.
- Focus on the section for that version.
- Modify only the specified files.


6.1 ROC_utils v0.1 — Canonical JSON Implementation

Goal:

- Create `ROC_utils.js` if it does not exist.
- Implement JSON canonicalization utilities.
- Integrate JSON ROC import in `ROC_utility.html` using ROC_utils.

Files to modify:

- `ROC_utils.js`
- `ROC_utility.html`

Codex Prompt for v0.1 (copy this entire block into VS Code):

    You are Codex, OpenAI's coding agent running inside VS Code.

    Task: Implement "ROC_utils v0.1 — Canonical JSON Implementation" as specified in the file:
        ROC_Utils_implementation_plan.md
    in the current workspace directory.

    1. Open and fully read ROC_Utils_implementation_plan.md.
       Pay special attention to:
       - Section 2: Canonical ROC JSON Specification
       - Section 4: ROC_utils.js API Specification
       - Section 5: Test harness
       - Section 6.1: This version description

    2. Modify ONLY the following files:
       - ROC_utils.js
       - ROC_utility.html

    3. In ROC_utils.js, create window.ROCUtils if it does not exist and implement at least:
       - ROCUtils.parseRocJsonText(text)
       - ROCUtils.normalizeRocJson(raw)
       - ROCUtils.toCanonicalRocObject(obj)

       Behavior:
       - Implement the canonicalization rules in section 2.
       - Accept flexible raw JSON shapes (single object, array, map, { curves: [...] }).
       - Always return a canonical map { id -> canonicalCurveObject }.
       - Validate required fields; throw an Error with a clear message on invalid input.

    4. In ROC_utility.html:
       - Add a <script src="ROC_utils.js"></script> tag before any script that needs ROC utilities.
       - Replace any existing JSON ROC parsing logic with ROCUtils.parseRocJsonText(text).
       - Ensure ROC curves are stored internally in canonical form (map { id -> curve }).
       - Do NOT change UI layout or controls.

    5. Keep changes minimal and surgical:
       - Do NOT refactor unrelated code.
       - Do NOT modify any files other than ROC_utils.js and ROC_utility.html.

    When you are finished, summarize the changes you made and stop.


6.2 ROC_utils v0.2 — CSV Parser and Exporter

Goal:

- Implement CSV import/export in ROC_utils.js.
- Wire CSV handling into both apps.

Files to modify:

- `ROC_utils.js`
- `continuous_ROC.html`
- `ROC_utility.html`

Codex Prompt for v0.2:

    You are Codex, OpenAI's coding agent running inside VS Code.

    Task: Implement "ROC_utils v0.2 — CSV Parser and Exporter" as specified in the file:
        ROC_Utils_implementation_plan.md
    in the current workspace directory.

    1. Open and fully read ROC_Utils_implementation_plan.md.
       Focus on sections:
       - 3: Canonical CSV Specification
       - 4: ROC_utils.js API Specification
       - 5: Test harness
       - 6.2: This version description

    2. Modify ONLY the following files:
       - ROC_utils.js
       - continuous_ROC.html
       - ROC_utility.html

    3. In ROC_utils.js, implement:
       - ROCUtils.parseRocCsvText(text): parse canonical CSV into a canonical map { id -> curve }.
       - ROCUtils.rocToCsv(curves, options): export a canonical map to CSV text per section 3.

    4. In ROC_utility.html:
       - For ROC file import, first attempt ROCUtils.parseRocJsonText.
       - If JSON parsing fails, fall back to ROCUtils.parseRocCsvText.
       - Ensure imported curves are stored in canonical form.

    5. In continuous_ROC.html:
       - Update any ROC CSV export logic to use ROCUtils.rocToCsv instead of inlined CSV building.
       - If JSON export already exists, prefer ROCUtils.toRocJsonBlob for JSON downloads.
       - Do NOT change UI layout or controls.

    6. Keep changes minimal and localized.
       - Do NOT refactor unrelated code.
       - Do NOT modify any files other than those listed above.

    When you are finished, summarize the changes and stop.


## 6.2.1 ROC_utils v0.2 — JSON and CSV Exporter

### Goal
Add canonical **JSON and CSV export** capability to `continuous_ROC.html` using the shared `ROC_utils.js` library.

Export behavior must follow deterministic selection rules:
- **If an empirical ROC curve is present, export the empirical curve.**
- **If no empirical curve is present, export the continuous ROC curve.**
- If the user wishes to export the continuous curve while an empirical one exists, they must first remove the empirical curve.

Exports must allow the user to **name the exported curve**, and that name must be used as the `curve_id` for JSON and the `curve_id` column for CSV.

---

### Files to Modify
- `continuous_ROC.html`

*No other files may be modified.*

---

### Export Curve Selection Rules

When exporting a ROC curve:

1. **If an empirical ROC curve exists, export the empirical curve.**
   - The theoretical curve is still visible, but the empirical one is considered the user's active, data-driven curve.

2. **If no empirical ROC curve exists, export the continuous curve.**

3. If the user wants the theoretical curve exported while both are visible, they must remove the empirical curve.

This guarantees clarity, reproducibility, and predictable behavior.

---

### User Naming Requirement
For both JSON and CSV export:

- A text input, modal prompt, or similar UI element must allow the user to specify a **curve name**.
- Default name should be: `"exported_curve"`.
- The name is used as:
  - The key in the canonical JSON structure:
    - `{ "curve_name": canonicalCurve }`
  - The `curve_id` field for every row in the CSV export.
- The export filename should be:
  - `curve_name + ".json"` for JSON
  - `curve_name + ".csv"` for CSV

---

### Button Requirements
Add two new export controls:

- **Export ROC (JSON)**
- **Export ROC (CSV)**

Both must appear near the existing controls without altering layout.

---

### Functional Requirements — JSON Export
When the user clicks **Export ROC (JSON)**:

1. Determine which curve to export using the Export Curve Selection Rules.
2. Convert the selected curve into canonical form using:

```
ROCUtils.toCanonicalRocObject(...)
```

3. Wrap it in a map with the user-specified curve name:

```
{ "<curve_name>": canonicalCurve }
```

4. Trigger JSON download using:

```
ROCUtils.toRocJsonBlob(canonicalMap, "<curve_name>.json")
```

5. No other computations or UI changes are allowed.

---

### Functional Requirements — CSV Export
When the user clicks **Export ROC (CSV)**:

1. Determine which curve to export (same rules as JSON).
2. Convert the selected curve into canonical form.
3. Use `ROCUtils.rocToCsv(...)` to generate CSV text in canonical long format.
4. Set the `curve_id` column for all rows to the user-provided name.
5. Trigger CSV download using a Blob and temporary `<a>` element.
6. Do not alter plot behavior or other UI elements.

---

### Codex Prompt for 6.2.1 (Paste into VS Code)

```
You are Codex, OpenAI's coding agent running inside VS Code.

Task: Implement "6.2.1 ROC_utils v0.2 — JSON and CSV Exporter" as specified in:
    ROC_Utils_implementation_plan.md
in the current workspace directory.

1. Open and fully read ROC_Utils_implementation_plan.md.
   Focus on:
   - Section 2: Canonical ROC JSON Specification
   - Section 3: Canonical ROC CSV Specification
   - Section 4: ROC_utils.js API
   - Section 6.2.1: This version description

2. Modify ONLY the following file:
   - continuous_ROC.html

3. Add TWO UI buttons near existing controls:
   - "Export ROC (JSON)"
   - "Export ROC (CSV)"
   Also add a small text field or popup prompt allowing the user to enter
   a curve name (default: "exported_curve").

4. When exporting (JSON or CSV):
   - If an empirical ROC curve exists, export the empirical curve.
   - Otherwise export the continuous ROC curve.
   - Convert the selected curve to canonical form using:
         ROCUtils.toCanonicalRocObject(...)

5. JSON Export Behavior:
   - Wrap the canonical curve in a map: { "<curve_name>": canonicalCurve }
   - Download using ROCUtils.toRocJsonBlob(..., "<curve_name>.json").

6. CSV Export Behavior:
   - Use ROCUtils.rocToCsv(canonicalMap) to generate CSV text.
   - Set the "curve_id" column for all rows to the user-provided name.
   - Trigger a CSV download named "<curve_name>.csv" using a Blob.

7. Do NOT modify any other files.
8. Do NOT alter UI layout except adding the two buttons and naming control.
9. Do NOT refactor or reorganize any existing logic.

When finished, summarize the changes you made and stop.
```


6.3 ROC_utils v0.3 — Shared ROC Math

Goal:

- Move ROC math utilities into ROC_utils.js.
- Have the Continuous ROC Explorer use them.

Files to modify:

- `ROC_utils.js`
- `continuous_ROC.html`

Codex Prompt for v0.3:

    You are Codex, OpenAI's coding agent running inside VS Code.

    Task: Implement "ROC_utils v0.3 — Shared ROC Math" as specified in the file:
        ROC_Utils_implementation_plan.md
    in the current workspace directory.

    1. Open and fully read ROC_Utils_implementation_plan.md.
       Focus on sections:
       - 2: JSON spec
       - 4: ROC_utils.js API Specification
       - 5: Test harness
       - 6.3: This version description

    2. Modify ONLY the following files:
       - ROC_utils.js
       - continuous_ROC.html

    3. In ROC_utils.js, implement math utilities:
       - ROCUtils.computeEmpiricalRoc(points): from an array of { score, label }, compute ROC points.
       - ROCUtils.ensureMonotoneRoc(rocPoints): use the reference implementation in section 4.1.
       - ROCUtils.computeAuc(rocPoints): compute AUC for a list of ROC points.

    4. In continuous_ROC.html:
       - Replace any inlined ROC computation code with calls to these ROCUtils functions.
       - Ensure existing behavior (ROC plotting, AUC display) remains functionally unchanged.
       - Do NOT change the UI layout.

    5. Keep changes minimal and focused on delegating math to ROC_utils.js.

    When finished, summarize the changes and stop.


6.4 Continuous ROC Explorer v1.1 — JSON Export

Goal:

- Add canonical JSON export for the current ROC curve in the Continuous ROC Explorer.

Files to modify:

- `continuous_ROC.html`

Codex Prompt for v1.1 (Continuous ROC Explorer):

    You are Codex, OpenAI's coding agent running inside VS Code.

    Task: Implement "Continuous ROC Explorer v1.1 — JSON Export" as specified in the file:
        ROC_Utils_implementation_plan.md
    in the current workspace directory.

    1. Open and fully read ROC_Utils_implementation_plan.md.
       Focus on sections:
       - 2: Canonical ROC JSON Specification
       - 4: ROC_utils.js API
       - 6.4: This version description

    2. Modify ONLY the following file:
       - continuous_ROC.html

    3. Add a UI control (button or menu item) labeled "Export ROC (JSON)".

    4. When the user activates this control:
       - Take the currently computed ROC curve (including fpr, tpr, thresholds if available).
       - Build a canonical curve object using ROCUtils.toCanonicalRocObject.
       - Wrap it in a map { <sensible_id> : curve }.
       - Use ROCUtils.toRocJsonBlob(...) to trigger download of a JSON file.

    5. Do NOT change existing controls or layout beyond adding this export control.

    When finished, summarize the changes and stop.


## 6.5 ROC Utility App v1.2 — Remove ROC Export Functionality

### Goal
The ROC Utility App (`ROC_utility.html`) is intended solely as a **consumer** of ROC curves generated elsewhere. It provides visualization of ROC curves, utility-based evaluation, and threshold-based decision support. It is **not** designed to generate ROC curves.

Historically, the ROC Utility App included a temporary "Export ROC" feature to assist with debugging. This feature must now be **removed** to avoid confusion and to reinforce the correct separation of responsibilities:

- **Continuous ROC Explorer** → generates theoretical and empirical ROC curves, allows dataset export, provides ROC export.
- **ROC Utility App** → imports and visualizes ROC curves, but does *not* generate or export them.

The shared library `ROC_utils.js` will continue to include JSON/CSV import and export helpers for ROC curves, since these functions may be used by future apps or tools, but they are no longer invoked by the ROC Utility App.

---

### Required Changes
Modify `ROC_utility.html` to:

1. **Remove all UI controls** for exporting ROC curves (JSON or CSV).
2. **Remove all event handlers, functions, or references** associated with ROC export.
3. Ensure that no residual logic attempts to call:
   - `ROCUtils.toRocJsonBlob(...)`
   - `ROCUtils.rocToCsv(...)`
4. The app must retain its ability to **import ROC curves** and visualize them.
5. No changes should be made to computation logic, plotting logic, or import logic.
6. Do **not** modify any other files.

---

### Behavioral Result
After implementing this revision:

- The ROC Utility App will **only** support ROC import, not export.
- The UI will have no options suggesting that ROC curves originate from this app.
- Shared library functions for ROC I/O remain available for other components in the project but are unused here.
- This reinforces the architectural distinction:
  - **Generator**: Continuous ROC Explorer
  - **Consumer**: ROC Utility App

---

### Codex Prompt for 6.5 (Paste into VS Code)

```
You are Codex, OpenAI's coding agent running inside VS Code.

Task: Implement "6.5 ROC Utility App v1.2 — Remove ROC Export Functionality" as specified in:
    ROC_Utils_implementation_plan.md
in the current workspace.

1. Open and fully read ROC_Utils_implementation_plan.md.
   Focus on Section 6.5 describing the removal of ROC export from the
   ROC Utility App.

2. Modify ONLY the following file:
   - ROC_utility.html

3. Remove ALL of the following from ROC_utility.html:
   - Buttons or UI elements offering ROC export (JSON or CSV)
   - Any JavaScript event handlers associated with such buttons
   - Any code referencing ROCUtils.toRocJsonBlob(...)
   - Any code referencing ROCUtils.rocToCsv(...)

4. Ensure that ROC import functionality remains fully intact.
5. Ensure that plotting and utility computations remain unchanged.
6. Do NOT modify any other files.
7. Do NOT refactor unrelated code.

When finished, summarize the changes you made and stop.
```


\#\# 6.6 ROC Utility App v1.3 — JSON Import Refinement and UI Cleanup

### Goal
Now that the ROC Utility App is strictly a **consumer** of ROC curves (see Section 6.5), this version refines its JSON import workflow and removes all residual elements suggesting that the app generates or exports ROC curves. The goal is improved clarity, robustness, and alignment with the canonical ROC JSON format.

This update does **not** add new features; it strengthens consistency and eliminates lingering UI/logic from previous debugging-oriented versions.

---

### Required Behavior

1. **Canonical JSON Input Only**  
   The ROC Utility App must accept ROC curves *only* in the canonical JSON format:

```
{ curve_id → canonicalCurveObject }
```

It may load:
- A single-curve JSON file
- A multi-curve JSON file

---

2. **Multi-Curve Selection**  
   If the JSON file contains multiple curves, the app must:
   - Display a dropdown listing all `curve_id` values
   - Allow the user to select one curve
   - Display **only** the selected curve on the plot

Imported curves must **never** affect internal distribution assumptions or empirical data.

---

3. **Display-Only Semantics**  
Imported ROC curves are:
- Visual overlays
- Inputs to utility/threshold analysis
- Independent of any dataset

They do **not**:
- Regenerate theoretical curves
- Generate or modify datasets
- Trigger resampling
- Modify distribution parameters

---

4. **UI Cleanup**  
The ROC Utility App must have **no remaining UI elements** that imply ROC generation or export.

Remove:
- Any ROC export buttons (JSON or CSV)
- Any dataset-related UI elements
- Any leftover debugging controls from earlier versions

The import UI should be prominent and self-contained.

---

5. **Internal Code Requirements**
- Use `ROCUtils.parseRocJsonText()` to parse imported text
- Use `ROCUtils.normalizeRocJson()` to canonicalize
- Validate canonical structure rigorously
- Reject malformed JSON with a clear message:

```
The selected file is not a valid canonical ROC JSON file.
```

- The plotting and utility computation logic must remain unchanged
- No other files may be modified

---

### Behavioral Result
After implementing Section 6.6:
- ROC Utility App functions purely as a ROC **viewer/analysis** tool
- Only ROC JSON files may be loaded
- Multi-curve files are handled cleanly and predictably
- No export or generation controls remain
- Shared library retains I/O capabilities for use by other apps, even though this app does not export ROC curves

---

### Codex Prompt for 6.6 (Paste into VS Code)

```
You are Codex, OpenAI's coding agent running inside VS Code.

Task: Implement “6.6 ROC Utility App v1.3 — JSON Import Refinement and UI Cleanup”
as described in ROC_Utils_implementation_plan.md.

1. Read Section 6.6 carefully.

2. Modify ONLY the following file:
   - ROC_utility.html

3. Refine JSON import behavior:
   - Ensure ROCUtils.parseRocJsonText(...) and ROCUtils.normalizeRocJson(...)
     are used consistently for all imported files.
   - If the JSON file contains multiple curves, generate a dropdown listing
     all curve IDs, and display only the curve selected by the user.

4. Remove ALL remaining ROC export elements:
   - Buttons or UI for JSON/CSV export
   - Any event handlers connected to export actions
   - Any references to ROCUtils.toRocJsonBlob(...) or ROCUtils.rocToCsv(...)

5. Ensure the UI has NO dataset-related controls.

6. Add clear error handling:
   - If the file is not valid canonical ROC JSON, display:
       "The selected file is not a valid canonical ROC JSON file."

7. Do NOT modify any other files.
8. Do NOT refactor or reorganize unrelated code.

When finished, summarize the changes you made and stop.
```




## 7.0 UI Redesign for Dataset vs ROC Curve I/O

### Purpose
The current layout of import/export controls in `continuous_ROC.html` mixes **dataset I/O** (row-level data) with **ROC curve I/O** (summary-level data), causing confusion. This redesign separates these two conceptual workflows into distinct UI panels and clarifies the use of JSON vs CSV formats.

### Principles
1. **Dataset CSV ≠ ROC CSV**: Dataset CSV files contain raw observations (score, label); ROC CSV files contain curve summaries.
2. **Canonical ROC format is JSON**: JSON is the preferred, shared format between apps.
3. **ROC CSV export is optional/advanced**: Provided only for human-readable inspection, not for cross-app exchange.
4. **Strict separation of controls**: Dataset operations and ROC curve operations must reside in separate visual sections.

---

### Required Layout Changes

#### Panel A: "Simulated Dataset" (Dataset I/O)
This panel contains **only** row-level dataset controls.

Required elements:
- Sample size input
- Resample button
- "Export dataset (CSV)" button
- Checkboxes:
  - "Show sampled data on plot"
  - "Auto-resample on parameter change"
- Dataset import (CSV) controls currently under "Data Import"
  - File picker for CSV containing `score`, `label` columns
  - Histogram display options
  - "Show empirical ROC" stays here **only if it reflects empirical data imported from CSV**

**Prohibited elements in this panel:**
- Curve name
- Export ROC (JSON)
- Export ROC (CSV)
- Any continuous ROC controls

---

#### Panel B: "ROC Curves" (ROC Curve I/O)
A new panel containing **only** curve-level operations.

Required elements:
- Curve name input (default: `exported_curve`)
- "Export ROC (JSON)" button (preferred format)
- Optional advanced export:
  - "Export ROC (CSV – human readable)" button 
    - Must be hideable via configuration flag: `showAdvancedRocCsvExport`

**Behavioral rules:**
- Exported curve selection:
  - If an empirical ROC curve exists → export empirical curve.
  - Otherwise → export continuous ROC curve.
  - If the user wants the continuous curve exported when empirical is present, they must remove the empirical sample.
- JSON export uses canonical structure: `{ curve_name: canonicalCurve }`.
- CSV export uses canonical long-format CSV.

---

### Configuration Flag for Advanced ROC CSV Export
Add a global boolean option:

```
window.ROC_EXPLORER_CONFIG = {
    showAdvancedRocCsvExport: false
};
```

When `false`:
- Hide the "Export ROC (CSV – human readable)" button.

When `true`:
- Show the button normally.

Apps must check this flag at startup.

---

### Codex Prompt for Implementing UI Redesign

```
You are Codex, OpenAI's coding agent running inside VS Code.

Task: Implement the UI redesign described in Section 7.0 of:
    ROC_Utils_implementation_plan.md
in the current workspace.

1. Open and fully read ROC_Utils_implementation_plan.md.
   Focus on Section 7.0: UI Redesign for Dataset vs ROC Curve I/O.

2. Modify ONLY the file:
   - continuous_ROC.html

3. Create TWO visually distinct UI panels:
   A. "Simulated Dataset" panel — for dataset CSV import/export
   B. "ROC Curves" panel — for ROC curve JSON/CSV export

4. Move all dataset-related controls (sample size, resampling,
   dataset CSV export, dataset CSV import, histogram options) into
   the "Simulated Dataset" panel.

5. Move all ROC curve-related controls (curve name,
   Export ROC JSON, Export ROC CSV) into a new
   "ROC Curves" panel.

6. Implement the configuration flag:
       window.ROC_EXPLORER_CONFIG.showAdvancedRocCsvExport
   - If false, hide the "Export ROC (CSV – human readable)" button.

7. Do NOT change plotting logic or computation logic.
8. Do NOT modify any other files.
9. Keep layout changes minimal and avoid refactoring unrelated structures.

When finished, summarize the changes you made and stop.
```




## 7.1 UI Refinement for Empirical vs Simulated Dataset Workflows

### Purpose
Section 7.1 defines the required restructuring of the dataset-related UI in `continuous_ROC.html` to fully separate **empirical data** from **simulated data**, improve conceptual clarity, and correct the ordering of dataset-generation actions. The goal is to present users with two clean workflows:

1. **Empirical Data (Imported from CSV)** — user-provided score/label pairs
2. **Simulated Dataset** — samples drawn from theoretical distributions

The redesign removes confusing or redundant controls and ensures that the UI reflects the data flow correctly.

---

### Required UI Changes

#### 1. Create a clearly separated panel: "Empirical Data (Imported)"
This panel appears **above** the simulated dataset panel.

It must include:
- A section header: `Empirical Data (Imported)`
- File picker for score/label CSV:
  - Text: `Load empirical data (scores + labels):`
  - `[ Choose File ]` button
  - Drop zone area (same behavior as before)
  - Required columns reminder: `score, label`
- Checkboxes:
  - `[ ] Show empirical histograms`
  - `[ ] Show empirical ROC`
- A legend for histogram colors:
  - `● Positive histogram`
  - `● Negative histogram`
  - `● Empirical ROC`
- Status line for data import:
  - Example: `No empirical data loaded.`

**Removed from this panel:**
- `Normalize scores to [0,1]` (remove from the app entirely)
- Any simulated dataset controls


#### 2. Update the "Simulated Dataset" panel
The simulated dataset panel focuses solely on model-based sampling.

It must include:
- Header: `Simulated Dataset`
- `Sample size` input field
- **Replace the "Resample" button with:**
  - `[ New sample ]` (exact label)
- Place the new sample button **above** the export button
- `Export Dataset CSV` button
- Checkboxes:
  - `[ ] Show sampled data on plot`
  - `[ ] Auto-resample on parameter change`

**Removed from this panel:**
- Empirical data import UI
- Histogram legends (these must appear next to the plot, not the controls)


#### 3. Move the histogram legend to the plot area
The legend for positive/negative/empirical histograms must appear **directly beside or overlaid on the histogram visualization**, not inside the control panel.


#### 4. Remove the "Normalize scores to [0, 1]" control entirely
This feature is unnecessary and confusing for users. Delete the checkbox and any connected logic.


---

### Behavioral Rules
- Empirical data import and simulated dataset generation must be completely independent.
- Imported empirical data do **not** interact with sampling.
- Sampling logic does **not** interpret, modify, or depend on imported data.
- Export Dataset CSV operates **only** on sampled data.
- Histogram display logic must respond only to the appropriate dataset type (imported vs simulated).


---

### Codex Prompt for 7.1 (Paste into VS Code)

```
You are Codex, OpenAI's coding agent running inside VS Code.

Task: Implement "7.1 UI Refinement for Empirical vs Simulated Dataset Workflows" as specified in:
    ROC_Utils_implementation_plan.md
in the current workspace.

1. Open and fully read Section 7.1 in ROC_Utils_implementation_plan.md.

2. Modify ONLY the following file:
   - continuous_ROC.html

3. Create a new panel at the TOP of the dataset section titled
   "Empirical Data (Imported)", containing:
   - Header text as written
   - File picker and drop zone for CSV import
   - Reminder text about required columns
   - Checkboxes:
       * Show empirical histograms
       * Show empirical ROC
   - A legend for histogram colors
   - A status line: "No empirical data loaded." or equivalent

4. Update the existing "Simulated Dataset" panel:
   - Replace the "Resample" button with a button labeled "New sample"
   - Move "New sample" ABOVE the export button
   - Keep "Export Dataset CSV"
   - Keep the two checkboxes:
       * Show sampled data on plot
       * Auto-resample on parameter change
   - Remove ANY empirical data controls from this panel

5. Remove the checkbox "Normalize scores to [0,1]" ENTIRELY from the file.
   - Remove any JS logic connected to this feature.

6. Move the histogram legend OUT of the control panel and INTO the plot area.
   - Implement as a small legend near the rendered histogram(s).

7. Do NOT modify ANY other file.
8. Do NOT refactor or reorganize unrelated code.
9. Maintain all existing behavior not explicitly affected by this redesign.

When finished, summarize the changes you made and stop.
```


## 7.2 Unified Empirical Dataset Panel (Import + Simulation)

### Purpose
Section 7.2 introduces a unified model for empirical data in `continuous_ROC.html`.
Previously, empirical data existed in two disjoint pathways:
- Imported empirical datasets (from CSV files)
- Simulated datasets (from theoretical distributions)

However, both serve the same analytical role: they produce **empirical (stepwise) ROC curves** and **empirical histograms**.
This section unifies these two paths into a single coherent UI and data model called the **Empirical Dataset**.

This redesign simplifies controls, removes duplicated settings, and clarifies when dataset export is available.

---

### Unified Concept
The app always has **at most one active empirical dataset**.
It can originate in **two** ways:
1. **Imported** — loaded from a CSV containing `score,label` columns
2. **Simulated** — generated via sampling from the theoretical distributions

The UI and analysis do not distinguish them except in one respect:
- **Only simulated datasets may be exported.**

Every empirical dataset, regardless of origin, has:
- A **dataset name** (editable by the user)
- A list of scores
- A list of labels
- Derived counts (`n_pos`, `n_neg`)
- Empirical ROC
- Histogram options

---

### Required UI Structure
The new panel must consolidate all empirical-data-related controls.
It shall appear above the theoretical curve controls.

```
+--------------------------------------------------------------+
| Empirical Dataset                                            |
|--------------------------------------------------------------|
| Dataset name: [ dataset_name ]                               |
|                                                              |
| IMPORT DATA                                                  |
|   Load empirical data (scores + labels):                     |
|     [ Choose File ] (drop zone)                              |
|     Required columns: score, label                           |
|                                                              |
| OR                                                           |
|                                                              |
| SIMULATE DATA                                                |
|   Sample size: [ 200 ]                                       |
|   [ New sample ]                                             |
|                                                              |
| Current dataset:                                             |
|   Loaded/generated 200 samples (100 positive, 100 negative)  |
|                                                              |
| [ Export Dataset CSV ]   <-- only visible if dataset source = simulated
|                                                              |
| [ ] Show empirical histograms                                |
| [ ] Show empirical ROC                                       |
+--------------------------------------------------------------+
```

---

### Dataset Naming Rules
- A **dataset name field** must appear at the top of the panel.
- When a dataset is **imported**, default name = filename (without extension).
- When a dataset is **simulated**, default name = `simulated_dataset`.
- The user may edit the dataset name at any time.
- When exporting a simulated dataset, filename = `<dataset_name>.csv`.

---

### Export Rules
```
IF dataset_source == "simulated":
    show Export Dataset CSV
ELSE IF dataset_source == "imported":
    hide Export Dataset CSV
```

This ensures no meaningless exports of user-imported data.

---

### Display and Computing Rules
- Empirical histograms and empirical ROC toggles apply regardless of whether data came from import or sampling.
- Importing a dataset **replaces** the current empirical dataset.
- Sampling a new dataset **replaces** the current empirical dataset.
- Theoretical ROC curves remain separate and unaffected.

---

### Required Internal Data Structure
The empirical dataset must be stored in a single structure:

```
window.currentEmpiricalDataset = {
    source: "imported" | "simulated",
    name: "dataset_name",
    scores: [...],
    labels: [...],
    n_pos: <integer>,
    n_neg: <integer>
};
```

Other code (ROC computation, histogram plotting, export logic) must rely on this structure.

---

### Codex Prompt for 7.2 (Paste into VS Code)

```
You are Codex, OpenAI's coding agent running inside VS Code.

Task: Implement "7.2 Unified Empirical Dataset Panel" as specified in:
    ROC_Utils_implementation_plan.md
in the current workspace.

1. Read Section 7.2 thoroughly.

2. Modify ONLY the file:
   - continuous_ROC.html

3. Create a single consolidated panel titled "Empirical Dataset" containing:
   - A dataset name input field
   - Import UI (Choose File + drop zone + required columns note)
   - Simulation UI (sample size + "New sample" button)
   - Dataset status line
   - Export Dataset CSV button (shown ONLY when dataset source = simulated)
   - Checkboxes for:
       * Show empirical histograms
       * Show empirical ROC

4. Implement dataset naming rules:
   - Imported datasets default to filename without extension
   - Simulated datasets default to "simulated_dataset"
   - Filename for export = <dataset_name>.csv

5. Remove any old dataset panels or duplicated controls.

6. Hide/disable "Export Dataset CSV" when dataset source = imported.

7. Update JS logic so that importing or sampling replaces
   window.currentEmpiricalDataset with the unified structure.

8. Move histogram legend to the plotting area if not already implemented.

9. Do NOT modify any other files.
10. Do NOT refactor unrelated code or logic.

When finished, summarize the changes you made and stop.
```


## 7.3 Empirical Visualization Refinement (Updated)

### Purpose
Section 7.2 unified all empirical datasets—imported or simulated—into one coherent model. Section 7.3 refines the visualization behavior so that all empirical-data-related controls operate consistently, supporting side-by-side comparison of theoretical distributions and empirical data. This updated version incorporates the new requirement that **empirical data points (rug-plot style marks)** should be shown for **both imported and simulated datasets**.

---

### 7.3.1 Required Behavioral Changes

#### A. Remove Redundant Controls
The earlier UI control:

    [ ] Show sampled data on plot

must be removed. It reflected the pre-unified architecture and duplicates aspects of the empirical visualization system.

#### B. Add a General Control for Raw Empirical Data Points (Rug Plot Style)
Raw empirical data points (previously available only for simulated data) must now be available for **all empirical datasets**. These points function as a lightweight **rug plot**, marking the position of each observation along the score axis.

New control:

    [x] Show empirical data points

Behavior:
- Checkbox is visible whenever an empirical dataset exists (imported or simulated).
- When enabled, the app overlays raw score observations as small point markers or ticks.
- Positive and negative classes should use distinct colors consistent with other plot elements.
- This feature supports model-fitting exercises where students try to match theoretical distributions to empirical data.

#### C. Universal Empirical Visualization Toggles
The following options must always be available when an empirical dataset exists:

    [x] Show empirical histograms
    [x] Show empirical ROC
    [x] Show empirical data points

#### D. Histogram Legend Placement
- Histogram legends (positive vs. negative) must appear **inside the plot region**, not in the control panel.
- Legends should update dynamically to reflect dataset name changes.

---

### 7.3.2 UI Panel Structure
The Empirical Dataset panel now includes only:

    Dataset name: [ text box ]
    Sample size:  [ numeric input ]
    [ New sample ]

    --- import controls ---

    [x] Show empirical histograms
    [x] Show empirical data points   (rug plot)
    [x] Show empirical ROC

    <dataset status line>

    [ Export Dataset CSV ]   (simulated datasets only)

All other visualization-related controls must be removed.

---

### 7.3.3 Implementation Notes
1. Remove legacy flags such as show_sampled_data or show_sample_scatter.
2. Update all plotting logic to rely on:
   - window.currentEmpiricalDataset
   - the three visualization toggles described above.
3. Ensure importing or simulating a dataset triggers a full plot refresh.
4. Raw empirical data points should align with the score axis and visually resemble a rug plot.
5. Ensure both classes (positive/negative) are visually distinguishable.

---

### 7.3.4 Codex Prompt for Empirical Visualization Refinement
Paste the following into VS Code after loading the Global Rules and the plan:

```
You are Codex, OpenAI's coding agent running inside VS Code.

Task: Implement Section 7.3 (Updated Empirical Visualization Refinement) from
ROC_Utils_implementation_plan.md.

************** FILES TO MODIFY **************
- continuous_ROC.html
*********************************************

Requirements:

1. REMOVE the legacy control:
   "Show sampled data on plot"

2. ADD the new checkbox:
   "Show empirical data points"
   • Checkbox is visible whenever window.currentEmpiricalDataset exists.
   • Applicable to both imported and simulated datasets.
   • Toggles plotting of raw score points (rug-plot style).

3. RETAIN and support:
   • Show empirical histograms
   • Show empirical ROC

4. PLACE histogram legend inside the plot region.

5. UPDATE plotting behavior so all empirical visualization depends only on:
   • window.currentEmpiricalDataset
   • the three toggles above

6. Ensure importing or simulating datasets triggers full plot refresh.

7. Do NOT modify any other files.
8. Do NOT refactor unrelated code.

When finished, summarize the changes you made and stop.



## 8.0 ROC File Manager App (Standalone File Operations Tool)

### Purpose
The **ROC File Manager** is a standalone lightweight HTML/JS tool designed to handle all file-level operations involving ROC curves across the ROC ecosystem. Unlike the Continuous ROC Explorer (which generates curves) and the ROC Utility App (which consumes curves), this tool exists solely to manage ROC **files**:

- Import multiple ROC JSON files
- Canonicalize and validate them using `ROC_utils.js`
- Merge curves from different files
- Rename curve IDs
- Filter curves to include/exclude from export
- Export combined ROC JSON files
- Convert ROC JSON objects to CSV format for human inspection or teaching materials

Because its target audience is advanced users (instructors, researchers, or developers preparing materials), this app can allocate space to **explain the JSON and CSV formats**, their intended uses, and why JSON should usually be preferred for curve exchange.

This tool never displays theoretical curves, empirical datasets, sampling controls, or distribution-related elements. It operates only on **ROC curve files**, not on data.

---

### 8.0.1 Rationale for a Separate Application
As the ecosystem grows, multiple apps—both generators and consumers—will produce or require ROC curves. Embedding file-combination or CSV-conversion logic inside individual apps leads to:

- UI clutter
- Duplicated code
- Confusing user workflows
- Inconsistent results

A separate ROC File Manager solves these problems by:

- Centralizing all ROC file-level operations
- Keeping producer and consumer apps focused on their pedagogical or analytical roles
- Providing a reliable, consistent interface for preparing multi-curve files
- Allowing special-purpose features (JSON→CSV conversion) without cluttering teaching-oriented apps

---

### 8.0.2 Application Structure
The ROC File Manager consists of three main panels:

#### **Panel A. Load ROC Files**
```
[ Choose ROC JSON Files ]  (multi-select)

Loaded Files:
  - file1.json  (curves: modelA, modelB)
  - file2.json  (curves: roc1)
  - file3.json  (curves: A, B, C)

Notes:
  • Only JSON files allowed.
  • Files are parsed and canonicalized using ROC_utils.js.
  • Errors or malformed curves are reported clearly.
```

#### **Panel B. Manage Curves (Rename, Filter, Review)**
```
Curve List:

| Include? | Original Curve ID | New Curve ID (editable) |
|----------|-------------------|-------------------------|
|   [x]    | modelA            | modelA                  |
|   [x]    | modelB            | modelB_2                |
|   [ ]    | roc1              | roc1                    |
|   [x]    | A                 | conditionA              |
|   [x]    | B                 | conditionB              |

Curve ID prefix: [ combined_ ]

Renaming Rules:
  • New IDs must be valid JSON keys.
  • Duplicate IDs automatically receive suffixes (_2, _3, ...).
  • Optional prefix applied to all final IDs.
```

A small checkbox may optionally enable CSV conversion for each curve:
```
[ ] Also export selected curves as CSV (educational use only)
```

Because the File Manager is aimed at advanced users, CSV conversion does not need to be "advanced" or hidden; it is simply part of the natural capabilities of the app.

#### **Panel C. Export Combined ROC File**
```
Output Filename: [ combined_roc_curves.json ]

[ Export Combined ROC JSON ]

If CSV conversion enabled:
  • Additional CSV files generated with filenames matching curve IDs.
  • Panel explains that CSV is for human readability and teaching materials, while JSON is the canonical machine-readable exchange format.
```

---

### 8.0.3 Implementation Requirements
The ROC File Manager must:

1. Import multiple ROC JSON files simultaneously.
2. Use `ROCUtils.parseRocJsonText()` for parsing and canonicalization.
3. Combine all curves into one canonical map.
4. Detect duplicate curve IDs and resolve conflicts.
5. Support user-driven ID renaming.
6. Allow filtering curves via checkboxes.
7. Apply an optional prefix to all curve IDs.
8. Export the final combined file as canonical JSON.
9. Optional: Export CSV versions of selected curves.
10. Never generate theoretical or empirical ROC curves.
11. Never display or rely on sampling or distribution logic.
12. Display errors in a dedicated error panel.

This app must rely entirely on **ROC_utils.js** for parsing, validation, and JSON/CSV generation.

---

### 8.0.4 Codex Prompt for ROC File Manager (`roc_file_manager.html`)

Paste the following text into VS Code and run Codex:

```
You are Codex, OpenAI's coding agent running inside VS Code.

Task: Create a new file in the current workspace:
    roc_file_manager.html

This file implements the "ROC File Manager App" defined in Section 8.0
of ROC_Utils_implementation_plan.md.

************** FILES TO MODIFY **************
- Create: roc_file_manager.html
- Do NOT modify any other files.
- Do NOT modify continuous_ROC.html or ROC_utility.html.
- Do NOT modify ROC_utils.js except by adding <script> includes.
*********************************************

Implement this app as follows:

1. Include ROC_utils.js with:
   <script src="ROC_utils.js"></script>

2. Create a minimal, clean HTML page with three panels:

   PANEL A: "Load ROC Files"
     • <input type="file" multiple accept=".json"> for loading files
     • Show a list of files and curves loaded from each
     • Parse each file using ROCUtils.parseRocJsonText
     • Maintain an internal canonical map of curves

   PANEL B: "Manage Curves"
     • Table listing each curve
     • Checkbox for including/excluding each curve
     • Editable text input for renaming curve IDs
     • Input for optional curve ID prefix
     • Resolve duplicate IDs automatically

   PANEL C: "Export Combined ROC File"
     • Textbox for output filename
     • Button: "Export Combined ROC JSON"
     • Use ROCUtils.toRocJsonBlob to generate valid JSON
     • If CSV conversion toggle enabled, export corresponding CSV files
       using ROCUtils.rocToCsv()

3. Provide a sidebar area explaining:
   • JSON format (canonical multi-curve format)
   • CSV format (human-readable)
   • Recommended use cases for each

4. Error handling:
   • Display parse/validation errors in an error div
   • Ensure the UI updates cleanly when files are added or removed

5. Keep layout simple and readable. No external libraries required.

6. Do NOT implement any curve visualization.
7. Do NOT refactor or modify any other parts of the project.

When finished, summarize the changes you made and stop.
```

---

### End of Section 8.0 ROC File Manager App

## 8.1 ROC File Validation (Updated)

### Purpose
This updated version of Section 8.1 provides a **complete, stand-alone Codex prompt**, without referencing earlier sections. The ROC File Manager now includes a full file validation workflow powered by library functions in `ROC_utils.js`.

The goals are:
- Validate ROC curves on import
- Report warnings and errors clearly to the user
- Prevent invalid curves from being combined or exported
- Keep all validation logic inside `ROC_utils.js`
- Keep all UI work inside `roc_file_manager.html`

This section is now fully self-contained and ready to paste into the implementation plan.

---

## 8.1.1 Validation Responsibilities in `ROC_utils.js`
`ROC_utils.js` must include robust, structured validation logic.

### A. New Function: `ROCUtils.validateRocCurve(curve, curveId)`
Returns a report object:
```
{
  ok: boolean,
  fatal: boolean,
  fixed: boolean,
  warnings: [],
  errors: [],
  curveId: string
}
```

### B. Fatal Errors (import must fail)
- FPR not non-decreasing
- TPR not non-decreasing
- Arrays differ in length
- Non-numeric values
- Missing required fields from the ROC JSON schema

### C. Non-Fatal Issues (may auto-fix, but warn)
- Missing (0,0) point → insert with warning
- Missing (1,1) point → append with warning
- Duplicate adjacent points → remove with warning
- Very small floating-point reversals → correct with warning

All fixes must:
- Be recorded in `warnings[]`
- Never occur silently

### D. New Function: `ROCUtils.validateRocMap(map)`
Validates all curves in the canonical ROC map.
Returns:
```
{
  ok: boolean,
  fatal: boolean,
  reports: { curveId: validationReport }
}
```

---

## 8.1.2 UI Behavior in `roc_file_manager.html`
After files are loaded in Panel A:

1. JSON is parsed into canonical form.
2. Call:
```
ROCUtils.validateRocMap(canonicalMap)
```
3. Add a visible panel titled **"Validation Results"**.
4. Display warnings and errors for each file + curve.
5. Curves with **fatal errors** must NOT appear in the curve-management table.
6. Curves with warnings (but no fatal errors) may appear but must be highlighted visually.
7. The UI must prevent users from proceeding with invalid data.

### Example Validation Display
```
Validation Results:
  file1.json:
    modelA: ✓ Valid
    modelB: ! Warning — missing (0,0) point inserted

  file2.json:
    roc1: ✗ Error — tpr decreases at index 14 (0.82 → 0.79)
          Import aborted for this curve
```

---

## 8.1.3 Export Blocking Rules
Export buttons in Panel C must remain **disabled** until:
- All curves have `ok = true`
- No curve has `fatal = true`

Curves with warnings may be exported.

---

## 8.1.4 Complete Stand-Alone Codex Prompt
Paste this into VS Code to fully implement the validation feature.

```
You are Codex, OpenAI's coding agent running inside VS Code.

Task: Implement full ROC file validation as defined in Section 8.1
(ROC_Utils_implementation_plan.md).

************** FILES TO MODIFY **************
- ROC_utils.js
- roc_file_manager.html

************** FILES NOT TO MODIFY **************
- continuous_ROC.html
- ROC_utility.html
- Any other files in the workspace

*********************************************

Implement the following features:

============================================================
1. VALIDATION LOGIC IN ROC_utils.js
============================================================

Create two new exported functions:

1. ROCUtils.validateRocCurve(curve, curveId)
   • Return a structured report object:
       {
         ok: boolean,
         fatal: boolean,
         fixed: boolean,
         warnings: [],
         errors: [],
         curveId: string
       }

   • Fatal errors:
       - Non-monotonic fpr
       - Non-monotonic tpr
       - Array length mismatch
       - Non-numeric values
       - Missing required fields

   • Non-fatal issues (auto-fix allowed, warning required):
       - Insert missing (0,0)
       - Append missing (1,1)
       - Remove duplicate points
       - Correct tiny floating-point reversals

2. ROCUtils.validateRocMap(map)
   • Validate all curves
   • Return the full report structure

============================================================
2. VALIDATION UI IN roc_file_manager.html
============================================================

Add a new panel titled "Validation Results". After parsing ROC JSON files:
   • Call ROCUtils.validateRocMap(canonicalMap)
   • Display grouped warnings and errors
   • Exclude curves with fatal errors from the curve-management table
   • Highlight curves with warnings

Use output formatting similar to:

Validation Results:
  file1.json:
    modelA: ✓ valid
    modelB: ! Warning — missing (0,0) point inserted

  file2.json:
    roc1: ✗ Error — tpr decreases at index 14 (0.82 → 0.79)
          Curve rejected

============================================================
3. EXPORT BLOCKING
============================================================

Disable export buttons unless ALL remaining curves:
   • Have ok = true
   • Have fatal = false

Warnings do not block export.

============================================================
4. CONSTRAINTS
============================================================

1. Do NOT modify continuous_ROC.html or ROC_utility.html.
2. Do NOT refactor unrelated code.
3. Do NOT create new filenames.
4. Filenames are case-sensitive.
5. All code must be complete — no placeholders.
6. Follow Section 8.1 exactly.

============================================================
When finished, summarize the changes you made and stop.
============================================================
```



```markdown
# Codex Patch Instructions

You are modifying three files in the same folder:

- **ROC_utils.js**
- **ROC_utility.html**
- **roc_file_manager.html**

Your task is to unify ROC JSON parsing across the system by moving
`parseRocDataFromText` into `ROC_utils.js` and updating both apps to use
the new centralized function.

Do NOT change any other app behavior.
Do NOT modify UI, plotting, metadata formats, selection behavior, or naming rules.
Only fix parsing architecture.

---

# 1. Update ROC_utils.js

### A. Add this new function at the bottom of ROC_utils.js:

```js
ROCUtils.parseRocDataFromText = function(text, sourceName){
  // Derive default curve name from file name if possible
  const trimmed = sourceName ? String(sourceName).split(/[\\/]/).pop() : null;
  const base = trimmed ? trimmed.replace(/\.[^.]+$/, '') : null;
  const options = base ? { defaultCurveName: base } : {};

  let raw;
  try {
    raw = JSON.parse(text);
  } catch (err) {
    throw new Error("Invalid JSON");
  }

  const canonical = ROCUtils.normalizeRocJson(raw, options);
  return { data: canonical, sourceType: 'json' };
};
```

### B. Ensure no naming conflicts.
Do not remove any existing functions.

---

# 2. Modify ROC_utility.html

Search for its local implementation of `parseRocDataFromText`.
It currently looks like this:

```js
function parseRocDataFromText(text, sourceName){
  const defaultCurveName = deriveCurveNameFromSource(sourceName);
  const rocJsonOptions = defaultCurveName ? {defaultCurveName} : undefined;
  const parsed = ROCUtils.parseRocJsonText(text, rocJsonOptions);
  return {data: parsed, sourceType: 'json'};
}
```

### Replace the entire function with:

```js
function parseRocDataFromText(text, sourceName){
  return ROCUtils.parseRocDataFromText(text, sourceName);
}
```

Do NOT leave any old parsing logic behind.

---

# 3. Modify roc_file_manager.html

`roc_file_manager` currently calls `ROCUtils.normalizeRocJson` directly.
This is correct and should remain the default, BUT it must also accept text input
via the same unified function.

Search for the place where files are read:

```js
const raw = JSON.parse(text);
const parsed = ROCUtils.normalizeRocJson(raw, options);
```

### Replace those lines with:

```js
const { data: parsed } = ROCUtils.parseRocDataFromText(text, file.name);
```

Do NOT change any ID-renaming logic or table-refresh logic.

---

# 4. Do NOT change anything else

No UI edits.  
No changes to the curve collection logic.  
No changes to addCurvesToCollection.  
No changes to validation workflows.  
No changes to plotting or layout.  

Only replace parsing logic with calls to `ROCUtils.parseRocDataFromText`.

---

# 5. Summary of required end state

- Both apps call `ROCUtils.parseRocDataFromText(...)`.
- All JSON parsing and canonicalization occur inside ROC_utils.js.
- No app contains its own JSON parser anymore.
- Multi-curve files (e.g. auc90_examples.json) now load correctly in all apps.
- Validation error messages are consistent system-wide.

Please apply these modifications now.
```



===


```markdown
# Codex Patch Instructions — Fix Threshold Parsing in ROCUtils

You will modify **only one file**:

- **ROC_utils.js**

Your goal is:
1. Allow ROC curves to contain `null` or `undefined` values in their `threshold` arrays.
2. Preserve the canonical JSON structure.
3. Make combined ROC files load correctly in **ROC_utility.html**.

Do **not** change:
- File formats
- Validation behavior for fpr/tpr
- Sorting or ID assignment
- The structure of the exported combined file
- Any UI code in either app

The only change is to relax `threshold` parsing inside `ROCUtils.toCanonicalRocObject`.

---

# 1. Locate this block inside `ROCUtils.toCanonicalRocObject`:

```js
if(input.threshold !== undefined){
  const threshold = coerceNumberArray(input.threshold, `${context}.threshold`);
  if(threshold.length !== fpr.length){
    throw new Error(`${context}.threshold length must match fpr/tpr length.`);
  }
  canonical.threshold = threshold;
}
```

---

# 2. Replace **that entire block** with this version:

```js
if (input.threshold !== undefined) {
  if (!Array.isArray(input.threshold)) {
    throw new Error(`${context}.threshold must be an array.`);
  }
  if (input.threshold.length !== fpr.length) {
    throw new Error(`${context}.threshold length must match fpr/tpr length.`);
  }

  // NEW: Allow null/undefined threshold entries (e.g., endpoints inserted by validator).
  const threshold = input.threshold.map((value, idx) => {
    if (value === null || value === undefined) {
      // Preserve null explicitly: this means "no finite threshold at this point"
      return null;
    }
    let parsed = value;
    if (typeof parsed === 'string') {
      const trimmed = parsed.trim();
      if (trimmed === '') {
        return null; // empty string treated like missing
      }
      parsed = trimmed;
    }
    const num = typeof parsed === 'number' ? parsed : Number(parsed);
    return num; // may be NaN or Infinity; ROCUtility logic can handle non-finite values
  });

  canonical.threshold = threshold;
}
```

---

# 3. Do **not** modify anything else.

This change ensures:
- Combined ROC files with auto-inserted (0,0) and (1,1) points no longer fail validation.
- `null` threshold values are allowed and preserved.
- Individual curve imports still work exactly as before.
- All ROC apps can load multi-curve JSON files without errors.

Please apply this patch now.
```


## 8.3 Corrected ROC Endpoint Logic for Heavy-Tailed Distributions

### Purpose
This section supersedes earlier rules regarding forced endpoints `(0,0)` and `(1,1)` in ROC curves.
Heavy-tailed distributions (e.g., Cauchy, low-df t, SEP with small shape) do **not** reach CDF values of
0 or 1 within any finite numerical domain. A numerically generated ROC curve should therefore:

- **NOT** be required to explicitly include `(0,0)` or `(1,1)`
- **NOT** be altered to artificially insert endpoints
- **NOT** be considered invalid if the first point has `FPR > 0` or last point has `TPR < 1`

This section corrects the validation logic, JSON schema assumptions, and file-manager behavior
accordingly.

---

## 8.3.1 Updated ROC Validity Rules (supersedes 8.1 endpoint rules)
ROC curves **must** satisfy:
- FPR array monotone non-decreasing
- TPR array monotone non-decreasing
- FPR and TPR values within `[0,1]`
- Arrays of equal length
- Numeric values only (no NaN/Inf)

ROC curves **may**:
- Begin at any point `(FPR₀,TPR₀)` with `FPR₀ ≥ 0`, `TPR₀ ≥ 0`
- End at any point `(FPR_n,TPR_n)` with `FPR_n ≤ 1`, `TPR_n ≤ 1`
- Represent truncated numerical domains for heavy-tailed distributions

### New rule:
**Missing `(0,0)` and `(1,1)` are NOT warnings, NOT errors, and must NOT be auto-inserted.**

---

## 8.3.2 Updates to ROC JSON Schema
The schema must explicitly state:

> A ROC curve does not need to explicitly include `(0,0)` or `(1,1)`. Curves are permitted to
> begin and end anywhere within the unit square as determined by the numerical domain on which the
> ROC was computed.

No endpoints are required. No endpoint inference or correction is performed.

---

## 8.3.3 Updates to ROC_utils.js Validation Logic
Modify `ROCUtils.validateRocCurve` and `ROCUtils.validateRocMap`:

### Remove:
- Any logic that inserts `(0,0)` or `(1,1)`
- Any warnings related to missing endpoints
- Any endpoint auto-fix behavior

### Retain:
- Monotonicity checking
- Length checking
- Numeric checking
- Value-range checking

### Add (optional, non-blocking informative warning):
- If the first point is far from `(0,0)` or last point far from `(1,1)`,
  a *non-warning* note may be added for display only:
  "Curve truncated due to finite numerical domain (expected for heavy-tailed distributions)."

This note must NOT:
- modify the curve
- block import
- appear as a validation error or warning

---

## 8.3.4 Updates to `roc_file_manager.html`

### Remove:
- Any logic that detects or corrects missing endpoints
- Any UI warnings tied to endpoint presence
- Any auto-insertion behavior connected to endpoint repair

### Add:
- A simple informational message (not a warning) in the Validation panel when curves appear
  truncated:
  "This ROC curve does not include (0,0) or (1,1). This is normal for heavy-tailed distributions
  where the CDF approaches 0 and 1 asymptotically. No correction needed."

### Behavior rules:
- Curves missing endpoints must be included in the curve-management table
- Curves missing endpoints must NOT block export
- Curves missing endpoints must be treated as fully valid

---

## 8.3.5 Codex Prompt to Implement Section 8.3
Paste the following into VS Code. This prompt is stand-alone and must _only_ apply the corrections
from Section 8.3.

```
You are Codex, OpenAI's coding agent running inside VS Code.

Task: Implement the changes described in Section 8.3 (ROC endpoint corrections),
from ROC_Utils_implementation_plan.md.

************** FILES TO MODIFY **************
- ROC_utils.js
- roc_file_manager.html

************** FILES NOT TO MODIFY **************
- continuous_ROC.html
- ROC_utility.html
- Any other files in the workspace

*********************************************

Implement the following:

============================================================
1. UPDATE VALIDATION LOGIC IN ROC_utils.js
============================================================

• Remove all code that inserts (0,0) or (1,1).
• Remove all endpoint-related warnings.
• Do NOT treat missing endpoints as errors.
• Do NOT auto-correct missing endpoints.
• Retain numeric-value, monotonicity, and length checks.
• If desired, include a non-blocking informational note for truncated curves, but
  it must NOT appear as a warning or error.
• Ensure validateRocCurve and validateRocMap reflect these new rules.

============================================================
2. UPDATE roc_file_manager.html
============================================================

• Remove any UI warnings about missing endpoints.
• Remove any endpoint auto-insertion or correction.
• Curves missing endpoints must be treated as valid.
• Allow such curves to appear in the curve table and be exported.
• Add an informational message for truncated curves:
    "This ROC curve does not include (0,0) or (1,1). This is normal for heavy-tailed
     distributions with asymptotic CDF tails. No correction needed."
• Ensure that this message does NOT block export or appear as a validation error.

============================================================
3. CONSTRAINTS
============================================================

1. Do NOT modify continuous_ROC.html or ROC_utility.html.
2. Do NOT refactor unrelated code.
3. Do NOT create or rename files.
4. Filenames and capitalization must remain exactly as currently used.
5. All changes must be complete — no placeholders.
6. Follow Section 8.3 literally and completely.

============================================================
When finished, summarize the changes you made and stop.
============================================================
```

----------------------------------------------
END OF DOCUMENT
