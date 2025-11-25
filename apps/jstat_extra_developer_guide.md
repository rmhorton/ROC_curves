# jstat_extra.js – Developer’s Guide

> **Scope.** This document describes the design and implementation of the extended distribution family in `jstat_extra.js`. It is aimed at developers who may need to maintain, test, or extend these distributions.

The file currently adds the following objects to the global `jStat` namespace:

- `jStat.expPower` – symmetric exponential power / generalized normal.
- `jStat.sep2` – Azzalini-style skew exponential power ("SEP2" in the ROC project).
- `jStat.sep2_gamlss` – GAMLSS SEP2 distribution, ported from **gamlss.dist::dSEP2/pSEP2/rSEP2**.
- `jStat.sep_hutson` – Hutson skew exponential power family as used in Attwood et al. (2023) for ROC curves.
- `jStat.sep_hutson_fast` – typed-array–friendly vectorized PDF for Hutson’s SEP.

All of these are implemented in a single IIFE wrapper:

```js
(function (jStat) { /* ... */ })(jStat);
```

so they can be loaded after the core jStat library (either in Node or in the browser) without modifying jStat itself.

---
## 1. Shared numerical helpers

`jstat_extra.js` defines a few helper functions that are shared by multiple distributions:

### 1.1 `gammaLanczos(z)`

A scalar implementation of the Lanczos approximation for the gamma function, using the classic set of coefficients for `g = 7`, `n = 9`. It supports real arguments and uses the reflection formula for `z < 0.5`.

- Used by:
  - `alphaFromSigma()` in the symmetric exponential power family.
  - `expPowerNormConst()`.
  - `Cpsi()` for Azzalini-style SEP.
  - `jStat.sep2_gamlss.pdf()` via `gammaLanczos(1/tau)` for its normalising constant.

jStat also has its own `gammafn`; for Hutson’s SEP we deliberately call `jStat.gammafn` instead, to piggyback on whichever implementation jStat ships (this avoids having two separate gamma approximations in play for that family).

### 1.2 `normalCdf(x)`

A scalar approximation to the standard normal CDF Φ(x) using the Abramowitz–Stegun 7.1.26 rational approximation. It is sufficiently accurate for skewing functions in the SEP families and cheaper than pulling in a full error-function implementation.

- Used by:
  - `sep2PdfStandard()` (Azzalini-style SEP) as the skewing CDF.
  - `jStat.sep2_gamlss.pdf()` for the term `log Φ(w)`.

### 1.3 `adaptiveSimpson(f, a, b, eps, maxDepth)`

A straightforward adaptive Simpson integrator implemented in terms of a nested `simpson()` function and a recursive `recurse()` driver. It is used to compute CDFs by numerical integration when no closed form is available.

- Used by CDFs for:
  - `jStat.expPower` (symmetric exponential power).
  - `jStat.sep2` (Azzalini-style SEP).
  - `jStat.sep2_gamlss`.
  - `jStat.sep_hutson`.

The pattern is always:

- Choose an integration window `[mu − L*sigma, mu + L*sigma]` or `[theta − L*sigma, theta + L*sigma]`.
- For `x` inside this window, integrate from the left truncation point up to `x`.
- For `x` beyond the upper truncation, approximate the tail integral and return `1 − tail`.

`L`, `eps`, and `maxDepth` are exposed via optional arguments for some families to let advanced callers trade speed vs accuracy.

### 1.4 Inverse-CDF sampling pattern

All sampling methods in this file follow the same pattern:

1. Draw `u ~ Uniform(0,1)`.
2. Bracket the distribution over `[mu − L*sigma, mu + L*sigma]`.
3. Use bisection on this interval to solve `F(x) = u` numerically.

This is implemented separately for each family but the logic is the same in all cases.

---
## 2. Symmetric Exponential Power / Generalized Normal (`jStat.expPower`)

### 2.1 Parameterisation

`jStat.expPower` exposes the symmetric exponential power (a.k.a. generalized normal / Subbotin) family as:

