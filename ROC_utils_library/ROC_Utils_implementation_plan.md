```markdown
# Shared ROC JSON Format and ROC_utils.js Integration Plan (Clean Spec)

## 1. Scope and Goals

Two apps use ROC curves:

- **App A: Continuous ROC Explorer** (`continuous_ROC.html`)
- **App B: ROC Utility / Costs & Benefits App** (`ROC_utility.html`)

Goal: create a **single canonical ROC JSON format** and a shared library **ROC_utils.js** used by both apps for:
- Parsing JSON
- Parsing CSV
- Exporting JSON and CSV
- ROC math utilities

This version removes all legacy fields (`tpr_lower`, `tpr_upper`) and defines a clean, purely forward‑compatible structure.

---

## 2. Canonical ROC JSON Data Model (Clean Version)

**A ROC JSON file may contain any number of ROC curves (≥ 1).**

### 2.1 Top‑level container

A JSON ROC file **must** be a map `{ curve_id → curve_object }`.

Example:
```json
{
  "example_curve": {
    "name": "Example curve",
    "type": "ROC",
    "fpr": [...],
    "tpr": [...],
    "threshold": [...],
    "bands": [
      { "level": 0.95, "lower": [...], "upper": [...] }
    ],
    "metadata": { ... }
  }
}
```

### 2.2 Curve object schema

Each curve has:

#### Required fields
- `type`: must be the string `"ROC"`.
- `fpr`: array of numbers in `[0,1]`, sorted, nonempty.
- `tpr`: array of numbers, same length as `fpr`.

#### Optional fields
- `name`: human-readable label.
- `threshold`: numeric array, same length as `fpr` when present.
- `bands`: array of uncertainty intervals.
  - Each band object:
    - `level` (e.g., `0.95`)
    - `lower`: numeric array, same length as `fpr`
    - `upper`: numeric array, same length as `fpr`
- `metadata`: plain object with arbitrary key/value pairs.

### 2.3 Canonicalization rules

When importing, the parser must:
- Accept:
  - a single curve object
  - an array of curves
  - an object with properties containing curves
  - an object containing a `curves` array
- Convert all inputs into a canonical map `{ curveId → canonicalCurve }`.
- Assign curve IDs in this priority:
  1. Explicit `curve.curve_id`
  2. Unique `curve.name`
  3. Auto IDs: `curve_1`, `curve_2`, ...
- Validate:
  - `fpr` and `tpr` arrays exist and match
  - `bands` exist only as full objects with matching lengths
- Strip unrecognized fields.
- Reject or warn on malformed numeric arrays.

---

## 2.4 Example Multi-Curve JSON File

```json
{
  "modelA": {
    "type": "ROC",
    "fpr": [0, 0.1, 0.3, 1],
    "tpr": [0, 0.4, 0.8, 1],
    "bands": [
      { "level": 0.95, "lower": [0,0.35,0.7,1], "upper": [0,0.45,0.85,1] }
    ],
    "metadata": { "source": "example", "sample_size": 2000 }
  },
  "modelB": {
    "type": "ROC",
    "fpr": [0, 0.05, 0.2, 1],
    "tpr": [0, 0.5, 0.9, 1]
  }
}
```

## 2.5 Example Multi-Curve CSV File

```
curve_id,fpr,tpr,threshold,lower_0.95,upper_0.95
modelA,0,0,1,,
modelA,0.1,0.4,0.8,0.35,0.45
modelA,0.3,0.8,0.6,0.70,0.85
modelA,1,1,0,,
modelB,0,0,1,,
modelB,0.05,0.5,0.9,,
modelB,0.2,0.9,0.7,,
modelB,1,1,0,,
```

## 3. CSV Import/Export Format (Clean Version)

CSV is **purely a human-readable convenience format**. Only one clean structure is supported.

### 3.1 Required columns
- `curve_id`
- `fpr`
- `tpr`

### 3.2 Optional columns
- `threshold`
- For each band with level `p`, the columns must be:
  - `lower_p`
  - `upper_p`
  Example: `lower_0.95`, `upper_0.95`

### 3.3 Notes
- Each row represents one ROC point.
- Rows are grouped by `curve_id`.
- All band columns for all points of a curve must exist and have valid numeric entries or be empty.
- CSV import converts directly to canonical ROC objects.

### 3.4 CSV Export Rules
- Always include `curve_id`, `fpr`, `tpr`.
- Include `threshold` if present.
- Include all `bands` levels present in the canonical curve.
- Emit long format (one row per point).

---

## 3.1 Round-Trip Tests for Multi-Curve Robustness

These tests should be added to a browser test harness (Jasmine or custom):

### JSON → canonical → JSON
```js
test("JSON multi-curve round-trip", () => {
  const input = `{"modelA": {"type":"ROC","fpr":[0],"tpr":[0]}, "modelB": {"type":"ROC","fpr":[0,1],"tpr":[0,1]}}`;
  const parsed = ROCUtils.parseRocJsonText(input);
  const out = JSON.stringify(parsed);
  const reparsed = JSON.parse(out);
  assert(JSON.stringify(reparsed) === JSON.stringify(parsed), "JSON round-trip failed");
});
```

### CSV → canonical → CSV
```js
test("CSV multi-curve round-trip", () => {
  const csv = `curve_id,fpr,tpr
A,0,0
A,1,1
B,0,0
B,1,1`;
  const parsed = ROCUtils.parseRocCsvText(csv);
  const out = ROCUtils.rocToCsv(parsed);
  const reparsed = ROCUtils.parseRocCsvText(out);
  assert(JSON.stringify(reparsed) === JSON.stringify(parsed), "CSV round-trip failed");
});
```

### JSON → CSV → JSON
```js
test("JSON ↔ CSV multi-curve round-trip", () => {
  const input = `{"A":{"type":"ROC","fpr":[0],"tpr":[0]},"B":{"type":"ROC","fpr":[0,1],"tpr":[0,1]}}`;
  const curves1 = ROCUtils.parseRocJsonText(input);
  const csv = ROCUtils.rocToCsv(curves1);
  const curves2 = ROCUtils.parseRocCsvText(csv);
  assert(JSON.stringify(curves1) === JSON.stringify(curves2), "Interformat round-trip failed");
});
```

---

## 4. Shared ROC_utils

### 4.1 Reference Implementation: `ensureMonotoneRoc`

```javascript
/**
 * ensureMonotoneRoc
 * Input: array of objects [{ fpr, tpr, thr? }, ...]
 * Output: cleaned ROC array, monotone in FPR and TPR.
 */
