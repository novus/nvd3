## NVD3 - A reusable D3 charting library

Inspired by the work of [Mike Bostock](http://bost.ocks.org/mike/chart/)

**Big thanks to [nvd3-community](https://github.com/nvd3-community/nvd3/) for helping to maintain the library and improve documentation.
Novus has decided to keep the library in sync with what is in nvd3-community master.**

[View Examples](http://nvd3-community.github.io/nvd3/) | [NEW Documentation!](http://nvd3-community.github.io/nvd3/examples/documentation.html)

**D3 Versioning Note**

NVD3 should work with the latest d3.js (version 3.5), but I did notice that the interactive guideline tooltip was broken for d3.js 3.5.  Changing it to d3.js 3.3.13 fixes it. This will need to be investigated.

**1.7.1** Changes:

* Fixed axis.staggerLabels bug.
* Fixed Karma unit tests.
* Fixed chart test pages.
* Merged in nvd3-community changes and development branch.

**1.7.0** Changes:

* Fixes around 20 small bugs.
* Fixed the notorious slowness of line charts and scatter plots on chrome
* Combined the scatterChart and scatterChartWithLines models
* Combined the linePlusBarChart and linePlusBarChartWithFocus models.
* renamed some of the options (see the new documentation for what options are available for each chart)
* Completed the migration of the option functions to an object format which allows the generation of
the documentation in an automated way.  Not everything has a description yet, but check it out!
* Added extra options to the donut charts based on features that will be in d3 3.5.  The donut example page
loads the latest d3 from their 3.5 branch so keep that in mind.
* Added an example of the parallelCoordinates chart.
* Fixed up the half-done OHLC bar chart, and made an example for it as well.

**1.6.0** Changes:

* includes about a dozen bug fixes and pull requests I fixed and merged in
from the issues/pulls from the original project.
* It also standardized all indention

---

# Current development focus
- For Novus, review outstanding pull requests and issues.
- Try to find an easy way to actually document usage and all chart options.
- Improve the testing framework.
- Setup continuous integration.

---

# Bugs

Found a bug?  Check out the **development** branch and make sure it's not already fixed first!

---

# Contributing

If one of [the existing models](https://github.com/nvd3-community/nvd3/tree/development/src/models)
doesn't meet your needs, fork the project, implement the model and an example using it,
send us a pull request, for consideration for inclusion in the project.

If you'd like to contribute consistently, show me what you've got with some good pull requests and you may get added to the nvd3-community org!

### A few rules for pull requests

1. Please commit to the "development" branch
2. Do NOT check in anything under the "build" directory, it clutters up the commit and just gets overwritten later.

If you want to test your changes using the example pages,
you'll have to run "grunt production" to build the items into the "build" directory.
You must do this before your changes show up in the examples, as they link to the build directory
in order to properly show off the finished product.
Please remember to NOT include the build files in your commit though,
only include the source files you changed!

### Tips for Testing
* Unit tests were written in Karma and Mocha. Follow instructions in ** Building Latest ** to get npm packages setup. This may not work on Windows machines.
* Run 'grunt' to start the unit tests.
* Also visually inspect the HTML pages in the **examples/ and test/ folders**.  Make sure there are no glaring errors.

---

## Building latest

1. First clone the repository and checkout the "development" branch
2. make sure nodejs is installed via your system's package manager.

> have node download it's required modules with:  npm install

> install grunt globally:  sudo npm install -g grunt

> build with:  grunt production

You should now have a "build" directory with the js and css files within.

---

## Supported Browsers
NVD3 runs best on WebKit based browsers.

* Google Chrome: latest version
* Opera 15+ (i.e. webkit version)
* Safari: latest version
* Firefox: latest version
* Internet Explorer: 10+
