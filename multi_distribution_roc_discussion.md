# Other Probability Distributions to Consider for Educational ROC Apps

Expanding beyond Beta and Normal can make the app much more versatile for teaching **how score distributions affect ROC curves**. Here are some probability distributions that could be useful, along with comments on their applicability:

---

### 1. Normal (Gaussian)

* **Why useful:** The most common assumption in statistics and machine learning. Symmetric, bell-shaped distributions are easy to interpret.
* **Educational value:** Great baseline for teaching — helps students see how overlap in means or variances impacts ROC curves.
* **Real-world examples:** Heights, test scores, and measurement errors are often approximately Normal, making this distribution a natural starting point.

### 2. Logistic

* **Why useful:** Similar in shape to the Normal, but with heavier tails.
* **Educational value:** Helps illustrate how tail behavior influences misclassification at extreme thresholds. Useful for modeling logistic regression scores.
* **Real-world examples:** Logistic regression output probabilities, growth processes with saturation effects.

### 3. Exponential

* **Why useful:** Models skewed, positive-only variables (e.g., survival times, reaction times).
* **Educational value:** Shows how highly skewed distributions affect ROC curves, particularly when one class has a “long tail.”
* **Real-world examples:** Time until an event occurs, such as machine failure times, radioactive decay intervals, or call arrival times in telecommunication systems.

### 4. Gamma

* **Why useful:** Generalization of the Exponential; flexible for modeling skewed continuous outcomes (waiting times, rates).
* **Educational value:** Helps compare cases with different shapes — from exponential-like (shape ≈ 1) to near-normal (large shape).
* **Real-world examples:** Insurance claim sizes, rainfall amounts, and waiting times in queuing systems.

### 5. Uniform

* **Why useful:** Represents total lack of discrimination (flat distribution of scores).
* **Educational value:** Ideal as a “null” distribution to contrast with structured distributions. Leads to ROC curves close to the diagonal (random performance).
* **Real-world examples:** Random number generation, baseline null models, or when all outcomes are equally likely within a range.

### 6. Laplace (Double Exponential)

* **Why useful:** Symmetric but with a sharper peak and heavier tails than the Normal.
* **Educational value:** Highlights how concentrated central mass and long tails affect threshold sensitivity.
* **Real-world examples:** Modeling error terms with occasional large deviations, financial return data with higher kurtosis than the Normal.

### 7. Mixture distributions (e.g., a mixture of two Normals)

* **Why useful:** Models heterogeneity (e.g., two subpopulations within positives).
* **Educational value:** Demonstrates that real-world score distributions often have multimodal structure, and ROC curves can be more complex as a result.
* **Real-world examples:** In medical diagnostics, a disease-positive group may contain both early-stage and late-stage patients, producing two overlapping but distinct distributions of biomarker levels. In fraud detection, fraudulent transactions might split into low-value “testing” attempts and high-value “full” frauds, creating a bimodal score distribution. In image classification, positive cases may involve multiple object subtypes (e.g., different breeds of dogs) with differing classifier score profiles.

### 8. t-distribution

* **Why useful:** Like Normal but with heavier tails, controlled by degrees of freedom.
* **Educational value:** Another way to show robustness of ROC curves under heavy-tailed noise compared to Gaussian assumptions.
* **Real-world examples:** Small-sample inference in statistics (Student’s t-test), financial return series with heavy tails.

### 9. Chi-square

* **Why useful:** Non-negative, skewed, with varying shapes depending on degrees of freedom.
* **Educational value:** Demonstrates skewness effects and helps in teaching ROC analysis of “variance-type” statistics. Many statistical tests (e.g., tests based on sums of squared residuals, likelihood ratio tests, or ANOVA) produce test statistics that follow Chi-square distributions under the null hypothesis. By contrasting Chi-square distributions with different degrees of freedom for positives and negatives, students can see how ROC curves emerge when the discriminating statistic is itself variance-based. This makes Chi-square particularly relevant in teaching how classical hypothesis tests can be interpreted in ROC terms, connecting familiar inferential tools to classification theory.
* **Real-world examples:** Goodness-of-fit tests, independence tests in contingency tables, and variance tests in ANOVA.

### 10. Weibull

* **Why useful:** Flexible family widely used in survival analysis and reliability engineering.
* **Educational value:** Shows how shape parameters control skewness and tail behavior, affecting sensitivity/specificity trade-offs.
* **Real-world examples:** Modeling lifetimes of mechanical components, wind speed distributions, and survival times in biomedical studies.

---

## Summary of Applicability

* **Symmetric vs. skewed:** Normal vs. Exponential, Gamma, Weibull → illustrates ROC curve asymmetry.
* **Light-tailed vs. heavy-tailed:** Normal vs. Logistic, t, Laplace → shows threshold sensitivity in rare cases.
* **Simple vs. complex structure:** Uniform vs. Mixtures → illustrates random vs. heterogeneous predictive power.

---

# To Do

## Bob's Ideas

* Decide on additional distributions to include.
* Bullet-proof the distribution parameters (e.g., prevent negative values when they don't make sense)
* Add an option for alternative (m, k) parameterization of beta function: alpha = m * k; beta = (1 - m) * k
* Multi-language support?
	- Minimize in-app documentation
	- pass in a dictionary for labels
	- this iwill have the side effect of letting teachers decide on which synonyms they want to use (e.g., sensitivity instead of TPR).
* Better colors? What does it look like when a partially transparent false negative area overlaps a false positive area?
* D3 vs plotly (Plotly has built in pop up controls to take screenshot etc., maybe make that optional to reduce clutter?)
* compare in detail to the old [Kennis Research Shiny app](https://kennis-research.shinyapps.io/ROC-Curves/)

## ChatGPT's Ideas: Additional Feature Suggestions for the ROC Explorer

Here are some possible enhancements that could make the ROC Explorer app more educational and engaging:

---

### 1. Numerical Threshold Input
- Add a numeric input box synced with the threshold slider.
- Users could type exact threshold values instead of dragging the slider.

### 2. Confusion Matrix Visualization
- Show a **2×2 confusion matrix** table that updates live (TP, FP, TN, FN counts or proportions).
- Color-code the cells to match the shaded PDF regions.

### 3. Interactive ROC Exploration
- Let users drag the **threshold point on the ROC curve** itself, updating the slider and metrics automatically.
- Helps learners connect ROC geometry with thresholding directly.

### 4. Youden’s J Statistic and Optimal Threshold
- Compute **J = Sensitivity + Specificity – 1**.
- Highlight the threshold that maximizes J on both plots.
- Great for teaching about optimal cutoffs.

### 5. Cost-sensitive Metrics
- Add sliders for **cost of FP vs FN**.
- Compute expected loss (or utility) at the threshold and visualize it.
- Useful in medical/finance applications.

### 6. Distribution Overlay Options
- Checkbox to toggle **show/hide shaded TP/FP/TN/FN regions**.
- Option to normalize curves so that **areas correspond to class prevalence**.

### 7. Performance Summary Plots
- Show Sensitivity, Specificity, PPV, NPV as functions of threshold in a separate panel.
- Lets users see how each metric changes continuously.

### 8. Compare Multiple Models
- Allow saving ROC curves from multiple settings (different distributions) and overlay them.
- Helps illustrate model comparison with ROC curves and AUC.

### 9. Downloadable Reports
- Export the ROC curve and metrics tables as **CSV or PNG**.
- Useful for instructors preparing teaching materials.
