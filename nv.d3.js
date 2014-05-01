(function(){
var nv = window.nv || {};

nv.version = '1.1.15b';
nv.dev = true //set false when in production

window.nv = nv;

nv.tooltip = nv.tooltip || {}; // For the tooltip system
nv.utils = nv.utils || {}; // Utility subsystem
nv.models = nv.models || {}; //stores all the possible models/components
nv.charts = {}; //stores all the ready to use charts
nv.graphs = []; //stores all the graphs currently on the page
nv.logs = {}; //stores some statistics and potential error messages

nv.dispatch = d3.dispatch('render_start', 'render_end');

// *************************************************************************
// Function bind polyfill, from MDN
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/bind#Compatibility
if (!Function.prototype.bind) {
  Function.prototype.bind = function (oThis) {
    if (typeof this !== "function") {
      // closest thing possible to the ECMAScript 5 internal IsCallable function
      throw new TypeError("Function.prototype.bind - what is trying to be bound is not callable");
    }

    var aArgs = Array.prototype.slice.call(arguments, 1),
        fToBind = this,
        fNOP = function () {},
        fBound = function () {
          return fToBind.apply(this instanceof fNOP && oThis
                                 ? this
                                 : oThis,
                               aArgs.concat(Array.prototype.slice.call(arguments)));
        };

    fNOP.prototype = this.prototype;
    fBound.prototype = new fNOP();

    return fBound;
  };
}

// *************************************************************************
//  Development render timers - disabled if dev = false

if (nv.dev) {
  nv.dispatch.on('render_start', function() {
    nv.logs.startTime = +new Date();
  });

  nv.dispatch.on('render_end', function() {
    nv.logs.endTime = +new Date();
    nv.logs.totalTime = nv.logs.endTime - nv.logs.startTime;
    nv.log('total', nv.logs.totalTime); // used for development, to keep track of graph generation times
  });
}

// ********************************************
//  Public Core NV functions

// Logs all arguments, and returns the last so you can test things in place
// Note: in IE8 console.log is an object not a function, and if modernizr is used
// then calling Function.prototype.bind with with anything other than a function
// causes a TypeError to be thrown.
nv.log = function() {
  if (nv.dev && console.log && console.log.apply)
    console.log.apply(console, arguments);
  else if (nv.dev && typeof console.log == "function" && Function.prototype.bind) {
    var log = Function.prototype.bind.call(console.log, console);
    log.apply(console, arguments);
  }
  return arguments[arguments.length - 1];
};

nv.deprecated = function(name) {
  if (nv.dev && console && console.warn)
    console.warn('`' + name + '` has been deprecated.');
};


nv.render = function render(step) {
  step = step || 1; // number of graphs to generate in each timeout loop

  nv.render.active = true;
  nv.dispatch.render_start();

  setTimeout(function() {
    var chart, graph;

    for (var i = 0; i < step && (graph = nv.render.queue[i]); i++) {
      chart = graph.generate();
      if (typeof graph.callback == typeof(Function)) graph.callback(chart);
      nv.graphs.push(chart);
    }

    nv.render.queue.splice(0, i);

    if (nv.render.queue.length) setTimeout(arguments.callee, 0);
    else {
      nv.dispatch.render_end();
      nv.render.active = false;
    }
  }, 0);
};

nv.render.active = false;
nv.render.queue = [];

nv.addGraph = function(obj) {
  if (typeof arguments[0] === typeof(Function))
    obj = {generate: arguments[0], callback: arguments[1]};

  nv.render.queue.push(obj);

  if (!nv.render.active) nv.render();
};

nv.identity = function(d) { return d; };

nv.strip = function(s) { return s.replace(/(\s|&)/g,''); };

function daysInMonth(month,year) {
  return (new Date(year, month+1, 0)).getDate();
}

function d3_time_range(floor, step, number) {
  return function(t0, t1, dt) {
    var time = floor(t0), times = [];
    if (time < t0) step(time);
    if (dt > 1) {
      while (time < t1) {
        var date = new Date(+time);
        if ((number(date) % dt === 0)) times.push(date);
        step(time);
      }
    } else {
      while (time < t1) { times.push(new Date(+time)); step(time); }
    }
    return times;
  };
}

d3.time.monthEnd = function(date) {
  return new Date(date.getFullYear(), date.getMonth(), 0);
};

d3.time.monthEnds = d3_time_range(d3.time.monthEnd, function(date) {
    date.setUTCDate(date.getUTCDate() + 1);
    date.setDate(daysInMonth(date.getMonth() + 1, date.getFullYear()));
  }, function(date) {
    return date.getMonth();
  }
);

/* Utility class to handle creation of an interactive layer.
This places a rectangle on top of the chart. When you mouse move over it, it sends a dispatch
containing the X-coordinate. It can also render a vertical line where the mouse is located.

dispatch.elementMousemove is the important event to latch onto.  It is fired whenever the mouse moves over
the rectangle. The dispatch is given one object which contains the mouseX/Y location.
It also has 'pointXValue', which is the conversion of mouseX to the x-axis scale.
*/
nv.interactiveGuideline = function() {
	"use strict";
	var tooltip = nv.models.tooltip()
	//Public settings
	, width = null
	, height = null
    //Please pass in the bounding chart's top and left margins
    //This is important for calculating the correct mouseX/Y positions.
	, margin = {left: 0, top: 0}
	, xScale = d3.scale.linear()
	, yScale = d3.scale.linear()
	, dispatch = d3.dispatch('elementMousemove', 'elementMouseout','elementDblclick')
	, showGuideLine = true
	, svgContainer = null  
    //Must pass in the bounding chart's <svg> container.
    //The mousemove event is attached to this container.
	;

	//Private variables
	var isMSIE = navigator.userAgent.indexOf("MSIE") !== -1  //Check user-agent for Microsoft Internet Explorer.
	;

	function layer(selection) {
		selection.each(function(data) {

            var container = d3.select(this);

            var availableWidth = (width || 960), availableHeight = (height || 400);

            var wrap = container.selectAll("g.nv-wrap.nv-interactiveLineLayer").data([data]);
            var wrapEnter = wrap.enter()
                .append("g").attr("class", " nv-wrap nv-interactiveLineLayer");

            wrapEnter.append("g").attr("class","nv-interactiveGuideLine");

            if (!svgContainer) {
                return;
            }

            function mouseHandler() {
                var d3mouse = d3.mouse(this);
                var mouseX = d3mouse[0];
                var mouseY = d3mouse[1];
                var subtractMargin = true;
                var mouseOutAnyReason = false;
                if (isMSIE) {
                    /*
                     D3.js (or maybe SVG.getScreenCTM) has a nasty bug in Internet Explorer 10.
                     d3.mouse() returns incorrect X,Y mouse coordinates when mouse moving
                     over a rect in IE 10.
                     However, d3.event.offsetX/Y also returns the mouse coordinates
                     relative to the triggering <rect>. So we use offsetX/Y on IE.
                     */
                    mouseX = d3.event.offsetX;
                    mouseY = d3.event.offsetY;

                    /*
                     On IE, if you attach a mouse event listener to the <svg> container,
                     it will actually trigger it for all the child elements (like <path>, <circle>, etc).
                     When this happens on IE, the offsetX/Y is set to where ever the child element
                     is located.
                     As a result, we do NOT need to subtract margins to figure out the mouse X/Y
                     position under this scenario. Removing the line below *will* cause
                     the interactive layer to not work right on IE.
                     */
                    if(d3.event.target.tagName !== "svg")
                        subtractMargin = false;

                    if (d3.event.target.className.baseVal.match("nv-legend"))
                        mouseOutAnyReason = true;

                }

                if(subtractMargin) {
                    mouseX -= margin.left;
                    mouseY -= margin.top;
                }

                /* If mouseX/Y is outside of the chart's bounds,
                 trigger a mouseOut event.
                 */
                if (mouseX < 0 || mouseY < 0
                    || mouseX > availableWidth || mouseY > availableHeight
                    || (d3.event.relatedTarget && d3.event.relatedTarget.ownerSVGElement === undefined)
                    || mouseOutAnyReason
                    )
                {
                    if (isMSIE) {
                        if (d3.event.relatedTarget
                            && d3.event.relatedTarget.ownerSVGElement === undefined
                            && d3.event.relatedTarget.className.match(tooltip.nvPointerEventsClass)) {
                            return;
                        }
                    }
                    dispatch.elementMouseout({
                        mouseX: mouseX,
                        mouseY: mouseY
                    });
                    layer.renderGuideLine(null); //hide the guideline
                    return;
                }

                var pointXValue = xScale.invert(mouseX);
                dispatch.elementMousemove({
                    mouseX: mouseX,
                    mouseY: mouseY,
                    pointXValue: pointXValue
                });

                //If user double clicks the layer, fire a elementDblclick dispatch.
                if (d3.event.type === "dblclick") {
                    dispatch.elementDblclick({
                        mouseX: mouseX,
                        mouseY: mouseY,
                        pointXValue: pointXValue
                    });
                }
            }

            svgContainer
                .on("mousemove",mouseHandler, true)
                .on("mouseout" ,mouseHandler,true)
                .on("dblclick" ,mouseHandler)
            ;

            //Draws a vertical guideline at the given X postion.
            layer.renderGuideLine = function(x) {
                if (!showGuideLine) return;
                var line = wrap.select(".nv-interactiveGuideLine")
                    .selectAll("line")
                    .data((x != null) ? [nv.utils.NaNtoZero(x)] : [], String);

                line.enter()
                    .append("line")
                    .attr("class", "nv-guideline")
                    .attr("x1", function(d) { return d;})
                    .attr("x2", function(d) { return d;})
                    .attr("y1", availableHeight)
                    .attr("y2",0)
                ;
                line.exit().remove();

            }
		});
	}

	layer.dispatch = dispatch;
	layer.tooltip = tooltip;

	layer.margin = function(_) {
	    if (!arguments.length) return margin;
	    margin.top    = typeof _.top    != 'undefined' ? _.top    : margin.top;
	    margin.left   = typeof _.left   != 'undefined' ? _.left   : margin.left;
	    return layer;
    };

	layer.width = function(_) {
		if (!arguments.length) return width;
		width = _;
		return layer;
	};

	layer.height = function(_) {
		if (!arguments.length) return height;
		height = _;
		return layer;
	};

	layer.xScale = function(_) {
		if (!arguments.length) return xScale;
		xScale = _;
		return layer;
	};

	layer.showGuideLine = function(_) {
		if (!arguments.length) return showGuideLine;
		showGuideLine = _;
		return layer;
	};

	layer.svgContainer = function(_) {
		if (!arguments.length) return svgContainer;
		svgContainer = _;
		return layer;
	};

	return layer;
};

/* Utility class that uses d3.bisect to find the index in a given array, where a search value can be inserted.
This is different from normal bisectLeft; this function finds the nearest index to insert the search value.

For instance, lets say your array is [1,2,3,5,10,30], and you search for 28. 
Normal d3.bisectLeft will return 4, because 28 is inserted after the number 10.  But interactiveBisect will return 5
because 28 is closer to 30 than 10.

Unit tests can be found in: interactiveBisectTest.html

Has the following known issues:
   * Will not work if the data points move backwards (ie, 10,9,8,7, etc) or if the data points are in random order.
   * Won't work if there are duplicate x coordinate values.
*/
nv.interactiveBisect = function (values, searchVal, xAccessor) {
    "use strict";
    if (! values instanceof Array) return null;
    if (typeof xAccessor !== 'function')
        xAccessor = function(d) { return d.x };

    var bisect = d3.bisector(xAccessor).left;
    var index = d3.max([0, bisect(values,searchVal) - 1]);
    var currentValue = xAccessor(values[index], index);
    if (typeof currentValue === 'undefined') currentValue = index;

    if (currentValue === searchVal) return index;  //found exact match

    var nextIndex = d3.min([index+1, values.length - 1]);
    var nextValue = xAccessor(values[nextIndex], nextIndex);
    if (typeof nextValue === 'undefined') nextValue = nextIndex;

    if (Math.abs(nextValue - searchVal) >= Math.abs(currentValue - searchVal))
        return index;
    else
        return nextIndex
};

/*
Returns the index in the array "values" that is closest to searchVal.
Only returns an index if searchVal is within some "threshold".
Otherwise, returns null.
*/
nv.nearestValueIndex = function (values, searchVal, threshold) {
    "use strict";
    var yDistMax = Infinity, indexToHighlight = null;
    values.forEach(function(d,i) {
        var delta = Math.abs(searchVal - d);
        if ( delta <= yDistMax && delta < threshold) {
            yDistMax = delta;
            indexToHighlight = i;
        }
    });
    return indexToHighlight;
};/* Tooltip rendering model for nvd3 charts.
window.nv.models.tooltip is the updated,new way to render tooltips.

window.nv.tooltip.show is the old tooltip code.
window.nv.tooltip.* also has various helper methods.
*/
(function() {
  "use strict";
  window.nv.tooltip = {};

  /* Model which can be instantiated to handle tooltip rendering.
    Example usage:
    var tip = nv.models.tooltip().gravity('w').distance(23)
                .data(myDataObject);

        tip();    //just invoke the returned function to render tooltip.
  */
  window.nv.models.tooltip = function() {
        var content = null    //HTML contents of the tooltip.  If null, the content is generated via the data variable.
        , data = null     /* Tooltip data. If data is given in the proper format, a consistent tooltip is generated.
        Format of data:
        {
            key: "Date",
            value: "August 2009",
            series: [
                    {
                        key: "Series 1",
                        value: "Value 1",
                        color: "#000"
                    },
                    {
                        key: "Series 2",
                        value: "Value 2",
                        color: "#00f"
                    }
            ]

        }

        */
        , gravity = 'w'   //Can be 'n','s','e','w'. Determines how tooltip is positioned.
        , distance = 50   //Distance to offset tooltip from the mouse location.
        , snapDistance = 25   //Tolerance allowed before tooltip is moved from its current position (creates 'snapping' effect)
        , fixedTop = null //If not null, this fixes the top position of the tooltip.
        , classes = null  //Attaches additional CSS classes to the tooltip DIV that is created.
        , chartContainer = null   //Parent DIV, of the SVG Container that holds the chart.
        , tooltipElem = null  //actual DOM element representing the tooltip.
        , position = {left: null, top: null}      //Relative position of the tooltip inside chartContainer.
        , enabled = true  //True -> tooltips are rendered. False -> don't render tooltips.
        //Generates a unique id when you create a new tooltip() object
        , id = "nvtooltip-" + Math.floor(Math.random() * 100000)
        ;

        //CSS class to specify whether element should not have mouse events.
        var  nvPointerEventsClass = "nv-pointer-events-none";

        //Format function for the tooltip values column
        var valueFormatter = function(d) {
            return d;
        };

        //Format function for the tooltip header value.
        var headerFormatter = function(d) {
            return d;
        };

        //By default, the tooltip model renders a beautiful table inside a DIV.
        //You can override this function if a custom tooltip is desired.
        var contentGenerator = function(d) {
            if (content != null) return content;
            if (d == null) return '';
            var table = d3.select(document.createElement("table"));
            var theadEnter = table.selectAll("thead")
                .data([d])
                .enter().append("thead");
            theadEnter.append("tr")
                .append("td")
                .attr("colspan",3)
                .append("strong")
                    .classed("x-value",true)
                    .html(headerFormatter(d.value));
            var tbodyEnter = table.selectAll("tbody")
                .data([d])
                .enter().append("tbody");
            var trowEnter = tbodyEnter.selectAll("tr")
                .data(function(p) { return p.series})
                .enter()
                .append("tr")
                .classed("highlight", function(p) { return p.highlight})
                ;
            trowEnter.append("td")
                .classed("legend-color-guide",true)
                .append("div")
                    .style("background-color", function(p) { return p.color});
            trowEnter.append("td")
                .classed("key",true)
                .html(function(p) {return p.key});
            trowEnter.append("td")
                .classed("value",true)
                .html(function(p,i) { return valueFormatter(p.value,i) });

            trowEnter.selectAll("td").each(function(p) {
                if (p.highlight) {
                    var opacityScale = d3.scale.linear().domain([0,1]).range(["#fff",p.color]);
                    var opacity = 0.6;
                    d3.select(this)
                        .style("border-bottom-color", opacityScale(opacity))
                        .style("border-top-color", opacityScale(opacity))
                        ;
                }
            });
            var html = table.node().outerHTML;
            if (d.footer !== undefined)
                html += "<div class='footer'>" + d.footer + "</div>";
            return html;

        };

        var dataSeriesExists = function(d) {
            return d && d.series && d.series.length > 0;
        };

        //In situations where the chart is in a 'viewBox', re-position the tooltip based on how far chart is zoomed.
        function convertViewBoxRatio() {
            if (chartContainer) {
              var svg = d3.select(chartContainer);
              if (svg.node().tagName !== "svg") {
                 svg = svg.select("svg");
              }
              var viewBox = (svg.node()) ? svg.attr('viewBox') : null;
              if (viewBox) {
                viewBox = viewBox.split(' ');
                var ratio = parseInt(svg.style('width')) / viewBox[2];
                position.left = position.left * ratio;
                position.top  = position.top * ratio;
              }
            }
        }

        //Creates new tooltip container, or uses existing one on DOM.
        function getTooltipContainer(newContent) {
            var body;
            if (chartContainer)
                body = d3.select(chartContainer);
            else
                body = d3.select("body");

            var container = body.select(".nvtooltip");
            if (container.node() === null) {
                //Create new tooltip div if it doesn't exist on DOM.
                container = body.append("div")
                    .attr("class", "nvtooltip " + (classes? classes: "xy-tooltip"))
                    .attr("id",id)
                    ;
            }
            container.node().innerHTML = newContent;
            container.style("top",0).style("left",0).style("opacity",0);
            container.selectAll("div, table, td, tr").classed(nvPointerEventsClass,true);
            container.classed(nvPointerEventsClass,true);
            return container.node();
        }

        //Draw the tooltip onto the DOM.
        function nvtooltip() {
            if (!enabled) return;
            if (!dataSeriesExists(data)) return;

            convertViewBoxRatio();

            var left = position.left;
            var top = (fixedTop != null) ? fixedTop : position.top;
            var container = getTooltipContainer(contentGenerator(data));
            tooltipElem = container;
            if (chartContainer) {
                var svgComp = chartContainer.getElementsByTagName("svg")[0];
                var boundRect = (svgComp) ? svgComp.getBoundingClientRect() : chartContainer.getBoundingClientRect();
                var svgOffset = {left:0,top:0};
                if (svgComp) {
                    var svgBound = svgComp.getBoundingClientRect();
                    var chartBound = chartContainer.getBoundingClientRect();
                    var svgBoundTop = svgBound.top;

                    //Defensive code. Sometimes, svgBoundTop can be a really negative
                    //  number, like -134254. That's a bug.
                    //  If such a number is found, use zero instead. FireFox bug only
                    if (svgBoundTop < 0) {
                        var containerBound = chartContainer.getBoundingClientRect();
                        svgBoundTop = (Math.abs(svgBoundTop) > containerBound.height) ? 0 : svgBoundTop;
                    }
                    svgOffset.top = Math.abs(svgBoundTop - chartBound.top);
                    svgOffset.left = Math.abs(svgBound.left - chartBound.left);
                }
                //If the parent container is an overflow <div> with scrollbars, subtract the scroll offsets.
                //You need to also add any offset between the <svg> element and its containing <div>
                //Finally, add any offset of the containing <div> on the whole page.
                left += chartContainer.offsetLeft + svgOffset.left - 2*chartContainer.scrollLeft;
                top += chartContainer.offsetTop + svgOffset.top - 2*chartContainer.scrollTop;
            }

            if (snapDistance && snapDistance > 0) {
                top = Math.floor(top/snapDistance) * snapDistance;
            }

            nv.tooltip.calcTooltipPosition([left,top], gravity, distance, container);
            return nvtooltip;
        }

        nvtooltip.nvPointerEventsClass = nvPointerEventsClass;

        nvtooltip.content = function(_) {
            if (!arguments.length) return content;
            content = _;
            return nvtooltip;
        };

        //Returns tooltipElem...not able to set it.
        nvtooltip.tooltipElem = function() {
            return tooltipElem;
        };

        nvtooltip.contentGenerator = function(_) {
            if (!arguments.length) return contentGenerator;
            if (typeof _ === 'function')
                contentGenerator = _;
            return nvtooltip;
        };

        nvtooltip.data = function(_) {
            if (!arguments.length) return data;
            data = _;
            return nvtooltip;
        };

        nvtooltip.gravity = function(_) {
            if (!arguments.length) return gravity;
            gravity = _;
            return nvtooltip;
        };

        nvtooltip.distance = function(_) {
            if (!arguments.length) return distance;
            distance = _;
            return nvtooltip;
        };

        nvtooltip.snapDistance = function(_) {
            if (!arguments.length) return snapDistance;
            snapDistance = _;
            return nvtooltip;
        };

        nvtooltip.classes = function(_) {
            if (!arguments.length) return classes;
            classes = _;
            return nvtooltip;
        };

        nvtooltip.chartContainer = function(_) {
            if (!arguments.length) return chartContainer;
            chartContainer = _;
            return nvtooltip;
        };

        nvtooltip.position = function(_) {
            if (!arguments.length) return position;
            position.left = (typeof _.left !== 'undefined') ? _.left : position.left;
            position.top = (typeof _.top !== 'undefined') ? _.top : position.top;
            return nvtooltip;
        };

        nvtooltip.fixedTop = function(_) {
            if (!arguments.length) return fixedTop;
            fixedTop = _;
            return nvtooltip;
        };

        nvtooltip.enabled = function(_) {
            if (!arguments.length) return enabled;
            enabled = _;
            return nvtooltip;
        };

        nvtooltip.valueFormatter = function(_) {
            if (!arguments.length) return valueFormatter;
            if (typeof _ === 'function') {
                valueFormatter = _;
            }
            return nvtooltip;
        };

        nvtooltip.headerFormatter = function(_) {
            if (!arguments.length) return headerFormatter;
            if (typeof _ === 'function') {
                headerFormatter = _;
            }
            return nvtooltip;
        };

        //id() is a read-only function. You can't use it to set the id.
        nvtooltip.id = function() {
            return id;
        };

        return nvtooltip;
  };

  //Original tooltip.show function. Kept for backward compatibility.
  // pos = [left,top]
  nv.tooltip.show = function(pos, content, gravity, dist, parentContainer, classes) {
    //Create new tooltip div if it doesn't exist on DOM.
    var   container = document.createElement('div');
    container.className = 'nvtooltip ' + (classes ? classes : 'xy-tooltip');
    var body = parentContainer;
    if ( !parentContainer || parentContainer.tagName.match(/g|svg/i))
        //If the parent element is an SVG element, place tooltip in the <body> element.
        body = document.getElementsByTagName('body')[0];
    container.style.left = 0;
    container.style.top = 0;
    container.style.opacity = 0;
    container.innerHTML = content;
    // Content can also be dom element
    if (typeof content !== 'string')
        container.appendChild(content);
    else
        container.innerHTML = content;
    body.appendChild(container);
    //If the parent container is an overflow <div> with scrollbars, subtract the scroll offsets.
    if (parentContainer) {
        pos[0] = pos[0] - parentContainer.scrollLeft;
        pos[1] = pos[1] - parentContainer.scrollTop;
    }
    nv.tooltip.calcTooltipPosition(pos, gravity, dist, container);
  };

  //Looks up the ancestry of a DOM element, and returns the first NON-svg node.
  nv.tooltip.findFirstNonSVGParent = function(Elem) {
    while(Elem.tagName.match(/^g|svg$/i) !== null) {
      Elem = Elem.parentNode;
    }
    return Elem;
  };

  //Finds the total offsetTop of a given DOM element.
  //Looks up the entire ancestry of an element, up to the first relatively positioned element.
  nv.tooltip.findTotalOffsetTop = function ( Elem, initialTop ) {
    var offsetTop = initialTop;
      do {
        if( !isNaN( Elem.offsetTop ) ) {
          offsetTop += (Elem.offsetTop);
        }
      } while( Elem = Elem.offsetParent );
    return offsetTop;
  };

  //Finds the total offsetLeft of a given DOM element.
  //Looks up the entire ancestry of an element, up to the first relatively positioned element.
  nv.tooltip.findTotalOffsetLeft = function ( Elem, initialLeft) {
    var offsetLeft = initialLeft;
      do {
        if( !isNaN( Elem.offsetLeft ) ) {
          offsetLeft += (Elem.offsetLeft);
        }
      } while( Elem = Elem.offsetParent );
    return offsetLeft;
  };

  //Global utility function to render a tooltip on the DOM.
  //pos = [left,top] coordinates of where to place the tooltip, relative to the SVG chart container.
  //gravity = how to orient the tooltip
  //dist = how far away from the mouse to place tooltip
  //container = tooltip DIV
    nv.tooltip.calcTooltipPosition = function(pos, gravity, dist, container) {

        var height = parseInt(container.offsetHeight),
            width = parseInt(container.offsetWidth),
            windowWidth = nv.utils.windowSize().width,
            windowHeight = nv.utils.windowSize().height,
            scrollTop = window.pageYOffset,
            scrollLeft = window.pageXOffset,
            left, top;

        windowHeight = window.innerWidth >= document.body.scrollWidth ? windowHeight : windowHeight - 16;
        windowWidth = window.innerHeight >= document.body.scrollHeight ? windowWidth : windowWidth - 16;

        gravity = gravity || 's';
        dist = dist || 20;

        var tooltipTop = function ( Elem ) {
            return nv.tooltip.findTotalOffsetTop(Elem, top);
        };

        var tooltipLeft = function ( Elem ) {
            return nv.tooltip.findTotalOffsetLeft(Elem,left);
        };

        switch (gravity) {
            case 'e':
                left = pos[0] - width - dist;
                top = pos[1] - (height / 2);
                var tLeft = tooltipLeft(container);
                var tTop = tooltipTop(container);
                if (tLeft < scrollLeft) left = pos[0] + dist > scrollLeft ? pos[0] + dist : scrollLeft - tLeft + left;
                if (tTop < scrollTop) top = scrollTop - tTop + top;
                if (tTop + height > scrollTop + windowHeight) top = scrollTop + windowHeight - tTop + top - height;
                break;
            case 'w':
                left = pos[0] + dist;
                top = pos[1] - (height / 2);
                var tLeft = tooltipLeft(container);
                var tTop = tooltipTop(container);
                if (tLeft + width > windowWidth) left = pos[0] - width - dist;
                if (tTop < scrollTop) top = scrollTop + 5;
                if (tTop + height > scrollTop + windowHeight) top = scrollTop + windowHeight - tTop + top - height;
                break;
            case 'n':
                left = pos[0] - (width / 2) - 5;
                top = pos[1] + dist;
                var tLeft = tooltipLeft(container);
                var tTop = tooltipTop(container);
                if (tLeft < scrollLeft) left = scrollLeft + 5;
                if (tLeft + width > windowWidth) left = left - width/2 + 5;
                if (tTop + height > scrollTop + windowHeight) top = scrollTop + windowHeight - tTop + top - height;
                break;
            case 's':
                left = pos[0] - (width / 2);
                top = pos[1] - height - dist;
                var tLeft = tooltipLeft(container);
                var tTop = tooltipTop(container);
                if (tLeft < scrollLeft) left = scrollLeft + 5;
                if (tLeft + width > windowWidth) left = left - width/2 + 5;
                if (scrollTop > tTop) top = scrollTop;
                break;
            case 'none':
                left = pos[0];
                top = pos[1] - dist;
                var tLeft = tooltipLeft(container);
                var tTop = tooltipTop(container);
                break;
        }

        container.style.left = left+'px';
        container.style.top = top+'px';
        container.style.opacity = 1;
        container.style.position = 'absolute';

        return container;
    };

    //Global utility function to remove tooltips from the DOM.
    nv.tooltip.cleanup = function() {
        // Find the tooltips, mark them for removal by this class (so others cleanups won't find it)
        var tooltips = document.getElementsByClassName('nvtooltip'),
            purging = [];
        while( tooltips.length ) {
            purging.push(tooltips[0]);
            tooltips[0].style.transitionDelay = '0 !important';
            tooltips[0].style.opacity = 0;
            tooltips[0].className = 'nvtooltip-pending-removal';
        }
        setTimeout(function() {
            while (purging.length) {
                var removeMe = purging.pop();
                removeMe.parentNode.removeChild(removeMe);
            }
        }, 500);
    };

})();

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
};

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
};

// Default color chooser uses the index of an object as before.
nv.utils.defaultColor = function() {
    var colors = d3.scale.category20().range();
    return function(d, i) { return d.color || colors[i % colors.length] };
};


// Returns a color function that takes the result of 'getKey' for each series and
// looks for a corresponding color from the dictionary,
nv.utils.customTheme = function(dictionary, getKey, defaultColors) {
  getKey = getKey || function(series) { return series.key }; // use default series.key if getKey is undefined
  defaultColors = defaultColors || d3.scale.category20().range(); //default color function

  var defIndex = defaultColors.length; //current default color (going in reverse)

  return function(series) {
    var key = getKey(series);

    if (!defIndex) defIndex = defaultColors.length; //used all the default colors, start over

    if (typeof dictionary[key] !== "undefined")
      return (typeof dictionary[key] === "function") ? dictionary[key]() : dictionary[key];
    else
      return defaultColors[--defIndex]; // no match in dictionary, use default color
  }
};



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
};

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
        || n === Infinity)
        return 0;
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
        m.dispatch.on('renderEnd', function(){
          // nv.log('nv.utils renderEnd', arg);
          m.__rendered = true;
          self.renderEnd('model');
        });
      })(model);
      if (renderStack.indexOf(model) < 0)
        renderStack.push(model);
    });
    return this;
  };

  this.reset = function(duration) {
    if (duration !== undefined) _duration = duration;
    renderStack = [];
  };

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
      selection.delay = function(){return this;};
      selection.duration = function(){return this;};
      return selection;
    } else {
      selection.__rendered = selection.length === 0 ? true : selection.every( function(d){ return !d.length; }) ? true : false;
      var n = 0;
      return selection
        .transition()
        .duration(duration)
        .each(function(){ ++n; })
        .each('end', function(){
          if (--n === 0) {
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

// Chart state utility
nv.utils.state = function(){
  if (!(this instanceof nv.utils.state))
    return new nv.utils.state();
  var state = {};
  var _self = this;
  var _setState = function(){ return;};
  var _getState = function(){ return {};};

  init = null;

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
    init = state;
  };

  var _set = function(){
    var settings = _getState();
    if (JSON.stringify(settings) === JSON.stringify(state))
      return false;
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

/* Return a value if the value is defined and not null.
* Return defaultValue if the value is undefined or null.
*/
nv.utils.valueOrDefault = function(value, defaultValue){
    return ( value === undefined || value === null ) ? defaultValue : value ;
};

/**
 * Like d3's rebind, but taking function prototype considerations into account.
 *
 * Attaches a method on `dest` for each function name in `args` that will call
 * the `proto` method of that name with `source` as the `this` context, and pass
 * any arguments thru. It returns either the return value, or `dest` for chaining.
 */
nv.utils.rebindp = function(dest, source, proto, args){
    [].slice.call(arguments, 3).forEach(function(method){
        dest[method] = function(arg1){
            var ret = null;
            // Minor perf win for the 0, 1 arg versions
            // http://jsperf.com/test-call-vs-apply/34
            switch (arguments.length) {
              case 0:
                  ret = proto[method].call(source); break;
              case 1:
                  ret = proto[method].call(source, arg1); break;
              default:
                  ret = proto[method].apply(source, arguments)
            }
            return ret === source ? dest : ret;
        };
    });
}

/**
 * Fancy extension on Object.create, that additionally creates a getter/setter
 * function for several properties in `privates`, working off `this.options`.
 */
nv.utils.create = function(ctor, parent, privates){
    ctor.prototype = Object.create(parent.prototype);
    ctor.prototype.constructor = ctor;
    for(var key in privates){
        (function(key){
            ctor.prototype[key] = function(_){
                if(arguments.length === 0) return this.options[key];
                this.options[key] = _;
                return this;
            }
        }(key))
    }
}

/**
 * Copy properties right to left, returning base.
 */
nv.utils.extend = function(base) {
  var __hasProp = {}.hasOwnProperty;
  if (base) {
    var i = arguments.length;
    while( --i ) {
      var extra = arguments[i];
      for (var key in extra) {
        if (!__hasProp.call(extra, key)) continue;
        if (typeof extra[key] === 'object'){
          if (typeof base[key] === 'object') {
            // recurse
            nv.utils.extend(base[key], extra[key]);
          } else if (extra[key]) {
            // clone
            base[key] = nv.utils.extend({}, extra[key]);
          }
        } else {
          // copy
          base[key] = extra[key];
        }
      }
    }, this);
  }

  return base;
};
var AxisPrivates = {
    axisLabelText : null
    , showMaxMin : true //TODO: showMaxMin should be disabled on all ordinal scaled axes
    , highlightZero : true
    , rotateLabels : 0
    , rotateYLabel : true
    , staggerLabels : false
    , isOrdinal : false
    , ticks : null
    , axisLabelDistance : 12 //The larger this number is, the closer the axis label is to the axis.
    , axisRendered : false
    , maxMinRendered : false
    , scale0 : null
    , axisLabel: null
    , _scale : d3.scale.linear()
    , _duration : 250
};

function Axis(options){
    options = nv.utils.extend({}, options, AxisPrivates, {
        margin : {top: 0, right: 0, bottom: 0, left: 0}
        , width : 75 //only used for tickLabel currently
        , height : 60 //only used for tickLabel currently
        , chartClass: 'axis'
        , wrapClass: 'axis'
    });

    Layer.call(this, options);

    this.axis = d3.svg.axis();
    this.axis
        .scale(this.scale())
        .orient('bottom')
        .tickFormat(function(d) { return d });
}

nv.utils.create(Axis, Layer, AxisPrivates);

/**
 * override Layer::wrapper, removed transform/translate
 * @param data
 */
Axis.prototype.wrapper = function(data){
    var gs = [];
    var chartClass = 'nv-' + this.options.chartClass;
    var wrapClass = 'nv-' + this.options.wrapClass;

    this.wrap = this.svg.selectAll('g.nv-wrap.' + wrapClass).data([data]);
    this.wrapEnter = this.wrap.enter().append('g').attr({class: 'nvd3 nv-wrap ' + chartClass });
    this.defsEnter = this.wrapEnter.append('defs');
    this.gEnter = this.wrapEnter.append('g');
    this.g = this.wrap.select('g');

    gs.concat([wrapClass]).forEach(function(g){
        this.gEnter.append('g').attr('class', g);
    }, this);

    this.renderWatch.reset();
    this.renderWatch = nv.utils.renderWatch(this.dispatch, this.duration());
};

Axis.prototype.draw = function(data){

    var that = this
        , axisMaxMin = null
        , xLabelMargin = null
        , w = null;

    if (this.ticks() !== null)
        this.axis.ticks(this.ticks());
    else if (this.axis.orient() == 'top' || this.axis.orient() == 'bottom')
        this.axis.ticks(Math.abs(this.scale().range()[1] - this.scale().range()[0]) / 100);

    //TODO: consider calculating width/height based on whether or not label is added, for reference in charts using this component
    this.g
        .watchTransition(this.renderWatch, 'axis')
        .call(this.axis);

    this.scale0(this.scale0() || this.axis.scale());

    var fmt = this.axis.tickFormat();
    if (fmt == null)
        fmt = this.scale0().tickFormat();

    var axisLabel = this.g.selectAll('text.nv-axislabel')
        .data([this.axisLabelText() || null]);
    axisLabel.exit().remove();

    switch (this.axis.orient()) {
        case 'top':
            axisLabel.enter().append('text')
                .attr('class', 'nv-axislabel');
            w = (this.scale().range().length==2)
                ? this.scale().range()[1]
                : (this.scale().range()[this.scale().range().length-1]+(this.scale().range()[1]-this.scale().range()[0]));
            axisLabel
                .attr('text-anchor', 'middle')
                .attr('y', 0)
                .attr('x', w/2);
            if (this.showMaxMin()) {
                axisMaxMin = this.wrap.selectAll('g.nv-axisMaxMin')
                    .data(this.scale().domain());
                axisMaxMin.enter().append('g')
                    .attr('class', 'nv-axisMaxMin')
                    .append('text');
                axisMaxMin.exit().remove();
                axisMaxMin
                    .attr('transform', function(d,i) {
                        return 'translate(' + that.scale()(d) + ',0)'
                    })
                    .select('text')
                    .attr('dy', '-0.5em')
                    .attr('y', -this.axis.tickPadding())
                    .attr('text-anchor', 'middle')
                    .text(function(d,i) {
                        var v = fmt(d);
                        return ('' + v).match('NaN') ? '' : v;
                    });
                axisMaxMin.watchTransition(this.renderWatch, 'min-max top')
                    .attr('transform', function(d,i) {
                        return 'translate(' + that.scale().range()[i] + ',0)'
                    });
            }
            break;
        case 'bottom':
            xLabelMargin = 36;
            var maxTextWidth = 30;
            var xTicks = this.g.selectAll('g').select("text");
            if (this.rotateLabels()%360) {
                //Calculate the longest xTick width
                xTicks.each(function(d,i){
                    var width = this.getBBox().width;
                    if(width > maxTextWidth) maxTextWidth = width;
                });
                //Convert to radians before calculating sin. Add 30 to margin for healthy padding.
                var sin = Math.abs(Math.sin(this.rotateLabels()*Math.PI/180));
                xLabelMargin = (sin ? sin*maxTextWidth : maxTextWidth)+30;
                //Rotate all xTicks
                xTicks
                    .attr('transform', function(d,i,j) { return 'rotate(' + that.rotateLabels() + ' 0,0)' })
                    .style('text-anchor', that.rotateLabels()%360 > 0 ? 'start' : 'end');
            }
            axisLabel.enter().append('text').attr('class', 'nv-axislabel');
            w = (this.scale().range().length==2)
                ? this.scale().range()[1]
                : (this.scale().range()[this.scale().range().length-1]+(this.scale().range()[1]-this.scale().range()[0]));
            axisLabel
                .attr('text-anchor', 'middle')
                .attr('y', xLabelMargin)
                .attr('x', w/2);
            if (this.showMaxMin()) {
                //if (showMaxMin && !isOrdinal) {
                axisMaxMin = this.wrap.selectAll('g.nv-axisMaxMin')
                    //.data(scale.domain())
                    .data([this.scale().domain()[0], this.scale().domain()[this.scale().domain().length - 1]]);
                axisMaxMin.enter().append('g').attr('class', 'nv-axisMaxMin').append('text');
                axisMaxMin.exit().remove();
                axisMaxMin
                    .attr('transform', function(d,i) {
                        return 'translate(' + (that.scale()(d) + (that.isOrdinal() ? that.scale().rangeBand() / 2: 0)) + ',0)'
                    })
                    .select('text')
                    .attr('dy', '.71em')
                    .attr('y', this.axis.tickPadding())
                    .attr('transform', function(d,i,j) { return 'rotate(' + that.rotateLabels() + ' 0,0)' })
                    .style('text-anchor',
                        that.rotateLabels() ? (that.rotateLabels()%360 > 0 ? 'start' : 'end') : 'middle'
                    )
                    .text(function(d,i) {
                        var v = fmt(d);
                        return ('' + v).match('NaN') ? '' : v;
                    });
                axisMaxMin.watchTransition(this.renderWatch, 'min-max bottom')
                    .attr('transform', function(d,i) {
                        return 'translate(' + (that.scale()(d) + (that.isOrdinal() ? that.scale().rangeBand() / 2 : 0)) + ',0)'
                    });
            }
            if (that.staggerLabels())
                xTicks
                    .attr('transform', function(d,i) { return 'translate(0,' + (i % 2 == 0 ? '0' : '12') + ')' });
            break;
        case 'right':
            axisLabel.enter().append('text').attr('class', 'nv-axislabel');
            axisLabel
                .style('text-anchor', this.rotateYLabel() ? 'middle' : 'begin')
                .attr('transform', this.rotateYLabel() ? 'rotate(90)' : '')
                .attr('y', this.rotateYLabel() ? (-Math.max(this.margin().right,this.width()) + 12) : -10) //TODO: consider calculating this based on largest tick width... OR at least expose this on chart
                .attr('x', this.rotateYLabel() ? (this.scale().range()[0] / 2) : this.axis.tickPadding());
            if (this.showMaxMin()) {
                axisMaxMin = this.wrap.selectAll('g.nv-axisMaxMin')
                    .data(this.scale().domain());
                axisMaxMin.enter().append('g').attr('class', 'nv-axisMaxMin').append('text')
                    .style('opacity', 0);
                axisMaxMin.exit().remove();
                axisMaxMin
                    .attr('transform', function(d,i) {
                        return 'translate(0,' + that.scale()(d) + ')'
                    })
                    .select('text')
                    .attr('dy', '.32em')
                    .attr('y', 0)
                    .attr('x', this.axis.tickPadding())
                    .style('text-anchor', 'start')
                    .text(function(d,i) {
                        var v = fmt(d);
                        return ('' + v).match('NaN') ? '' : v;
                    });
                axisMaxMin.watchTransition(this.renderWatch, 'min-max right')
                    .attr('transform', function(d,i) {
                        return 'translate(0,' + that.scale().range()[i] + ')'
                    })
                    .select('text')
                    .style('opacity', 1);
            }
            break;
        case 'left':
            /*
             //For dynamically placing the label. Can be used with dynamically-sized chart axis margins
             var yTicks = g.selectAll('g').select("text");
             yTicks.each(function(d,i){
             var labelPadding = this.getBBox().width + axis.tickPadding() + 16;
             if(labelPadding > width) width = labelPadding;
             });                                               f
             */
            axisLabel.enter().append('text').attr('class', 'nv-axislabel');
            axisLabel
                .style('text-anchor', this.rotateYLabel() ? 'middle' : 'end')
                .attr('transform', this.rotateYLabel() ? 'rotate(-90)' : '')
                .attr('y',
                    this.rotateYLabel()
                        ? (-Math.max(this.margin().left,this.width()) + this.axisLabelDistance())
                        : -10
                ) //TODO: consider calculating this based on largest tick width... OR at least expose this on chart
                .attr('x',
                    this.rotateYLabel()
                        ? (-this.scale().range()[0] / 2)
                        : -this.axis.tickPadding()
                );
            if (this.showMaxMin()) {
                axisMaxMin = this.wrap.selectAll('g.nv-axisMaxMin')
                    .data(this.scale().domain());
                axisMaxMin.enter().append('g').attr('class', 'nv-axisMaxMin').append('text')
                    .style('opacity', 0);
                axisMaxMin.exit().remove();
                axisMaxMin
                    .attr('transform', function(d,i) {
                        return 'translate(0,' + that.scale0()(d) + ')'
                    })
                    .select('text')
                    .attr('dy', '.32em')
                    .attr('y', 0)
                    .attr('x', -this.axis.tickPadding())
                    .attr('text-anchor', 'end')
                    .text(function(d,i) {
                        var v = fmt(d);
                        return ('' + v).match('NaN') ? '' : v;
                    });
                axisMaxMin.watchTransition(this.renderWatch, 'min-max right')
                    .attr('transform', function(d,i) {
                        return 'translate(0,' + that.scale().range()[i] + ')'
                    })
                    .select('text')
                    .style('opacity', 1);
            }
            break;
    }

    axisLabel
        .text(function(d) { return d });

    if (this.showMaxMin() && (this.axis.orient() === 'left' || this.axis.orient() === 'right')) {
        //check if max and min overlap other values, if so, hide the values that overlap
        this.g.selectAll('g') // the g's wrapping each tick
            .each(function(d,i) {
                d3.select(this).select('text').attr('opacity', 1);
                if (that.scale()(d) < that.scale().range()[1] + 10 || that.scale()(d) > that.scale().range()[0] - 10) { // 10 is assuming text height is 16... if d is 0, leave it!
                    if (d > 1e-10 || d < -1e-10) // accounts for minor floating point errors... though could be problematic if the scale is EXTREMELY SMALL
                        d3.select(this).attr('opacity', 0);
                    d3.select(this).select('text').attr('opacity', 0); // Don't remove the ZERO line!!
                }
            });

        //if Max and Min = 0 only show min, Issue #281
        if (this.scale().domain()[0] == this.scale().domain()[1] && this.scale().domain()[0] == 0)
            this.wrap.selectAll('g.nv-axisMaxMin')
                .style('opacity', function(d,i) { return !i ? 1 : 0 });
    }

    if (this.showMaxMin() && (this.axis.orient() === 'top' || this.axis.orient() === 'bottom')) {
        var maxMinRange = [];
        this.wrap.selectAll('g.nv-axisMaxMin')
            .each(function(d,i) {
                try {
                    if (i) // i== 1, max position
                        maxMinRange.push(that.scale()(d) - this.getBBox().width - 4);  //assuming the max and min labels are as wide as the next tick (with an extra 4 pixels just in case)
                    else // i==0, min position
                        maxMinRange.push(that.scale()(d) + this.getBBox().width + 4)
                } catch (err) {
                    if (i) // i== 1, max position
                        maxMinRange.push(that.scale()(d) - 4);  //assuming the max and min labels are as wide as the next tick (with an extra 4 pixels just in case)
                    else // i==0, min position
                        maxMinRange.push(that.scale()(d) + 4)
                }
            });
        this.g.selectAll('g') // the g's wrapping each tick
            .each(function(d,i) {
                if (that.scale()(d) < maxMinRange[0] || that.scale()(d) > maxMinRange[1]) {
                    if (d > 1e-10 || d < -1e-10) // accounts for minor floating point errors... though could be problematic if the scale is EXTREMELY SMALL
                        d3.select(this).remove();
                    else
                        d3.select(this).select('text').remove(); // Don't remove the ZERO line!!
                }
            });
    }

    //highlight zero line ... Maybe should not be an option and should just be in CSS?
    if (this.highlightZero())
        this.g.selectAll('.tick')
            .filter(function(d) { //this is because sometimes the 0 tick is a very small fraction, TODO: think of cleaner technique
                return !parseFloat(Math.round(d.__data__*100000)/1000000) && (d.__data__ !== undefined)
            })
            .classed('zero', true);

    //store old scales for use in transitions on update
    this.scale0( this.scale().copy() );
};

Axis.prototype.duration = function(_) {
    if (!arguments.length) return this._duration();
    this._duration(_);
    this.renderWatch.reset(_);
    return this;
};

Axis.prototype.scale = function(_) {
    if (!arguments.length) return this._scale();
    this._scale(_);
    this.axis.scale(_);
    this.isOrdinal( typeof this._scale().rangeBands === 'function' );
    d3.rebind(this, this._scale(), 'domain', 'range', 'rangeBand', 'rangeBands');
    return this;
};

/**
 * The axis model returns a function wrapping an instance of a Axis.
 */
nv.models.axis = function() {
    "use strict";

    var axis = new Axis();

    function chart(selection) {
        axis.render(selection);
        return chart;
    }

    chart.axis = axis.axis;
    chart.dispatch = axis.dispatch;

    d3.rebind(chart, axis.axis,
        'orient', 'tickValues', 'tickSubdivide', 'tickSize', 'tickPadding', 'tickFormat'
    );
    d3.rebind(chart, axis.scale, //these are also accessible by chart.scale(), but added common ones directly for ease of use
        'domain', 'range', 'rangeBand', 'rangeBands'
    );

    chart.options = nv.utils.optionsFunc.bind(chart);

    nv.utils.rebindp(chart, axis, Axis.prototype,
        'margin', 'width', 'ticks', 'height', 'axisLabel', 'showMaxMin', 'highlightZero', 'rotateYLabel',
        'rotateLabels', 'staggerLabels', 'axisLabelDistance', 'duration', 'scale'
    );

    return chart;
};

// Chart design based on the recommendations of Stephen Few. Implementation
// based on the work of Clint Ivy, Jamie Love, and Jason Davies.
// http://projects.instantcognition.com/protovis/bulletchart/

nv.models.bullet = function() {

  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var margin = {top: 0, right: 0, bottom: 0, left: 0}
    , orient = 'left' // TODO top & bottom
    , reverse = false
    , ranges = function(d) { return d.ranges }
    , markers = function(d) { return d.markers }
    , measures = function(d) { return d.measures }
    , forceX = [0] // List of numbers to Force into the X scale (ie. 0, or a max / min, etc.)
    , width = 380
    , height = 30
    , tickFormat = null
    , dispatch = d3.dispatch('elementMouseover', 'elementMouseout')
    ;

  //============================================================


  function chart(selection) {
    selection.each(function(d, i) {
      var availableWidth = width - margin.left - margin.right,
          availableHeight = height - margin.top - margin.bottom,
          container = d3.select(this),
          mainGroup = nv.log(this.parentNode.parentNode).getAttribute('transform'),
          heightFromTop = nv.log(parseInt(mainGroup.replace(/.*,(\d+)\)/,"$1"))); //TODO: There should be a smarter way to get this value

      var rangez = ranges.call(this, d, i).slice().sort(d3.descending),
          markerz = markers.call(this, d, i).slice().sort(d3.descending),
          measurez = measures.call(this, d, i).slice().sort(d3.descending);


      //------------------------------------------------------------
      // Setup Scales

      // Compute the new x-scale.
      var MaxX = Math.max(rangez[0] ? rangez[0]:0 , markerz[0] ? markerz[0] : 0 , measurez[0] ? measurez[0] : 0)
      var x1 = d3.scale.linear()
          .domain([0, MaxX]).nice()  // TODO: need to allow forceX and forceY, and xDomain, yDomain
          .range(reverse ? [availableWidth, 0] : [0, availableWidth]);

      // Retrieve the old x-scale, if this is an update.
      var x0 = this.__chart__ || d3.scale.linear()
          .domain([0, Infinity])
          .range(x1.range());

      // Stash the new scale.
      this.__chart__ = x1;

      //------------------------------------------------------------


      //------------------------------------------------------------
      // Setup containers and skeleton of chart

      var wrap = container.selectAll('g.nv-wrap.nv-bullet').data([d]);
      var wrapEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap nv-bullet');
      var gEnter = wrapEnter.append('g');
      var g = wrap.select('g');

      wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      //------------------------------------------------------------



      var w0 = function(d) { return Math.abs(x0(d) - x0(0)) }, // TODO: could optimize by precalculating x0(0) and x1(0)
          w1 = function(d) { return Math.abs(x1(d) - x1(0)) };


      // Update the range rects.
      var range = g.selectAll('rect.nv-range')
          .data(rangez);

      range.enter().append('rect')
          .attr('class', function(d, i) { return 'nv-range nv-s' + i; })
          .attr('width', w0)
          .attr('height', availableHeight)
          .attr('x', reverse ? x0 : 0)
          .on('mouseover', function(d,i) { 
              dispatch.elementMouseover({
                value: d,
                label: (i <= 0) ? 'Maximum' : (i > 1) ? 'Minimum' : 'Mean', //TODO: make these labels a variable
                pos: [x1(d), heightFromTop]
              })
          })
          .on('mouseout', function(d,i) { 
              dispatch.elementMouseout({
                value: d,
                label: (i <= 0) ? 'Minimum' : (i >=1) ? 'Maximum' : 'Mean' //TODO: make these labels a variable
              })
          })

      d3.transition(range)
          .attr('x', reverse ? x1 : 0)
          .attr('width', w1)
          .attr('height', availableHeight);


      // Update the measure rects.
      var measure = g.selectAll('rect.nv-measure')
          .data(measurez);

      measure.enter().append('rect')
          .attr('class', function(d, i) { return 'nv-measure nv-s' + i; })
          .attr('width', w0)
          .attr('height', availableHeight / 3)
          .attr('x', reverse ? x0 : 0)
          .attr('y', availableHeight / 3)
          .on('mouseover', function(d) { 
              dispatch.elementMouseover({
                value: d,
                label: 'Current', //TODO: make these labels a variable
                pos: [x1(d), heightFromTop]
              })
          })
          .on('mouseout', function(d) { 
              dispatch.elementMouseout({
                value: d,
                label: 'Current' //TODO: make these labels a variable
              })
          })

      d3.transition(measure)
          .attr('width', w1)
          .attr('height', availableHeight / 3)
          .attr('x', reverse ? x1 : 0)
          .attr('y', availableHeight / 3);



      // Update the marker lines.
      var marker = g.selectAll('path.nv-markerTriangle')
          .data(markerz);

      var h3 =  availableHeight / 6;
      marker.enter().append('path')
          .attr('class', 'nv-markerTriangle')
          .attr('transform', function(d) { return 'translate(' + x0(d) + ',' + (availableHeight / 2) + ')' })
          .attr('d', 'M0,' + h3 + 'L' + h3 + ',' + (-h3) + ' ' + (-h3) + ',' + (-h3) + 'Z')
          .on('mouseover', function(d,i) {
              dispatch.elementMouseover({
                value: d,
                label: 'Previous',
                pos: [x1(d), heightFromTop]
              })
          })
          .on('mouseout', function(d,i) {
              dispatch.elementMouseout({
                value: d,
                label: 'Previous'
              })
          });

      d3.transition(marker)
          .attr('transform', function(d) { return 'translate(' + x1(d) + ',' + (availableHeight / 2) + ')' });

      marker.exit().remove();

    });

    d3.timer.flush();

    return chart;
  }


  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  chart.dispatch = dispatch;

  // left, right, top, bottom
  chart.orient = function(_) {
    if (!arguments.length) return orient;
    orient = _;
    reverse = orient == 'right' || orient == 'bottom';
    return chart;
  };

  // ranges (bad, satisfactory, good)
  chart.ranges = function(_) {
    if (!arguments.length) return ranges;
    ranges = _;
    return chart;
  };

  // markers (previous, goal)
  chart.markers = function(_) {
    if (!arguments.length) return markers;
    markers = _;
    return chart;
  };

  // measures (actual, forecast)
  chart.measures = function(_) {
    if (!arguments.length) return measures;
    measures = _;
    return chart;
  };

  chart.forceX = function(_) {
    if (!arguments.length) return forceX;
    forceX = _;
    return chart;
  };

  chart.width = function(_) {
    if (!arguments.length) return width;
    width = _;
    return chart;
  };

  chart.height = function(_) {
    if (!arguments.length) return height;
    height = _;
    return chart;
  };

  chart.margin = function(_) {
    if (!arguments.length) return margin;
    margin.top    = typeof _.top    != 'undefined' ? _.top    : margin.top;
    margin.right  = typeof _.right  != 'undefined' ? _.right  : margin.right;
    margin.bottom = typeof _.bottom != 'undefined' ? _.bottom : margin.bottom;
    margin.left   = typeof _.left   != 'undefined' ? _.left   : margin.left;
    return chart;
  };

  chart.tickFormat = function(_) {
    if (!arguments.length) return tickFormat;
    tickFormat = _;
    return chart;
  };

  //============================================================


  return chart;
};



// Chart design based on the recommendations of Stephen Few. Implementation
// based on the work of Clint Ivy, Jamie Love, and Jason Davies.
// http://projects.instantcognition.com/protovis/bulletchart/
nv.models.bulletChart = function() {

  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var bullet = nv.models.bullet()
    ;

  var orient = 'left' // TODO top & bottom
    , reverse = false
    , margin = {top: 5, right: 40, bottom: 20, left: 120}
    , ranges = function(d) { return d.ranges }
    , markers = function(d) { return d.markers }
    , measures = function(d) { return d.measures }
    , width = null
    , height = 55
    , tickFormat = null
    , tooltips = true
    , tooltip = function(key, x, y, e, graph) {
        return '<h3>' + e.label + '</h3>' +
               '<p>' +  e.value + '</p>'
      }
    , noData = "No Data Available."
    , dispatch = d3.dispatch('tooltipShow', 'tooltipHide')
    ;

  //============================================================


  //============================================================
  // Private Variables
  //------------------------------------------------------------

  var showTooltip = function(e, parentElement) {
    var offsetElement = parentElement.parentNode.parentNode,
        left = e.pos[0] + offsetElement.offsetLeft + margin.left,
        top = e.pos[1] + offsetElement.offsetTop + margin.top;

    var content = '<h3>' + e.label + '</h3>' +
            '<p>' + e.value + '</p>';

    nv.tooltip.show([left, top], content, e.value < 0 ? 'e' : 'w', null, offsetElement.parentNode);
  };

  //============================================================


  function chart(selection) {
    selection.each(function(d, i) {
      var container = d3.select(this);

      var availableWidth = (width  || parseInt(container.style('width')) || 960)
                             - margin.left - margin.right,
          availableHeight = height - margin.top - margin.bottom,
          that = this;


      chart.update = function() { chart(selection) };
      chart.container = this;

      //------------------------------------------------------------
      // Display No Data message if there's nothing to show.

      /*
      // Disabled until I figure out a better way to check for no data with the bullet chart
      if (!data || !data.length || !data.filter(function(d) { return d.values.length }).length) {
        var noDataText = container.selectAll('.nv-noData').data([noData]);

        noDataText.enter().append('text')
          .attr('class', 'nvd3 nv-noData')
          .attr('dy', '-.7em')
          .style('text-anchor', 'middle');

        noDataText
          .attr('x', margin.left + availableWidth / 2)
          .attr('y', margin.top + availableHeight / 2)
          .text(function(d) { return d });

        return chart;
      } else {
        container.selectAll('.nv-noData').remove();
      }
      */

      //------------------------------------------------------------



      var rangez = ranges.call(this, d, i).slice().sort(d3.descending),
          markerz = markers.call(this, d, i).slice().sort(d3.descending),
          measurez = measures.call(this, d, i).slice().sort(d3.descending);


      //------------------------------------------------------------
      // Setup containers and skeleton of chart

      var wrap = container.selectAll('g.nv-wrap.nv-bulletChart').data([d]);
      var wrapEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap nv-bulletChart');
      var gEnter = wrapEnter.append('g');
      var g = wrap.select('g');

      gEnter.append('g').attr('class', 'nv-bulletWrap');
      gEnter.append('g').attr('class', 'nv-titles');

      wrap.attr('transform', 'translate(' + margin.left + ',' + ( margin.top + i*height )+ ')');

      //------------------------------------------------------------


      // Compute the new x-scale.
      var MaxX = Math.max(rangez[0] ? rangez[0]:0 , markerz[0] ? markerz[0] : 0 , measurez[0] ? measurez[0] : 0)
      var x1 = d3.scale.linear()
          .domain([0, MaxX]).nice()  // TODO: need to allow forceX and forceY, and xDomain, yDomain
          .range(reverse ? [availableWidth, 0] : [0, availableWidth]);

      // Retrieve the old x-scale, if this is an update.
      var x0 = this.__chart__ || d3.scale.linear()
          .domain([0, Infinity])
          .range(x1.range());

      // Stash the new scale.
      this.__chart__ = x1;

      /*
      // Derive width-scales from the x-scales.
      var w0 = bulletWidth(x0),
          w1 = bulletWidth(x1);

      function bulletWidth(x) {
        var x0 = x(0);
        return function(d) {
          return Math.abs(x(d) - x(0));
        };
      }

      function bulletTranslate(x) {
        return function(d) {
          return 'translate(' + x(d) + ',0)';
        };
      }
      */

      var w0 = function(d) { return Math.abs(x0(d) - x0(0)) }, // TODO: could optimize by precalculating x0(0) and x1(0)
          w1 = function(d) { return Math.abs(x1(d) - x1(0)) };


      var title = gEnter.select('.nv-titles').append("g")
          .attr("text-anchor", "end")
          .attr("transform", "translate(-6," + (height - margin.top - margin.bottom) / 2 + ")");
      title.append("text")
          .attr("class", "nv-title")
          .text(function(d) { return d.title; });

      title.append("text")
          .attr("class", "nv-subtitle")
          .attr("dy", "1em")
          .text(function(d) { return d.subtitle; });



      bullet
        .width(availableWidth)
        .height(availableHeight)

      var bulletWrap = g.select('.nv-bulletWrap');

      d3.transition(bulletWrap).call(bullet);



      // Compute the tick format.
      var format = tickFormat || x1.tickFormat(8);

      // Update the tick groups.
      var tick = g.selectAll('g.nv-tick')
          .data(x1.ticks(8), function(d) {
            return this.textContent || format(d);
          });

      // Initialize the ticks with the old scale, x0.
      var tickEnter = tick.enter().append('g')
          .attr('class', 'nv-tick')
          .attr('transform', function(d) { return 'translate(' + x0(d) + ',0)' })
          .style('opacity', 1e-6);

      tickEnter.append('line')
          .attr('y1', availableHeight)
          .attr('y2', availableHeight * 7 / 6);

      tickEnter.append('text')
          .attr('text-anchor', 'middle')
          .attr('dy', '1em')
          .attr('y', availableHeight * 7 / 6)
          .text(format);

      // Transition the entering ticks to the new scale, x1.
      d3.transition(tickEnter)
          .attr('transform', function(d) { return 'translate(' + x1(d) + ',0)' })
          .style('opacity', 1);

      // Transition the updating ticks to the new scale, x1.
      var tickUpdate = d3.transition(tick)
          .attr('transform', function(d) { return 'translate(' + x1(d) + ',0)' })
          .style('opacity', 1);

      tickUpdate.select('line')
          .attr('y1', availableHeight)
          .attr('y2', availableHeight * 7 / 6);

      tickUpdate.select('text')
          .attr('y', availableHeight * 7 / 6);

      // Transition the exiting ticks to the new scale, x1.
      d3.transition(tick.exit())
          .attr('transform', function(d) { return 'translate(' + x1(d) + ',0)' })
          .style('opacity', 1e-6)
          .remove();


      //============================================================
      // Event Handling/Dispatching (in chart's scope)
      //------------------------------------------------------------

      dispatch.on('tooltipShow', function(e) {
        if (tooltips) showTooltip(e, that.parentNode);
      });

      //============================================================

    });

    d3.timer.flush();

    return chart;
  }


  //============================================================
  // Event Handling/Dispatching (out of chart's scope)
  //------------------------------------------------------------

  bullet.dispatch.on('elementMouseover.tooltip', function(e) {
    dispatch.tooltipShow(e);
  });

  bullet.dispatch.on('elementMouseout.tooltip', function(e) {
    dispatch.tooltipHide(e);
  });

  dispatch.on('tooltipHide', function() {
    if (tooltips) nv.tooltip.cleanup();
  });

  //============================================================


  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  chart.dispatch = dispatch;
  chart.bullet = bullet;

  // left, right, top, bottom
  chart.orient = function(x) {
    if (!arguments.length) return orient;
    orient = x;
    reverse = orient == 'right' || orient == 'bottom';
    return chart;
  };

  // ranges (bad, satisfactory, good)
  chart.ranges = function(x) {
    if (!arguments.length) return ranges;
    ranges = x;
    return chart;
  };

  // markers (previous, goal)
  chart.markers = function(x) {
    if (!arguments.length) return markers;
    markers = x;
    return chart;
  };

  // measures (actual, forecast)
  chart.measures = function(x) {
    if (!arguments.length) return measures;
    measures = x;
    return chart;
  };

  chart.width = function(x) {
    if (!arguments.length) return width;
    width = x;
    return chart;
  };

  chart.height = function(x) {
    if (!arguments.length) return height;
    height = x;
    return chart;
  };

  chart.margin = function(_) {
    if (!arguments.length) return margin;
    margin.top    = typeof _.top    != 'undefined' ? _.top    : margin.top;
    margin.right  = typeof _.right  != 'undefined' ? _.right  : margin.right;
    margin.bottom = typeof _.bottom != 'undefined' ? _.bottom : margin.bottom;
    margin.left   = typeof _.left   != 'undefined' ? _.left   : margin.left;
    return chart;
  };

  chart.tickFormat = function(x) {
    if (!arguments.length) return tickFormat;
    tickFormat = x;
    return chart;
  };

  chart.tooltips = function(_) {
    if (!arguments.length) return tooltips;
    tooltips = _;
    return chart;
  };

  chart.tooltipContent = function(_) {
    if (!arguments.length) return tooltip;
    tooltip = _;
    return chart;
  };

  chart.noData = function(_) {
    if (!arguments.length) return noData;
    noData = _;
    return chart;
  };

  //============================================================


  return chart;
};


var DiscreteBarPrivates = {
    xScale : d3.scale.ordinal()
    , yScale : d3.scale.linear()
    , xScale0: null
    , yScale0: null
    , forceY : [0] // 0 is forced by default.. this makes sense for the majority of bar graphs... user can always do chart.forceY([]) to remove
    , showValues : false
    , valueFormat : d3.format(',.2f')
    , xDomain : null
    , yDomain : null
    , xRange : null
    , yRange : null
    , rectClass : 'discreteBar'
};

/**
 * A DiscreteBar
 */
function DiscreteBar(options){
    options = nv.utils.extend({}, options, DiscreteBarPrivates, {
        margin : {top: 0, right: 0, bottom: 0, left: 0}
        , width : 960
        , height: 500
        , chartClass: 'discretebar'
    });

    Layer.call(this, options, []);
}

nv.utils.create(DiscreteBar, Layer, DiscreteBarPrivates);

/**
 * @override Layer::wrapper
 */
DiscreteBar.prototype.wrapper = function(data){
    Layer.prototype.wrapper.call(this, data, ['nv-groups']);
};

/**
 * @override Layer::draw
 */
DiscreteBar.prototype.draw = function(data){
    var dataLength = data.length,
        barClass = 'nv-bar';

    var that = this
        , availableWidth = this.available.width
        , availableHeight = this.available.height;

    //add series index to each data point for reference
    data.forEach(function(series, i) {
        series.values.forEach(function(point) {
            point.series = i;
        });
    });

    //------------------------------------------------------------
    // Setup Scales

    // remap and flatten the data for use in calculating the scales' domains
    var seriesData = (this.xDomain() && this.yDomain()) ? [] : // if we know xDomain and yDomain, no need to calculate
        data.map(function(d) {
            return d.values.map(function(d,i) {
                return { x: that.x()(d,i), y: that.y()(d,i), y0: d.y0 }
            })
        });

    this.xScale().domain(this.xDomain() || d3.merge(seriesData).map(function(d) { return d.x }))
        .rangeBands(this.xRange() || [0, availableWidth], .1);

    this.yScale().domain(this.yDomain() || d3.extent(d3.merge(seriesData).map(function(d) { return d.y }).concat(this.forceY())));

    // If showValues, pad the Y axis range to account for label height
    if (this.showValues())
        this.yScale().range(this.yRange() || [availableHeight - (this.yScale().domain()[0] < 0 ? 12 : 0), this.yScale().domain()[1] > 0 ? 12 : 0]);
    else
        this.yScale().range(this.yRange() || [availableHeight, 0]);

    //store old scales if they exist
    this.xScale0(this.xScale0() || this.xScale());
    this.yScale0(this.yScale0() || this.yScale().copy().range([this.yScale()(0),this.yScale()(0)]));

    //------------------------------------------------------------

    //TODO: by definition, the discrete bar should not have multiple groups, will modify/remove later
    var groups = this.wrap.select('.nv-groups').selectAll('.nv-group')
        .data(function(d) { return d }, function(d) { return d.key });
    groups.enter().append('g')
        .style('stroke-opacity', this.opacityDefault())
        .style('fill-opacity', this.opacityDefault());
    groups.exit()
        .transition()
        .style('stroke-opacity', this.opacityDefault())
        .style('fill-opacity', this.opacityDefault())
        .remove();
    groups
        .attr('class', function(d,i) { return 'nv-group nv-series-' + i })
        .classed('hover', function(d) { return d.hover });
    groups
        .transition()
        .style('stroke-opacity', 1)
        .style('fill-opacity', .75);

    var bars = groups.selectAll('g.'+barClass)
        .data(function(d) { return d.values });

    bars.exit().remove();

    function _mouseEventObject(d,i){
        return {
            value: that.y()(d,i),
            point: d,
            series: data[d.series],
            pos: [ // TODO: Figure out why the value appears to be shifted
                that.xScale()(that.x()(d,i)) + (that.xScale().rangeBand() * (d.series + .5) / dataLength),
                that.yScale()(that.y()(d,i))
            ],
            pointIndex: i,
            seriesIndex: d.series,
            e: d3.event
        }
    }
    var barsEnter = bars.enter().append('g')
        .attr('transform', function(d, i) {
            return 'translate(' + (that.xScale()(that.x()(d,i)) + that.xScale().rangeBand() * .05 ) + ', ' + that.yScale()(0) + ')'
        })
        .on('mouseover', function(d, i) { //TODO: figure out why j works above, but not here
            d3.select(this).classed('hover', true);
            that.dispatch.elementMouseover( _mouseEventObject(d, i) );
        })
        .on('mouseout', function(d, i) {
            d3.select(this).classed('hover', false);
            that.dispatch.elementMouseout( _mouseEventObject(d, i) );
        })
        .on('click', function(d, i) {
            that.dispatch.elementClick( _mouseEventObject(d, i) );
            d3.event.stopPropagation();
        })
        .on('dblclick', function(d, i) {
            that.dispatch.elementDblClick( _mouseEventObject(d, i) );
            d3.event.stopPropagation();
        });

    barsEnter.append('rect')
        .attr('height', 0)
        .attr('width', this.xScale().rangeBand() * .9 / dataLength );

    if (this.showValues()) {
        barsEnter.append('text')
            .attr('text-anchor', 'middle');

        bars.select('text')
            .text(function(d,i) { return that.valueFormat()(that.y()(d,i)) })
            .transition()
            .attr('x', this.xScale().rangeBand() * .9 / 2)
            .attr('y', function(d,i) { return that.y()(d,i) < 0 ? that.yScale()(that.y()(d,i)) - that.yScale()(0) + 12 : -4 });
    } else
        bars.selectAll('text').remove();

    bars.attr('class', function(d,i) { return barClass + ' ' + (that.y()(d,i) < 0 ? 'negative' : 'positive') })
        .style('fill', function(d,i) { return d.color || that.color()(d,i) })
        .style('stroke', function(d,i) { return d.color || that.color()(d,i) })
        .select('rect')
        .attr('class', this.rectClass())
        .transition()
        .attr('width', this.xScale().rangeBand() * .9 / dataLength);
    bars.transition()
        //.delay(function(d,i) { return i * 1200 / data[0].values.length })
        .attr('transform', function(d,i) {
            var left = that.xScale()(that.x()(d,i)) + that.xScale().rangeBand() * .05,
                top = that.y()(d,i) < 0 ?
                    that.yScale()(0) :
                    that.yScale()(0) - that.yScale()(that.y()(d,i)) < 1 ?
                        that.yScale()(0) - 1 : //make 1 px positive bars show up above y=0
                        that.yScale()(that.y()(d,i));
            return 'translate(' + left + ', ' + top + ')'
        })
        .select('rect')
        .attr('height', function(d,i) {
            return  Math.max(Math.abs(that.yScale()(that.y()(d,i)) - that.yScale()((that.yDomain() && that.yDomain()[0]) || 0)) || 1)
        });

    //store old scales for use in transitions on update
    that.xScale0(that.xScale().copy());
    that.yScale0(that.yScale().copy());

};

DiscreteBar.prototype.color = function(_){
    if (!arguments.length) return this.options.color;
    this.options.color = nv.utils.getColor(_);
    return this;
};

/**
 * The discreteBar model returns a function wrapping an instance of a DiscreteBar.
 */
nv.models.discreteBar = function () {
    "use strict";

    var discreteBar = new DiscreteBar();

    function chart(selection) {
        discreteBar.render(selection);
        return chart;
    }

    chart.dispatch = discreteBar.dispatch;

    chart.options = nv.utils.optionsFunc.bind(chart);

    nv.utils.rebindp(chart, discreteBar, DiscreteBar.prototype,
        'x', 'y', 'margin', 'width', 'height', 'xScale', 'yScale', 'xDomain', 'yDomain', 'xRange', 'yRange',
        'forceY', 'id', 'showValues', 'valueFormat', 'rectClass', 'color'
    );

    return chart;
};var DiscreteBarChartPrivates = {
    defaultState : null
    , xTicksPadding: [5, 17]
    , xScale: null
    , yScale: null
    , transitionDuration : 250
};

/**
 * A DiscreteBarChart
 */
function DiscreteBarChart(options){
    options = nv.utils.extend({}, options, DiscreteBarChartPrivates, {
        margin: {top: 15, right: 10, bottom: 50, left: 60}
        , chartClass: 'discreteBarWithAxes'
        , wrapClass: 'barsWrap'
    });

    this.discreteBar = this.getDiscreteBar();
    this.state = this.getStatesManager();

    Chart.call(this, options);
}

nv.utils.create(DiscreteBarChart, Chart, DiscreteBarChartPrivates);

DiscreteBarChart.prototype.getDiscreteBar = function(){
    return nv.models.discreteBar();
};

/**
 * @override Layer::wrapper
 */
DiscreteBarChart.prototype.wrapper = function (data) {
    Chart.prototype.wrapper.call(this, data, []);
};

/**
 * @override Layer::draw
 */
DiscreteBarChart.prototype.draw = function(data){

    this.discreteBar
        .width(this.available.width)
        .height(this.available.height)
    ;
    var discreteBarWrap = this.g.select('.nv-barsWrap').datum(data);
    d3.transition(discreteBarWrap).call(this.discreteBar);

    this.xScale(this.discreteBar.xScale());
    this.yScale(this.discreteBar.yScale().clamp(true));
    this.x(this.discreteBar.x());
    this.y(this.discreteBar.y());
    this.id(this.discreteBar.id());

/*    this.gEnter.insert('g', '.nv-'+this.options.wrapClass).attr('class', 'nv-y nv-axis')
        .append('g')
        .attr('class', 'nv-zeroLine')
        .append('line');*/

    this.defsEnter.append('clipPath')
        .attr('id', 'nv-x-label-clip-' + this.id())
        .append('rect');

    this.g.select('#nv-x-label-clip-' + this.id() + ' rect')
        .attr('width', this.xScale().rangeBand() * (this.staggerLabels() ? 2 : 1))
        .attr('height', 16)
        .attr('x', -this.xScale().rangeBand() / (this.staggerLabels() ? 1 : 2 ));

    // Zero line
    this.g.select(".nv-zeroLine line")
        .attr("x1",0)
        .attr("x2", this.available.width)
        .attr("y1", this.y()(0))
        .attr("y2", this.y()(0));

    Chart.prototype.draw.call(this, data);
};

/**
 * @override Layer::attachEvents
 */
DiscreteBarChart.prototype.attachEvents = function(){
    Chart.prototype.attachEvents.call(this);

    this.discreteBar.dispatch
        .on('elementMouseout.tooltip', function(e) {
            this.dispatch.tooltipHide(e);
        }.bind(this))
        .on('elementMouseover.tooltip', function(e) {
            e.pos = [e.pos[0] +  this.margin().left, e.pos[1] + this.margin().top];
            this.dispatch.tooltipShow(e);
        }.bind(this));
};

DiscreteBarChart.prototype.showTooltip = function(e) {
    var offsetElement = this.svg[0][0],
        left = e.pos[0] + ( offsetElement.offsetLeft || 0 ),
        top = e.pos[1] + ( offsetElement.offsetTop || 0),
        x = this.xAxis().tickFormat()(this.x()(e.point, e.pointIndex)),
        y = this.yAxis().tickFormat()(this.y()(e.point, e.pointIndex)),
        content = this.tooltip()(e.series.key, x, y);
    nv.tooltip.show([left, top], content, e.value < 0 ? 'n' : 's', null, offsetElement);
};

/**
 * The discreteBarChart model returns a function wrapping an instance of a DiscreteBarChart.
 */
nv.models.discreteBarChart = function() {
    "use strict";

    var discreteBarChart = new DiscreteBarChart();

    function chart(selection) {
        discreteBarChart.render(selection);
        return chart;
    }

    chart.legend = discreteBarChart.legend;
    chart.dispatch = discreteBarChart.dispatch;
    chart.discreteBar = discreteBarChart.discreteBar;

    // DO NOT DELETE. This is currently overridden below
    // until deprecated portions are removed.
    chart.state = discreteBarChart.state;

    d3.rebind(chart, discreteBarChart.discreteBar,
        'color', 'x', 'y', 'xDomain', 'yDomain', 'xRange', 'yRange', 'forceX', 'forceY', 'id', 'showValues', 'valueFormat'
    );

    chart.options = nv.utils.optionsFunc.bind(chart);

    nv.utils.rebindp(chart, discreteBarChart, DiscreteBarChart.prototype,
        'margin', 'width', 'height', 'tooltips', 'tooltipContent', 'showLegend', 'showXAxis', 'showYAxis',
        'rightAlignYAxis', 'staggerLabels', 'noData', 'transitionDuration', 'state'
    );

    return chart;
};
var HistoricalBarPrivates = {
    xScale : d3.scale.linear()
    , yScale : d3.scale.linear()
    , forceX : null
    , forceY : [0]
    , padData : false
    , clipEdge : true
    , xDomain : null
    , yDomain : null
    , xRange: null
    , yRange: null
    , interactive : true
};

/**
 * A HistoricalBar
 */
function HistoricalBar(options){
    options = nv.utils.extend({}, options, HistoricalBarPrivates, {
        margin: {top: 0, right: 0, bottom: 0, left: 0}
        , width: 960
        , height: 500
        , chartClass: 'historicalBar'
    });

    Layer.call(this, options, []);
}

nv.utils.create(HistoricalBar, Layer, HistoricalBarPrivates);

/**
 * @override Layer::attachEvents
 */
HistoricalBar.prototype.attachEvents = function(){
    Layer.prototype.attachEvents.call(this);
    this.svg.on('click', function(d,i) {
        this.dispatch.chartClick({
            data: d,
            index: i,
            pos: d3.event,
            id: this.id()
        });
    }.bind(this));
};

/**
 * @override Layer::wrapper
 */
HistoricalBar.prototype.wrapper = function(data){
    Layer.prototype.wrapper.call(this, data[0].values, ['nv-bars'])
};

/**
 * @override Layer::draw
 */
HistoricalBar.prototype.draw = function(data){

    var that = this
        , availableWidth = this.available.width
        , availableHeight = this.available.height;

    this.xScale()
        .domain(this.xDomain() || d3.extent(data[0].values.map(this.x()).concat(this.forceX())) );

    if (this.padData())
        this.xScale().range(this.xRange() || [availableWidth * .5 / data[0].values.length, availableWidth * (data[0].values.length - .5)  / data[0].values.length ]);
    else
        this.xScale().range(this.xRange() || [0, availableWidth]);

    this.yScale().domain(this.yDomain() || d3.extent(data[0].values.map(this.y()).concat(this.forceY()) ))
        .range(this.yRange() || [availableHeight, 0]);

    // If scale's domain don't have a range, slightly adjust to make one... so a chart can show a single data point

    if (this.xScale().domain()[0] === this.xScale().domain()[1])
        this.xScale().domain()[0] ?
            this.xScale().domain([this.xScale().domain()[0] - this.xScale().domain()[0] * 0.01, this.xScale().domain()[1] + this.xScale().domain()[1] * 0.01])
            : this.xScale().domain([-1,1]);

    if (this.yScale().domain()[0] === this.yScale().domain()[1])
        this.yScale().domain()[0] ?
            this.yScale().domain([this.yScale().domain()[0] + this.yScale().domain()[0] * 0.01, this.yScale().domain()[1] - this.yScale().domain()[1] * 0.01])
            : this.yScale().domain([-1,1]);

    this.defsEnter.append('clipPath')
        .attr('id', 'nv-chart-clip-path-' + this.id())
        .append('rect');

    this.wrap.select('#nv-chart-clip-path-' + this.id() + ' rect')
        .attr('width', availableWidth)
        .attr('height', availableHeight);

    this.g.attr('clip-path', this.clipEdge() ? 'url(#nv-chart-clip-path-' + this.id() + ')' : '');

    var bars = this.wrap.select('.nv-bars')
        .selectAll('.nv-bar')
        .data(function(d) { return d }, function(d,i) {return that.x()(d,i)});

    bars.exit().remove();

    var barsEnter = bars.enter().append('rect')
        //.attr('class', function(d,i,j) { return (getY(d,i) < 0 ? 'nv-bar negative' : 'nv-bar positive') + ' nv-bar-' + j + '-' + i })
        .attr('x', 0 )
        .attr('y', function(d) {  return nv.utils.NaNtoZero(that.yScale()(Math.max(0, that.y()(d)))) })
        .attr('height', function(d,i) { return nv.utils.NaNtoZero(Math.abs(that.yScale()(that.y()(d)) - that.yScale()(0))) })
        .attr('transform', function(d,i) { return 'translate(' + (that.xScale()(that.x()(d,i)) - availableWidth / data[0].values.length * .45) + ',0)'; })
        .on('mouseover', function(d,i) {
            if (!that.interactive()) return;
            d3.select(this).classed('hover', true);
            that.dispatch.elementMouseover({
                point: d,
                series: data[0],
                pos: [that.xScale()(that.x()(d,i)), that.yScale()(that.y()(d,i))],  // TODO: Figure out why the value appears to be shifted
                pointIndex: i,
                seriesIndex: 0,
                e: d3.event
            });
        })
        .on('mouseout', function(d,i) {
            if (!that.interactive()) return;
            d3.select(this).classed('hover', false);
            that.dispatch.elementMouseout({
                point: d,
                series: data[0],
                pointIndex: i,
                seriesIndex: 0,
                e: d3.event
            });
        })
        .on('click', function(d,i) {
            if (!that.interactive()) return;
            that.dispatch.elementClick({
                //label: d[label],
                value: that.y()(d,i),
                data: d,
                index: i,
                pos: [that.xScale()(that.x()(d,i)), that.yScale()(that.y()(d,i))],
                e: d3.event,
                id: that.id()
            });
            d3.event.stopPropagation();
        })
        .on('dblclick', function(d,i) {
            if (!that.interactive()) return;
            that.dispatch.elementDblClick({
                //label: d[label],
                value: that.y()(d,i),
                data: d,
                index: i,
                pos: [that.xScale()(that.x()(d,i)), that.yScale()(that.y()(d,i))],
                e: d3.event,
                id: that.id()
            });
            d3.event.stopPropagation();
        });

    bars
        .attr('fill', function(d, i) { return that.color()(d, i); })
        .attr('class', function(d,i,j) { return (that.y()(d,i) < 0 ? 'nv-bar negative' : 'nv-bar positive') + ' nv-bar-' + j + '-' + i })
        .transition()
        .attr('transform', function(d,i) { return 'translate(' + (that.xScale()(that.x()(d,i)) - availableWidth / data[0].values.length * .45) + ',0)'; })
        //TODO: better width calculations that don't assume always uniform data spacing;w
        .attr('width', (availableWidth / data[0].values.length) * .9 );

    bars.transition()
        .attr('y', function(d,i) {
            var rval = that.y()(d,i) < 0 ?
                that.yScale()(0) :
                that.yScale()(0) - that.yScale()(that.y()(d,i)) < 1 ?
                    that.yScale()(0) - 1 :
                    that.yScale()(that.y()(d,i));
            return nv.utils.NaNtoZero(rval);
        })
        .attr('height', function(d,i) { return nv.utils.NaNtoZero(Math.max(Math.abs(that.yScale()(that.y()(d,i)) - that.yScale()(0)),1)) });
};

HistoricalBar.prototype.color = function(_){
    if (!arguments.length) return this.options.color;
    this.options.color = nv.utils.getColor(_);
    return this;
};

//Create methods to allow outside functions to highlight a specific bar.
HistoricalBar.prototype.highlightPoint = function(pointIndex, isHoverOver) {
    d3.select(".nv-"+this.options.chartClass+"-" + this.id())
        .select(".nv-bars .nv-bar-0-" + pointIndex)
        .classed("hover", isHoverOver);
};

HistoricalBar.prototype.clearHighlights = function() {
    d3.select(".nv-"+this.options.chartClass+"-" + this.id())
        .select(".nv-bars .nv-bar.hover")
        .classed("hover", false);
};

/**
 * The historicalBar model returns a function wrapping an instance of a HistoricalBar.
 */
nv.models.historicalBar = function () {
    "use strict";

    var historicalBar = new HistoricalBar();

    function chart(selection) {
        historicalBar.render(selection);
        return chart;
    }

    chart.dispatch = historicalBar.dispatch;

    chart.options = nv.utils.optionsFunc.bind(chart);

    nv.utils.rebindp(chart, historicalBar, HistoricalBar.prototype,
        'x', 'y', 'width', 'height', 'margin', 'xScale', 'yScale', 'xDomain', 'yDomain', 'xRange', 'yRange',
        'forceX', 'forceY', 'padData', 'clipEdge', 'color', 'id', 'interactive'
    );

    return chart;
};
var HistoricalBarChartPrivates = {
    defaultState : null
    , transitionDuration : 250
};

/**
 * A HistoricalBarChart
 */
function HistoricalBarChart(options){

    options = nv.utils.valueOrDefault(options, {
        margin: {top: 30, right: 90, bottom: 50, left: 90}
        , chartClass: 'historicalBarChart'
        , wrapClass: 'barsWrap'
    });

    Chart.call(this, options);

    this.historicalBar = nv.models.historicalBar();
    this.xScale = this.historicalBar.xScale;
    this.yScale = this.historicalBar.yScale;
    this.state = this.getStatesManager();
}

nv.utils.create(HistoricalBarChart, Chart, HistoricalBarChartPrivates);

/**
 * @override Layer::wrapper
 */
HistoricalBarChart.prototype.wrapper = function(data){
    Chart.prototype.wrapper.call(this, data);
};

/**
 * @override Layer::draw
 */
HistoricalBarChart.prototype.draw = function(data){

    this.historicalBar
        .width(this.available.width)
        .height(this.available.height)
        .color(
            d3.functor(
                data.map(function(d,i) { return d.color || this.color(d, i)}.bind(this))
                    .filter(function(d,i) { return !data[i].disabled })
            )
        );

    var barsWrap = this.g.select('.nv-barsWrap')
        .datum(data.filter(function(d) { return !d.disabled }))
        .transition()
        .call(this.historicalBar);

    Chart.prototype.draw.call(this, data);

};

/**
 * @override Layer::attacheEvents
 */
HistoricalBarChart.prototype.attachEvents = function(){
    Chart.prototype.attachEvents.call(this);

    var data = null;
    this.svg.call(function(selection){
        selection.each(function(d){
            data = d
        })
    });

    this.historicalBar.dispatch
        .on('elementMouseover.tooltip', function(e) {
            e.pos = [e.pos[0] +  this.margin().left, e.pos[1] + this.margin().top];
            this.dispatch.tooltipShow(e);
        }.bind(this))
        .on('elementMouseout.tooltip', function(e) {
            this.dispatch.tooltipHide(e);
        }.bind(this));

    this.legend.dispatch
        .on('legendClick', function(d) {
            d.disabled = !d.disabled;
            if (!data.filter(function(d) { return !d.disabled }).length) {
                data.map(function(d) {
                    d.disabled = false;
                    this.wrap.selectAll('.nv-series').classed('disabled', false);
                    return d;
                }.bind(this));
            }
            this.state.disabled = data.map(function(d) { return !!d.disabled });
            this.dispatch.stateChange(this.state);
            this.svg.transition().call(this.historicalBar);
        }.bind(this))
        .on('legendDblclick', function(d) {
            //Double clicking should always enable current series, and disabled all others.
            data.forEach(function(d) { d.disabled = true });
            d.disabled = false;
            this.state.disabled = data.map(function(d) { return !!d.disabled });
            this.dispatch.stateChange(this.state);
            this.update();
        }.bind(this));

    // add parentNode, override Charts' 'tooltipShow'
    this.dispatch
        .on('tooltipShow', function(e) {
            if (this.tooltips()) this.showTooltip(e, this.svg[0][0].parentNode);
        }.bind(this));
};

HistoricalBarChart.prototype.color = function(_) {
    if (!arguments.length) return this.options.color;
    this.options.color = nv.utils.getColor(_);
    this.legend.color(this.color());
    return this;
};

HistoricalBarChart.prototype.rightAlignYAxis = function(_) {
    if(!arguments.length) return this.options.rightAlignYAxis;
    this.options.rightAlignYAxis = _;
    this.yAxis().orient( (_) ? 'right' : 'left');
    return this;
};

HistoricalBarChart.prototype.showTooltip = function(e, offsetElement) {
    // New addition to calculate position if SVG is scaled with viewBox, may move TODO: consider implementing everywhere else
    if (offsetElement) {
        var svg = d3.select(offsetElement).select('svg');
        var viewBox = (svg.node()) ? svg.attr('viewBox') : null;
        if (viewBox) {
            viewBox = viewBox.split(' ');
            var ratio = parseInt(svg.style('width')) / viewBox[2];
            e.pos[0] = e.pos[0] * ratio;
            e.pos[1] = e.pos[1] * ratio;
        }
    }
    var left = e.pos[0] + ( offsetElement.offsetLeft || 0 ),
        top = e.pos[1] + ( offsetElement.offsetTop || 0),
        x = this.xAxis().tickFormat()(this.historicalBar.x()(e.point, e.pointIndex)),
        y = this.yAxis().tickFormat()(this.historicalBar.y()(e.point, e.pointIndex)),
        content = this.tooltip()(e.series.key, x, y);
    nv.tooltip.show([left, top], content, null, null, offsetElement);
};

/**
 * The historicalBarChart model returns a function wrapping an instance of a HistoricalBarChart.
 */
nv.models.historicalBarChart = function() {
    "use strict";

    var historicalBarChart = new HistoricalBarChart();

    function chart(selection) {
        historicalBarChart.render(selection);
        return chart;
    }

    chart.dispatch = historicalBarChart.dispatch;
    chart.historicalBar = historicalBarChart.historicalBar;
    chart.state = historicalBarChart.state;

    d3.rebind(chart, historicalBarChart.historicalBar, 'defined', 'isArea', 'x', 'y', 'size', 'xScale', 'yScale',
        'xDomain', 'yDomain', 'xRange', 'yRange', 'forceX', 'forceY', 'interactive', 'clipEdge', 'clipVoronoi',
        'id', 'interpolate','highlightPoint', 'clearHighlights', 'interactive');

    chart.options = nv.utils.optionsFunc.bind(chart);

    nv.utils.rebindp(chart, historicalBarChart, HistoricalBarChart.prototype,
        'margin', 'width', 'height', 'color', 'showLegend', 'showXAxis', 'showYAxis', 'rightAlignYAxis', 'tooltips',
        'tooltipContent', 'state', 'defaultState', 'noData', 'transitionDuration', 'xAxis', 'yAxis'
    );

    return chart;
};
var MultiBarPrivates = {
    xScale: d3.scale.ordinal()
    , yScale: d3.scale.linear()
    , disabled: []
    , xDomain: null
    , yDomain: null
    , xRange: null
    , yRange: null
    , clipEdge: true
    , stacked: false
    , stackOffset: 'zero' // options include 'silhouette', 'wiggle', 'expand', 'zero', or a custom function
    , hideable: false
    , groupSpacing: 0.1
    , forceY: [0] // 0 is forced by default.. this makes sense for the majority of bar graphs... user can always do chart.forceY([]) to remove
    , xScale0: null
    , yScale0: null
    , duration: 1000
    , barColor: null
};

/**
 * A MultiBar
 */
function MultiBar(options){
    options = nv.utils.extend({}, options, MultiBarPrivates, {
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
        width: 500,
        height: 500,
        chartClass: 'multibar'
    });

    Layer.call(this, options, []);

    this.renderWatch = nv.utils.renderWatch(this.dispatch, this.duration());
}

nv.utils.create(MultiBar, Layer, MultiBarPrivates);

/**
 * @override Layer::wrapper
 */
MultiBar.prototype.wrapper = function(data){
    Layer.prototype.wrapper.call(this, data, ['nv-groups']);
};

/**
 * @override Layer::draw
 */
MultiBar.prototype.draw = function(data){

    var that = this,
        availableWidth = this.available.width
        , availableHeight = this.available.height
        , hideable = []
        , seriesData = null
        , exitTransition = null
        , barsEnter = null
        , endFn = function(d, i) { // This function defines the requirements for render complete
            return d.series === data.length - 1 && i === data[0].values.length - 1;
        }
        , onMouseEventObject = function(d,i){
            return {
                value     : that.y()(d),
                point     : d,
                series    : data[d.series],
                pos       : [that.xScale()(that.x()(d)) + (that.xScale().rangeBand() * (that.stacked() ? data.length / 2 : d.series + .5) / data.length), that.yScale()(that.y()(d) + (that.stacked() ? d.y0 : 0))],  // TODO: Figure out why the value appears to be shifted
                pointIndex: i,
                seriesIndex: d.series,
                e         : d3.event
            }
        };

    if(this.hideable() && data.length)
        hideable = [{
            values: data[0].values.map(function(d) {
                    return {
                        x: d.x,
                        y: 0,
                        series: d.series,
                        size: 0.01
                    };}
            )}];

    if (this.stacked())
        data = d3.layout.stack()
            .offset(this.stackOffset())
            .values(function(d){ return d.values })
            .y(this.y())
            (!data.length && hideable ? hideable : data);

    //add series index to each data point for reference
    data.forEach(function(series, i) {
        series.values.forEach(function(point) {
            point.series = i;
        });
    });

    //------------------------------------------------------------
    // HACK for negative value stacking
    if (this.stacked())
        data[0].values.map(function(d,i) {
            var posBase = 0, negBase = 0;
            data.map(function(d) {
                var f = d.values[i];
                f.size = Math.abs(f.y);
                if ( f.y < 0 )  {
                    f.y1 = negBase;
                    negBase = negBase - f.size;
                } else {
                    f.y1 = f.size + posBase;
                    posBase = posBase + f.size;
                }
            });
        });

    //------------------------------------------------------------
    // Setup Scales

    // remap and flatten the data for use in calculating the scales' domains
    seriesData = (this.xDomain() && this.yDomain()) ? [] : // if we know xDomain and yDomain, no need to calculate
        data.map(function(d) {
            return d.values.map(function(d) {
                return { x: that.x()(d), y: that.y()(d), y0: d.y0, y1: d.y1 }
            })
        });

    this.xScale()
        .domain(this.xDomain() || d3.merge(seriesData).map(that.x()) )
        .rangeBands( (this.xRange() || [0, availableWidth]), this.groupSpacing());

    this.yScale().domain(
            this.yDomain() || d3.extent(
                d3.merge(seriesData)
                    .map(function(d) { return that.stacked() ? that.y()(d) > 0 ? d.y1 : d.y1 + that.y()(d) : that.y()(d)} )
                    .concat(this.forceY())
            )
        )
        .range(this.yRange() || [availableHeight, 0]);

    // If scale's domain don't have a range, slightly adjust to make one... so a chart can show a single data point
    if (this.xScale().domain()[0] === this.xScale().domain()[1])
        this.xScale().domain()[0]
            ? this.xScale().domain([this.xScale().domain()[0] - this.xScale().domain()[0] * 0.01, this.xScale().domain()[1] + this.xScale().domain()[1] * 0.01])
            : this.xScale().domain([-1,1]);

    if (this.yScale().domain()[0] === this.yScale().domain()[1])
        this.yScale().domain()[0]
            ? this.yScale().domain([this.yScale().domain()[0] + this.yScale().domain()[0] * 0.01, this.yScale().domain()[1] - this.yScale().domain()[1] * 0.01])
            : this.yScale().domain([-1,1]);

    this.xScale0( this.xScale0() || this.xScale() );
    this.yScale0( this.yScale0() || this.yScale() );

    this.defsEnter.append('clipPath')
        .attr('id', 'nv-edge-clip-' + this.id())
        .append('rect');
    this.wrap.select('#nv-edge-clip-' + this.id() + ' rect')
        .attr('width', availableWidth)
        .attr('height', availableHeight);

    this.g.attr('clip-path', this.clipEdge() ? 'url(#nv-edge-clip-' + this.id() + ')' : '');

    var groups = this.wrap.select('.nv-groups').selectAll('.nv-group')
        .data(function(d) { return d }, function(d,i) { return i });
    groups.enter().append('g')
        .style('stroke-opacity', this.opacityDefault())
        .style('fill-opacity', this.opacityDefault());

    exitTransition = this.renderWatch
        .transition(
            groups.exit().selectAll('rect.nv-bar'),
            'multibarExit',
            Math.min(250, this.duration())
        )
        .attr('y', function(d) { return that.stacked() ? that.yScale0()(d.y0) : that.yScale0()(0)})
        .attr('height', 0)
        .remove();
    if (exitTransition.delay)
        exitTransition.delay(function(d,i) {
            return i * that.duration() / data[0].values.length;
        });

    groups
        .attr('class', function(d,i) { return 'nv-group nv-series-' + i })
        .classed('hover', function(d) { return d.hover })
        .style('fill', function(d,i){ return that.color()(d, i) })
        .style('stroke', function(d,i){ return that.color()(d, i)});
    groups
        .style('stroke-opacity', 1)
        .style('fill-opacity', 0.75);

    var bars = groups.selectAll('rect.nv-bar')
        .data(function(d) {
            return (hideable && !data.length) ? hideable.values : d.values
        });

    bars.exit().remove();

    barsEnter = bars.enter().append('rect')
        .attr('class', function(d) {
            return that.y()(d) < 0 ? 'nv-bar negative' : 'nv-bar positive'
        })
        .attr('x', function(d,i,j) {
            return that.stacked() ? 0 : (j * that.xScale().rangeBand() / data.length )
        })
        .attr('y', function(d) {
            return that.yScale0()(that.stacked() ? d.y0 : 0)
        })
        .attr('height', 0)
        .attr('width', this.xScale().rangeBand() / (this.stacked() ? 1 : data.length) )
        .attr('transform', function(d) { return 'translate(' + that.xScale()(that.x()(d)) + ',0)';});

    bars
        .style('fill', function(d,i,j){ return that.color()(d, j, i);})
        .style('stroke', function(d,i,j){ return that.color()(d, j, i);})
        .on('mouseover', function(d,i) { //TODO: figure out why j works above, but not here
            d3.select(this).classed('hover', true);
            that.dispatch.elementMouseover( onMouseEventObject(d,i) );
        })
        .on('mouseout', function(d,i) {
            d3.select(this).classed('hover', false);
            that.dispatch.elementMouseout( onMouseEventObject(d,i) );
        })
        .on('click', function(d,i) {
            that.dispatch.elementClick( onMouseEventObject(d,i) );
            d3.event.stopPropagation();
        })
        .on('dblclick', function(d,i) {
            that.dispatch.elementDblClick( onMouseEventObject(d,i) );
            d3.event.stopPropagation();
        });
    bars
        .attr('class', function(d) { return that.y()(d) < 0 ? 'nv-bar negative' : 'nv-bar positive'})
        .transition()
        .attr('transform', function(d) { return 'translate(' + that.xScale()(that.x()(d)) + ',0)'; });

    function _colorBar (d,i,j) {
        return d3.rgb(that.barColor()(d,i))
            .darker(
                that.disabled().map(function(d,i) { return i })
                    .filter(function(d,i){ return !that.disabled[i]})[j]
            )
            .toString()
    }

    if (this.barColor()) {
        if (!this.disabled())
            this.disabled(data.map(function() { return true }));
        bars
            .style('fill', _colorBar)
            .style('stroke', _colorBar);
    }

    var barSelection =
        bars.watchTransition(this.renderWatch, 'multibar', Math.min(250, this.duration()))
            .delay(function(d,i) { return i * that.duration() / data[0].values.length });
    if (this.stacked())
        barSelection
            .attr('y', function(d) {
                return that.y()(that.stacked() ? d.y1 : 0)
            })
            .attr('height', function(d){
                return Math.max(Math.abs(that.yScale()(d.y + (that.stacked() ? d.y0 : 0)) - that.yScale()((that.stacked() ? d.y0 : 0))),1);
            })
            .attr('x', function(d) { return that.stacked() ? 0 : (d.series * that.xScale().rangeBand() / data.length ) })
            .attr('width', this.xScale().rangeBand() / (this.stacked() ? 1 : data.length) );
    else
        barSelection
            .attr('x', function(d) { return d.series * that.xScale().rangeBand() / data.length })
            .attr('width', this.xScale().rangeBand() / data.length)
            .attr('y', function(d) {
                return that.yScale()(d) < 0 ?
                    that.yScale()(0) :
                    that.yScale()(0) - that.yScale()(that.y()(d)) < 1 ?
                        that.yScale()(0) - 1 :
                        that.yScale()(that.y()(d)) || 0;
            })
            .attr('height', function(d, i) {
                return Math.max(Math.abs(that.yScale()(that.y()(d,i)) - that.yScale()(0)),1) || 0;
            });

    //store old scales for use in transitions on update
/*
    this.xScale0( this.xScale().copy );
    this.yScale0( this.yScale().copy );
*/
};

MultiBar.prototype.duration = function(_) {
    if (!arguments.length) return this.options.duration;
    this.options.duration = _;
    this.renderWatch.reset(_);
    return this;
};

MultiBar.prototype.delay = function(_) {
    nv.deprecated('multiBar.delay');
    return this.duration(_);
};

MultiBar.prototype.barColor = function(_) {
    if (!arguments.length) return this.options.barColor;
    this.options.barColor = nv.utils.getColor(_);
    return this;
};

/**
 * The multiBar model returns a function wrapping an instance of a MultiBar.
 */
nv.models.multiBar = function () {
    "use strict";

    var multiBar = new MultiBar();

    function chart(selection) {
        multiBar.render(selection);
        return chart;
    }

    chart.dispatch = multiBar.dispatch;

    chart.options = nv.utils.optionsFunc.bind(chart);

    nv.utils.rebindp(chart, multiBar, MultiBar.prototype,
        'margin', 'width', 'height', 'x', 'y', 'color', 'barColor', 'description', 'showLabels',
        'xScale', 'yScale', 'disabled', 'xDomain', 'yDomain', 'xRange', 'yRange', 'clipEdge', 'stacked', 'stackOffset',
        'hideable', 'groupSpacing', 'duration', 'forceY', 'id',
        'delay'// deprecated
    );

    return chart;
};
var MultiBarChartPrivates = {
    stacked : false
    , defaultState : null
    , showControls: true
    , color : null
    , xScale: null
    , yScale: null
    , tooltips: true
    , duration: 250
};

/**
 * A MultiBarChart
 */
function MultiBarChart(options){
    options = nv.utils.extend({}, options, MultiBarChartPrivates, {
        margin: {top: 30, right: 20, bottom: 50, left: 60}
        , chartClass: 'multiBarWithLegend'
        , wrapClass: 'barsWrap'
    });

    Chart.call(this, options);

    this.multibar = this.getMultiBar();
    this.controls = this.getLegend();

    this.state = this.getStatesManager();
    this.state.stacked = false; // DEPRECATED Maintained for backward compatibility

    this.controlWidth = function() { return this.showControls() ? 180 : 0};
    this.controlsData = [];

    var that = this;
    this.stateGetter = function (data) {
        return function(){
            return {
                active: data.map(function(d) { return !d.disabled }),
                stacked: that.stacked()
            }
        }
    };
    this.stateSetter = function(data) {
        return function(state) {
            if (state.stacked !== undefined)
                that.stacked(state.stacked);
            if (state.active !== undefined)
                data.forEach(function(series,i) {
                    series.disabled = !state.active[i];
                });
        }
    };

    this.controls.updateState(false); // DEPRECATED
}

nv.utils.create(MultiBarChart, Chart, MultiBarChartPrivates);

MultiBarChart.prototype.getMultiBar = function(){
    return nv.models.multiBar();
};

MultiBarChart.prototype.getLegend = function(){
    return nv.models.legend();
};

/**
 * @override Layer::wrapper
 */
MultiBarChart.prototype.wrapper = function (data) {
    Chart.prototype.wrapper.call(this, data, ['nv-controlsWrap']);
    this.renderWatch = nv.utils.renderWatch(this.dispatch);
    this.renderWatch.reset();
    if (this.showXAxis()) this.renderWatch.models(this.xAxis());
    if (this.showYAxis()) this.renderWatch.models(this.yAxis());
    this.renderWatch.models(this.multibar);
};

/**
 * @override Layer::draw
 */
MultiBarChart.prototype.draw = function(data){

    this.multibar
        .stacked(this.stacked())
        .disabled(data.map(function(series) { return series.disabled }))
        .width(this.available.width)
        .height(this.available.height);

    this.xScale( this.multibar.xScale() );
    this.yScale( this.multibar.yScale() );

    var barsWrap = this.g.select('.nv-barsWrap').datum(data.filter(function(d) { return !d.disabled }));
    d3.transition(barsWrap).call(this.multibar);

    this.state
        .setter(this.stateSetter(data), this.update)
        .getter(this.stateGetter(data))
        .update();
    this.state.disabled = data.map(function(d) { return !!d.disabled }); // DEPRECATED set state.disabled

    if (this.showControls()) {
        this.controlsData = [
            { key: 'Grouped', disabled: this.stacked() },
            { key: 'Stacked', disabled: !this.stacked() }
        ];
        this.controls
            .width(this.controlWidth())
            .color(['#444', '#444', '#444']);
        this.g.select('.nv-controlsWrap')
            .datum(this.controlsData)
            .attr('transform', 'translate(0,' + (-this.margin().top) +')')
            .call(this.controls);
    }

    Chart.prototype.draw.call(this, data);
};

/**
 * Set up listeners for dispatches fired on the underlying
 * multiBar graph.
 *
 * @override Layer::attachEvents
 */
MultiBarChart.prototype.attachEvents = function(){
    Chart.prototype.attachEvents.call(this);

    this.multibar.dispatch
        .on('elementMouseover.tooltip', function(e) {
            e.pos = [e.pos[0] +  this.margin().left, e.pos[1] + this.margin().top];
            this.dispatch.tooltipShow(e);
        }.bind(this))
        .on('elementMouseout.tooltip', function(e) {
            this.dispatch.tooltipHide(e);
        }.bind(this));

    this.legend.dispatch.on('legendClick', function() {
        this.update();
    }.bind(this));

    this.controls.dispatch.on('legendClick', function(d) {
        if (!d.disabled) return;
        this.controlsData =
            this.controlsData.map(function(s) {
                s.disabled = true;
                return s;
            });
        d.disabled = false;

        switch (d.key) {
            case 'Grouped':
                this.stacked(false);
                this.multibar.stacked(false);
                break;
            case 'Stacked':
                this.stacked(true);
                this.multibar.stacked(true);
                break;
        }

        // DEPRECATED
        this.state.stacked = this.multibar.stacked();
        this.dispatch.stateChange(this.state);
        // END DEPRECATED

        this.update();
    }.bind(this));

    this.dispatch
        .on('tooltipShow', function(e) {
            if (this.tooltips()) this.showTooltip(e, this.svg[0][0].parentNode)
        }.bind(this))
        // DEPRECATED
        // Update chart from a state object passed to event handler
        .on('changeState', function(e) {
            if (typeof e.disabled !== 'undefined') {
                this.data.forEach(function(series,i) {
                    series.disabled = e.disabled[i];
                });
                this.state.disabled = e.disabled;
            }
            if (typeof e.stacked !== 'undefined') {
                this.multibar.stacked(e.stacked);
                this.state.stacked = e.stacked;
                this.stacked(e.stacked);
            }
            this.update();
        }.bind(this));
        // END DEPRECATED
};

/**
 * Set the underlying color, on both the chart, and the composites.
 */
MultiBarChart.prototype.color = function(_){
    if (!arguments.length) return this.options.color;
    this.options.color = nv.utils.getColor(_);
    this.legend.color( this.options.color );
    this.multibar.color( this.options.color );
    return this;
};

MultiBarChart.prototype.showTooltip = function(e, offsetElement) {
    var left = e.pos[0] + ( offsetElement.offsetLeft || 0 ),
        top = e.pos[1] + ( offsetElement.offsetTop || 0),
        x = this.xAxis().tickFormat()(this.multibar.x()(e.point, e.pointIndex)),
        y = this.yAxis().tickFormat()(this.multibar.y()(e.point, e.pointIndex)),
        content = this.tooltip()(e.series.key, x, y);

    nv.tooltip.show([left, top], content, e.value < 0 ? 'n' : 's', null, offsetElement);
};

MultiBarChart.prototype.transitionDuration = function(_) {
    nv.deprecated('multiBarChart.transitionDuration');
    return this.duration(_);
};

MultiBarChart.prototype.duration = function(_) {
    if (!arguments.length) return this.options.duration;
    this.options.duration = _;
    this.multibar.duration(_);
    this.xAxis().duration(_);
    this.yAxis().duration(_);
    this.renderWatch.reset(_);
    return this;
};

// DEPRECATED
MultiBarChart.prototype.state = function(_) {
    nv.deprecated('multiBarChart.state');
    if (!arguments.length) return this.options.state;
    this.options.state = _;
    return this;
};
// END DEPRECATED

/**
 * The multiBarChart model returns a function wrapping an instance of a MultiBarChart.
 */
nv.models.multiBarChart = function() {
    "use strict";

    var multiBarChart = new MultiBarChart();

    function chart(selection) {
        multiBarChart.render(selection);
        return chart;
    }

    chart.dispatch = multiBarChart.dispatch;
    chart.multibar = multiBarChart.multibar;
    chart.legend = multiBarChart.legend;

    // DO NOT DELETE. This is currently overridden below
    // until deprecated portions are removed.
    chart.state = multiBarChart.state;

    d3.rebind(chart, multiBarChart.multibar,
        'x', 'y', 'xDomain', 'yDomain', 'xRange', 'yRange', 'forceX', 'forceY', 'clipEdge', 'id', 'stacked',
        'stackOffset', 'delay', 'barColor','groupSpacing', 'xScale', 'yScale'
    );

    chart.options = nv.utils.optionsFunc.bind(chart);

    nv.utils.rebindp(chart, multiBarChart, MultiBarChart.prototype,
        'margin', 'width', 'height', 'color', 'showControls', 'showLegend', 'showXAxis', 'showYAxis', 'rightAlignYAxis',
        'reduceXTicks', 'rotateLabels', 'staggerLabels', 'tooltip', 'tooltips', 'defaultState', 'noData',
        'transitionDuration', 'duration', 'xAxis', 'yAxis',
        'state'/*deprecated*/
    );

    return chart;
};

var MultiBarHorizontalPrivates = {
    xScale: d3.scale.ordinal()
    , yScale: d3.scale.linear()
    , forceY : [0] // 0 is forced by default.. this makes sense for the majority of bar graphs... user can always do chart.forceY([]) to remove
    , color : null
    , disabled : null// used in conjunction with barColor to communicate from multiBarHorizontalChart what series are disabled
    , stacked : false
    , showValues : false
    , showBarLabels : false
    , valuePadding : 60
    , valueFormat : d3.format(',.2f')
    , delay : 1200
    , xDomain: null
    , yDomain: null
    , xRange: null
    , yRange: null
    , duration: null
    , id: null

};

/**
 * A MultiBarHorizontal
 */
function MultiBarHorizontal(options){
    options = nv.utils.extend({}, options, MultiBarHorizontalPrivates, {
        margin: {top: 0, right: 0, bottom: 0, left: 0}
        , width: 960
        , height: 500
        , chartClass: 'multibarHorizontal'
        , wrapClass: ''
    });

    this._barColor = nv.utils.defaultColor(); // adding the ability to set the color for each rather than the whole group
    this._color = nv.utils.defaultColor();
    Chart.call(this, options, ['chartClick', 'elementClick', 'elementDblClick', 'elementMouseover', 'elementMouseout', 'renderEnd']);
}

nv.utils.create(MultiBarHorizontal, Chart, MultiBarHorizontalPrivates);

/**
 * @override Layer::wrapper
 */
MultiBarHorizontal.prototype.wrapper = function (data) {
    Layer.prototype.wrapper.call(this, data, ['nv-groups']);
};

/**
 * @override Layer::draw
 */
MultiBarHorizontal.prototype.draw = function(data){
    var that = this
        , x0 //used to store previous scales
        , y0 //used to store previous scales
    ;

    var availableWidth = this.available.width,
        availableHeight = this.available.height;

    if (this.stacked())
        data = d3.layout.stack()
            .offset('zero')
            .values(function(d){ return d.values })
            .y(this.y())
            (data);

    //add series index to each data point for reference
    data.forEach(function(series, i) {
        series.values.forEach(function(point) { point.series = i });
    });

    //------------------------------------------------------------
    // HACK for negative value stacking
    if (this.stacked())
        data[0].values.map(function(d,i) {
            var posBase = 0, negBase = 0;
            data.map(function(d) {
                var f = d.values[i];
                f.size = Math.abs(f.y);
                if ( f.y<0 ) {
                    f.y1 = negBase - f.size;
                    negBase = negBase - f.size;
                } else {
                    f.y1 = posBase;
                    posBase = posBase + f.size;
                }
            });
        });

    //------------------------------------------------------------
    // Setup Scales

    // remap and flatten the data for use in calculating the scales' domains
    var seriesData = (this.xDomain() && this.yDomain()) ? [] : // if we know xDomain and yDomain, no need to calculate
        data.map(function(d) {
            return d.values.map(function(d,i) {
                return { x: that.x()(d,i), y: that.y()(d,i), y0: d.y0, y1: d.y1 }
            })
        });

    this.xScale().domain(this.xDomain() || d3.merge(seriesData).map(function(d) { return d.x }))
        .rangeBands(this.xRange() || [0, availableHeight], .1);

    //y   .domain(yDomain || d3.extent(d3.merge(seriesData).map(function(d) { return d.y + (stacked ? d.y0 : 0) }).concat(forceY)))
    this.yScale().domain(this.yDomain() || d3.extent(d3.merge(seriesData).map(function(d) { return that.stacked() ? (d.y > 0 ? d.y1 + d.y : d.y1 ) : d.y }).concat(that.forceY())));

    if (this.showValues() && !this.stacked())
        this.yScale().range(this.yRange() || [(this.yScale().domain()[0] < 0 ? this.valuePadding() : 0), availableWidth - (this.yScale().domain()[1] > 0 ? this.valuePadding() : 0) ]);
    else
        this.yScale().range(this.yRange() || [0, availableWidth]);

    x0 = x0 || this.xScale();
    y0 = y0 || d3.scale.linear().domain(this.yScale().domain()).range([this.yScale()(0),this.yScale()(0)]);

    //------------------------------------------------------------

    var groups = this.wrap.select('.nv-groups').selectAll('.nv-group')
        .data(function(d) { return d }, function(d,i) { return i });
    groups.enter().append('g')
        .style('stroke-opacity', 1e-6)
        .style('fill-opacity', 1e-6);
    groups.exit().transition()
        .style('stroke-opacity', 1e-6)
        .style('fill-opacity', 1e-6)
        .remove();
    groups
        .attr('class', function(d,i) { return 'nv-group nv-series-' + i })
        .classed('hover', function(d) { return d.hover })
        .style('fill', function(d){ return that._color(d) })
        .style('stroke', function(d){ return that._color(d) });
    groups.transition()
        .style('stroke-opacity', 1)
        .style('fill-opacity', .75);

    var bars = groups.selectAll('g.nv-bar')
        .data(function(d) { return d.values });

    bars.exit().remove();

    var barsEnter = bars
        .enter().append('g')
        .attr('transform', function(d,i,j) {
            return 'translate(' + y0(that.stacked() ? d.y0 : 0) + ',' + (that.stacked() ? 0 : (j * that.xScale().rangeBand() / data.length ) + that.xScale()(that.x()(d,i))) + ')'
        });
    barsEnter.append('rect')
        .attr('width', 0)
        .attr('height', this.xScale().rangeBand() / (that.stacked() ? 1 : data.length) );

    bars
        .on('mouseover', function(d,i) { //TODO: figure out why j works above, but not here
            d3.select(this).classed('hover', true);
            that.dispatch.elementMouseover({
                value: that.y()(d,i),
                point: d,
                series: data[d.series],
                pos: [ that.yScale()(that.y()(d,i) + (that.stacked() ? d.y0 : 0)), that.xScale()(that.x()(d,i)) + (that.xScale().rangeBand() * (that.stacked() ? data.length / 2 : d.series + .5) / data.length) ],
                pointIndex: i,
                seriesIndex: d.series,
                e: d3.event
            });
        })
        .on('mouseout', function(d,i) {
            d3.select(this).classed('hover', false);
            that.dispatch.elementMouseout({
                value: that.y()(d,i),
                point: d,
                series: data[d.series],
                pointIndex: i,
                seriesIndex: d.series,
                e: d3.event
            });
        })
        .on('click', function(d,i) {
            that.dispatch.elementClick({
                value: that.y()(d,i),
                point: d,
                series: data[d.series],
                pos: [that.xScale()(that.x()(d,i)) + (that.xScale().rangeBand() * (that.stacked() ? data.length / 2 : d.series + .5) / data.length), that.yScale()(that.y()(d,i) + (that.stacked() ? d.y0 : 0))],  // TODO: Figure out why the value appears to be shifted
                pointIndex: i,
                seriesIndex: d.series,
                e: d3.event
            });
            d3.event.stopPropagation();
        })
        .on('dblclick', function(d,i) {
            that.dispatch.elementDblClick({
                value: that.y()(d,i),
                point: d,
                series: data[d.series],
                pos: [that.xScale()(that.x()(d,i)) + (that.xScale().rangeBand() * (that.stacked() ? data.length / 2 : d.series + .5) / data.length), that.yScale()(that.y()(d,i) + (that.stacked() ? d.y0 : 0))],  // TODO: Figure out why the value appears to be shifted
                pointIndex: i,
                seriesIndex: d.series,
                e: d3.event
            });
            d3.event.stopPropagation();
        });

    barsEnter.append('text');

    if (this.showValues() && !this.stacked()) {
        bars.select('text')
            .attr('text-anchor', function(d,i) { return that.y()(d,i) < 0 ? 'end' : 'start' })
            .attr('y', this.xScale().rangeBand() / (data.length * 2))
            .attr('dy', '.32em')
            .text(function(d,i) { return that.valueFormat()(that.y()(d,i)) });
        bars.transition()
            .select('text')
            .attr('x', function(d,i) { return that.y()(d,i) < 0 ? -4 : that.yScale()(that.y()(d,i)) - that.yScale()(0) + 4 })
    } else
        bars.selectAll('text').text('');

    if (this.showBarLabels() && !this.stacked()) {
        barsEnter.append('text').classed('nv-bar-label',true);
        bars.select('text.nv-bar-label')
            .attr('text-anchor', function(d,i) { return that.y()(d,i) < 0 ? 'start' : 'end' })
            .attr('y', this.xScale().rangeBand() / (data.length * 2))
            .attr('dy', '.32em')
            .text(function(d,i) { return that.x()(d,i) });
        bars.transition()
            .select('text.nv-bar-label')
            .attr('x', function(d,i) { return that.y(d,i) < 0 ? that.yScale()(0) - that.yScale()(that.y(d,i)) + 4 : -4 });
    }
    else
        bars.selectAll('text.nv-bar-label').text('');

    bars.attr('class', function(d,i) { return that.y()(d,i) < 0 ? 'nv-bar negative' : 'nv-bar positive'});

    if (this._barColor) {
        if (!this.disabled())
            this.disabled(data.map(function() { return true }));
        var _colorBars = function(d,i,j) {
            return d3
                .rgb(that._barColor(d,i))
                .darker(that.disabled().map(function(d,i) { return i }).filter(function(d,i){ return !that.disabled()[i] })[j] )
                .toString()
        };
        bars.style('fill', _colorBars)
            .style('stroke', _colorBars);
    }

    if (this.stacked())
        bars.transition()
            .attr('transform', function(d,i) { return 'translate(' + that.yScale()(d.y1) + ',' + that.xScale()(that.x()(d,i)) + ')' })
            .select('rect')
            .attr('width', function(d,i) { return Math.abs(that.yScale()(that.y()(d,i) + d.y0) - that.yScale()(d.y0)) })
            .attr('height', this.xScale().rangeBand() );
    else
        bars.transition()
            .attr('transform', function(d,i) {
                //TODO: stacked must be all positive or all negative, not both?
                return 'translate(' +
                    (that.y()(d,i) < 0 ? that.yScale()(that.y()(d,i)) : that.yScale()(0))
                    + ',' +
                    (d.series * that.xScale().rangeBand() / data.length
                        +
                        that.xScale()(that.x()(d,i)) )
                    + ')'
            })
            .select('rect')
            .attr('height', this.xScale().rangeBand() / data.length )
            .attr('width', function(d,i) { return Math.max(Math.abs(that.yScale()(that.y()(d,i)) - that.yScale()(0)),1) });

    //store old scales for use in transitions on update
    x0 = this.xScale().copy();
    y0 = this.yScale().copy();

};

MultiBarHorizontal.prototype.barColor = function(_) {
    if (!arguments.length) return this._barColor;
    this._barColor = nv.utils.getColor(_);
    return this;
};

MultiBarHorizontal.prototype.color = function(_) {
    if (!arguments.length) return this._color;
    this._color = nv.utils.getColor(_);
    return this;
};

nv.models.multiBarHorizontal = function() {
    "use strict";

    var multiBarHorizontal = new MultiBarHorizontal();

    function chart(selection) {
        multiBarHorizontal.render(selection);
        return chart;
    }

    chart.dispatch = multiBarHorizontal.dispatch;
    chart.options = nv.utils.optionsFunc.bind(chart);

    nv.utils.rebindp(chart, multiBarHorizontal, MultiBarHorizontal.prototype,
        'x', 'y', 'margin', 'width', 'height', 'xScale', 'yScale', 'xDomain', 'yDomain', 'xRange', 'yRange', 'forceY',
        'stacked', 'color', 'barColor', 'disabled', 'id', 'delay', 'showValues', 'showBarLabels', 'valueFormat', 'valuePadding'
    );

    return chart;
};
var MultiBarHorizontalChartPrivates = {
    color : null
    , showLegend: true
    , showControls : true
    , showXAxis : true
    , showYAxis : true
    , stacked : false
    , tooltips : true
    , defaultState : null
    , transitionDuration : 250
    , controlsData: []
    , xScale: null
    , yScale: null
    , tooltipContent: null
    , tooltip: null
};

/**
 * A MultiBarHorizontalChart
 */
function MultiBarHorizontalChart(options){
    var that = this;
    options = nv.utils.extend({}, options, MultiBarHorizontalChartPrivates, {
        margin: {top: 30, right: 20, bottom: 50, left: 60}
        , chartClass: 'multiBarHorizontalChart'
        , wrapClass: 'barsWrap'
    });
    Chart.call(this, options, ['tooltipShow', 'tooltipHide', 'stateChange', 'changeState','renderEnd']);

    this.multibarHorizontal = this.getMultibarHorizontal();
    this.legend = this.getLegend();
    this.xAxis = this.getAxis();
    this.yAxis = this.getAxis();
    this.state = { stacked: this.stacked() };

    this._color = nv.utils.defaultColor();

    this.legend = nv.models.legend()
        .height(30);
    this.controls = nv.models.legend()
        .height(30)
        .updateState(false);
    this.controlWidth = function() {
        return that.showControls() ? 180 : 0
    };
    this.multibarHorizontal
        .stacked( this.stacked() );
    this.xAxis
        .orient('left')
        .tickPadding(5)
        .highlightZero(false)
        .showMaxMin(false)
        .tickFormat(function(d) { return d });
    this.yAxis
        .orient('bottom')
        .tickFormat(d3.format(',.1f'));

    this.state = this.getStateManager();
    this.state.stacked = false; // DEPRECATED Maintained for backward compatibility
    
    this.showTooltip = function(e, offsetElement) {
        var left = e.pos[0] + ( offsetElement.offsetLeft || 0 ),
            top = e.pos[1] + ( offsetElement.offsetTop || 0),
            x = that.xAxis.tickFormat()(that.multibarHorizontal.x()(e.point, e.pointIndex)),
            y = that.yAxis.tickFormat()(that.multibarHorizontal.y()(e.point, e.pointIndex)),
            content = that.tooltip()(e.series.key, x, y);
        nv.tooltip.show([left, top], content, e.value < 0 ? 'e' : 'w', null, offsetElement);
    };

    this.stateGetter = function(data) {
        return function(){
            return {
                active: data.map(function(d) { return !d.disabled }),
                stacked: that.stacked()
            }
        }
    };
    this.stateSetter = function(data) {
        return function(state) {
            if (state.stacked !== undefined)
                that.stacked(state.stacked);
            if (state.active !== undefined)
                data.forEach(function(series,i) {
                    series.disabled = !state.active[i];
                });
        }
    };

}

nv.utils.create(MultiBarHorizontalChart, Chart, MultiBarHorizontalChartPrivates);

MultiBarHorizontalChart.prototype.wrapper = function(data){
    Layer.prototype.wrapper.call(this, data, ['nv-x nv-axis', 'nv-y nv-axis', 'nv-zeroLine', 'nv-controlsWrap']);
    this.state
        .setter(this.stateSetter(data), this.update)
        .getter(this.stateGetter(data))
        .update();
};

MultiBarHorizontalChart.prototype.getLegend = function(){
    return nv.models.legend();
};

MultiBarHorizontalChart.prototype.getAxis = function(){
    return nv.models.axis();
};

MultiBarHorizontalChart.prototype.getStateManager = function(){
    return nv.utils.state();
};

MultiBarHorizontalChart.prototype.draw = function(data){

    var that = this,
        availableWidth = this.available.width,
        availableHeight = this.available.height;

    //set state.disabled
    this.state.disabled = data.map(function(d) { return !!d.disabled });

    if (!this.defaultState()) {
        var key;
        this.defaultState({});
        for (key in this.state) {
            if (this.state[key] instanceof Array)
                this.defaultState()[key] = this.state[key].slice(0);
            else
                this.defaultState()[key] = this.state[key];
        }
    }

    this.xScale(this.multibarHorizontal.xScale());
    this.yScale(this.multibarHorizontal.yScale());

    this.multibarHorizontal
        .margin({left: 0, top: 0, bottom: 0, right: 0})
        .disabled(data.map(function(series) { return series.disabled }))
        .width(availableWidth)
        .height(availableHeight)
        .color(
            data.map(function(d,i) { return d.color || that._color(d, i) })
                .filter(function(d,i) { return !data[i].disabled })
        );

    this.g.select('.nv-barsWrap')
        .datum(data.filter(function(d) { return !d.disabled }))
        .transition().call(this.multibarHorizontal);


        if (this.showLegend()) {
            this.legend.width(availableWidth - this.controlWidth());
            if (this.multibarHorizontal.barColor())
                data.forEach(function(series,i) { series.color = d3.rgb('#ccc').darker(i * 1.5).toString() });
            this.g.select('.nv-legendWrap')
                .datum(data)
                .call(this.legend);
            if ( this.margin().top != this.legend.height()) {
                this.margin().top = this.legend.height();
                availableHeight = (this.height() || parseInt(Layer.svg.style('height')) || 400) - this.margin().top - this.margin().bottom;
            }
            this.g.select('.nv-legendWrap')
                .attr('transform', 'translate(' + this.controlWidth() + ',' + (-this.margin().top) +')');
        }

        if (this.showControls()) {
            this.controlsData([
                { key: 'Grouped', disabled: this.multibarHorizontal.stacked() },
                { key: 'Stacked', disabled: !this.multibarHorizontal.stacked() }
            ]);
            this.controls
                .width(this.controlWidth())
                .color(['#444', '#444', '#444']);
            this.g.select('.nv-controlsWrap')
                .datum(this.controlsData())
                .attr('transform', 'translate(0,' + (-this.margin().top) +')')
                .call(this.controls);
        }

        if (this.showXAxis()) {
            this.xAxis
                .scale(this.xScale())
                .ticks( availableHeight / 24 )
                .tickSize(-availableWidth, 0 );
            this.g.select('.nv-x.nv-axis')
                .transition()
                .call(this.xAxis);
        }

        if (this.showYAxis()) {
            this.yAxis
                .scale(this.yScale())
                .ticks( availableWidth / 100 )
                .tickSize( -availableHeight, 0 );
            this.g.select('.nv-y.nv-axis')
                .attr('transform', 'translate(0,' + availableHeight + ')')
                .transition()
                .call(this.yAxis);
        }

        // Zero line
        this.g.select(".nv-zeroLine line")
            .attr("x1", this.yScale()(0))
            .attr("x2", this.yScale()(0))
            .attr("y1", 0)
            .attr("y2", -availableHeight);
};

/**
 *
 * @override Layer::attachEvents
 */
MultiBarHorizontalChart.prototype.attachEvents = function(){
    Chart.prototype.attachEvents.call(this);

    this.legend.dispatch.on('stateChange', function(newState) {
        this.state = newState;
        this.dispatch.stateChange( this.state );
        this.update();
    }.bind(this));

    this.controls.dispatch.on('legendClick', function(d) {
        if (!d.disabled) return;
        this.controlsData(
            this.controlsData().map(function(s) { s.disabled = true; return s })
        );
        d.disabled = false;
        switch (d.key) {
            case 'Grouped':
                this.multibarHorizontal.stacked(false);
                break;
            case 'Stacked':
                this.multibarHorizontal.stacked(true);
                break;
        }
        // DEPRECATED
        this.state.stacked = this.multibarHorizontal.stacked();
        this.dispatch.stateChange(this.state);
        // END DEPRECATED

        this.update();
    }.bind(this));

    this.dispatch
        // DEPRECATED
        // Update chart from a state object passed to event handler
        .on('changeState', function(e) {
            if (typeof e.disabled !== 'undefined') {
                data.forEach(function(series,i) { series.disabled = e.disabled[i] });
                this.state.disabled = e.disabled;
            }
            if (typeof e.stacked !== 'undefined') {
                this.multibarHorizontal.stacked(e.stacked);
                this.state.stacked = e.stacked;
            }
            this.update();
        }.bind(this))
        // END DEPRECATED
        .on('tooltipShow', function(e) {
            if (this.tooltips())
                this.showTooltip(e, this.svg[0][0].parentNode);
        }.bind(this))
        .on('tooltipHide', function() {
            if (this.tooltips())
                nv.tooltip.cleanup();
        }.bind(this));

    this.multibarHorizontal.dispatch
        .on('elementMouseover.tooltip', function(e) {
            e.pos = [e.pos[0] +  this.margin().left, e.pos[1] + this.margin().top];
            this.dispatch.tooltipShow(e);
        }.bind(this))
        .on('elementMouseout.tooltip', function(e) {
            this.dispatch.tooltipHide(e);
        }.bind(this));
};

MultiBarHorizontalChart.prototype.getMultibarHorizontal = function(){
    return nv.models.multiBarHorizontal();
};

MultiBarHorizontalChart.prototype.color = function(_) {
    if (!arguments.length) return this._color;
    this._color = nv.utils.getColor(_);
    this.legend.color(this._color);
    return this;
};

MultiBarHorizontalChart.prototype.tooltipContent = function(_){
    if (!arguments.length) return this.tooltip();
    this.tooltip(_);
    return this;
};

/**
 * The multiBarHorizontalChart model returns a function wrapping an instance of a MultiBarHorizontalChart.
 */
nv.models.multiBarHorizontalChart = function() {
    "use strict";

    var multiBarHorizontalChart = new MultiBarHorizontalChart();

    function chart(selection) {
        multiBarHorizontalChart.render(selection);
        return chart;
    }

    chart.dispatch = multiBarHorizontalChart.dispatch;
    chart.multibarHorizontal = multiBarHorizontalChart.multibarHorizontal;
    chart.legend = multiBarHorizontalChart.legend;
    chart.xAxis = multiBarHorizontalChart.xAxis;
    chart.yAxis = multiBarHorizontalChart.yAxis;

    // DO NOT DELETE. This is currently overridden below
    // until deprecated portions are removed.
    chart.state = multiBarHorizontalChart.state;

    chart.options = nv.utils.optionsFunc.bind(chart);

    d3.rebind(chart, multiBarHorizontalChart.multibarHorizontal,
        'x', 'y', 'xDomain', 'yDomain', 'xRange', 'yRange', 'forceX', 'forceY', 'clipEdge', 'id', 'delay',
        'showValues','showBarLabels', 'valueFormat', 'stacked', 'barColor'
    );

    chart.options = nv.utils.optionsFunc.bind(chart);

    nv.utils.rebindp(chart, multiBarHorizontalChart, MultiBarHorizontalChart.prototype,
        'tooltip', 'color', 'margin', 'width', 'height', 'showControls', 'showLegend', 'showXAxis', 'showYAxis',
        'tooltips', 'tooltipContent', 'state', 'defaultState', 'noData', 'transitionDuration'
    );

    return chart;
};
nv.models.multiBarTimeSeries = function() {
  "use strict";
  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var margin = {top: 0, right: 0, bottom: 0, left: 0}
    , width = 960
    , height = 500
    , x = d3.time.scale()
    , y = d3.scale.linear()
    , id = Math.floor(Math.random() * 10000) //Create semi-unique ID in case user doesn't select one
    , getX = function(d) { return d.x }
    , getY = function(d) { return d.y }
    , forceY = [0] // 0 is forced by default.. this makes sense for the majority of bar graphs... user can always do chart.forceY([]) to remove
    , clipEdge = true
    , stacked = false
    , color = nv.utils.defaultColor()
    , delay = 1200
    , xDomain
    , yDomain
    , xRange
    , yRange
    , dispatch = d3.dispatch('chartClick', 'elementClick', 'elementDblClick', 'elementMouseover', 'elementMouseout')
    ;

  //============================================================


  //============================================================
  // Private Variables
  //------------------------------------------------------------

  var x0, y0 //used to store previous scales
      ;

  //============================================================


  function chart(selection) {
    selection.each(function(data) {
      var availableWidth = width - margin.left - margin.right,
          availableHeight = height - margin.top - margin.bottom,
          container = d3.select(this);

      if (stacked)
        data = d3.layout.stack()
                 .offset('zero')
                 .values(function(d){ return d.values })
                 .y(getY)
                 (data);


      //add series index to each data point for reference
      data.forEach(function(series, i) {
        series.values.forEach(function(point) {
          point.series = i;
        });
      });

      //------------------------------------------------------------
      // Setup Scales

      // remap and flatten the data for use in calculating the scales' domains
      var seriesData = (xDomain && yDomain) ? [] : // if we know xDomain and yDomain, no need to calculate
            data.map(function(d) {
              return d.values.map(function(d,i) {
                return { x: getX(d,i), y: getY(d,i), y0: d.y0 }
              })
            });

      x   .domain(xDomain || d3.extent(d3.merge(seriesData).map(function(d) { return d.x })))
          .range(xRange || [0, availableWidth]);

      y   .domain(yDomain || d3.extent(d3.merge(seriesData).map(function(d) { return d.y + (stacked ? d.y0 : 0) }).concat(forceY)))
          .range(yRange || [availableHeight, 0]);


      // If scale's domain don't have a range, slightly adjust to make one... so a chart can show a single data point
      if (x.domain()[0] === x.domain()[1])
        x.domain()[0] ?
            x.domain([x.domain()[0] - x.domain()[0] * 0.01, x.domain()[1] + x.domain()[1] * 0.01])
          : x.domain([-1,1]);

      if (y.domain()[0] === y.domain()[1])
        y.domain()[0] ?
            y.domain([y.domain()[0] + y.domain()[0] * 0.01, y.domain()[1] - y.domain()[1] * 0.01])
          : y.domain([-1,1]);


      x0 = x0 || x;
      y0 = y0 || y;

      //------------------------------------------------------------


      //------------------------------------------------------------
      // Setup containers and skeleton of chart

      var wrap = container.selectAll('g.nv-wrap.nv-multibar').data([data]);
      var wrapEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap nv-multibar');
      var defsEnter = wrapEnter.append('defs');
      var gEnter = wrapEnter.append('g');
      var g = wrap.select('g')

      gEnter.append('g').attr('class', 'nv-groups');

      wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      //------------------------------------------------------------



      defsEnter.append('clipPath')
          .attr('id', 'nv-edge-clip-' + id)
        .append('rect');
      wrap.select('#nv-edge-clip-' + id + ' rect')
          .attr('width', availableWidth)
          .attr('height', availableHeight);

      g   .attr('clip-path', clipEdge ? 'url(#nv-edge-clip-' + id + ')' : '');



      var groups = wrap.select('.nv-groups').selectAll('.nv-group')
          .data(function(d) { return d }, function(d) { return d.key });
      groups.enter().append('g')
          .style('stroke-opacity', 1e-6)
          .style('fill-opacity', 1e-6);
      d3.transition(groups.exit())
          //.style('stroke-opacity', 1e-6)
          //.style('fill-opacity', 1e-6)
        .selectAll('rect.nv-bar')
        .delay(function(d,i) { return i * delay/ data[0].values.length })
          .attr('y', function(d) { return stacked ? y0(d.y0) : y0(0) })
          .attr('height', 0)
          .remove();
      groups
          .attr('class', function(d,i) { return 'nv-group nv-series-' + i })
          .classed('hover', function(d) { return d.hover })
          .style('fill', function(d,i){ return color(d, i) })
          .style('stroke', function(d,i){ return color(d, i) });
      d3.transition(groups)
          .style('stroke-opacity', 1)
          .style('fill-opacity', .75);


      var bars = groups.selectAll('rect.nv-bar')
          .data(function(d) { return d.values });

      bars.exit().remove();

      var maxElements = 0;
      for(var ei=0; ei<seriesData.length; ei+=1) {
          maxElements = Math.max(seriesData[ei].length, maxElements);
      }

      var bandWidth = (availableWidth / maxElements)-0.1;
      var barWidth = bandWidth / data.length;

      var barsEnter = bars.enter().append('rect')
          .attr('class', function(d,i) { return getY(d,i) < 0 ? 'nv-bar negative' : 'nv-bar positive'})
          .attr('x', function(d,i,j) {
              return stacked ? 0 : (i * bandWidth) + ( j * barWidth )
          })
          .attr('y', function(d) { return y0(stacked ? d.y0 : 0) })
          .attr('height', 0)
          .attr('width', stacked ? bandWidth : barWidth );
      bars
          .on('mouseover', function(d,i) { //TODO: figure out why j works above, but not here
            d3.select(this).classed('hover', true);
            dispatch.elementMouseover({
              value: getY(d,i),
              point: d,
              series: data[d.series],
              pos: [x(getX(d,i)) + (barWidth * (stacked ? data.length / 2 : d.series + .5) / data.length), y(getY(d,i) + (stacked ? d.y0 : 0))],  // TODO: Figure out why the value appears to be shifted
              pointIndex: i,
              seriesIndex: d.series,
              e: d3.event
            });
          })
          .on('mouseout', function(d,i) {
            d3.select(this).classed('hover', false);
            dispatch.elementMouseout({
              value: getY(d,i),
              point: d,
              series: data[d.series],
              pointIndex: i,
              seriesIndex: d.series,
              e: d3.event
            });
          })
          .on('click', function(d,i) {
            dispatch.elementClick({
              value: getY(d,i),
              point: d,
              series: data[d.series],
              pos: [x(getX(d,i)) + (barWidth * (stacked ? data.length / 2 : d.series + .5) / data.length), y(getY(d,i) + (stacked ? d.y0 : 0))],  // TODO: Figure out why the value appears to be shifted
              pointIndex: i,
              seriesIndex: d.series,
              e: d3.event
            });
            d3.event.stopPropagation();
          })
          .on('dblclick', function(d,i) {
            dispatch.elementDblClick({
              value: getY(d,i),
              point: d,
              series: data[d.series],
              pos: [x(getX(d,i)) + (barWidth * (stacked ? data.length / 2 : d.series + .5) / data.length), y(getY(d,i) + (stacked ? d.y0 : 0))],  // TODO: Figure out why the value appears to be shifted
              pointIndex: i,
              seriesIndex: d.series,
              e: d3.event
            });
            d3.event.stopPropagation();
          });
      bars
          .attr('class', function(d,i) { return getY(d,i) < 0 ? 'nv-bar negative' : 'nv-bar positive'})
          .attr('transform', function(d,i) { return 'translate(' + x(getX(d,i)) + ',0)'; })
      if (stacked)
        d3.transition(bars)
            .delay(function(d,i) { return i * delay / data[0].values.length })
            .attr('y', function(d,i) {
              return y(getY(d,i) + (stacked ? d.y0 : 0));
            })
            .attr('height', function(d,i) {
              return Math.abs(y(d.y + (stacked ? d.y0 : 0)) - y((stacked ? d.y0 : 0)))
            })
            .each('end', function() {
              d3.transition(d3.select(this))
                .attr('x', function(d,i) {
                  return stacked ? 0 : (i * bandWidth) + ( j * barWidth )
                })
                .attr('width', stacked ? bandWidth : barWidth );
            })
      else
        d3.transition(bars)
          .delay(function(d,i) { return i * delay/ data[0].values.length })
            .attr('x', function(d,i) {
              return d.series * barWidth
            })
            .attr('width', barWidth)
            .each('end', function() {
              d3.transition(d3.select(this))
                .attr('y', function(d,i) {
                  return getY(d,i) < 0 ?
                    y(0) :
                    y(getY(d,i))
                })
                .attr('height', function(d,i) {
                  return Math.abs(y(getY(d,i)) - y(0))
                });
            })


      //store old scales for use in transitions on update
      x0 = x.copy();
      y0 = y.copy();

    });

    return chart;
  }


  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  chart.dispatch = dispatch;

  chart.options = nv.utils.optionsFunc.bind(chart);

  chart.x = function(_) {
    if (!arguments.length) return getX;
    getX = _;
    return chart;
  };

  chart.y = function(_) {
    if (!arguments.length) return getY;
    getY = _;
    return chart;
  };

  chart.margin = function(_) {
    if (!arguments.length) return margin;
    margin.top    = typeof _.top    != 'undefined' ? _.top    : margin.top;
    margin.right  = typeof _.right  != 'undefined' ? _.right  : margin.right;
    margin.bottom = typeof _.bottom != 'undefined' ? _.bottom : margin.bottom;
    margin.left   = typeof _.left   != 'undefined' ? _.left   : margin.left;
    return chart;
  };

  chart.width = function(_) {
    if (!arguments.length) return width;
    width = _;
    return chart;
  };

  chart.height = function(_) {
    if (!arguments.length) return height;
    height = _;
    return chart;
  };

  chart.xScale = function(_) {
    if (!arguments.length) return x;
    x = _;
    return chart;
  };

  chart.yScale = function(_) {
    if (!arguments.length) return y;
    y = _;
    return chart;
  };

  chart.xDomain = function(_) {
    if (!arguments.length) return xDomain;
    xDomain = _;
    return chart;
  };

  chart.yDomain = function(_) {
    if (!arguments.length) return yDomain;
    yDomain = _;
    return chart;
  };

  chart.xRange = function(_) {
    if (!arguments.length) return xRange;
    xRange = _;
    return chart;
  };

  chart.yRange = function(_) {
    if (!arguments.length) return yRange;
    yRange = _;
    return chart;
  };

  chart.forceY = function(_) {
    if (!arguments.length) return forceY;
    forceY = _;
    return chart;
  };

  chart.stacked = function(_) {
    if (!arguments.length) return stacked;
    stacked = _;
    return chart;
  };

  chart.clipEdge = function(_) {
    if (!arguments.length) return clipEdge;
    clipEdge = _;
    return chart;
  };

  chart.color = function(_) {
    if (!arguments.length) return color;
    color = nv.utils.getColor(_);
    return chart;
  };

  chart.id = function(_) {
    if (!arguments.length) return id;
    id = _;
    return chart;
  };

  chart.delay = function(_) {
    if (!arguments.length) return delay;
    delay = _;
    return chart;
  };

  //============================================================


  return chart;
}

nv.models.multiBarTimeSeriesChart = function() {
  "use strict";
  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var multibar = nv.models.multiBarTimeSeries()
    , xAxis = nv.models.axis()
    , yAxis = nv.models.axis()
    , legend = nv.models.legend()
    , controls = nv.models.legend()
    ;

  var margin = {top: 30, right: 20, bottom: 50, left: 60}
    , width = null
    , height = null
    , color = nv.utils.defaultColor()
    , showControls = true
    , showLegend = true
    , reduceXTicks = true // if false a tick will show for every data point
    , rotateLabels = 0
    , tooltips = true
    , tooltip = function(key, x, y, e, graph) {
        return '<h3>' + key + '</h3>' +
               '<p>' +  y + ' on ' + x + '</p>'
      }
    , x //can be accessed via chart.xScale()
    , y //can be accessed via chart.yScale()
    , noData = "No Data Available."
    , dispatch = d3.dispatch('tooltipShow', 'tooltipHide')
    ;

  multibar
    .stacked(false)
    ;
  xAxis
    .orient('bottom')
    .tickPadding(7)
    .highlightZero(false)
    .showMaxMin(false)
    ;
  yAxis
    .orient('left')
    .tickFormat(d3.format(',.1f'))
    ;

  //============================================================


  //============================================================
  // Private Variables
  //------------------------------------------------------------

  var showTooltip = function(e, offsetElement) {
    var left = e.pos[0] + ( offsetElement.offsetLeft || 0 ),
        top = e.pos[1] + ( offsetElement.offsetTop || 0),
        x = xAxis.tickFormat()(multibar.x()(e.point, e.pointIndex)),
        y = yAxis.tickFormat()(multibar.y()(e.point, e.pointIndex)),
        content = tooltip(e.series.key, x, y, e, chart);

    nv.tooltip.show([left, top], content, e.value < 0 ? 'n' : 's', null, offsetElement);
  };

  //============================================================


  function chart(selection) {
    selection.each(function(data) {
      var container = d3.select(this),
          that = this;

      var availableWidth = (width  || parseInt(container.style('width')) || 960)
                             - margin.left - margin.right,
          availableHeight = (height || parseInt(container.style('height')) || 400)
                             - margin.top - margin.bottom;

      chart.update = function() { selection.transition().call(chart) };
      chart.container = this;


      //------------------------------------------------------------
      // Display noData message if there's nothing to show.

      if (!data || !data.length || !data.filter(function(d) { return d.values.length }).length) {
        var noDataText = container.selectAll('.nv-noData').data([noData]);

        noDataText.enter().append('text')
          .attr('class', 'nvd3 nv-noData')
          .attr('dy', '-.7em')
          .style('text-anchor', 'middle');

        noDataText
          .attr('x', margin.left + availableWidth / 2)
          .attr('y', margin.top + availableHeight / 2)
          .text(function(d) { return d });

        return chart;
      } else {
        container.selectAll('.nv-noData').remove();
      }

      //------------------------------------------------------------


      //------------------------------------------------------------
      // Setup Scales

      x = multibar.xScale();
      y = multibar.yScale();

      //------------------------------------------------------------


      //------------------------------------------------------------
      // Setup containers and skeleton of chart

      var wrap = container.selectAll('g.nv-wrap.nv-multiBarWithLegend').data([data]);
      var gEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap nv-multiBarWithLegend').append('g');
      var g = wrap.select('g');

      gEnter.append('g').attr('class', 'nv-x nv-axis');
      gEnter.append('g').attr('class', 'nv-y nv-axis');
      gEnter.append('g').attr('class', 'nv-barsWrap');
      gEnter.append('g').attr('class', 'nv-legendWrap');
      gEnter.append('g').attr('class', 'nv-controlsWrap');

      //------------------------------------------------------------


      //------------------------------------------------------------
      // Legend

      if (showLegend) {
        legend.width(availableWidth / 2);

        g.select('.nv-legendWrap')
            .datum(data)
            .call(legend);

        if ( margin.top != legend.height()) {
          margin.top = legend.height();
          availableHeight = (height || parseInt(container.style('height')) || 400)
                             - margin.top - margin.bottom;
        }

        g.select('.nv-legendWrap')
            .attr('transform', 'translate(' + (availableWidth / 2) + ',' + (-margin.top) +')');
      }

      //------------------------------------------------------------


      //------------------------------------------------------------
      // Controls

      if (showControls) {
        var controlsData = [
          { key: 'Grouped', disabled: multibar.stacked() },
          { key: 'Stacked', disabled: !multibar.stacked() }
        ];

        controls.width(180).color(['#444', '#444', '#444']);
        g.select('.nv-controlsWrap')
            .datum(controlsData)
            .attr('transform', 'translate(0,' + (-margin.top) +')')
            .call(controls);
      }

      //------------------------------------------------------------


      wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');


      //------------------------------------------------------------
      // Main Chart Component(s)

      multibar
        .width(availableWidth)
        .height(availableHeight)
        .color(data.map(function(d,i) {
          return d.color || color(d, i);
        }).filter(function(d,i) { return !data[i].disabled }))


      var barsWrap = g.select('.nv-barsWrap')
          .datum(data.filter(function(d) { return !d.disabled }))

      d3.transition(barsWrap).call(multibar);

      //------------------------------------------------------------


      //------------------------------------------------------------
      // Setup Axes

      xAxis
        .scale(x)
        .ticks(availableWidth / 100)        
        .tickSize(-availableHeight, 0);

      g.select('.nv-x.nv-axis')
          .attr('transform', 'translate(0,' + y.range()[0] + ')');
      d3.transition(g.select('.nv-x.nv-axis'))
          .call(xAxis);

      var xTicks = g.select('.nv-x.nv-axis > g').selectAll('g');

      xTicks
          .selectAll('line, text')
          .style('opacity', 1)

      if (reduceXTicks)
        xTicks
          .filter(function(d,i) {
              return i % Math.ceil(data[0].values.length / (availableWidth / 100)) !== 0;
            })
          .selectAll('text, line')
          .style('opacity', 0);

      if(rotateLabels)
        xTicks
            .selectAll('text')
            .attr('transform', function(d,i,j) { return 'rotate('+rotateLabels+' 0,0)' })
            .attr('text-transform', rotateLabels > 0 ? 'start' : 'end');

      yAxis
        .scale(y)
        .ticks( availableHeight / 36 )
        .tickSize( -availableWidth, 0);

      d3.transition(g.select('.nv-y.nv-axis'))
          .call(yAxis);

      //------------------------------------------------------------



      //============================================================
      // Event Handling/Dispatching (in chart's scope)
      //------------------------------------------------------------

      legend.dispatch.on('legendClick', function(d,i) {
        d.disabled = !d.disabled;

        if (!data.filter(function(d) { return !d.disabled }).length) {
          data.map(function(d) {
            d.disabled = false;
            wrap.selectAll('.nv-series').classed('disabled', false);
            return d;
          });
        }

        selection.transition().call(chart);
      });

      controls.dispatch.on('legendClick', function(d,i) {
        if (!d.disabled) return;
        controlsData = controlsData.map(function(s) {
          s.disabled = true;
          return s;
        });
        d.disabled = false;

        switch (d.key) {
          case 'Grouped':
            multibar.stacked(false);
            break;
          case 'Stacked':
            multibar.stacked(true);
            break;
        }

        selection.transition().call(chart);
      });

      dispatch.on('tooltipShow', function(e) {
        if (tooltips) showTooltip(e, that.parentNode)
      });

      //============================================================


    });

    return chart;
  }


  //============================================================
  // Event Handling/Dispatching (out of chart's scope)
  //------------------------------------------------------------

  multibar.dispatch.on('elementMouseover.tooltip', function(e) {
    e.pos = [e.pos[0] +  margin.left, e.pos[1] + margin.top];
    dispatch.tooltipShow(e);
  });

  multibar.dispatch.on('elementMouseout.tooltip', function(e) {
    dispatch.tooltipHide(e);
  });
  dispatch.on('tooltipHide', function() {
    if (tooltips) nv.tooltip.cleanup();
  });

  //============================================================


  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  // expose chart's sub-components
  chart.dispatch = dispatch;
  chart.multibar = multibar;
  chart.legend = legend;
  chart.xAxis = xAxis;
  chart.yAxis = yAxis;

  d3.rebind(chart, multibar, 'x', 'y', 'xDomain', 'yDomain', 'xRange', 'yRange', 'forceX', 'forceY', 'clipEdge', 'id', 'stacked', 'delay');

  chart.options = nv.utils.optionsFunc.bind(chart);
  
  chart.margin = function(_) {
    if (!arguments.length) return margin;
    margin.top    = typeof _.top    != 'undefined' ? _.top    : margin.top;
    margin.right  = typeof _.right  != 'undefined' ? _.right  : margin.right;
    margin.bottom = typeof _.bottom != 'undefined' ? _.bottom : margin.bottom;
    margin.left   = typeof _.left   != 'undefined' ? _.left   : margin.left;
    return chart;
  };

  chart.width = function(_) {
    if (!arguments.length) return width;
    width = _;
    return chart;
  };

  chart.height = function(_) {
    if (!arguments.length) return height;
    height = _;
    return chart;
  };

  chart.color = function(_) {
    if (!arguments.length) return color;
    color = nv.utils.getColor(_);
    legend.color(color);
    return chart;
  };

  chart.showControls = function(_) {
    if (!arguments.length) return showControls;
    showControls = _;
    return chart;
  };

  chart.showLegend = function(_) {
    if (!arguments.length) return showLegend;
    showLegend = _;
    return chart;
  };

  chart.reduceXTicks= function(_) {
    if (!arguments.length) return reduceXTicks;
    reduceXTicks = _;
    return chart;
  };

  chart.rotateLabels = function(_) {
    if (!arguments.length) return rotateLabels;
    rotateLabels = _;
    return chart;
  }

  chart.tooltip = function(_) {
    if (!arguments.length) return tooltip;
    tooltip = _;
    return chart;
  };

  chart.tooltips = function(_) {
    if (!arguments.length) return tooltips;
    tooltips = _;
    return chart;
  };

  chart.tooltipContent = function(_) {
    if (!arguments.length) return tooltip;
    tooltip = _;
    return chart;
  };

  chart.noData = function(_) {
    if (!arguments.length) return noData;
    noData = _;
    return chart;
  };

  //============================================================


  return chart;
}

/**
 * Private variables
 * @type {{color: *}}
 */
var ChartNamePrivates = {
    color: nv.utils.getColor( d3.scale.category20c().range() )
};

/**
 * A ChartName
 */
function ChartName(options){
    options = nv.utils.extend({}, options, ChartNamePrivates, {
        margin: {top: 30, right: 10, bottom: 10, left: 10}
        , width : 960
        , height : 500
        , chartClass: 'chartName'
    });

    Chart.call(this, options, []);
}

nv.utils.create(ChartName, Chart, ChartNamePrivates);

/**
 * @override Chart::wrapper
 */
ChartName.prototype.wrapper = function(data){
    Chart.prototype.wrapper.call(this, data, []);

};

/**
 * @override Chart::draw
 */
ChartName.prototype.draw = function(data){

    Chart.prototype.draw.call(this, data);
};

/**
 * The chartName model returns a function wrapping an instance of a ChartName.
 */
nv.models.chartName = function () {
    "use strict";

    var chartName = new ChartName();

    function chart(selection) {
        chartName.render(selection);
        return chart;
    }

    chart.dispatch = chartName.dispatch;
    chart.options = nv.utils.optionsFunc.bind(chart);

    // d3.rebind(chart, chartName.something, '');

    nv.utils.rebindp(chart, chartName, ChartName.prototype,
        'margin', 'width', 'height', 'color'
    );

    return chart;
};
var BulletPrivates = {
    reverse : false
    , ranges : function(d) { return d.ranges }   // ranges (bad, satisfactory, good)
    , markers : function(d) { return d.markers }   // markers (previous, goal)
    , measures : function(d) { return d.measures }   // measures (actual, forecast)
    , rangeLabels : function(d) { return d.rangeLabels ? d.rangeLabels : [] }
    , markerLabels : function(d) { return d.markerLabels ? d.markerLabels : []  }
    , measureLabels : function(d) { return d.measureLabels ? d.measureLabels : []  }
    , forceX : [0] // List of numbers to Force into the X scale (ie. 0, or a max / min, etc.)
    , tickFormat : null
    , xScale1 : d3.scale.linear()
    , xScale0: null
    , color: nv.utils.getColor(['#1f77b4'])
    , orient : 'left' // TODO top & bottom
};

/**
 * A Bullet
 */
function Bullet(options){
    options = nv.utils.extend({}, options, BulletPrivates, {
        margin: {top: 0, right: 0, bottom: 0, left: 0}
        , width: 380
        , height: 30
        , chartClass: 'bullet'
    });

    Layer.call(this, options, []);

    this.xScale0( this.__chart__ || d3.scale.linear() );
    this.renderWatch = nv.utils.renderWatch(this.dispatch);
}

nv.utils.create(Bullet, Layer, BulletPrivates);

/**
 * override Layer::wrapper
 * @param data
 */
Bullet.prototype.wrapper = function(data){
    Layer.prototype.wrapper.call(this, data);
    this.gEnter.append('rect').attr('class', 'nv-range nv-rangeMax');
    this.gEnter.append('rect').attr('class', 'nv-range nv-rangeAvg');
    this.gEnter.append('rect').attr('class', 'nv-range nv-rangeMin');
    this.gEnter.append('rect').attr('class', 'nv-measure');
    this.gEnter.append('path').attr('class', 'nv-markerTriangle');
};

/**
 * override Layer::draw
 * @param data
 * @param i
 */
Bullet.prototype.draw = function(data, i){

    var that = this
        , availableWidth = this.available.width
        , availableHeight = this.available.height
        , rangez = this.ranges().call(this, data, i).slice().sort(d3.descending)
        , markerz = this.markers().call(this, data, i).slice().sort(d3.descending)
        , measurez = this.measures().call(this, data, i).slice().sort(d3.descending)
        , rangeLabelz = this.rangeLabels().call(this, data, i).slice()
        , markerLabelz = this.markerLabels().call(this, data, i).slice()
        , measureLabelz = this.measureLabels().call(this, data, i).slice()
        , rangeMin = d3.min(rangez) //rangez[2]
        , rangeMax = d3.max(rangez) //rangez[0]
        , rangeAvg = rangez[1];

    //------------------------------------------------------------
    // Setup Scales

    // Compute the new x-scale.
    this.xScale1()
        .domain( d3.extent(d3.merge([this.forceX(), rangez])) )
        .range(this.reverse() ? [availableWidth, 0] : [0, availableWidth]);

    // Retrieve the old x-scale, if this is an update.
    this.xScale0()
        .domain([0, Infinity])
        .range(this.xScale1().range());

    // Stash the new scale.
    this.__chart__ = this.xScale1();

    var w0 = function(d) { return Math.abs(that.xScale0()(d) - that.xScale0()(0)) } // TODO: could optimize by precalculating x0(0) and x1(0)
        , w1 = function(d) { return Math.abs(that.xScale1()(d) - that.xScale1()(0))}
        , xp0 = function(d) { return d < 0 ? that.xScale0()(d) : that.xScale0()(0) }
        , xp1 = function(d) { return d < 0 ? that.xScale1()(d) : that.xScale1()(0) };

    this.g.select('rect.nv-rangeMax')
        .attr('height', availableHeight)
        .attr('width', w1(rangeMax > 0 ? rangeMax : rangeMin))
        .attr('x', xp1(rangeMax > 0 ? rangeMax : rangeMin))
        .datum(rangeMax > 0 ? rangeMax : rangeMin);

    this.g.select('rect.nv-rangeAvg')
        .attr('height', availableHeight)
        .attr('width', w1(rangeAvg))
        .attr('x', xp1(rangeAvg))
        .datum(rangeAvg);

    this.g.select('rect.nv-rangeMin')
        .attr('height', availableHeight)
        .attr('width', w1(rangeMax))
        .attr('x', xp1(rangeMax))
        .attr('width', w1(rangeMax > 0 ? rangeMin : rangeMax))
        .attr('x', xp1(rangeMax > 0 ? rangeMin : rangeMax))
        .datum(rangeMax > 0 ? rangeMin : rangeMax);

    this.g.select('rect.nv-measure')
        .style('fill', this.color())
        .attr('height', availableHeight / 3)
        .attr('y', availableHeight / 3)
        .attr('width', measurez < 0 ? this.xScale1()(0) - this.xScale1()(measurez[0]) : this.xScale1()(measurez[0]) - this.xScale1()(0))
        .attr('x', xp1(measurez))
        .on('mouseover', function() {
            that.dispatch.elementMouseover({
                value: measurez[0],
                label: measureLabelz[0] || 'Current',
                pos: [that.xScale1()(measurez[0]), availableHeight/2]
            })
        })
        .on('mouseout', function() {
            that.dispatch.elementMouseout({
                value: measurez[0],
                label: measureLabelz[0] || 'Current'
            })
        });

    var h3 =  availableHeight / 6;
    if (markerz[0]) {
        this.g.selectAll('path.nv-markerTriangle')
            .attr('transform', function() { return 'translate(' + that.xScale1()(markerz[0]) + ',' + (availableHeight / 2) + ')' })
            .attr('d', 'M0,' + h3 + 'L' + h3 + ',' + (-h3) + ' ' + (-h3) + ',' + (-h3) + 'Z')
            .on('mouseover', function() {
                that.dispatch.elementMouseover({
                    value: markerz[0],
                    label: markerLabelz[0] || 'Previous',
                    pos: [that.xScale1()(markerz[0]), availableHeight/2]
                })
            })
            .on('mouseout', function() {
                that.dispatch.elementMouseout({
                    value: markerz[0],
                    label: markerLabelz[0] || 'Previous'
                })
            });
    } else
        this.g.selectAll('path.nv-markerTriangle').remove();

    this.wrap.selectAll('.nv-range')
        .on('mouseover', function(d,i) {
            var label = rangeLabelz[i] || (!i ? "Maximum" : i == 1 ? "Mean" : "Minimum");
            that.dispatch.elementMouseover({
                value: d,
                label: label,
                pos: [that.xScale1()(d), availableHeight/2]
            })
        })
        .on('mouseout', function(d,i) {
            var label = rangeLabelz[i] || (!i ? "Maximum" : i == 1 ? "Mean" : "Minimum");
            that.dispatch.elementMouseout({
                value: d,
                label: label
            })
        })
};

Bullet.prototype.orient = function(_) {
    if (!arguments.length) return this.options.orient;
    this.options.orient = _;
    this.reverse( this.options.orient == 'right' || this.options.orient == 'bottom' );
    return this;
};

Bullet.prototype.color = function(_) {
    if (!arguments.length) return this.options.color;
    this.options.color = nv.utils.getColor(_);
    return this;
};

/**
 * override Layer::noData
 * @param data
 * @returns {boolean}
 */
Bullet.prototype.noData = function(data){
    return ( !data || typeof  data == 'undefined' || data == null );
};

/**
 * The bullet model returns a function wrapping an instance of a Bullet.
 */
nv.models.bullet = function () {
    "use strict";

    var bullet = new Bullet();

    function chart(selection) {
        bullet.render(selection);
        return chart;
    }

    chart.dispatch = bullet.dispatch;

    chart.options = nv.utils.optionsFunc.bind(chart);

    nv.utils.rebindp(chart, bullet, Bullet.prototype,
        'ranges', 'markers', 'measures', 'forceX', 'width', 'height', 'margin', 'tickFormat', 'orient', 'color'
    );

    return chart;
};


var BulletChartPrivates = {
    orient : 'left' // left, right, top, bottom, TODO: top & bottom
    , reverse : false
    , ranges : function(d) { return d.ranges } // ranges (bad, satisfactory, good)
    , markers : function(d) { return d.markers } // markers (previous, goal)
    , measures : function(d) { return d.measures } // measures (actual, forecast)
    , tickFormat : null
    , tooltips: true
};

/**
 * A BulletChart
 */
function BulletChart(options){
    options = nv.utils.extend({}, options, BulletChartPrivates, {
        margin: {top: 5, right: 40, bottom: 20, left: 120},
        chartClass: 'bulletChart'
        , wrapClass : 'bulletWrap'
    });

    Chart.call(this, options);

    this.bullet = this.getBullet();
    this.state = this.getStatesManager();
}

nv.utils.create(BulletChart, Chart, BulletChartPrivates);

BulletChart.prototype.getBullet = function(){
    return nv.models.bullet();
};

/**
 * @override Layer::wrapper, removed building the legend
 */
BulletChart.prototype.wrapper = function (data) {
    var gs = ['nv-titles'];
    var wrapPoints = [
        'nv-legendWrap'
    ].concat(gs || []);
    Layer.prototype.wrapper.call(this, data, wrapPoints);

    // The legend can change the available height.
    this.wrap.attr('transform', 'translate(' + this.margin().left + ',' + this.margin().top + ')');
};

/**
 * override Layer::renderElement, different noData handling
 * @param element
 * @param data
 */
BulletChart.prototype.renderElement = function(element, data){
    this.setRoot(element);

    //------------------------------------------------------------
    // Display No Data message if there's nothing to show.
    // TODO: To use common noData() function from Layer
    if (!data || !this.ranges().call(this, data)) {
        var noDataText = this.svg.selectAll('.nv-noData').data([this.options.noData]);
        noDataText.enter().append('text')
            .attr('class', 'nvd3 nv-noData')
            .attr('dy', '-.7em')
            .style('text-anchor', 'middle');
        noDataText
            .attr('x', this.margin().left + this.available.width / 2)
            .attr('y', 18 + this.margin().top + this.available.height / 2)
            .text(function(d) { return d });
        return this;
    } else
        this.svg.selectAll('.nv-noData').remove();

    this.wrapper(data);
    this.draw(data);
    this.attachEvents();

    return this;
};

/**
 * @override Layer::draw
 */
BulletChart.prototype.draw = function(data, i){

    var availableWidth = this.available.width,
        availableHeight = this.available.height;

    var rangez = this.ranges().call(this, data, i).slice().sort(d3.descending),
        markerz = this.markers().call(this, data, i).slice().sort(d3.descending),
        measurez = this.measures().call(this, data, i).slice().sort(d3.descending);

    // Compute the new x-scale.
    var x1 = d3.scale.linear()
        .domain([0, Math.max(rangez[0], markerz[0], measurez[0])])  // TODO: need to allow forceX and forceY, and xDomain, yDomain
        .range(this.reverse() ? [availableWidth, 0] : [0, availableWidth]);

    // Retrieve the old x-scale, if this is an update.
    var x0 = this.__chart__ || d3.scale.linear()
        .domain([0, Infinity])
        .range(x1.range());

    // Stash the new scale.
    this.__chart__ = x1;

    var w0 = function(d) { return Math.abs(x0(d) - x0(0)) }, // TODO: could optimize by precalculating x0(0) and x1(0)
        w1 = function(d) { return Math.abs(x1(d) - x1(0)) };

    var title = this.gEnter.select('.nv-titles').append('g')
        .attr('text-anchor', 'end')
        .attr('transform', 'translate(-6,' + (this.height() - this.margin().top - this.margin().bottom) / 2 + ')');
    title.append('text')
        .attr('class', 'nv-title')
        .text(function(d) { return d.title; });

    title.append('text')
        .attr('class', 'nv-subtitle')
        .attr('dy', '1em')
        .text(function(d) { return d.subtitle; });

    this.bullet
        .margin({top: 0, right: 0, bottom: 0, left: 0})
        .width(availableWidth)
        .height(availableHeight);

    var bulletWrap = this.g.select('.nv-bulletWrap');
    d3.transition(bulletWrap).call(this.bullet);

    // Compute the tick format.
    var format = this.tickFormat() || x1.tickFormat( availableWidth / 100 );

    // Update the tick groups.
    var tick = this.g.selectAll('g.nv-tick')
        .data(x1.ticks( availableWidth / 50 ), function(d) {
            return this.textContent || format(d);
        });

    // Initialize the ticks with the old scale, x0.
    var tickEnter = tick.enter().append('g')
        .attr('class', 'nv-tick')
        .attr('transform', function(d) { return 'translate(' + x0(d) + ',0)' })
        .style('opacity', this.opacityDefault());

    tickEnter.append('line')
        .attr('y1', availableHeight)
        .attr('y2', availableHeight * 7 / 6);

    tickEnter.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '1em')
        .attr('y', availableHeight * 7 / 6)
        .text(format);

    // Transition the updating ticks to the new scale, x1.
    var tickUpdate = d3.transition(tick)
        .attr('transform', function(d) { return 'translate(' + x1(d) + ',0)' })
        .style('opacity', 1);

    tickUpdate.select('line')
        .attr('y1', availableHeight)
        .attr('y2', availableHeight * 7 / 6);

    tickUpdate.select('text')
        .attr('y', availableHeight * 7 / 6);

    // Transition the exiting ticks to the new scale, x1.
    d3.transition(tick.exit())
        .attr('transform', function(d) { return 'translate(' + x1(d) + ',0)' })
        .style('opacity', this.opacityDefault())
        .remove();
};

/**
 * @override Layer::attachEvents
 */
BulletChart.prototype.attachEvents = function(){

    this.bullet.dispatch
        .on('elementMouseover.tooltip', function(e) {
            this.dispatch.tooltipShow(e);
        }.bind(this))
        .on('elementMouseout.tooltip', function(e) {
            this.dispatch.tooltipHide();
        }.bind(this));

    this.dispatch
        .on('tooltipHide', function() {
            if (this.tooltips()) nv.tooltip.cleanup();
        }.bind(this))
        .on('tooltipShow', function(e) {
            this.svg.call(function(selection){
                selection.each(function(data){
                    e.key = data.title;
                    if (this.tooltips()) this.showTooltip(e, this.svg[0][0]);
                }.bind(this))
            }.bind(this));
        }.bind(this));
};

BulletChart.prototype.orient = function(_) {
    if (!arguments.length) return this.orient();
    this.orient(_);
    this.reverse( this.orient() == 'right' || this.orient() == 'bottom' );
    return this;
};

BulletChart.prototype.showTooltip = function(e, offsetElement) {
    var left = e.pos[0] + ( offsetElement.offsetLeft || 0 ) + this.margin().left,
        top = e.pos[1] + ( offsetElement.offsetTop || 0) + this.margin().top,
        content = this.tooltip()(e.key, e.label, e.value);

    nv.tooltip.show([left, top], content, e.value < 0 ? 'e' : 'w', null, offsetElement);
};

/**
 * The bulletChart model returns a function wrapping an instance of a BulletChart.
 */
nv.models.bulletChart = function() {
    "use strict";

    var bulletChart = new BulletChart();

    function chart(selection) {
        bulletChart.render(selection);
        return chart;
    }

    chart.dispatch = bulletChart.dispatch;
    chart.bullet = bulletChart.bullet;
    chart.state = bulletChart.state;

    d3.rebind(chart, bulletChart.bullet, 'color');

    chart.options = nv.utils.optionsFunc.bind(chart);

    nv.utils.rebindp(chart, bulletChart, BulletChart.prototype,
        'orient', 'tooltipContent', 'ranges', 'markers', 'measures', 'width', 'height', 'margin', 'tickFormat',
        'tooltips', 'noData'
    );

    return chart;
};




/**
 * Private variables
 * @type {{color: *}}
 */
var DistributionPrivates = {
    axis : 'x' // 'x' or 'y'... horizontal or vertical
    , getData : null  // defaults d.x or d.y
    , scale : d3.scale.linear()
    , domain : null
    , scale0: null
    , _color : nv.utils.defaultColor()
    , _duration : 250
    , _size : 8
};

/**
 * A Distribution
 */
function Distribution(options){
    options = nv.utils.extend({}, options, DistributionPrivates, {
        margin : {top: 0, right: 0, bottom: 0, left: 0}
        , width : 400 //technically width or height depending on x or y....
        , chartClass: 'distribution'
        , wrapClass: 'distribution'
    });

    Layer.call(this, options, []);

    this.getData(function(d) {
        return d[this.axis()]
    }.bind(this));

    this.renderWatch = nv.utils.renderWatch(this.dispatch, this.duration());
}

nv.utils.create(Distribution, Layer, DistributionPrivates);

/**
 * @override Layer::wrapper
 */
Distribution.prototype.wrapper = function(data){
    Layer.prototype.wrapper.call(this, data, []);

};

/**
 * @override Layer::draw
 */
Distribution.prototype.draw = function(data){

    var that = this
        , availableLength = this.width() -
            (this.axis() === 'x'
            ? this.margin().left + this.margin().right
            : this.margin().top + this.margin().bottom)
        , naxis = this.axis() == 'x' ? 'y' : 'x';

    this.scale0(this.scale0() || this.scale());

    var distWrap = this.g.selectAll('g.nv-dist')
        .data(function(d) { return d }, function(d) { return d.key });

    distWrap.enter().append('g');
    distWrap
        .attr('class', function(d,i) { return 'nv-dist nv-series-' + i })
        .style('stroke', function(d,i) { return that.color(d, i) });

    var dist = distWrap.selectAll('line.nv-dist' + this.axis())
        .data(function(d) { return d.values });

    dist.enter().append('line')
        .attr(this.axis() + '1', function(d,i) { return that.scale0()(that.getData()(d,i)) })
        .attr(this.axis() + '2', function(d,i) { return that.scale0()(that.getData()(d,i)) });

    this.renderWatch.transition(distWrap.exit().selectAll('line.nv-dist' + this.axis()), 'dist exit')
        // .transition()
        .attr(this.axis() + '1', function(d,i) { return that.scale()(that.getData()(d,i)) })
        .attr(this.axis() + '2', function(d,i) { return that.scale()(that.getData()(d,i)) })
        .style('stroke-opacity', 0)
        .remove();

    dist
        .attr('class', function(d,i) { return 'nv-dist' + that.axis() + ' nv-dist' + that.axis() + '-' + i })
        .attr(naxis + '1', 0)
        .attr(naxis + '2', this.size());

    this.renderWatch.transition(dist, 'dist')
        // .transition()
        .attr(this.axis() + '1', function(d,i) { return that.scale()(that.getData()(d,i)) })
        .attr(this.axis() + '2', function(d,i) { return that.scale()(that.getData()(d,i)) });

    this.scale0(this.scale().copy());
};

Distribution.prototype.color = function(_) {
    if (!arguments.length) return this._color();
    this._color( nv.utils.getColor(_) );
    return this;
};
Distribution.prototype.duration = function(_) {
    if (!arguments.length) return this._duration();
    this._duration(_);
    this.renderWatch.reset(_);
    return this;
};

Distribution.prototype.size = function(_){
    if (!arguments.length) return this._size();
    this._size(_);
    return this;
};

/**
 * The distribution model returns a function wrapping an instance of a Distribution.
 */
nv.models.distribution = function () {
    "use strict";

    var distribution = new Distribution();

    function chart(selection) {
        distribution.render(selection);
        return chart;
    }

    chart.dispatch = distribution.dispatch;
    chart.options = nv.utils.optionsFunc.bind(chart);

    nv.utils.rebindp(chart, distribution, Distribution.prototype,
        'margin', 'width', 'axis', 'size', 'getData', 'scale','color', 'duration'
    );

    return chart;
};
nv.models.indentedTree = function() {
  "use strict";
  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var margin = {top: 0, right: 0, bottom: 0, left: 0} //TODO: implement, maybe as margin on the containing div
    , width = 960
    , height = 500
    , color = nv.utils.defaultColor()
    , id = Math.floor(Math.random() * 10000)
    , header = true
    , filterZero = false
    , noData = "No Data Available."
    , childIndent = 20
    , columns = [{key:'key', label: 'Name', type:'text'}] //TODO: consider functions like chart.addColumn, chart.removeColumn, instead of a block like this
    , tableClass = null
    , iconOpen = 'images/grey-plus.png' //TODO: consider removing this and replacing with a '+' or '-' unless user defines images
    , iconClose = 'images/grey-minus.png'
    , dispatch = d3.dispatch('elementClick', 'elementDblclick', 'elementMouseover', 'elementMouseout')
    , getUrl = function(d) { return d.url }
    ;

  //============================================================

  var idx = 0;

  function chart(selection) {
    selection.each(function(data) {
      var depth = 1,
          container = d3.select(this);

      var tree = d3.layout.tree()
          .children(function(d) { return d.values })
          .size([height, childIndent]); //Not sure if this is needed now that the result is HTML

      chart.update = function() { container.transition().duration(600).call(chart) };


      //------------------------------------------------------------
      // Display No Data message if there's nothing to show.
      if (!data[0]) data[0] = {key: noData};

      //------------------------------------------------------------


      var nodes = tree.nodes(data[0]);

      // nodes.map(function(d) {
      //   d.id = i++;
      // })

      //------------------------------------------------------------
      // Setup containers and skeleton of chart

      var wrap = d3.select(this).selectAll('div').data([[nodes]]);
      var wrapEnter = wrap.enter().append('div').attr('class', 'nvd3 nv-wrap nv-indentedtree');
      var tableEnter = wrapEnter.append('table');
      var table = wrap.select('table').attr('width', '100%').attr('class', tableClass);

      //------------------------------------------------------------


      if (header) {
        var thead = tableEnter.append('thead');

        var theadRow1 = thead.append('tr');

        columns.forEach(function(column) {
          theadRow1
            .append('th')
              .attr('width', column.width ? column.width : '10%')
              .style('text-align', column.type == 'numeric' ? 'right' : 'left')
            .append('span')
              .text(column.label);
        });
      }


      var tbody = table.selectAll('tbody')
                    .data(function(d) { return d });
      tbody.enter().append('tbody');



      //compute max generations
      depth = d3.max(nodes, function(node) { return node.depth });
      tree.size([height, depth * childIndent]); //TODO: see if this is necessary at all


      // Update the nodes…
      var node = tbody.selectAll('tr')
          // .data(function(d) { return d; }, function(d) { return d.id || (d.id == ++i)});
          .data(function(d) { return d.filter(function(d) { return (filterZero && !d.children) ? filterZero(d) :  true; } )}, function(d,i) { return d.id || (d.id || ++idx)});
          //.style('display', 'table-row'); //TODO: see if this does anything

      node.exit().remove();

      node.select('img.nv-treeicon')
          .attr('src', icon)
          .classed('folded', folded);

      var nodeEnter = node.enter().append('tr');


      columns.forEach(function(column, index) {

        var nodeName = nodeEnter.append('td')
            .style('padding-left', function(d) { return (index ? 0 : d.depth * childIndent + 12 + (icon(d) ? 0 : 16)) + 'px' }, 'important') //TODO: check why I did the ternary here
            .style('text-align', column.type == 'numeric' ? 'right' : 'left');


        if (index == 0) {
          nodeName.append('img')
              .classed('nv-treeicon', true)
              .classed('nv-folded', folded)
              .attr('src', icon)
              .style('width', '14px')
              .style('height', '14px')
              .style('padding', '0 1px')
              .style('display', function(d) { return icon(d) ? 'inline-block' : 'none'; })
              .on('click', click);
        }


        nodeName.each(function(d) {
          if (!index && getUrl(d))
            d3.select(this)
              .append('a')
              .attr('href',getUrl)
              .attr('class', d3.functor(column.classes))
              .append('span');
          else
            d3.select(this)
              .append('span');

            d3.select(this).select('span')
              .attr('class', d3.functor(column.classes) )
              .text(function(d) { return column.format ? column.format(d) :
                                        (d[column.key] || '-') });
          });

        if  (column.showCount) {
          nodeName.append('span')
              .attr('class', 'nv-childrenCount');

          node.selectAll('span.nv-childrenCount').text(function(d) {
                return ((d.values && d.values.length) || (d._values && d._values.length)) ?                                   //If this is a parent
                    '(' + ((d.values && (d.values.filter(function(d) { return filterZero ? filterZero(d) :  true; }).length)) //If children are in values check its children and filter
                    || (d._values && d._values.filter(function(d) { return filterZero ? filterZero(d) :  true; }).length)     //Otherwise, do the same, but with the other name, _values...
                    || 0) + ')'                                                                                               //This is the catch-all in case there are no children after a filter
                    : ''                                                                                                     //If this is not a parent, just give an empty string
            });
        }

        // if (column.click)
        //   nodeName.select('span').on('click', column.click);

      });

      node
        .order()
        .on('click', function(d) { 
          dispatch.elementClick({
            row: this, //TODO: decide whether or not this should be consistent with scatter/line events or should be an html link (a href)
            data: d,
            pos: [d.x, d.y]
          });
        })
        .on('dblclick', function(d) { 
          dispatch.elementDblclick({
            row: this,
            data: d,
            pos: [d.x, d.y]
          });
        })
        .on('mouseover', function(d) { 
          dispatch.elementMouseover({
            row: this,
            data: d,
            pos: [d.x, d.y]
          });
        })
        .on('mouseout', function(d) { 
          dispatch.elementMouseout({
            row: this,
            data: d,
            pos: [d.x, d.y]
          });
        });




      // Toggle children on click.
      function click(d, _, unshift) {
        d3.event.stopPropagation();

        if(d3.event.shiftKey && !unshift) {
          //If you shift-click, it'll toggle fold all the children, instead of itself
          d3.event.shiftKey = false;
          d.values && d.values.forEach(function(node){
            if (node.values || node._values) {
              click(node, 0, true);
            }
          });
          return true;
        }
        if(!hasChildren(d)) {
          //download file
          //window.location.href = d.url;
          return true;
        }
        if (d.values) {
          d._values = d.values;
          d.values = null;
        } else {
          d.values = d._values;
          d._values = null;
        }
        chart.update();
      }


      function icon(d) {
        return (d._values && d._values.length) ? iconOpen : (d.values && d.values.length) ? iconClose : '';
      }

      function folded(d) {
        return (d._values && d._values.length);
      }

      function hasChildren(d) {
        var values = d.values || d._values;

        return (values && values.length);
      }


    });

    return chart;
  }


  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------
  chart.options = nv.utils.optionsFunc.bind(chart);
  
  chart.margin = function(_) {
    if (!arguments.length) return margin;
    margin.top    = typeof _.top    != 'undefined' ? _.top    : margin.top;
    margin.right  = typeof _.right  != 'undefined' ? _.right  : margin.right;
    margin.bottom = typeof _.bottom != 'undefined' ? _.bottom : margin.bottom;
    margin.left   = typeof _.left   != 'undefined' ? _.left   : margin.left;
    return chart;
  };

  chart.width = function(_) {
    if (!arguments.length) return width;
    width = _;
    return chart;
  };

  chart.height = function(_) {
    if (!arguments.length) return height;
    height = _;
    return chart;
  };

  chart.color = function(_) {
    if (!arguments.length) return color;
    color = nv.utils.getColor(_);
    scatter.color(color);
    return chart;
  };

  chart.id = function(_) {
    if (!arguments.length) return id;
    id = _;
    return chart;
  };

  chart.header = function(_) {
    if (!arguments.length) return header;
    header = _;
    return chart;
  };

  chart.noData = function(_) {
    if (!arguments.length) return noData;
    noData = _;
    return chart;
  };

  chart.filterZero = function(_) {
    if (!arguments.length) return filterZero;
    filterZero = _;
    return chart;
  };

  chart.columns = function(_) {
    if (!arguments.length) return columns;
    columns = _;
    return chart;
  };

  chart.tableClass = function(_) {
    if (!arguments.length) return tableClass;
    tableClass = _;
    return chart;
  };

  chart.iconOpen = function(_){
     if (!arguments.length) return iconOpen;
    iconOpen = _;
    return chart;
  };

  chart.iconClose = function(_){
     if (!arguments.length) return iconClose;
    iconClose = _;
    return chart;
  };

  chart.getUrl = function(_){
     if (!arguments.length) return getUrl;
    getUrl = _;
    return chart;
  };

  //============================================================


  return chart;
};var LegendPrivates = {
    getKey : function(d) { return d.key }
    , align : true
    , rightAlign : true
    , updateState : true   //If true, legend will update data.disabled and trigger a 'stateChange' dispatch.
    , radioButtonMode : false   //If true, clicking legend items will cause it to behave like a radio button. (only one can be selected at a time)
};

/**
 * A Legend
 */
function Legend(options){
    options = nv.utils.extend({}, options, LegendPrivates, {
        margin : {top: 5, right: 0, bottom: 5, left: 0}
        , width: 400
        , height: 20
        , chartClass: 'legend'
        , wrapClass: 'legend'
    });

    Layer.call(this, options,
        ['legendClick', 'legendDblclick', 'legendMouseover', 'legendMouseout']
    );
}

nv.utils.create(Legend, Layer, LegendPrivates);

/**
 * override Layer::wrapper, removed transform/translate
 * @param data
 */
Legend.prototype.wrapper = function(data){

    var chartClass = 'nv-' + this.options.chartClass
        , wrapClass = 'nv-' + this.options.wrapClass;

    this.wrap = this.svg.selectAll('g.nv-wrap.' + wrapClass).data([data]);
    this.wrapEnter = this.wrap.enter().append('g').attr({class: 'nvd3 nv-wrap ' + chartClass });
    this.defsEnter = this.wrapEnter.append('defs');
    this.gEnter = this.wrapEnter.append('g');
    this.g = this.wrap.select('g');
};

Legend.prototype.draw = function(data){

    var that = this
        , series = null
        , seriesEnter = null
        , seriesWidths = []
        , seriesPerRow = 0
        , legendWidth = 0
        , columnWidths = []
        , legendText = null
        , nodeTextLength
        , xPositions = []
        , i = 0
        , k = 0
        , curX = null
        , ypos = 5
        , newxpos = 5
        , maxwidth = 0
        , xpos = null;

    series = this.g.selectAll('.nv-series')
        .data(function(d) { return d });

    seriesEnter = series.enter().append('g').attr('class', 'nv-series')
        .on('mouseover', function(d,i) {
            that.dispatch.legendMouseover(d,i);  //TODO: Make consistent with other event objects
        })
        .on('mouseout', function(d,i) {
            that.dispatch.legendMouseout(d,i);
        })
        .on('click', function(d,i) {
            if (that.updateState()) {
                // Radio button mode: set every series to disabled,
                // and enable the clicked series.
                if (that.radioButtonMode()) {
                    data.forEach(function(series) { series.disabled = true });
                    d.disabled = false;
                }
                // If every single series is disabled, turn all series' back on.
                else {
                    d.disabled = !d.disabled;
                    if (data.every(function(series) { return series.disabled}))
                        data.forEach(function(series) { series.disabled = false});
                }
                that.dispatch.stateChange({
                    disabled: data.map(function(d) { return !!d.disabled })
                });
            }
            that.dispatch.legendClick(d,i);
        })
        .on('dblclick', function(d,i) {
            if (that.updateState()) {
                // When double clicking one, all other series' are set to false,
                // and make the double clicked series enabled.
                data.forEach(function(series) {
                    series.disabled = true;
                });
                d.disabled = false;
                that.dispatch.stateChange({
                    disabled: data.map(function(d) { return !!d.disabled })
                });
            }
            that.dispatch.legendDblclick(d,i);
        });

    seriesEnter.append('circle')
        .style('stroke-width', 2)
        .attr('class','nv-legend-symbol')
        .attr('r', 5);
    seriesEnter.append('text')
        .attr('text-anchor', 'start')
        .attr('class','nv-legend-text')
        .attr('dy', '.32em')
        .attr('dx', '8');
    series.classed('disabled', function(d) { return d.disabled });
    series.exit().remove();
    series.select('circle')
        .style('fill', function(d,i) { return d.color || that.color()(d,i)})
        .style('stroke', function(d,i) { return d.color || that.color()(d, i) });
    series.select('text').text(that.getKey());

    //TODO: implement fixed-width and max-width options (max-width is especially useful with the align option)

    // NEW ALIGNING CODE, TODO: clean up
    if (this.align()) {
        series.each(function(d,i) {
            legendText = d3.select(this).select('text');
            try {
                nodeTextLength = legendText.getComputedTextLength();
                // If the legendText is display:none'd (nodeTextLength == 0), simulate an error so we approximate, instead
                if(nodeTextLength <= 0) throw Error();
            }
            catch(e) {
                nodeTextLength = nv.utils.calcApproxTextWidth(legendText);
            }
            seriesWidths.push(nodeTextLength + 28); // 28 is ~ the width of the circle plus some padding
        });

        while ( legendWidth < this.available.width && seriesPerRow < seriesWidths.length) {
            columnWidths[seriesPerRow] = seriesWidths[seriesPerRow];
            legendWidth += seriesWidths[seriesPerRow++];
        }
        if (seriesPerRow === 0) seriesPerRow = 1; //minimum of one series per row

        while ( legendWidth > this.available.width && seriesPerRow > 1 ) {
            columnWidths = [];
            seriesPerRow--;
            for (k = 0; k < seriesWidths.length; k++) {
                if (seriesWidths[k] > (columnWidths[k % seriesPerRow] || 0) )
                    columnWidths[k % seriesPerRow] = seriesWidths[k];
            }
            legendWidth = columnWidths.reduce(function(prev, cur) { return prev + cur });
        }

        for (i = 0, curX = 0; i < seriesPerRow; i++) {
            xPositions[i] = curX;
            curX += columnWidths[i];
        }
        series
            .attr('transform', function(d, i) {
              return 'translate(' + xPositions[i % seriesPerRow] + ',' + (5 + Math.floor(i / seriesPerRow) * 20) + ')';
            });

        //position legend as far right as possible within the total width
        if (this.rightAlign())
            this.g.attr('transform', 'translate(' + (this.width() - this.margin().right - legendWidth) + ',' + this.margin().top + ')');
        else
            this.g.attr('transform', 'translate(0' + ',' + this.margin().top + ')');

        this.height( this.margin().top + this.margin().bottom + (Math.ceil(seriesWidths.length / seriesPerRow) * 20) );

    } else {

        series
            .attr('transform', function(d, i) {
                var length = d3.select(this).select('text').node().getComputedTextLength() + 28;
                xpos = newxpos;

                if (that.width() < that.margin().left + that.margin().right + xpos + length) {
                    newxpos = xpos = 5;
                    ypos += 20;
                }

                newxpos += length;
                if (newxpos > maxwidth) maxwidth = newxpos;

                return 'translate(' + xpos + ',' + ypos + ')';
            });

        //position legend as far right as possible within the total width
        this.g.attr('transform',
            'translate(' + (this.width() - this.margin().right - maxwidth) + ',' + this.margin().top + ')'
        );

        this.height( this.margin().top + this.margin().bottom + ypos + 15 );
    }
};

Legend.prototype.color = function(_) {
    if (!arguments.length) return this.options.color;
    this.options.color = nv.utils.getColor(_);
    return this;
};

nv.models.legend = function () {
    "use strict";

    var legend = new Legend();

    function chart(selection) {
        legend.render(selection);
        return chart;
    }

    chart.dispatch = legend.dispatch;

    chart.options = nv.utils.optionsFunc.bind(chart);

    nv.utils.rebindp(chart, legend, Legend.prototype,
        'margin', 'width', 'height', 'key', 'rightAlign', 'radioButtonMode', 'updateState', 'color'
    );

    return chart;
};var CumulativeLineChartPrivates = {
    tooltips : true
    , showControls : true
    , rescaleY : true
    , tooltip : function(key, x, y) {
        return '<h3>' + key + '</h3>' +
            '<p>' +  y + ' at ' + x + '</p>'
    }
    , defaultState : null
    , average : function(d) { return d.average }
    , transitionDuration : 250
    , noErrorCheck : false  //if set to TRUE, will bypass an error check in the indexify function.
    , dxScale : d3.scale.linear()
    , index : {i: 0, x: 0}
    , xScale : null
    , yScale : null
    , duration : 250
    , useInteractiveGuideline : false
};

function CumulativeLineChart(options){
    options = nv.utils.extend({}, options, CumulativeLineChartPrivates, {
        margin: {top: 30, right: 30, bottom: 50, left: 60}
        , chartClass: 'cumulativeLine'
        , wrapClass: 'linesWrap'
    });
    Chart.call(this, options, ['']);

    this.line = this.getLine();
    this.controls = this.getLegend();

    this.controls.updateState(false);
    this.interactiveLayer = this.getInteractiveLayer();
    this.state = d3.functor( {index: 0, rescaleY: this.rescaleY()} );
    this.indexLine = null;
}

nv.utils.create(CumulativeLineChart, Chart, CumulativeLineChartPrivates);

CumulativeLineChart.prototype.getLine = function(){
    return nv.models.line();
};

CumulativeLineChart.prototype.getLegend = function(){
    return nv.models.legend();
};

CumulativeLineChart.prototype.getInteractiveLayer = function(){
    return nv.interactiveGuideline()
};

CumulativeLineChart.prototype.wrapper = function(data){
    Chart.prototype.wrapper.call(this, data,
        ['nv-interactive', 'nv-background', 'nv-avgLinesWrap', 'nv-controlsWrap']
    );
    this.renderWatch = nv.utils.renderWatch(this.dispatch, this.duration());
    this.renderWatch.models(this.line);
    if (this.showXAxis()) this.renderWatch.models(this.xAxis());
    if (this.showYAxis()) this.renderWatch.models(this.yAxis());
};

CumulativeLineChart.prototype.draw = function(data){

    this.id(this.line.id());
    this.svg.classed('nv-chart-' + this.id(), true);

    this.xScale( this.line.xScale() );
    this.yScale( this.line.yScale() );

    var that = this
        , availableWidth = this.available.width
        , availableHeight = this.available.height
        , indexDrag = d3.behavior.drag()
        .on('dragstart', this.dragStart)
        .on('drag', this.dragMove)
        .on('dragend', this.dragEnd);

    if (!this.rescaleY()) {
        var seriesDomains = data
            .filter(function(series) { return !series.disabled })
            .map(function(series) {
                var initialDomain = d3.extent(series.values, that.line.y());

                //account for series being disabled when losing 95% or more
                if (initialDomain[0] < -.95)
                    initialDomain[0] = -.95;

                return [
                    (initialDomain[0] - initialDomain[1]) / (1 + initialDomain[1]),
                    (initialDomain[1] - initialDomain[0]) / (1 + initialDomain[0])
                ];
            });
        var completeDomain = [
            d3.min(seriesDomains, function(d) { return d[0] }),
            d3.max(seriesDomains, function(d) { return d[1] })
        ];
        this.line.yDomain(completeDomain);
    } else
        this.line.yDomain(null);

    this.dxScale()
        .domain([0, data[0].values.length - 1]) //Assumes all series have same length
        .range([0, availableWidth])
        .clamp(true);

    var data = this.indexify(this.index().i, data);

    if (this.showControls()) {
        var controlsData = [
            { key: 'Re-scale y-axis', disabled: !this.rescaleY() }
        ];

        this.controls
            .width(140)
            .color(['#444', '#444', '#444'])
            .rightAlign(false)
            .margin({top: 5, right: 0, bottom: 5, left: 20})
        ;

        this.g.select('.nv-controlsWrap')
            .datum(controlsData)
            .attr('transform', 'translate(0,' + (-this.margin().top) +')')
            .call(this.controls);
    }

    // Show error if series goes below 100%
    var tempDisabled = data.filter(function(d) { return d.tempDisabled });

    this.wrap.select('.tempDisabled').remove(); //clean-up and prevent duplicates
    if (tempDisabled.length) {
        this.wrap.append('text').attr('class', 'tempDisabled')
            .attr('x', availableWidth / 2)
            .attr('y', '-.71em')
            .style('text-anchor', 'end')
            .text(tempDisabled.map(function(d) { return d.key }).join(', ') + ' values cannot be calculated for this time period.');
    }

    // Set up interactive layer
    if (this.useInteractiveGuideline()) {
        this.interactiveLayer
            .width(availableWidth)
            .height(availableHeight)
            .margin({left:this.margin().left, top:this.margin().top})
            .svgContainer(this.svg)
            .xScale(this.xScale());
        this.wrap.select(".nv-interactive").call(this.interactiveLayer);
    }

    this.gEnter.select('.nv-background')
        .append('rect');

    this.g.select('.nv-background rect')
        .attr('width', availableWidth)
        .attr('height', availableHeight);

    this.line
        //.x(function(d) { return d.x })
        .y(function(d) { return d.display.y })
        .width(availableWidth)
        .height(availableHeight)
        .color(
            data
                .map(function(d,i){ return d.color || that.color()(d, i)})
                .filter(function(d,i) { return !data[i].disabled && !data[i].tempDisabled; })
        );

    var linesWrap = this.g.select('.nv-linesWrap')
        .style("pointer-events", (this.useInteractiveGuideline()) ? "none" : "all")
        .datum(
            data.filter(function(d) { return !d.disabled && !d.tempDisabled })
        );

    linesWrap.call(this.line);

    //Store a series index number in the data array.
    data.forEach(function(d,i) {
        d.seriesIndex = i;
    });

    var avgLineData = data.filter(function(d) {
        return !d.disabled && !!that.average()(d);
    });

    var avgLines = this.g.select(".nv-avgLinesWrap")
        .style("pointer-events","none")
        .selectAll("line")
        .data(avgLineData, function(d) { return d.key; });

    var getAvgLineY = function(d) {
        //If average lines go off the svg element, clamp them to the svg bounds.
        var yVal = that.yScale()(that.average()(d));
        if (yVal < 0) return 0;
        if (yVal > availableHeight) return availableHeight;
        return yVal;
    };

    avgLines.enter()
        .append('line')
        .style('stroke-width',2)
        .style('stroke-dasharray', '10,10')
        .style('stroke',function (d) {
            return that.line.color()(d,d.seriesIndex);
        })
        .attr('x1',0)
        .attr('x2',availableWidth)
        .attr('y1', getAvgLineY)
        .attr('y2', getAvgLineY);

    avgLines
        .style('stroke-opacity',function(d){
            //If average lines go offscreen, make them transparent
            var yVal = that.yScale()(that.average()(d));
            if (yVal < 0 || yVal > availableHeight) return 0;
            return 1;
        })
        .attr('x1',0)
        .attr('x2',availableWidth)
        .attr('y1', getAvgLineY)
        .attr('y2', getAvgLineY);

    avgLines.exit().remove();

    this.indexLine = linesWrap.selectAll('.nv-indexLine')
        .data([that.index()]);
    this.indexLine.enter().append('rect').attr('class', 'nv-indexLine')
        .attr('width', 3)
        .attr('x', -2)
        .attr('fill', 'red')
        .attr('fill-opacity', .5)
        .style("pointer-events","all")
        .call(indexDrag);

    this.indexLine
        .attr('transform', function(d) { return 'translate(' + that.dxScale()(d.i) + ',0)' })
        .attr('height', availableHeight);

    this.plotAxes(data);
};

CumulativeLineChart.prototype.plotAxes = function(data){

    if (this.rightAlignYAxis()) {
        this.wrap.select('.nv-y.nv-axis')
            .attr("transform", "translate(" + this.available.width + ", 0)");
    }

    if (this.showXAxis()) {

        this.xAxis()
            //Suggest how many ticks based on the chart width and D3 should listen (70 is the optimal number for MM/DD/YY dates)
            .ticks( Math.min(data[0].values.length, this.available.width/70) )
            .orient('bottom')
            .tickPadding(7)
            .highlightZero(true)
            .showMaxMin(false)
            .scale(this.xScale())
            .tickSize(-this.available.height, 0);

        this.wrap.select('.nv-x.nv-axis')
            .style("pointer-events","none")
            .attr('transform', 'translate(0,' + this.yScale().range()[0] + ')')
            .transition()
            .call(this.xAxis());
    }

    if (this.showYAxis()) {

        this.yAxis()
            .orient(this.rightAlignYAxis() ? 'right' : 'left')
            .tickFormat(d3.format(',.1f'))
            .scale(this.yScale())
            .ticks( this.available.height / 36 )
            .tickSize( -this.available.width, 0);

        this.wrap.select('.nv-y.nv-axis')
            .transition().call(this.yAxis());
    }
};

CumulativeLineChart.prototype.attachEvents = function(){

    var that = this;

    this.line.dispatch
        .on('elementMouseover.tooltip', function(e) {
            e.pos = [e.pos[0] +  this.margin().left, e.pos[1] + that.margin().top];
            that.dispatch.tooltipShow(e);
        })
        .on('elementMouseout.tooltip', function(e) {
            that.dispatch.tooltipHide(e);
        })
        .on('elementClick', function(e) {
            that.index().i = e.pointIndex;
            that.index().x = that.dxScale()(that.index().i);
            // update state and send stateChange with new index
            that.state().index = that.index().i;
            that.dispatch.stateChange(that.state());
            that.updateZero();
        });

    this.controls.dispatch.on('legendClick', function(d) {
        d.disabled = !d.disabled;
        that.rescaleY(!d.disabled);
        that.state().rescaleY = that.rescaleY();
        that.dispatch.stateChange(that.state());
        that.update();
    });

    this.legend.dispatch.on('stateChange', function(newState) {
        that.state().disabled = newState.disabled;
        that.dispatch.stateChange(that.state());
        that.update();
    });

    this.interactiveLayer.dispatch
        .on('elementMousemove', function(e) {
            that.line.clearHighlights();
            var singlePoint, pointIndex, pointXLocation, allData = [];

            that.svg.call(function(selection){
                selection.each(function(data){
                    data
                        .filter(function(series, i) {
                            series.seriesIndex = i;
                            return !series.disabled;
                        })
                        .forEach(function(series,i) {
                            pointIndex = nv.interactiveBisect(series.values, e.pointXValue, that.x());
                            that.line.highlightPoint(i, pointIndex, true);
                            var point = series.values[pointIndex];
                            if (typeof point === 'undefined') return;
                            if (typeof singlePoint === 'undefined') singlePoint = point;
                            if (typeof pointXLocation === 'undefined') pointXLocation = that.xScale()(that.x()(point,pointIndex));
                            allData.push({
                                key: series.key,
                                value: that.y()(point, pointIndex),
                                color: that.color()(series,series.seriesIndex)
                            });
                        });
                });
            });

            //Highlight the tooltip entry based on which point the mouse is closest to.
            if (allData.length > 2) {
                var yValue = that.yScale().invert(e.mouseY);
                var domainExtent = Math.abs(that.yScale().domain()[0] - that.yScale().domain()[1]);
                var threshold = 0.03 * domainExtent;
                var indexToHighlight = nv.nearestValueIndex(allData.map(function(d){return d.value}),yValue,threshold);
                if (indexToHighlight !== null)
                    allData[indexToHighlight].highlight = true;
            }

            var xValue = that.xAxis().tickFormat()(that.x()(singlePoint,pointIndex), pointIndex);
            that.interactiveLayer.tooltip
                .position({left: pointXLocation + that.margin().left, top: e.mouseY + that.margin().top})
                .chartContainer(that.parentNode)
                .enabled(that.tooltips())
                .valueFormatter(function(d) {
                    return that.yAxis().tickFormat()(d);
                })
                .data({ value: xValue, series: allData })
                ();

            that.interactiveLayer.renderGuideLine(pointXLocation);
        })
        .on("elementMouseout",function() {
            that.dispatch.tooltipHide();
            that.line.clearHighlights();
        });

    this.dispatch
        .on('tooltipHide', function() {
            if (that.tooltips()) nv.tooltip.cleanup();
        })
        .on('tooltipShow', function(e) {
            if (that.tooltips())
                that.showTooltip()(e, that.svg[0][0]);
        })
        .on('changeState', function(e) { // Update chart from a state object passed to event handler
            if (typeof e.disabled !== 'undefined') {
                that.svg.call(function(selection){
                    selection.each(function(data){
                        data.forEach(function(series,i) { series.disabled = e.disabled[i] });
                        that.state().disabled = e.disabled;
                    });
                });
            }
            if (typeof e.index !== 'undefined') {
                that.index().i = e.index;
                that.index().x = that.dxScale()(that.index().i);
                that.state().index = e.index;
                that.indexLine.data([that.index()]);
            }
            if (typeof e.rescaleY !== 'undefined')
                that.rescaleY( e.rescaleY );
            that.update();
        });

    this.g.select('.nv-background rect')
        .on('click', function() {
            that.index().x = d3.mouse(this)[0];
            that.index().i = Math.round(that.dxScale().invert(that.index().x));
            // update state and send stateChange with new index
            that.state().index = that.index().i;
            that.dispatch.stateChange(that.state());
            that.updateZero();
        });
};

/* Normalize the data according to an index point. */
CumulativeLineChart.prototype.indexify = function(idx, data) {
    return data.map(function(line) {
        if (!line.values) return line;
        var indexValue = line.values[idx];
        if (indexValue == null) return line;
        var v = this.line.y()(indexValue, idx);
        //TODO: implement check below, and disable series if series loses 100% or more cause divide by 0 issue
        if (v < -.95 && !this.noErrorCheck()) {
            //if a series loses more than 100%, calculations fail.. anything close can cause major distortion (but is mathematically correct till it hits 100)
            line.tempDisabled = true;
            return line;
        }
        line.tempDisabled = false;
        line.values = line.values.map(function(point, pointIndex) {
            point.display = {'y': (this.line.y()(point, pointIndex) - v) / (1 + v) };
            return point;
        }.bind(this));
        return line;
    }.bind(this))
};

CumulativeLineChart.prototype.updateZero = function() {
    this.indexLine.data([this.index()]);
    //When dragging the index line, turn off line transitions.
    // Then turn them back on when done dragging.
    var oldDuration = this.duration();
    this.duration(0);
    this.update();
    this.duration(oldDuration);
};

CumulativeLineChart.prototype.dragStart = function() {
    this.svg.style('cursor', 'ew-resize');
};

CumulativeLineChart.prototype.dragMove = function() {
    this.index().x = d3.event.x;
    this.index().i = Math.round(this.dxScale().invert( this.index().x ));
    this.updateZero();
};

CumulativeLineChart.prototype.dragEnd = function() {
    this.svg.style('cursor', 'auto');
    // update state and send stateChange with new index
    this.state().index = this.index().i;
    this.dispatch.stateChange(this.state());
};

CumulativeLineChart.prototype.showTooltip = function(e, offsetElement) {
    var left = e.pos[0] + ( offsetElement.offsetLeft || 0 ),
        top = e.pos[1] + ( offsetElement.offsetTop || 0),
        x = this.xAxis().tickFormat()(this.line.x()(e.point, e.pointIndex)),
        y = this.yAxis().tickFormat()(this.line.y()(e.point, e.pointIndex)),
        content = this.tooltip()(e.series.key, x, y);

    nv.tooltip.show([left, top], content, null, null, offsetElement);
};

CumulativeLineChart.prototype.color = function(_) {
    if (!arguments.length) return this.options.color;
    this.options.color = nv.utils.getColor(_) ;
    this.legend.color( this.options.color );
    return this;
};

CumulativeLineChart.prototype.useInteractiveGuideline = function(_) {
    if(!arguments.length) return this.options.useInteractiveGuideline;
    this.options.useInteractiveGuideline = _;
    if (_ === true) {
        this.line.interactive(false);
        this.line.useVoronoi(false);
    }
    return this;
};

CumulativeLineChart.prototype.rightAlignYAxis = function(_) {
    if(!arguments.length) return this.options.rightAlignYAxis;
    this.options.rightAlignYAxis = _;
    this.yAxis().orient( (_) ? 'right' : 'left');
    return this;
};

CumulativeLineChart.prototype.transitionDuration = function(_) {
    nv.deprecated('cumulativeLineChart.transitionDuration');
    return this.duration(_);
};

CumulativeLineChart.prototype.duration = function(_) {
    if(!arguments.length) return this.options.duration;
    this.options.duration = _;
    this.line.duration(_);
    this.xAxis().duration(_);
    this.yAxis().duration(_);
    this.renderWatch.reset(_);
    return this;
};

CumulativeLineChart.prototype.x = function(_){
    if (!arguments.length) return this.options.x;
    this.options.x = _;
    this.line.x(_);
    return this;
};

CumulativeLineChart.prototype.y = function(_){
    if (!arguments.length) return this.options.y;
    this.options.y = _;
    this.line.y(_);
    return this;
};

nv.models.cumulativeLineChart = function(){
    "use strict";

    var cumulativeLineChart = new CumulativeLineChart();

    function chart(selection){
        cumulativeLineChart.render(selection);
        return chart;
    }

    chart.dispatch = cumulativeLineChart.dispatch;
    chart.lines = cumulativeLineChart.line;
    chart.legend = cumulativeLineChart.legend;
    chart.interactiveLayer = cumulativeLineChart.interactiveLayer;

    d3.rebind(chart, cumulativeLineChart.line,
        'defined', 'isArea', 'xScale', 'yScale', 'size', 'xDomain', 'yDomain', 'xRange', 'yRange', 'forceX',
        'forceY', 'interactive', 'clipEdge', 'clipVoronoi', 'useVoronoi',  'id'
    );

    chart.options = nv.utils.optionsFunc.bind(chart);

    nv.utils.rebindp(chart, cumulativeLineChart, CumulativeLineChart.prototype,
        'margin', 'width', 'height', 'color', 'rescaleY', 'showControls', 'useInteractiveGuideline', 'showLegend',
        'showXAxis', 'showYAxis', 'rightAlignYAxis', 'tooltips', 'tooltipContent', 'state', 'defaultState',
        'noData', 'average', 'transitionDuration', 'duration', 'noErrorCheck', 'xAxis', 'yAxis', 'x', 'y'
    );

    return chart;
};

var LinePrivates = {
    isArea : function(d) { return d.area } // decides if a line is an area or just a line
    , clipEdge : false // if true, masks lines within x and y scale
    , interpolate : "linear" // controls the line interpolation
    , xScale: null
    , yScale: null
    , xScale0: null
    , yScale0: null
    , duration: 250
};

/**
 * A Line Chart
 */
function Line(options) {
    options = nv.utils.extend({}, options, LinePrivates, {
        margin: {top: 0, right: 0, bottom: 0, left: 0}
        , width: 960
        , height: 500
        , chartClass: 'line'
        , wrapClass: 'scatterWrap'
    });
    Layer.call(this, options, []);

    this.scatter = this.getScatter()
        .size(16) // default size
        .sizeDomain([16,256]) //set to speed up calculation, needs to be unset if there is a custom size accessor
    ;
    this.renderWatch = nv.utils.renderWatch(this.dispatch, this.duration());
}

nv.utils.create(Line, Layer, LinePrivates);

Line.prototype.getScatter = function(){
    return nv.models.scatter();
};

/**
 * @override Layer::wrapper
 */
Line.prototype.wrapper = function(data){
    Layer.prototype.wrapper.call(this, data, [ 'nv-groups' ]);
};

/**
 * override Layer::draw
 * @param data
 */
Line.prototype.draw = function(data){
    var that = this,
        availableWidth = this.available.width,
        availableHeight = this.available.height,
        scatterWrap = this.wrap.select('.nv-scatterWrap');

    this.scatter
        .width(availableWidth)
        .height(availableHeight);

    scatterWrap.transition().call(this.scatter);

    this.x(this.scatter.x());
    this.y(this.scatter.y());
    this.color(this.scatter.color());

    this.xScale(this.scatter.xScale());
    this.yScale(this.scatter.yScale());
    this.xScale0(this.xScale0() || this.xScale());
    this.yScale0(this.yScale0() || this.yScale());

    this.defsEnter.append('clipPath')
        .attr('id', 'nv-edge-clip-' + this.id())
        .append('rect');

    this.wrap.select('#nv-edge-clip-' + this.id() + ' rect')
        .attr('width', availableWidth)
        .attr('height', (availableHeight > 0) ? availableHeight : 0);

    this.g.attr('clip-path', this.clipEdge() ? 'url(#nv-edge-clip-' + this.id() + ')' : '');
    scatterWrap.attr('clip-path', this.clipEdge() ? 'url(#nv-edge-clip-' + this.id() + ')' : '');

    var groups = this.wrap
        .select('.nv-groups')
        .selectAll('.nv-group')
        .data(function(d) { return d }, function(d) { return d.key });

    groups.enter().append('g')
        .style('stroke-opacity', this.opacityDefault())
        .style('fill-opacity', this.opacityDefault());

    groups.exit().remove();

    groups
        .attr('class', function(d,i) { return 'nv-group nv-series-' + i })
        .classed('hover', function(d) { return d.hover })
        .style('fill', function(d,i){ return that.color()(d, i) })
        .style('stroke', function(d,i){ return that.color()(d, i)});

    groups.watchTransition(this.renderWatch, 'line: groups')
        .style('stroke-opacity', 1)
        .style('fill-opacity', .5);

    var areaPaths = groups.selectAll('path.nv-area')
        .data(function(d) { return that.isArea()(d) ? [d] : [] }); // this is done differently than lines because I need to check if series is an area
    areaPaths.enter().append('path')
        .attr('class', 'nv-area')
        .attr('d', function(d) {
            return d3.svg.area()
                .interpolate(that.interpolate())
                .defined(that.defined)
                .x(function(d,i) { return nv.utils.NaNtoZero(that.xScale0()(that.x()(d,i))) })
                .y0(function(d,i) { return nv.utils.NaNtoZero(that.yScale0()(that.y()(d,i))) })
                .y1(function() { return that.yScale0()( that.yScale().domain()[0] <= 0 ? that.yScale().domain()[1] >= 0 ? 0 : that.yScale().domain()[1] : that.yScale().domain()[0] ) })
                //.y1(function(d,i) { return yScale0(0) }) //assuming 0 is within y domain.. may need to tweak this
                .apply(that, [d.values])
        });
    groups.exit().selectAll('path.nv-area')
        .remove();

    areaPaths.watchTransition(this.renderWatch, 'line: areaPaths')
        .attr('d', function(d) {
            return d3.svg.area()
                .interpolate(that.interpolate())
                .defined(that.defined)
                .x(function(d,i) { return nv.utils.NaNtoZero(that.xScale()(that.x()(d,i))) })
                .y0(function(d,i) { return nv.utils.NaNtoZero(that.yScale()(that.y()(d,i))) })
                .y1(function() { return that.yScale()( that.yScale().domain()[0] <= 0 ? that.yScale().domain()[1] >= 0 ? 0 : that.yScale().domain()[1] : that.yScale().domain()[0] ) })
                //.y1(function(d,i) { return yScale0(0) }) //assuming 0 is within y domain.. may need to tweak this
                .apply(that, [d.values])
        });

    var linePaths = groups.selectAll('path.nv-'+this.options.chartClass)
        .data(function(d) { return [d.values] });
    linePaths.enter().append('path')
        .attr('class', ('nv-'+this.options.chartClass))
        .attr('d',
            d3.svg.line()
                .interpolate(this.interpolate())
                .defined(function(d, i){ return !isNaN(that.y()(d, i)) && (that.y()(d, i) !== null) })
                .x(function(d,i) { return nv.utils.NaNtoZero(that.xScale0()(that.x()(d,i))) })
                .y(function(d,i) { return nv.utils.NaNtoZero(that.yScale0()(that.y()(d,i))) })
        );

    linePaths.watchTransition(this.renderWatch, 'line: linePaths')
        .attr('d',
            d3.svg.line()
                .interpolate(this.interpolate())
                .defined(function(d,i){ return !isNaN(that.y()(d,i)) && (that.y()(d,i) !== null) })
                .x(function(d,i) { return nv.utils.NaNtoZero(that.xScale()(that.x()(d,i))) })
                .y(function(d,i) { return nv.utils.NaNtoZero(that.yScale()(that.y()(d,i))) })
        );

    //store old scales for use in transitions on update
    that.xScale0(this.xScale().copy());
    that.yScale0(this.yScale().copy());
};

/**
 * @override Layer::attachEvents
 */
Line.prototype.attachEvents = function(){
    Layer.prototype.attachEvents.call(this);

    // Pass through scatter dispatch events,
    // required for renderWatch to dispatch properly
    this.scatter.dispatch
        .on('elementClick', function(){
            this.dispatch.elementClick.apply(this, arguments);
        }.bind(this))
        .on('elementMouseover', function(){
            this.dispatch.elementMouseover.apply(this, arguments);
        }.bind(this))
        .on('elementMouseout', function(){
            this.dispatch.elementMouseout.apply(this, arguments);
        }.bind(this))
};

Line.prototype.transitionDuration = function(_) {
    nv.deprecated('line.transitionDuration');
    return this.duration(_);
};

Line.prototype.defined = function(d, i) {  // allows a line to be not continuous when it is not defined
    return !isNaN(this.y()(d,i)) && (this.y()(d,i) !== null)
};

/**
 * The line model returns a function wrapping an instance of a Line.
 */
nv.models.line = function () {
    "use strict";

    var line = new Line();

    function chart(selection) {
        line.render(selection);
        return chart;
    }

    d3.rebind(chart, line.scatter,
        'id', 'interactive', 'size', 'xScale', 'yScale', 'zScale', 'xDomain', 'yDomain', 'xRange', 'yRange',
        'sizeDomain', 'forceX', 'forceY', 'forceSize', 'clipVoronoi', 'useVoronoi', 'clipRadius', 'padData',
        'highlightPoint','clearHighlights', 'duration', 'clipEdge', 'x', 'y', 'color'
    );

    chart.dispatch = line.dispatch;
    chart.scatter = line.scatter;
    chart.options = nv.utils.optionsFunc.bind(chart);

    nv.utils.rebindp(chart, line, Line.prototype,
        'margin', 'width', 'height', 'interpolate', 'defined', 'isArea', 'transitionDuration'
    );

    return chart;
};
var LineChartPrivates = {
    defaultState : null
    , xScale: null
    , yScale: null
    , interactive: null
    , useVoronoi: null
    , tooltips: true
    , duration : 250
    , useInteractiveGuideline : false
};

/**
 * A Pie Chart draws a percentage data set, in a circular display.
 */
function LineChart(options){
    options = nv.utils.extend({}, options, LineChartPrivates, {
        margin: { top: 30, right: 20, bottom: 50, left: 60 },
        chartClass: 'lineChart',
        wrapClass: 'linesWrap'
    });
    Chart.call(this, options);

    this.line = this.getLine();
    this.interactiveLayer = this.getInteractiveLayer();
    this.state = this.getStatesManager();
}

nv.utils.create(LineChart, Chart, LineChartPrivates);

LineChart.prototype.getLine = function(){
    return nv.models.line();
};

LineChart.prototype.getInteractiveLayer = function(){
    return nv.interactiveGuideline();
};

/**
 * @override Layer::wrapper
 */
LineChart.prototype.wrapper = function(data){
    Chart.prototype.wrapper.call(this, data, [ 'nv-interactive' ]);
    this.renderWatch = nv.utils.renderWatch(this.dispatch, this.duration());
    this.renderWatch.models(this.line);
    if (this.showXAxis()) this.renderWatch.models(this.xAxis());
    if (this.showYAxis()) this.renderWatch.models(this.yAxis());
};

/**
 * @override Layer::attachEvents
 */
LineChart.prototype.attachEvents = function(){
    Layer.prototype.attachEvents.call(this);

    this.legend.dispatch.on('stateChange', function(newState) {
        this.state = newState;
        this.dispatch.stateChange(this.state);
        this.update();
    }.bind(this));

    this.interactiveLayer.dispatch
        .on('elementMousemove', function(e) {
            this.line.clearHighlights();
            var singlePoint, pointIndex, pointXLocation, allData = [];
            this.svg.call(function(selection){
                selection.each(function(data){
                    data.filter(function(series, i) { series.seriesIndex = i; return !series.disabled; })
                        .forEach(function(series,i) {
                            pointIndex = nv.interactiveBisect(series.values, e.pointXValue, this.x());
                            this.line.highlightPoint(i, pointIndex, true);
                            var point = series.values[pointIndex];
                            if (typeof point === 'undefined') return;
                            if (typeof singlePoint === 'undefined') singlePoint = point;
                            if (typeof pointXLocation === 'undefined') pointXLocation = this.xScale()(this.x()(point,pointIndex));
                            allData.push({
                                key: series.key,
                                value: this.y()(point, pointIndex),
                                color: this.color(series, series.seriesIndex)
                            });
                        }.bind(this));
                });
            });
            //Highlight the tooltip entry based on which point the mouse is closest to.
            if (allData.length > 2) {
                var yValue = this.yScale().invert(e.mouseY);
                var domainExtent = Math.abs(this.yScale().domain()[0] - this.yScale().domain()[1]);
                var threshold = 0.03 * domainExtent;
                var indexToHighlight = nv.nearestValueIndex(allData.map(function(d){return d.value}),yValue,threshold);
                if (indexToHighlight !== null)
                    allData[indexToHighlight].highlight = true;
            }
            var xValue = this.xAxis().tickFormat()(this.x()(singlePoint, pointIndex));
            this.interactiveLayer.tooltip
                .position({
                    left: pointXLocation + this.margin().left,
                    top: e.mouseY + this.margin().top
                })
                .chartContainer(this.svg[0][0].parentNode)
                .enabled(this.tooltips)
                .valueFormatter(function(d) {
                    return this.yAxis().tickFormat()(d);
                }.bind(this))
                .data({
                    value: xValue,
                    series: allData
                })();

            this.interactiveLayer.renderGuideLine(pointXLocation);
        }.bind(this))
        .on("elementMouseout",function() {
            this.dispatch.tooltipHide();
            this.line.clearHighlights();
        }.bind(this));

    this.dispatch
        .on('tooltipShow', function(e) {
            if (this.tooltips())
                this.showTooltip(e, this.svg[0][0].parentNode)
        }.bind(this))
        .on('changeState', function(e) {
            if (typeof e.disabled !== 'undefined' && data.length === e.disabled.length) {
                this.svg.call(function(selection){
                    selection.each(function(data){
                        data.forEach(function(series,i) {
                            series.disabled = e.disabled[i];
                        });
                    });
                });
                this.state.disabled = e.disabled;
            }
            this.update();
        }.bind(this))
        .on('tooltipHide', function() {
            if (this.tooltips()) nv.tooltip.cleanup();
        }.bind(this));

    this.line.dispatch
        .on('elementMouseover.tooltip', function(e) {
            e.pos = [e.pos[0] +  this.margin().left, e.pos[1] + this.margin().top];
            this.dispatch.tooltipShow(e);
        }.bind(this))
        .on('elementMouseout.tooltip', function(e) {
            this.dispatch.tooltipHide(e);
        }.bind(this));
};

/**
 * @override Layer::draw
 */
LineChart.prototype.draw = function(data){

    var that = this,
        availableWidth = this.available.width,
        availableHeight = this.available.height;

    this.xScale(this.line.xScale());
    this.yScale(this.line.yScale());

    if (this.useInteractiveGuideline()) {
        this.interactiveLayer
            .width(availableWidth)
            .height(availableHeight)
            .margin({
                left: this.margin().left,
                top: this.margin().top
            })
            .svgContainer(this.svg)
            .xScale(this.xScale());
        this.wrap.select(".nv-interactive")
            .call(this.interactiveLayer);
    }

    this.line
        .width(availableWidth)
        .height(availableHeight)
        .color(
            data
                .map( function(d,i){return d.color || that.color()(d, i)} )
                .filter( function(d,i) { return !data[i].disabled } )
        );

    var linesWrap = this.g.select('.nv-linesWrap')
        .datum(data.filter(function(d) { return !d.disabled }))
        .transition()
        .call(this.line);

    Chart.prototype.draw.call(this, data);
};

LineChart.prototype.transitionDuration = function(_) {
    nv.deprecated('lineChart.transitionDuration');
    return this.duration(_);
};

LineChart.prototype.duration = function(_) {
    if (!arguments.length) return this.options.duration;
    this.options.duration = _;
    this.renderWatch.reset(_);
    this.line.duration(_);
    this.xAxis().duration(_);
    this.yAxis().duration(_);
    return this;
};

LineChart.prototype.color = function(_) {
    if (!arguments.length) return this.options.color;
    this.options.color = nv.utils.getColor(_);
    this.legend.color( this.color() );
    return this;
};

LineChart.prototype.useInteractiveGuideline = function(_) {
    if(!arguments.length) return this.options.useInteractiveGuideline;
    this.options.useInteractiveGuideline = _;
    if (_ === true) {
        this.interactive(false);
        this.useVoronoi(false);
    }
    return this;
};

LineChart.prototype.showTooltip = function(e, offsetElement) {
    var left = e.pos[0] + ( offsetElement.offsetLeft || 0 ),
        top = e.pos[1] + ( offsetElement.offsetTop || 0),
        x = this.xAxis().tickFormat()(this.line.x()(e.point, e.pointIndex)),
        y = this.yAxis().tickFormat()(this.line.y()(e.point, e.pointIndex)),
        content = this.tooltip()(e.series.key, x, y);
    nv.tooltip.show([left, top], content, null, null, offsetElement);
};

/**
 * The lineChart model returns a function wrapping an instance of a LineChart.
 */
nv.models.lineChart = function() {
    "use strict";

    var lineChart = new LineChart();

    function chart(selection) {
        lineChart.render(selection);
        return chart;
    }

    chart.dispatch = lineChart.dispatch;
    chart.line = lineChart.line;
    chart.legend = lineChart.legend;
    chart.interactiveLayer = lineChart.interactiveLayer;
    chart.state = lineChart.state;

    d3.rebind(chart, lineChart.line,
        'x', 'y', 'size', 'xScale', 'yScale', 'xDomain', 'yDomain', 'xRange', 'yRange', 'defined', 'isArea',
        'forceX', 'forceY', 'interactive', 'clipEdge', 'clipVoronoi', 'useVoronoi','id', 'interpolate'
    );

    chart.options = nv.utils.optionsFunc.bind(chart);

    nv.utils.rebindp(chart, lineChart, LineChart.prototype,
        'margin', 'width', 'height', 'showXAxis', 'showYAxis', 'tooltips', 'tooltipContent', 'state', 'defaultState',
        'noData', 'showLegend', 'transitionDuration', 'duration', 'color', 'rightAlignYAxis', 'useInteractiveGuideline',
        'xAxis', 'yAxis'
    );

    return chart;
};var LinePlusBarChartPrivates = {
    tooltips : true
    , state : null
    , defaultState : null
    , xScale: null
    , yScale1: null
    , yScale2 : null
    , y1Axis: null
    , y2Axis: null
    , _color: nv.utils.defaultColor()
};

/**
 * A LinePlusBarChart
 */
function LinePlusBarChart(options){
    options = nv.utils.extend({}, options, LinePlusBarChartPrivates, {
        margin : {top: 30, right: 60, bottom: 50, left: 60}
        , chartClass: 'linePlusBar'
    });
    Chart.call(this, options);

    this.line = this.getLine();
    this.historicalBar = this.getHistoricalBar();
    this.y1Axis(this.getAxis());
    this.y2Axis(this.getAxis());

    this.xAxis()
        .tickPadding(7)
    ;
    this.historicalBar
        .padData(true)
    ;
    this.line
        .clipEdge(false)
        .padData(true)
    ;
    this.y1Axis()
        .orient('left')
    ;
    this.y2Axis()
        .orient('right')
    ;
    this.showTooltip = function(e, offsetElement) {
        var left = e.pos[0] + ( offsetElement.offsetLeft || 0 ),
            top = e.pos[1] + ( offsetElement.offsetTop || 0),
            x = this.xAxis().tickFormat()(this.line.x()(e.point, e.pointIndex)),
            y = (e.series.bar ? this.y1Axis() : this.y2Axis()).tickFormat()(this.line.y()(e.point, e.pointIndex)),
            content = this.tooltip()(e.series.key, x, y);

        nv.tooltip.show([left, top], content, e.value < 0 ? 'n' : 's', null, offsetElement);
    }.bind(this);
}

nv.utils.create(LinePlusBarChart, Chart, LinePlusBarChartPrivates);

LinePlusBarChart.prototype.getLine = function(){
    return nv.models.line();
};

LinePlusBarChart.prototype.getHistoricalBar = function(){
    return nv.models.historicalBar();
};

LinePlusBarChart.prototype.getAxis = function(){
    return nv.models.axis();
};

LinePlusBarChart.prototype.wrapper = function(data){
    Chart.prototype.wrapper.call(this, data,
        ['nv-y1 nv-axis', 'nv-y2 nv-axis', 'nv-barsWrap', 'nv-linesWrap']
    );
};

LinePlusBarChart.prototype.draw = function(data){
    var that = this
        , availableWidth = this.available.width
        , availableHeight = this.available.height
        , dataBars = data.filter(function(d) { return !d.disabled && d.bar })
        , dataLines = data.filter(function(d) { return !d.bar }) // removed the !d.disabled clause here to fix Issue #240
        , barsWrap = this.g.select('.nv-barsWrap').datum(dataBars.length ? dataBars : [{values:[]}])
        , linesWrap = this.g.select('.nv-linesWrap').datum(dataLines[0] && !dataLines[0].disabled ? dataLines : [{values:[]}] )
        ;

    this.line
        .margin({top: 0, right: 0 , bottom: 0, left: 0})
        .width(availableWidth)
        .height(availableHeight)
        .color(data.map(function(d,i) {
            return d.color || that._color()(d, i);
        }).filter(function(d,i) { return !data[i].disabled && !data[i].bar }));

    this.historicalBar
        .margin({top: 0, right: 0 , bottom: 0, left: 0})
        .width(availableWidth)
        .height(availableHeight)
        .color(data.map(function(d,i) {
            return d.color || that._color()(d, i);
        }).filter(function(d,i) { return !data[i].disabled && data[i].bar }));

    d3.transition(barsWrap).call(this.historicalBar);
    d3.transition(linesWrap).call(this.line);

    this.xScale(
        dataLines.filter(function(d) { return !d.disabled; }).length && dataLines.filter(function(d) { return !d.disabled; })[0].values.length
            ? this.line.xScale()
            : this.historicalBar.xScale()
    );
    this.yScale1(this.historicalBar.yScale());
    this.yScale2(this.line.yScale());

    this.xAxis()
        .scale(this.xScale())
        .ticks( availableWidth / 100 )
        .tickSize(-availableHeight, 0);

    this.y1Axis()
        .scale(this.yScale1())
        .ticks( availableHeight / 36 )
        .tickSize(-availableWidth, 0);

    this.y2Axis()
        .scale(this.yScale2())
        .ticks( availableHeight / 36 )
        .tickSize(dataBars.length ? 0 : -availableWidth, 0); // Show the y2 rules only if y1 has none

    this.g.select('.nv-x.nv-axis')
        .attr('transform', 'translate(0,' + this.yScale1().range()[0] + ')');

    this.g.select('.nv-y2.nv-axis')
        .style('opacity', dataLines.length ? 1 : 0)
        .attr('transform', 'translate(' + availableWidth + ',0)');
    //.attr('transform', 'translate(' + x.range()[1] + ',0)');

    d3.transition(this.g.select('.nv-x.nv-axis'))
        .call(this.xAxis());
    d3.transition(this.g.select('.nv-y1.nv-axis'))
        .style('opacity', dataBars.length ? 1 : 0)
        .call(this.y1Axis());
    d3.transition(this.g.select('.nv-y2.nv-axis'))
        .call(this.y2Axis());

};

LinePlusBarChart.prototype.attachEvents = function(){
    Chart.prototype.attachEvents.call(this);
    var that = this;
    this.dispatch
        .on('tooltipShow', function(e) {
            if (this.tooltips) this.showTooltip(e, this.svg[0][0].parentNode);
        }.bind(this))
        // Update chart from a state object passed to event handler
        .on('changeState', function(e) {
            if (typeof e.disabled !== 'undefined') {
                that.svg.call(function(selection){
                    selection.each(function(data){
                        data.forEach(function(series,i) {
                            series.disabled = e.disabled[i];
                        });
                        that.state.disabled = e.disabled;
                    });
                });
            }
            this.update();
        }.bind(this))
        .on('tooltipHide', function() {
            if (this.tooltips) nv.tooltip.cleanup();
        }.bind(this));

    this.legend.dispatch.on('stateChange', function(newState) {
        this.state = newState;
        this.dispatch.stateChange(this.state);
        this.update();
    }.bind(this));

    this.line
        .dispatch.on('elementMouseover.tooltip', function(e) {
            e.pos = [e.pos[0] +  this.margin().left, e.pos[1] + this.margin().top];
            this.dispatch.tooltipShow(e);
        }.bind(this))
        .on('elementMouseout.tooltip', function(e) {
            this.dispatch.tooltipHide(e);
        }.bind(this));

    this.historicalBar
        .dispatch.on('elementMouseover.tooltip', function(e) {
            e.pos = [e.pos[0] + this.margin().left, e.pos[1] + this.margin().top];
            this.dispatch.tooltipShow(e);
        }.bind(this))
        .on('elementMouseout.tooltip', function(e) {
            this.dispatch.tooltipHide(e);
        }.bind(this));

};

LinePlusBarChart.prototype.x = function(_) {
    if (!arguments.length) return this.xScale();
    this.xScale(_);
    this.line.x(_);
    this.historicalBar.x(_);
    return this;
};

LinePlusBarChart.prototype.color = function(_) {
    if (!arguments.length) return this._color();
    this._color( nv.utils.getColor(_) );
    this.legend.color(_);
    return this;
};

LinePlusBarChart.prototype.tooltipContent = function(_) {
    if (!arguments.length) return this.tooltip();
    this.tooltip(_);
    return this;
};

nv.models.linePlusBarChart = function() {
    "use strict";

    var linePlusBarChart = new LinePlusBarChart();

    function chart(selection) {
        linePlusBarChart.render(selection);
        return chart;
    }
    chart.dispatch = linePlusBarChart.dispatch;
    chart.legend = linePlusBarChart.legend;
    chart.line = linePlusBarChart.line;
    chart.bars = linePlusBarChart.historicalBar;
    chart.y1Axis = linePlusBarChart.y1Axis();
    chart.y2Axis = linePlusBarChart.y2Axis();

    d3.rebind(chart, linePlusBarChart.line, 'defined', 'size', 'clipVoronoi', 'interpolate');
    d3.rebind(chart, linePlusBarChart.historicalBar, 'forceY');

    chart.options = nv.utils.optionsFunc.bind(chart);

    nv.utils.rebindp(chart, linePlusBarChart, LinePlusBarChart.prototype,
        'x', 'margin', 'width', 'height', 'color', 'showLegend', 'tooltips', 'tooltipContent', 'state',
        'defaultState', 'noData', 'xAxis'
    );

    return chart;
};
var LinePlusBarWithFocusChartPrivates = {
    finderHeight: 100
    , _color: nv.utils.defaultColor()
    , extent: null
    , brushExtent : null
    , tooltips : true
    , xScale: null
    , yScale: null
    , x2Scale: null
    , y1Scale: null
    , y2Scale: null
    , y3Scale: null
    , y4Scale: null
    , _x: function(d){return d.x}
    , _y: function(d){return d.y}
    , transitionDuration: 0
};

function LinePlusBarWithFocusChart(options){
    options = nv.utils.extend({}, options, LinePlusBarWithFocusChartPrivates, {
        margin: {top: 30, right: 30, bottom: 30, left: 60}
        , chartClass: 'linePlusBar'
        , wrapClass: ''
        , margin2: {top: 0, right: 30, bottom: 20, left: 60}
    });
    Chart.call(this, options, ['brush']);

    this.line = this.getLine();
    this.line2 = this.getLine();
    this.bars = this.getHistoricalBar();
    this.bars2 = this.getHistoricalBar();

    this.x2Axis = this.getAxis();
    this.y1Axis = this.getAxis();
    this.y2Axis = this.getAxis();
    this.y3Axis = this.getAxis();
    this.y4Axis = this.getAxis();
    this.legend = this.getLegend();
    this.brush = d3.svg.brush();

    this.line
        .clipEdge(true)
    ;
    this.line2
        .interactive(false)
    ;
    this.xAxis()
        .orient('bottom')
        .tickPadding(5)
    ;
    this.y1Axis
        .orient('left')
    ;
    this.y2Axis
        .orient('right')
    ;
    this.x2Axis
        .orient('bottom')
        .tickPadding(5)
    ;
    this.y3Axis
        .orient('left')
    ;
    this.y4Axis
        .orient('right')
    ;

    var that = this;
    this.showTooltip = function(e, offsetElement) {
        if (that.extent())
            e.pointIndex += Math.ceil(that.extent()[0]);
        var left = e.pos[0] + ( offsetElement.offsetLeft || 0 ),
            top = e.pos[1] + ( offsetElement.offsetTop || 0),
            x = that.xAxis().tickFormat()(that.line.x()(e.point, e.pointIndex)),
            y = (e.series.bar ? that.y1Axis : that.y2Axis).tickFormat()(that.line.y()(e.point, e.pointIndex)),
            content = that.tooltip()(e.series.key, x, y);

        nv.tooltip.show([left, top], content, e.value < 0 ? 'n' : 's', null, offsetElement);
    };
}

nv.utils.create(LinePlusBarWithFocusChart, Chart, LinePlusBarWithFocusChartPrivates);

LinePlusBarWithFocusChart.prototype.getLine = function(){
    return nv.models.line();
};

LinePlusBarWithFocusChart.prototype.getHistoricalBar = function(){
    return nv.models.historicalBar();
};

LinePlusBarWithFocusChart.prototype.getAxis = function(){
    return nv.models.axis();
};
LinePlusBarWithFocusChart.prototype.getLegend = function(){
    return nv.models.legend();
};

LinePlusBarWithFocusChart.prototype.wrapper = function (data) {
    Chart.prototype.wrapper.call(this, data, ['']);
};

LinePlusBarWithFocusChart.prototype.draw = function(data){

    var that = this
        , availableWidth = this.available.width
        , availableHeight1 = this.available.height - this.finderHeight()
        , availableHeight2 = this.finderHeight() - this.options.margin2.top - this.options.margin2.bottom;

    //------------------------------------------------------------
    // Setup Scales

    var dataBars = data.filter(function(d) { return !d.disabled && d.bar });
    var dataLines = data.filter(function(d) { return !d.bar }); // removed the !d.disabled clause here to fix Issue #240

    this.xScale( this.bars.xScale() );
    this.yScale( this.bars.xScale() );
    this.x2Scale( this.x2Axis.scale() );
    this.y1Scale( this.bars.yScale() );
    this.y2Scale( this.line.yScale() );
    this.y3Scale( this.bars2.yScale() );
    this.y4Scale( this.line2.yScale() );

    var series1 = data
        .filter(function(d) { return !d.disabled && d.bar })
        .map(function(d) {
            return d.values.map(function(d,i) {
                return { x: that._x()(d,i), y: that._y()(d,i) }
            })
        });

    var series2 = data
        .filter(function(d) { return !d.disabled && !d.bar })
        .map(function(d) {
            return d.values.map(function(d,i) {
                return { x: that._x()(d,i), y: that._y()(d,i) }
            })
        });

    this.xScale().range([0, availableWidth]);

    this.x2Scale()
        .domain( d3.extent(d3.merge(series1.concat(series2)),function(d){return d.x}) )
        .range([0, availableWidth] );

    //------------------------------------------------------------

    //------------------------------------------------------------
    // Setup containers and skeleton of chart

    var focusEnter = this.gEnter.append('g').attr('class', 'nv-focus');
    focusEnter.append('g').attr('class', 'nv-x nv-axis');
    focusEnter.append('g').attr('class', 'nv-y1 nv-axis');
    focusEnter.append('g').attr('class', 'nv-y2 nv-axis');
    focusEnter.append('g').attr('class', 'nv-barsWrap');
    focusEnter.append('g').attr('class', 'nv-linesWrap');

    var contextEnter = this.gEnter.append('g').attr('class', 'nv-context');
    contextEnter.append('g').attr('class', 'nv-x nv-axis');
    contextEnter.append('g').attr('class', 'nv-y1 nv-axis');
    contextEnter.append('g').attr('class', 'nv-y2 nv-axis');
    contextEnter.append('g').attr('class', 'nv-barsWrap');
    contextEnter.append('g').attr('class', 'nv-linesWrap');
    contextEnter.append('g').attr('class', 'nv-brushBackground');
    contextEnter.append('g').attr('class', 'nv-x nv-brush');

    //------------------------------------------------------------

    //------------------------------------------------------------
    // Context Components

    this.bars2
        .width(availableWidth)
        .height(availableHeight2)
        .color(
            data.map(function(d,i) {return d.color || that._color(d, i);})
                .filter(function(d,i) { return !data[i].disabled && data[i].bar })
        );

    this.line2
        .width(availableWidth)
        .height(availableHeight2)
        .color(
            data.map(function(d,i) { return d.color || that._color(d, i) })
                .filter(function(d,i) { return !data[i].disabled && !data[i].bar })
        );

    var bars2Wrap = this.g.select('.nv-context .nv-barsWrap')
        .datum(dataBars.length ? dataBars : [{values:[]}]);

    var lines2Wrap = this.g.select('.nv-context .nv-linesWrap')
        .datum(!dataLines[0].disabled ? dataLines : [{values:[]}]);

    this.g.select('.nv-context')
        .attr('transform', 'translate(0,' + ( availableHeight1 + this.margin().bottom + this.options.margin2.top) + ')');

    bars2Wrap.transition().call(this.bars2);
    lines2Wrap.transition().call(this.line2);

    //------------------------------------------------------------

    //------------------------------------------------------------
    // Setup Brush

    this.brush
        .x(this.x2Scale())
        .on('brush', onBrush);

    if (this.brushExtent()) this.brush.extent(this.brushExtent());

    var brushBG = this.g.select('.nv-brushBackground').selectAll('g')
        .data([this.brushExtent() || this.brush.extent()]);

    var brushBGenter = brushBG.enter()
        .append('g');

    brushBGenter.append('rect')
        .attr('class', 'left')
        .attr('x', 0)
        .attr('y', 0)
        .attr('height', availableHeight2);

    brushBGenter.append('rect')
        .attr('class', 'right')
        .attr('x', 0)
        .attr('y', 0)
        .attr('height', availableHeight2);

    var gBrush = this.g.select('.nv-x.nv-brush')
        .call(this.brush);
    gBrush.selectAll('rect')
        //.attr('y', -5)
        .attr('height', availableHeight2);
    gBrush.selectAll('.resize').append('path').attr('d', resizePath);

    //------------------------------------------------------------

    //------------------------------------------------------------
    // Setup Secondary (Context) Axes

    this.x2Axis
        .ticks( availableWidth / 100 )
        .tickSize(-availableHeight2, 0);

    this.g.select('.nv-context .nv-x.nv-axis')
        .attr('transform', 'translate(0,' + this.y3Scale().range()[0] + ')');
    this.g.select('.nv-context .nv-x.nv-axis').transition()
        .call(this.x2Axis);

    this.y3Axis
        .scale(this.y3Scale())
        .ticks( availableHeight2 / 36 )
        .tickSize( -availableWidth, 0);

    this.g.select('.nv-context .nv-y1.nv-axis')
        .style('opacity', dataBars.length ? 1 : 0)
        .attr('transform', 'translate(0,' + this.x2Scale().range()[0] + ')');

    this.g.select('.nv-context .nv-y1.nv-axis').transition()
        .call(this.y3Axis);

    this.y4Axis
        .scale(this.y4Scale())
        .ticks( availableHeight2 / 36 )
        .tickSize(dataBars.length ? 0 : -availableWidth, 0); // Show the y2 rules only if y1 has none

    this.g.select('.nv-context .nv-y2.nv-axis')
        .style('opacity', dataLines.length ? 1 : 0)
        .attr('transform', 'translate(' + this.x2Scale().range()[1] + ',0)');

    this.g.select('.nv-context .nv-y2.nv-axis').transition()
        .call(this.y4Axis);

    //============================================================
    // Functions
    //------------------------------------------------------------

    // Taken from crossfilter (http://square.github.com/crossfilter/)
    function resizePath(d) {
        var e = +(d == 'e'),
            x = e ? 1 : -1,
            y = availableHeight2 / 3;
        return 'M' + (.5 * x) + ',' + y
            + 'A6,6 0 0 ' + e + ' ' + (6.5 * x) + ',' + (y + 6)
            + 'V' + (2 * y - 6)
            + 'A6,6 0 0 ' + e + ' ' + (.5 * x) + ',' + (2 * y)
            + 'Z'
            + 'M' + (2.5 * x) + ',' + (y + 8)
            + 'V' + (2 * y - 8)
            + 'M' + (4.5 * x) + ',' + (y + 8)
            + 'V' + (2 * y - 8);
    }

    function updateBrushBG() {
        if (!that.brush.empty()) that.brush.extent(that.brushExtent());
        brushBG
            .data([that.brush.empty() ? that.x2Scale().domain() : that.brushExtent()])
            .each(function(d) {
                var leftWidth = that.x2Scale()(d[0]) - that.x2Scale().range()[0],
                    rightWidth = that.x2Scale().range()[1] - that.x2Scale()(d[1]);
                d3.select(this).select('.left')
                    .attr('width',  leftWidth < 0 ? 0 : leftWidth);
                d3.select(this).select('.right')
                    .attr('x', that.x2Scale()(d[1]))
                    .attr('width', rightWidth < 0 ? 0 : rightWidth);
            });
    }

    function onBrush() {
        that.brushExtent(that.brush.empty() ? null : that.brush.extent());
        that.extent(that.brush.empty() ? that.x2Scale().domain() : that.brush.extent());
        that.dispatch.brush({extent: that.extent(), brush: that.brush});
        updateBrushBG();

        //------------------------------------------------------------
        // Prepare Main (Focus) Bars and Lines

        that.bars
            .width(availableWidth)
            .height(availableHeight1)
            .color(
                data.map(function(d,i) { return d.color || that._color(d, i) })
                    .filter(function(d,i) { return !data[i].disabled && data[i].bar })
            );

        that.line
            .width(availableWidth)
            .height(availableHeight1)
            .color(
                data.map(function(d,i) { return d.color || that._color(d, i) })
                    .filter(function(d,i) { return !data[i].disabled && !data[i].bar })
            );

        var focusBarsWrap = that.g.select('.nv-focus .nv-barsWrap')
            .datum(!dataBars.length ? [{values:[]}] :
                dataBars
                    .map(function(d) {
                        return {
                            key: d.key,
                            values: d.values.filter(function(d,i) {
                                return that.bars.x()(d,i) >= that.extent[0] && that.bars.x()(d,i) <= that.extent()[1];
                            })
                        }
                    })
            );

        var focusLinesWrap = that.g.select('.nv-focus .nv-linesWrap')
            .datum(dataLines[0].disabled ? [{values:[]}] :
                dataLines
                    .map(function(d) {
                        return {
                            key: d.key,
                            values: d.values.filter(function(d,i) {
                                return that.line.x()(d,i) >= that.extent()[0] && that.line.x()(d,i) <= that.extent()[1];
                            })
                        }
                    })
            );

        //------------------------------------------------------------


        //------------------------------------------------------------
        // Update Main (Focus) X Axis

        if (dataBars.length)
            that.xScale(that.bars.xScale());
        else
            that.xScale(that.line.xScale());

        that.xAxis()
            .scale(that.xScale())
            .ticks( availableWidth / 100 )
            .tickSize(-availableHeight1, 0);

        that.xAxis()
            .domain([Math.ceil(that.extent()[0]), Math.floor(that.extent()[1])]);

        that.g.select('.nv-x.nv-axis').transition().duration(that.transitionDuration())
            .call(that.xAxis());
        //------------------------------------------------------------


        //------------------------------------------------------------
        // Update Main (Focus) Bars and Lines

        focusBarsWrap.transition().duration(that.transitionDuration()).call(that.bars);
        focusLinesWrap.transition().duration(that.transitionDuration()).call(that.line);

        //------------------------------------------------------------


        //------------------------------------------------------------
        // Setup and Update Main (Focus) Y Axes

        that.g.select('.nv-focus .nv-x.nv-axis')
            .attr('transform', 'translate(0,' + that.y1Scale().range()[0] + ')');

        that.y1Axis
            .scale(that.y1Scale())
            .ticks( availableHeight1 / 36 )
            .tickSize(-availableWidth, 0);

        that.g.select('.nv-focus .nv-y1.nv-axis')
            .style('opacity', dataBars.length ? 1 : 0);

        that.y2Axis
            .scale(that.y2Scale())
            .ticks( availableHeight1 / 36 )
            .tickSize(dataBars.length ? 0 : -availableWidth, 0); // Show the y2 rules only if y1 has none

        that.g.select('.nv-focus .nv-y2.nv-axis')
            .style('opacity', dataLines.length ? 1 : 0)
            .attr('transform', 'translate(' + that.xScale().range()[1] + ',0)');

        that.g.select('.nv-focus .nv-y1.nv-axis').transition().duration(that.transitionDuration())
            .call(that.y1Axis);
        that.g.select('.nv-focus .nv-y2.nv-axis').transition().duration(that.transitionDuration())
            .call(that.y2Axis);
    }

    Chart.prototype.draw.call(this, data);

    onBrush();

};

LinePlusBarWithFocusChart.prototype.attachEvents = function(){
    Chart.prototype.attachEvents.call(this);
    this.line.dispatch
        .on('elementMouseover.tooltip', function(e) {
            e.pos = [e.pos[0] +  this.margin().left, e.pos[1] + this.margin().top];
            this.dispatch.tooltipShow(e);
        }.bind(this))
        .on('elementMouseout.tooltip', function(e) {
            this.dispatch.tooltipHide(e);
        }.bind(this));

    this.bars.dispatch
        .on('elementMouseover.tooltip', function(e) {
            e.pos = [e.pos[0] + this.margin().left, e.pos[1] + this.margin().top];
            this.dispatch.tooltipShow(e);
        }.bind(this))
        .on('elementMouseout.tooltip', function(e) {
            this.dispatch.tooltipHide(e);
        }.bind(this));

    this.legend.dispatch.on('stateChange', function(newState) {
        this.update();
    }.bind(this));

    this.dispatch.on('tooltipShow', function(e) {
        if (this.tooltips()) this.showTooltip(e, this.svg[0][0].parentNode);
    }.bind(this));

};

LinePlusBarWithFocusChart.prototype.x = function(_) {
    if (!arguments.length) return this._x();
    this._x(_);
    this.line.x(_);
    this.bars.x(_);
    return this;
};

LinePlusBarWithFocusChart.prototype.y = function(_) {
    if (!arguments.length) return this._y();
    this._y(_);
    this.line.y(_);
    this.bars.y(_);
    return this;
};

LinePlusBarWithFocusChart.prototype.color = function(_) {
    if (!arguments.length) return this._color();
    this._color( nv.utils.getColor(_) );
    this.legend.color( _ );
    return this;
};

LinePlusBarWithFocusChart.prototype.tooltipContent = function(_) {
    if (!arguments.length) return this.tooltip();
    this.tooltip(_);
    return this;
};

/**
 * The linePlusBarWithFocusChart model returns a function wrapping an instance of a LinePlusBarWithFocusChart.
 */
nv.models.linePlusBarWithFocusChart = function() {
    "use strict";

    var linePlusBarWithFocusChart = new LinePlusBarWithFocusChart();

    function chart(selection) {
        linePlusBarWithFocusChart.render(selection);
        return chart;
    }

    chart.dispatch = linePlusBarWithFocusChart.dispatch;
    chart.legend = linePlusBarWithFocusChart.legend;
    chart.lines = linePlusBarWithFocusChart.line;
    chart.lines2 = linePlusBarWithFocusChart.line2;
    chart.bars = linePlusBarWithFocusChart.bars;
    chart.bars2 = linePlusBarWithFocusChart.bars2;
    chart.xAxis = linePlusBarWithFocusChart.xAxis;
    chart.x2Axis = linePlusBarWithFocusChart.x2Axis;
    chart.y1Axis = linePlusBarWithFocusChart.y1Axis;
    chart.y2Axis = linePlusBarWithFocusChart.y2Axis;
    chart.y3Axis = linePlusBarWithFocusChart.y3Axis;
    chart.y4Axis = linePlusBarWithFocusChart.y4Axis;

    //d3.rebind(chart, linePlusBarWithFocusChart.historicalBar, '');

    d3.rebind(chart, linePlusBarWithFocusChart.line, 'defined', 'size', 'clipVoronoi', 'interpolate');
    //TODO: consider rebinding x, y and some other stuff, and simply do something like bars.x(lines.x()), etc.
    //d3.rebind(chart, lines, 'x', 'y', 'size', 'xDomain', 'yDomain', 'xRange', 'yRange', 'forceX', 'forceY', 'interactive', 'clipEdge', 'clipVoronoi', 'id');

    chart.options = nv.utils.optionsFunc.bind(chart);

    nv.utils.rebindp(chart, linePlusBarWithFocusChart, LinePlusBarWithFocusChart.prototype,
        'x', 'y', 'margin', 'width', 'height', 'color', 'showLegend', 'tooltips', 'tooltipContent', 'noData',
        'brushExtent', 'finderHeight', 'xAxis', 'yScale'
    );

    return chart;
};

nv.models.lineFisheye = function() {
  "use strict";
  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var Layer = new Layer({
        margin: {top: 0, right: 0, bottom: 0, left: 0}
        , width : 960
        , height : 500
        , chartClass : 'line'
        , wrapClass : 'scatterWrap'
      })
      , color = nv.utils.defaultColor() // function that returns colors
      , id = Math.floor(Math.random() * 10000) //Create semi-unique ID incase user doesn't select one
      , getX = function(d) { return d.x } // accessor to get the x value from a data point
      , getY = function(d) { return d.y } // accessor to get the y value from a data point
      , clipEdge = false // if true, masks lines within x and y scale
      , interpolate = "linear" // controls the line interpolation
      , scatter = nv.models.scatter()
          .id(id)
          .size(16) // default size
          .sizeDomain([16,256]), //set to speed up calculation, needs to be unset if there is a custom size accessor
      x, y,
      x0, y0;

  function chart(selection) {
    selection.each(function(data) {

      Layer.setRoot(this);

      var availableWidth = Layer.available.width,
          availableHeight = Layer.available.height;

      //get the scales inscase scatter scale was set manually
      x = x || scatter.xScale();
      y = y || scatter.yScale();

      //store old scales if they exist
      x0 = x0 || x;
      y0 = y0 || y;

      Layer.wrapChart(data);
      var scatterWrap = Layer.wrap.select('.nv-scatterWrap').datum(data);
      Layer.gEnter.append('g').attr('class', 'nv-groups');

      scatter.width(availableWidth).height(availableHeight);

      d3.transition(scatterWrap).call(scatter);

      Layer.defsEnter.append('clipPath')
        .attr('id', 'nv-edge-clip-' + id)
        .append('rect');

      Layer.wrap.select('#nv-edge-clip-' + id + ' rect')
          .attr('width', availableWidth)
          .attr('height', availableHeight);

      Layer.g.attr('clip-path', clipEdge ? 'url(#nv-edge-clip-' + id + ')' : '');
      scatterWrap.attr('clip-path', clipEdge ? 'url(#nv-edge-clip-' + id + ')' : '');

      var groups = Layer.wrap.select('.nv-groups').selectAll('.nv-group')
          .data(function(d) { return d }, function(d) { return d.key });
      groups.enter().append('g')
          .style('stroke-opacity', 1e-6)
          .style('fill-opacity', 1e-6);
      d3.transition(groups.exit())
          .style('stroke-opacity', 1e-6)
          .style('fill-opacity', 1e-6)
          .remove();
      groups
          .attr('class', function(d,i) { return 'nv-group nv-series-' + i })
          .classed('hover', function(d) { return d.hover })
          .style('fill', function(d,i){ return color(d, i) })
          .style('stroke', function(d,i){ return color(d, i) });
      d3.transition(groups)
          .style('stroke-opacity', 1)
          .style('fill-opacity', .5);

      var paths = groups.selectAll('path')
          .data(function(d) { return [d.values] });
      paths.enter().append('path')
          .attr('class', 'nv-line')
          .attr('d', d3.svg.line()
            .interpolate(interpolate)
            .x(function(d,i) { return x0(getX(d,i)) })
            .y(function(d,i) { return y0(getY(d,i)) })
          );
      d3.transition(groups.exit().selectAll('path'))
          .attr('d', d3.svg.line()
            .interpolate(interpolate)
            .x(function(d,i) { return x(getX(d,i)) })
            .y(function(d,i) { return y(getY(d,i)) })
          )
          .remove(); // redundant? line is already being removed
      d3.transition(paths)
          .attr('d', d3.svg.line()
            .interpolate(interpolate)
            .x(function(d,i) { return x(getX(d,i)) })
            .y(function(d,i) { return y(getY(d,i)) })
          );

      //store old scales for use in transitions on update, to animate from old to new positions
      x0 = x.copy();
      y0 = y.copy();

    });

    return chart;
  }

  chart.dispatch = scatter.dispatch;

  d3.rebind(chart, scatter, 'interactive', 'size', 'xScale', 'yScale', 'zScale', 'xDomain', 'yDomain', 'xRange',
      'yRange', 'sizeDomain', 'forceX', 'forceY', 'forceSize', 'clipVoronoi', 'clipRadius');

  chart.options = nv.utils.optionsFunc.bind(chart);

  chart.margin = function(_) {
    if (!arguments.length) return Layer.margin;
      Layer.margin.top    = nv.utils.valueOrDefault(_.top, Layer.margin.top);
      Layer.margin.right  = nv.utils.valueOrDefault(_.right, Layer.margin.right);
      Layer.margin.bottom = nv.utils.valueOrDefault(_.bottom, Layer.margin.bottom);
      Layer.margin.left   = nv.utils.valueOrDefault(_.left, Layer.margin.left);
    return chart;
  };

  chart.width = function(_) {
    if (!arguments.length) return Layer.options.size.width;
    Layer.options.size.width = _;
    return chart;
  };

  chart.height = function(_) {
    if (!arguments.length) return Layer.options.size.height;
    Layer.options.size.height = _;
    return chart;
  };

  chart.x = function(_) {
    if (!arguments.length) return getX;
    getX = _;
    scatter.x(_);
    return chart;
  };

  chart.y = function(_) {
    if (!arguments.length) return getY;
    getY = _;
    scatter.y(_);
    return chart;
  };

  chart.clipEdge = function(_) {
    if (!arguments.length) return clipEdge;
    clipEdge = _;
    return chart;
  };

  chart.color = function(_) {
    if (!arguments.length) return color;
    color = nv.utils.getColor(_);
    scatter.color(color);
    return chart;
  };

  chart.id = function(_) {
    if (!arguments.length) return id;
    id = _;
    return chart;
  };

  chart.interpolate = function(_) {
    if (!arguments.length) return interpolate;
    interpolate = _;
    return chart;
  };

  return chart;
};

nv.models.lineChartFisheye = function() {
  "use strict";
  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var Layer = new Layer({
        margin: {top: 30, right: 20, bottom: 50, left: 60}
        , chartClass: 'lineChart'
      })
      , color = nv.utils.defaultColor()
      , showControls = true
      , fisheye = 0
      , pauseFisheye = false
      , tooltips = true
      , tooltip = function(key, x, y) {
          return '<h3>' + key + '</h3>' +
                 '<p>' +  y + ' at ' + x + '</p>'
        }
      , lines = nv.models.lineFisheye().xScale(x)
      , xAxis = nv.models.axis().scale(x).orient('bottom').tickPadding(5)
      , yAxis = nv.models.axis().scale(y).orient('left')
      , legend = nv.models.legend().height(30)
      , controls = nv.models.legend().height(30).updateState(false)
      , x = d3.fisheye.scale(d3.scale.linear).distortion(0)
      , y = lines.yScale()
      , dispatch = d3.dispatch('tooltipShow', 'tooltipHide');

  //============================================================
  // Private Variables
  //------------------------------------------------------------
  var showTooltip = function(e, offsetElement) {
      var left = e.pos[0] + ( offsetElement.offsetLeft || 0 ),
        top = e.pos[1] + ( offsetElement.offsetTop || 0),
        x = xAxis.tickFormat()(lines.x()(e.point, e.pointIndex)),
        y = yAxis.tickFormat()(lines.y()(e.point, e.pointIndex)),
        content = tooltip(e.series.key, x, y);

        nv.tooltip.show([left, top], content, null, null, offsetElement);
      },
    controlsData = [ { key: 'Magnify', disabled: true } ];

  function chart(selection) {
    selection.each(function(data) {

      Layer.setRoot(this);
      if (Layer.noData(data))
        return chart;

      var that = this
          , availableWidth = Layer.available.width
          , availableHeight = Layer.available.height;

      chart.update = function() { Layer.svg.transition().call(chart) };
      chart.container = this; // I need a reference to the container in order to have outside code check if the chart is visible or not

      Layer.wrapChart(data);

      Layer.gEnter.append('rect')
          .attr('class', 'nvd3 nv-background')
          .attr('width', availableWidth)
          .attr('height', availableHeight);

        Layer.gEnter.append('g').attr('class', 'nv-x nv-axis');
        Layer.gEnter.append('g').attr('class', 'nv-y nv-axis');
        Layer.gEnter.append('g').attr('class', 'nv-linesWrap');
        Layer.gEnter.append('g').attr('class', 'nv-legendWrap');
        Layer.gEnter.append('g').attr('class', 'nv-controlsWrap');
        Layer.gEnter.append('g').attr('class', 'nv-controlsWrap');

      var g = Layer.wrap.select('g');

      if (Layer.options.showLegend) {
        legend.width(availableWidth);
        g.select('.nv-legendWrap').datum(data).call(legend);
        if ( Layer.margin.top != legend.height()) {
          Layer.margin.top = legend.height();
          availableHeight = (Layer.options.size.height || parseInt(Layer.svg.style('height')) || 400)
                             - Layer.margin.top - Layer.margin.bottom;
        }
        g.select('.nv-legendWrap').attr('transform', 'translate(0,' + (-Layer.margin.top) +')')
      }
      if (showControls) {
        controls.width(180).color(['#444']);
        g.select('.nv-controlsWrap')
            .datum(controlsData)
            .attr('transform', 'translate(0,' + (-Layer.margin.top) +')')
            .call(controls);
      }
      lines
        .width(availableWidth)
        .height(availableHeight)
        .color(
              data
                  .map(function(d,i) { return d.color || color(d, i) })
                  .filter(function(d,i) { return !data[i].disabled })
          );
      var linesWrap = g.select('.nv-linesWrap')
          .datum(data.filter(function(d) { return !d.disabled }));
      d3.transition(linesWrap).call(lines);
      xAxis
        //.scale(x)
        .ticks( availableWidth / 100 )
        .tickSize(-availableHeight, 0);
      g.select('.nv-x.nv-axis')
          .attr('transform', 'translate(0,' + y.range()[0] + ')');
      d3.transition(g.select('.nv-x.nv-axis'))
          .call(xAxis);
      yAxis
        //.scale(y)
        .ticks( availableHeight / 36 )
        .tickSize( -availableWidth, 0);
      d3.transition(g.select('.nv-y.nv-axis'))
          .call(yAxis);
      g.select('.nv-background')
          .on('mousemove', updateFisheye)
          .on('click', function() { pauseFisheye = !pauseFisheye; });

      function updateFisheye() {
        if (pauseFisheye) {
          //g.select('.background') .style('pointer-events', 'none');
          g.select('.nv-point-paths').style('pointer-events', 'all');
          return false;
        }

        g.select('.nv-background').style('pointer-events', 'all');
        g.select('.nv-point-paths').style('pointer-events', 'none' );

        var mouse = d3.mouse(this);
        linesWrap.call(lines);
        g.select('.nv-x.nv-axis').call(xAxis);
        x.distortion(fisheye).focus(mouse[0]);
      }

      controls.dispatch.on('legendClick', function(d) {
        d.disabled = !d.disabled;

        fisheye = d.disabled ? 0 : 5;
        g.select('.nv-background') .style('pointer-events', d.disabled ? 'none' : 'all');
        g.select('.nv-point-paths').style('pointer-events', d.disabled ? 'all' : 'none' );

        if (d.disabled) {
          x.distortion(fisheye).focus(0);
          linesWrap.call(lines);
          g.select('.nv-x.nv-axis').call(xAxis);
        } else
          pauseFisheye = false;
        chart.update();
      });

      legend.dispatch
        .on('stateChange', function(newState) {
          chart.update();
        })
        .on('elementMouseover.tooltip', function(e) {
          e.pos = [e.pos[0] +  Layer.margin.left, e.pos[1] + Layer.margin.top];
          dispatch.tooltipShow(e);
        });
      if (tooltips)
          dispatch.on('tooltipShow', function(e) { showTooltip(e, that.parentNode) } ); // TODO: maybe merge with above?
      lines.dispatch.on('elementMouseout.tooltip', function(e) {
        dispatch.tooltipHide(e);
      });
      if (tooltips) dispatch.on('tooltipHide', nv.tooltip.cleanup);
    });

    return chart;
  }

  chart.dispatch = dispatch;
  chart.legend = legend;
  chart.xAxis = xAxis;
  chart.yAxis = yAxis;

  d3.rebind(chart, lines, 'defined', 'x', 'y', 'size', 'xDomain', 'yDomain', 'xRange', 'yRange', 'forceX', 'forceY',
      'interactive', 'clipEdge', 'clipVoronoi', 'id', 'interpolate');

  chart.options = nv.utils.optionsFunc.bind(chart);

  chart.margin = function(_) {
    if (!arguments.length) return Layer.margin;
      Layer.margin.top    = nv.utils.valueOrDefault(_.top, Layer.margin.top);
      Layer.margin.right  = nv.utils.valueOrDefault(_.right, Layer.margin.right);
      Layer.margin.bottom = nv.utils.valueOrDefault(_.bottom, Layer.margin.bottom);
      Layer.margin.left   = nv.utils.valueOrDefault(_.left, Layer.margin.left);
    return chart;
  };

  chart.width = function(_) {
    if (!arguments.length) return Layer.options.size.width;
    Layer.options.size.width = _;
    return chart;
  };

  chart.height = function(_) {
    if (!arguments.length) return Layer.options.size.height;
    Layer.options.size.height = _;
    return chart;
  };

  chart.color = function(_) {
    if (!arguments.length) return color;
    color = nv.utils.getColor(_);
    legend.color(color);
    return chart;
  };

  chart.showLegend = function(_) {
    if (!arguments.length) return Layer.options.showLegend;
    Layer.options.showLegend = _;
    return chart;
  };

  chart.tooltips = function(_) {
    if (!arguments.length) return tooltips;
    tooltips = _;
    return chart;
  };

  chart.tooltipContent = function(_) {
    if (!arguments.length) return tooltip;
    tooltip = _;
    return chart;
  };

  chart.noData = function(_) {
    if (!arguments.length) return Layer.options.noData;
    Layer.options.noData = _;
    return chart;
  };

  return chart;
};
nv.models.lineWithFocusChart = function() {
  "use strict";
  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var lines = nv.models.line()
    , lines2 = nv.models.line()
    , xAxis = nv.models.axis()
    , yAxis = nv.models.axis()
    , x2Axis = nv.models.axis()
    , y2Axis = nv.models.axis()
    , legend = nv.models.legend()
    , brush = d3.svg.brush()
    ;

  var Layer = new Layer({
        chartClass: 'lineWithFocusChart',
        margin: {top: 30, right: 30, bottom: 30, left: 60}
      })
    , margin2 = {top: 0, right: 30, bottom: 20, left: 60}
    , color = nv.utils.defaultColor()
    , height2 = 100
    , x
    , y
    , x2
    , y2
    , brushExtent = null
    , tooltips = true
    , tooltip = function(key, x, y) {
        return '<h3>' + key + '</h3>' +
               '<p>' +  y + ' at ' + x + '</p>'
      }
    , dispatch = d3.dispatch('tooltipShow', 'tooltipHide', 'brush')
    , transitionDuration = 250
    ;

  lines
    .clipEdge(true)
    ;
  lines2
    .interactive(false)
    ;
  xAxis
    .orient('bottom')
    .tickPadding(5)
    ;
  yAxis
    .orient('left')
    ;
  x2Axis
    .orient('bottom')
    .tickPadding(5)
    ;
  y2Axis
    .orient('left')
    ;
  //============================================================


  //============================================================
  // Private Variables
  //------------------------------------------------------------

  var showTooltip = function(e, offsetElement) {
    var left = e.pos[0] + ( offsetElement.offsetLeft || 0 ),
        top = e.pos[1] + ( offsetElement.offsetTop || 0),
        x = xAxis.tickFormat()(lines.x()(e.point, e.pointIndex)),
        y = yAxis.tickFormat()(lines.y()(e.point, e.pointIndex)),
        content = tooltip(e.series.key, x, y);

    nv.tooltip.show([left, top], content, null, null, offsetElement);
  };

  //============================================================

  function chart(selection) {
    selection.each(function(data) {

      Layer.setRoot(this);
      if(Layer.noData(data))
        return chart;

      var that = this
          , availableWidth = Layer.available.width
          , availableHeight1 = (Layer.options.size.height || parseInt(Layer.svg.style('height')) || 400) -
              Layer.margin.top - Layer.margin.bottom - height2
          , availableHeight2 = height2 - margin2.top - margin2.bottom;

      chart.update = function() { Layer.svg.transition().duration(transitionDuration).call(chart) };

      //------------------------------------------------------------
      // Setup Scales

      x = lines.xScale();
      y = lines.yScale();
      x2 = lines2.xScale();
      y2 = lines2.yScale();

      //------------------------------------------------------------

      //------------------------------------------------------------
      // Setup containers and skeleton of chart

      Layer.wrapChart(data);

      var focusEnter = Layer.gEnter.append('g').attr('class', 'nv-focus');
      focusEnter.append('g').attr('class', 'nv-x nv-axis');
      focusEnter.append('g').attr('class', 'nv-y nv-axis');
      focusEnter.append('g').attr('class', 'nv-linesWrap');

      var contextEnter = Layer.gEnter.append('g').attr('class', 'nv-context');
      contextEnter.append('g').attr('class', 'nv-x nv-axis');
      contextEnter.append('g').attr('class', 'nv-y nv-axis');
      contextEnter.append('g').attr('class', 'nv-linesWrap');
      contextEnter.append('g').attr('class', 'nv-brushBackground');
      contextEnter.append('g').attr('class', 'nv-x nv-brush');

      //------------------------------------------------------------

      //------------------------------------------------------------
      // Legend

      if (Layer.options.showLegend) {
        legend.width(availableWidth);
        Layer.g.select('.nv-legendWrap').datum(data).call(legend);
        if ( Layer.margin.top != legend.height()) {
          Layer.margin.top = legend.height();
          availableHeight1 = (Layer.options.size.height || parseInt(Layer.svg.style('height')) || 400)
              - Layer.margin.top - Layer.margin.bottom - height2;
        }
        Layer.g.select('.nv-legendWrap').attr('transform', 'translate(0,' + (-Layer.margin.top) +')')
      }

      //------------------------------------------------------------

      //------------------------------------------------------------
      // Main Chart Component(s)

      lines
        .width(availableWidth)
        .height(availableHeight1)
        .color(
          data
            .map(function(d,i) { return d.color || color(d, i) })
            .filter(function(d,i) { return !data[i].disabled })
        );

      lines2
        .defined(lines.defined())
        .width(availableWidth)
        .height(availableHeight2)
        .color(
          data
            .map(function(d,i) { return d.color || color(d, i) })
            .filter(function(d,i) { return !data[i].disabled })
        );

      Layer.g.select('.nv-context')
          .attr('transform', 'translate(0,' + ( availableHeight1 + Layer.margin.bottom + margin2.top) + ')');

      var contextLinesWrap = Layer.g.select('.nv-context .nv-linesWrap')
          .datum(data.filter(function(d) { return !d.disabled }));

      d3.transition(contextLinesWrap).call(lines2);

      //------------------------------------------------------------

      //------------------------------------------------------------
      // Setup Main (Focus) Axes

      xAxis
        .scale(x)
        .ticks( availableWidth / 100 )
        .tickSize(-availableHeight1, 0);

      yAxis
        .scale(y)
        .ticks( availableHeight1 / 36 )
        .tickSize( -availableWidth, 0);

      Layer.g.select('.nv-focus .nv-x.nv-axis')
        .attr('transform', 'translate(0,' + availableHeight1 + ')');

      //------------------------------------------------------------


      //------------------------------------------------------------
      // Setup Brush

      brush
        .x(x2)
        .on('brush', function() {
            //When brushing, turn off transitions because chart needs to change immediately.
            var oldTransition = chart.transitionDuration();
            chart.transitionDuration(0);
            onBrush();
            chart.transitionDuration(oldTransition);
        });

      if (brushExtent)
          brush.extent(brushExtent);

      var brushBG = Layer.g.select('.nv-brushBackground').selectAll('g')
          .data([brushExtent || brush.extent()]);

      var brushBGenter = brushBG.enter()
          .append('g');

      brushBGenter.append('rect')
          .attr('class', 'left')
          .attr('x', 0)
          .attr('y', 0)
          .attr('height', availableHeight2);

      brushBGenter.append('rect')
          .attr('class', 'right')
          .attr('x', 0)
          .attr('y', 0)
          .attr('height', availableHeight2);

      var gBrush = Layer.g.select('.nv-x.nv-brush')
          .call(brush);
      gBrush.selectAll('rect')
          //.attr('y', -5)
          .attr('height', availableHeight2);
      gBrush.selectAll('.resize').append('path').attr('d', resizePath);

      onBrush();

      //------------------------------------------------------------

      //------------------------------------------------------------
      // Setup Secondary (Context) Axes

      x2Axis
        .scale(x2)
        .ticks( availableWidth / 100 )
        .tickSize(-availableHeight2, 0);

      Layer.g.select('.nv-context .nv-x.nv-axis')
          .attr('transform', 'translate(0,' + y2.range()[0] + ')');
      d3.transition(Layer.g.select('.nv-context .nv-x.nv-axis'))
          .call(x2Axis);

      y2Axis
        .scale(y2)
        .ticks( availableHeight2 / 36 )
        .tickSize( -availableWidth, 0);

      d3.transition(Layer.g.select('.nv-context .nv-y.nv-axis'))
          .call(y2Axis);

      Layer.g.select('.nv-context .nv-x.nv-axis')
          .attr('transform', 'translate(0,' + y2.range()[0] + ')');

      //------------------------------------------------------------

      //============================================================
      // Event Handling/Dispatching (in chart's scope)
      //------------------------------------------------------------

      legend.dispatch.on('stateChange', function(newState) {
        chart.update();
      });

      dispatch.on('tooltipShow', function(e) {
        if (tooltips) showTooltip(e, that.parentNode);
      });

      //============================================================


      //============================================================
      // Functions
      //------------------------------------------------------------

      // Taken from crossfilter (http://square.github.com/crossfilter/)
      function resizePath(d) {
        var e = +(d == 'e'),
            x = e ? 1 : -1,
            y = availableHeight2 / 3;
        return 'M' + (.5 * x) + ',' + y
            + 'A6,6 0 0 ' + e + ' ' + (6.5 * x) + ',' + (y + 6)
            + 'V' + (2 * y - 6)
            + 'A6,6 0 0 ' + e + ' ' + (.5 * x) + ',' + (2 * y)
            + 'Z'
            + 'M' + (2.5 * x) + ',' + (y + 8)
            + 'V' + (2 * y - 8)
            + 'M' + (4.5 * x) + ',' + (y + 8)
            + 'V' + (2 * y - 8);
      }

      function updateBrushBG() {
        if (!brush.empty()) brush.extent(brushExtent);
        brushBG
            .data([brush.empty() ? x2.domain() : brushExtent])
            .each(function(d) {
              var leftWidth = x2(d[0]) - x.range()[0],
                  rightWidth = x.range()[1] - x2(d[1]);
              d3.select(this).select('.left')
                .attr('width',  leftWidth < 0 ? 0 : leftWidth);
              d3.select(this).select('.right')
                .attr('x', x2(d[1]))
                .attr('width', rightWidth < 0 ? 0 : rightWidth);
            });
      }

      function onBrush() {
        brushExtent = brush.empty() ? null : brush.extent();
        var extent = brush.empty() ? x2.domain() : brush.extent();

        //The brush extent cannot be less than one.  If it is, don't update the line chart.
        if (Math.abs(extent[0] - extent[1]) <= 1)
          return;

        dispatch.brush({extent: extent, brush: brush});

        updateBrushBG();

        // Update Main (Focus)
        var focusLinesWrap = Layer.g.select('.nv-focus .nv-linesWrap')
            .datum(
              data
                .filter(function(d) { return !d.disabled })
                .map(function(d) {
                  return {
                    key: d.key,
                    values: d.values.filter(function(d,i) {
                      return lines.x()(d,i) >= extent[0] && lines.x()(d,i) <= extent[1];
                    })
                  }
                })
            );
        focusLinesWrap.transition().duration(transitionDuration).call(lines);

        // Update Main (Focus) Axes
        Layer.g.select('.nv-focus .nv-x.nv-axis').transition().duration(transitionDuration).call(xAxis);
        Layer.g.select('.nv-focus .nv-y.nv-axis').transition().duration(transitionDuration).call(yAxis);
      }

      //============================================================

    });

    return chart;
  }


  //============================================================
  // Event Handling/Dispatching (out of chart's scope)
  //------------------------------------------------------------

  lines.dispatch.on('elementMouseover.tooltip', function(e) {
    e.pos = [e.pos[0] +  Layer.margin.left, e.pos[1] + Layer.margin.top];
    dispatch.tooltipShow(e);
  });

  lines.dispatch.on('elementMouseout.tooltip', function(e) {
    dispatch.tooltipHide(e);
  });

  dispatch.on('tooltipHide', function() {
    if (tooltips) nv.tooltip.cleanup();
  });

  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  // expose chart's sub-components
  chart.dispatch = dispatch;
  chart.legend = legend;
  chart.lines = lines;
  chart.lines2 = lines2;
  chart.xAxis = xAxis;
  chart.yAxis = yAxis;
  chart.x2Axis = x2Axis;
  chart.y2Axis = y2Axis;

  d3.rebind(chart, lines, 'defined', 'isArea', 'size', 'xDomain', 'yDomain', 'xRange', 'yRange', 'forceX', 'forceY',
      'interactive', 'clipEdge', 'clipVoronoi', 'id');

  chart.options = nv.utils.optionsFunc.bind(chart);

  chart.x = function(_) {
    if (!arguments.length) return lines.x;
    lines.x(_);
    lines2.x(_);
    return chart;
  };

  chart.y = function(_) {
    if (!arguments.length) return lines.y;
    lines.y(_);
    lines2.y(_);
    return chart;
  };

  chart.margin = function(_) {
    if (!arguments.length) return Layer.margin;
      Layer.margin.top    = nv.utils.valueOrDefault(_.top, Layer.margin.top);
      Layer.margin.right  = nv.utils.valueOrDefault(_.right, Layer.margin.right);
      Layer.margin.bottom = nv.utils.valueOrDefault(_.bottom, Layer.margin.bottom);
      Layer.margin.left   = nv.utils.valueOrDefault(_.left, Layer.margin.left);
    return chart;
  };

  chart.margin2 = function(_) {
    if (!arguments.length) return margin2;
    margin2 = _;
    return chart;
  };

  chart.width = function(_) {
    if (!arguments.length) return Layer.options.size.width;
    Layer.options.size.width = _;
    return chart;
  };

  chart.height = function(_) {
    if (!arguments.length) return Layer.options.size.height;
    Layer.options.size.height = _;
    return chart;
  };

  chart.height2 = function(_) {
    if (!arguments.length) return height2;
    height2 = _;
    return chart;
  };

  chart.color = function(_) {
    if (!arguments.length) return color;
    color = nv.utils.getColor(_);
    legend.color(color);
    return chart;
  };

  chart.showLegend = function(_) {
    if (!arguments.length) return Layer.options.showLegend;
    Layer.options.showLegend = _;
    return chart;
  };

  chart.tooltips = function(_) {
    if (!arguments.length) return tooltips;
    tooltips = _;
    return chart;
  };

  chart.tooltipContent = function(_) {
    if (!arguments.length) return tooltip;
    tooltip = _;
    return chart;
  };

  chart.interpolate = function(_) {
    if (!arguments.length) return lines.interpolate();
    lines.interpolate(_);
    lines2.interpolate(_);
    return chart;
  };

  chart.noData = function(_) {
    if (!arguments.length) return Layer.options.noData;
    Layer.options.noData = _;
    return chart;
  };

  // Chart has multiple similar Axes, to prevent code duplication, probably need to link all axis functions manually like below
  chart.xTickFormat = function(_) {
    if (!arguments.length) return xAxis.tickFormat();
    xAxis.tickFormat(_);
    x2Axis.tickFormat(_);
    return chart;
  };

  chart.yTickFormat = function(_) {
    if (!arguments.length) return yAxis.tickFormat();
    yAxis.tickFormat(_);
    y2Axis.tickFormat(_);
    return chart;
  };

  chart.brushExtent = function(_) {
    if (!arguments.length) return brushExtent;
    brushExtent = _;
    return chart;
  };

  chart.transitionDuration = function(_) {
    if (!arguments.length) return transitionDuration;
    transitionDuration = _;
    return chart;
  };

  //============================================================

  return chart;
};
nv.models.multiChart = function() {
  "use strict";
  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var margin = {top: 30, right: 20, bottom: 50, left: 60},
      color = d3.scale.category20().range(),
      width = null, 
      height = null,
      showLegend = true,
      tooltips = true,
      tooltip = function(key, x, y, e, graph) {
        return '<h3>' + key + '</h3>' +
               '<p>' +  y + ' at ' + x + '</p>'
      },
      x,
      y,
      yDomain1,
      yDomain2
      ; //can be accessed via chart.lines.[x/y]Scale()

  //============================================================
  // Private Variables
  //------------------------------------------------------------

  var x = d3.scale.linear(),
      yScale1 = d3.scale.linear(),
      yScale2 = d3.scale.linear(),

      lines1 = nv.models.line().yScale(yScale1),
      lines2 = nv.models.line().yScale(yScale2),

      bars1 = nv.models.multiBar().stacked(false).yScale(yScale1),
      bars2 = nv.models.multiBar().stacked(false).yScale(yScale2),

      stack1 = nv.models.stackedArea().yScale(yScale1),
      stack2 = nv.models.stackedArea().yScale(yScale2),

      xAxis = nv.models.axis().scale(x).orient('bottom').tickPadding(5),
      yAxis1 = nv.models.axis().scale(yScale1).orient('left'),
      yAxis2 = nv.models.axis().scale(yScale2).orient('right'),

      legend = nv.models.legend().height(30),
      dispatch = d3.dispatch('tooltipShow', 'tooltipHide');

  var showTooltip = function(e, offsetElement) {
    var left = e.pos[0] + ( offsetElement.offsetLeft || 0 ),
        top = e.pos[1] + ( offsetElement.offsetTop || 0),
        x = xAxis.tickFormat()(lines1.x()(e.point, e.pointIndex)),
        y = ((e.series.yAxis == 2) ? yAxis2 : yAxis1).tickFormat()(lines1.y()(e.point, e.pointIndex)),
        content = tooltip(e.series.key, x, y, e, chart);

    nv.tooltip.show([left, top], content, undefined, undefined, offsetElement.offsetParent);
  };

  function chart(selection) {
    selection.each(function(data) {
      var container = d3.select(this),
          that = this;

      chart.update = function() { container.transition().call(chart); };
      chart.container = this;

      var availableWidth = (width  || parseInt(container.style('width')) || 960)
                             - margin.left - margin.right,
          availableHeight = (height || parseInt(container.style('height')) || 400)
                             - margin.top - margin.bottom;

      var dataLines1 = data.filter(function(d) {return !d.disabled && d.type == 'line' && d.yAxis == 1});
      var dataLines2 = data.filter(function(d) {return !d.disabled && d.type == 'line' && d.yAxis == 2});
      var dataBars1 = data.filter(function(d) {return !d.disabled && d.type == 'bar' && d.yAxis == 1});
      var dataBars2 = data.filter(function(d) {return !d.disabled && d.type == 'bar' && d.yAxis == 2});
      var dataStack1 = data.filter(function(d) {return !d.disabled && d.type == 'area' && d.yAxis == 1});
      var dataStack2 = data.filter(function(d) {return !d.disabled && d.type == 'area' && d.yAxis == 2});

      var series1 = data.filter(function(d) {return !d.disabled && d.yAxis == 1})
            .map(function(d) {
              return d.values.map(function(d,i) {
                return { x: d.x, y: d.y }
              })
            });

      var series2 = data.filter(function(d) {return !d.disabled && d.yAxis == 2})
            .map(function(d) {
              return d.values.map(function(d,i) {
                return { x: d.x, y: d.y }
              })
            });

      x   .domain(d3.extent(d3.merge(series1.concat(series2)), function(d) { return d.x } ))
          .range([0, availableWidth]);

      var wrap = container.selectAll('g.wrap.multiChart').data([data]);
      var gEnter = wrap.enter().append('g').attr('class', 'wrap nvd3 multiChart').append('g');

      gEnter.append('g').attr('class', 'x axis');
      gEnter.append('g').attr('class', 'y1 axis');
      gEnter.append('g').attr('class', 'y2 axis');
      gEnter.append('g').attr('class', 'lines1Wrap');
      gEnter.append('g').attr('class', 'lines2Wrap');
      gEnter.append('g').attr('class', 'bars1Wrap');
      gEnter.append('g').attr('class', 'bars2Wrap');
      gEnter.append('g').attr('class', 'stack1Wrap');
      gEnter.append('g').attr('class', 'stack2Wrap');
      gEnter.append('g').attr('class', 'legendWrap');

      var g = wrap.select('g');

      if (showLegend) {
        legend.width( availableWidth / 2 );

        g.select('.legendWrap')
            .datum(data.map(function(series) { 
              series.originalKey = series.originalKey === undefined ? series.key : series.originalKey;
              series.key = series.originalKey + (series.yAxis == 1 ? '' : ' (right axis)');
              return series;
            }))
          .call(legend);

        if ( margin.top != legend.height()) {
          margin.top = legend.height();
          availableHeight = (height || parseInt(container.style('height')) || 400)
                             - margin.top - margin.bottom;
        }

        g.select('.legendWrap')
            .attr('transform', 'translate(' + ( availableWidth / 2 ) + ',' + (-margin.top) +')');
      }


      lines1
        .width(availableWidth)
        .height(availableHeight)
        .interpolate("monotone")
        .color(data.map(function(d,i) {
          return d.color || color[i % color.length];
        }).filter(function(d,i) { return !data[i].disabled && data[i].yAxis == 1 && data[i].type == 'line'}));

      lines2
        .width(availableWidth)
        .height(availableHeight)
        .interpolate("monotone")
        .color(data.map(function(d,i) {
          return d.color || color[i % color.length];
        }).filter(function(d,i) { return !data[i].disabled && data[i].yAxis == 2 && data[i].type == 'line'}));

      bars1
        .width(availableWidth)
        .height(availableHeight)
        .color(data.map(function(d,i) {
          return d.color || color[i % color.length];
        }).filter(function(d,i) { return !data[i].disabled && data[i].yAxis == 1 && data[i].type == 'bar'}));

      bars2
        .width(availableWidth)
        .height(availableHeight)
        .color(data.map(function(d,i) {
          return d.color || color[i % color.length];
        }).filter(function(d,i) { return !data[i].disabled && data[i].yAxis == 2 && data[i].type == 'bar'}));

      stack1
        .width(availableWidth)
        .height(availableHeight)
        .color(data.map(function(d,i) {
          return d.color || color[i % color.length];
        }).filter(function(d,i) { return !data[i].disabled && data[i].yAxis == 1 && data[i].type == 'area'}));

      stack2
        .width(availableWidth)
        .height(availableHeight)
        .color(data.map(function(d,i) {
          return d.color || color[i % color.length];
        }).filter(function(d,i) { return !data[i].disabled && data[i].yAxis == 2 && data[i].type == 'area'}));

      g.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');


      var lines1Wrap = g.select('.lines1Wrap')
          .datum(dataLines1);
      var bars1Wrap = g.select('.bars1Wrap')
          .datum(dataBars1);
      var stack1Wrap = g.select('.stack1Wrap')
          .datum(dataStack1);

      var lines2Wrap = g.select('.lines2Wrap')
          .datum(dataLines2);
      var bars2Wrap = g.select('.bars2Wrap')
          .datum(dataBars2);
      var stack2Wrap = g.select('.stack2Wrap')
          .datum(dataStack2);

      var extraValue1 = dataStack1.length ? dataStack1.map(function(a){return a.values}).reduce(function(a,b){
        return a.map(function(aVal,i){return {x: aVal.x, y: aVal.y + b[i].y}})
      }).concat([{x:0, y:0}]) : [];
      var extraValue2 = dataStack2.length ? dataStack2.map(function(a){return a.values}).reduce(function(a,b){
        return a.map(function(aVal,i){return {x: aVal.x, y: aVal.y + b[i].y}})
      }).concat([{x:0, y:0}]) : [];

      yScale1 .domain(yDomain1 || d3.extent(d3.merge(series1).concat(extraValue1), function(d) { return d.y } ))
              .range([0, availableHeight]);

      yScale2 .domain(yDomain2 || d3.extent(d3.merge(series2).concat(extraValue2), function(d) { return d.y } ))
              .range([0, availableHeight]);

      lines1.yDomain(yScale1.domain());
      bars1.yDomain(yScale1.domain());
      stack1.yDomain(yScale1.domain());

      lines2.yDomain(yScale2.domain());
      bars2.yDomain(yScale2.domain());
      stack2.yDomain(yScale2.domain());

      if(dataStack1.length){d3.transition(stack1Wrap).call(stack1);}
      if(dataStack2.length){d3.transition(stack2Wrap).call(stack2);}

      if(dataBars1.length){d3.transition(bars1Wrap).call(bars1);}
      if(dataBars2.length){d3.transition(bars2Wrap).call(bars2);}

      if(dataLines1.length){d3.transition(lines1Wrap).call(lines1);}
      if(dataLines2.length){d3.transition(lines2Wrap).call(lines2);}
      


      xAxis
        .ticks( availableWidth / 100 )
        .tickSize(-availableHeight, 0);

      g.select('.x.axis')
          .attr('transform', 'translate(0,' + availableHeight + ')');
      d3.transition(g.select('.x.axis'))
          .call(xAxis);

      yAxis1
        .ticks( availableHeight / 36 )
        .tickSize( -availableWidth, 0);


      d3.transition(g.select('.y1.axis'))
          .call(yAxis1);

      yAxis2
        .ticks( availableHeight / 36 )
        .tickSize( -availableWidth, 0);

      d3.transition(g.select('.y2.axis'))
          .call(yAxis2);

      g.select('.y2.axis')
          .style('opacity', series2.length ? 1 : 0)
          .attr('transform', 'translate(' + x.range()[1] + ',0)');

      legend.dispatch.on('stateChange', function(newState) { 
        chart.update();
      });
     
      dispatch.on('tooltipShow', function(e) {
        if (tooltips) showTooltip(e, that.parentNode);
      });

    });

    return chart;
  }


  //============================================================
  // Event Handling/Dispatching (out of chart's scope)
  //------------------------------------------------------------

  lines1.dispatch.on('elementMouseover.tooltip', function(e) {
    e.pos = [e.pos[0] +  margin.left, e.pos[1] + margin.top];
    dispatch.tooltipShow(e);
  });

  lines1.dispatch.on('elementMouseout.tooltip', function(e) {
    dispatch.tooltipHide(e);
  });

  lines2.dispatch.on('elementMouseover.tooltip', function(e) {
    e.pos = [e.pos[0] +  margin.left, e.pos[1] + margin.top];
    dispatch.tooltipShow(e);
  });

  lines2.dispatch.on('elementMouseout.tooltip', function(e) {
    dispatch.tooltipHide(e);
  });

  bars1.dispatch.on('elementMouseover.tooltip', function(e) {
    e.pos = [e.pos[0] +  margin.left, e.pos[1] + margin.top];
    dispatch.tooltipShow(e);
  });

  bars1.dispatch.on('elementMouseout.tooltip', function(e) {
    dispatch.tooltipHide(e);
  });

  bars2.dispatch.on('elementMouseover.tooltip', function(e) {
    e.pos = [e.pos[0] +  margin.left, e.pos[1] + margin.top];
    dispatch.tooltipShow(e);
  });

  bars2.dispatch.on('elementMouseout.tooltip', function(e) {
    dispatch.tooltipHide(e);
  });

  stack1.dispatch.on('tooltipShow', function(e) {
    //disable tooltips when value ~= 0
    //// TODO: consider removing points from voronoi that have 0 value instead of this hack
    if (!Math.round(stack1.y()(e.point) * 100)) {  // 100 will not be good for very small numbers... will have to think about making this valu dynamic, based on data range
      setTimeout(function() { d3.selectAll('.point.hover').classed('hover', false) }, 0);
      return false;
    }

    e.pos = [e.pos[0] + margin.left, e.pos[1] + margin.top];
    dispatch.tooltipShow(e);
  });

  stack1.dispatch.on('tooltipHide', function(e) {
    dispatch.tooltipHide(e);
  });

  stack2.dispatch.on('tooltipShow', function(e) {
    //disable tooltips when value ~= 0
    //// TODO: consider removing points from voronoi that have 0 value instead of this hack
    if (!Math.round(stack2.y()(e.point) * 100)) {  // 100 will not be good for very small numbers... will have to think about making this valu dynamic, based on data range
      setTimeout(function() { d3.selectAll('.point.hover').classed('hover', false) }, 0);
      return false;
    }

    e.pos = [e.pos[0] + margin.left, e.pos[1] + margin.top];
    dispatch.tooltipShow(e);
  });

  stack2.dispatch.on('tooltipHide', function(e) {
    dispatch.tooltipHide(e);
  });

    lines1.dispatch.on('elementMouseover.tooltip', function(e) {
    e.pos = [e.pos[0] +  margin.left, e.pos[1] + margin.top];
    dispatch.tooltipShow(e);
  });

  lines1.dispatch.on('elementMouseout.tooltip', function(e) {
    dispatch.tooltipHide(e);
  });

  lines2.dispatch.on('elementMouseover.tooltip', function(e) {
    e.pos = [e.pos[0] +  margin.left, e.pos[1] + margin.top];
    dispatch.tooltipShow(e);
  });

  lines2.dispatch.on('elementMouseout.tooltip', function(e) {
    dispatch.tooltipHide(e);
  });

  dispatch.on('tooltipHide', function() {
    if (tooltips) nv.tooltip.cleanup();
  });



  //============================================================
  // Global getters and setters
  //------------------------------------------------------------

  chart.dispatch = dispatch;
  chart.lines1 = lines1;
  chart.lines2 = lines2;
  chart.bars1 = bars1;
  chart.bars2 = bars2;
  chart.stack1 = stack1;
  chart.stack2 = stack2;
  chart.xAxis = xAxis;
  chart.yAxis1 = yAxis1;
  chart.yAxis2 = yAxis2;
  chart.options = nv.utils.optionsFunc.bind(chart);

  chart.x = function(_) {
    if (!arguments.length) return getX;
    getX = _;
    lines1.x(_);
    bars1.x(_);
    return chart;
  };

  chart.y = function(_) {
    if (!arguments.length) return getY;
    getY = _;
    lines1.y(_);
    bars1.y(_);
    return chart;
  };

  chart.yDomain1 = function(_) {
    if (!arguments.length) return yDomain1;
    yDomain1 = _;
    return chart;
  };

  chart.yDomain2 = function(_) {
    if (!arguments.length) return yDomain2;
    yDomain2 = _;
    return chart;
  };

  chart.margin = function(_) {
    if (!arguments.length) return margin;
    margin = _;
    return chart;
  };

  chart.width = function(_) {
    if (!arguments.length) return width;
    width = _;
    return chart;
  };

  chart.height = function(_) {
    if (!arguments.length) return height;
    height = _;
    return chart;
  };

  chart.color = function(_) {
    if (!arguments.length) return color;
    color = _;
    legend.color(_);
    return chart;
  };

  chart.showLegend = function(_) {
    if (!arguments.length) return showLegend;
    showLegend = _;
    return chart;
  };

  chart.tooltips = function(_) {
    if (!arguments.length) return tooltips;
    tooltips = _;
    return chart;
  };

  chart.tooltipContent = function(_) {
    if (!arguments.length) return tooltip;
    tooltip = _;
    return chart;
  };

  return chart;
};


nv.models.ohlcBar = function() {
  "use strict";
  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var margin = {top: 0, right: 0, bottom: 0, left: 0}
    , width = 960
    , height = 500
    , id = Math.floor(Math.random() * 10000) //Create semi-unique ID in case user doesn't select one
    , x = d3.scale.linear()
    , y = d3.scale.linear()
    , getX = function(d) { return d.x }
    , getY = function(d) { return d.y }
    , getOpen = function(d) { return d.open }
    , getClose = function(d) { return d.close }
    , getHigh = function(d) { return d.high }
    , getLow = function(d) { return d.low }
    , forceX = []
    , forceY = []
    , padData     = false // If true, adds half a data points width to front and back, for lining up a line chart with a bar chart
    , clipEdge = true
    , color = nv.utils.defaultColor()
    , xDomain
    , yDomain
    , xRange
    , yRange
    , dispatch = d3.dispatch('chartClick', 'elementClick', 'elementDblClick', 'elementMouseover', 'elementMouseout')
    ;

  //============================================================

  //============================================================
  // Private Variables
  //------------------------------------------------------------

  //TODO: store old scales for transitions

  //============================================================


  function chart(selection) {
    selection.each(function(data) {
      var availableWidth = width - margin.left - margin.right,
          availableHeight = height - margin.top - margin.bottom,
          container = d3.select(this);


      //------------------------------------------------------------
      // Setup Scales

      x   .domain(xDomain || d3.extent(data[0].values.map(getX).concat(forceX) ));

      if (padData)
        x.range(xRange || [availableWidth * .5 / data[0].values.length, availableWidth * (data[0].values.length - .5)  / data[0].values.length ]);
      else
        x.range(xRange || [0, availableWidth]);

      y   .domain(yDomain || [
            d3.min(data[0].values.map(getLow).concat(forceY)),
            d3.max(data[0].values.map(getHigh).concat(forceY))
          ])
          .range(yRange || [availableHeight, 0]);

      // If scale's domain don't have a range, slightly adjust to make one... so a chart can show a single data point
      if (x.domain()[0] === x.domain()[1])
        x.domain()[0] ?
            x.domain([x.domain()[0] - x.domain()[0] * 0.01, x.domain()[1] + x.domain()[1] * 0.01])
          : x.domain([-1,1]);

      if (y.domain()[0] === y.domain()[1])
        y.domain()[0] ?
            y.domain([y.domain()[0] + y.domain()[0] * 0.01, y.domain()[1] - y.domain()[1] * 0.01])
          : y.domain([-1,1]);

      //------------------------------------------------------------


      //------------------------------------------------------------
      // Setup containers and skeleton of chart

      var wrap = d3.select(this).selectAll('g.nv-wrap.nv-ohlcBar').data([data[0].values]);
      var wrapEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap nv-ohlcBar');
      var defsEnter = wrapEnter.append('defs');
      var gEnter = wrapEnter.append('g');
      var g = wrap.select('g');

      gEnter.append('g').attr('class', 'nv-ticks');

      wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      //------------------------------------------------------------


      container
          .on('click', function(d,i) {
            dispatch.chartClick({
                data: d,
                index: i,
                pos: d3.event,
                id: id
            });
          });


      defsEnter.append('clipPath')
          .attr('id', 'nv-chart-clip-path-' + id)
        .append('rect');

      wrap.select('#nv-chart-clip-path-' + id + ' rect')
          .attr('width', availableWidth)
          .attr('height', availableHeight);

      g   .attr('clip-path', clipEdge ? 'url(#nv-chart-clip-path-' + id + ')' : '');



      var ticks = wrap.select('.nv-ticks').selectAll('.nv-tick')
          .data(function(d) { return d });

      ticks.exit().remove();


      var ticksEnter = ticks.enter().append('path')
          .attr('class', function(d,i,j) { return (getOpen(d,i) > getClose(d,i) ? 'nv-tick negative' : 'nv-tick positive') + ' nv-tick-' + j + '-' + i })
          .attr('d', function(d,i) {
            var w = (availableWidth / data[0].values.length) * .9;
            return 'm0,0l0,'
                 + (y(getOpen(d,i))
                 - y(getHigh(d,i)))
                 + 'l'
                 + (-w/2)
                 + ',0l'
                 + (w/2)
                 + ',0l0,'
                 + (y(getLow(d,i)) - y(getOpen(d,i)))
                 + 'l0,'
                 + (y(getClose(d,i))
                 - y(getLow(d,i)))
                 + 'l'
                 + (w/2)
                 + ',0l'
                 + (-w/2)
                 + ',0z';
          })
          .attr('transform', function(d,i) { return 'translate(' + x(getX(d,i)) + ',' + y(getHigh(d,i)) + ')'; })
          //.attr('fill', function(d,i) { return color[0]; })
          //.attr('stroke', function(d,i) { return color[0]; })
          //.attr('x', 0 )
          //.attr('y', function(d,i) {  return y(Math.max(0, getY(d,i))) })
          //.attr('height', function(d,i) { return Math.abs(y(getY(d,i)) - y(0)) })
          .on('mouseover', function(d,i) {
            d3.select(this).classed('hover', true);
            dispatch.elementMouseover({
                point: d,
                series: data[0],
                pos: [x(getX(d,i)), y(getY(d,i))],  // TODO: Figure out why the value appears to be shifted
                pointIndex: i,
                seriesIndex: 0,
                e: d3.event
            });

          })
          .on('mouseout', function(d,i) {
                d3.select(this).classed('hover', false);
                dispatch.elementMouseout({
                    point: d,
                    series: data[0],
                    pointIndex: i,
                    seriesIndex: 0,
                    e: d3.event
                });
          })
          .on('click', function(d,i) {
                dispatch.elementClick({
                    //label: d[label],
                    value: getY(d,i),
                    data: d,
                    index: i,
                    pos: [x(getX(d,i)), y(getY(d,i))],
                    e: d3.event,
                    id: id
                });
              d3.event.stopPropagation();
          })
          .on('dblclick', function(d,i) {
              dispatch.elementDblClick({
                  //label: d[label],
                  value: getY(d,i),
                  data: d,
                  index: i,
                  pos: [x(getX(d,i)), y(getY(d,i))],
                  e: d3.event,
                  id: id
              });
              d3.event.stopPropagation();
          });

      ticks
          .attr('class', function(d,i,j) { return (getOpen(d,i) > getClose(d,i) ? 'nv-tick negative' : 'nv-tick positive') + ' nv-tick-' + j + '-' + i })
      d3.transition(ticks)
          .attr('transform', function(d,i) { return 'translate(' + x(getX(d,i)) + ',' + y(getHigh(d,i)) + ')'; })
          .attr('d', function(d,i) {
            var w = (availableWidth / data[0].values.length) * .9;
            return 'm0,0l0,'
                 + (y(getOpen(d,i))
                 - y(getHigh(d,i)))
                 + 'l'
                 + (-w/2)
                 + ',0l'
                 + (w/2)
                 + ',0l0,'
                 + (y(getLow(d,i))
                 - y(getOpen(d,i)))
                 + 'l0,'
                 + (y(getClose(d,i))
                 - y(getLow(d,i)))
                 + 'l'
                 + (w/2)
                 + ',0l'
                 + (-w/2)
                 + ',0z';
          });
          //.attr('width', (availableWidth / data[0].values.length) * .9 )


      //d3.transition(ticks)
          //.attr('y', function(d,i) {  return y(Math.max(0, getY(d,i))) })
          //.attr('height', function(d,i) { return Math.abs(y(getY(d,i)) - y(0)) });
          //.order();  // not sure if this makes any sense for this model

    });

    return chart;
  }


  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  chart.dispatch = dispatch;

  chart.options = nv.utils.optionsFunc.bind(chart);

  chart.x = function(_) {
    if (!arguments.length) return getX;
    getX = _;
    return chart;
  };

  chart.y = function(_) {
    if (!arguments.length) return getY;
    getY = _;
    return chart;
  };

  chart.open = function(_) {
    if (!arguments.length) return getOpen;
    getOpen = _;
    return chart;
  };

  chart.close = function(_) {
    if (!arguments.length) return getClose;
    getClose = _;
    return chart;
  };

  chart.high = function(_) {
    if (!arguments.length) return getHigh;
    getHigh = _;
    return chart;
  };

  chart.low = function(_) {
    if (!arguments.length) return getLow;
    getLow = _;
    return chart;
  };

  chart.margin = function(_) {
    if (!arguments.length) return margin;
    margin.top    = typeof _.top    != 'undefined' ? _.top    : margin.top;
    margin.right  = typeof _.right  != 'undefined' ? _.right  : margin.right;
    margin.bottom = typeof _.bottom != 'undefined' ? _.bottom : margin.bottom;
    margin.left   = typeof _.left   != 'undefined' ? _.left   : margin.left;
    return chart;
  };

  chart.width = function(_) {
    if (!arguments.length) return width;
    width = _;
    return chart;
  };

  chart.height = function(_) {
    if (!arguments.length) return height;
    height = _;
    return chart;
  };

  chart.xScale = function(_) {
    if (!arguments.length) return x;
    x = _;
    return chart;
  };

  chart.yScale = function(_) {
    if (!arguments.length) return y;
    y = _;
    return chart;
  };

  chart.xDomain = function(_) {
    if (!arguments.length) return xDomain;
    xDomain = _;
    return chart;
  };

  chart.yDomain = function(_) {
    if (!arguments.length) return yDomain;
    yDomain = _;
    return chart;
  };

  chart.xRange = function(_) {
    if (!arguments.length) return xRange;
    xRange = _;
    return chart;
  };

  chart.yRange = function(_) {
    if (!arguments.length) return yRange;
    yRange = _;
    return chart;
  };

  chart.forceX = function(_) {
    if (!arguments.length) return forceX;
    forceX = _;
    return chart;
  };

  chart.forceY = function(_) {
    if (!arguments.length) return forceY;
    forceY = _;
    return chart;
  };

  chart.padData = function(_) {
    if (!arguments.length) return padData;
    padData = _;
    return chart;
  };

  chart.clipEdge = function(_) {
    if (!arguments.length) return clipEdge;
    clipEdge = _;
    return chart;
  };

  chart.color = function(_) {
    if (!arguments.length) return color;
    color = nv.utils.getColor(_);
    return chart;
  };

  chart.id = function(_) {
    if (!arguments.length) return id;
    id = _;
    return chart;
  };

  //============================================================


  return chart;
};

//Code adapted from Jason Davies' "Parallel Coordinates"
// http://bl.ocks.org/jasondavies/1341281

nv.models.parallelCoordinates = function() {
  "use strict";
  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------


  var margin = {top: 30, right: 10, bottom: 10, left: 10}
    , width = 960
    , height = 500
    , x = d3.scale.ordinal()
    , y = {}
    , dimensions = []
    , color = nv.utils.getColor(d3.scale.category20c().range())
    , axisLabel = function(d) { return d; }
    , filters = []
    , active = []
    , dispatch = d3.dispatch('brush')
    ;

  //============================================================


  //============================================================
  // Private Variables
  //------------------------------------------------------------


  //============================================================


  function chart(selection) {
    selection.each(function(data) {
      var availableWidth = width - margin.left - margin.right,
          availableHeight = height - margin.top - margin.bottom,
          container = d3.select(this);

      active = data; //set all active before first brush call

      chart.update = function() { }; //This is a placeholder until this chart is made resizeable

      //------------------------------------------------------------
      // Setup Scales

      x
        .rangePoints([0, availableWidth], 1)
        .domain(dimensions);

      // Extract the list of dimensions and create a scale for each.
      dimensions.forEach(function(d) {
          y[d] = d3.scale.linear()
              .domain(d3.extent(data, function(p) { return +p[d]; }))
              .range([availableHeight, 0]);

          y[d].brush = d3.svg.brush().y(y[d]).on('brush', brush);

          return d != 'name';
        });


      //------------------------------------------------------------


      //------------------------------------------------------------
      // Setup containers and skeleton of chart

      var wrap = container.selectAll('g.nv-wrap.nv-parallelCoordinates').data([data]);
      var wrapEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap nv-parallelCoordinates');
      var gEnter = wrapEnter.append('g');
      var g = wrap.select('g');

      gEnter.append('g').attr('class', 'nv-parallelCoordinatesWrap');

      wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      //------------------------------------------------------------


      var line = d3.svg.line(),
          axis = d3.svg.axis().orient('left'),
          background,
          foreground;


      // Add grey background lines for context.
      background = gEnter.append('g')
          .attr('class', 'background')
        .selectAll('path')
          .data(data)
        .enter().append('path')
          .attr('d', path)
        ;

      // Add blue foreground lines for focus.
      foreground = gEnter.append('g')
          .attr('class', 'foreground')
        .selectAll('path')
          .data(data)
        .enter().append('path')
          .attr('d', path)
        ;

      // Add a group element for each dimension.
      var dimension = g.selectAll('.dimension')
          .data(dimensions)
        .enter().append('g')
          .attr('class', 'dimension')
          .attr('transform', function(d) { return 'translate(' + x(d) + ',0)'; });

      // Add an axis and title.
      dimension.append('g')
          .attr('class', 'axis')
          .each(function(d) { d3.select(this).call(axis.scale(y[d])); })
        .append('text')
          .attr('text-anchor', 'middle')
          .attr('y', -9)
          .text(String);

      // Add and store a brush for each axis.
      dimension.append('g')
          .attr('class', 'brush')
          .each(function(d) { d3.select(this).call(y[d].brush); })
        .selectAll('rect')
          .attr('x', -8)
          .attr('width', 16);


      // Returns the path for a given data point.
      function path(d) {
        return line(dimensions.map(function(p) { return [x(p), y[p](d[p])]; }));
      }

      // Handles a brush event, toggling the display of foreground lines.
      function brush() {
        var actives = dimensions.filter(function(p) { return !y[p].brush.empty(); }),
            extents = actives.map(function(p) { return y[p].brush.extent(); });

        filters = []; //erase current filters
        actives.forEach(function(d,i) {
          filters[i] = {
            dimension: d,
            extent: extents[i]
          }
        });

        active = []; //erase current active list
        foreground.style('display', function(d) {
          var isActive = actives.every(function(p, i) {
            return extents[i][0] <= d[p] && d[p] <= extents[i][1];
          });
          if (isActive) active.push(d);
          return isActive ? null : 'none';
        });

        dispatch.brush({
          filters: filters,
          active: active
        });

      }



    });

    return chart;
  }


  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------


  chart.dispatch = dispatch;
  chart.options = nv.utils.optionsFunc.bind(chart);
  
  chart.margin = function(_) {
    if (!arguments.length) return margin;
    margin.top    = typeof _.top    != 'undefined' ? _.top    : margin.top;
    margin.right  = typeof _.right  != 'undefined' ? _.right  : margin.right;
    margin.bottom = typeof _.bottom != 'undefined' ? _.bottom : margin.bottom;
    margin.left   = typeof _.left   != 'undefined' ? _.left   : margin.left;
    return chart;
  };

  chart.width = function(_) {
    if (!arguments.length) return width;
    width = _;
    return chart;
  };

  chart.height = function(_) {
    if (!arguments.length) return height;
    height = _;
    return chart;
  };

  chart.color = function(_) {
    if (!arguments.length) return color;
    color = nv.utils.getColor(_);
    return chart;
  };

  chart.xScale = function(_) {
    if (!arguments.length) return x;
    x = _;
    return chart;
  };

  chart.yScale = function(_) {
    if (!arguments.length) return y;
    y = _;
    return chart;
  };

  chart.dimensions = function(_) {
    if (!arguments.length) return dimensions;
    dimensions = _;
    return chart;
  };

  chart.filters = function() {
    return filters;
  };

  chart.active = function() {
    return active;
  };

  //============================================================


  return chart;
};
DonutPrivates = {
    donutRatio: 0.5,
    donutLabelsOutside: false
};
function Donut(options) {
    options = nv.utils.extend({}, options, DonutPrivates);
    Pie.call(this, options);
}
nv.utils.create(Donut, Pie, DonutPrivates);

Donut.prototype.getArc = function() {
    var arc = Pie.prototype.getArc.call(this);
    arc.innerRadius(this.radius() * this.donutRatio());
    return arc;
};

nv.models.donut = function(){
    var donut = new Donut();

    function chart(selection){
        donut.render(selection);
        return chart;
    }

    chart.dispatch = donut.dispatch;
    nv.utils.rebindp(chart, donut, Donut.prototype, 'margin', 'width', 'height', 'x', 'y', 'description', 'showLabels', 'labelSunbeamLayout', 'donutLabelsOutside', 'pieLabelsOutside', 'labelType', 'donut', 'donutRatio', 'startAngle', 'endAngle', 'id', 'color', 'labelThreshold', 'valueFormat');

    chart.options = nv.utils.optionsFunc.bind(chart);

    return chart;
};


function DonutChart(options){
    PieChart.call(this, options);
}
DonutChart.prototype = Object.create(PieChart.prototype);

DonutChart.prototype.getPie = function(){
    return nv.models.donut();
};

nv.models.donutChart = function(){
    var donutChart = new DonutChart();

    function chart(selection){
        donutChart.render(selection);
        return chart;
    }

    chart.legend = donutChart.legend;
    chart.dispatch = donutChart.dispatch;
    chart.pie = donutChart.pie;

    d3.rebind(chart, donutChart.pie, 'valueFormat', 'values', 'x', 'y', 'description', 'id', 'showLabels', 'donutLabelsOutside', 'pieLabelsOutside', 'labelType', 'donut', 'donutRatio', 'labelThreshold');
    nv.utils.rebindp(chart, donutChart, DonutChart.prototype, 'margin', 'width', 'height', 'color', 'tooltips', 'tooltipContent', 'showLegend', 'duration', 'noData', 'state', 'showLegend');
    chart.options = nv.utils.optionsFunc.bind(chart);

    return chart;
};
var PieLabels = {
    Normal: {
        rotateAngle: function(){
            return 0;
        },
        textAnchor: function(){
            return 'middle';
        }
    },
    Sunbeam: {
        rotateAngle: function(d){
            var rotateAngle = (d.startAngle + d.endAngle) / 2 * (180 / Math.PI);
            if ((d.startAngle+d.endAngle)/2 < Math.PI) {
                rotateAngle -= 90;
            } else {
                rotateAngle += 90;
            }
            return rotateAngle;
        },
        textAnchor: function(d){
            return ((d.startAngle + d.endAngle) / 2 < Math.PI ? 'start' : 'end')
        }
    }
};

var PiePrivates = {
    startAngle: 0,
    endAngle: 0,
    pieLabelsOutside: true,
    showLabels: true,
    labelType: "key",
    labelThreshold: 0.02, //if slice percentage is under this, don't show label
    labelLayout: PieLabels.Normal,
    valueFormat: d3.format(',.2f')
};

/**
 * A Pie Chart draws a percentage data set, in a circular display.
 */
function Pie(options) {
    options = nv.utils.extend({}, options, PiePrivates, {
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
        width: 500,
        height: 500,
        chartClass: 'pie',
        wrapClass: 'pieWrap'
    });

    Layer.call(this, options, []);
}
nv.utils.create(Pie, Layer, PiePrivates);

Pie.prototype.radius = function(){
    return Math.min(this.available.width, this.available.height) / 2;
};

Pie.prototype.arcRadius = function(){
    return this.radius() - (this.radius() / 5);
};

/**
 * @override Layer::wrapper
 */
Pie.prototype.wrapper = function (data) {
    Layer.prototype.wrapper.call(this, data, ['nv-pieLabels']);

    this.wrap.attr('transform', 'translate(' + this.available.width / 2 + ',' + this.available.height / 2 + ')');
};

/**
 * @override Layer::draw
 */
Pie.prototype.draw = function(data){

    var arc = null
        , arcTween = null
        , pieLayout = null
        , slices = null;

    arc = this.getArc();

    arcTween = function(a) {
        a.endAngle = isNaN(a.endAngle) ? 0 : a.endAngle;
        a.startAngle = isNaN(a.startAngle) ? 0 : a.startAngle;
        a.innerRadius = nv.utils.valueOrDefault(a.innerRadius, 0);
        var i = d3.interpolate(this._current, a);
        this._current = i(0);
        return function (t) {
            return arc(i(t));
        };
    }.bind(this);

    // Setup the Pie chart and choose the data element
    pieLayout = d3.layout.pie()
        .sort(null)
        .value(function (d) {
            return d.disabled ? 0 : this.y()(d)
        }.bind(this));

    slices = this.g.selectAll('.nv-slice').data(pieLayout);

    slices.exit().remove();

    this.paths = slices.enter().append('path');
    this.paths
        .each(function (d) {
            if (isNaN(d.startAngle)) d.startAngle = 0;
            if (isNaN(d.endAngle)) d.endAngle = 0;
            this._current = d;
        }.bind(this))
        .attr({
            fill: function (d, i) { return this.color()(d, i); }.bind(this),
            stroke: function (d, i) { return this.color()(d, i); }.bind(this)
        })
        .transition()
        .attr('d', arc)
        .attrTween('d', arcTween)
        ;

    if (this.showLabels()) {
        this.doLabels(data, arc, pieLayout);
    }
};

Pie.prototype.doLabels = function(data, arc, pieLayout){

    var pieLabels = null
        , labelsArc = null
        , pieSelf = this
        , labelLocationHash = {}
        , avgHeight = 14
        , avgWidth = 140
        , createHashKey = function (coordinates) {
            return Math.floor(coordinates[0] / avgWidth) * avgWidth + ',' +
                Math.floor(coordinates[1] / avgHeight) * avgHeight;
        };

    pieLabels = this.wrap.select('.nv-pieLabels')
        .selectAll('.nv-label')
        .data(pieLayout);
    pieLabels.exit().remove();

    // This does the normal label, or just use the arc if outside.
    labelsArc = this.pieLabelsOutside() ? arc : d3.svg.arc().innerRadius(0);

    pieLabels
        .enter().append("g")
        .classed("nv-label", true)
        .each(function(d) {
            var group = d3.select(this);
            group.attr('transform', function(d) {
                d.outerRadius = this.arcRadius() + 10; // Set Outer Coordinate
                d.innerRadius = this.arcRadius() + 15; // Set Inner Coordinate

                return 'translate(' + labelsArc.centroid(d) + ') ' +
                    'rotate(' + this.labelLayout().rotateAngle(d) + ')';
            }.bind(pieSelf));

            group.append('rect')
                .style('stroke', '#fff')
                .style('fill', '#fff')
                .attr("rx", 3)
                .attr("ry", 3);

            group.append('text')
                .style('text-anchor', pieSelf.labelLayout().textAnchor)
                .style('fill', '#000')
        });

    pieLabels.transition()
        .attr('transform', function(d) {
            d.outerRadius = this.arcRadius() + 10; // Set Outer Coordinate
            d.innerRadius = this.arcRadius() + 15; // Set Inner Coordinate

            /*
             Overlapping pie labels are not good. What this attempts to do is, prevent overlapping.
             Each label location is hashed, and if a hash collision occurs, we assume an overlap.
             Adjust the label's y-position to remove the overlap.
             */
            var center = labelsArc.centroid(d), hashKey = createHashKey(center);
            if (labelLocationHash[hashKey]) {
                center[1] -= avgHeight;
            }
            labelLocationHash[createHashKey(center)] = true;

            return 'translate(' + center + ') ' +
                'rotate(' + this.labelLayout().rotateAngle(d) + ')';
        }.bind(this));

    pieLabels.select(".nv-label text")
        .style('text-anchor', this.labelLayout().textAnchor)
        .text(function(d) {
            var percent = (d.endAngle - d.startAngle) / (2 * Math.PI);
            var labelTypes = {
                "key"    : this.x()(d.data),
                "value"  : this.y()(d.data),
                "percent": d3.format('%')(percent)
            };
            return (d.value && percent > this.labelThreshold()) ? labelTypes[this.labelType()] : '';
        }.bind(this));
};

Pie.prototype.mouseData = function(d, i){
    return {
        label: this.x()(d.data),
        value: this.y()(d.data),
        point: d.data,
        pointIndex: i,
        pos: [d3.event.pageX, d3.event.pageY],
        id: this.id()
    }
};

/**
 * @override Layer::attachEvents
 */
Pie.prototype.attachEvents = function(){
    this.svg.on('click', function (d, i) {
        this.dispatch.chartClick({
            data: d,
            index: i,
            pos: d3.event,
            id: this.id()
        });
    }.bind(this));

    var self_ = this;
    this.paths.attr('class', 'nv-slice')
        .on('mouseover', function (d, i) {
            d3.select(this).classed('hover', true);
            self_.dispatch.elementMouseover(self_.mouseData(d, i));
        })
        .on('mouseout', function (d, i) {
            d3.select(this).classed('hover', false);
            self_.dispatch.elementMouseout(self_.mouseData(d, i));
        })
        .on('click', function (d, i) {
            this.dispatch.elementClick(this.mouseData(d, i));
            d3.event.stopPropagation();
        }.bind(this))
        .on('dblclick', function (d, i) {
            this.dispatch.elementDblClick(this.mouseData(d, i));
            d3.event.stopPropagation();
        }.bind(this));
};

Pie.prototype.getArc = function(){
    var arc = d3.svg.arc().outerRadius(this.arcRadius());
    if (this.startAngle()) arc.startAngle(this.startAngle());
    if (this.endAngle()) arc.endAngle(this.endAngle());
    return arc;
};

Pie.prototype.layoutCenter = function(){
    return this.layout.center(this);
};

Pie.prototype.labelSunbeamLayout = function(_){
    if(!arguments.length) return this.labelLayout() === PieLabels.Sunbeam;
    this.labelLayout(_ ? PieLabels.Sunbeam : PieLabels.Normal);
    return this;
};

/**
 * The Pie model returns a function wrapping an instance of a Pie.
 */
nv.models.pie = function () {
    "use strict";

    var pie = new Pie();

    function chart(selection) {
        pie.render(selection);
        return chart;
    }

    chart.dispatch = pie.dispatch;
    chart.options = nv.utils.optionsFunc.bind(chart);

    nv.utils.rebindp(chart, pie, Pie.prototype, 'margin', 'width', 'height', 'x', 'y', 'description', 'showLabels',
        'labelSunbeamLayout', 'donutLabelsOutside', 'pieLabelsOutside', 'labelType', 'donut', 'donutRatio',
        'startAngle', 'endAngle', 'id', 'color', 'labelThreshold', 'valueFormat');

    return chart;
};
/**
 * A Pie Chart draws a percentage data set, in a circular display.
 */
function PieChart(options){
    options = nv.utils.extend({}, options, {
        margin: {top: 30, right: 20, bottom: 20, left: 20},
        chartClass: 'pieChart',
        wrapClass: 'pieChartWrap'
    });

    Chart.call(this, options);
    this.pie = this.getPie();
    this.state = this.getStatesManager();

    this.pie.showLabels(true);
}

nv.utils.create(PieChart, Chart, {});

PieChart.prototype.getPie = function(){
    return nv.models.pie();
};

/**
 * @override Layer::draw
 */
PieChart.prototype.draw = function(data){
    this.pie
      .width(this.available.width)
      .height(this.available.height);

    var pieChartWrap = this.g.select('.nv-pieChartWrap').datum(data);
    d3.transition(pieChartWrap).call(this.pie);
};

/**
 * Set up listeners for dispatches fired on the underlying
 * pie graph.
 *
 * @override PieChart::onDispatches
 */
PieChart.prototype.attachEvents = function(){
    Chart.prototype.attachEvents.call(this);

    this.pie.dispatch.on('elementMouseout.tooltip', function(e) {
      this.dispatch.tooltipHide(e);
    }.bind(this));

    this.pie.dispatch.on('elementMouseover.tooltip', function(e) {
      e.pos = [e.pos[0] +  this.margin().left, e.pos[1] + this.margin().top];
      this.dispatch.tooltipShow(e);
    }.bind(this));
};

/**
 * Set the underlying color, on both the chart, and the composites.
 */
PieChart.prototype.color = function(_){
    if (!arguments.length) return this.color;
    this.options.color = nv.utils.getColor(_);
    this.legend.color(this.options.color);
    this.pie.color(this.options.color);
    return this;
};

/**
 * Calculate where to show the tooltip on a pie chart.
 */
PieChart.prototype.showTooltip = function(e, offsetElement) {
    var tooltipLabel = this.pie.description()(e.point) || this.pie.x()(e.point);
    var left = e.pos[0] + ( (offsetElement && offsetElement.offsetLeft) || 0 ),
        top = e.pos[1] + ( (offsetElement && offsetElement.offsetTop) || 0),
        y = this.pie.valueFormat()(this.pie.y()(e.point)),
        content = this.tooltip()(tooltipLabel, y);

    nv.tooltip.show([left, top], content, e.value < 0 ? 'n' : 's', null, offsetElement);
};

/**
 * The PieChart model retuns a function wrapping an instance of a PieChart.
 */
nv.models.pieChart = function() {
  "use strict";

  var pieChart = new PieChart();

  function chart(selection) {
    pieChart.render(selection);
    return chart;
  }

  chart.legend = pieChart.legend;
  chart.dispatch = pieChart.dispatch;
  chart.pie = pieChart.pie;
  chart.state = pieChart.state;

  d3.rebind(chart, pieChart.pie,
      'valueFormat', 'values', 'x', 'y', 'description', 'id', 'showLabels', 'donutLabelsOutside', 'pieLabelsOutside',
      'labelType', 'donut', 'donutRatio', 'labelThreshold', 'labelSunbeamLayout', 'labelLayout'
  );
  chart.options = nv.utils.optionsFunc.bind(chart);

  nv.utils.rebindp(chart, pieChart, PieChart.prototype,
      'margin', 'width', 'height', 'color', 'tooltips', 'tooltipContent', 'showLegend', 'duration', 'noData', 'state'
  );

  return chart;
};
var ScatterPrivates = {
    id           : Math.floor(Math.random() * 100000) //Create semi-unique ID incase user doesn't select one
    , xScale       : d3.scale.linear()
    , yScale       : d3.scale.linear()
    , zScale       : d3.scale.linear() //linear because d3.svg.shape.size is treated as area
    , getSize      : function(d) { return d.size || 1} // accessor to get the point size
    , getShape     : function(d) { return d.shape || 'circle' } // accessor to get point shape
    , onlyCircles  : true // Set to false to use shapes
    , forceX       : [] // List of numbers to Force into the X scale (ie. 0, or a max / min, etc.)
    , forceY       : [] // List of numbers to Force into the Y scale
    , forceSize    : [] // List of numbers to Force into the Size scale
    , interactive  : true // If true, plots a voronoi overlay for advanced point intersection
    , pointKey     : null
    , pointActive  : function(d) { return !d.notActive } // any points that return false will be filtered out
    , padData      : false // If true, adds half a data points width to front and back, for lining up a line chart with a bar chart
    , padDataOuter : .1 //outerPadding to imitate ordinal scale outer padding
    , clipEdge     : false // if true, masks points within x and y scale
    , clipVoronoi  : true // if true, masks each point with a circle... can turn off to slightly increase performance
    , clipRadius   : function() { return 25 } // function to get the radius for voronoi point clips
    , xDomain      : null // Override x domain (skips the calculation from data)
    , yDomain      : null // Override y domain
    , xRange       : null // Override x range
    , yRange       : null // Override y range
    , sizeDomain   : null // Override point size domain
    , sizeRange    : null
    , singlePoint  : false
    , xScale0      : null
    , yScale0      : null
    , zScale0      : null // used to store previous scales
    , timeoutID    : null
    , needsUpdate  : false // Flag for when the points are visually updating, but the interactive layer is behind, to disable tooltips
    , useVoronoi   : true
    , duration     : 250
};

/**
 * A Scatter
 */
function Scatter(options){
    options = nv.utils.extend({}, options, ScatterPrivates, {
        margin: {top: 0, right: 0, bottom: 0, left: 0}
        , width: 960
        , height: 500
        , chartClass: 'scatter'
        , wrapClass: 'scatterWrap'
    });

    Layer.call(this, options, ['elementClick', 'elementMouseover', 'elementMouseout']);
}

nv.utils.create(Scatter, Layer, ScatterPrivates);

/**
 * @override Layer::wrapper
 */
Scatter.prototype.wrapper = function(data){

    var gs = ['nv-groups', 'nv-point-paths'];
    var chartClass = 'nv-' + this.options.chartClass;
    var wrapClass = 'nv-' + this.options.wrapClass;

    this.wrap = this.svg.selectAll('g.nv-wrap.' + wrapClass).data([data]);
    this.wrapEnter = this.wrap.enter().append('g').attr('class', 'nvd3 nv-wrap '+chartClass+'nv-chart-' + this.id() + (this.singlePoint() ? ' nv-single-point' : ''));
    this.defsEnter = this.wrapEnter.append('defs');
    this.gEnter = this.wrapEnter.append('g');
    this.g = this.wrap.select('g');

    gs.concat([wrapClass]).forEach(function(g){
        this.gEnter.append('g').attr('class', g);
    }, this);

    this.defsEnter.append('clipPath')
        .attr('id', 'nv-edge-clip-' + this.id())
        .append('rect');

    this.wrap.select('#nv-edge-clip-' + this.id() + ' rect')
        .attr('width', this.available.width)
        .attr('height', (this.available.height > 0) ? this.available.height : 0);

    this.g.attr('clip-path', this.clipEdge() ? 'url(#nv-edge-clip-' + this.id() + ')' : '');

    this.wrap.attr('transform', 'translate(' + this.margin().left + ',' + this.margin().top + ')');

    this.renderWatch = nv.utils.renderWatch(this.dispatch, this.duration())    ;
};

/**
 * @override Layer::draw
 */
Scatter.prototype.draw = function(data){
    var that = this
        , availableWidth = this.available.width
        , availableHeight = this.available.height;

    //add series index to each data point for reference
    data.forEach(function(series, i) {
        series.values.forEach(function(point) {
            point.series = i;
        });
    });

    //------------------------------------------------------------
    // Setup Scales

    // remap and flatten the data for use in calculating the scales' domains
    var seriesData = (this.xDomain() && this.yDomain() && this.sizeDomain()) ? [] : // if we know xDomain and yDomain and sizeDomain, no need to calculate.... if Size is constant remember to set sizeDomain to speed up performance
        d3.merge(
            data.map(function(d) {
                return d.values.map(function(d,i) {
                    return { x: that.x()(d,i), y: that.y()(d,i), size: that.getSize()(d,i) }
                })
            })
        );

    this.xScale().domain(this.xDomain() || d3.extent(seriesData.map(function(d) { return d.x; }).concat(this.forceX())));

    if (this.padData() && data[0])
        this.xScale().range(
            this.xRange() || [(availableWidth * this.padDataOuter() +  availableWidth) / (2 *data[0].values.length), availableWidth - availableWidth * (1 + this.padDataOuter()) / (2 * data[0].values.length)  ]
        );
    //x.range([availableWidth * .5 / data[0].values.length, availableWidth * (data[0].values.length - .5)  / data[0].values.length ]);
    else
        this.xScale().range(this.xRange() || [0, availableWidth]);

    this.yScale().domain(this.yDomain() || d3.extent(seriesData.map(function(d) { return d.y }).concat(this.forceY())))
        .range(this.yRange() || [availableHeight, 0]);

    this.zScale().domain(this.sizeDomain() || d3.extent(seriesData.map(function(d) { return d.size }).concat(this.forceSize())))
        .range(this.sizeRange() || [16, 256]);

    // If scale's domain don't have a range, slightly adjust to make one... so a chart can show a single data point
    if (this.xScale().domain()[0] === this.xScale().domain()[1] || this.yScale().domain()[0] === this.yScale().domain()[1]) this.singlePoint(true);
    if (this.xScale().domain()[0] === this.xScale().domain()[1])
        this.xScale().domain()[0] ?
            this.xScale().domain([this.xScale().domain()[0] - this.xScale().domain()[0] * 0.01, this.xScale().domain()[1] + this.xScale().domain()[1] * 0.01])
            : this.xScale().domain([-1,1]);

    if (this.yScale().domain()[0] === this.yScale().domain()[1])
        this.yScale().domain()[0] ?
            this.yScale().domain([this.yScale().domain()[0] - this.yScale().domain()[0] * 0.01, this.yScale().domain()[1] + this.yScale().domain()[1] * 0.01])
            : this.yScale().domain([-1,1]);

    if ( isNaN(this.xScale().domain()[0])) {
        this.xScale().domain([-1,1]);
    }

    if ( isNaN(this.yScale().domain()[0])) {
        this.yScale().domain([-1,1]);
    }


    this.xScale0(this.xScale0() || this.xScale());
    this.yScale0(this.yScale0() || this.yScale());
    this.zScale0(this.zScale0() || this.zScale());

    function updateInteractiveLayer() {
        if (!that.interactive()) return false;

        var eventElements;

        var vertices = d3.merge(data.map(function(group, groupIndex) {
            return group.values
                .map(function(point, pointIndex) {
                    // *Adding noise to make duplicates very unlikely
                    // *Injecting series and point index for reference
                    /* *Adding a 'jitter' to the points, because there's an issue in d3.geom.voronoi.
                     */
                    var pX = that.x()(point,pointIndex);
                    var pY = that.y()(point,pointIndex);

                    return [that.xScale()(pX)+ Math.random() * 1e-7,
                        that.yScale()(pY)+ Math.random() * 1e-7,
                        groupIndex,
                        pointIndex, point]; //temp hack to add noise untill I think of a better way so there are no duplicates
                })
                .filter(function(pointArray, pointIndex) {
                    return that.pointActive()(pointArray[4], pointIndex); // Issue #237.. move filter to after map, so pointIndex is correct!
                })
            })
        );

        //inject series and point index for reference into voronoi
        if (that.useVoronoi() === true) {

            if (that.clipVoronoi()) {
                var pointClipsEnter = that.wrap.select('defs').selectAll('.nv-point-clips')
                    .data([that.id()])
                    .enter();

                pointClipsEnter.append('clipPath')
                    .attr('class', 'nv-point-clips')
                    .attr('id', 'nv-points-clip-' + that.id());

                var pointClips = that.wrap.select('#nv-points-clip-' + that.id()).selectAll('circle')
                    .data(vertices);
                pointClips.enter().append('circle')
                    .attr('r', that.clipRadius());
                pointClips.exit().remove();
                pointClips
                    .attr('cx', function(d) { return d[0] })
                    .attr('cy', function(d) { return d[1] });

                that.wrap.select('.nv-point-paths')
                    .attr('clip-path', 'url(#nv-points-clip-' + that.id() + ')');
            }

            if(vertices.length) {
                // Issue #283 - Adding 2 dummy points to the voronoi b/c voronoi requires min 3 points to work
                vertices.push([that.xScale().range()[0] - 20, that.yScale().range()[0] - 20, null, null]);
                vertices.push([that.xScale().range()[1] + 20, that.yScale().range()[1] + 20, null, null]);
                vertices.push([that.xScale().range()[0] - 20, that.yScale().range()[0] + 20, null, null]);
                vertices.push([that.xScale().range()[1] + 20, that.yScale().range()[1] - 20, null, null]);
            }

            var bounds = d3.geom.polygon([
                [-10, -10],
                [-10, that.height() + 10],
                [that.width() + 10, that.height() + 10],
                [that.width() + 10, -10]
            ]);

            var voronoi = d3.geom.voronoi(vertices).map(function(d, i) {
                return {
                    'data': bounds.clip(d),
                    'series': vertices[i][2],
                    'point': vertices[i][3]
                }
            });


            var pointPaths = that.wrap.select('.nv-point-paths').selectAll('path')
                .data(voronoi);
            pointPaths.enter().append('path')
                .attr('class', function(d,i) { return 'nv-path-'+i; });
            pointPaths.exit().remove();
            pointPaths
                .attr('d', function(d) {
                    if (d.data.length === 0)
                        return 'M 0 0'
                    else
                        return 'M' + d.data.join('L') + 'Z';
                });

            var mouseEventCallback = function(d,mDispatch) {
                if (that.needsUpdate()) return 0;
                var series = data[d.series];
                if (typeof series === 'undefined') return;

                var point  = series.values[d.point];

                mDispatch({
                    point: point,
                    series: series,
                    pos: [that.xScale()(that.x()(point, d.point)) + that.margin().left, that.yScale()(that.y()(point, d.point)) + that.margin().top],
                    seriesIndex: d.series,
                    pointIndex: d.point
                });
            };

            pointPaths
                .on('click', function(d) {
                    mouseEventCallback(d, that.dispatch.elementClick);
                })
                .on('mouseover', function(d) {
                    mouseEventCallback(d, that.dispatch.elementMouseover);
                })
                .on('mouseout', function(d, i) {
                    mouseEventCallback(d, that.dispatch.elementMouseout);
                });


        } else {
            /*
             // bring data in form needed for click handlers
             var dataWithPoints = vertices.map(function(d, i) {
             return {
             'data': d,
             'series': vertices[i][2],
             'point': vertices[i][3]
             }
             });
             */

            // add event handlers to points instead voronoi paths
            that.wrap.select('.nv-groups').selectAll('.nv-group')
                .selectAll('.nv-point')
                //.data(dataWithPoints)
                //.style('pointer-events', 'auto') // recativate events, disabled by css
                .on('click', function(d,i) {
                    //nv.log('test', d, i);
                    if (that.needsUpdate() || !data[d.series]) return 0; //check if this is a dummy point
                    var series = data[d.series],
                        point  = series.values[i];

                    that.dispatch.elementClick({
                        point: point,
                        series: series,
                        pos: [that.xScale()(that.x()(point, i)) + that.margin().left, that.yScale()(that.y()(point, i)) + that.margin().top],
                        seriesIndex: d.series,
                        pointIndex: i
                    });
                })
                .on('mouseover', function(d,i) {
                    if (that.needsUpdate() || !data[d.series]) return 0; //check if this is a dummy point
                    var series = data[d.series],
                        point  = series.values[i];

                    that.dispatch.elementMouseover({
                        point: point,
                        series: series,
                        pos: [that.xScale()(that.x()(point, i)) + that.margin().left, that.yScale()(that.y()(point, i)) + that.margin().top],
                        seriesIndex: d.series,
                        pointIndex: i
                    });
                })
                .on('mouseout', function(d,i) {
                    if (that.needsUpdate() || !data[d.series]) return 0; //check if this is a dummy point
                    var series = data[d.series],
                        point  = series.values[i];

                    that.dispatch.elementMouseout({
                        point: point,
                        series: series,
                        seriesIndex: d.series,
                        pointIndex: i
                    });
                });
        }

        that.needsUpdate(false);
    }

    this.needsUpdate(true);
    var groups = this.wrap.select('.nv-groups').selectAll('.nv-group')
        .data(function(d) { return d }, function(d) { return d.key });
    groups.enter().append('g')
        .style('stroke-opacity', 1e-6)
        .style('fill-opacity', 1e-6);
    groups.exit()
        .remove();
    groups
        .attr('class', function(d,i) { return 'nv-group nv-series-' + i })
        .classed('hover', function(d) { return d.hover });
    groups.watchTransition(this.renderWatch, 'scatter: groups')
        .style('fill', function(d,i) { return that.color()(d, i) })
        .style('stroke', function(d,i) { return that.color()(d, i) })
        .style('stroke-opacity', 1)
        .style('fill-opacity', .5);

    if (this.onlyCircles()) {
        var points = groups.selectAll('circle.nv-point')
            .data(function(d) { return d.values }, this.pointKey());
        points.enter().append('circle')
            .style('fill', function (d,i) { return d.color })
            .style('stroke', function (d,i) { return d.color })
            .attr('cx', function(d,i) { return nv.utils.NaNtoZero(that.xScale0()(that.x()(d,i))) })
            .attr('cy', function(d,i) { return nv.utils.NaNtoZero(that.yScale0()(that.y()(d,i))) })
            .attr('r', function(d,i) { return Math.sqrt(that.zScale()(that.getSize()(d,i))/Math.PI) });
        points.exit().remove();
        groups.exit().selectAll('path.nv-point')
            .watchTransition(this.renderWatch, 'scatter exit')
            .attr('cx', function(d,i) { return nv.utils.NaNtoZero(that.xScale()(that.x()(d,i))) })
            .attr('cy', function(d,i) { return nv.utils.NaNtoZero(that.yScale()(that.y()(d,i))) })
            .remove();
        points.each(function(d,i) {
            d3.select(this)
                .classed('nv-point', true)
                .classed('nv-point-' + i, true)
                .classed('hover',false)
            ;
        });
        points
            .watchTransition(this.renderWatch, 'scatter points')
            .attr('cx', function(d,i) { return nv.utils.NaNtoZero(that.xScale()(that.x()(d,i))) })
            .attr('cy', function(d,i) { return nv.utils.NaNtoZero(that.yScale()(that.y()(d,i))) })
            .attr('r', function(d,i) { return Math.sqrt(that.zScale()(that.getSize()(d,i))/Math.PI) });

    } else {

        var points = groups.selectAll('path.nv-point')
            .data(function(d) { return d.values });
        points.enter().append('path')
            .style('fill', function (d,i) { return d.color })
            .style('stroke', function (d,i) { return d.color })
            .attr('transform', function(d,i) {
                return 'translate(' + that.xScale0()(that.x()(d,i)) + ',' + that.yScale0()(that.y()(d,i)) + ')'
            })
            .attr('d',
                d3.svg.symbol()
                    .type(that.getShape())
                    .size(function(d,i) { return that.zScale()(that.getSize()(d,i)) })
            );
        points.exit().remove();
        groups.exit().selectAll('path.nv-point')
            .watchTransition(that.renderWatch, 'scatter exit')
            .attr('transform', function(d,i) {
                return 'translate(' + that.xScale()(that.x()(d,i)) + ',' + that.yScale()(that.y()(d,i)) + ')'
            })
            .remove();
        points.each(function(d,i) {
            d3.select(this)
                .classed('nv-point', true)
                .classed('nv-point-' + i, true)
                .classed('hover',false)
            ;
        });
        points
            .watchTransition(this.renderWatch, 'scatter points')
            .attr('transform', function(d,i) {
                //nv.log(d,i,getX(d,i), x(getX(d,i)));
                return 'translate(' + that.xScale()(that.x()(d,i)) + ',' + that.yScale()(that.y()(d,i)) + ')'
            })
            .attr('d',
                d3.svg.symbol()
                    .type(this.getShape())
                    .size(function(d,i) { return that.zScale()(that.getSize()(d,i)) })
            );
    }

    // Delay updating the invisible interactive layer for smoother animation
    clearTimeout(this.timeoutID()); // stop repeat calls to updateInteractiveLayer
    this.timeoutID( setTimeout(updateInteractiveLayer, 300) );
    //updateInteractiveLayer();

    //store old scales for use in transitions on update
    this.xScale0(this.xScale().copy());
    this.yScale0(this.yScale().copy());
    this.zScale0(this.zScale().copy());
};

/**
 * @override Layer::attachEvents
 */
Scatter.prototype.attachEvents = function(){
    this.dispatch
        .on('elementMouseover.point', function(d) {
            if (this.interactive()) this.highlightPoint(d.seriesIndex,d.pointIndex,true);
        }.bind(this))
        .on('elementMouseout.point', function(d) {
            if (this.interactive()) this.highlightPoint(d.seriesIndex,d.pointIndex,false);
        }.bind(this));
};

Scatter.prototype.clearHighlights = function() {
    //Remove the 'hover' class from all highlighted points.
    d3.selectAll(".nv-chart-" + this.id() + " .nv-point.hover").classed("hover",false);
};

Scatter.prototype.highlightPoint = function(seriesIndex,pointIndex,isHoverOver) {
    d3.select(".nv-chart-" + this.id() + " .nv-series-" + seriesIndex + " .nv-point-" + pointIndex)
        .classed("hover", isHoverOver);
};

Scatter.prototype.useVoronoi= function(_) {
    if (!arguments.length) return this.options.useVoronoi;
    this.options.useVoronoi = _;
    if (this.useVoronoi() === false) {
        this.clipVoronoi(false);
    }
    return this;
};

Scatter.prototype.color = function(_) {
    if (!arguments.length) return this.options.color;
    this.options.color = nv.utils.getColor(_);
    return this;
};

Scatter.prototype.duration = function(_) {
    if (!arguments.length) return this.options.duration;
    this.options.duration = _;
    this.renderWatch.reset(_);
    return this;
};

/**
 * The scatter model returns a function wrapping an instance of a Scatter.
 */
nv.models.scatter = function () {
    "use strict";

    var scatter = new Scatter();

    function chart(selection) {
        scatter.render(selection);
        return chart;
    }

    chart.dispatch = scatter.dispatch;

    chart.options = nv.utils.optionsFunc.bind(chart);

    nv.utils.rebindp(chart, scatter, Scatter.prototype,
        'x', 'y', 'size', 'margin', 'width', 'height', 'xScale', 'yScale', 'zScale', 'xDomain', 'yDomain', 'sizeDomain',
        'xRange', 'yRange', 'sizeRange', 'forceX', 'forceY', 'forceSize', 'interactive', 'pointKey', 'pointActive',
        'padData', 'padDataOuter', 'clipEdge', 'clipVoronoi', 'useVoronoi', 'clipRadius', 'color', 'shape', 'onlyCircles',
        'id', 'singlePoint', 'duration'
    );

    return chart;
};
var ScatterChartPrivates = {
    xScale         : null
    , yScale       : null
    , xPadding     : 0
    , yPadding     : 0
    , showDistX    : false
    , showDistY    : false
    , showXAxis    : true
    , showYAxis    : true
    , rightAlignYAxis : false
    , showControls : !!d3.fisheye
    , fisheye      : 0
    , pauseFisheye : false
    , tooltips     : true
    , tooltipX     : function(key, x) { return '<strong>' + x + '</strong>' }
    , tooltipY     : function(key, x, y) { return '<strong>' + y + '</strong>' }
    , tooltip      : null
    , defaultState : null
    , transitionDuration : 250
    , controlsData : [ { key: 'Magnify', disabled: true } ]
    , xScale0: null
    , yScale0: null
    , duration : 250
};

/**
 * A ScatterChart
 */
function ScatterChart(options){
    options = nv.utils.extend({}, options, ScatterChartPrivates, {
        margin: {top: 30, right: 20, bottom: 50, left: 75}
        , chartClass: 'scatterChart'
        , wrapClass: 'scatterWrap'
    });
    Chart.call(this, options);

    this.scatter = nv.models.scatter();
    this.distX = this.getDistribution();
    this.distY = this.getDistribution();
    this.controls = this.getControls();
    this.state = this.getStatesManager();

    this.xScale( d3.fisheye ? d3.fisheye.scale(d3.scale.linear).distortion(0) : this.scatter.xScale() );
    this.yScale( d3.fisheye ? d3.fisheye.scale(d3.scale.linear).distortion(0) : this.scatter.yScale() );

    this.scatter
        .xScale(this.xScale())
        .yScale(this.yScale())
    ;
    this.distX
        .axis('x')
    ;
    this.distY
        .axis('y')
    ;

    this.controls.updateState(false);
}

nv.utils.create(ScatterChart, Chart, ScatterChartPrivates);

ScatterChart.prototype.getControls = function(){
    return nv.models.legend();
};

ScatterChart.prototype.getDistribution = function(){
    return nv.models.distribution();
};

/**
 * @override Layer::wrapper
 */
ScatterChart.prototype.wrapper = function (data) {
    Chart.prototype.wrapper.call(this, data, ['nv-distWrap', 'nv-controlsWrap']);

    this.renderWatch = nv.utils.renderWatch(this.dispatch, this.duration());

    this.renderWatch.models(this.scatter);
    if (this.showXAxis()) this.renderWatch.models(this.xAxis());
    if (this.showYAxis()) this.renderWatch.models(this.yAxis());
    if (this.showDistX()) this.renderWatch.models(this.distX);
    if (this.showDistY()) this.renderWatch.models(this.distY);
};

/**
 * @override Layer::draw
 */
ScatterChart.prototype.draw = function(data){

    var that = this;

    this.xScale0(this.xScale0() || this.xScale());
    this.yScale0(this.yScale0() || this.yScale());

    //------------------------------------------------------------
    // Main Chart Component(s)

    this.scatter
        .margin({top: 0, right: 0, bottom: 0, left: 0})
        .width(this.available.width)
        .height(this.available.height)
        .color(data.map(function(d,i) {
            return d.color || that.color()(d, i);
        }).filter(function(d,i) { return !data[i].disabled }));

    if (this.xPadding() !== 0)
        this.scatter.xDomain(null);

    if (this.yPadding() !== 0)
        this.scatter.yDomain(null);

    this.wrap.select('.nv-scatterWrap')
        .datum(data.filter(function(d) { return !d.disabled }))
        .call(this.scatter);

    //Adjust for x and y padding
    if (this.xPadding() !== 0) {
        var xRange = this.xScale().domain()[1] - this.xScale().domain()[0];
        this.scatter.xDomain([this.xScale().domain()[0] - (this.xPadding() * xRange), this.xScale().domain()[1] + (this.xPadding() * xRange)]);
    }

    if (this.yPadding() !== 0) {
        var yRange = this.yScale().domain()[1] - this.yScale().domain()[0];
        this.scatter.yDomain([this.yScale().domain()[0] - (this.yPadding() * yRange), this.yScale().domain()[1] + (this.yPadding() * yRange)]);
    }

    //Only need to update the scatter again if x/yPadding changed the domain.
    if (this.yPadding() !== 0 || this.xPadding() !== 0) {
        this.wrap.select('.nv-scatterWrap')
            .datum(data.filter(function(d) { return !d.disabled }))
            .call(this.scatter);
    }

    //------------------------------------------------------------

    if (this.showDistX()) {
        this.distX
            .margin({top: 0, right: 0, bottom: 0, left: 0})
            .getData(this.scatter.x())
            .scale(this.xScale())
            .width(this.available.width)
            .color(data.map(function(d,i) {
                return d.color || that.color()(d, i);
            }).filter(function(d,i) { return !data[i].disabled }));
        this.gEnter.select('.nv-distWrap').append('g')
            .attr('class', 'nv-distributionX');
        this.g.select('.nv-distributionX')
            .attr('transform', 'translate(0,' + this.yScale().range()[0] + ')')
            .datum(data.filter(function(d) { return !d.disabled }))
            .call(this.distX);
    }

    if (this.showDistY()) {
        this.distY
            .margin({top: 0, right: 0, bottom: 0, left: 0})
            .getData(this.scatter.y())
            .scale(this.yScale())
            .width(this.available.height)
            .color(data.map(function(d,i) {
                return d.color || that.color()(d, i);
            }).filter(function(d,i) { return !data[i].disabled }));
        this.gEnter.select('.nv-distWrap').append('g')
            .attr('class', 'nv-distributionY');
        this.g.select('.nv-distributionY')
            .attr('transform',
                'translate(' + (this.rightAlignYAxis() ? this.available.width : -this.distY.size() ) + ',0)')
            .datum(data.filter(function(d) { return !d.disabled }))
            .call(this.distY);
    }

    //------------------------------------------------------------

    if (d3.fisheye) {
        this.g.select('.nv-background')
            .attr('width', this.available.width)
            .attr('height', this.available.height);

        this.g.select('.nv-background').on('mousemove', updateFisheye);
        this.g.select('.nv-background').on('click', function() { that.pauseFisheye(!that.pauseFisheye());});
        this.scatter.dispatch.on('elementClick.freezeFisheye', function() { that.pauseFisheye(!that.pauseFisheye()) });
    }

    function updateFisheye() {
        if (that.pauseFisheye()) {
            that.g.select('.nv-point-paths').style('pointer-events', 'all');
            return false;
        }

        that.g.select('.nv-point-paths').style('pointer-events', 'none' );

        var mouse = d3.mouse(this);
        that.xScale().distortion(that.fisheye()).focus(mouse[0]);
        that.yScale().distortion(that.fisheye()).focus(mouse[1]);

        that.g.select('.nv-scatterWrap')
            .call(that.scatter);

        if (that.showXAxis())
            that.g.select('.nv-x.nv-axis').call(that.xAxis());

        if (that.showYAxis())
            that.g.select('.nv-y.nv-axis').call(that.yAxis());

        that.g.select('.nv-distributionX')
            .datum(data.filter(function(d) { return !d.disabled }))
            .call(that.distX);
        that.g.select('.nv-distributionY')
            .datum(data.filter(function(d) { return !d.disabled }))
            .call(that.distY);
    }

    //store old scales for use in transitions on update
    this.xScale0(this.xScale().copy());
    this.yScale0(this.yScale().copy());

    Chart.prototype.draw.call(this, data);
};

/**
 * Set up listeners for dispatches fired on the underlying
 * multiBar graph.
 *
 * @override Layer::attachEvents
 */
ScatterChart.prototype.attachEvents = function(){
    Chart.prototype.attachEvents.call(this);

    var that = this;

    this.scatter.dispatch.on('elementMouseout.tooltip', function(e) {
        this.dispatch.tooltipHide(e);
        d3.select('.nv-chart-' + this.scatter.id() + ' .nv-series-' + e.seriesIndex + ' .nv-distx-' + e.pointIndex)
            .attr('y1', 0);
        d3.select('.nv-chart-' + this.scatter.id() + ' .nv-series-' + e.seriesIndex + ' .nv-disty-' + e.pointIndex)
            .attr('x2', this.distY.size());
    }.bind(this));

    this.dispatch.on('tooltipHide', function() {
        if (this.tooltips()) nv.tooltip.cleanup();
    }.bind(this));

    this.controls.dispatch.on('legendClick', function(d) {
        d.disabled = !d.disabled;

        that.fisheye(d.disabled ? 0 : 2.5);
        that.g.select('.nv-background') .style('pointer-events', d.disabled ? 'none' : 'all');
        that.g.select('.nv-point-paths').style('pointer-events', d.disabled ? 'all' : 'none' );

        if (d.disabled) {
            that.xScale().distortion(that.fisheye()).focus(0);
            that.yScale().distortion(that.fisheye()).focus(0);
            that.g.select('.nv-scatterWrap').call(that.scatter);
            that.g.select('.nv-x.nv-axis').call(that.xAxis());
            that.g.select('.nv-y.nv-axis').call(that.yAxis());
        } else
            that.pauseFisheye(false);

        that.update();
    });

    that.legend.dispatch.on('stateChange', function(newState) {
        that.state.disabled = newState.disabled;
        that.dispatch.stateChange(that.state);
        that.update();
    });

    that.scatter.dispatch.on('elementMouseover.tooltip', function(e) {
        d3.select('.nv-chart-' + that.scatter.id() + ' .nv-series-' + e.seriesIndex + ' .nv-distx-' + e.pointIndex)
            .attr('y1', function() { return e.pos[1] - that.available().height;});
        d3.select('.nv-chart-' + that.scatter.id() + ' .nv-series-' + e.seriesIndex + ' .nv-disty-' + e.pointIndex)
            .attr('x2', e.pos[0] + that.distX.size());

        e.pos = [e.pos[0] + that.margin().left, e.pos[1] + that.margin().top];
        that.dispatch.tooltipShow(e);
    });

    this.dispatch.on('tooltipShow', function(e) {
        if (that.tooltips())
            that.showTooltip(e, that.svg[0][0]);
    });

    // Update chart from a state object passed to event handler
    that.dispatch.on('changeState', function(e) {
        if (typeof e.disabled !== 'undefined') {
            that.svg.call(function(selection){
                selection.each(function(data){
                    data.forEach(function(series,i) {
                        series.disabled = e.disabled[i];
                    });
                    that.state.disabled = e.disabled;
                })
            });
        }
        that.update();
    });
};

ScatterChart.prototype.showTooltip = function(e, offsetElement) {
    //TODO: make tooltip style an option between single or dual on axes (maybe on all charts with axes?)

    var left = e.pos[0] + ( offsetElement.offsetLeft || 0 ),
        top = e.pos[1] + ( offsetElement.offsetTop || 0),
        leftX = e.pos[0] + ( offsetElement.offsetLeft || 0 ),
        topX = this.yScale().range()[0] + this.margin().top + ( offsetElement.offsetTop || 0),
        leftY = this.xScale().range()[0] + this.margin().left + ( offsetElement.offsetLeft || 0 ),
        topY = e.pos[1] + ( offsetElement.offsetTop || 0),
        xVal = this.xAxis().tickFormat()(this.scatter.x()(e.point, e.pointIndex)),
        yVal = this.yAxis().tickFormat()(this.scatter.y()(e.point, e.pointIndex));

    if( this.tooltipX() != null )
        nv.tooltip.show([leftX, topX], this.tooltipX()(e.series.key, xVal, yVal, e, this), 'n', 1, offsetElement, 'x-nvtooltip');
    if( this.tooltipY() != null )
        nv.tooltip.show([leftY, topY], this.tooltipY()(e.series.key, xVal, yVal, e, this), 'e', 1, offsetElement, 'y-nvtooltip');
    if( this.tooltip() != null )
        nv.tooltip.show([left, top], this.tooltip()(e.series.key, xVal, yVal, e, this), e.value < 0 ? 'n' : 's', null, offsetElement);
};

ScatterChart.prototype.color = function(_) {
    if (!arguments.length) return this.options.color;
    this.options.color = nv.utils.getColor(_);
    this.legend.color(this.color());
    this.distX.color(this.color());
    this.distY.color(this.color());
    return this;
};

ScatterChart.prototype.tooltipContent = function(_) {
    if (!arguments.length) return this.tooltip();
    this.tooltip(_);
    return this;
};

ScatterChart.prototype.duration = function(_) {
    if (!arguments.length) return this.options.duration;
    this.options.duration = _;
    this.renderWatch.reset(_);
    this.scatter.duration(_);
    this.xAxis().duration(_);
    this.yAxis().duration(_);
    this.distX.duration(_);
    this.distY.duration(_);
    return this;
};

/**
 * The scatterChart model returns a function wrapping an instance of a ScatterChart.
 */
nv.models.scatterChart = function() {
    "use strict";

    var scatterChart = new ScatterChart();

    function chart(selection) {
        scatterChart.render(selection);
        return chart;
    }

    chart.dispatch = scatterChart.dispatch;
    chart.scatter = scatterChart.scatter;
    chart.legend = scatterChart.legend;
    chart.controls = scatterChart.controls;
    chart.distX = scatterChart.distX;
    chart.distY = scatterChart.distY;

    d3.rebind(chart, scatterChart.scatter,
        'id', 'interactive', 'pointActive', 'x', 'y', 'shape', 'size', 'xScale', 'yScale', 'zScale', 'xDomain',
        'yDomain', 'xRange', 'yRange', 'sizeDomain', 'sizeRange', 'forceX', 'forceY', 'forceSize', 'clipVoronoi',
        'clipRadius', 'useVoronoi'
    );

    chart.options = nv.utils.optionsFunc.bind(chart);

    nv.utils.rebindp(chart, scatterChart, ScatterChart.prototype,
        'duration', 'tooltipContent', 'color', 'margin', 'width', 'height', 'showDistX', 'showDistY', 'showControls',
        'showLegend', 'showXAxis', 'showYAxis', 'rightAlignYAxis', 'fisheye', 'xPadding', 'yPadding', 'tooltips',
        'tooltipXContent', 'tooltipYContent', 'state', 'defaultState', 'noData', 'xAxis', 'yAxis'
    );

    return chart;
};

nv.models.scatterPlusLineChart = function() {
  "use strict";
  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var scatter      = nv.models.scatter()
    , xAxis        = nv.models.axis()
    , yAxis        = nv.models.axis()
    , legend       = nv.models.legend()
    , controls     = nv.models.legend()
    , distX        = nv.models.distribution()
    , distY        = nv.models.distribution()
    ;

  var margin       = {top: 30, right: 20, bottom: 50, left: 75}
    , width        = null
    , height       = null
    , color        = nv.utils.defaultColor()
    , x            = d3.fisheye ? d3.fisheye.scale(d3.scale.linear).distortion(0) : scatter.xScale()
    , y            = d3.fisheye ? d3.fisheye.scale(d3.scale.linear).distortion(0) : scatter.yScale()
    , showDistX    = false
    , showDistY    = false
    , showLegend   = true
    , showXAxis    = true
    , showYAxis    = true
    , rightAlignYAxis = false
    , showControls = !!d3.fisheye
    , fisheye      = 0
    , pauseFisheye = false
    , tooltips     = true
    , tooltipX     = function(key, x, y) { return '<strong>' + x + '</strong>' }
    , tooltipY     = function(key, x, y) { return '<strong>' + y + '</strong>' }
    , tooltip      = function(key, x, y, date) { return '<h3>' + key + '</h3>'
                                                      + '<p>' + date + '</p>' }
    , state = {}
    , defaultState = null
    , dispatch = d3.dispatch('tooltipShow', 'tooltipHide', 'stateChange', 'changeState', 'renderEnd')
    , noData       = "No Data Available."
    , duration = 250
    ;

  scatter
    .xScale(x)
    .yScale(y)
    ;
  xAxis
    .orient('bottom')
    .tickPadding(10)
    ;
  yAxis
    .orient((rightAlignYAxis) ? 'right' : 'left')
    .tickPadding(10)
    ;
  distX
    .axis('x')
    ;
  distY
    .axis('y')
    ;

  controls.updateState(false);
  //============================================================


  //============================================================
  // Private Variables
  //------------------------------------------------------------

  var x0, y0
    , renderWatch = nv.utils.renderWatch(dispatch, duration)
    ;

  var showTooltip = function(e, offsetElement) {
    //TODO: make tooltip style an option between single or dual on axes (maybe on all charts with axes?)

    var left = e.pos[0] + ( offsetElement.offsetLeft || 0 ),
        top = e.pos[1] + ( offsetElement.offsetTop || 0),
        leftX = e.pos[0] + ( offsetElement.offsetLeft || 0 ),
        topX = y.range()[0] + margin.top + ( offsetElement.offsetTop || 0),
        leftY = x.range()[0] + margin.left + ( offsetElement.offsetLeft || 0 ),
        topY = e.pos[1] + ( offsetElement.offsetTop || 0),
        xVal = xAxis.tickFormat()(scatter.x()(e.point, e.pointIndex)),
        yVal = yAxis.tickFormat()(scatter.y()(e.point, e.pointIndex));

      if( tooltipX != null )
          nv.tooltip.show([leftX, topX], tooltipX(e.series.key, xVal, yVal, e, chart), 'n', 1, offsetElement, 'x-nvtooltip');
      if( tooltipY != null )
          nv.tooltip.show([leftY, topY], tooltipY(e.series.key, xVal, yVal, e, chart), 'e', 1, offsetElement, 'y-nvtooltip');
      if( tooltip != null )
          nv.tooltip.show([left, top], tooltip(e.series.key, xVal, yVal, e.point.tooltip, e, chart), e.value < 0 ? 'n' : 's', null, offsetElement);
  };

  var controlsData = [
    { key: 'Magnify', disabled: true }
  ];

  //============================================================


  function chart(selection) {
    renderWatch.reset();
    renderWatch.models(scatter);
    if (showXAxis) renderWatch.models(xAxis);
    if (showYAxis) renderWatch.models(yAxis);
    if (showDistX) renderWatch.models(distX);
    if (showDistY) renderWatch.models(distY);

    selection.each(function(data) {
      var container = d3.select(this),
          that = this;

      var availableWidth = (width  || parseInt(container.style('width')) || 960)
                             - margin.left - margin.right,
          availableHeight = (height || parseInt(container.style('height')) || 400)
                             - margin.top - margin.bottom;

      chart.update = function() {
        if (duration === 0)
          container.call(chart);
        else
          container.transition().duration(duration).call(chart);
      };
      chart.container = this;

      //set state.disabled
      state.disabled = data.map(function(d) { return !!d.disabled });

      if (!defaultState) {
        var key;
        defaultState = {};
        for (key in state) {
          if (state[key] instanceof Array)
            defaultState[key] = state[key].slice(0);
          else
            defaultState[key] = state[key];
        }
      }

      //------------------------------------------------------------
      // Display noData message if there's nothing to show.

      if (!data || !data.length || !data.filter(function(d) { return d.values.length }).length) {
        var noDataText = container.selectAll('.nv-noData').data([noData]);

        noDataText.enter().append('text')
          .attr('class', 'nvd3 nv-noData')
          .attr('dy', '-.7em')
          .style('text-anchor', 'middle');

        noDataText
          .attr('x', margin.left + availableWidth / 2)
          .attr('y', margin.top + availableHeight / 2)
          .text(function(d) { return d });
        
        renderWatch.renderEnd('scatter immediate');
        
        return chart;
      } else {
        container.selectAll('.nv-noData').remove();
      }

      //------------------------------------------------------------


      //------------------------------------------------------------
      // Setup Scales

      x = scatter.xScale();
      y = scatter.yScale();

      x0 = x0 || x;
      y0 = y0 || y;

      //------------------------------------------------------------


      //------------------------------------------------------------
      // Setup containers and skeleton of chart

      var wrap = container.selectAll('g.nv-wrap.nv-scatterChart').data([data]);
      var wrapEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap nv-scatterChart nv-chart-' + scatter.id());
      var gEnter = wrapEnter.append('g');
      var g = wrap.select('g')

      // background for pointer events
      gEnter.append('rect').attr('class', 'nvd3 nv-background').style("pointer-events","none");

      gEnter.append('g').attr('class', 'nv-x nv-axis');
      gEnter.append('g').attr('class', 'nv-y nv-axis');
      gEnter.append('g').attr('class', 'nv-scatterWrap');
      gEnter.append('g').attr('class', 'nv-regressionLinesWrap');
      gEnter.append('g').attr('class', 'nv-distWrap');
      gEnter.append('g').attr('class', 'nv-legendWrap');
      gEnter.append('g').attr('class', 'nv-controlsWrap');

      wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      if (rightAlignYAxis) {
          g.select(".nv-y.nv-axis")
              .attr("transform", "translate(" + availableWidth + ",0)");
      }

      //------------------------------------------------------------


      //------------------------------------------------------------
      // Legend

      if (showLegend) {
        legend.width( availableWidth / 2 );

        wrap.select('.nv-legendWrap')
            .datum(data)
            .call(legend);

        if ( margin.top != legend.height()) {
          margin.top = legend.height();
          availableHeight = (height || parseInt(container.style('height')) || 400)
                             - margin.top - margin.bottom;
        }

        wrap.select('.nv-legendWrap')
            .attr('transform', 'translate(' + (availableWidth / 2) + ',' + (-margin.top) +')');
      }

      //------------------------------------------------------------


      //------------------------------------------------------------
      // Controls

      if (showControls) {
        controls.width(180).color(['#444']);
        g.select('.nv-controlsWrap')
            .datum(controlsData)
            .attr('transform', 'translate(0,' + (-margin.top) +')')
            .call(controls);
      }

      //------------------------------------------------------------


      //------------------------------------------------------------
      // Main Chart Component(s)

      scatter
          .width(availableWidth)
          .height(availableHeight)
          .color(data.map(function(d,i) {
            return d.color || color(d, i);
          }).filter(function(d,i) { return !data[i].disabled }))

      wrap.select('.nv-scatterWrap')
          .datum(data.filter(function(d) { return !d.disabled }))
          .call(scatter);

      wrap.select('.nv-regressionLinesWrap')
          .attr('clip-path', 'url(#nv-edge-clip-' + scatter.id() + ')');

      var regWrap = wrap.select('.nv-regressionLinesWrap').selectAll('.nv-regLines')
                      .data(function(d) {return d });

      regWrap.enter().append('g').attr('class', 'nv-regLines');

      var regLine = regWrap.selectAll('.nv-regLine').data(function(d){return [d]});
      var regLineEnter = regLine.enter()
                       .append('line').attr('class', 'nv-regLine')
                       .style('stroke-opacity', 0);

      regLine
          .watchTransition(renderWatch, 'scatterPlusLineChart: regline')
          .attr('x1', x.range()[0])
          .attr('x2', x.range()[1])
          .attr('y1', function(d,i) {return y(x.domain()[0] * d.slope + d.intercept) })
          .attr('y2', function(d,i) { return y(x.domain()[1] * d.slope + d.intercept) })
          .style('stroke', function(d,i,j) { return color(d,j) })
          .style('stroke-opacity', function(d,i) {
            return (d.disabled || typeof d.slope === 'undefined' || typeof d.intercept === 'undefined') ? 0 : 1
          });

      //------------------------------------------------------------


      //------------------------------------------------------------
      // Setup Axes

      if (showXAxis) {
        xAxis
            .scale(x)
            .ticks( xAxis.ticks() ? xAxis.ticks() : availableWidth / 100 )
            .tickSize( -availableHeight , 0);

        g.select('.nv-x.nv-axis')
            .attr('transform', 'translate(0,' + y.range()[0] + ')')
            .call(xAxis);
      }

      if (showYAxis) {
        yAxis
            .scale(y)
            .ticks( yAxis.ticks() ? yAxis.ticks() : availableHeight / 36 )
            .tickSize( -availableWidth, 0);

        g.select('.nv-y.nv-axis')
            .call(yAxis);
      }


      if (showDistX) {
        distX
            .getData(scatter.x())
            .scale(x)
            .width(availableWidth)
            .color(data.map(function(d,i) {
              return d.color || color(d, i);
            }).filter(function(d,i) { return !data[i].disabled }));
        gEnter.select('.nv-distWrap').append('g')
            .attr('class', 'nv-distributionX');
        g.select('.nv-distributionX')
            .attr('transform', 'translate(0,' + y.range()[0] + ')')
            .datum(data.filter(function(d) { return !d.disabled }))
            .call(distX);
      }

      if (showDistY) {
        distY
            .getData(scatter.y())
            .scale(y)
            .width(availableHeight)
            .color(data.map(function(d,i) {
              return d.color || color(d, i);
            }).filter(function(d,i) { return !data[i].disabled }));
        gEnter.select('.nv-distWrap').append('g')
            .attr('class', 'nv-distributionY');
        g.select('.nv-distributionY')
            .attr('transform', 'translate(' + (rightAlignYAxis ? availableWidth : -distY.size() ) + ',0)')
            .datum(data.filter(function(d) { return !d.disabled }))
            .call(distY);
      }

      //------------------------------------------------------------




      if (d3.fisheye) {
        g.select('.nv-background')
            .attr('width', availableWidth)
            .attr('height', availableHeight)
            ;

        g.select('.nv-background').on('mousemove', updateFisheye);
        g.select('.nv-background').on('click', function() { pauseFisheye = !pauseFisheye;});
        scatter.dispatch.on('elementClick.freezeFisheye', function() {
          pauseFisheye = !pauseFisheye;
        });
      }

      // At this point, everything has been selected and bound... I think


      function updateFisheye() {
        if (pauseFisheye) {
          g.select('.nv-point-paths').style('pointer-events', 'all');
          return false;
        }

        g.select('.nv-point-paths').style('pointer-events', 'none' );

        var mouse = d3.mouse(this);
        x.distortion(fisheye).focus(mouse[0]);
        y.distortion(fisheye).focus(mouse[1]);

        g.select('.nv-scatterWrap')
            .datum(data.filter(function(d) { return !d.disabled }))
            .call(scatter);

        if (showXAxis)
          g.select('.nv-x.nv-axis').call(xAxis);

        if (showYAxis)
          g.select('.nv-y.nv-axis').call(yAxis);

        g.select('.nv-distributionX')
            .datum(data.filter(function(d) { return !d.disabled }))
            .call(distX);
        g.select('.nv-distributionY')
            .datum(data.filter(function(d) { return !d.disabled }))
            .call(distY);
      }



      //============================================================
      // Event Handling/Dispatching (in chart's scope)
      //------------------------------------------------------------

      controls.dispatch.on('legendClick', function(d,i) {
        d.disabled = !d.disabled;

        fisheye = d.disabled ? 0 : 2.5;
        g.select('.nv-background') .style('pointer-events', d.disabled ? 'none' : 'all');
        g.select('.nv-point-paths').style('pointer-events', d.disabled ? 'all' : 'none' );

        if (d.disabled) {
          x.distortion(fisheye).focus(0);
          y.distortion(fisheye).focus(0);

          g.select('.nv-scatterWrap').call(scatter);
          g.select('.nv-x.nv-axis').call(xAxis);
          g.select('.nv-y.nv-axis').call(yAxis);
        } else {
          pauseFisheye = false;
        }

        chart.update();
      });

      legend.dispatch.on('stateChange', function(newState) {
        state = newState;
        dispatch.stateChange(state);
        chart.update();
      });


      scatter.dispatch.on('elementMouseover.tooltip', function(e) {
        d3.select('.nv-chart-' + scatter.id() + ' .nv-series-' + e.seriesIndex + ' .nv-distx-' + e.pointIndex)
            .attr('y1', e.pos[1] - availableHeight);
        d3.select('.nv-chart-' + scatter.id() + ' .nv-series-' + e.seriesIndex + ' .nv-disty-' + e.pointIndex)
            .attr('x2', e.pos[0] + distX.size());

        e.pos = [e.pos[0] + margin.left, e.pos[1] + margin.top];
        dispatch.tooltipShow(e);
      });

      dispatch.on('tooltipShow', function(e) {
        if (tooltips) showTooltip(e, that.parentNode);
      });

      // Update chart from a state object passed to event handler
      dispatch.on('changeState', function(e) {

        if (typeof e.disabled !== 'undefined') {
          data.forEach(function(series,i) {
            series.disabled = e.disabled[i];
          });

          state.disabled = e.disabled;
        }

        chart.update();
      });

      //============================================================


      //store old scales for use in transitions on update
      x0 = x.copy();
      y0 = y.copy();


    });

    renderWatch.renderEnd('scatter with line immediate');
    return chart;
  }

  //============================================================
  // Event Handling/Dispatching (out of chart's scope)
  //------------------------------------------------------------

  scatter.dispatch.on('elementMouseout.tooltip', function(e) {
    dispatch.tooltipHide(e);

    d3.select('.nv-chart-' + scatter.id() + ' .nv-series-' + e.seriesIndex + ' .nv-distx-' + e.pointIndex)
        .attr('y1', 0);
    d3.select('.nv-chart-' + scatter.id() + ' .nv-series-' + e.seriesIndex + ' .nv-disty-' + e.pointIndex)
        .attr('x2', distY.size());
  });
  dispatch.on('tooltipHide', function() {
    if (tooltips) nv.tooltip.cleanup();
  });

  //============================================================


  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  // expose chart's sub-components
  chart.dispatch = dispatch;
  chart.scatter = scatter;
  chart.legend = legend;
  chart.controls = controls;
  chart.xAxis = xAxis;
  chart.yAxis = yAxis;
  chart.distX = distX;
  chart.distY = distY;

  d3.rebind(chart, scatter, 'id', 'interactive', 'pointActive', 'x', 'y', 'shape', 'size', 'xScale', 'yScale', 'zScale', 'xDomain', 'yDomain', 'xRange', 'yRange', 'sizeDomain', 'sizeRange', 'forceX', 'forceY', 'forceSize', 'clipVoronoi', 'clipRadius', 'useVoronoi');

  chart.options = nv.utils.optionsFunc.bind(chart);

  chart.margin = function(_) {
    if (!arguments.length) return margin;
    margin.top    = typeof _.top    != 'undefined' ? _.top    : margin.top;
    margin.right  = typeof _.right  != 'undefined' ? _.right  : margin.right;
    margin.bottom = typeof _.bottom != 'undefined' ? _.bottom : margin.bottom;
    margin.left   = typeof _.left   != 'undefined' ? _.left   : margin.left;
    return chart;
  };

  chart.width = function(_) {
    if (!arguments.length) return width;
    width = _;
    return chart;
  };

  chart.height = function(_) {
    if (!arguments.length) return height;
    height = _;
    return chart;
  };

  chart.color = function(_) {
    if (!arguments.length) return color;
    color = nv.utils.getColor(_);
    legend.color(color);
    distX.color(color);
    distY.color(color);
    return chart;
  };

  chart.showDistX = function(_) {
    if (!arguments.length) return showDistX;
    showDistX = _;
    return chart;
  };

  chart.showDistY = function(_) {
    if (!arguments.length) return showDistY;
    showDistY = _;
    return chart;
  };

  chart.showControls = function(_) {
    if (!arguments.length) return showControls;
    showControls = _;
    return chart;
  };

  chart.showLegend = function(_) {
    if (!arguments.length) return showLegend;
    showLegend = _;
    return chart;
  };

  chart.showXAxis = function(_) {
    if (!arguments.length) return showXAxis;
    showXAxis = _;
    return chart;
  };

  chart.showYAxis = function(_) {
    if (!arguments.length) return showYAxis;
    showYAxis = _;
    return chart;
  };

  chart.rightAlignYAxis = function(_) {
    if(!arguments.length) return rightAlignYAxis;
    rightAlignYAxis = _;
    yAxis.orient( (_) ? 'right' : 'left');
    return chart;
  };

  chart.fisheye = function(_) {
    if (!arguments.length) return fisheye;
    fisheye = _;
    return chart;
  };

  chart.tooltips = function(_) {
    if (!arguments.length) return tooltips;
    tooltips = _;
    return chart;
  };

  chart.tooltipContent = function(_) {
    if (!arguments.length) return tooltip;
    tooltip = _;
    return chart;
  };

  chart.tooltipXContent = function(_) {
    if (!arguments.length) return tooltipX;
    tooltipX = _;
    return chart;
  };

  chart.tooltipYContent = function(_) {
    if (!arguments.length) return tooltipY;
    tooltipY = _;
    return chart;
  };

  chart.state = function(_) {
    if (!arguments.length) return state;
    state = _;
    return chart;
  };

  chart.defaultState = function(_) {
    if (!arguments.length) return defaultState;
    defaultState = _;
    return chart;
  };

  chart.noData = function(_) {
    if (!arguments.length) return noData;
    noData = _;
    return chart;
  };

  chart.transitionDuration = function(_) {
    nv.deprecated('scatterPlusLineChart.transitionDuration')
    return chart.duration(_);
  };

  chart.duration = function(_) {
    if (!arguments.length) return duration;
    duration = _;
    return chart;
  };

  //============================================================


  return chart;
}
var SparklinePrivates = {
    animate : true
    , xScale : d3.scale.linear()
    , yScale : d3.scale.linear()
    , xDomain : null
    , yDomain : null
    , xRange : null
    , yRange : null
    , color: nv.utils.getColor(['#000000'])
};

/**
 * A Sparkline
 */
function Sparkline(options){
    options = nv.utils.extend({}, options, SparklinePrivates, {
        margin: {top: 2, right: 0, bottom: 2, left: 0}
        , width : 400
        , height : 32
        , chartClass: 'sparkline'
    });

    Layer.call(this, options, []);
}

nv.utils.create(Sparkline, Layer, SparklinePrivates);

/**
 * @override Layer::wrapper
 */
Sparkline.prototype.wrapper = function(data){
    Layer.prototype.wrapper.call(this, data, []);
};

/**
 * @override Layer::draw
 */
Sparkline.prototype.draw = function(data){

    var that = this
        , availableWidth = this.available.width
        , availableHeight = this.available.height;

    //------------------------------------------------------------
    // Setup Scales

    this.xScale().domain(this.xDomain() || d3.extent(data, this.x() ))
        .range(this.xRange() || [0, availableWidth]);

    this.yScale().domain(this.yDomain() || d3.extent(data, this.y() ))
        .range(this.yRange() || [availableHeight, 0]);

    //------------------------------------------------------------

    var paths = this.wrap.selectAll('path')
        .data(function(d) { return [d] });
    paths.enter().append('path');
    paths.exit().remove();
    paths
        .style('stroke', function(d,i) { return d.color || that.color()(d, i) })
        .attr('d', d3.svg.line()
            .x(function(d,i) { return that.xScale()(that.x()(d,i)) })
            .y(function(d,i) { return that.yScale()(that.y()(d,i)) })
        );

    // TODO: Add CURRENT data point (Need Min, Mac, Current / Most recent)
    var points = this.wrap.selectAll('circle.nv-point')
        .data(function(data) {
            var yValues = data.map(function(d, i) { return that.y()(d,i); });
            function pointIndex(index) {
                if (index != -1) {
                    var result = data[index];
                    result.pointIndex = index;
                    return result;
                } else
                    return null;
            }
            var maxPoint = pointIndex(yValues.lastIndexOf(that.yScale().domain()[1])),
                minPoint = pointIndex(yValues.indexOf(that.yScale().domain()[0])),
                currentPoint = pointIndex(yValues.length - 1);
            return [minPoint, maxPoint, currentPoint].filter(function (d) {return d != null;});
        });
    points.enter().append('circle');
    points.exit().remove();
    points
        .attr('cx', function(d) { return that.xScale()(that.x()(d,d.pointIndex)) })
        .attr('cy', function(d) { return that.yScale()(that.y()(d,d.pointIndex)) })
        .attr('r', 2)
        .attr('class', function(d) {
            return that.x()(d, d.pointIndex) == that.xScale().domain()[1] ? 'nv-point nv-currentValue' :
                that.y()(d, d.pointIndex) == that.yScale().domain()[0] ? 'nv-point nv-minValue' : 'nv-point nv-maxValue'
        });
};

Sparkline.prototype.color = function(_) {
    if (!arguments.length) return this.options.color;
    this.options.color = nv.utils.getColor(_);
    return this;
};

/**
 * The sparkline model returns a function wrapping an instance of a Sparkline.
 */
nv.models.sparkline = function () {
    "use strict";

    var sparkline = new Sparkline();

    function chart(selection) {
        sparkline.render(selection);
        return chart;
    }

    chart.dispatch = sparkline.dispatch;

    chart.options = nv.utils.optionsFunc.bind(chart);

    nv.utils.rebindp(chart, sparkline, Sparkline.prototype,
        'margin', 'width', 'height', 'x', 'y', 'xScale', 'yScale', 'xDomain', 'yDomain', 'xRange', 'yRange',
        'animate', 'color'
    );

    return chart;
};var SparklinePlusPrivates = {
    index : []
    , paused : false
    , xTickFormat : d3.format(',r')
    , yTickFormat : d3.format(',.2f')
    , showValue : true
    , alignValue : true
    , rightAlignValue : false
    , xScale: null
    , yScale: null
};

/**
 * A SparklinePlus
 */
function SparklinePlus(options){
    options = nv.utils.extend({}, options, SparklinePlusPrivates, {
        margin: {top: 15, right: 100, bottom: 10, left: 50}
        , chartClass: 'sparklineplus'
    });
    Chart.call(this, options);

    this.sparkline = this.getSparkline();
    this.state = this.getStatesManager();
}

nv.utils.create(SparklinePlus, Chart, SparklinePlusPrivates);

SparklinePlus.prototype.getSparkline = function(){
    return nv.models.sparkline();
};

/**
 * @override Chart::wrapper
 */
SparklinePlus.prototype.wrapper = function (data) {
    var wrapPoints = [
        'nv-valueWrap', 'nv-sparklineWrap', 'nv-hoverArea' // nv-hoverArea should be after nv-sparklineWrap in the DOM
    ];
    Layer.prototype.wrapper.call(this, data, wrapPoints);

    this.wrap.attr('transform', 'translate(' + this.margin().left + ',' + this.margin().top + ')');
};

/**
 * @override Chart::draw
 */
SparklinePlus.prototype.draw = function(data){

    var that = this
        , availableWidth = this.available.width
        , availableHeight = this.available.height
        , sparklineWrap = null
        , valueWrap = null
        , value = null;

    var currentValue = this.sparkline.y()(data[data.length-1], data.length-1);

    this.xScale(this.sparkline.xScale());
    this.yScale(this.sparkline.yScale());

    this.sparkline
        .width(availableWidth)
        .height(availableHeight);
    sparklineWrap = this.g.select('.nv-sparklineWrap');

    sparklineWrap
        .call(this.sparkline);

    valueWrap = this.g.select('.nv-valueWrap');

    value = valueWrap.selectAll('.nv-currentValue')
        .data([currentValue]);

    value.enter().append('text').attr('class', 'nv-currentValue')
        .attr('dx', this.rightAlignValue() ? -8 : 8)
        .attr('dy', '.9em')
        .style('text-anchor', this.rightAlignValue() ? 'end' : 'start');

    value
        .attr('x', availableWidth + (this.rightAlignValue() ? this.margin().right : 0))
        .attr('y', this.alignValue() ? function(d) { return that.yScale()(d) } : 0)
        .style('fill', this.color()(data[data.length-1], data.length-1))
        .text(this.yTickFormat()(currentValue));

    this.gEnter.select('.nv-hoverArea').append('rect')
        .on('mousemove', sparklineHover)
        .on('click', function() { that.paused(!that.paused()) })
        .on('mouseout', function() { that.index([]); updateValueLine(); });

    this.g.select('.nv-hoverArea rect')
        .attr('transform', function() { return 'translate(' + -that.margin().left + ',' + -that.margin().top + ')' })
        .attr('width', availableWidth + this.margin().left + this.margin().right)
        .attr('height', availableHeight + this.margin().top);

    function updateValueLine() { //index is currently global (within the chart), may or may not keep it that way
        if (that.paused()) return;

        var hoverValue = that.g.selectAll('.nv-hoverValue').data(that.index());

        var hoverEnter = hoverValue.enter()
            .append('g').attr('class', 'nv-hoverValue')
            .style('stroke-opacity', 0)
            .style('fill-opacity', 0);

        hoverValue.exit()
            .transition().duration(250)
            .style('stroke-opacity', 0)
            .style('fill-opacity', 0)
            .remove();

        hoverValue
            .attr('transform', function(d) { return 'translate(' + that.xScale()(that.sparkline.x()(data[d],d)) + ',0)' })
            .transition().duration(250)
            .style('stroke-opacity', 1)
            .style('fill-opacity', 1);

        if (!that.index().length) return;

        hoverEnter.append('line')
            .attr('x1', 0)
            .attr('y1', -that.margin().top)
            .attr('x2', 0)
            .attr('y2', availableHeight);

        hoverEnter.append('text').attr('class', 'nv-xValue')
            .attr('x', -6)
            .attr('y', -that.margin().top)
            .attr('text-anchor', 'end')
            .attr('dy', '.9em');

        that.g.select('.nv-hoverValue .nv-xValue')
            .text(that.xTickFormat()(that.sparkline.x()(data[that.index()[0]], that.index()[0])));

        hoverEnter.append('text').attr('class', 'nv-yValue')
            .attr('x', 6)
            .attr('y', -that.margin().top)
            .attr('text-anchor', 'start')
            .attr('dy', '.9em');

        that.g.select('.nv-hoverValue .nv-yValue')
            .text(that.yTickFormat()(that.sparkline.y()(data[that.index()[0]], that.index()[0])));
    }

    function sparklineHover() {
        if (that.paused()) return;
        var pos = d3.mouse(this)[0] - that.margin().left;
        function getClosestIndex(data, x) {
            var distance = Math.abs(that.sparkline.x()(data[0], 0) - x);
            var closestIndex = 0;
            for (var i = 0; i < data.length; i++){
                if (Math.abs(that.sparkline.x()(data[i], i) - x) < distance) {
                    distance = Math.abs(that.sparkline.x()(data[i], i) - x);
                    closestIndex = i;
                }
            }
            return closestIndex;
        }
        that.index( [getClosestIndex(data, Math.round(that.xScale().invert(pos)))] );
        updateValueLine();
    }
};

/**
 * Set up listeners for dispatches fired on the underlying
 * multiBar graph.
 *
 * @override Chart::attachEvents
 */
SparklinePlus.prototype.attachEvents = function(){
    Chart.prototype.attachEvents.call(this);

};

/**
 * The sparklinePlus model returns a function wrapping an instance of a SparklinePlus.
 */
nv.models.sparklinePlus = function() {
    "use strict";

    var sparklinePlus = new SparklinePlus();

    function chart(selection) {
        sparklinePlus.render(selection);
        return chart;
    }

    chart.dispatch = sparklinePlus.dispatch;
    chart.sparkline = sparklinePlus.sparkline;
    chart.state = sparklinePlus.state;

    d3.rebind(chart, sparklinePlus.sparkline,
        'x', 'y', 'xScale', 'yScale', 'color'
    );

    chart.options = nv.utils.optionsFunc.bind(chart);

    nv.utils.rebindp(chart, sparklinePlus, SparklinePlus.prototype,
        'margin', 'width', 'height', 'xTickFormat', 'yTickFormat', 'showValue', 'alignValue', 'rightAlignValue',
        'noData'
    );

    return chart;
};/************************************
 * offset:
 *   'wiggle' (stream)
 *   'zero' (stacked)
 *   'expand' (normalize to 100%)
 *   'silhouette' (simple centered)
 *
 * order:
 *   'inside-out' (stream)
 *   'default' (input order)
 ************************************/

var StackedAreaPrivates = {
    id : Math.floor(Math.random() * 100000) //Create semi-unique ID incase user doesn't selet one
    , offset : 'zero'
    , order : 'default'
    , interpolate : 'linear'  // controls the line interpolation
    , clipEdge : false // if true, masks lines within x and y scale
    , xScale: null //can be accessed via chart.xScale()
    , yScale: null //can be accessed via chart.yScale()
    , dataRaw: null
    , duration : 250
    , style : 'stack'
};


/**
 * A StackedArea
 */
function StackedArea(options){
    options = nv.utils.extend({}, options, StackedAreaPrivates, {
        margin: {top: 0, right: 0, bottom: 0, left: 0}
        , chartClass: 'stackedarea'
    });

    Chart.call(this, options,
        ['areaClick', 'areaMouseover', 'areaMouseout']
    );

    this.scatter = this.getScatter();

    this.renderWatch = nv.utils.renderWatch(this.dispatch, this.duration());
}

nv.utils.create(StackedArea, Chart, StackedAreaPrivates);

StackedArea.prototype.getScatter = function(){
    return nv.models.scatter();
};

/**
 * @override Layer::wrapper
 */
StackedArea.prototype.wrapper = function(data){
    Layer.prototype.wrapper.call(this, data, ['nv-areaWrap', 'nv-scatterWrap']);

    this.scatter
        .size(2.2) // default size
        .sizeDomain([2.2,2.2]) // all the same size by default
    ;

    this.renderWatch.models(this.scatter);
};

/**
 * @override Layer::draw
 */
StackedArea.prototype.draw = function(data){

    var that = this
        , dataFiltered = data.filter(function(series) {
            return !series.disabled;
        })
        , scatterWrap = null
        , area = null
        , zeroArea = null
        , path = null
        , mouseEventObject = function(d){
            return {
                point : d,
                series: d.key,
                pos   : [d3.event.pageX, d3.event.pageY],
                seriesIndex: d.seriesIndex
            }
        };

    this.xScale(this.scatter.xScale());
    this.yScale(this.scatter.yScale());

    this.dataRaw(data);

    // Injecting point index into each point because d3.layout.stack().out does not give index
    data.forEach(function(aseries, i) {
        aseries.seriesIndex = i;
        aseries.values = aseries.values.map(function(d, j) {
            d.index = j;
            d.seriesIndex = i;
            return d;
        });
    });

    data = d3.layout.stack()
        .order(this.order())
        .offset(this.offset())
        .values(function(d) { return d.values })  //TODO: make values customizeable in EVERY model in this fashion
        .x(this.x())
        .y(this.y())
        .out(function(d, y0, y) {
            var yHeight = (that.y()(d) === 0) ? 0 : y;
            d.display = {
                y: yHeight,
                y0: y0
            };
        })
        (dataFiltered);

    this.scatter
        .width(this.available.width)
        .height(this.available.height)
        .x(this.x())
        .y(function(d) { return d.display.y + d.display.y0 })
        .forceY([0])
        .color(data.map(function(d) {
            return d.color || that.color()(d, d.seriesIndex);
        }));

    scatterWrap = this.g.select('.nv-scatterWrap')
        .datum(data);
    scatterWrap.call(this.scatter);

    this.defsEnter.append('clipPath')
        .attr('id', 'nv-edge-clip-' + this.id())
        .append('rect');

    this.wrap.select('#nv-edge-clip-' + this.id() + ' rect')
        .attr('width', this.available.width)
        .attr('height', this.available.height);

    this.g.attr('clip-path', this.clipEdge() ? 'url(#nv-edge-clip-' + this.id() + ')' : '');

    area = d3.svg.area()
        .x(function(d)  { return that.xScale()(that.x()(d)) })
        .y0(function(d) { return that.yScale()(d.display.y0) })
        .y1(function(d) { return that.yScale()(d.display.y + d.display.y0) })
        .interpolate(this.interpolate());

    zeroArea = d3.svg.area()
        .x(function(d)  { return that.xScale()(that.x()(d)) })
        .y0(function(d) { return that.yScale()(d.display.y0) })
        .y1(function(d) { return that.yScale()(d.display.y0) });

    path = this.g.select('.nv-areaWrap').selectAll('path.nv-area')
        .data(data);

    path.enter().append('path')
        .attr('class', function(d,i) { return 'nv-area nv-area-' + i })
        .attr('d', function(d){ return zeroArea(d.values, d.seriesIndex) })
        .on('mouseover', function(d) {
            d3.select(this).classed('hover', true);
            that.dispatch.areaMouseover( mouseEventObject(d) );
        })
        .on('mouseout', function(d) {
            d3.select(this).classed('hover', false);
            that.dispatch.areaMouseout( mouseEventObject(d) );
        })
        .on('click', function(d) {
            d3.select(this).classed('hover', false);
            that.dispatch.areaClick( mouseEventObject(d) );
        });

    path.exit().remove();

    path.style('fill', function(d){ return d.color || that.color()(d, d.seriesIndex) })
        .style('stroke', function(d){ return d.color || that.color()(d, d.seriesIndex) });
    path.watchTransition(this.renderWatch,'stackedArea path')
        .attr('d', function(d,i) { return area(d.values,i) });
};

/**
 * @override Layer::attachEvents
 */
StackedArea.prototype.attachEvents = function(){
    Chart.prototype.attachEvents.call(this);

    var _mouseEventSelector = function(e){
        return '.nv-chart-' + this.id() + ' .nv-area-' + e.seriesIndex
    }.bind(this);

    this.scatter.dispatch
        .on('elementMouseover.area', function(e) {
            this.g.select( _mouseEventSelector(e) )
                .classed('hover', true);
        }.bind(this))
        .on('elementMouseout.area', function(e) {
            this.g.select( _mouseEventSelector(e) )
                .classed('hover', false);
        }.bind(this))
        .on('elementClick.area', function(e) {
            this.dispatch.areaClick(e);
        }.bind(this))
/*        .on('elementMouseover.tooltip', function(e) {
            e.pos = [e.pos[0] + this.margin().left, e.pos[1] + this.margin().top];
            this.dispatch.tooltipShow(e);
        }.bind(this))
        .on('elementMouseout.tooltip', function(e) {
            this.dispatch.tooltipHide(e);
        }.bind(this))*/;
};

StackedArea.prototype.color = function(_) {
    if (!arguments.length) return this.options.color;
    this.options.color = nv.utils.getColor(_);
    return this;
};

StackedArea.prototype.style = function(_) { //shortcut for offset + order
    if (!arguments.length) return this.options.style;
    this.options.style = _;

    switch (_) {
        case 'stack':
            this.offset('zero');
            this.order('default');
            break;
        case 'stream':
            this.offset('wiggle');
            this.order('inside-out');
            break;
        case 'stream-center':
            this.offset('silhouette');
            this.order('inside-out');
            break;
        case 'expand':
            this.offset('expand');
            this.order('default');
            break;
        case 'stack_percent':
            this.offset(this.d3_stackedOffset_stackPercent);
            this.order('default');
            break;
    }

    return this;
};

StackedArea.prototype.duration = function(_) {
    if (!arguments.length) return this.options.duration;
    this.options.duration = _;
    this.renderWatch.reset(_);
    this.scatter.duration(_);
    return this;
};

//============================================================
//Special offset functions
StackedArea.prototype.d3_stackedOffset_stackPercent = function(stackData) {
    var n = stackData.length,    //How many series
        m = stackData[0].length,     //how many points per series
        k = 1 / n,
        y0 = [],
        i, j, o;

    for (j = 0; j < m; ++j) { //Looping through all points
        for (i = 0, o = 0; i < this.dataRaw().length; i++)  //looping through series'
            o += this.y()(this.dataRaw()[i].values[j])   //total value of all points at a certian point in time.

        if (o) for (i = 0; i < n; i++)
            stackData[i][j][1] /= o;
        else
            for (i = 0; i < n; i++)
                stackData[i][j][1] = k;
    }
    for (j = 0; j < m; ++j) y0[j] = 0;
    return y0;
};

/**
 * The stackedArea model returns a function wrapping an instance of a StackedArea.
 */
nv.models.stackedArea = function () {
    "use strict";

    var stackedArea = new StackedArea();

    function chart(selection) {
        stackedArea.render(selection);
        return chart;
    }

    chart.dispatch = stackedArea.dispatch;
    chart.scatter = stackedArea.scatter;

    d3.rebind(chart, stackedArea.scatter,
        'interactive', 'size', 'xScale', 'yScale', 'zScale', 'xDomain', 'yDomain', 'xRange', 'yRange', 'sizeDomain',
        'forceX', 'forceY', 'forceSize', 'clipVoronoi', 'useVoronoi', 'clipRadius', 'highlightPoint', 'clearHighlights'
    );

    chart.options = nv.utils.optionsFunc.bind(chart);

    nv.utils.rebindp(chart, stackedArea, StackedArea.prototype,
        'x', 'y', 'margin', 'width', 'height', 'clipEdge', 'offset', 'order', 'color', 'style', 'interpolate'
    );

    return chart;
};
var StackedAreaChartPrivates = {
    showControls : true
    , tooltip : function(key, x, y) {
        return '<h3>' + key + '</h3>' +
            '<p>' +  y + ' on ' + x + '</p>'
    }
    , yAxisTickFormat : d3.format(',.2f')
    , defaultState : null
    , controlWidth : 250
    , cData : ['Stacked', 'Stream', 'Expanded']
    , xScale: null
    , yScale: null
    , interactive: null
    , useVoronoi: null
    , tooltips: true
    , useInteractiveGuideline : false
    , controlLabels : {}
    , duration : 250
};

/**
 * A StackedAreaChart
 */
function StackedAreaChart(options){
    options = nv.utils.extend({}, options, StackedAreaChartPrivates, {
        margin: {top: 30, right: 25, bottom: 50, left: 60}
        , chartClass: 'stackedAreaChart'
        , wrapClass: 'stackedAreaChartWrap'
    });

    Chart.call(this, options);

    this.stacked = this.getStackedArea();
    this.controls = this.getLegend();
    this.interactiveLayer = this.getInteractiveGuideline();
    this.state = this.getStatesManager();

    this.yAxis().tickFormat = function(_) {
        if (!arguments.length) return this.yAxisTickFormat();
        this.yAxisTickFormat(_);
        return this.yAxis();
    }.bind(this);
    this.yAxis().setTickFormat = this.yAxis().tickFormat;

    this.controls.updateState(false);
}

nv.utils.create(StackedAreaChart, Chart, StackedAreaChartPrivates);

StackedAreaChart.prototype.getInteractiveGuideline = function(){
    return nv.interactiveGuideline();
};

StackedAreaChart.prototype.getLegend = function(){
    return nv.models.legend();
};

StackedAreaChart.prototype.getStackedArea = function(){
    return nv.models.stackedArea();
};

/**
 * @override Chart::wrapper
 */
StackedAreaChart.prototype.wrapper = function (data) {
    Chart.prototype.wrapper.call(this, data,
        ['nv-stackedWrap', 'nv-controlsWrap', 'nv-interactive']
    );
    this.renderWatch = nv.utils.renderWatch(this.dispatch, this.duration());
    if (this.showXAxis()) this.renderWatch.models(this.xAxis());
    if (this.showYAxis()) this.renderWatch.models(this.yAxis());
};

/**
 * @override Layer::draw
 */
StackedAreaChart.prototype.draw = function(data){

    var that = this,
        availableWidth = this.available.width,
        availableHeight = this.available.height;

    this.xScale( this.stacked.xScale() );
    this.yScale( this.stacked.yScale() );
    this.x( this.stacked.x() );
    this.y( this.stacked.y() );

    if (this.showControls()) {
        var controlsData = [
            {
                key     : this.controlLabels().stacked || 'Stacked',
                metaKey : 'Stacked',
                disabled: this.stacked.style() != 'stack',
                style   : 'stack'
            },
            {
                key     : this.controlLabels().stream || 'Stream',
                metaKey : 'Stream',
                disabled: this.stacked.style() != 'stream',
                style   : 'stream'
            },
            {
                key     : this.controlLabels().expanded || 'Expanded',
                metaKey : 'Expanded',
                disabled: this.stacked.style() != 'expand',
                style   : 'expand'
            },
            {
                key     : this.controlLabels().stack_percent || 'Stack %',
                metaKey : 'Stack_Percent',
                disabled: this.stacked.style() != 'stack_percent',
                style   : 'stack_percent'
            }
        ];

        this.controlWidth( (this.cData().length/3) * 260 );

        controlsData = controlsData.filter(function(d) { return that.cData().indexOf(d.metaKey) !== -1 });

        this.controls
            .width( this.controlWidth() )
            .color(['#444', '#444', '#444']);

        this.g.select('.nv-controlsWrap')
            .datum(controlsData)
            .call(this.controls);

        if ( this.margin().top != Math.max(this.controls.height(), this.legend.height()) ) {
            this.margin().top = Math.max(this.controls.height(), this.legend.height());
            availableHeight = (this.height() || parseInt(this.svg.style('height')) || 400)
                - this.margin().top - this.margin().bottom;
        }

        this.g.select('.nv-controlsWrap')
            .attr('transform', 'translate(0,' + (-this.margin().top) +')');
    }

    //------------------------------------------------------------
    //Set up interactive layer
    if (this.useInteractiveGuideline()) {
        this.interactiveLayer
            .width(availableWidth)
            .height(availableHeight)
            .margin({left: this.margin().left, top: this.margin().top})
            .svgContainer(this.svg)
            .xScale(this.xScale());
        this.wrap.select(".nv-interactive").call(this.interactiveLayer);
    }

    this.stacked
        .margin({top: 0, right: 0, bottom: 0, left: 0})
        .width(availableWidth)
        .height(availableHeight);
    var stackedWrap = this.g.select('.nv-stackedWrap')
        .datum(data);
    stackedWrap.transition().call(this.stacked);

    this.plotAxes(data);
};

Chart.prototype.plotAxes = function(data){

    if (this.rightAlignYAxis()) {
        this.wrap.select('.nv-x.nv-axis').attr("transform", "translate(" + this.available.width + ", 0)");
    }

    if (this.showXAxis()) {

        this.xAxis()
            .orient('bottom')
            .tickPadding(7)
            .scale(this.xScale())
            .ticks( this.available.width / 100 )
            .tickSize( -this.available.height, 0);

        this.g.select('.nv-x.nv-axis')
            .attr('transform', 'translate(0,' + this.available.height + ')')
            .transition().duration(0)
            .call(this.xAxis());
    }

    if (this.showYAxis()) {
        this.yAxis()
            .orient((this.rightAlignYAxis()) ? 'right' : 'left')
            .scale(this.yScale())
            .ticks(this.stacked.offset() == 'wiggle' ? 0 : this.available.height / 36)
            .tickSize(-this.available.width, 0)
            .setTickFormat(
                (this.stacked.style() == 'expand' || this.stacked.style() == 'stack_percent')
                    ? d3.format('%')
                    : this.yAxisTickFormat()
            );

        this.g.select('.nv-y.nv-axis')
            .transition().duration(0)
            .call(this.yAxis());
    }

};

/**
 * Set up listeners for dispatches fired on the underlying
 * multiBar graph.
 *
 * @override Chart::attachEvents
 */
StackedAreaChart.prototype.attachEvents = function(){
    Chart.prototype.attachEvents.call(this);

    var data = null
        , that = this;

    this.svg.call(function(selection){
        selection.each(function(d){
            data = d;
        })
    });

    this.dispatch
        .on('tooltipShow', function(e) {
            if (that.tooltips())
                that.showTooltip(e, that.parentNode);
        })
        .on('changeState', function(e) { // Update chart from a state object passed to event handler
            if (typeof e.disabled !== 'undefined' && data.length === e.disabled.length) {
                data.forEach(function(series,i) { series.disabled = e.disabled[i] });
                that.state.disabled = e.disabled;
            }
            if (typeof e.style !== 'undefined')
                that.stacked.style(e.style);
            that.update();
        })
        .on('tooltipHide', function() {
            if (that.tooltips()) nv.tooltip.cleanup();
        });

    this.legend.dispatch
        .on('stateChange', function(newState) {
            that.state.disabled = newState.disabled;
            that.dispatch.stateChange(that.state);
            that.update();
        });

    this.controls.dispatch
        .on('legendClick', function(d) {
            if (!d.disabled)  return;
            that.controlsData( that.controlsData().map(function(s) { s.disabled = true; return s }) );
            d.disabled = false;
            that.stacked.style(d.style);
            that.state.style = that.stacked.style();
            that.dispatch.stateChange(that.state);
            that.update();
        });

    this.interactiveLayer.dispatch
        .on('elementMousemove', function(e) {
            that.stacked.clearHighlights();
            var singlePoint, pointIndex, pointXLocation, allData = [];
            data
                .filter(function(series, i) { series.seriesIndex = i; return !series.disabled })
                .forEach(function(series,i) {
                    pointIndex = nv.interactiveBisect(series.values, e.pointXValue, that.x());
                    that.stacked.highlightPoint(i, pointIndex, true);

                    var point = series.values[pointIndex];
                    if (typeof point === 'undefined') return;
                    if (typeof singlePoint === 'undefined') singlePoint = point;
                    if (typeof pointXLocation === 'undefined') pointXLocation = that.xScale()(that.x()(point,pointIndex));

                    //If we are in 'expand' mode, use the stacked percent value instead of raw value.
                    var tooltipValue = (that.stacked.style() == 'expand') ? point.display.y : that.y()(point,pointIndex);
                    allData.push({
                        key: series.key,
                        value: tooltipValue,
                        color: that.color()(series,series.seriesIndex),
                        stackedValue: point.display
                    });
                });

            allData.reverse();

            //Highlight the tooltip entry based on which stack the mouse is closest to.
            if (allData.length > 2) {
                var yValue = that.yScale().invert(e.mouseY);
                var yDistMax = Infinity, indexToHighlight = null;
                allData.forEach(function(series,i) {

                    //To handle situation where the stacked area chart is negative, we need to use absolute values
                    //when checking if the mouse Y value is within the stack area.
                    yValue = Math.abs(yValue);
                    var stackedY0 = Math.abs(series.stackedValue.y0);
                    var stackedY = Math.abs(series.stackedValue.y);
                    if ( yValue >= stackedY0 && yValue <= (stackedY + stackedY0)) {
                        indexToHighlight = i;
                        return;
                    }
                });
                if (indexToHighlight != null)
                    allData[indexToHighlight].highlight = true;
            }

            var xValue = that.xAxis().tickFormat()(that.x()(singlePoint,pointIndex));

            //If we are in 'expand' mode, force the format to be a percentage.
            var valueFormatter = (that.stacked.style() == 'expand') ?
                function(d) {return d3.format(".1%")(d);} :
                function(d) {return that.yAxis().tickFormat()(d); };
            that.interactiveLayer.tooltip
                .position({left: pointXLocation + that.margin().left, top: e.mouseY + that.margin().top})
                .chartContainer(that.parentNode)
                .enabled(that.tooltips())
                .valueFormatter(valueFormatter)
                .data(
                {
                    value: xValue,
                    series: allData
                }
            )();

            that.interactiveLayer.renderGuideLine(pointXLocation);
        })
        .on("elementMouseout",function() {
            that.dispatch.tooltipHide();
            that.stacked.clearHighlights();
        });

    this.stacked.dispatch
        .on('tooltipShow', function(e) {
            //disable tooltips when value ~= 0
            //// TODO: consider removing points from voronoi that have 0 value instead of this hack
            /*
             if (!Math.round(stacked.y()(e.point) * 100)) {  // 100 will not be good for very small numbers... will have to think about making this valu dynamic, based on data range
             setTimeout(function() { d3.selectAll('.point.hover').classed('hover', false) }, 0);
             return false;
             }
             */

            e.pos = [e.pos[0] + that.margin().left, e.pos[1] + that.margin().top];
            that.dispatch.tooltipShow(e);
        })
        .on('tooltipHide', function(e) {
            that.dispatch.tooltipHide(e);
        })
        .on('areaClick.toggle', function(e) {
            if (data.filter(function(d) { return !d.disabled }).length === 1)
                data.forEach(function(d) { d.disabled = false });
            else
                data.forEach(function(d,i) { d.disabled = (i != e.seriesIndex) });
            that.state.disabled = data.map(function(d) { return !!d.disabled });
            that.dispatch.stateChange(that.state);
            that.update();
        });
};

StackedAreaChart.prototype.showTooltip = function(e, offsetElement) {
    var left = e.pos[0] + ( offsetElement.offsetLeft || 0 ),
        top = e.pos[1] + ( offsetElement.offsetTop || 0),
        x = this.xAxis().tickFormat()(this.stacked.x()(e.point, e.pointIndex)),
        y = this.yAxis().tickFormat()(this.stacked.y()(e.point, e.pointIndex)),
        content = this.tooltip()(e.series.key, x, y);

    nv.tooltip.show([left, top], content, e.value < 0 ? 'n' : 's', null, offsetElement);
};

StackedAreaChart.prototype.color = function(_) {
    if (!arguments.length) return this.options.color;
    this.options.color = nv.utils.getColor(_);
    this.legend.color(this.color());
    this.stacked.color(this.color());
    return this;
};

StackedAreaChart.prototype.rightAlignYAxis = function(_) {
    if(!arguments.length) return this.options.rightAlignYAxis;
    this.options.rightAlignYAxis = _;
    this.yAxis().orient( (_) ? 'right' : 'left');
    return this;
};

StackedAreaChart.prototype.useInteractiveGuideline = function(_) {
    if(!arguments.length) return this.options.useInteractiveGuideline;
    this.options.useInteractiveGuideline = _;
    if (_ === true) {
        this.interactive(false);
        this.useVoronoi(false);
    }
    return this;
};

StackedAreaChart.prototype.transitionDuration = function(_) {
    nv.deprecated('stackedAreaChart.transitionDuration');
    return this.duration(_);
};

StackedAreaChart.prototype.controlsData = function(_) {
    if (!arguments.length) return this.cData();
    this.cData(_);
    return this;
};

StackedAreaChart.prototype.controlLabels = function(_) {
    if (!arguments.length || (typeof _ !== 'object')) return this.options.controlLabels;
    this.options.controlLabels = _;
    return this;
};

StackedAreaChart.prototype.duration = function(_) {
    if (!arguments.length) return this.options.duration;
    this.options.duration = _;
    this.renderWatch.reset(_);
    // stacked.duration(duration);
    this.xAxis().duration(_);
    this.yAxis().duration(_);
    return this;
};

/**
 * The stackedAreaChart model returns a function wrapping an instance of a StackedAreaChart.
 */
nv.models.stackedAreaChart = function() {
    "use strict";

    var stackedAreaChart = new StackedAreaChart();

    function chart(selection) {
        stackedAreaChart.render(selection);
        return chart;
    }

    chart.dispatch = stackedAreaChart.dispatch;
    chart.stacked = stackedAreaChart.stacked;
    chart.controls = stackedAreaChart.controls;
    chart.interactiveLayer =  stackedAreaChart.interactiveLayer;
    chart.state = stackedAreaChart.state;

    d3.rebind(chart, stackedAreaChart.stacked,
        'x', 'y', 'size', 'xScale', 'yScale', 'xDomain', 'yDomain', 'xRange', 'yRange', 'sizeDomain', 'interactive',
        'useVoronoi', 'offset', 'order', 'style', 'clipEdge', 'forceX', 'forceY', 'forceSize', 'interpolate'
    );

    chart.options = nv.utils.optionsFunc.bind(chart);

    nv.utils.rebindp(chart, stackedAreaChart, StackedAreaChart.prototype,
        'margin', 'width', 'height', 'state', 'defaultState', 'noData', 'showControls', 'showLegend', 'showXAxis',
        'showYAxis', 'tooltip', 'tooltips', 'color', 'rightAlignYAxis', 'useInteractiveGuideline', 'tooltipContent',
        'transitionDuration', 'controlsData', 'controlLabels', 'tickFormat', 'duration', 'xAxis', 'yAxis'
    );

    return chart;
};

})();