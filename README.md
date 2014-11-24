
## Latest version of nvd3 can be found here as the original project was abandoned.

Sadly the [original developer](https://github.com/bobmonteverde) of nvd3 has long since moved on to other things, and the
[last maintainer](https://github.com/robinfhu) said he does not have time anymore.  Thanks to both of them for all the
great work put into the project thus far, and with the magic of open source licensing
we can keep on improving it!

Latest version is 1.6.0 ( [view](https://github.com/liquidpele/nvd3/tree/1.6.0/build) | [zip](https://github.com/liquidpele/nvd3/zipball/1.6.0) | [tar.gz](https://github.com/liquidpele/nvd3/tarball/1.6.0) )

This new 1.6.x version includes about a dozen bug fixes and pull requests I fixed and merged in
from the issues/pulls from the original project.  It also standardized all indention and added
some new features to the pie charts.

You can demo the examples here:  http://liquidpele.github.io/nvd3/

**NOTE**: The announced 2.0.0 refactor from the original project was never finished and wasn't brought over.
Robin suggested I start with his development branch, which I did.

---

# Current development focus

- Merge in pull requests and bugfixes
- Add new and interesting concepts
- Try to find an easy way to actually document usage and all chart options

---

# Contributing

If one of [the existing models](https://github.com/liquidpele/nvd3/tree/development/src/models)
doesn't meet your needs, fork the project, implement the model and an example using it,
send us a pull request, for consideration for inclusion in the project.

**A few rules for pull requests to help my sanity ;)**

1. Please commit to the "development" branch
2. ONLY edit things under the "src" and "examples" directories!
3. Do NOT check in anything under the "build" directory, it clutters up the commit and just gets overwritten later.

If you want to test your changes using the example pages,
you'll have to run "grunt production" to build the items into the "build" directory.
You must do this before your changes show up in the examples, as they link to the build directory
in order to properly show off the finished product.
Please remember to NOT include the build files in your commit though,
only include the source files you changed!

I'll do my best to review all pull requests within a few days.

---

## Building latest

1. First clone the repository and checkout the "development" branch
2. make sure nodejs is installed via your system's package manager.
3. have node download it's required modules with:  npm install
4. install grunt globally:  sudo npm install -g grunt
5. build with:  grunt production

You should now have a "build" directory with the js and css files within.

---

## Supported Browsers
NVD3 runs best on WebKit based browsers.

* Google Chrome: latest version
* Opera 15+ (i.e. webkit version)
* Safari: latest version
* Firefox: latest version
* Internet Explorer: 10+