ROCUtils.ensureMonotoneRoc = function(points) {
  if (!Array.isArray(points)) return [];

  // 1. Filter invalid entries
  let clean = points.filter(p =>
    Number.isFinite(p.fpr) && Number.isFinite(p.tpr)
  );

  // 2. Sort by FPR ascending
  clean.sort((a, b) => a.fpr - b.fpr);

  // 3. Consolidate duplicate FPR values (keep max TPR)
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
```

---

## 4.2 Unit Tests for `ensureMonotoneRoc`

Add the following to `specs/roc_utils_spec.js`:

```javascript
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
      { fpr: 1, tpr: 0.6 } // invalid dip
    ];
    const out = ROCUtils.ensureMonotoneRoc(pts);
    expect(out[2].tpr).toBe(0.8);
  });

  it("handles complex mixed cases", () => {
    const pts = [
      { fpr: 0.3, tpr: 0.6 },
      { fpr: 0.1, tpr: 0.3 },
      { fpr: 0.3, tpr: 0.7 },
      { fpr: 0.2, tpr: 0.1 },
      { fpr: 0.2, tpr: 0.4 }
    ];
    const out = ROCUtils.ensureMonotoneRoc(pts);
    expect(out.length).toBe(3);
    expect(out[0]).toEqual(jasmine.objectContaining({ fpr: 0.1, tpr: 0.3 }));
    expect(out[1]).toEqual(jasmine.objectContaining({ fpr: 0.2, tpr: 0.4 }));
    expect(out[2]).toEqual(jasmine.objectContaining({ fpr: 0.3, tpr: 0.7 }));
  });

});
```.js API

### 4.1 JSON utilities
- `normalizeRocJson(raw)` → canonical map
- `parseRocJsonText(text)` → calls `JSON.parse` → normalize
- `toCanonicalRocObject({...})` → helper for construction
- `toRocJsonBlob(curves, filename)` → blob + download

### 4.2 CSV utilities
- `parseRocCsvText(text)` → canonical map
- `rocToCsv(curves, options)` → CSV string

### 4.3 Math utilities
- `computeEmpiricalRoc(points)`
- `ensureMonotoneRoc(rocPoints)`
- `computeAuc(rocPoints)`

---

## 0. Global Rule for All Codex Prompt

You are modifying ONLY the files explicitly listed in this prompt.
Do NOT modify any other files.
Do NOT create new files unless explicitly instructed.
s

**All Codex prompts MUST explicitly specify which files are to be modified.**

Each prompt must begin with:

```
You are modifying ONLY the following files:
- <file1>
- <file2>
Do NOT modify any other files.
Do NOT create new files unless explicitly instructed.
```

---

## 5. Updated Codex Prompt

You are modifying ONLY the files explicitly listed in this prompt.
Do NOT modify any other files.
Do NOT create new files unless explicitly instructed.
s (Clean Versions)

### 5.1 ROC_utils v0.1 — Pure Canonical JSON

**Codex Prompt

You are modifying ONLY the files explicitly listed in this prompt.
Do NOT modify any other files.
Do NOT create new files unless explicitly instructed.
:**

You are working with two HTML apps: `continuous_ROC.html` and `ROC_utility.html`. Create a new shared library file `ROC_utils.js` containing:

1. A global `window.ROCUtils` with:
   - `normalizeRocJson(raw)`
   - `parseRocJsonText(text)`
   - `toCanonicalRocObject(obj)`

2. Implement the **clean canonical JSON spec**:
   - No legacy fields (`tpr_lower`, `tpr_upper`).
   - Each curve has `{ type, fpr, tpr }` and optional `{ name, threshold, bands, metadata }`.
   - Accept flexible inputs (single curve, array, object, object with `curves`).
   - Output a map `{ curveId → canonicalCurve }`.
   - Validate numeric arrays and lengths.

3. Modify `ROC_utility.html`:
   - Add `<script src="ROC_utils.js"></script>` before main logic.
   - Replace all JSON parsing with `ROCUtils.parseRocJsonText`.

No UI changes.

---

### 5.2 ROC_utils v0.2 — Clean CSV Parser + Exporter

**Codex Prompt

You are modifying ONLY the files explicitly listed in this prompt.
Do NOT modify any other files.
Do NOT create new files unless explicitly instructed.
:**

Extend `ROC_utils.js` with:

1. `parseRocCsvText(text)` implementing the **clean CSV spec**:
   - Required columns: `curve_id`, `fpr`, `tpr`.
   - Optional: `threshold`, `lower_p`, `upper_p` for any band level `p`.
   - Group rows by `curve_id`.
   - Build canonical curves with full `bands[]` objects.

2. `rocToCsv(curves, options)`:
   - Export long format.
   - Include all band levels present.

3. Modify `ROC_utility.html`:
   - When importing, try JSON first; if it fails, parse CSV using `parseRocCsvText`.

4. Modify `continuous_ROC.html` CSV export to call `rocToCsv`.

---

### 5.3 ROC_utils v0.3 — Shared ROC Math

**Codex Prompt

You are modifying ONLY the files explicitly listed in this prompt.
Do NOT modify any other files.
Do NOT create new files unless explicitly instructed.
:**

Add to `ROC_utils.js`:
- `computeEmpiricalRoc(points)`
- `ensureMonotoneRoc(points)`
- `computeAuc(points)`

Modify `continuous_ROC.html` to use these instead of internal ROC logic. Do not change UI.

---

## 6. Continuous ROC Explorer Prompts

### v1.1 — JSON Export

**Codex Prompt

You are modifying ONLY the files explicitly listed in this prompt.
Do NOT modify any other files.
Do NOT create new files unless explicitly instructed.
:**
Add a JSON Export button. When clicked:
- Construct a canonical curve using `toCanonicalRocObject`.
- Include `fpr`, `tpr`, `threshold`, and `metadata`.
- Wrap it in a map `{ id: curve }`.
- Trigger download using `toRocJsonBlob`.

---

### v1.2 — JSON Import (Optional)

**Codex Prompt

You are modifying ONLY the files explicitly listed in this prompt.
Do NOT modify any other files.
Do NOT create new files unless explicitly instructed.
:**
Allow selecting a ROC JSON file, parse via `parseRocJsonText`, convert the chosen curve to the app’s internal ROC structure, and re-render.

---

## 7. ROC Utility App Prompts

### v1.1 — All Imports via ROC_utils

**Codex Prompt

You are modifying ONLY the files explicitly listed in this prompt.
Do NOT modify any other files.
Do NOT create new files unless explicitly instructed.
:**
Refactor all ROC imports to:
- Try `parseRocJsonText`.
- If it fails, call `parseRocCsvText`.
- Pass canonical map to existing loaders.

Remove all old parsing code.

---

### v1.2 — JSON Export in Canonical Form

**Codex Prompt

You are modifying ONLY the files explicitly listed in this prompt.
Do NOT modify any other files.
Do NOT create new files unless explicitly instructed.
:**
When user downloads a curve:
- Extract the canonical curve from internal map.
- Build a map `{ id: curve }`.
- Pretty-print as JSON.
- Trigger download.

---

## 8. Jasmine Test Suite and Browser Test Harness

Below is the complete browser-only testing infrastructure for `ROC_utils.js`, including:
- A Jasmine test suite
- A standalone TestRunner.html
- Multi-curve JSON/CSV fixtures
- Round-trip tests
- AUC and monotonicity tests
- Error-handling tests
- Instructions for running the tests in any browser

---

## 8.1 File Structure for Browser-Only Jasmine Testing

Create the following directory layout:

```
/project
  /src
    ROC_utils.js

  /test
    SpecRunner.html
    /lib
      jasmine.css
      jasmine.js
      jasmine-html.js
      boot.js

    /fixtures
      multi_curve.json
      multi_curve.csv

    /specs
      roc_utils_spec.js
