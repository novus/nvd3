# NVD3 - v1.2.0-beta
## Release notes for version 1.2.0 beta
* Major internal refactoring, with no API changes.

## Overview
A reusable chart library for d3.js.

NVD3 may change from its current state, but will always try to follow the style of d3.js.

You can also check out the [examples page](http://nvd3.org/ghpages/examples.html).
**Note:** The examples on nvd3.org are outdated.  For examples on how to use the latest NVD3, please checkout the **examples/** directory in the repository.

---

# Current development focus

- Refactor to a more sane chart structure.
  - **Composable**: Unify common API functions between charts.
  - **Reliable**: Impose an automated testing scheme.
  - **Extensible**:
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

## Minifying your fork:

### Using Grunt

You can use grunt instead of makefile to build js file. See more about [grunt](http://gruntjs.com/).
***[Nodejs](http://nodejs.org/) must be installed before you can use grunt.***
Run `npm install` in root dir to install grunt and it's dependencies.

Then, you can use these commands:

    grunt # build nv.d3.js
    grunt production # build nv.d3.js and nv.d3.min.js
    grunt watch # watch file changes in src/, and rebuild nv.d3.js, it's very helpful when delevop NVD3
    grunt lint # run jshint on src/**/*.js

**We ask that you DO NOT minify pull requests!**
If you need to minify please build pull request in separate branch, and
merge and minify in your master.

## Supported Browsers
NVD3 runs best on WebKit based browsers.
(We will remove this caveat as we begin testing on other browsers.)

* **Google Chrome: latest version (preferred)**
* **Opera 15+ (preferred)**
* Safari: latest version
* Firefox: latest version
* Internet Explorer: 9 and 10
