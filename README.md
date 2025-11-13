# ROC_curves

[open in Github Pages](https://rmhorton.github.io/ROC_curves/)

* Slide decks
  - "Intro_to_ROC_curves.pptx" contains the slides from my presentation at the SF Bay ACM Data Science Camp, 2016.
  - "Six ways to think about ROC curves" was presented to the Bay Area R User Group (BARUG) in November 2020.


* HTML prototypes of interactive visualizations to add to the [TurtleROC](https://github.com/rmhorton/TurtleROC) package:

	- [Turtle Path](turtle_path/turtle_path.html)
		+ [Turtle Path User Manual](https://github.com/rmhorton/ROC_curves/blob/master/turtle_path/turtle_user_manual.md)
  		+ [Turtle Path Configuration Manual](https://github.com/rmhorton/ROC_curves/blob/master/turtle_path/turtle_configuration_manual.md)
	- [Continuous ROC curves](continuous_ROC/continuous_ROC.html) based on the cumulative probability distribution functions for positive and negative cases.
		+ [user guide](continuous_ROC/continuous_ROC_user_guide.html), including notes on possible features and improvements to this app.
	- [ROC Utility](ROC_utility/ROC_utility.html) app showing cost-based utility on the background of the ROC plane.
	- [Wilcoxon-Mann-Whitney U statistic meetos AUC](U_stat_meets_AUC_with_sounds.html)
	- [Probabilistic interpretation](probabilistic_roc_sampling.html) of AUC
	
* [Tutorial](JAGS_ROC_Tutorial.html) (written by ChatGPT) on stochastic Bayesian modelling of ROC curves in JAGS and R.


## To Do

* Turtle plots: "What would the ROC curve look like for beads sorted like this?" Show bead sorting, either as one line, or separated by color.
