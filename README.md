# NVD3 - v2.0.0-0
## Release notes for version 2.0.0 dev
* Major internal refactoring, with minimal API changes but many extensions.

## Overview
A reusable chart library for d3.js.

NVD3 may change from its current state, but will always try to follow the style of d3.js.

You can also check out the [examples page](http://nvd3.org/ghpages/examples.html).
**Note:** The examples on nvd3.org are against 1.15.0-beta.  For examples on how to use 2.0.0 NVD3, please checkout the **examples/** directory in the repository, though it's mostly small chanages to the APi.

---

# Current development focus

- Refactor to a more sane chart structure.
  - **Composable**: Unify common API functions between charts.
  - **Reliable**: Impose an automated testing scheme.
  - **Extensible**:
  - **Testable**: While testing charts and interactions is some ways off, there is an extensive test suite ensuring the API is exported correctly.
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

---

## Running tests, Minifying your fork:

### Using Grunt

You can use grunt instead of makefile to build js file. See more about [grunt](http://gruntjs.com/).
***[Nodejs](http://nodejs.org/) must be installed before you can use grunt.***
Run `npm install` in root dir to install grunt and its dependencies.

Then, you can use these commands:

    grunt # run tests and build nv.d3.js
    grunt production # build nv.d3.js and nv.d3.min.js
    grunt watch # watch file changes in src/, and rebuild nv.d3.js
    grunt lint # run jshint on src/**/*.js

**We ask that you DO NOT minify pull requests!**

If you need to minify please build in separate branch, it's best to run a dev branch with a pull request to novus/nvd3, and a branch with those changes to build from.

## Supported Browsers
NVD3 runs best on WebKit based browsers.
(We will remove this caveat as we begin testing on other browsers.)

* **Google Chrome: latest version (preferred)**
* **Opera 15+ (preferred)**
* Safari: latest version
* Firefox: latest version
* Internet Explorer: 9 and 10
