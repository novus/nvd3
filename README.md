
## Latest version of nvd3 can be found here as the original project was abandoned.

Sadly the original developer of nvd3 has long since moved on to other things, and the
last maintainer said he does not have time anymore.  Thanks to both of them for all the
great work put into the project thus far, and with the magic of open source licensing
we can keep on improving it!

Latest version is 1.5.17 ( [view](https://github.com/liquidpele/nvd3/tree/1.5.17/build) | [zip](https://github.com/liquidpele/nvd3/zipball/1.5.17) | [tar.gz](https://github.com/liquidpele/nvd3/tarball/1.5.17) )

You can demo the examples here:  http://liquidpele.github.io/nvd3/

---

# Current development focus

- Clean things up
- Merge in pull requests and bugfixes

---

# Contributing

If one of [the existing models](https://github.com/liquidpele/nvd3/tree/development/src/models)
doesn't meet your needs, fork the project, implement the model and an example using it,
send us a pull request, for consideration for inclusion in the project.

Make sure you commit your changes to the development branch and not master!

We cannot honor all pull requests, but we will review all of them.

Please do not aggregate pull requests. Aggregated pull requests are actually more difficult to review.

---

## Building latest

1. First check out the testing branch, e.g.:  git clone https://github.com/liquidpele/nvd3.git
2. make sure nodejs is installed via your system's package manager.
3. have node download it's required modules with:  npm install
4. build with:  grunt production

You should now have a "build" directory with the js and css files within.

---

## Supported Browsers
NVD3 runs best on WebKit based browsers.

* Google Chrome: latest version
* Opera 15+ (i.e. webkit version)
* Safari: latest version
* Firefox: latest version
* Internet Explorer: 10+
