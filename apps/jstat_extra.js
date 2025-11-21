// ======================================================================
// jstat_extra.js
// Additional distributions for jStat:
//   1. Exponential Power / Generalized Normal (symmetric)
//   2. Skew Exponential Power (Azzalini SEP2)
// These extend the jStat namespace: jStat.expPower, jStat.sep2
// This code was written by ChatGPT. For educational use only.
// Link to chat: https://chatgpt.com/share/691ce534-a820-800a-a563-a0a839b8c537
// ======================================================================

(function(jStat) {

  // ====================================================================
  // Shared Numerical Helpers
  // ====================================================================

  // Gamma via Lanczos approximation
  function gammaLanczos(z) {
    const p = [
      676.5203681218851,
      -1259.1392167224028,
      771.32342877765313,
      -176.61502916214059,
      12.507343278686905,
      -0.13857109526572012,
      9.9843695780195716e-6,
      1.5056327351493116e-7
    ];
    const g = 7;

    if (z < 0.5) {
      return Math.PI / (Math.sin(Math.PI * z) * gammaLanczos(1 - z));
    }

    z -= 1;
    let x = 0.99999999999980993;
    for (let i = 0; i < p.length; i++) {
      x += p[i] / (z + i + 1);
    }
    const t = z + g + 0.5;

    return Math.sqrt(2 * Math.PI) *
           Math.pow(t, z + 0.5) *
           Math.exp(-t) *
           x;
  }

  // Normal CDF Φ(x)
  function normalCdf(x) {
    const a1 = 0.254829592,
          a2 = -0.284496736,
          a3 = 1.421413741,
          a4 = -1.453152027,
          a5 = 1.061405429,
          p  = 0.3275911;

    const sign = x < 0 ? -1 : 1;
    const absX = Math.abs(x) / Math.SQRT2;

    const t = 1 / (1 + p * absX);
    const y =
      1 -
      (((((a5*t + a4)*t + a3)*t + a2)*t + a1)*t) *
        Math.exp(-absX*absX);

    return 0.5 * (1 + sign * y);
  }

  // Adaptive Simpson integrator
  function adaptiveSimpson(f, a, b, eps, maxDepth) {
    function simpson(f, a, b) {
      const c = 0.5 * (a + b);
      const h = b - a;
      return (h/6) * (f(a) + 4*f(c) + f(b));
    }
    function recurse(f, a, b, eps, whole, depth) {
      const c = 0.5 * (a + b);
      const left = simpson(f, a, c);
      const right = simpson(f, c, b);
      const delta = left + right - whole;

      if (depth <= 0 || Math.abs(delta) < 15*eps)
        return left + right + delta/15;

      return recurse(f, a, c, eps/2, left, depth-1) +
             recurse(f, c, b, eps/2, right, depth-1);
    }

    const initial = simpson(f, a, b);
    return recurse(f, a, b, eps, initial, maxDepth);
  }

  // ====================================================================
  // 1. Exponential Power / Generalized Normal (symmetric)
  // ====================================================================

  function alphaFromSigma(sigma, beta) {
    const g1 = gammaLanczos(1 / beta);
    const g3 = gammaLanczos(3 / beta);
    return sigma * Math.sqrt(g1 / g3);
  }

  function expPowerNormConst(alpha, beta) {
    return beta / (2 * alpha * gammaLanczos(1 / beta));
  }

  jStat.expPower = {

    pdf: function(x, mu, sigma, beta) {
      if (sigma <= 0) throw new Error("sigma must be > 0");
      if (beta  <= 0) throw new Error("beta must be > 0");

      const alpha = alphaFromSigma(sigma, beta);
      const A = expPowerNormConst(alpha, beta);

      const z = Math.abs((x - mu) / alpha);
      return A * Math.exp(-Math.pow(z, beta));
    },

    cdf: function(x, mu, sigma, beta, opts) {
      const options  = opts || {};
      const L        = options.L        || 10;
      const eps      = options.eps      || 1e-6;
      const maxDepth = options.maxDepth || 12;

      const lower = mu - L * sigma;
      const upper = mu + L * sigma;

      if (x <= lower) return 0;

      if (x >= upper) {
        const tail = adaptiveSimpson(
          (t) => jStat.expPower.pdf(t, mu, sigma, beta),
          x, upper, eps, maxDepth
        );
        return Math.max(0, Math.min(1, 1 - tail));
      }

      const val = adaptiveSimpson(
        (t) => jStat.expPower.pdf(t, mu, sigma, beta),
        lower, x, eps, maxDepth
      );

      return Math.max(0, Math.min(1, val));
    },

    sample: function(n, mu, sigma, beta, opts) {
      const options  = opts || {};
      const L        = options.L        || 10;
      const eps      = options.eps      || 1e-5;
      const maxIter  = options.maxIter  || 60;

      const lower = mu - L * sigma;
      const upper = mu + L * sigma;

      const out = new Array(n);

      for (let i = 0; i < n; i++) {
        const u = Math.random();
        let a = lower, b = upper, mid;

        for (let iter = 0; iter < maxIter; iter++) {
          mid = 0.5 * (a + b);
          const cmid = jStat.expPower.cdf(mid, mu, sigma, beta, options);
          if (Math.abs(cmid - u) < eps) break;
          if (cmid < u) a = mid;
          else          b = mid;
        }
        out[i] = mid;
      }

      return out;
    }

  };

  // ====================================================================
  // 2. Skew Exponential Power (Azzalini SEP2)
  // ====================================================================

  // Normalization constant C_psi
  function Cpsi(psi) {
    const twoPsi = 2 * psi;
    const exponent = 1 / (2*psi) - 1;
    const powTerm = Math.pow(twoPsi, exponent);
    const gammaTerm = gammaLanczos(1 / (2 * psi));
    return 1 / (2 * powTerm * gammaTerm);
  }

  function sep2PdfStandard(z, alpha, psi, cPsi) {
    const absZ = Math.abs(z);
    const base = cPsi * Math.exp(-Math.pow(absZ, 2*psi) / (2*psi));

    const az = alpha * z;
    const absAz = Math.abs(az);
    const signAz = az === 0 ? 0 : (az > 0 ? 1 : -1);

    const skewArg =
      signAz * Math.pow(absAz, psi) / Math.sqrt(psi);

    return 2 * base * normalCdf(skewArg);
  }

  jStat.sep2 = {

    pdf: function(x, mu, sigma, alpha, psi) {
      if (sigma <= 0) throw new Error("sigma must be > 0");
      if (psi   <= 0) throw new Error("psi must be > 0");

      const z = (x - mu) / sigma;
      const cPsi = Cpsi(psi);

      const dStandard = sep2PdfStandard(z, alpha, psi, cPsi);
      return dStandard / sigma;
    },

    cdf: function(x, mu, sigma, alpha, psi, opts) {
      const options  = opts || {};
      const L        = options.L        || 10;
      const eps      = options.eps      || 1e-6;
      const maxDepth = options.maxDepth || 12;

      const lower = mu - L * sigma;
      const upper = mu + L * sigma;

      if (x <= lower) return 0;

      if (x >= upper) {
        const tail = adaptiveSimpson(
          (t) => jStat.sep2.pdf(t, mu, sigma, alpha, psi),
          x, upper, eps, maxDepth
        );
        return Math.max(0, Math.min(1, 1 - tail));
      }

      const val = adaptiveSimpson(
        (t) => jStat.sep2.pdf(t, mu, sigma, alpha, psi),
        lower, x, eps, maxDepth
      );

      return Math.max(0, Math.min(1, val));
    },

    sample: function(n, mu, sigma, alpha, psi, opts) {
      const options  = opts || {};
      const L        = options.L        || 10;
      const eps      = options.eps      || 1e-5;
      const maxIter  = options.maxIter  || 60;

      const lower = mu - L * sigma;
      const upper = mu + L * sigma;

      const out = new Array(n);

      for (let i = 0; i < n; i++) {
        const u = Math.random();
        let a = lower, b = upper, mid;

        for (let iter = 0; iter < maxIter; iter++) {
          mid = 0.5 * (a + b);
          const cmid = jStat.sep2.cdf(mid, mu, sigma, alpha, psi, options);
          if (Math.abs(cmid - u) < eps) break;
          if (cmid < u) a = mid;
          else          b = mid;
        }

        out[i] = mid;
      }

      return out;
    }

  };

})(jStat);

// ======================================================================
// End of jstat_extra.js
// ======================================================================