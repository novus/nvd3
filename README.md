Please see Novus' official statement on nvd3 with an explanation,
apology, and commitment to its permanent status as an open-source
project.
[http://nvd3.org/statement.html](http://nvd3.org/statement.html)

# nvd3 - v1.0.0-beta 

A reusable chart library for d3.JS.

NVD3 may change from its current state, but will always try to follow the style of d3.js.

You can also check out the [examples page](http://nvd3.org/ghpages/examples.html)

---

# Current development focus

- Error bars in bar charts
- Unifying common API functions between charts
- Bug fixes all around

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

We are currently changing our branch structure so that master will be gauranteed stable. In addition, there is now a "development" branch. This branch reflects the latest changes to nvd3 and is not necessarily stable.

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
    grunt watch # watch file changes in src/, and rebuild nv.d3.js, it's very helpful when delevop nvd3
    grunt lint # run jshint on src/**/*.js

**We ask that you DO NOT minify pull requests... 
If you need to minify please build pull request in separate branch, and
merge and minify in your master.

## Supported Browsers

* Chrome latest version (preferred)
* Firefox latest version
* Safari latest version
* Internet Explorer 9 and 10
* (unofficially) Opera 15+.