```js
jStat.expPower.pdf(x, mu, sigma, beta)
```

- `mu`   – location.
- `sigma` – **standard deviation**, not scale.
- `beta` – shape parameter (> 0).

Many references parameterise the generalized normal in terms of a scale parameter `α` and shape `β`, with variance depending on both. Here we instead treat `sigma` as the standard deviation and recover `α` internally via `alphaFromSigma()`:

```js
alpha = sigma * sqrt( Γ(1/β) / Γ(3/β) )
```

This ensures that simulations using `sigma` have the intended variance, independently of `beta`.

### 2.2 PDF

The standard generalized normal with scale `α` and shape `β` has density

```text
f(x) = β / (2 α Γ(1/β)) * exp(−| (x−μ) / α |^β)
```

`expPowerNormConst(alpha, beta)` computes the normalising constant `β / (2 α Γ(1/β))`. The final implementation in the file therefore is

```js
const alpha = alphaFromSigma(sigma, beta);
const A     = expPowerNormConst(alpha, beta);
const z     = Math.abs((x - mu) / alpha);
return A * Math.exp(-Math.pow(z, beta));
```

### 2.3 CDF

Since there is no simple closed form for the CDF in this parameterisation, we use `adaptiveSimpson` with truncation at `mu ± L*sigma`:

```js
jStat.expPower.cdf(x, mu, sigma, beta, { L, eps, maxDepth })
```

For most ROC work `L=10`, `eps=1e-6` is ample; heavier tails (small `beta`) may need larger `L` if extreme quantiles are of interest.

### 2.4 Sampling

Sampling is via inverse-CDF with bisection. This is intentionally “boring but robust” and matches the way GAMLSS’s `qSEP` and related quantile functions are implemented.

### 2.5 External references

The symmetric exponential power / generalized normal family is standard; see e.g.

- Subbotin / generalized normal in SciPy (`scipy.stats.gennorm`).
- Rigby & Stasinopoulos on the generalised power exponential in the GAMLSS documentation and book.

---
## 3. Azzalini-style Skew Exponential Power (`jStat.sep2`)

### 3.1 Conceptual construction

This variant follows Azzalini’s general “skew-symmetric” construction:

```text
f_Z(z) = 2 f_0(z) G(λ z)
```

where

- `f_0(z)` is a symmetric baseline density,
- `G` is a CDF (here, the standard normal Φ),
- `λ` (and other parameters) control skewness and tail behaviour.

In our implementation, we treat the **standardised** variable `Z = (X − μ) / σ` and define a symmetric baseline with tail exponent controlled by `psi`:

```text
f_0(z) = C_ψ * exp( − |z|^{2 ψ} / (2 ψ) )
C_ψ    = 1 / [ 2 (2 ψ)^{1/(2 ψ) − 1} Γ(1/(2 ψ)) ]
```

The skewing term uses a transformed argument of the form

```text
skewArg = sign(α z) * |α z|^ψ / √ψ
```

and the final standardised density is

```text
f_Z(z) = 2 f_0(z) Φ(skewArg).
```

The full location/scale version is then

```text
f_X(x) = (1 / σ) f_Z((x − μ)/σ).
```

This construction is deliberately conservative and numerically stable; it mirrors the implementation you validated in Python when you first compared Azzalini-style SEP against SciPy’s `gennorm` and your own R prototyping.

### 3.2 API

```js
jStat.sep2.pdf(x, mu, sigma, alpha, psi)

jStat.sep2.cdf(x, mu, sigma, alpha, psi, opts)
jStat.sep2.sample(n, mu, sigma, alpha, psi, opts)
```

Constraints:

- `sigma > 0`.
- `psi > 0`.

`alpha` controls skewness; `psi` controls the tail weight of the symmetric baseline (`psi = 1` behaves much like a skew-normal, small `psi` gives heavy tails, large `psi` sub-Gaussian behaviour).