```

Download Jasmine release (standalone) from:  
https://github.com/jasmine/jasmine/releases  
Unzip and copy the `/dist` or `/lib` files into `/test/lib/`.

---

## 8.2 SpecRunner.html (Browser Test Runner)

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="lib/jasmine.css">
  <script src="lib/jasmine.js"></script>
  <script src="lib/jasmine-html.js"></script>
  <script src="lib/boot.js"></script>
</head>
<body>

  <!-- Load source -->
  <script src="../src/ROC_utils.js"></script>

  <!-- Load specs -->
  <script src="specs/roc_utils_spec.js"></script>

</body>
</html>
```

To run tests, **open this file directly in any browser** (Chrome, Firefox, Safari). No server required.

---

## 8.3 Example Fixture Files

### `fixtures/multi_curve.json`
```json
{
  "modelA": {
    "type": "ROC",
    "fpr": [0, 0.1, 0.3, 1],
    "tpr": [0, 0.4, 0.8, 1],
    "bands": [
      { "level": 0.95, "lower": [0,0.35,0.7,1], "upper": [0,0.45,0.85,1] }
    ],
    "metadata": { "source": "fixture", "sample_size": 200 }
  },
  "modelB": {
    "type": "ROC",
    "fpr": [0, 0.05, 0.2, 1],
    "tpr": [0, 0.5, 0.9, 1]
  }
}
```

