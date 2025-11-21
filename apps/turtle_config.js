const STRINGS = {
  pageTitle: "Turtle Path ROC Curve",
  datasetLabel: "Dataset:",
  control: {
    play: "Play",
    pause: "Pause"
  },
  confusion: {
    actual: "Actual",
    predicted: "Predicted",
    trueLabel: "True",
    falseLabel: "False",
    title: "Confusion Matrix"
  },
  tooltip: {
    start: "Start of ROC curve",
    score: "Score",
    positiveSingular: "positive",
    positivePlural: "positives",
    negativeSingular: "negative",
    negativePlural: "negatives",
    separator: " | "
  },
  datasets: {
    testSetA: "Test Set A",
    testSetB: "Test Set B",
    testSetC: "Test Set C",
    testSetD: "Test Set D"
  },
  axes: {
    xLabel: "False Positive Rate", // for "Specificity", also change LAYOUT.axes.direction to "rtl"
    yLabel: "True Positive Rate"
  },
  legend: {
    title: "Legend",
    positive: "Positive case",
    negative: "Negative case",
    tie: "Tie (equal scores)",
    areaBelow: "Cells below ROC",
    areaAbove: "Cells above ROC",
    areaTie: "Cells in tie region",
    aucPartial: "AUC (partial)",
    aucFinal: "AUC"
  },
  plot: {
    title: "The Turtle Finds its Way"
  },
  cursor: {
    label: "Cursor:",
    optionNone: "None",
    optionCircle: "Circle",
    optionSquare: "Square"
  }
};

const PALETTE = {
  pointStroke: "#000000",
  shapeStroke: "#000000",
  positive: "#0077ff",
  negative: "#d62728",
  tie: "#7c3aed",
  tieRegionFill: "#ff9900",
  originFill: "#000000",
  originStroke: "#000000",
  baselineStroke: "#000000",
  turtleStroke: "#228b22",
  tableBorder: "#000000",
  tableHeaderBg: "#f0f0f0",
  matrixPositiveBg: "#add8e6",
  matrixNegativeBg: "#ffc0cb",
  panelBg: "#ffffff",
  panelBorder: "#000000",
  controlBg: "#f2f2f2",
  controlBorder: "#777777",
  panelShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
  plotBackground: "#c6fafaff",
  gridBackground: "#ffffffff",
  gridLine: "#bbbbbb",
  rocStroke: "#0077ff",
  areaBelowCurve: "#ffeeaa",
  areaAboveCurve: "#ff3333"
};

const DATASETS = {
  testSetA: {
    scores: [20,19,18,17,16,15,14,13,11.5,11.5,10,9,8,7,6,5,4,3,2,1],
    labels: [1,1,1,1,0,1,1,0,1,0,1,0,1,0,0,1,0,0,0,0]
  },
  testSetB: {
    scores: [20,19,18,17,16,15,14,13,11.5,11.5,9.5,9.5,8,7,6,5,4,3,2,1],
    labels: [1,1,1,1,1,1,1,0,1,0,1,0,1,0,0,1,0,0,0,0]
  },
  testSetC: {
    scores: [50,49,48,47,46,45,44,43,42,41,35,35,35,35,35,35,35,35,35,35,25,25,25,25,25,25,25,25,25,25,25,25,25,25,25,25,25,25,25,25,10,9,8,7,6,5,4,3,2,1],
    labels: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
  },
  testSetD: {
    scores: Array.from({ length: 100 }, (_, i) => 100 - i),
    labels: Array.from({ length: 100 }, (_, i) => (i < 40 ? 1 : 0))
  }
};

const DATASET_ORDER = ["testSetA", "testSetB", "testSetC", "testSetD"];

const LAYOUT = {
  margin: { top: 30, right: 30, bottom: 60, left: 70 },
  symbolSizes: {
    originRadius: 7,
    positiveRadius: 11,
    negativeRadius: 13,
    tieSize: 22,
    turtleRadius: 12
  },
  opacities: {
    idle: 0.2
  },
  animation: {
    stepDelay: 600,
    resetDelay: 1000
  },
  layoutOffsets: {
    confusionQuadrantX: 0.75,
    confusionQuadrantY: 0.92,
    minPadding: 10
  },
  grid: {
    lineWidth: 1,
    showOuterBorder: true,
    axisLabelOffset: 45,
    enabled: true
  },
  turtle: {
    shape: "square",
    size: 36,
    strokeWidth: 2,
    useSvgCursor: true,
    svgUrl: "cursors/turtle.svg",
    svgOffsetX: 0,
    svgOffsetY: 0,
    rotateWithPath: true,
    defaultOption: "cursors/turtle.svg",
    availableOptions: [
      { label: "Turtle", value: "cursors/turtle.svg" },
      { label: "Star", value: "cursors/star.svg" },
      { label: "Arrow", value: "cursors/arrow.svg" },
      { label: "Smiley", value: "cursors/smiley.svg" }
    ]
  },
  axes: {
    xDirection: "ltr" // "rtl" for Specificity
  },
  controls: {
    showPlayPause: true,
    showDatasetSelector: true,
    showCursorSelector: true,
    showConfusionMatrix: true,
    showLegend: true,
    showPartialAuc: false
  }
};