### 3.3 CDF & sampling

Both use the same adaptive-Simpson + bisection combination described earlier. Since Φ is cheap to evaluate and the baseline density is smooth, the numeric integration behaves well for all practically relevant parameter values you have tried.

---
## 4. GAMLSS SEP2 (`jStat.sep2_gamlss`)

### 4.1 Background

The GAMLSS project defines several skew exponential power families. `SEP2` is the “type 2” variant exposed in R via `gamlss.dist::dSEP2`, `pSEP2`, `qSEP2`, and `rSEP2`. The parameterisation used there is:

- `μ` – location.
- `σ` – scale (`> 0`).
- `ν` – skewness.
- `τ` – kurtosis / tail weight (`> 0`).

The implementation in `jStat.sep2_gamlss` is a direct port of the R code for `dSEP2`; the CDF and sampling mirror GAMLSS’s use of numeric integration and inverse-CDF.

### 4.2 PDF

Let

```text
z    = (x − μ) / σ
|z|  = abs(z)
sgn  = sign(z)

w    = sgn * |z|^{τ/2} * ν * sqrt(2/τ)
```

The log-density is implemented as

```text
log f(x) = log Φ(w) − |z|^τ / τ + log_const

log_const = −log σ − log Γ(1/τ) − ((1/τ) − 1) log τ
```

and the final PDF is `exp(log_pdf)`.

The important points for developers are:

- We work entirely on the log scale and only exponentiate once at the end.
- The normalising constant matches the GAMLSS reference implementation; you already checked this numerically in your Python–R comparison harness.

### 4.3 CDF & sampling

- `cdf(x, mu, sigma, nu, tau, opts)` integrates the PDF from `μ − Lσ` up to `x` using `adaptiveSimpson`.
- Values beyond the upper truncation return `1 − tailIntegral` to stabilise the right tail.
- `sample(n, mu, sigma, nu, tau, opts)` uses inverse-CDF with bisection, as in the other families.

This design intentionally mirrors the behaviour of GAMLSS’s `qSEP2` and `rSEP2`, so you can compare output distributions pointwise against R.

---
## 5. Hutson Skew Exponential Power (`jStat.sep_hutson` and `.sep_hutson_fast`)

### 5.1 Background and parameterisation

This family implements the skew exponential power distribution used by Attwood, Hou & Hutson (2023) for ROC curves, which itself is based on Hutson’s more general skew exponential power work.

Parameters:

- `θ` (theta) – location.
- `σ` (sigma) – scale (`> 0`).
- `α` (alpha) – skew parameter (`0 < α < 1`).
- `β` (beta) – tail parameter (`−1 < β ≤ 1`).

Define

```text
z     = (x − θ) / σ
inner = |z| + (2 α − 1) z
```

Then the density is

```text
f(x) = k(α, β) / σ * exp( − 0.5 * inner^2 / (1 + β) )
```

with normalising constant

```text
k(α, β) = 4 α (1 − α) / ( Γ(a) * 2^{1 + 0.5 (1+β)} )

a = 1 + (β + 1)/2 = (β + 3)/2.
```

`sepHutsonNormConst(alpha, beta)` computes `k(α,β)` using `jStat.gammafn` for Γ(a).

### 5.2 API

Two APIs are provided:

```js
jStat.sep_hutson.pdf(x, theta, sigma, alpha, beta)
jStat.sep_hutson.cdf(x, theta, sigma, alpha, beta)
jStat.sep_hutson.inv(u, theta, sigma, alpha, beta)
jStat.sep_hutson.sample(n, theta, sigma, alpha, beta)
```

These accept scalar or array arguments for `x` / `u`; arrays return arrays, and typed arrays return a matching `Float64Array`.

For performance-critical use with pre-allocated `Float64Array` inputs, there is a separate helper:

```js
jStat.sep_hutson_fast.pdfArray(xs, theta, sigma, alpha, beta)
```

