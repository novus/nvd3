

/*
Gets the browser window size

Returns object with height and width properties
 */
nv.utils.windowSize = function() {
    // Sane defaults
    var size = {width: 640, height: 480};

    // Earlier IE uses Doc.body
    if (document.body && document.body.offsetWidth) {
        size.width = document.body.offsetWidth;
        size.height = document.body.offsetHeight;
    }

    // IE can use depending on mode it is in
    if (document.compatMode=='CSS1Compat' &&
        document.documentElement &&
        document.documentElement.offsetWidth ) {

        size.width = document.documentElement.offsetWidth;
        size.height = document.documentElement.offsetHeight;
    }

    // Most recent browsers use
    if (window.innerWidth && window.innerHeight) {
        size.width = window.innerWidth;
        size.height = window.innerHeight;
    }
    return (size);
};


/*
Binds callback function to run when window is resized
 */
nv.utils.windowResize = function(handler) {
    if (window.addEventListener) {
        window.addEventListener('resize', handler);
    } else {
        nv.log("ERROR: Failed to bind to window.resize with: ", handler);
    }
    // return object with clear function to remove the single added callback.
    return {
        callback: handler,
        clear: function() {
            window.removeEventListener('resize', handler);
        }
    }
};


/*
Backwards compatible way to implement more d3-like coloring of graphs.
If passed an array, wrap it in a function which implements the old behavior
Else return what was passed in
*/
nv.utils.getColor = function(color) {
    //if you pass in nothing, get default colors back
    if (!arguments.length) {
        return nv.utils.defaultColor();

    //if passed an array, wrap it in a function
    } else if(color instanceof Array) {
        return function(d, i) { return d.color || color[i % color.length]; };

    //if passed a function, return the function, or whatever it may be
    //external libs, such as angularjs-nvd3-directives use this
    } else {
        //can't really help it if someone passes rubbish as color
        return color;
    }
};


/*
Default color chooser uses the index of an object as before.
 */
nv.utils.defaultColor = function() {
    var colors = d3.scale.category20().range();
    return function(d, i) {
        return d.color || colors[i % colors.length]
    };
};


/*
Returns a color function that takes the result of 'getKey' for each series and
looks for a corresponding color from the dictionary
*/
nv.utils.customTheme = function(dictionary, getKey, defaultColors) {
    // use default series.key if getKey is undefined
    getKey = getKey || function(series) { return series.key };
    defaultColors = defaultColors || d3.scale.category20().range();

    // start at end of default color list and walk back to index 0
    var defIndex = defaultColors.length;

    return function(series, index) {
        var key = getKey(series);
        if (typeof dictionary[key] === 'function') {
            return dictionary[key]();
        } else if (dictionary[key] !== undefined) {
            return dictionary[key];
        } else {
            // no match in dictionary, use a default color
            if (!defIndex) {
                // used all the default colors, start over
                defIndex = defaultColors.length;
            }
            defIndex = defIndex - 1;
            return defaultColors[defIndex];
        }
    };
};


/*
From the PJAX example on d3js.org, while this is not really directly needed
it's a very cool method for doing pjax, I may expand upon it a little bit,
open to suggestions on anything that may be useful
*/
nv.utils.pjax = function(links, content) {

    var load = function(href) {
        d3.html(href, function(fragment) {
            var target = d3.select(content).node();
            target.parentNode.replaceChild(
                d3.select(fragment).select(content).node(),
                target);
            nv.utils.pjax(links, content);
        });
    };

    d3.selectAll(links).on("click", function() {
        history.pushState(this.href, this.textContent, this.href);
        load(this.href);
        d3.event.preventDefault();
    });

    d3.select(window).on("popstate", function() {
        if (d3.event.state) {
            load(d3.event.state);
        }
    });
};


/*
For when we want to approximate the width in pixels for an SVG:text element.
Most common instance is when the element is in a display:none; container.
Forumla is : text.length * font-size * constant_factor
*/
nv.utils.calcApproxTextWidth = function (svgTextElem) {
    if (typeof svgTextElem.style === 'function'
        && typeof svgTextElem.text === 'function') {

        var fontSize = parseInt(svgTextElem.style("font-size").replace("px",""));
        var textLength = svgTextElem.text().length;
        return textLength * fontSize * 0.5;
    }
    return 0;
};


