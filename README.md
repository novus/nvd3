# NVD3 - v1.1.10-beta
## Release notes for version 1.1.10 beta
* Line charts now have a new tooltip option available. This new tooltip displays all series information at once, and shows up anywhere your mouse moves.
To enable, set **useInteractiveGuideline** to true. See examples in the **test/** directory for how this tooltip works.
* New test pages have been created for various kinds of charts. They live in the **test/** directory. The goal of these test pages is to aid
in regression testing coverage when changes are made to charts.
* Pie charts accept data in a different way, and if you update to version 1.1, **your pie charts will break**. See the pie chart examples for how
data should be properly passed in. It's a very simple change.
* Pie charts can now accept a 'labelType' property. 
* Tooltip transitions are **turned off** by default, if you update to the latest nv.d3.css.  To bring them back, add a 'with-transitions' CSS class
to the containing chart DIV.
* Stacked area charts have transitions again. Duration is controlled via a 'transitionDuration' property.
* Line, cumulative, scatter, multi bar and discrete bar charts also have the 'transitionDuration' property.
* Issue #127: Adding ability to override individual scatter plot point colors.
* Issue #216: Exposing xRange and yRange overrides for all charts.
* Issue #168: Adding legend.radioButtonMode(). When set to true, legend click behavior will match those of radio buttons.
* Line stroke-width has been reduced to 1.5px, from 2.5px.
* Hover points on line and stacked area charts are now a small solid dot, instead of a large ring.
* Added Multibar chart property "groupSpacing".
* Charts now have a method called "options()", where you can pass in chart configurations via an object.
* examples/index.html page created, for quick access to all NVD3 examples and test pages.

## Overview
A reusable chart library for d3.js.

NVD3 may change from its current state, but will always try to follow the style of d3.js.

You can also check out the [examples page](http://nvd3.org/ghpages/examples.html).
**Note:** The examples on nvd3.org are outdated.  For examples on how to use the latest NVD3, please checkout the **examples/** directory in the repository.

---

# Current development focus

- Getting documentation up.
- Unifying common API functions between charts.
- Bug fixes that come up.

---

# Installation Instructions

`d3.v3.js` is a dependency of `nv.d3.js`. Be sure to include in in your project, then:  
Add a script tag to include `nv.d3.js` OR `nv.d3.min.js` in your project.  
Also add a link to the `nv.d3.css` file.

See wiki -> Documentation for more detail

---

If one of [the existing models](https://github.com/novus/nvd3/tree/master/src/models) doesn't meet your needs, fork the project, implement the model and an example using it, send us a pull request, for consideration for inclusion in the project.

We cannot honor all pull requests, but we will review all of them.

Please do not aggregate pull requests. Aggregated pull requests are actually more difficult to review.

We are currently changing our branch structure so that master will be gauranteed stable. In addition, there is now a "development" branch. This branch reflects the latest changes to NVD3 and is not necessarily stable.

---

Minifying your fork:

The Makefile requires [UglifyJS](https://github.com/mishoo/UglifyJS).

The easiest way to install is to install via npm. Run `npm install
uglify-js` from your home directory, then add the output from `npm bin`
into your path so that you have access to `uglifyjs` from the command
line (remember to restart your terminal window when adding to the path.)

Once you have `uglifyjs` command available, running `make` from your
fork's root directory will rebuild both `nv.d3.js` and `nv.d3.min.js`.

Without UglifyJS, you won't get the minified version when running make.

## use grunt

You can use grunt insteadof makefile to build js file. See more about [grunt](http://gruntjs.com/).
***[Nodejs](http://nodejs.org/) must be installed before you can use grunt.***
Run `npm install` in root dir to install grunt and it's dependencies.

Then, you can use these commands:

    grunt # build nv.d3.js
    grunt production # build nv.d3.js and nv.d3.min.js
    grunt watch # watch file changes in src/, and rebuild nv.d3.js, it's very helpful when delevop NVD3
    grunt lint # run jshint on src/**/*.js

**We ask that you DO NOT minify pull requests... 
If you need to minify please build pull request in separate branch, and
merge and minify in your master.

## Supported Browsers
NVD3 runs best on WebKit based browsers. 

* **Google Chrome: latest version (preferred)**
* **Opera 15+ (preferred)**
* Safari: latest version
* Firefox: latest version
* Internet Explorer: 9 and 10
