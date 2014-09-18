
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



// Easy way to bind multiple functions to window.onresize
// TODO: give a way to remove a function after its bound, other than removing all of them
nv.utils.windowResize = function(fun){
  if (fun === undefined) return;
  var oldresize = window.onresize;

  window.onresize = function(e) {
    if (typeof oldresize == 'function') oldresize(e);
    fun(e);
  }
}

// Backwards compatible way to implement more d3-like coloring of graphs.
// If passed an array, wrap it in a function which implements the old default
// behavior
nv.utils.getColor = function(color) {
    if (!arguments.length) return nv.utils.defaultColor(); //if you pass in nothing, get default colors back

    if( Object.prototype.toString.call( color ) === '[object Array]' )
        return function(d, i) { return d.color || color[i % color.length]; };
    else
        return color;
        //can't really help it if someone passes rubbish as color
}

// Default color chooser uses the index of an object as before.
nv.utils.defaultColor = function() {
    var colors = d3.scale.category20().range();
    return function(d, i) { return d.color || colors[i % colors.length] };
}


// Returns a color function that takes the result of 'getKey' for each series and
// looks for a corresponding color from the dictionary,
nv.utils.customTheme = function(dictionary, getKey, defaultColors) {
  getKey = getKey || function(series) { return series.key }; // use default series.key if getKey is undefined
  defaultColors = defaultColors || d3.scale.category20().range(); //default color function

  var defIndex = defaultColors.length; //current default color (going in reverse)

  return function(series, index) {
    var key = getKey(series);

    if (!defIndex) defIndex = defaultColors.length; //used all the default colors, start over

    if (typeof dictionary[key] !== "undefined")
      return (typeof dictionary[key] === "function") ? dictionary[key]() : dictionary[key];
    else
      return defaultColors[--defIndex]; // no match in dictionary, use default color
  }
}



// From the PJAX example on d3js.org, while this is not really directly needed
// it's a very cool method for doing pjax, I may expand upon it a little bit,
// open to suggestions on anything that may be useful
nv.utils.pjax = function(links, content) {
  d3.selectAll(links).on("click", function() {
    history.pushState(this.href, this.textContent, this.href);
    load(this.href);
    d3.event.preventDefault();
  });

  function load(href) {
    d3.html(href, function(fragment) {
      var target = d3.select(content).node();
      target.parentNode.replaceChild(d3.select(fragment).select(content).node(), target);
      nv.utils.pjax(links, content);
    });
  }

  d3.select(window).on("popstate", function() {
    if (d3.event.state) load(d3.event.state);
  });
}

/* For situations where we want to approximate the width in pixels for an SVG:text element.
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

/* Numbers that are undefined, null or NaN, convert them to zeros.
*/
nv.utils.NaNtoZero = function(n) {
    if (typeof n !== 'number'
        || isNaN(n)
        || n === null
        || n === Infinity
        || n === -Infinity) return 0;

    return n;
};

// This utility class watches for d3 transition ends.

(function(){
  d3.selection.prototype.watchTransition = function(renderWatch){
    var args = [this].concat([].slice.call(arguments, 1));
    return renderWatch.transition.apply(renderWatch, args);
  }
})();

nv.utils.renderWatch = function(dispatch, duration) {
  if (!(this instanceof nv.utils.renderWatch))
    return new nv.utils.renderWatch(dispatch, duration);
  var _duration = duration !== undefined ? duration : 250;
  var renderStack = [];
  var self = this;
  this.models = function(models) {
    models = [].slice.call(arguments, 0);
    models.forEach(function(model){
      model.__rendered = false;
      (function(m){
        m.dispatch.on('renderEnd', function(arg){
          // nv.log('nv.utils renderEnd', arg);
          m.__rendered = true;
          self.renderEnd('model');
        });
      })(model);
      if (renderStack.indexOf(model) < 0)
        renderStack.push(model);
    });
    return this;
  }

  this.reset = function(duration) {
    if (duration !== undefined) _duration = duration;
    renderStack = [];
  }

  this.transition = function(selection, args, duration) {
    args = arguments.length > 1 ? [].slice.call(arguments, 1) : [];
    duration = args.length > 1 ? args.pop() :
               _duration !== undefined ? _duration :
               250;
    selection.__rendered = false;

    if (renderStack.indexOf(selection) < 0)
      renderStack.push(selection);

    if (duration === 0)
    {
      selection.__rendered = true;
      selection.delay = function(){return this;}
      selection.duration = function(){return this;}
      return selection;
    }
    else
    {
      selection.__rendered = selection.length === 0 ? true :
                             selection.every( function(d){ return !d.length; }) ? true :
                             false;
      var n = 0;
      return selection
        .transition()
        .duration(duration)
        .each(function(){ ++n; })
        .each('end', function(d, i){
          if (--n === 0)
          {
            selection.__rendered = true;
            self.renderEnd.apply(this, args);
          }
        });
    }
  };

  this.renderEnd = function() {
    if (renderStack.every( function(d){ return d.__rendered; } ))
    {
      renderStack.forEach( function(d){ d.__rendered = false; });
      dispatch.renderEnd.apply(this, arguments);
    }
  }

};


nv.utils.deepExtend = function(dst){
  var sources = arguments.length > 1 ? [].slice.call(arguments, 1) : [];
  sources.forEach(function(source) {
    for (key in source) {
      var isArray = dst[key] instanceof Array;
      var isObject = typeof dst[key] === 'object';
      var srcObj = typeof source[key] === 'object';
      if (isObject && !isArray && srcObj)
        nv.utils.deepExtend(dst[key], source[key]);
      else
        dst[key] = source[key];
    }
  });
}

// Chart state utility
nv.utils.state = function(){
  if (!(this instanceof nv.utils.state))
    return new nv.utils.state();
  var state = {},
    _self = this,
    _setState = function(){},
    _getState = function(){ return {};},
    init = null,
    changed = null;

  this.dispatch = d3.dispatch('change', 'set');

  this.dispatch.on('set', function(state){
    _setState(state, true);
  });

  this.getter = function(fn){
    _getState = fn;
    return this;
  };

  this.setter = function(fn, callback) {
    if (!callback) callback = function(){};
    _setState = function(state, update){
      fn(state);
      if (update) callback();
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
      if (state[key] === undefined) state[key] = {};
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
    if (_set.call(this))
      this.dispatch.change(state);
  }

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