which performs a tight loop over `xs` and returns either a new `Float64Array` or a plain array depending on the input type.

### 5.3 CDF, quantile, sampling

- `cdf` uses `adaptiveSimpson` over `[θ − Lσ, x]` with `L ≈ 12` by default, which is large enough even for `β` near `−1` (heavy tails).
- `inv` uses bisection and auto-expands the initial bracketing interval until `F(lo) ≈ 0` and `F(hi) ≈ 1`.
- `sample` draws independent `u` and calls `inv`.

### 5.4 Practical notes from ROC work

When plotted against the distributions in Attwood’s ROC simulation figures, the Hutson SEP **PDF** does not visually match the curves in Figure 1 for parameter sets 1–4 and several others. The best explanation (supported by your Python experiments) is that those published curves are *not* the true Hutson SEP PDFs but rather “score-like” kernel shapes constructed from the exponent term, potentially scaled or truncated for visual convenience.

For ROC modelling you should use the fully normalised Hutson SEP PDF implemented here. For figure reproduction, you may instead want a separate "shape" function that omits the `k(α,β)` normalising constant and rescales only by `1/σ`.

---
## 6. Summary of skew exponential power variants and literature

This section summarises the variants you have interacted with while developing `jstat_extra.js`, including ones not yet fully implemented here.

### 6.1 Symmetric exponential power / generalized normal

- Baseline symmetric family with tail parameter `β` (or `p` in some references).
- Includes normal (`β = 2` in some parameterisations; `β = 1` in the one used in the GAMLSS context), Laplace-like and uniform-like limits.
- Used in SciPy as `scipy.stats.gennorm` and in GAMLSS under various names.

### 6.2 Azzalini’s skew-symmetric SEP

Azzalini’s early work on skew-normal and skew-exponential-power distributions uses the general skew-symmetric construction

```text
f(z) = 2 f_0(z) Φ(λ z)
```

where `f_0` is symmetric (often normal or power-exponential). Key points:

- Provides a conceptually simple mechanism to introduce skewness while preserving many analytical properties of the baseline density.
- Estimation can be delicate in some parameter regions (a point discussed in later work by Monti and others).

Our `jStat.sep2` follows this spirit but uses a slightly different skewing argument derived from Attwood / Hutson’s ROC context.

### 6.3 Hutson-style SEP

Hutson’s alternative skew exponential power model expresses asymmetry by re-weighting the left and right tails via a transformed variable of the form

```text
inner = |z| + (2 α − 1) z
```

with `α` controlling the balance between left and right tails and `β` controlling tail heaviness. This formulation tends to perform better in some maximum-likelihood settings than the classical Azzalini four-parameter SEP while retaining flexibility.

`jStat.sep_hutson` is a direct implementation of the specific form used in Attwood et al. (2023) for ROC curves.

### 6.4 GAMLSS SEP and SEP2 families

The GAMLSS `SEP` and `SEP2` families (and related types 1–4) are designed for regression models where all of location, scale, skewness and kurtosis can vary with covariates. Their parameterisation `(μ, σ, ν, τ)` is convenient for regression but not always intuitive when you are thinking in terms of shape parameters directly.

`jStat.sep2_gamlss` is tailored to interoperate with GAMLSS: it uses the same parameterisation and normalising constants so that you can port fitted parameters and quantiles between R and JavaScript.

### 6.5 Attwood et al. (application to ROC curves)

Attwood et al. apply Hutson’s SEP family to model the score distributions for diseased vs non-diseased populations, arguing that the additional shape parameters allow more realistic ROC curves than the classic binormal model. In your testing you observed that:

- The code in `jStat.sep_hutson` produces correctly normalised PDFs.
- The published ROC figure distributions in Attwood’s paper do not match these PDFs exactly, which strongly suggests that the figure uses a transformed or rescaled “score” kernel rather than the full PDF.

For methodological work (fitting ROC models, computing likelihoods, etc.) you should always use the fully normalised PDFs implemented in `jstat_extra.js`.