/*
Numbers that are undefined, null or NaN, convert them to zeros.
*/
nv.utils.NaNtoZero = function(n) {
    if (typeof n !== 'number'
        || isNaN(n)
        || n === null
        || n === Infinity
        || n === -Infinity) {

        return 0;
    }
    return n;
};

/*
Add a way to watch for d3 transition ends to d3
*/
d3.selection.prototype.watchTransition = function(renderWatch){
    var args = [this].concat([].slice.call(arguments, 1));
    return renderWatch.transition.apply(renderWatch, args);
};


/*
Helper object to watch when d3 has rendered something
*/
nv.utils.renderWatch = function(dispatch, duration) {
    if (!(this instanceof nv.utils.renderWatch)) {
        return new nv.utils.renderWatch(dispatch, duration);
    }

    var _duration = duration !== undefined ? duration : 250;
    var renderStack = [];
    var self = this;

    this.models = function(models) {
        models = [].slice.call(arguments, 0);
        models.forEach(function(model){
            model.__rendered = false;
            (function(m){
                m.dispatch.on('renderEnd', function(arg){
                    m.__rendered = true;
                    self.renderEnd('model');
                });
            })(model);

            if (renderStack.indexOf(model) < 0) {
                renderStack.push(model);
            }
        });
    return this;
    };

    this.reset = function(duration) {
        if (duration !== undefined) {
            _duration = duration;
        }
        renderStack = [];
    };

    this.transition = function(selection, args, duration) {
        args = arguments.length > 1 ? [].slice.call(arguments, 1) : [];

        if (args.length > 1) {
            duration = args.pop();
        } else {
            duration = _duration !== undefined ? _duration : 250;
        }
        selection.__rendered = false;

        if (renderStack.indexOf(selection) < 0) {
            renderStack.push(selection);
        }

        if (duration === 0) {
            selection.__rendered = true;
            selection.delay = function() { return this; };
            selection.duration = function() { return this; };
            return selection;
        } else {
            if (selection.length === 0) {
                selection.__rendered = true;
            } else if (selection.every( function(d){ return !d.length; } )) {
                selection.__rendered = true;
            } else {
                selection.__rendered = false;
            }

            var n = 0;
            return selection
                .transition()
                .duration(duration)
                .each(function(){ ++n; })
                .each('end', function(d, i) {
                    if (--n === 0) {
                        selection.__rendered = true;
                        self.renderEnd.apply(this, args);
                    }
                });
        }
    };

    this.renderEnd = function() {
        if (renderStack.every( function(d){ return d.__rendered; } )) {
            renderStack.forEach( function(d){ d.__rendered = false; });
            dispatch.renderEnd.apply(this, arguments);
        }
    }

};


/*
Takes multiple objects and combines them into the first one (dst)
example:  nv.utils.deepExtend({a: 1}, {a: 2, b: 3}, {c: 4});
gives:  {a: 2, b: 3, c: 4}
*/
nv.utils.deepExtend = function(dst){
    var sources = arguments.length > 1 ? [].slice.call(arguments, 1) : [];
    sources.forEach(function(source) {
        for (key in source) {
            var isArray = dst[key] instanceof Array;
            var isObject = typeof dst[key] === 'object';
            var srcObj = typeof source[key] === 'object';

            if (isObject && !isArray && srcObj) {
                nv.utils.deepExtend(dst[key], source[key]);
            } else {
                dst[key] = source[key];
            }
        }
    });
};


/*
state utility object, used to track d3 states in the models
*/
nv.utils.state = function(){
    if (!(this instanceof nv.utils.state)) {
        return new nv.utils.state();
    }
    var state = {};
    var _self = this;
    var _setState = function(){};
    var _getState = function(){ return {}; };
    var init = null;
    var changed = null;

    this.dispatch = d3.dispatch('change', 'set');

    this.dispatch.on('set', function(state){
        _setState(state, true);
    });

    this.getter = function(fn){
        _getState = fn;
        return this;
    };

    this.setter = function(fn, callback) {
        if (!callback) {
            callback = function(){};
        }
        _setState = function(state, update){
            fn(state);
            if (update) {
                callback();
            }
        };
        return this;
    };

    this.init = function(state){
        init = init || {};
        nv.utils.deepExtend(init, state);
    };

    var _set = function(){
        var settings = _getState();

        if (JSON.stringify(settings) === JSON.stringify(state)) {
            return false;
        }

        for (var key in settings) {
            if (state[key] === undefined) {
                state[key] = {};
            }
            state[key] = settings[key];
            changed = true;
        }
        return true;
    };

    this.update = function(){
        if (init) {
            _setState(init, false);
            init = null;
        }
        if (_set.call(this)) {
            this.dispatch.change(state);
        }
    };

};


