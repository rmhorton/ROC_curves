const STRINGS = {
  pageTitle: "Continuous ROC Explorer",
  introText: "Select distributions for positives and negatives and adjust their parameters. The ROC curve is computed from the CDFs (no sampling).",
  controls: {
    positivesTitle: "Positives",
    negativesTitle: "Negatives",
    distributionLabel: "Distribution:",
    thresholdDisplay: "Threshold:",
    thresholdInputLabel: "Set exact threshold:",
    prevalenceLabel: "Prevalence:",
    prevalenceValue: (value) => value.toFixed(2),
    thresholdValue: (value) => value.toFixed(2)
  },
  plots: {
    scoreTitle: "Score Distributions",
    scoreXAxis: "Score",
    scoreYAxis: "Density",
    rocTitle: (auc) => `ROC Curve (AUC=${auc.toFixed(3)})`,
    rocXAxis: "False Positive Rate",
    rocYAxis: "True Positive Rate"
  },
  metrics: {
    thresholdHint: "Drag the vertical line on the score distributions chart or the point on the ROC curve.",
    confusionHeader: ["Sensitivity", "Specificity"],
    prevalenceHeader: ["PPV", "NPV", "Accuracy"],
    areaTooltips: {
      tp: "True Positives: positives scoring ≥ threshold",
      fn: "False Negatives: positives scoring < threshold",
      tn: "True Negatives: negatives scoring < threshold",
      fp: "False Positives: negatives scoring ≥ threshold"
    },
    thresholdHandleTooltip: (value) => `Threshold: ${value.toFixed(3)}`
  },
  multi: {
    addComponent: "Add component",
    removeComponent: "Remove",
    componentLabel: (idx) => `Component ${idx + 1}`,
    weight: "Weight"
  }
};

const FEATURES = {
  allowMultiComponents: true,
  maxComponents: 4,
  defaultComponents: 1,
  enforceWeightSum: true
};