---
## 7. Testing and validation strategy

When adding new families or refactoring existing ones, follow the same black-box testing approach you have already used:

1. **Node bridge for JavaScript**
   - Load `jStat` and `jstat_extra.js` in a small Node script.
   - Expose a JSON-based interface (`dist`, `method`, `xs`, `params`) over stdin/stdout.

2. **Python harness**
   - Use `subprocess` from Python to call the Node bridge.
   - Compare `pdf`, `cdf`, and `sample` outputs against reference implementations:
     - SciPy (`scipy.stats.gennorm`, `skewnorm`, `laplace`, etc.).
     - R (via `gamlss.dist::dSEP2`, `pSEP2`, `rSEP2` when validating the GAMLSS port).

3. **Metrics and plots**
   - Maximum absolute error and relative error on a grid of `x` values.
   - Numerical check that `∫ pdf(x) dx` over a wide truncation window is ≈ 1.
   - Side-by-side plots for sanity-checking tails and skew.

4. **Edge cases**
   - Parameter limits for which the distribution approaches normal, Laplace, or other special cases.
   - Extreme skewness or heavy tails (`α → 0 or 1`, `β → −1`, `τ` small) to ensure numerical stability.

---
## 8. Guidelines for extending `jstat_extra.js`

If you plan to add further families (e.g., epsilon-skew exponential power, alternative Azzalini parameterisations, or additional GAMLSS types), keep to the following conventions:

1. **Namespace discipline**
   - Add new families under `jStat.<name>` without modifying core jStat files.
   - Use lowercase names with clear provenance (e.g. `sep_epsilon`, `sep_azzalini`, `sep2_gamlss_alt`).

2. **Parameter semantics**
   - Document parameters in terms of location, standard deviation / scale, skewness and kurtosis where possible.
   - If you port code from R or another library, keep the same parameterisation and clearly label it as such (e.g. “GAMLSS-style”).

3. **Numeric robustness**
   - Prefer log-scale computations for PDFs when gamma functions or exponentials are involved.
   - Use `adaptiveSimpson` for CDFs unless a reliable closed-form expression is available.
   - Use inverse-CDF sampling via bisection as the default; consider specialised samplers only if profiling shows this as a bottleneck.

4. **Testing**
   - Whenever possible, validate against at least one external implementation (SciPy, R, or published tables/plots).
   - Record any known discrepancies (e.g. when a published figure is based on an unnormalised kernel) directly in this developer guide so future you does not have to rediscover them.

---

## Disclaimer

**This documentation and the `jstat_extra.js` module were generated with assistance from OpenAI’s ChatGPT.**
While the model can write substantial amounts of code, translate mathematical formulations, summarize academic papers, and generate testing frameworks, **it is not a domain-expert and is prone to several categories of error.** Users should therefore treat this implementation as a *draft requiring rigorous validation* rather than authoritative or production-ready scientific code.

### Types of errors ChatGPT can produce

ChatGPT may introduce:

1. **Mathematical Translation Errors**
   - Misinterpretation of formulas, especially when papers use inconsistent notation or omit constant factors.
   - Confusion between *parameterizations* (e.g., Azzalini vs. Hutson vs. GAMLSS SEP families).
   - Incorrect mapping from symbolic expressions to code (sign errors, missing parentheses, wrong exponents, misuse of gamma functions, missing normalization constants, wrong continuity conditions, etc.).

2. **Algorithmic / Logical Errors**
   - Incorrect branching in piecewise definitions.
   - Failure to enforce parameter restrictions.
   - Misuse of approximation methods or series expansions.
   - Incorrect interpretation of “shape” vs. “skewness” parameters.

3. **Numerical Stability Problems**
   - Overflow / underflow in exponentials.
   - Catastrophic cancellation in tail probabilities.
   - Poorly conditioned normalizing constants.
   - Wrong or unstable inversion methods for CDF or quantile functions.