### `fixtures/multi_curve.csv`
```
curve_id,fpr,tpr,threshold,lower_0.95,upper_0.95
modelA,0,0,1,,
modelA,0.1,0.4,0.8,0.35,0.45
modelA,0.3,0.8,0.6,0.70,0.85
modelA,1,1,0,,
modelB,0,0,1,,
modelB,0.05,0.5,0.9,,
modelB,0.2,0.9,0.7,,
modelB,1,1,0,,
```

---

## 8.4 Jasmine Test Suite (`specs/roc_utils_spec.js`)

```javascript
function loadFixture(path) {
  var xhr = new XMLHttpRequest();
  xhr.open("GET", "../test/fixtures/" + path, false);
  xhr.send(null);
  return xhr.responseText;
}

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


describe("ROC_utils – Interformat Round Trip", () => {
  it("supports JSON → CSV → JSON multi-curve round trip", () => {
    const input = loadFixture("multi_curve.json");
    const curves1 = ROCUtils.parseRocJsonText(input);
    const csv = ROCUtils.rocToCsv(curves1);
    const curves2 = ROCUtils.parseRocCsvText(csv);
    expect(JSON.stringify(curves2)).toBe(JSON.stringify(curves1));
  });
});


describe("ROC_utils – Math Tests", () => {

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

  it("computes AUC correctly for simple 45-degree ROC", () => {
    const roc = [
      { fpr: 0, tpr: 0 },
      { fpr: 1, tpr: 1 }
    ];
    const auc = ROCUtils.computeAuc(roc);
    expect(auc).toBeCloseTo(0.5, 5);
  });
});


describe("ROC_utils – Error Handling", () => {
  it("rejects malformed JSON", () => {
    expect(() => ROCUtils.parseRocJsonText("not valid json")).toThrow();
  });

  it("rejects CSV missing fpr/tpr", () => {
    const badCsv = "curve_id,fpr
A,0";
    expect(() => ROCUtils.parseRocCsvText(badCsv)).toThrow();
  });
});
```

---

## 8.5 Instructions for Running Tests (Add to Implementation Plan)

To run the full Jasmine test suite:

1. Open the folder containing `/test/SpecRunner.html`.
2. **Double-click `SpecRunner.html`** to open it in any browser.
3. Jasmine will automatically:
   - Load `ROC_utils.js`
   - Load all specs in `/test/specs/`
   - Load fixtures via XMLHttpRequest
4. The test results appear directly in the browser using Jasmine’s default HTML reporter.
5. No server, bundler, or Node.js environment is required.

---

## 8.6 Summary of Testing Capabilities Added

- Multi-curve JSON fixtures
- Multi-curve CSV fixtures
- JSON/CSV round-trip verification
- Inter-format round-trip tests  
- Empirical ROC correctness tests  
- AUC correctness tests  
- Robust error-handling tests  
- Complete Jasmine testing environment

This completes full in-browser unit testing support for all ROC_utils.js functionality.

---

# End of Document
```

This clean spec removes all legacy structures and defines a unified format for ROC JSON, a matching CSV convention, and a set of Codex prompts for incremental, low-risk implementation across both apps.
```