/*
Snippet of code you can insert into each nv.models.* to give you the ability to
do things like:
chart.options({
  showXAxis: true,
  tooltips: true
});

To enable in the chart:
chart.options = nv.utils.optionsFunc.bind(chart);
*/
nv.utils.optionsFunc = function(args) {
    nv.deprecated('nv.utils.optionsFunc');
    if (args) {
        d3.map(args).forEach((function(key,value) {
            if (typeof this[key] === "function") {
                this[key](value);
            }
        }).bind(this));
    }
    return this;
};


/*
numTicks:  requested number of ticks
data:  the chart data

returns the number of ticks to actually use on X axis, based on chart data
to avoid duplicate ticks with the same value
*/
nv.utils.calcTicksX = function(numTicks, data) {
    // find max number of values from all data streams
    var numValues = 1;
    var i = 0;
    for (i; i < data.length; i += 1) {
        var stream_len = data[i] && data[i].values ? data[i].values.length : 0;
        numValues = stream_len > numValues ? stream_len : numValues;
    }
    nv.log("Requested number of ticks: ", numTicks);
    nv.log("Calculated max values to be: ", numValues);
    // make sure we don't have more ticks than values to avoid duplicates
    numTicks = numTicks > numValues ? numTicks = numValues - 1 : numTicks;
    // make sure we have at least one tick
    numTicks = numTicks < 1 ? 1 : numTicks;
    // make sure it's an integer
    numTicks = Math.floor(numTicks);
    nv.log("Calculating tick count as: ", numTicks);
    return numTicks;
};


/*
returns number of ticks to actually use on Y axis, based on chart data
*/
nv.utils.calcTicksY = function(numTicks, data) {
    // currently uses the same logic but we can adjust here if needed later
    return nv.utils.calcTicksX(numTicks, data);
};


/*
Add a particular option from an options object onto chart
Options exposed on a chart are a getter/setter function that returns chart
on set to mimic typical d3 option chaining, e.g. svg.option1('a').option2('b');

option objects should be generated via Object.create() to provide
the option of manipulating data via get/set functions.
*/
nv.utils.initOption = function(chart, name) {
    // if it's a call option, just call it directly, otherwise do get/set
    if (chart._calls && chart._calls[name]) {
        chart[name] = chart._calls[name];
    } else {
        chart[name] = function (_) {
            if (!arguments.length) return chart._options[name];
            chart._options[name] = _;
            return chart;
        };
    }
};


/*
Add all options in an options object to the chart
*/
nv.utils.initOptions = function(chart) {
    var ops = Object.getOwnPropertyNames(chart._options || {});
    var calls = Object.getOwnPropertyNames(chart._calls || {});
    ops = ops.concat(calls);
    for (var i in ops) {
        nv.utils.initOption(chart, ops[i]);
    }
};


/*
Inherit options from a D3 object
d3.rebind makes calling the function on target actually call it on source
Also use _d3options so we can track what we inherit for documentation and chained inheritance
*/
nv.utils.inheritOptionsD3 = function(target, d3_source, oplist) {
    target._d3options = oplist.concat(target._d3options || []);
    oplist.unshift(d3_source);
    oplist.unshift(target);
    d3.rebind.apply(this, oplist);
};

/*
Inherit option getter/setter functions from source to target
d3.rebind makes calling the function on target actually call it on source
Also track via _inherited and _d3options so we can track what we inherit
for documentation generation purposes and chained inheritance
*/
nv.utils.inheritOptions = function(target, source) {
    // inherit all the things
    var ops = Object.getOwnPropertyNames(source._options || {});
    var calls = Object.getOwnPropertyNames(source._calls || {});
    var inherited = source._inherited || [];
    var d3ops = source._d3options || [];
    var args = ops.concat(calls).concat(inherited).concat(d3ops);
    args.unshift(source);
    args.unshift(target);
    d3.rebind.apply(this, args);
    // pass along the lists to keep track of them!
    target._inherited = ops.concat(calls).concat(target._inherited || []);
    target._d3options = d3ops.concat(target._d3options || []);
};


/*
Runs common initialize code on the svg before the chart builds
*/
nv.utils.initSVG = function(svg) {
    svg.classed({'nvd3-svg':true});
};