const DISTRIBUTIONS = {
  normal: {
    label: "Normal",
    supportsMulti: true,
    parameters: [
      { id: "mean", label: "Mean", type: "number", value: 0, step: 0.1 },
      { id: "sd", label: "SD", type: "number", value: 1, step: 0.1, min: 0.001 }
    ],
    pdf: (params, x) => jStat.normal.pdf(x, params.mean, params.sd),
    cdf: (params, x) => jStat.normal.cdf(x, params.mean, params.sd),
    domain: (params) => [params.mean - 4 * params.sd, params.mean + 4 * params.sd]
  },
  beta: {
    label: "Beta",
    supportsMulti: true,
    parameters: [
      { id: "a", label: "α", type: "number", value: 2, step: 0.1, min: 0.001 },
      { id: "b", label: "β", type: "number", value: 2, step: 0.1, min: 0.001 }
    ],
    pdf: (params, x) => jStat.beta.pdf(x, params.a, params.b),
    cdf: (params, x) => jStat.beta.cdf(x, params.a, params.b),
    domain: () => [0, 1]
  },
  betaMeanPrecision: {
    label: "Beta (mean/precision)",
    supportsMulti: true,
    parameters: [
      { id: "mean", label: "Mean", type: "number", value: 0.5, step: 0.01, min: 0.001, max: 0.999 },
      { id: "precision", label: "Precision", type: "number", value: 4, step: 0.1, min: 0.1 }
    ],
    mapper: (params) => {
      const mean = Math.min(Math.max(params.mean, 1e-6), 1 - 1e-6);
      const precision = Math.max(params.precision, 1e-6);
      return { a: mean * precision, b: (1 - mean) * precision };
    },
    pdf: (params, x) => jStat.beta.pdf(x, params.a, params.b),
    cdf: (params, x) => jStat.beta.cdf(x, params.a, params.b),
    domain: () => [0, 1]
  },
  exponential: {
    label: "Exponential",
    supportsMulti: true,
    parameters: [
      { id: "lambda", label: "λ", type: "number", value: 1, step: 0.1, min: 0.001 }
    ],
    pdf: (params, x) => jStat.exponential.pdf(x, params.lambda),
    cdf: (params, x) => jStat.exponential.cdf(x, params.lambda),
    domain: (params) => {
      const lambda = Math.max(params.lambda, 0.001);
      return [0, Math.max(-Math.log(1 - 0.999) / lambda, 5 / lambda)];
    }
  },
  gamma: {
    label: "Gamma",
    supportsMulti: true,
    parameters: [
      { id: "k", label: "k (shape)", type: "number", value: 2, step: 0.1, min: 0.001 },
      { id: "theta", label: "θ (scale)", type: "number", value: 1, step: 0.1, min: 0.001 }
    ],
    pdf: (params, x) => jStat.gamma.pdf(x, params.k, params.theta),
    cdf: (params, x) => jStat.gamma.cdf(x, params.k, params.theta),
    domain: (params) => {
      const defaultUpper = 5 * params.k * params.theta;
      const inv = jStat.gamma.inv;
      try {
        const upper = inv ? inv(0.999, params.k, params.theta) : defaultUpper;
        return [0, Number.isFinite(upper) && upper > 0 ? upper : defaultUpper];
      } catch (err) {
        return [0, defaultUpper];
      }
    }
  },
  chisq: {
    label: "Chi-Squared",
    supportsMulti: true,
    parameters: [
      { id: "df", label: "df", type: "number", value: 4, step: 0.1, min: 0.5 }
    ],
    pdf: (params, x) => jStat.chisquare.pdf(x, params.df),
    cdf: (params, x) => jStat.chisquare.cdf(x, params.df),
    domain: (params) => {
      const df = Math.max(params.df, 0.5);
      const approx = Math.max(df + 10 * Math.sqrt(Math.max(df, 1)), 10);
      try {
        const upper = jStat.chisquare.inv(0.999, df);
        return [0, Number.isFinite(upper) && upper > 0 ? upper : approx];
      } catch (err) {
        return [0, approx];
      }
    }
  },
  studentT: {
    label: "Student t",
    supportsMulti: true,
    parameters: [
      {
        id: "mu",
        label: "μ (location)",
        type: "number",
        value: 0,
        step: 0.1,
        slider: { min: -15, max: 15, step: 0.1 }
      },
      {
        id: "sigma",
        label: "σ (scale)",
        type: "number",
        value: 1,
        step: 0.1,
        min: 0.05,
        slider: { min: 0.1, max: 10, step: 0.05 }
      },
      {
        id: "nu",
        label: "ν (df)",
        type: "number",
        value: 5,
        step: 0.1,
        min: 1,
        alias: ["df"],
        slider: { min: 1, max: 40, step: 0.1 }
      }
    ],
    pdf: (params, x) => {
      const sigma = Math.max(Number(params.sigma) || 0, 1e-6);
      const nuRaw = Number(params.nu);
      const mu = Number(params.mu) || 0;
      if(Number.isFinite(nuRaw) && nuRaw <= 1.01){
        return jStat.cauchy.pdf(x, mu, sigma);
      }
      const nu = Math.max(nuRaw || 0, 1.01);
      const z = (x - mu) / sigma;
      return jStat.studentt.pdf(z, nu) / sigma;
    },
    cdf: (params, x) => {
      const sigma = Math.max(Number(params.sigma) || 0, 1e-6);
      const nuRaw = Number(params.nu);
      const mu = Number(params.mu) || 0;
      if(Number.isFinite(nuRaw) && nuRaw <= 1.01){
        return jStat.cauchy.cdf(x, mu, sigma);
      }
      const nu = Math.max(nuRaw || 0, 1.01);
      const z = (x - mu) / sigma;
      return jStat.studentt.cdf(z, nu);
    },
    domain: (params) => {
      const sigma = Math.max(Number(params.sigma) || 0, 1e-6);
      const nuRaw = Number(params.nu);
      const mu = Number(params.mu) || 0;
      if(Number.isFinite(nuRaw) && nuRaw <= 1.01){
        const span = 10 * sigma;
        return [mu - span, mu + span];
      }
      const nu = Math.max(nuRaw || 0, 1.01);
      try {
        const lowerZ = jStat.studentt.inv(0.001, nu);
        const upperZ = jStat.studentt.inv(0.999, nu);
        if(Number.isFinite(lowerZ) && Number.isFinite(upperZ) && lowerZ < upperZ){
          const lower = mu + sigma * lowerZ;
          const upper = mu + sigma * upperZ;
          if(Number.isFinite(lower) && Number.isFinite(upper) && lower < upper){
            return [lower, upper];
          }
        }
      } catch (err) {}
      const span = 10 * sigma;
      return [mu - span, mu + span];
    }
  },
  weibull: {
    label: "Weibull",
    supportsMulti: true,
    parameters: [
      { id: "k", label: "Shape (k)", type: "number", value: 2, step: 0.1, min: 0.001 },
      { id: "lambda", label: "Scale (λ)", type: "number", value: 1, step: 0.1, min: 0.001 }
    ],
    pdf: (params, x) => jStat.weibull.pdf(x, params.k, params.lambda),
    cdf: (params, x) => jStat.weibull.cdf(x, params.k, params.lambda),
    domain: (params) => {
      const upper = params.lambda * Math.pow(-Math.log(1 - 0.999), 1 / params.k);
      const fallback = params.lambda * 5;
      return [0, Number.isFinite(upper) && upper > 0 ? Math.max(upper, fallback) : fallback];
    }
  },
  uniform: {
    label: "Uniform",
    supportsMulti: true,
    parameters: [
      { id: "a", label: "Min", type: "number", value: 0, step: 0.1 },
      { id: "b", label: "Max", type: "number", value: 1, step: 0.1 }
    ],
    pdf: (params, x) => jStat.uniform.pdf(x, params.a, params.b),
    cdf: (params, x) => jStat.uniform.cdf(x, params.a, params.b),
    domain: (params) => {
      let min = Number(params.a);
      let max = Number(params.b);
      if(!Number.isFinite(min)){min = 0;}
      if(!Number.isFinite(max)){max = min + 1;}
      if(min >= max){max = min + 1;}
      return [min, max];
    }
  }
};

const DISTRIBUTION_ORDER = [
  "normal",
  "beta",
  "betaMeanPrecision",
  "exponential",
  "gamma",
  "chisq",
  "studentT",
  "weibull",
  "uniform"
];

const DEFAULT_OPTIONS = {
  positives: {
    distribution: "normal",
    parameters: { mean: 0, sd: 1 },
    components: [{ distribution: "normal", weight: 1, parameters: { mean: 12.0, sd: 1 } }]
  },
  negatives: {
    distribution: "normal",
    parameters: { mean: 0, sd: 1 },
    components: [{ distribution: "normal", weight: 1, parameters: { mean: 10.0, sd: 1 } }]
  },
  threshold: 11.0,
  prevalence: 0.5,
  dataImported: false,
  importedDataFilename: null,
  importedSampleCount: 0,
  showSampledData: false,
  autoResample: false
};

window.MULTIDISTRIBUTION_CONFIG = {
  STRINGS,
  FEATURES,
  DISTRIBUTIONS,
  DISTRIBUTION_ORDER,
  DEFAULT_OPTIONS
};
