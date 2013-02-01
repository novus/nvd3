Please see Novus' official statement on nvd3 with an explanation,
apology, and commitment to its permanent status as an open-source
project.
[http://nvd3.org/statement.html](http://nvd3.org/statement.html)

# nvd3 - v0.0.1

A reusable chart library for d3.JS.

Currently in an early stage of development, but will be a very active project.  It may change quite a bit from its current state, but will always try to follow the style in which d3.js was done.

You can also check out the [examples page](http://nvd3.org/ghpages/examples.html)

---

If one of [the existing models](https://github.com/novus/nvd3/tree/master/src/models) doesn't meet your needs, fork the project, implement the model and an example using it, send us a pull request, for consideration for inclusion in the project.

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

**We ask that you DO NOT minify pull requests... 
If you need to minify please build pull request in separate branch, and
merge and minify in yout master.

## (Officially) Supported Browsers

* Chrome latest version (preferred)
* Firefox latest version
* Safari latest version
* Internet Explorer 9 and 10
