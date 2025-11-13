# ROC_curves

* Slide decks
  - "Intro_to_ROC_curves.pptx" contains the slides from my presentation at the SF Bay ACM Data Science Camp, 2016.
  - "Six ways to think about ROC curves" was presented to the Bay Area R User Group (BARUG) in November 2020.


* HTML prototypes of interactive visualizations to add to the [TurtleROC](https://github.com/rmhorton/TurtleROC) package:

	- [Continuous ROC curves](https://github.com/rmhorton/ROC_curves/blob/master/multi_distribution_roc.html) based on the cumulative probability distribution functions for positive and negative cases.
		+ [Notes](https://github.com/rmhorton/ROC_curves/blob/master/multi_distribution_roc_discussion.md) on possible features and improvements to this app.
	- [Wilcoxon-Mann-Whitney U statistic meetos AUC](https://github.com/rmhorton/ROC_curves/blob/master/U_stat_meets_AUC_with_sounds.html)
	- [Probabilistic interpretation](https://github.com/rmhorton/ROC_curves/blob/master/probabilistic_roc_sampling.html) of AUC
	- [ROC Utility](ROC_utility/ROC_utility.html) app showing cost-based utility on the background of the ROC plane.
	
* [ChatGPT-written tutorial](https://github.com/rmhorton/ROC_curves/blob/master/JAGS_ROC_Tutorial.Rmd) on stochastic Bayesian modelling of ROC curves in JAGS and R. There is an [HTML version](https://github.com/rmhorton/ROC_curves/blob/master/JAGS_ROC_Tutorial.html) if you just to read it without running it first.


## To Do

* Turtle plots: "What would the ROC curve look like for beads sorted like this?" Show bead sorting, either as one line, or separated by color.