4. **Conceptual Confusion Between Related Distributions**
   - Mixing properties of the SEP (Hutson), SEP (Azzalini), SEP2 (GAMLSS), skew-normal, skew-Laplace, generalized normal, etc.
   - Assuming equivalence between variants that are *not* equivalent.

5. **File Integration, API, or Typing Errors**
   - Wrong namespacing (`jStat.sep2_gamlss_exact` vs. `jStat.sep2_gamlss`).
   - Missing exports, unused variables, or mismatched parameter order.
   - Incorrect assumptions about Node.js vs. browser execution environment.

6. **Overconfident Statements About Accuracy**
   - The model may assert that a mapping is “exact” when it is only approximate.
   - It can mistake a *qualitatively similar* curve for a correct parametric match.

### Recommended validation steps

Because of the above risks, **every distribution implementation must be independently validated**:

#### 1. Analytical Verification
- Check that the PDF integrates to 1 for a representative grid of parameters.
- Verify continuity and differentiability at piecewise boundaries.
- Confirm special cases:
  - Normal
  - Laplace
  - Skew-normal
  - Generalized normal / exponential power
  - Symmetric and asymmetric limits
- Cross-check normalization constants against textbook or paper definitions.

#### 2. Numerical Testing
- Compare PDFs, CDFs, and quantiles against:
  - **Reference R implementations** (`gamlss.dist`).
  - **SciPy distributions** where applicable.
  - **Monte-Carlo simulations** of the intended generative definitions.

- Evaluate:
  - Maximum absolute error across a dense grid in x.
  - Stability across extreme parameter limits (heavy tails, sharp peaks).
  - Parameter gradients (if later used for optimization).

#### 3. Plot-Based Shape Comparison
- Validate shape, tail behavior, skewness direction, and peak width.
- Reproduce diagnostic figures from:
  - Attwood et al.
  - Hutson
  - Azzalini (skew-symmetric / SEP)
  - GAMLSS SEP2 documentation
  - Any distribution family claiming equivalence.

#### 4. Beware of Parameterization Differences
Many SEP variants differ by:
- Sign convention on the skew term.
- Whether α is a “left probability,” “skewness,” or “slant.”
- Whether β is a tail-thickness exponent or its inverse.
- Whether the normalizing constant is expressed in terms of β, 1/β, or 2/(1+β).
- Choice of scaling — some papers normalize to peak height = 1, not area = 1.

**Never assume identical parameter meanings without reading the exact source.**

#### 5. Reproducibility & Regression Tests
Create automated tests that:
- Load fixed parameter sets.
- Compare JS results to a frozen, validated R/Python reference dataset.
- Fail loudly if differences exceed tolerance thresholds.

### Final Note

ChatGPT speeds up exploration, prototyping, and documentation — but **it cannot replace peer-reviewed mathematical correctness** or a dedicated statistical software validation process.

All results should be treated as **provisional** until verified through independent derivations, numerical testing, and comparison with established libraries.

---

## References

1. Azzalini, A. (1985). *A class of distributions which includes the normal ones*. Scandinavian Journal of Statistics.
2. Azzalini, A., & Dalla Valle, A. (1996). *The multivariate skew-normal distribution*. Biometrika.
3. Hutson, A.D. (1999). *A robust alternative to the normal distribution: The skew exponential power distribution*. Statistics & Probability Letters.
4. Rigby, R.A., & Stasinopoulos, D.M. (2005). *Generalized additive models for location, scale and shape (GAMLSS)*. Journal of the Royal Statistical Society, Series C.
5. Attwood, K. et al. (2023). *Simulation study using skew exponential power distributions for ROC analysis*. Canadian Journal of Statistics.
6. Nadarajah, S. (2005). *A generalized normal distribution*. Journal of Applied Statistics.
7. Arellano-Valle, R., & Azzalini, A. (2006). *On the unification of families of skew-normal distributions*. Scandinavian Journal of Statistics.


---

End of developer’s guide for `jstat_extra.js`.
