(function(){
var nv = {
  version: '0.0.1a',
  dev: true //set false when in production
};


window.nv = nv;

nv.tooltip = {}; // For the tooltip system
nv.utils = {}; // Utility subsystem
nv.models = {}; //stores all the possible models/components
nv.charts = {}; //stores all the ready to use charts
nv.graphs = []; //stores all the graphs currently on the page
nv.log = {}; //stores some statistics and potential error messages

nv.dispatch = d3.dispatch('render_start', 'render_end');



// ********************************************
//  Public Core NV functions

nv.dispatch.on('render_start', function(e) {
  nv.log.startTime = +new Date;
});

nv.dispatch.on('render_end', function(e) {
  nv.log.endTime = +new Date;
  nv.log.totalTime = nv.log.endTime - nv.log.startTime;
  if (nv.dev && console.log) console.log('total', nv.log.totalTime); //used for development, to keep track of graph generation times
});


// ********************************************
//  Public Core NV functions

nv.render = function render(step) {
  step = step || 1; // number of graphs to generate in each timout loop

  render.active = true;
  nv.dispatch.render_start();

  setTimeout(function(){
    var chart;

    for (var i = 0; i < step && (graph = render.queue[i]); i++) {
      chart = graph.generate();
      if (typeof graph.callback === 'function') graph.callback(chart);
      nv.graphs.push(chart);
    }

    render.queue.splice(0, i);

    if (render.queue.length) setTimeout(arguments.callee, 0);
    else { 
      nv.render.active = false;
      nv.dispatch.render_end();
    }
  }, 0);
};
nv.render.queue = [];


nv.addGraph = function(obj) {
  if (typeof arguments[0] === 'function')
    obj = {generate: arguments[0], callback: arguments[1]};

  nv.render.queue.push(obj);

  if (!nv.render.active) nv.render();
};


nv.identity = function(d) { return d };


nv.strip = function(s) {
  return s.replace(/(\s|&)/g,'');
}


/* An ugly implementation to get month end axis dates
 * Will hopefully refactor sooner than later
 */

function daysInMonth(month,year) {
  var m = [31,28,31,30,31,30,31,31,30,31,30,31];
  if (month != 2) return m[month - 1];
  if (year%4 != 0) return m[1];
  if (year%100 == 0 && year%400 != 0) return m[1];
  return m[1] + 1;
}


function d3_time_range(floor, step, number) {
  return function(t0, t1, dt) {
    var time = floor(t0), times = [];
    if (time < t0) step(time);
    if (dt > 1) {
      while (time < t1) {
        var date = new Date(+time);
        if (!(number(date) % dt)) times.push(date);
        step(time);
      }
    } else {
      while (time < t1) times.push(new Date(+time)), step(time);
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


/*****
 * A no frills tooltip implementation.
 *****/


(function() {

  var nvtooltip = window.nv.tooltip = {};

  nvtooltip.show = function(pos, content, gravity, dist) {

    var container = document.createElement("div");
        container.className = "nvtooltip";

    gravity = gravity || 's';
    dist = dist || 20;

    var body = document.getElementsByTagName("body")[0];

    container.innerHTML = content;
    container.style.left = 0;
    container.style.top = 0;
    container.style.opacity = 0;

    body.appendChild(container);

    var height = parseInt(container.offsetHeight),
        width = parseInt(container.offsetWidth),
        windowWidth = nv.utils.windowSize().width,
        windowHeight = nv.utils.windowSize().height,
        scrollTop = body.scrollTop,
        scrollLeft = body.scrollLeft,
        left, top;


    switch (gravity) {
      case 'e':
        left = pos[0] - width - dist;
        top = pos[1] - (height / 2);
        if (left < scrollLeft) left = pos[0] + dist;
        if (top < scrollTop) top = scrollTop + 5;
        if (top + height > scrollTop + windowHeight) top = scrollTop - height - 5;
        break;
      case 'w':
        left = pos[0] + dist;
        top = pos[1] - (height / 2);
        if (left + width > windowWidth) left = pos[0] - width - dist;
        if (top < scrollTop) top = scrollTop + 5;
        if (top + height > scrollTop + windowHeight) top = scrollTop - height - 5;
        break;
      case 'n':
        left = pos[0] - (width / 2);
        top = pos[1] + dist;
        if (left < scrollLeft) left = scrollLeft + 5;
        if (left + width > windowWidth) left = windowWidth - width - 5;
        if (top + height > scrollTop + windowHeight) top = pos[1] - height - dist;
        break;
      case 's':
        left = pos[0] - (width / 2);
        top = pos[1] - height - dist;
        if (left < scrollLeft) left = scrollLeft + 5;
        if (left + width > windowWidth) left = windowWidth - width - 5;
        if (scrollTop > top) top = pos[1] + 20;
        break;
    }


    container.style.left = left+"px";
    container.style.top = top+"px";
    container.style.opacity = 1;
    container.style.position = "absolute"; //fix scroll bar issue
    container.style.pointerEvents = "none"; //fix scroll bar issue

    return container;
  };

  nvtooltip.cleanup = function() {

      // Find the tooltips, mark them for removal by this class (so others cleanups won't find it)
      var tooltips = document.getElementsByClassName('nvtooltip');
      var purging = [];
      while(tooltips.length) {
        purging.push(tooltips[0]);
        tooltips[0].style.transitionDelay = "0 !important";
        tooltips[0].style.opacity = 0;
        tooltips[0].className = "nvtooltip-pending-removal";
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
// TODO: give a way to remove a function after its bound, other than removing alkl of them
nv.utils.windowResize = function(fun){
  var oldresize = window.onresize;

  window.onresize = function(e) {
    if (typeof oldresize == 'function') oldresize(e);
    fun(e);
  }
}

nv.models.axis = function() {
  //Default Settings
  var scale = d3.scale.linear(),
      axisLabelText = null,
      showMaxMin = true, //TODO: showMaxMin should be disabled on all ordinal scaled axes
      highlightZero = true;
      //TODO: considering adding margin

  var axis = d3.svg.axis()
               .scale(scale)
               .orient('bottom')
               .tickFormat(function(d) { return d }), //TODO: decide if we want to keep this
      scale0;

  function chart(selection) {
    selection.each(function(data) {
      var container = d3.select(this);

      var wrap = container.selectAll('g.wrap.axis').data([data]);
      var wrapEnter = wrap.enter().append('g').attr('class', 'wrap axis');
      var gEnter = wrapEnter.append('g');
      var g = wrap.select('g')

      if (axis.orient() == 'top' || axis.orient() == 'bottom')
        axis.ticks(Math.abs(scale.range()[1] - scale.range()[0]) / 100);

      //TODO: consider calculating width/height based on whether or not label is added, for reference in charts using this component


      d3.transition(g)
          .call(axis);

      scale0 = scale0 || axis.scale();

      var axisLabel = g.selectAll('text.axislabel')
          .data([axisLabelText || null]);
      axisLabel.exit().remove();
      switch (axis.orient()) {
        case 'top':
          axisLabel.enter().append('text').attr('class', 'axislabel')
              .attr('text-anchor', 'middle')
              .attr('y', 0);
          axisLabel
              .attr('x', scale.range()[1] / 2);
          if (showMaxMin) {
            var axisMaxMin = wrap.selectAll('g.axisMaxMin')
                           .data(scale.domain());
            axisMaxMin.enter().append('g').attr('class', 'axisMaxMin').append('text');
            axisMaxMin.exit().remove();
            axisMaxMin
                .attr('transform', function(d,i) {
                  return 'translate(' + scale(d) + ',0)'
                })
              .select('text')
                .attr('dy', '0em')
                .attr('y', -axis.tickPadding())
                .attr('text-anchor', 'middle')
                .text(function(d,i) {
                  return ('' + axis.tickFormat()(d)).match('NaN') ? '' : axis.tickFormat()(d)
                });
            d3.transition(axisMaxMin)
                .attr('transform', function(d,i) {
                  return 'translate(' + scale.range()[i] + ',0)'
                });
          }
          break;
        case 'bottom':
          axisLabel.enter().append('text').attr('class', 'axislabel')
              .attr('text-anchor', 'middle')
              .attr('y', 25);
          axisLabel
              .attr('x', scale.range()[1] / 2);
          if (showMaxMin) {
            var axisMaxMin = wrap.selectAll('g.axisMaxMin')
                           .data(scale.domain());
            axisMaxMin.enter().append('g').attr('class', 'axisMaxMin').append('text');
            axisMaxMin.exit().remove();
            axisMaxMin
                .attr('transform', function(d,i) {
                  return 'translate(' + scale(d) + ',0)'
                })
              .select('text')
                .attr('dy', '.71em')
                .attr('y', axis.tickPadding())
                .attr('text-anchor', 'middle')
                .text(function(d,i) {
                  return ('' + axis.tickFormat()(d)).match('NaN') ? '' : axis.tickFormat()(d)
                });
            d3.transition(axisMaxMin)
                .attr('transform', function(d,i) {
                  return 'translate(' + scale.range()[i] + ',0)'
                });
          }
          break;
        case 'right':
          axisLabel.enter().append('text').attr('class', 'axislabel')
               .attr('transform', 'rotate(90)')
              .attr('y', -40); //TODO: consider calculating this based on largest tick width... OR at least expose this on chart
          axisLabel
              .attr('x', -scale.range()[0] / 2);
          if (showMaxMin) {
            var axisMaxMin = wrap.selectAll('g.axisMaxMin')
                           .data(scale.domain());
            axisMaxMin.enter().append('g').attr('class', 'axisMaxMin').append('text')
                .style('opacity', 0);
            axisMaxMin.exit().remove();
            axisMaxMin
                .attr('transform', function(d,i) {
                  return 'translate(0,' + scale(d) + ')'
                })
              .select('text')
                .attr('dy', '.32em')
                .attr('y', 0)
                .attr('x', axis.tickPadding())
                .attr('text-anchor', 'start')
                .text(function(d,i) {
                  return ('' + axis.tickFormat()(d)).match('NaN') ? '' : axis.tickFormat()(d)
                });
            d3.transition(axisMaxMin)
                .attr('transform', function(d,i) {
                  return 'translate(0,' + scale.range()[i] + ')'
                })
              .select('text')
                .style('opacity', 1);
          }
          break;
        case 'left':
          axisLabel.enter().append('text').attr('class', 'axislabel')
               .attr('transform', 'rotate(-90)')
              .attr('y', -40); //TODO: consider calculating this based on largest tick width... OR at least expose this on chart
          axisLabel
              .attr('x', -scale.range()[0] / 2);
          if (showMaxMin) {
            var axisMaxMin = wrap.selectAll('g.axisMaxMin')
                           .data(scale.domain());
            axisMaxMin.enter().append('g').attr('class', 'axisMaxMin').append('text')
                .style('opacity', 0);
            axisMaxMin.exit().remove();
            axisMaxMin
                .attr('transform', function(d,i) {
                  return 'translate(0,' + scale0(d) + ')'
                })
              .select('text')
                .attr('dy', '.32em')
                .attr('y', 0)
                .attr('x', -axis.tickPadding())
                .attr('text-anchor', 'end')
                .text(function(d,i) {
                  return ('' + axis.tickFormat()(d)).match('NaN') ? '' : axis.tickFormat()(d)
                });
            d3.transition(axisMaxMin)
                .attr('transform', function(d,i) {
                  return 'translate(0,' + scale.range()[i] + ')'
                })
              .select('text')
                .style('opacity', 1);
          }
          break;
      }
      axisLabel
          .text(function(d) { return d });


      //check if max and min overlap other values, if so, hide the values that overlap
      if (showMaxMin && (axis.orient() === 'left' || axis.orient() === 'right')) {
        g.selectAll('g') // the g's wrapping each tick
            .each(function(d,i) {
              if (scale(d) < scale.range()[1] + 10 || scale(d) > scale.range()[0] - 10) { // 10 is assuming text height is 16... if d is 0, leave it!
                if (d > 1e-10 || d < -1e-10) // accounts for minor floating point errors... though could be problematic if the scale is EXTREMELY SMALL
                  d3.select(this).remove();
                else
                  d3.select(this).select('text').remove(); // Don't remove the ZERO line!!
              }
            });
      }

      if (showMaxMin && (axis.orient() === 'top' || axis.orient() === 'bottom')) {
        var maxMinRange = [];
        wrap.selectAll('g.axisMaxMin')
            .each(function(d,i) {
              if (i) // i== 1, max position
                maxMinRange.push(scale(d) - this.getBBox().width - 4)  //assuming the max and min labels are as wide as the next tick (with an extra 4 pixels just in case)
              else // i==0, min position
                maxMinRange.push(scale(d) + this.getBBox().width + 4)
            });
        g.selectAll('g') // the g's wrapping each tick
            .each(function(d,i) {
              if (scale(d) < maxMinRange[0] || scale(d) > maxMinRange[1]) {
                if (d > 1e-10 || d < -1e-10) // accounts for minor floating point errors... though could be problematic if the scale is EXTREMELY SMALL
                  d3.select(this).remove();
                else
                  d3.select(this).select('text').remove(); // Don't remove the ZERO line!!
              }
            });
      }


      //highlight zero line ... Maybe should not be an option and should just be in CSS?
      if (highlightZero)
        g.selectAll('line.tick')
          .filter(function(d) { return !parseFloat(Math.round(d*100000)/1000000) }) //this is because sometimes the 0 tick is a very small fraction, TODO: think of cleaner technique
            .classed('zero', true);

      scale0 = scale.copy();

    });


    return chart;
  }


  d3.rebind(chart, axis, 'orient', 'ticks', 'tickValues', 'tickSubdivide', 'tickSize', 'tickPadding', 'tickFormat');
  d3.rebind(chart, scale, 'domain', 'range', 'rangeBand', 'rangeBands'); //these are also accessible by chart.scale(), but added common ones directly for ease of use

  chart.axisLabel = function(_) {
    if (!arguments.length) return axisLabelText;
    axisLabelText = _;
    return chart;
  }

  chart.showMaxMin = function(_) {
    if (!arguments.length) return showMaxMin;
    showMaxMin = _;
    return chart;
  }

  chart.highlightZero = function(_) {
    if (!arguments.length) return highlightZero;
    highlightZero = _;
    return chart;
  }

  chart.scale = function(_) {
    if (!arguments.length) return scale;
    scale = _;
    axis.scale(scale);
    d3.rebind(chart, scale, 'domain', 'range', 'rangeBand', 'rangeBands');
    return chart;
  }


  return chart;
}

nv.models.historicalBar = function() {
  var margin = {top: 0, right: 0, bottom: 0, left: 0},
      width = 960,
      height = 500,
      id = Math.floor(Math.random() * 10000), //Create semi-unique ID in case user doesn't select one
      getX = function(d) { return d.x },
      getY = function(d) { return d.y },
      forceX = [],
      forceY = [],
      clipEdge = true,
      color = d3.scale.category20().range(),
      xDomain, yDomain;

  var x = d3.scale.linear(),
      y = d3.scale.linear(),
      xAxis = d3.svg.axis().scale(x).orient('bottom'),
      yAxis = d3.svg.axis().scale(y).orient('left'),
      dispatch = d3.dispatch('chartClick', 'elementClick', 'elementDblClick', 'elementMouseover', 'elementMouseout');


  function chart(selection) {
    selection.each(function(data) {
      var availableWidth = width - margin.left - margin.right,
          availableHeight = height - margin.top - margin.bottom;


      x   .domain(xDomain || d3.extent(data[0].values, getX ))
          .range([0, availableWidth]);

      y   .domain(yDomain || d3.extent(data[0].values, getY )) //Should 0 always be forced in bar charts?
          .range([availableHeight, 0]);
          //.nice(); // remove for consistency?


      var parent = d3.select(this)
          .on('click', function(d,i) {
            dispatch.chartClick({
                data: d,
                index: i,
                pos: d3.event,
                id: id
            });
          });


      var wrap = d3.select(this).selectAll('g.wrap.bar').data([data[0].values]);
      var wrapEnter = wrap.enter().append('g').attr('class', 'wrap nvd3 bar');
      var gEnter = wrapEnter.append('g');

      gEnter.append('g').attr('class', 'bars');


      wrap.attr('width', width)
          .attr('height', height);

      var g = wrap.select('g')
          .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');


      wrapEnter.append('defs').append('clipPath')
          .attr('id', 'chart-clip-path-' + id)
        .append('rect');
      wrap.select('#chart-clip-path-' + id + ' rect')
          .attr('width', availableWidth)
          .attr('height', availableHeight);

      gEnter
          .attr('clip-path', clipEdge ? 'url(#chart-clip-path-' + id + ')' : '');

      var shiftWrap = gEnter.append('g').attr('class', 'shiftWrap');



      var bars = wrap.select('.bars').selectAll('.bar')
          .data(function(d) { return d });

      bars.exit().remove();


      var barsEnter = bars.enter().append('svg:rect')
          .attr('class', function(d,i) { return getY(d,i) < 0 ? 'bar negative' : 'bar positive'})
          .attr('fill', function(d,i) { return color[0]; })
          .attr('x', 0 )
          .attr('y', function(d,i) {  return y(Math.max(0, getY(d,i))) })
          .attr('height', function(d,i) { return Math.abs(y(getY(d,i)) - y(0)) })
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

      bars
          .attr('class', function(d,i) { return getY(d,i) < 0 ? 'bar negative' : 'bar positive'})
          .attr('transform', function(d,i) { return 'translate(' + (x(getX(d,i)) - x(.5)) + ',0)'; }) //TODO: this assumes that each bar is an integer apart, it shouldn't
          .attr('width', x(.9) ) //TODO: this assumes that each bar is an integar apart

      d3.transition(bars)
          .attr('y', function(d,i) {  return y(Math.max(0, getY(d,i))) })
          .attr('height', function(d,i) { return Math.abs(y(getY(d,i)) - y(0)) });
          //.order();  // not sure if this makes any sense for this model

    });

    return chart;
  }


  chart.dispatch = dispatch;

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

  chart.clipEdge = function(_) {
    if (!arguments.length) return clipEdge;
    clipEdge = _;
    return chart;
  };

  chart.color = function(_) {
    if (!arguments.length) return color;
    color = _;
    return chart;
  };

  chart.id = function(_) {
        if (!arguments.length) return id;
        id = _;
        return chart;
  };



  return chart;
}

// Chart design based on the recommendations of Stephen Few. Implementation
// based on the work of Clint Ivy, Jamie Love, and Jason Davies.
// http://projects.instantcognition.com/protovis/bulletchart/
nv.models.bullet = function() {
  var orient = 'left', // TODO top & bottom
      reverse = false,
      margin = {top: 0, right: 0, bottom: 0, left: 0},
      ranges = function(d) { return d.ranges },
      markers = function(d) { return d.markers },
      measures = function(d) { return d.measures },
      width = 380,
      height = 30,
      tickFormat = null;

  var dispatch = d3.dispatch('elementMouseover', 'elementMouseout');

  // For each small multipleâ€¦
  function chart(g) {
    g.each(function(d, i) {
      var availableWidth = width - margin.left - margin.right,
          availableHeight = height - margin.top - margin.bottom;

      var rangez = ranges.call(this, d, i).slice().sort(d3.descending),
          markerz = markers.call(this, d, i).slice().sort(d3.descending),
          measurez = measures.call(this, d, i).slice().sort(d3.descending);


      var wrap = d3.select(this).selectAll('g.wrap.bullet').data([d]);
      var wrapEnter = wrap.enter().append('g').attr('class', 'wrap nvd3 bullet');
      var gEnter = wrapEnter.append('g');

      var g = wrap.select('g')
      wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');


      // Compute the new x-scale.
      var x1 = d3.scale.linear()
          .domain([0, Math.max(rangez[0], markerz[0], measurez[0])])  // TODO: need to allow forceX and forceY, and xDomain, yDomain
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


      // Update the range rects.
      var range = g.selectAll('rect.range')
          .data(rangez);

      range.enter().append('rect')
          .attr('class', function(d, i) { return 'range s' + i; })
          .attr('width', w0)
          .attr('height', availableHeight)
          .attr('x', reverse ? x0 : 0)
          .on('mouseover', function(d,i) { 
              dispatch.elementMouseover({
                value: d,
                label: (i <= 0) ? 'Maximum' : (i > 1) ? 'Minimum' : 'Mean', //TODO: make these labels a variable
                pos: [x1(d), availableHeight/2]
              })
          })
          .on('mouseout', function(d,i) { 
              dispatch.elementMouseout({
                value: d,
                label: (i <= 0) ? 'Minimum' : (i >=1) ? 'Maximum' : 'Mean', //TODO: make these labels a variable
              })
          })

      d3.transition(range)
          .attr('x', reverse ? x1 : 0)
          .attr('width', w1)
          .attr('height', availableHeight);


      // Update the measure rects.
      var measure = g.selectAll('rect.measure')
          .data(measurez);

      measure.enter().append('rect')
          .attr('class', function(d, i) { return 'measure s' + i; })
          .attr('width', w0)
          .attr('height', availableHeight / 3)
          .attr('x', reverse ? x0 : 0)
          .attr('y', availableHeight / 3)
          .on('mouseover', function(d) { 
              dispatch.elementMouseover({
                value: d,
                label: 'Current', //TODO: make these labels a variable
                pos: [x1(d), availableHeight/2]
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
      var marker = g.selectAll('path.markerTriangle')
          .data(markerz);

      var h3 =  availableHeight / 6;
      marker.enter().append('path')
          .attr('class', 'markerTriangle')
          .attr('transform', function(d) { return 'translate(' + x0(d) + ',' + (availableHeight / 2) + ')' })
          .attr('d', 'M0,' + h3 + 'L' + h3 + ',' + (-h3) + ' ' + (-h3) + ',' + (-h3) + 'Z')
          .on('mouseover', function(d,i) { 
              dispatch.elementMouseover({
                value: d,
                label: 'Previous',
                pos: [x1(d), availableHeight/2]
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
  }


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
    margin = _;
    return chart;
  };

  chart.tickFormat = function(_) {
    if (!arguments.length) return tickFormat;
    tickFormat = _;
    return chart;
  };

  return chart;
};



// Chart design based on the recommendations of Stephen Few. Implementation
// based on the work of Clint Ivy, Jamie Love, and Jason Davies.
// http://projects.instantcognition.com/protovis/bulletchart/
nv.models.bulletChart = function() {
  var orient = 'left', // TODO top & bottom
      reverse = false,
      margin = {top: 5, right: 40, bottom: 20, left: 120},
      ranges = function(d) { return d.ranges },
      markers = function(d) { return d.markers },
      measures = function(d) { return d.measures },
      width = null,
      height = 55,
      tickFormat = null,
      tooltips = true,
      tooltip = function(key, x, y, e, graph) { 
        return '<h3>' + e.label + '</h3>' +
               '<p>' +  e.value + '</p>'
      };


  var dispatch = d3.dispatch('tooltipShow', 'tooltipHide'),
      bullet = nv.models.bullet();


  var showTooltip = function(e, offsetElement) {
    var offsetElement = document.getElementById("chart"),
        left = e.pos[0] + offsetElement.offsetLeft + margin.left,
        top = e.pos[1] + offsetElement.offsetTop + margin.top;

    var content = '<h3>' + e.label + '</h3>' +
            '<p>' + e.value + '</p>';

    nv.tooltip.show([left, top], content, e.value < 0 ? 'e' : 'w');
  };


  // For each small multipleâ€¦
  function chart(g) {
    g.each(function(d, i) {
      var container = d3.select(this);

      var availableWidth = (width  || parseInt(container.style('width')) || 960)
                             - margin.left - margin.right,
          availableHeight = height - margin.top - margin.bottom,
          that = this;

      var rangez = ranges.call(this, d, i).slice().sort(d3.descending),
          markerz = markers.call(this, d, i).slice().sort(d3.descending),
          measurez = measures.call(this, d, i).slice().sort(d3.descending);

      var wrap = container.selectAll('g.wrap.bulletChart').data([d]);
      var wrapEnter = wrap.enter().append('g').attr('class', 'wrap nvd3 bulletChart');
      var gEnter = wrapEnter.append('g');

      gEnter.append('g').attr('class', 'bulletWrap');
      gEnter.append('g').attr('class', 'titles');

      var g = wrap.select('g')
      wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');


      // Compute the new x-scale.
      var x1 = d3.scale.linear()
          .domain([0, Math.max(rangez[0], markerz[0], measurez[0])])  // TODO: need to allow forceX and forceY, and xDomain, yDomain
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


      var title = g.select('.titles').append("g")
          .attr("text-anchor", "end")
          .attr("transform", "translate(-6," + (height - margin.top - margin.bottom) / 2 + ")");
      title.append("text")
          .attr("class", "title")
          .text(function(d) { return d.title; });

      title.append("text")
          .attr("class", "subtitle")
          .attr("dy", "1em")
          .text(function(d) { return d.subtitle; });



      bullet
        .width(availableWidth)
        .height(availableHeight)

      var bulletWrap = g.select('.bulletWrap')
          //.datum(data);

      d3.transition(bulletWrap).call(bullet);



      // Compute the tick format.
      var format = tickFormat || x1.tickFormat(8);

      // Update the tick groups.
      var tick = g.selectAll('g.tick')
          .data(x1.ticks(8), function(d) {
            return this.textContent || format(d);
          });

      // Initialize the ticks with the old scale, x0.
      var tickEnter = tick.enter().append('g')
          .attr('class', 'tick')
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

/*
      bullet.dispatch.on('elementMouseover', function(e) {
          var offsetElement = document.getElementById("chart"),
              left = e.pos[0] + offsetElement.offsetLeft + margin.left,
              top = e.pos[1] + offsetElement.offsetTop + margin.top;

          var content = '<h3>' + e.label + '</h3>' +
                  '<p>' +
                  e.value +
                  '</p>';

          nv.tooltip.show([left, top], content, e.value < 0 ? 'e' : 'w');
      });


      bullet.dispatch.on('elementMouseout', function(e) {
          nv.tooltip.cleanup();
      });
*/

      bullet.dispatch.on('elementMouseover.tooltip', function(e) {
        //e.pos = [e.pos[0] +  margin.left, e.pos[1] + margin.top];
        dispatch.tooltipShow(e);
      });
      if (tooltips) dispatch.on('tooltipShow', function(e) { showTooltip(e, that.parentNode) } ); // TODO: maybe merge with above?

      bullet.dispatch.on('elementMouseout.tooltip', function(e) {
        dispatch.tooltipHide(e);
      });
      if (tooltips) dispatch.on('tooltipHide', nv.tooltip.cleanup);



    });
    d3.timer.flush();
  }


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
    margin = _;
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


  return chart;
};



nv.models.cumulativeLineChart = function() {
  var margin = {top: 30, right: 20, bottom: 50, left: 60},
      color = d3.scale.category20().range(),
      width = null, 
      height = null,
      showLegend = true,
      tooltips = true,
      showRescaleToggle = false, //TODO: get rescale y functionality back (need to calculate exten of y for ALL possible re-zero points
      rescaleY = true;
      tooltip = function(key, x, y, e, graph) { 
        return '<h3>' + key + '</h3>' +
               '<p>' +  y + ' at ' + x + '</p>'
      };

  var lines = nv.models.line(),
      x = lines.xScale(),
      y = lines.yScale(),
      dx = d3.scale.linear(),
      id = lines.id(),
      xAxis = nv.models.axis().scale(x).orient('bottom').tickPadding(5),
      yAxis = nv.models.axis().scale(y).orient('left'),
      legend = nv.models.legend().height(30),
      controls = nv.models.legend().height(30),
      dispatch = d3.dispatch('tooltipShow', 'tooltipHide'),
      index = {i: 0, x: 0};

  //TODO: let user select default
  var controlsData = [
    { key: 'Re-scale y-axis' }
  ];

  var showTooltip = function(e, offsetElement) {
    //console.log('left: ' + offsetElement.offsetLeft);
    //console.log('top: ' + offsetElement.offsetLeft);

    //TODO: FIX offsetLeft and offSet top do not work if container is shifted anywhere
    //var offsetElement = document.getElementById(selector.substr(1)),
    var left = e.pos[0] + ( offsetElement.offsetLeft || 0 ),
        top = e.pos[1] + ( offsetElement.offsetTop || 0),
        x = xAxis.tickFormat()(lines.x()(e.point)),
        y = yAxis.tickFormat()(lines.y()(e.point)),
        content = tooltip(e.series.key, x, y, e, chart);

    nv.tooltip.show([left, top], content);
  };


  var indexDrag = d3.behavior.drag()
                    .on('dragstart', dragStart)
                    .on('drag', dragMove)
                    .on('dragend', dragEnd);

  function dragStart(d,i) {}

  function dragMove(d,i) {
    d.x += d3.event.dx;
    d.i = Math.round(dx.invert(d.x));

    //d3.transition(d3.select('.chart-' + id)).call(chart);
    d3.select(this).attr('transform', 'translate(' + dx(d.i) + ',0)');
  }

  function dragEnd(d,i) {
    //d3.transition(d3.select('.chart-' + id)).call(chart);
    chart.update();
  }



  function chart(selection) {
    selection.each(function(data) {
      var container = d3.select(this).classed('chart-' + id, true),
          that = this;

      var availableWidth = (width  || parseInt(container.style('width')) || 960)
                             - margin.left - margin.right,
          availableHeight = (height || parseInt(container.style('height')) || 400)
                             - margin.top - margin.bottom;


      var data = indexify(index.i, data);


      dx  .domain([0, data[0].values.length - 1]) //Assumes all series have same length
          .range([0, availableWidth])
          .clamp(true);



      var wrap = container.selectAll('g.wrap.cumulativeLine').data([data]);
      var gEnter = wrap.enter().append('g').attr('class', 'wrap nvd3 cumulativeLine').append('g');

      gEnter.append('g').attr('class', 'x axis');
      gEnter.append('g').attr('class', 'y axis');
      gEnter.append('g').attr('class', 'linesWrap');
      gEnter.append('g').attr('class', 'legendWrap');
      gEnter.append('g').attr('class', 'controlsWrap');


      var g = wrap.select('g');




      if (showLegend) {
        legend.width(availableWidth);

        g.select('.legendWrap')
            .datum(data)
            .call(legend);

        if ( margin.top != legend.height()) {
          margin.top = legend.height();
          availableHeight = (height || parseInt(container.style('height')) || 400)
                             - margin.top - margin.bottom;
        }

        g.select('.legendWrap')
            .attr('transform', 'translate(0,' + (-margin.top) +')')
      }


      if (showRescaleToggle) {
        controls.width(140).color(['#444', '#444', '#444']);
        g.select('.controlsWrap')
            .datum(controlsData)
            .attr('transform', 'translate(0,' + (-margin.top) +')')
            .call(controls);
      }



      lines
        //.x(function(d) { return d.x })
        .y(function(d) { return d.display.y })
        .width(availableWidth)
        .height(availableHeight)
        .color(data.map(function(d,i) {
          return d.color || color[i % color.length];
        }).filter(function(d,i) { return !data[i].disabled }));



      g.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');


      var linesWrap = g.select('.linesWrap')
          .datum(data.filter(function(d) { return !d.disabled }))

      d3.transition(linesWrap).call(lines);


      var indexLine = linesWrap.selectAll('.indexLine')
          .data([index]);
      indexLine.enter().append('rect').attr('class', 'indexLine')
          .attr('width', 3)
          .attr('x', -2)
          .attr('fill', 'red')
          .attr('fill-opacity', .5)
          .call(indexDrag)

      indexLine
          .attr('transform', function(d) { return 'translate(' + dx(d.i) + ',0)' })
          .attr('height', availableHeight)



      xAxis
        .ticks( availableWidth / 100 )
        .tickSize(-availableHeight, 0);

      g.select('.x.axis')
          .attr('transform', 'translate(0,' + y.range()[0] + ')');
      d3.transition(g.select('.x.axis'))
          .call(xAxis);


      yAxis
        .ticks( availableHeight / 36 )
        .tickSize( -availableWidth, 0);

      d3.transition(g.select('.y.axis'))
          .call(yAxis);


      controls.dispatch.on('legendClick', function(d,i) { 
        d.disabled = !d.disabled;
        rescaleY = !d.disabled;

        //console.log(d,i,arguments);

        selection.transition().call(chart);
      });


      legend.dispatch.on('legendClick', function(d,i) { 
        d.disabled = !d.disabled;

        if (!data.filter(function(d) { return !d.disabled }).length) {
          data.map(function(d) {
            d.disabled = false;
            wrap.selectAll('.series').classed('disabled', false);
            return d;
          });
        }

        selection.transition().call(chart);
      });

/*
      //
      legend.dispatch.on('legendMouseover', function(d, i) {
        d.hover = true;
        selection.transition().call(chart)
      });

      legend.dispatch.on('legendMouseout', function(d, i) {
        d.hover = false;
        selection.transition().call(chart)
      });
*/

      lines.dispatch.on('elementMouseover.tooltip', function(e) {
        e.pos = [e.pos[0] +  margin.left, e.pos[1] + margin.top];
        dispatch.tooltipShow(e);
      });
      if (tooltips) dispatch.on('tooltipShow', function(e) { showTooltip(e, that.parentNode) } ); // TODO: maybe merge with above?

      lines.dispatch.on('elementMouseout.tooltip', function(e) {
        dispatch.tooltipHide(e);
      });
      if (tooltips) dispatch.on('tooltipHide', nv.tooltip.cleanup);

    });


    //TODO: decide if this is a good idea, and if it should be in all models
    chart.update = function() { chart(selection) };
    chart.container = this; // I need a reference to the container in order to have outside code check if the chart is visible or not


    return chart;
  }


  chart.dispatch = dispatch;
  chart.legend = legend;
  chart.xAxis = xAxis;
  chart.yAxis = yAxis;

  d3.rebind(chart, lines, 'x', 'y', 'size', 'xDomain', 'yDomain', 'forceX', 'forceY', 'interactive', 'clipEdge', 'clipVoronoi', 'id');


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



  // ********** FUNCTIONS **********

  /* Normalize the data according to an index point. */
  function indexify(idx, data) {
    return data.map(function(line, i) {
      var v = lines.y()(line.values[idx], idx);

      line.values = line.values.map(function(point, pointIndex) {
        point.display = {'y': (lines.y()(point, pointIndex) - v) / (1 + v) };
        return point;
      })
      /*
      if (v < -.9) {
        //if a series loses more than 100%, calculations fail.. anything close can cause major distortion (but is mathematically currect till it hits 100)
      }
      */
      return line;
    })
  }



  return chart;
}

nv.models.discreteBar = function() {
  var margin = {top: 0, right: 0, bottom: 0, left: 0},
      width = 960,
      height = 500,
      id = Math.floor(Math.random() * 10000), //Create semi-unique ID in case user doesn't select one
      x = d3.scale.ordinal(),
      y = d3.scale.linear(),
      getX = function(d) { return d.x },
      getY = function(d) { return d.y },
      forceY = [0], // 0 is forced by default.. this makes sense for the majority of bar graphs... user can always do chart.forceY([]) to remove
      color = d3.scale.category20().range(),
      showValues = false,
      valueFormat = d3.format(',.2f'),
      xDomain, yDomain,
      x0, y0;

  var dispatch = d3.dispatch('chartClick', 'elementClick', 'elementDblClick', 'elementMouseover', 'elementMouseout');


//TODO: remove all the code taht deals with multiple series
  function chart(selection) {
    selection.each(function(data) {
      var availableWidth = width - margin.left - margin.right,
          availableHeight = height - margin.top - margin.bottom;



      //add series index to each data point for reference
      data = data.map(function(series, i) {
        series.values = series.values.map(function(point) {
          point.series = i;
          return point;
        });
        return series;
      });


      var seriesData = (xDomain && yDomain) ? [] : // if we know xDomain and yDomain, no need to calculate
            data.map(function(d) { 
              return d.values.map(function(d,i) {
                return { x: getX(d,i), y: getY(d,i), y0: d.y0 }
              })
            });

      x   .domain(xDomain || d3.merge(seriesData).map(function(d) { return d.x }))
          .rangeBands([0, availableWidth], .1);

      y   .domain(yDomain || d3.extent(d3.merge(seriesData).map(function(d) { return d.y }).concat(forceY)))
          //.range([availableHeight, 0]);


      if (showValues) y.range([availableHeight - (y.domain()[0] < 0 ? 12 : 0), y.domain()[1] > 0 ? 12 : 0]);
      else y.range([availableHeight, 0]);

      //store old scales if they exist
      x0 = x0 || x; //TODO: decide whether or not to keep
      y0 = y0 || d3.scale.linear().domain(y.domain()).range([y(0),y(0)]);

      var wrap = d3.select(this).selectAll('g.wrap.discretebar').data([data]);
      var wrapEnter = wrap.enter().append('g').attr('class', 'wrap nvd3 discretebar');
      var gEnter = wrapEnter.append('g');

      gEnter.append('g').attr('class', 'groups');

      var g = wrap.select('g')
      wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');





      //TODO: by definiteion, the discrete bar should not have multiple groups, will modify/remove later
      var groups = wrap.select('.groups').selectAll('.group')
          .data(function(d) { return d }, function(d) { return d.key });
      groups.enter().append('g')
          .style('stroke-opacity', 1e-6)
          .style('fill-opacity', 1e-6)
      d3.transition(groups.exit())
          .style('stroke-opacity', 1e-6)
          .style('fill-opacity', 1e-6)
          .remove();
      groups
          .attr('class', function(d,i) { return 'group series-' + i })
          .classed('hover', function(d) { return d.hover })
      d3.transition(groups)
          .style('stroke-opacity', 1)
          .style('fill-opacity', .75);


      var bars = groups.selectAll('g.bar')
          .data(function(d) { return d.values });

      bars.exit().remove();


      var barsEnter = bars.enter().append('g')
          .attr('transform', function(d,i,j) {
              return 'translate(' + x(getX(d,i)) + ', ' + y(0) + ')' 
          })
          .on('mouseover', function(d,i) { //TODO: figure out why j works above, but not here
            d3.select(this).classed('hover', true);
            dispatch.elementMouseover({
              value: getY(d,i),
              point: d,
              series: data[d.series],
              pos: [x(getX(d,i)) + (x.rangeBand() * (d.series + .5) / data.length), y(getY(d,i))],  // TODO: Figure out why the value appears to be shifted
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
              pos: [x(getX(d,i)) + (x.rangeBand() * (d.series + .5) / data.length), y(getY(d,i))],  // TODO: Figure out why the value appears to be shifted
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
              pos: [x(getX(d,i)) + (x.rangeBand() * (d.series + .5) / data.length), y(getY(d,i))],  // TODO: Figure out why the value appears to be shifted
              pointIndex: i,
              seriesIndex: d.series,
              e: d3.event
            });
            d3.event.stopPropagation();
          });

      barsEnter.append('rect')
          .attr('height', 0)
          .attr('width', x.rangeBand() / data.length )
          .style('fill', function(d,i){  return d.color || color[i % color.length] }) //this is a 'hack' to allow multiple colors in a single series... will need to rethink this methodology
          .style('stroke', function(d,i){ return d.color || color[i % color.length] })

      if (showValues) {
        barsEnter.append('text')
          .attr('text-anchor', 'middle')
        bars.selectAll('text')
          .attr('x', x.rangeBand() / 2)
          .attr('y', function(d,i) { return getY(d,i) < 0 ? y(getY(d,i)) - y(0) + 12 : -4 })
          .text(function(d,i) { return valueFormat(getY(d,i)) })
      } else {
        bars.selectAll('text').remove();
      }

      bars
          .attr('class', function(d,i) { return getY(d,i) < 0 ? 'bar negative' : 'bar positive'})
          //.attr('transform', function(d,i) { return 'translate(' + x(getX(d,i)) + ',0)'; })
          .attr('transform', function(d,i) {
              return 'translate(' + x(getX(d,i)) + ', ' + (getY(d,i) < 0 ? y0(0) : y0(getY(d,i))) + ')' 
          })
        .selectAll('rect')
          .attr('width', x.rangeBand() / data.length)
      d3.transition(bars)
        //.delay(function(d,i) { return i * 1200 / data[0].values.length })
          .attr('transform', function(d,i) {
              return 'translate(' + x(getX(d,i)) + ', ' + (getY(d,i) < 0 ? y(0) : y(getY(d,i))) + ')' 
          })
        .selectAll('rect')
          //.attr('width', x.rangeBand() / data.length)
          .attr('height', function(d,i) {
             return Math.abs(y(getY(d,i)) - y(0))
           });




      //TODO: decide if this makes sense to add into all the models for ease of updating (updating without needing the selection)
      chart.update = function() {
        selection.transition().call(chart);
      }

      //store old scales for use in transitions on update, to animate from old to new positions, and sizes
      x0 = x.copy();
      y0 = y.copy();

    });

    return chart;
  }


  chart.dispatch = dispatch;

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

  chart.forceY = function(_) {
    if (!arguments.length) return forceY;
    forceY = _;
    return chart;
  };

  chart.color = function(_) {
    if (!arguments.length) return color;
    color = _;
    return chart;
  };

  chart.id = function(_) {
    if (!arguments.length) return id;
    id = _;
    return chart;
  };

  chart.showValues = function(_) {
    if (!arguments.length) return showValues;
    showValues = _;
    return chart;
  };

  chart.valueFormat= function(_) {
    if (!arguments.length) return valueFormat;
    valueFormat = _;
    return chart;
  };


  return chart;
}

nv.models.discreteBarChart = function() {
  var margin = {top: 10, right: 10, bottom: 50, left: 60},
      width = null,
      height = null,
      color = d3.scale.category20().range(),
      staggerLabels = false,
      rotateLabels = 0,
      tooltips = true,
      tooltip = function(key, x, y, e, graph) { 
        return '<h3>' + x + '</h3>' +
               '<p>' +  y + '</p>'
      };


  var discretebar = nv.models.discreteBar(),
      x = discretebar.xScale(),
      y = discretebar.yScale(),
      xAxis = nv.models.axis().scale(x).orient('bottom').highlightZero(false).showMaxMin(false),
      yAxis = nv.models.axis().scale(y).orient('left'),
      dispatch = d3.dispatch('tooltipShow', 'tooltipHide');

  xAxis.tickFormat(function(d) { return d });
  yAxis.tickFormat(d3.format(',.1f'));


  var showTooltip = function(e, offsetElement) {
    var left = e.pos[0] + ( offsetElement.offsetLeft || 0 ),
        top = e.pos[1] + ( offsetElement.offsetTop || 0),
        x = xAxis.tickFormat()(discretebar.x()(e.point)),
        y = yAxis.tickFormat()(discretebar.y()(e.point)),
        content = tooltip(e.series.key, x, y, e, chart);

    nv.tooltip.show([left, top], content, e.value < 0 ? 'n' : 's');
  };


  //TODO: let user select default
  var controlsData = [
    { key: 'Grouped' },
    { key: 'Stacked', disabled: true }
  ];

  function chart(selection) {
    selection.each(function(data) {
      var container = d3.select(this),
          that = this;

      var availableWidth = (width  || parseInt(container.style('width')) || 960)
                             - margin.left - margin.right,
          availableHeight = (height || parseInt(container.style('height')) || 400)
                             - margin.top - margin.bottom;


      discretebar
        .width(availableWidth)
        .height(availableHeight);


      var wrap = container.selectAll('g.wrap.discreteBarWithAxes').data([data]);
      var gEnter = wrap.enter().append('g').attr('class', 'wrap nvd3 discreteBarWithAxes').append('g');
      var defsEnter = gEnter.append('defs');

      gEnter.append('g').attr('class', 'x axis');
      gEnter.append('g').attr('class', 'y axis');
      gEnter.append('g').attr('class', 'barsWrap');



      var g = wrap.select('g');


      g.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      var barsWrap = g.select('.barsWrap')
          .datum(data.filter(function(d) { return !d.disabled }))


      d3.transition(barsWrap).call(discretebar);


      defsEnter.append('clipPath')
          .attr('id', 'x-label-clip-' + discretebar.id())
        .append('rect')

      g.select('#x-label-clip-' + discretebar.id() + ' rect')
          .attr('width', x.rangeBand() * (staggerLabels ? 2 : 1))
          .attr('height', 16)
          .attr('x', -x.rangeBand() / (staggerLabels ? 1 : 2 ));


      xAxis
        .ticks( availableWidth / 100 )
        .tickSize(-availableHeight, 0);

      g.select('.x.axis')
          .attr('transform', 'translate(0,' + (y.range()[0] + ((discretebar.showValues() && y.domain()[0] < 0) ? 16 : 0)) + ')')
      //d3.transition(g.select('.x.axis'))
      g.select('.x.axis').transition().duration(0)
          .call(xAxis);


      var xTicks = g.select('.x.axis').selectAll('g');

      if (staggerLabels)
        xTicks
            .selectAll('text')
            .attr('transform', function(d,i,j) { return 'translate(0,' + (j % 2 == 0 ? '0' : '12') + ')' })

      if (rotateLabels)
        xTicks
            .selectAll('text')
            .attr('transform', function(d,i,j) { return 'rotate(' + rotateLabels + ' 0,0)' })
            .attr('text-anchor', 'end') //TODO: figure out why this gets changed to middle, and fix this

      xTicks
          .selectAll('text')
          .attr('clip-path', function(d,i,j) { return rotateLabels ? '' : 'url(#x-label-clip-' + discretebar.id() + ')' });


      yAxis
        .ticks( availableHeight / 36 )
        .tickSize( -availableWidth, 0);

      d3.transition(g.select('.y.axis'))
          .call(yAxis);


      discretebar.dispatch.on('elementMouseover.tooltip', function(e) {
        e.pos = [e.pos[0] +  margin.left, e.pos[1] + margin.top];
        dispatch.tooltipShow(e);
      });
      if (tooltips) dispatch.on('tooltipShow', function(e) { showTooltip(e, that.parentNode) } ); // TODO: maybe merge with above?

      discretebar.dispatch.on('elementMouseout.tooltip', function(e) {
        dispatch.tooltipHide(e);
      });
      if (tooltips) dispatch.on('tooltipHide', nv.tooltip.cleanup);


      //TODO: decide if this makes sense to add into all the models for ease of updating (updating without needing the selection)
      chart.update = function() { selection.transition().call(chart); };
      chart.container = this; // I need a reference to the container in order to have outside code check if the chart is visible or not

    });

    return chart;
  }


  chart.dispatch = dispatch;
  chart.discretebar = discretebar; // really just makign the accessible for discretebar.dispatch, may rethink slightly
  chart.xAxis = xAxis;
  chart.yAxis = yAxis;

  d3.rebind(chart, discretebar, 'x', 'y', 'xDomain', 'yDomain', 'forceX', 'forceY', 'id', 'showValues', 'valueFormat');


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
    discretebar.color(_);
    return chart;
  };

  chart.staggerLabels = function(_) {
    if (!arguments.length) return staggerLabels;
    staggerLabels = _;
    return chart;
  };

  chart.rotateLabels = function(_) {
    if (!arguments.length) return rotateLabels;
    rotateLabels = _;
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
}

nv.models.distribution = function() {
  var margin = {top: 0, right: 0, bottom: 0, left: 0},
      width = 400, //technically width or height depending on x or y....
      size = 8,
      axis = 'x', // 'x' or 'y'... horizontal or vertical
      getData = function(d) { return d[axis] },  // defaults d.x or d.y
      color = d3.scale.category20().range(),
      domain;

  var scale = d3.scale.linear(),
      scale0;

  function chart(selection) {
    selection.each(function(data) {
      var availableLength = width - (axis === 'x' ? margin.left + margin.right : margin.top + margin.bottom),
          naxis = axis == 'x' ? 'y' : 'x';


      //store old scales if they exist
      scale0 = scale0 || scale;

/*
      scale
          .domain(domain || d3.extent(data, getData))
          .range(axis == 'x' ? [0, availableLength] : [availableLength,0]);
*/


      var wrap = d3.select(this).selectAll('g.distribution').data([data]);
      var wrapEnter = wrap.enter().append('g').attr('class', 'nvd3 distribution');
      var gEnter = wrapEnter.append('g');
      var g = wrap.select('g');

      wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')

      var distWrap = g.selectAll('g.dist')
          .data(function(d) { return d }, function(d) { return d.key });

      distWrap.enter().append('g')
      distWrap
          .attr('class', function(d,i) { return 'dist series-' + i })
          .style('stroke', function(d,i) { return color[i % color.length] });
          //.style('stroke', function(d,i) { return color.filter(function(d,i) { return data[i] && !data[i].disabled })[i % color.length] });

      var dist = distWrap.selectAll('line.dist' + axis)
          .data(function(d) { return d.values })
      dist.enter().append('line')
          .attr(axis + '1', function(d,i) { return scale0(getData(d,i)) })
          .attr(axis + '2', function(d,i) { return scale0(getData(d,i)) })
      d3.transition(distWrap.exit().selectAll('line.dist' + axis))
          .attr(axis + '1', function(d,i) { return scale(getData(d,i)) })
          .attr(axis + '2', function(d,i) { return scale(getData(d,i)) })
          .style('stroke-opacity', 0)
          .remove();
      dist
      //distWrap.selectAll('line.dist' + axis)
          .attr('class', function(d,i) { return 'dist' + axis + ' dist' + axis + '-' + i })
          .attr(naxis + '1', 0)
          .attr(naxis + '2', size);
      d3.transition(dist)
      //d3.transition(distWrap.selectAll('line.dist' + axis))
          .attr(axis + '1', function(d,i) { return scale(getData(d,i)) })
          .attr(axis + '2', function(d,i) { return scale(getData(d,i)) })


      scale0 = scale.copy();

    });

    return chart;
  }


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

  chart.axis = function(_) {
    if (!arguments.length) return axis;
    axis = _;
    return chart;
  };

  chart.size = function(_) {
    if (!arguments.length) return size;
    size = _;
    return chart;
  };

  chart.getData = function(_) {
    if (!arguments.length) return getData;
    getData = d3.functor(_);
    return chart;
  };

  chart.scale = function(_) {
    if (!arguments.length) return scale;
    scale = _;
    return chart;
  };

  chart.color = function(_) {
    if (!arguments.length) return color;
    color = _;
    return chart;
  };

  return chart;
}

nv.models.legend = function() {
  var margin = {top: 5, right: 0, bottom: 5, left: 0},
      width = 400,
      height = 20,
      getKey = function(d) { return d.key },
      color = d3.scale.category20().range(),
      align = true;

  var dispatch = d3.dispatch('legendClick', 'legendDblclick', 'legendMouseover', 'legendMouseout'); //TODO: theres are really element or series events, there are currently no 'LEGEND' events (as in entire legend)... decide if they are needed

  function chart(selection) {
    selection.each(function(data) {
      var availableWidth = width - margin.left - margin.right;

      var wrap = d3.select(this).selectAll('g.legend').data([data]);
      var gEnter = wrap.enter().append('g').attr('class', 'nvd3 legend').append('g');


      var g = wrap.select('g')
          .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');


      var series = g.selectAll('.series')
          .data(function(d) { return d });
      var seriesEnter = series.enter().append('g').attr('class', 'series')
          .on('mouseover', function(d,i) {
            dispatch.legendMouseover(d,i);  //TODO: Make consistent with other event objects
          })
          .on('mouseout', function(d,i) {
            dispatch.legendMouseout(d,i);
          })
          .on('click', function(d,i) {
            dispatch.legendClick(d,i);
          })
          .on('dblclick', function(d,i) {
            dispatch.legendDblclick(d,i);
          });
      seriesEnter.append('circle')
          .style('fill', function(d,i) { return d.color || color[i % color.length] })
          .style('stroke', function(d,i) { return d.color || color[i % color.length] })
          .style('stroke-width', 2)
          .attr('r', 5);
      seriesEnter.append('text')
          .text(getKey)
          .attr('text-anchor', 'start')
          .attr('dy', '.32em')
          .attr('dx', '8');
      series.classed('disabled', function(d) { return d.disabled });
      series.exit().remove();


      //TODO: implement fixed-width and max-width options (max-width is especially useful with the align option)


      // NEW ALIGNING CODE, TODO: drastically clean up ... this is just the ugly initial code to make sure the math is right
      if (align) {
        var seriesWidths = [];
        series.each(function(d,i) {
              seriesWidths.push(d3.select(this).select('text').node().getComputedTextLength() + 28); // 28 is ~ the width of the circle plus some padding
            });

        //console.log('Series Widths: ', JSON.stringify(seriesWidths));

        var seriesPerRow = 0;
        var legendWidth = 0;
        var columnWidths = [];

        while ( legendWidth < availableWidth && seriesPerRow < seriesWidths.length) {
          columnWidths[seriesPerRow] = seriesWidths[seriesPerRow];
          legendWidth += seriesWidths[seriesPerRow++];
        }


        while ( legendWidth > availableWidth && seriesPerRow > 1 ) {
          columnWidths = [];
          seriesPerRow--;

          for (k = 0; k < seriesWidths.length; k++) {
            if (seriesWidths[k] > (columnWidths[k % seriesPerRow] || 0) )
              columnWidths[k % seriesPerRow] = seriesWidths[k];
          }

          legendWidth = columnWidths.reduce(function(prev, cur, index, array) {
                          return prev + cur;
                        });
        }
        //console.log(columnWidths, legendWidth, seriesPerRow);

        var xPositions = [];
        for (var i = 0, curX = 0; i < seriesPerRow; i++) {
            xPositions[i] = curX;
            curX += columnWidths[i];
        }

        series
            .attr('transform', function(d, i) {
              return 'translate(' + xPositions[i % seriesPerRow] + ',' + (5 + Math.floor(i / seriesPerRow) * 20) + ')';
            });

        //position legend as far right as possible within the total width
        g.attr('transform', 'translate(' + (width - margin.right - legendWidth) + ',' + margin.top + ')');

        height = margin.top + margin.bottom + (Math.ceil(seriesWidths.length / seriesPerRow) * 20);
      } else {

        var ypos = 5,
            newxpos = 5,
            maxwidth = 0,
            xpos;
        series
            .attr('transform', function(d, i) {
              var length = d3.select(this).select('text').node().getComputedTextLength() + 28;
              xpos = newxpos;

              if (width < margin.left + margin.right + xpos + length) {
                newxpos = xpos = 5;
                ypos += 20;
              }

              newxpos += length;
              if (newxpos > maxwidth) maxwidth = newxpos;

              return 'translate(' + xpos + ',' + ypos + ')';
            });

        //position legend as far right as possible within the total width
        g.attr('transform', 'translate(' + (width - margin.right - maxwidth) + ',' + margin.top + ')');

        height = margin.top + margin.bottom + ypos + 15;
      }




    });

    return chart;
  }


  chart.dispatch = dispatch;

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

  chart.key = function(_) {
    if (!arguments.length) return getKey;
    getKey = _;
    return chart;
  };

  chart.color = function(_) {
    if (!arguments.length) return color;
    color = _;
    return chart;
  };

  chart.align = function(_) {
    if (!arguments.length) return align;
    align = _;
    return chart;
  };

  return chart;
}

nv.models.line = function() {
  //Default Settings
  var margin = {top: 0, right: 0, bottom: 0, left: 0},
      width = 960,
      height = 500,
      color = d3.scale.category20().range(), // array of colors to be used in order
      id = Math.floor(Math.random() * 10000), //Create semi-unique ID incase user doesn't select one
      getX = function(d) { return d.x }, // accessor to get the x value from a data point
      getY = function(d) { return d.y }, // accessor to get the y value from a data point
      clipEdge = false; // if true, masks lines within x and y scale


  var scatter = nv.models.scatter()
                  .id(id)
                  .size(16) // default size
                  .sizeDomain([16,256]), //set to speed up calculation, needs to be unset if there is a cstom size accessor
      x, y, x0, y0,
      timeoutID;


  function chart(selection) {
    selection.each(function(data) {
      var availableWidth = width - margin.left - margin.right,
          availableHeight = height - margin.top - margin.bottom;

      //scales need to be set here incase a custom scale was set
      x = x || scatter.xScale();
      y = y || scatter.yScale();

      x0 = x0 || x;
      y0 = y0 || y;


      var wrap = d3.select(this).selectAll('g.wrap.line').data([data]);
      var wrapEnter = wrap.enter().append('g').attr('class', 'wrap nvd3 line');
      var defsEnter = wrapEnter.append('defs');
      var gEnter = wrapEnter.append('g');
      var g = wrap.select('g')

      gEnter.append('g').attr('class', 'groups');
      gEnter.append('g').attr('class', 'scatterWrap');

      var scatterWrap = wrap.select('.scatterWrap');//.datum(data);


      scatter
        .width(availableWidth)
        .height(availableHeight)

      d3.transition(scatterWrap).call(scatter);



      wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');


      defsEnter.append('clipPath')
          .attr('id', 'edge-clip-' + id)
        .append('rect');

      wrap.select('#edge-clip-' + id + ' rect')
          .attr('width', availableWidth)
          .attr('height', availableHeight);

      g   .attr('clip-path', clipEdge ? 'url(#edge-clip-' + id + ')' : '');
      scatterWrap
          .attr('clip-path', clipEdge ? 'url(#edge-clip-' + id + ')' : '');




      var groups = wrap.select('.groups').selectAll('.group')
          .data(function(d) { return d }, function(d) { return d.key });
      groups.enter().append('g')
          .style('stroke-opacity', 1e-6)
          .style('fill-opacity', 1e-6);
      d3.transition(groups.exit())
          .style('stroke-opacity', 1e-6)
          .style('fill-opacity', 1e-6)
          .remove();
      groups
          .attr('class', function(d,i) { return 'group series-' + i })
          .classed('hover', function(d) { return d.hover })
          .style('fill', function(d,i){ return color[i % color.length] })
          .style('stroke', function(d,i){ return color[i % color.length] })
      d3.transition(groups)
          .style('stroke-opacity', 1)
          .style('fill-opacity', .5)


      var paths = groups.selectAll('path')
          .data(function(d, i) { return [d.values] });
      paths.enter().append('path')
          .attr('class', 'line')
          .attr('d', d3.svg.line()
            .x(function(d,i) { return x0(getX(d,i)) })
            .y(function(d,i) { return y0(getY(d,i)) })
          );
      d3.transition(groups.exit().selectAll('path'))
          .attr('d', d3.svg.line()
            .x(function(d,i) { return x(getX(d,i)) })
            .y(function(d,i) { return y(getY(d,i)) })
          );
      d3.transition(paths)
          .attr('d', d3.svg.line()
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

  d3.rebind(chart, scatter, 'interactive', 'size', 'xScale', 'yScale', 'zScale', 'xDomain', 'yDomain', 'sizeDomain', 'forceX', 'forceY', 'forceSize', 'clipVoronoi', 'clipRadius');

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
    color = _;
    scatter.color(_);
    return chart;
  };

  chart.id = function(_) {
    if (!arguments.length) return id;
    id = _;
    return chart;
  };


  return chart;
}

//TODO: Finish merging this chart into the NVD3 style!
nv.models.indentedTree = function() {
  //Default Settings
  var margin = {top: 0, right: 0, bottom: 0, left: 0}, //TODO: implement, maybe as margin on the containing div
      width = 960,
      height = 500,
      color = d3.scale.category20().range(),
      id = Math.floor(Math.random() * 10000), 
      header = true,
      noResultsText = 'No Results found.'
      childIndent = 20,
      columns = [{key:'key', label: 'Name', type:'text'}], //TODO: consider functions like chart.addColumn, chart.removeColumn, instead of a block like this
      tableClass = null,
      iconOpen = 'images/grey-plus.png', //TODO: consider removing this and replacing with a '+' or '-' unless user defines images
      iconClose = 'images/grey-minus.png';


  var dispatch = d3.dispatch('elementClick', 'elementDblclick', 'elementMouseover', 'elementMouseout');


  function chart(selection) {
    selection.each(function(data) {
      var availableWidth = width - margin.left - margin.right,  //TODO: decide if there is any use for these
          availableHeight = height - margin.top - margin.bottom;


      chart.update = function() { selection.transition().call(chart) };

      var i = 0,
          depth = 1;

      var tree = d3.layout.tree()
          .children(function(d) { return d.values })
          .size([height, childIndent]); //Not sure if this is needed now that the result is HTML


      if (!data[0].key) data[0].key = noResultsText;

      var nodes = tree.nodes(data[0]);


      var wrap = d3.select(this).selectAll('div').data([[nodes]]);
      var wrapEnter = wrap.enter().append('div').attr('class', 'wrap nvd3 indentedtree');
      var tableEnter = wrapEnter.append('table');
      var table = wrap.select('table').attr('width', '100%').attr('class', tableClass);



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
                    .data(function(d) {return d });
      tbody.enter().append('tbody');



      //compute max generations
      depth = d3.max(nodes, function(node) { return node.depth });
      tree.size([height, depth * childIndent]); //TODO: see if this is necessary at all


      // Update the nodes…
      var node = tbody.selectAll('tr')
          .data(function(d) { return d }, function(d) { return d.id || (d.id == ++i)});
          //.style('display', 'table-row'); //TODO: see if this does anything

      node.exit().remove();


      node.select('img.treeicon')
          .attr('src', icon)
          .classed('folded', folded);

      var nodeEnter = node.enter().append('tr');


      columns.forEach(function(column, index) {

        var nodeName = nodeEnter.append('td')
            .style('padding-left', function(d) { return (index ? 0 : d.depth * childIndent + 12 + (icon(d) ? 0 : 16)) + 'px' }, 'important') //TODO: check why I did the ternary here
            .style('text-align', column.type == 'numeric' ? 'right' : 'left');


        if (index == 0) {
          nodeName.append('img')
              .classed('treeicon', true)
              .classed('folded', folded)
              .attr('src', icon)
              .style('width', '14px')
              .style('height', '14px')
              .style('padding', '0 1px')
              .style('display', function(d) { return icon(d) ? 'inline-block' : 'none'; })
              .on('click', click);
        }


        nodeName.append('span')
            .attr('class', d3.functor(column.classes) )
            .text(function(d) { return column.format ? column.format(d) :
                                        (d[column.key] || '-') });

        if  (column.showCount)
          nodeName.append('span')
              .attr('class', 'childrenCount')
              .text(function(d) {
                return ((d.values && d.values.length) || (d._values && d._values.length)) ?
                    '(' + ((d.values && d.values.length) || (d._values && d._values.length)) + ')'
                  : ''
              });


        if (column.click)
          nodeName.select('span').on('click', column.click);

      });


      node
        .order()
        .on('click', function(d) { 
          dispatch.elementClick({
            row: this, //TODO: decide whether or not this should be consistent with scatter/line events
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
    scatter.color(_);
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

  chart.noResultsText = function(_) {
    if (!arguments.length) return noResultsText;
    noResultsText = _;
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
  }

  chart.iconClose = function(_){
     if (!arguments.length) return iconClose;
    iconClose = _;
    return chart;
  }

  return chart;
}

nv.models.lineChart = function() {
  var margin = {top: 30, right: 20, bottom: 50, left: 60},
      color = d3.scale.category20().range(),
      width = null, 
      height = null,
      showLegend = true,
      tooltips = true,
      tooltip = function(key, x, y, e, graph) { 
        return '<h3>' + key + '</h3>' +
               '<p>' +  y + ' at ' + x + '</p>'
      };

  var lines = nv.models.line(),
      x = lines.xScale(),
      y = lines.yScale(),
      xAxis = nv.models.axis().scale(x).orient('bottom').tickPadding(5),
      yAxis = nv.models.axis().scale(y).orient('left'),
      legend = nv.models.legend().height(30),
      dispatch = d3.dispatch('tooltipShow', 'tooltipHide');


  var showTooltip = function(e, offsetElement) {
    var left = e.pos[0] + ( offsetElement.offsetLeft || 0 ),
        top = e.pos[1] + ( offsetElement.offsetTop || 0),
        x = xAxis.tickFormat()(lines.x()(e.point)),
        y = yAxis.tickFormat()(lines.y()(e.point)),
        content = tooltip(e.series.key, x, y, e, chart);

    nv.tooltip.show([left, top], content);
  };


  function chart(selection) {
    selection.each(function(data) {
      var container = d3.select(this),
          that = this;

      var availableWidth = (width  || parseInt(container.style('width')) || 960)
                             - margin.left - margin.right,
          availableHeight = (height || parseInt(container.style('height')) || 400)
                             - margin.top - margin.bottom;



      var wrap = container.selectAll('g.wrap.lineChart').data([data]);
      var gEnter = wrap.enter().append('g').attr('class', 'wrap nvd3 lineChart').append('g');

      gEnter.append('g').attr('class', 'x axis');
      gEnter.append('g').attr('class', 'y axis');
      gEnter.append('g').attr('class', 'linesWrap');
      gEnter.append('g').attr('class', 'legendWrap');


      var g = wrap.select('g');




      if (showLegend) {
        legend.width(availableWidth);

        g.select('.legendWrap')
            .datum(data)
            .call(legend);

        if ( margin.top != legend.height()) {
          margin.top = legend.height();
          availableHeight = (height || parseInt(container.style('height')) || 400)
                             - margin.top - margin.bottom;
        }

        g.select('.legendWrap')
            .attr('transform', 'translate(0,' + (-margin.top) +')')
      }


      lines
        .width(availableWidth)
        .height(availableHeight)
        .color(data.map(function(d,i) {
          return d.color || color[i % color.length];
        }).filter(function(d,i) { return !data[i].disabled }));



      g.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');


      var linesWrap = g.select('.linesWrap')
          .datum(data.filter(function(d) { return !d.disabled }))

      d3.transition(linesWrap).call(lines);



      xAxis
        //.scale(x)
        .ticks( availableWidth / 100 )
        .tickSize(-availableHeight, 0);

      g.select('.x.axis')
          .attr('transform', 'translate(0,' + y.range()[0] + ')');
      d3.transition(g.select('.x.axis'))
          .call(xAxis);


      yAxis
        //.scale(y)
        .ticks( availableHeight / 36 )
        .tickSize( -availableWidth, 0);

      d3.transition(g.select('.y.axis'))
          .call(yAxis);




      legend.dispatch.on('legendClick', function(d,i) { 
        d.disabled = !d.disabled;

        if (!data.filter(function(d) { return !d.disabled }).length) {
          data.map(function(d) {
            d.disabled = false;
            wrap.selectAll('.series').classed('disabled', false);
            return d;
          });
        }

        selection.transition().call(chart);
      });

/*
      //
      legend.dispatch.on('legendMouseover', function(d, i) {
        d.hover = true;
        selection.transition().call(chart)
      });

      legend.dispatch.on('legendMouseout', function(d, i) {
        d.hover = false;
        selection.transition().call(chart)
      });
*/

      lines.dispatch.on('elementMouseover.tooltip', function(e) {
        e.pos = [e.pos[0] +  margin.left, e.pos[1] + margin.top];
        dispatch.tooltipShow(e);
      });
      if (tooltips) dispatch.on('tooltipShow', function(e) { showTooltip(e, that.parentNode) } ); // TODO: maybe merge with above?

      lines.dispatch.on('elementMouseout.tooltip', function(e) {
        dispatch.tooltipHide(e);
      });
      if (tooltips) dispatch.on('tooltipHide', nv.tooltip.cleanup);

    });


    //TODO: decide if this is a good idea, and if it should be in all models
    chart.update = function() { chart(selection) };
    chart.container = this; // I need a reference to the container in order to have outside code check if the chart is visible or not


    return chart;
  }


  chart.dispatch = dispatch;
  chart.legend = legend;
  chart.xAxis = xAxis;
  chart.yAxis = yAxis;

  d3.rebind(chart, lines, 'x', 'y', 'size', 'xDomain', 'yDomain', 'forceX', 'forceY', 'interactive', 'clipEdge', 'clipVoronoi', 'id');


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
}

nv.models.linePlusBarChart = function() {
  var margin = {top: 30, right: 60, bottom: 50, left: 60},
      width = null,
      height = null,
      getX = function(d) { return d.x },
      getY = function(d) { return d.y },
      color = d3.scale.category20().range(),
      showLegend = true,
      tooltips = true,
      tooltip = function(key, x, y, e, graph) { 
        return '<h3>' + key + '</h3>' +
               '<p>' +  y + ' at ' + x + '</p>'
      };


  var lines = nv.models.line(),
      bars = nv.models.historicalBar(),
      x = d3.scale.linear(), // needs to be both line and historicalBar x Axis
      y1 = bars.yScale(),
      y2 = lines.yScale(),
      xAxis = nv.models.axis().scale(x).orient('bottom').tickPadding(5),
      yAxis1 = nv.models.axis().scale(y1).orient('left'),
      yAxis2 = nv.models.axis().scale(y2).orient('right'),
      legend = nv.models.legend().height(30),
      dispatch = d3.dispatch('tooltipShow', 'tooltipHide');

  var showTooltip = function(e, offsetElement) {
    var left = e.pos[0] + ( offsetElement.offsetLeft || 0 ),
        top = e.pos[1] + ( offsetElement.offsetTop || 0),
        x = xAxis.tickFormat()(lines.x()(e.point)),
        y = yAxis1.tickFormat()(lines.y()(e.point)),
        content = tooltip(e.series.key, x, y, e, chart);

    nv.tooltip.show([left, top], content, e.value < 0 ? 'n' : 's');
  };



  function chart(selection) {
    selection.each(function(data) {
      var container = d3.select(this),
          that = this;

      var availableWidth = (width  || parseInt(container.style('width')) || 960)
                             - margin.left - margin.right,
          availableHeight = (height || parseInt(container.style('height')) || 400)
                             - margin.top - margin.bottom;


      var dataBars = data.filter(function(d) { return !d.disabled && d.bar });

      var dataLines = data.filter(function(d) { return !d.disabled && !d.bar });



      //TODO: try to remove x scale computation from this layer

      var series1 = data.filter(function(d) { return !d.disabled && d.bar })
            .map(function(d) { 
              return d.values.map(function(d,i) {
                return { x: getX(d,i), y: getY(d,i) }
              })
            });

      var series2 = data.filter(function(d) { return !d.disabled && !d.bar })
            .map(function(d) { 
              return d.values.map(function(d,i) {
                return { x: getX(d,i), y: getY(d,i) }
              })
            });

      x   .domain(d3.extent(d3.merge(series1.concat(series2)), function(d) { return d.x } ))
          .range([0, availableWidth]);



          /*
      x   .domain(d3.extent(d3.merge(data.map(function(d) { return d.values })), getX ))
          .range([0, availableWidth]);

      y1  .domain(d3.extent(d3.merge(dataBars), function(d) { return d.y } ))
          .range([availableHeight, 0]);

      y2  .domain(d3.extent(d3.merge(dataLines), function(d) { return d.y } ))
          .range([availableHeight, 0]);
         */


      lines
        .width(availableWidth)
        .height(availableHeight)
        .color(data.map(function(d,i) {
          return d.color || color[i % color.length];
        }).filter(function(d,i) { return !data[i].disabled && !data[i].bar }))

      bars
        .width(availableWidth)
        .height(availableHeight)
        .color(data.map(function(d,i) {
          return d.color || color[i % color.length];
        }).filter(function(d,i) { return !data[i].disabled && data[i].bar }))


      var wrap = d3.select(this).selectAll('g.wrap.linePlusBar').data([data]);
      var gEnter = wrap.enter().append('g').attr('class', 'wrap nvd3 linePlusBar').append('g');

      gEnter.append('g').attr('class', 'x axis');
      gEnter.append('g').attr('class', 'y1 axis');
      gEnter.append('g').attr('class', 'y2 axis');
      gEnter.append('g').attr('class', 'barsWrap');
      gEnter.append('g').attr('class', 'linesWrap');
      gEnter.append('g').attr('class', 'legendWrap');



      var g = wrap.select('g');


      if (showLegend) {
        legend.width(availableWidth);

        g.select('.legendWrap')
            .datum(data.map(function(series) { 
              series.key = series.key + (series.bar ? ' (left axis)' : ' (right axis)');
              return series;
            }))
          .call(legend);

        if ( margin.top != legend.height()) {
          margin.top = legend.height();
          availableHeight = (height || parseInt(container.style('height')) || 400)
                             - margin.top - margin.bottom;
        }

        g.select('.legendWrap')
          .attr('transform', 'translate(0,' + (-margin.top) +')');
      }



      var barsWrap = g.select('.barsWrap')
          .datum(dataBars.length ? dataBars : [{values:[]}])

      var linesWrap = g.select('.linesWrap')
          .datum(dataLines.length ? dataLines : [{values:[]}])


      d3.transition(barsWrap).call(bars);
      d3.transition(linesWrap).call(lines);


      g.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');


      xAxis
        .ticks( availableWidth / 100 )
        .tickSize(-availableHeight, 0);

      g.select('.x.axis')
          .attr('transform', 'translate(0,' + y1.range()[0] + ')');
      d3.transition(g.select('.x.axis'))
          .call(xAxis);


      yAxis1
        .ticks( availableHeight / 36 )
        .tickSize(-availableWidth, 0);

      d3.transition(g.select('.y1.axis'))
          .call(yAxis1);


      yAxis2
        .ticks( availableHeight / 36 )
        .tickSize(dataBars.length ? 0 : -availableWidth, 0); // Show the y2 rules only if y1 has none

      g.select('.y2.axis')
          .attr('transform', 'translate(' + x.range()[1] + ',0)');

      d3.transition(g.select('.y2.axis'))
          .call(yAxis2);



      legend.dispatch.on('legendClick', function(d,i) { 
        d.disabled = !d.disabled;

        if (!data.filter(function(d) { return !d.disabled }).length) {
          data.map(function(d) {
            d.disabled = false;
            wrap.selectAll('.series').classed('disabled', false);
            return d;
          });
        }

        selection.transition().call(chart);
      });


      lines.dispatch.on('elementMouseover.tooltip', function(e) {
        e.pos = [e.pos[0] +  margin.left, e.pos[1] + margin.top];
        dispatch.tooltipShow(e);
      });
      if (tooltips) dispatch.on('tooltipShow', function(e) { showTooltip(e, that.parentNode) } ); // TODO: maybe merge with above?

      lines.dispatch.on('elementMouseout.tooltip', function(e) {
        dispatch.tooltipHide(e);
      });
      if (tooltips) dispatch.on('tooltipHide', nv.tooltip.cleanup);


      bars.dispatch.on('elementMouseover.tooltip', function(e) {
        e.pos = [e.pos[0] +  margin.left, e.pos[1] + margin.top];
        dispatch.tooltipShow(e);
      });
      if (tooltips) dispatch.on('tooltipShow', function(e) { showTooltip(e, that.parentNode) } ); // TODO: maybe merge with above?

      bars.dispatch.on('elementMouseout.tooltip', function(e) {
        dispatch.tooltipHide(e);
      });
      if (tooltips) dispatch.on('tooltipHide', nv.tooltip.cleanup);


      chart.update = function() { selection.transition().call(chart) };
      chart.container = this; // I need a reference to the container in order to have outside code check if the chart is visible or not

    });

    return chart;
  }

  chart.dispatch = dispatch;
  chart.legend = legend;
  chart.lines = lines;
  chart.bars = bars;
  chart.xAxis = xAxis;
  chart.yAxis1 = yAxis1;
  chart.yAxis2 = yAxis2;

  d3.rebind(chart, lines, 'size', 'clipVoronoi');
  //d3.rebind(chart, lines, 'x', 'y', 'size', 'xDomain', 'yDomain', 'forceX', 'forceY', 'interactive', 'clipEdge', 'clipVoronoi', 'id');

  //d3.rebind(chart, lines, 'interactive');
  //consider rebinding x and y as well

  chart.x = function(_) {
    if (!arguments.length) return getX;
    getX = _;
    lines.x(_);
    bars.x(_);
    return chart;
  };

  chart.y = function(_) {
    if (!arguments.length) return getY;
    getY = _;
    lines.y(_);
    bars.y(_);
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
}

nv.models.lineWithFocusChart = function() {
  var margin = {top: 30, right: 20, bottom: 50, left: 60},
      margin2 = {top: 0, right: 20, bottom: 20, left: 60},
      color = d3.scale.category20().range(),
      width = null, 
      height = null,
      height2 = 100,
      showLegend = true,
      tooltips = true,
      tooltip = function(key, x, y, e, graph) { 
        return '<h3>' + key + '</h3>' +
               '<p>' +  y + ' at ' + x + '</p>'
      };

  var lines = nv.models.line().clipEdge(true),
      lines2 = nv.models.line().interactive(false),
      x = lines.xScale(),
      y = lines.yScale(),
      x2 = lines2.xScale(),
      y2 = lines2.yScale(),
      xAxis = nv.models.axis().scale(x).orient('bottom').tickPadding(5),
      yAxis = nv.models.axis().scale(y).orient('left'),
      x2Axis = nv.models.axis().scale(x).orient('bottom').tickPadding(5),
      y2Axis = nv.models.axis().scale(y2).orient('left'),
      legend = nv.models.legend().height(30),
      dispatch = d3.dispatch('tooltipShow', 'tooltipHide'),
      brush = d3.svg.brush().x(x2);


  var showTooltip = function(e, offsetElement) {
    var left = e.pos[0] + ( offsetElement.offsetLeft || 0 ),
        top = e.pos[1] + ( offsetElement.offsetTop || 0),
        x = xAxis.tickFormat()(lines.x()(e.point)),
        y = yAxis.tickFormat()(lines.y()(e.point)),
        content = tooltip(e.series.key, x, y, e, chart);

    nv.tooltip.show([left, top], content);
  };


  function chart(selection) {
    selection.each(function(data) {
      var container = d3.select(this),
          that = this;

      var availableWidth = (width  || parseInt(container.style('width')) || 960)
                             - margin.left - margin.right,
          availableHeight = (height || parseInt(container.style('height')) || 400)
                             - margin.top - margin.bottom - height2,
          availableHeight2 = height2 - margin2.top - margin2.bottom;


      brush.on('brush', onBrush);


      var wrap = container.selectAll('g.wrap.lineWithFocusChart').data([data]);
      var gEnter = wrap.enter().append('g').attr('class', 'wrap nvd3 lineWithFocusChart').append('g');

      var focusEnter = gEnter.append('g').attr('class', 'focus');
      focusEnter.append('g').attr('class', 'x axis');
      focusEnter.append('g').attr('class', 'y axis');
      focusEnter.append('g').attr('class', 'linesWrap');

      var contextEnter = gEnter.append('g').attr('class', 'context');
      contextEnter.append('g').attr('class', 'x axis');
      contextEnter.append('g').attr('class', 'y axis');
      contextEnter.append('g').attr('class', 'linesWrap');
      contextEnter.append('g').attr('class', 'x brush');

      gEnter.append('g').attr('class', 'legendWrap');


      var g = wrap.select('g');




      if (showLegend) {
        legend.width(availableWidth);

        g.select('.legendWrap')
            .datum(data)
            .call(legend);

        if ( margin.top != legend.height()) {
          margin.top = legend.height();
          availableHeight = (height || parseInt(container.style('height')) || 400)
                             - margin.top - margin.bottom;
        }

        g.select('.legendWrap')
            .attr('transform', 'translate(0,' + (-margin.top) +')')
      }


      lines
        .width(availableWidth)
        .height(availableHeight)
        .color(data.map(function(d,i) {
          return d.color || color[i % color.length];
        }).filter(function(d,i) { return !data[i].disabled }));

      lines2
        .width(availableWidth)
        .height(availableHeight2)
        .color(data.map(function(d,i) {
          return d.color || color[i % color.length];
        }).filter(function(d,i) { return !data[i].disabled }));


      g.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');


      var focusLinesWrap = g.select('.focus .linesWrap')
          .datum(data.filter(function(d) { return !d.disabled }))

      d3.transition(focusLinesWrap).call(lines);


      xAxis
        .ticks( availableWidth / 100 )
        .tickSize(-availableHeight, 0);

      g.select('.focus .x.axis')
          .attr('transform', 'translate(0,' + y.range()[0] + ')');
      d3.transition(g.select('.focus .x.axis'))
          .call(xAxis);


      yAxis
        .ticks( availableHeight / 36 )
        .tickSize( -availableWidth, 0);

      d3.transition(g.select('.focus .y.axis'))
          .call(yAxis);



      g.select('.context')
          .attr('transform', 'translate(0,' + ( availableHeight + margin.bottom + margin2.top) + ')')

      var contextLinesWrap = g.select('.context .linesWrap')
          .datum(data.filter(function(d) { return !d.disabled }))

      d3.transition(contextLinesWrap).call(lines2);


      gBrush = g.select('.x.brush')
          .call(brush);
      gBrush.selectAll('rect')
          //.attr('y', -5)
          .attr('height', availableHeight2);
      gBrush.selectAll(".resize").append("path").attr("d", resizePath);



      x2Axis
        .tickFormat(xAxis.tickFormat()) //TODO: make sure everythign set on the Axes is set on both x and x2, and y and y2 respectively
        .ticks( availableWidth / 100 )
        .tickSize(-availableHeight2, 0);

      g.select('.context .x.axis')
          .attr('transform', 'translate(0,' + y2.range()[0] + ')');
      d3.transition(g.select('.context .x.axis'))
          .call(x2Axis);


      y2Axis
        .tickFormat(yAxis.tickFormat())
        .ticks( availableHeight2 / 36 )
        .tickSize( -availableWidth, 0);

      d3.transition(g.select('.context .y.axis'))
          .call(y2Axis);


      updateFocus();



      legend.dispatch.on('legendClick', function(d,i) { 
        d.disabled = !d.disabled;

        if (!data.filter(function(d) { return !d.disabled }).length) {
          data.map(function(d) {
            d.disabled = false;
            wrap.selectAll('.series').classed('disabled', false);
            return d;
          });
        }

        selection.transition().call(chart);
      });


/*
      //
      legend.dispatch.on('legendMouseover', function(d, i) {
        d.hover = true;
        selection.transition().call(chart)
      });

      legend.dispatch.on('legendMouseout', function(d, i) {
        d.hover = false;
        selection.transition().call(chart)
      });
*/

      lines.dispatch.on('elementMouseover.tooltip', function(e) {
        e.pos = [e.pos[0] +  margin.left, e.pos[1] + margin.top];
        dispatch.tooltipShow(e);
      });
      if (tooltips) dispatch.on('tooltipShow', function(e) { showTooltip(e, that.parentNode) } ); // TODO: maybe merge with above?

      lines.dispatch.on('elementMouseout.tooltip', function(e) {
        dispatch.tooltipHide(e);
      });
      if (tooltips) dispatch.on('tooltipHide', nv.tooltip.cleanup);



      // Taken from crossfilter (http://square.github.com/crossfilter/)
      function resizePath(d) {
        var e = +(d == "e"),
            x = e ? 1 : -1,
            y = availableHeight2 / 3;
        return "M" + (.5 * x) + "," + y
            + "A6,6 0 0 " + e + " " + (6.5 * x) + "," + (y + 6)
            + "V" + (2 * y - 6)
            + "A6,6 0 0 " + e + " " + (.5 * x) + "," + (2 * y)
            + "Z"
            + "M" + (2.5 * x) + "," + (y + 8)
            + "V" + (2 * y - 8)
            + "M" + (4.5 * x) + "," + (y + 8)
            + "V" + (2 * y - 8);
      }


      function onBrush() {
        updateFocus();

        focusLinesWrap.call(lines)
        //var focusLinesWrap = g.select('.focus .linesWrap')
        g.select('.focus .x.axis').call(xAxis);
        g.select('.focus .y.axis').call(yAxis);
      }

      function updateFocus() {
        var yDomain = brush.empty() ? y2.domain() : d3.extent(d3.merge(data.filter(function(d) { return !d.disabled }).map(function(d) { return d.values })).filter(function(d) {
          return lines.x()(d) >= brush.extent()[0] && lines.x()(d) <= brush.extent()[1];
        }), lines.y());  //This doesn't account for the 1 point before and the 1 point after the domain.  Would fix, but likely need to change entire methodology here

        if (typeof yDomain[0] == 'undefined') yDomain = y2.domain(); //incase the brush doesn't cover a single point


        x.domain(brush.empty() ? x2.domain() : brush.extent());
        y.domain(yDomain);

        //TODO: Rethink this... performance is horrible, likely need to cut off focus data to within the range
        //      If I limit the data for focusLines would want to include 1 point before and after the extent,
        //      Need to figure out an optimized way to accomplish this.
        //      ***One concern is to try not to make the assumption that all lines are of the same length, and
        //         points with the same index have the same x value (while this is true in our test cases, may 
        //         not always be)

        lines.xDomain(x.domain());
        lines.yDomain(y.domain());
      }



    });



    //TODO: decide if this is a good idea, and if it should be in all models
    chart.update = function() { chart(selection) };
    chart.container = this; // I need a reference to the container in order to have outside code check if the chart is visible or not


    return chart;
  }


  chart.dispatch = dispatch;
  chart.legend = legend;
  chart.xAxis = xAxis;
  chart.yAxis = yAxis;

  d3.rebind(chart, lines, 'x', 'y', 'size', 'xDomain', 'yDomain', 'forceX', 'forceY', 'interactive', 'clipEdge', 'clipVoronoi', 'id');


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
}

nv.models.multiBar = function() {
  var margin = {top: 0, right: 0, bottom: 0, left: 0},
      width = 960,
      height = 500,
      id = Math.floor(Math.random() * 10000), //Create semi-unique ID in case user doesn't select one
      getX = function(d) { return d.x },
      getY = function(d) { return d.y },
      forceY = [0], // 0 is forced by default.. this makes sense for the majority of bar graphs... user can always do chart.forceY([]) to remove
      clipEdge = true,
      stacked = false,
      color = d3.scale.category20().range(),
      delay = 1200,
      xDomain, yDomain,
      x0, y0;

  //var x = d3.scale.linear(),
  var x = d3.scale.ordinal(),
      y = d3.scale.linear(),
      dispatch = d3.dispatch('chartClick', 'elementClick', 'elementDblClick', 'elementMouseover', 'elementMouseout');


  function chart(selection) {
    selection.each(function(data) {
      var availableWidth = width - margin.left - margin.right,
          availableHeight = height - margin.top - margin.bottom;

      //store old scales if they exist
      x0 = x0 || x;
      y0 = y0 || y;

      if (stacked) {
      //var stackedData = d3.layout.stack()
        data = d3.layout.stack()
                     .offset('zero')
                     .values(function(d){ return d.values })
                     .y(getY)
                     (data);
      }



      //add series index to each data point for reference
      data = data.map(function(series, i) {
        series.values = series.values.map(function(point) {
          point.series = i;
          return point;
        });
        return series;
      });


      var seriesData = (xDomain && yDomain) ? [] : // if we know xDomain and yDomain, no need to calculate
            data.map(function(d) { 
              return d.values.map(function(d,i) {
                return { x: getX(d,i), y: getY(d,i), y0: d.y0 }
              })
            });

      x   .domain(d3.merge(seriesData).map(function(d) { return d.x }))
          .rangeBands([0, availableWidth], .1);

      y   .domain(yDomain || d3.extent(d3.merge(seriesData).map(function(d) { return d.y + (stacked ? d.y0 : 0) }).concat(forceY)))
          .range([availableHeight, 0]);



      var wrap = d3.select(this).selectAll('g.wrap.multibar').data([data]);
      var wrapEnter = wrap.enter().append('g').attr('class', 'wrap nvd3 multibar');
      var defsEnter = wrapEnter.append('defs');
      var gEnter = wrapEnter.append('g');

      gEnter.append('g').attr('class', 'groups');

      var g = wrap.select('g')
      wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');



      defsEnter.append('clipPath')
          .attr('id', 'edge-clip-' + id)
        .append('rect');
      wrap.select('#edge-clip-' + id + ' rect')
          .attr('width', availableWidth)
          .attr('height', availableHeight);

      g   .attr('clip-path', clipEdge ? 'url(#edge-clip-' + id + ')' : '');



      var groups = wrap.select('.groups').selectAll('.group')
          .data(function(d) { return d }, function(d) { return d.key });
      groups.enter().append('g')
          .style('stroke-opacity', 1e-6)
          .style('fill-opacity', 1e-6);
      d3.transition(groups.exit())
          //.style('stroke-opacity', 1e-6)
          //.style('fill-opacity', 1e-6)
        .selectAll('rect.bar')
        .delay(function(d,i) { return i * delay/ data[0].values.length })
          .attr('y', function(d) { return stacked ? y0(d.y0) : y0(0) })
          .attr('height', 0)
          .remove();
      groups
          .attr('class', function(d,i) { return 'group series-' + i })
          .classed('hover', function(d) { return d.hover })
          .style('fill', function(d,i){ return color[i % color.length] })
          .style('stroke', function(d,i){ return color[i % color.length] });
      d3.transition(groups)
          .style('stroke-opacity', 1)
          .style('fill-opacity', .75);


      var bars = groups.selectAll('rect.bar')
          .data(function(d) { return d.values });

      bars.exit().remove();


      var barsEnter = bars.enter().append('rect')
          .attr('class', function(d,i) { return getY(d,i) < 0 ? 'bar negative' : 'bar positive'})
          .attr('x', function(d,i,j) {
              return stacked ? 0 : (j * x.rangeBand() / data.length )
          })
          .attr('y', function(d) { return y0(stacked ? d.y0 : 0) })
          .attr('height', 0)
          .attr('width', x.rangeBand() / (stacked ? 1 : data.length) )
          .on('mouseover', function(d,i) { //TODO: figure out why j works above, but not here
            d3.select(this).classed('hover', true);
            dispatch.elementMouseover({
              value: getY(d,i),
              point: d,
              series: data[d.series],
              pos: [x(getX(d,i)) + (x.rangeBand() * (stacked ? data.length / 2 : d.series + .5) / data.length), y(getY(d,i) + (stacked ? d.y0 : 0))],  // TODO: Figure out why the value appears to be shifted
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
              pos: [x(getX(d,i)) + (x.rangeBand() * (stacked ? data.length / 2 : d.series + .5) / data.length), y(getY(d,i) + (stacked ? d.y0 : 0))],  // TODO: Figure out why the value appears to be shifted
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
              pos: [x(getX(d,i)) + (x.rangeBand() * (stacked ? data.length / 2 : d.series + .5) / data.length), y(getY(d,i) + (stacked ? d.y0 : 0))],  // TODO: Figure out why the value appears to be shifted
              pointIndex: i,
              seriesIndex: d.series,
              e: d3.event
            });
            d3.event.stopPropagation();
          });
      bars
          .attr('class', function(d,i) { return getY(d,i) < 0 ? 'bar negative' : 'bar positive'})
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
                  return stacked ? 0 : (d.series * x.rangeBand() / data.length )
                })
                .attr('width', x.rangeBand() / (stacked ? 1 : data.length) );
            })
      else
        d3.transition(bars)
          .delay(function(d,i) { return i * delay/ data[0].values.length })
            .attr('x', function(d,i) {
              return d.series * x.rangeBand() / data.length
            })
            .attr('width', x.rangeBand() / data.length)
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



      //TODO: decide if this makes sense to add into all the models for ease of updating (updating without needing the selection)
      chart.update = function() {
        selection.transition().call(chart);
      }

      //store old scales for use in transitions on update, to animate from old to new positions, and sizes
      x0 = x.copy();
      y0 = y.copy();

    });

    return chart;
  }


  chart.dispatch = dispatch;

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
    color = _;
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


  return chart;
}

nv.models.multiBarChart = function() {
  var margin = {top: 30, right: 20, bottom: 50, left: 60},
      width = null,
      height = null,
      color = d3.scale.category20().range(),
      showControls = true,
      showLegend = true,
      tooltips = true,
      tooltip = function(key, x, y, e, graph) { 
        return '<h3>' + key + '</h3>' +
               '<p>' +  y + ' on ' + x + '</p>'
      };

  var multibar = nv.models.multiBar().stacked(false),
      x = multibar.xScale(),
      y = multibar.yScale(),
      xAxis = nv.models.axis().scale(x).orient('bottom').highlightZero(false); //.showMaxMin(false), //TODO: see why showMaxMin(false) causes no ticks to be shown on x axis
      yAxis = nv.models.axis().scale(y).orient('left'),
      legend = nv.models.legend().height(30),
      controls = nv.models.legend().height(30),
      dispatch = d3.dispatch('tooltipShow', 'tooltipHide');

  xAxis.tickFormat(function(d) { return d });
  yAxis.tickFormat(d3.format(',.1f'));

  var showTooltip = function(e, offsetElement) {
    var left = e.pos[0] + ( offsetElement.offsetLeft || 0 ),
        top = e.pos[1] + ( offsetElement.offsetTop || 0),
        x = xAxis.tickFormat()(multibar.x()(e.point)),
        y = yAxis.tickFormat()(multibar.y()(e.point)),
        content = tooltip(e.series.key, x, y, e, chart);

    nv.tooltip.show([left, top], content, e.value < 0 ? 'n' : 's');
  };

  //TODO: let user select default
  var controlsData = [
    { key: 'Grouped' },
    { key: 'Stacked', disabled: true }
  ];

  function chart(selection) {
    selection.each(function(data) {
      var container = d3.select(this),
          that = this;

      var availableWidth = (width  || parseInt(container.style('width')) || 960)
                             - margin.left - margin.right,
          availableHeight = (height || parseInt(container.style('height')) || 400)
                             - margin.top - margin.bottom;
/*
      var seriesData;

      if (multibar.stacked()) {
        seriesData = data.filter(function(d) { return !d.disabled })
          .reduce(function(prev, curr, index) {  //sum up all the y's
              curr.values.forEach(function(d,i) {
                if (!index) prev[i] = {x: multibar.x()(d,i), y:0};
                prev[i].y += multibar.y()(d,i);
              });
              return prev;
            }, []);
      } else {
        seriesData = data.filter(function(d) { return !d.disabled })
          .map(function(d) { 
            return d.values.map(function(d,i) {
              return { x: multibar.x()(d,i), y: multibar.y()(d,i) }
            })
          });
      }


      //x   .domain(d3.extent(d3.merge(seriesData).map(function(d) { return d.x }).concat(multibar.forceX) ))
          //.range([0, availableWidth]);
      x   .domain(d3.merge(seriesData).map(function(d) { return d.x }))
          .rangeBands([0, availableWidth], .1);

      y   .domain(d3.extent(d3.merge(seriesData).map(function(d) { return d.y }).concat(multibar.forceY) ))
          .range([availableHeight, 0]);
          */


      var wrap = container.selectAll('g.wrap.multiBarWithLegend').data([data]);
      var gEnter = wrap.enter().append('g').attr('class', 'wrap nvd3 multiBarWithLegend').append('g');

      gEnter.append('g').attr('class', 'x axis');
      gEnter.append('g').attr('class', 'y axis');
      gEnter.append('g').attr('class', 'barsWrap');
      gEnter.append('g').attr('class', 'legendWrap');
      gEnter.append('g').attr('class', 'controlsWrap');



      var g = wrap.select('g');


      if (showLegend) {
        legend.width(availableWidth / 2);

        g.select('.legendWrap')
            .datum(data)
            .call(legend);

        if ( margin.top != legend.height()) {
          margin.top = legend.height();
          availableHeight = (height || parseInt(container.style('height')) || 400)
                             - margin.top - margin.bottom;
        }

        g.select('.legendWrap')
            .attr('transform', 'translate(' + (availableWidth / 2) + ',' + (-margin.top) +')');
      }


      multibar
        .width(availableWidth)
        .height(availableHeight)
        .color(data.map(function(d,i) {
          return d.color || color[i % color.length];
        }).filter(function(d,i) { return !data[i].disabled }))



      if (showControls) {
        controls.width(180).color(['#444', '#444', '#444']);
        g.select('.controlsWrap')
            .datum(controlsData)
            .attr('transform', 'translate(0,' + (-margin.top) +')')
            .call(controls);
      }


      g.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');


      var barsWrap = g.select('.barsWrap')
          .datum(data.filter(function(d) { return !d.disabled }))


      d3.transition(barsWrap).call(multibar);


      xAxis
        .ticks( availableWidth / 100 )
        .tickSize(-availableHeight, 0);

      g.select('.x.axis')
          .attr('transform', 'translate(0,' + y.range()[0] + ')');
      d3.transition(g.select('.x.axis'))
          .call(xAxis);

      var xTicks = g.select('.x.axis').selectAll('g');

      xTicks
          .selectAll('line, text')
          .style('opacity', 1)

      //TODO: after fixing below problem, make this optional
      xTicks
        .filter(function(d,i) {
            //console.log(d,i,i % Math.ceil(data[0].values.length / (availableWidth / 100)) !== 0);
            return i % Math.ceil(data[0].values.length / (availableWidth / 100)) !== 0;
          })
        .style('opacity', 0) //TODO: figure out why even tho the filter does work, all ticks are disappearing

      yAxis
        .ticks( availableHeight / 36 )
        .tickSize( -availableWidth, 0);

      d3.transition(g.select('.y.axis'))
          .call(yAxis);




      legend.dispatch.on('legendClick', function(d,i) {
        d.disabled = !d.disabled;

        if (!data.filter(function(d) { return !d.disabled }).length) {
          data.map(function(d) {
            d.disabled = false;
            wrap.selectAll('.series').classed('disabled', false);
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


      multibar.dispatch.on('elementMouseover.tooltip2', function(e) {
        e.pos = [e.pos[0] +  margin.left, e.pos[1] + margin.top];
        dispatch.tooltipShow(e);
      });
      if (tooltips) dispatch.on('tooltipShow', function(e) { showTooltip(e, that.parentNode) } ); // TODO: maybe merge with above?

      multibar.dispatch.on('elementMouseout.tooltip', function(e) {
        dispatch.tooltipHide(e);
      });
      if (tooltips) dispatch.on('tooltipHide', nv.tooltip.cleanup);


      chart.update = function() { selection.transition().call(chart) };
      chart.container = this; // I need a reference to the container in order to have outside code check if the chart is visible or not

    });

    return chart;
  }


  chart.dispatch = dispatch;
  chart.legend = legend;
  chart.xAxis = xAxis;
  chart.yAxis = yAxis;

  d3.rebind(chart, multibar, 'x', 'y', 'xDomain', 'yDomain', 'forceX', 'forceY', 'clipEdge', 'id', 'stacked');


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


  return chart;
}

nv.models.multiBarHorizontal = function() {
  var margin = {top: 0, right: 0, bottom: 0, left: 0},
      width = 960,
      height = 500,
      id = Math.floor(Math.random() * 10000), //Create semi-unique ID in case user doesn't select one
      x = d3.scale.ordinal(),
      y = d3.scale.linear(),
      getX = function(d) { return d.x },
      getY = function(d) { return d.y },
      forceY = [0], // 0 is forced by default.. this makes sense for the majority of bar graphs... user can always do chart.forceY([]) to remove
      color = d3.scale.category20().range(),
      stacked = false,
      showValues = false,
      valuePadding = 60,
      valueFormat = d3.format(',.2f'),
      delay = 1200,
      xDomain, yDomain,
      x0, y0;

  var dispatch = d3.dispatch('chartClick', 'elementClick', 'elementDblClick', 'elementMouseover', 'elementMouseout');


  function chart(selection) {
    selection.each(function(data) {
      var availableWidth = width - margin.left - margin.right,
          availableHeight = height - margin.top - margin.bottom;


      if (stacked)
        data = d3.layout.stack()
                     .offset('zero')
                     .values(function(d){ return d.values })
                     .y(getY)
                     (data);


      //add series index to each data point for reference
      data = data.map(function(series, i) {
        series.values = series.values.map(function(point) {
          point.series = i;
          return point;
        });
        return series;
      });


      var seriesData = (xDomain && yDomain) ? [] : // if we know xDomain and yDomain, no need to calculate
            data.map(function(d) { 
              return d.values.map(function(d,i) {
                return { x: getX(d,i), y: getY(d,i), y0: d.y0 }
              })
            });

      x   .domain(xDomain || d3.merge(seriesData).map(function(d) { return d.x }))
          .rangeBands([0, availableHeight], .1);

      y   .domain(yDomain || d3.extent(d3.merge(seriesData).map(function(d) { return d.y + (stacked ? d.y0 : 0) }).concat(forceY)))
          //.range([0, availableWidth]);

      if (showValues && !stacked) y.range([(y.domain()[0] < 0 ? valuePadding : 0), availableWidth - (y.domain()[1] > 0 ? valuePadding : 0) ]);
      else y.range([0, availableWidth]);

      //store old scales if they exist
      x0 = x0 || x;
      //y0 = y0 || y;
      y0 = y0 || d3.scale.linear().domain(y.domain()).range([y(0),y(0)]);

      var wrap = d3.select(this).selectAll('g.wrap.multibarHorizontal').data([data]);
      var wrapEnter = wrap.enter().append('g').attr('class', 'wrap nvd3 multibarHorizontal');
      var defsEnter = wrapEnter.append('defs');
      var gEnter = wrapEnter.append('g');

      gEnter.append('g').attr('class', 'groups');

      var g = wrap.select('g')
      wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');



      var groups = wrap.select('.groups').selectAll('.group')
          .data(function(d) { return d }, function(d) { return d.key });
      groups.enter().append('g')
          .style('stroke-opacity', 1e-6)
          .style('fill-opacity', 1e-6);
      d3.transition(groups.exit())
          .style('stroke-opacity', 1e-6)
          .style('fill-opacity', 1e-6)
          .remove();
      groups
          .attr('class', function(d,i) { return 'group series-' + i })
          .classed('hover', function(d) { return d.hover })
          .style('fill', function(d,i){ return color[i % color.length] })
          .style('stroke', function(d,i){ return color[i % color.length] });
      d3.transition(groups)
          .style('stroke-opacity', 1)
          .style('fill-opacity', .75);


      var bars = groups.selectAll('g.bar')
          .data(function(d) { return d.values });

      bars.exit().remove();


      var barsEnter = bars.enter().append('g')
          .attr('transform', function(d,i,j) {
              return 'translate(' + y0(stacked ? d.y0 : 0) + ',' + (stacked ? 0 : (j * x.rangeBand() / data.length ) + x(getX(d,i))) + ')'
          })
          .on('mouseover', function(d,i) { //TODO: figure out why j works above, but not here
            d3.select(this).classed('hover', true);
            dispatch.elementMouseover({
              value: getY(d,i),
              point: d,
              series: data[d.series],
              pos: [ y(getY(d,i) + (stacked ? d.y0 : 0)), x(getX(d,i)) + (x.rangeBand() * (stacked ? data.length / 2 : d.series + .5) / data.length) ],
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
              pos: [x(getX(d,i)) + (x.rangeBand() * (stacked ? data.length / 2 : d.series + .5) / data.length), y(getY(d,i) + (stacked ? d.y0 : 0))],  // TODO: Figure out why the value appears to be shifted
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
              pos: [x(getX(d,i)) + (x.rangeBand() * (stacked ? data.length / 2 : d.series + .5) / data.length), y(getY(d,i) + (stacked ? d.y0 : 0))],  // TODO: Figure out why the value appears to be shifted
              pointIndex: i,
              seriesIndex: d.series,
              e: d3.event
            });
            d3.event.stopPropagation();
          });

      barsEnter.append('rect')
          .attr('width', 0)
          .attr('height', x.rangeBand() / (stacked ? 1 : data.length) )

      if (showValues && !stacked) {
        barsEnter.append('text')
            .attr('text-anchor', function(d,i) { return getY(d,i) < 0 ? 'end' : 'start' })
        bars.selectAll('text')
            .attr('y', x.rangeBand() / 2)
            .attr('dy', '-.32em')
            .text(function(d,i) { return valueFormat(getY(d,i)) })
        d3.transition(bars)
            //.delay(function(d,i) { return i * delay / data[0].values.length })
          .selectAll('text')
            .attr('x', function(d,i) { return getY(d,i) < 0 ? -4 : y(getY(d,i)) - y(0) + 4 })
      } else {
        bars.selectAll('text').remove();
      }

      bars
          .attr('class', function(d,i) { return getY(d,i) < 0 ? 'bar negative' : 'bar positive'})
          //.attr('transform', function(d,i,j) {
              //return 'translate(' + y0(stacked ? d.y0 : 0) + ',' + x(getX(d,i)) + ')'
          //})
      if (stacked)
        d3.transition(bars)
            //.delay(function(d,i) { return i * delay / data[0].values.length })
            .attr('transform', function(d,i) {
              //return 'translate(' + y(d.y0) + ',0)'
              return 'translate(' + y(d.y0) + ',' + (stacked ? 0 : (j * x.rangeBand() / data.length )) + ')'
            })
          .selectAll('rect')
            .attr('width', function(d,i) {
              return Math.abs(y(getY(d,i) + d.y0) - y(d.y0))
            })
            .attr('height', x.rangeBand() );
      else
        d3.transition(bars)
          //.delay(function(d,i) { return i * delay / data[0].values.length })
            .attr('transform', function(d,i) {
              //TODO: stacked must be all positive or all negative, not both?
              return 'translate(' + 
              (getY(d,i) < 0 ? y(getY(d,i)) : y(0))
              + ',' +
              (d.series * x.rangeBand() / data.length
              +
              x(getX(d,i)) )
              + ')'
            })
          .selectAll('rect')
            .attr('height', x.rangeBand() / data.length )
            .attr('width', function(d,i) {
              return Math.abs(y(getY(d,i)) - y(0))
            });
          /*
      if (stacked)
        d3.transition(bars)
            .delay(function(d,i) { return i * 1000 / data[0].values.length })
            .attr('x', function(d,i) {
              return y(d.y0);
            })
            .attr('width', function(d,i) {
              return Math.abs(y(getY(d,i) + d.y0) - y(d.y0))
            })
            .each('end', function() {
              d3.transition(d3.select(this))
                .attr('y', function(d,i) {
                  return 0
                })
                .attr('height', x.rangeBand() );
            })
      else
        d3.transition(bars)
          .delay(function(d,i) { return i * 1200 / data[0].values.length })
            .attr('y', function(d,i) {
              return d.series * x.rangeBand() / data.length
            })
            .attr('height', x.rangeBand() / data.length )
            .each('end', function() {
              d3.transition(d3.select(this))
                .attr('x', function(d,i) {
                  return getY(d,i) < 0 ? //TODO: stacked must be all positive or all negative, not both?
                      y(getY(d,i)) :
                      y(0)
                })
                .attr('width', function(d,i) {
                  return Math.abs(y(getY(d,i)) - y(0))
                });
            })
            */




      //TODO: decide if this makes sense to add into all the models for ease of updating (updating without needing the selection)
      chart.update = function() {
        selection.transition().call(chart);
      }

      //store old scales for use in transitions on update, to animate from old to new positions, and sizes
      x0 = x.copy();
      y0 = y.copy();

    });

    return chart;
  }


  chart.dispatch = dispatch;

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

  chart.color = function(_) {
    if (!arguments.length) return color;
    color = _;
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

  chart.showValues = function(_) {
    if (!arguments.length) return showValues;
    showValues = _;
    return chart;
  };

  chart.valueFormat= function(_) {
    if (!arguments.length) return valueFormat;
    valueFormat = _;
    return chart;
  };

  chart.valuePadding = function(_) {
    if (!arguments.length) return valuePadding;
    valuePadding = _;
    return chart;
  };


  return chart;
}

nv.models.multiBarHorizontalChart = function() {
  var margin = {top: 30, right: 20, bottom: 50, left: 60},
      width = null,
      height = null,
      color = d3.scale.category20().range(),
      showControls = true,
      showLegend = true,
      tooltips = true,
      tooltip = function(key, x, y, e, graph) { 
        return '<h3>' + x + '</h3>' +
               '<p>' +  y + '</p>'
      };


  var multibar = nv.models.multiBarHorizontal().stacked(false),
      x = multibar.xScale(),
      y = multibar.yScale(),
      xAxis = nv.models.axis().scale(x).orient('left').highlightZero(false).showMaxMin(false),
      yAxis = nv.models.axis().scale(y).orient('bottom'),
      legend = nv.models.legend().height(30),
      controls = nv.models.legend().height(30),
      dispatch = d3.dispatch('tooltipShow', 'tooltipHide');

  xAxis.tickFormat(function(d) { return d });
  yAxis.tickFormat(d3.format(',.1f'));

  var showTooltip = function(e, offsetElement) {
    var left = e.pos[0] + ( offsetElement.offsetLeft || 0 ),
        top = e.pos[1] + ( offsetElement.offsetTop || 0),
        x = xAxis.tickFormat()(multibar.x()(e.point)),
        y = yAxis.tickFormat()(multibar.y()(e.point)),
        content = tooltip(e.series.key, x, y, e, chart);

    nv.tooltip.show([left, top], content, e.value < 0 ? 'e' : 'w');
  };

  //TODO: let user select default
  var controlsData = [
    { key: 'Grouped' },
    { key: 'Stacked', disabled: true },
  ];

  function chart(selection) {
    selection.each(function(data) {
      var container = d3.select(this),
          that = this;

      var availableWidth = (width  || parseInt(container.style('width')) || 960)
                             - margin.left - margin.right,
          availableHeight = (height || parseInt(container.style('height')) || 400)
                             - margin.top - margin.bottom;




      var wrap = container.selectAll('g.wrap.multiBarHorizontalChart').data([data]);
      var gEnter = wrap.enter().append('g').attr('class', 'wrap nvd3 multiBarHorizontalChart').append('g');

      gEnter.append('g').attr('class', 'x axis');
      gEnter.append('g').attr('class', 'y axis');
      gEnter.append('g').attr('class', 'barsWrap');
      gEnter.append('g').attr('class', 'legendWrap');
      gEnter.append('g').attr('class', 'controlsWrap');



      //TODO: margins should be adjusted based on what components are used: axes, axis labels, legend
      margin.top = legend.height();

      var g = wrap.select('g');


      if (showLegend) {
        legend.width(availableWidth / 2);

        g.select('.legendWrap')
            .datum(data)
            .call(legend);

        if ( margin.top != legend.height()) {
          margin.top = legend.height();
          availableHeight = (height || parseInt(container.style('height')) || 400)
                             - margin.top - margin.bottom;
        }

        g.select('.legendWrap')
            .attr('transform', 'translate(' + (availableWidth / 2) + ',' + (-margin.top) +')')
      }


      multibar
        .width(availableWidth)
        .height(availableHeight)
        .color(data.map(function(d,i) {
          return d.color || color[i % color.length];
        }).filter(function(d,i) { return !data[i].disabled }))



      if (showControls) {
        controls.width(180).color(['#444', '#444', '#444']);
        g.select('.controlsWrap')
            .datum(controlsData)
            .attr('transform', 'translate(0,' + (-margin.top) +')')
            .call(controls);
      }


      g.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');


      var barsWrap = g.select('.barsWrap')
          .datum(data.filter(function(d) { return !d.disabled }))


      d3.transition(barsWrap).call(multibar);


      xAxis
        .ticks( availableHeight / 24 )
        .tickSize(-availableWidth, 0);

      //d3.transition(g.select('.x.axis'))
      g.select('.x.axis').transition().duration(0)
          .call(xAxis);

      var xTicks = g.select('.x.axis').selectAll('g');

      xTicks
          .selectAll('line, text')
          .style('opacity', 1)

          /*
      //I think this was just leaft over from the multiBar chart this was built from.. commented to maek sure
      xTicks.filter(function(d,i) {
            return i % Math.ceil(data[0].values.length / (availableWidth / 100)) !== 0;
          })
          .selectAll('line, text')
          .style('opacity', 0)
          */

      yAxis
        .ticks( availableWidth / 100 )
        .tickSize( -availableHeight, 0);

      g.select('.y.axis')
          .attr('transform', 'translate(0,' + availableHeight + ')');
      d3.transition(g.select('.y.axis'))
      //g.select('.y.axis').transition().duration(0)
          .call(yAxis);




      legend.dispatch.on('legendClick', function(d,i) {
        d.disabled = !d.disabled;

        if (!data.filter(function(d) { return !d.disabled }).length) {
          data.map(function(d) {
            d.disabled = false;
            wrap.selectAll('.series').classed('disabled', false);
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


      multibar.dispatch.on('elementMouseover.tooltip', function(e) {
        e.pos = [e.pos[0] +  margin.left, e.pos[1] + margin.top];
        dispatch.tooltipShow(e);
      });
      if (tooltips) dispatch.on('tooltipShow', function(e) { showTooltip(e, that.parentNode) } ); // TODO: maybe merge with above?

      multibar.dispatch.on('elementMouseout.tooltip', function(e) {
        dispatch.tooltipHide(e);
      });
      if (tooltips) dispatch.on('tooltipHide', nv.tooltip.cleanup);


      //TODO: decide if this makes sense to add into all the models for ease of updating (updating without needing the selection)
      chart.update = function() { selection.transition().call(chart) };
      chart.container = this; // I need a reference to the container in order to have outside code check if the chart is visible or not

    });

    return chart;
  }


  chart.dispatch = dispatch;
  chart.multibar = multibar; // really just makign the accessible for multibar.dispatch, may rethink slightly
  chart.legend = legend;
  chart.xAxis = xAxis;
  chart.yAxis = yAxis;

  d3.rebind(chart, multibar, 'x', 'y', 'xDomain', 'yDomain', 'forceX', 'forceY', 'clipEdge', 'id', 'delay', 'showValues', 'valueFormat');


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
}

nv.models.pie = function() {
  var margin = {top: 0, right: 0, bottom: 0, left: 0},
      width = 500,
      height = 500,
      getValues = function(d) { return d.values },
      getX = function(d) { return d.x },
      getY = function(d) { return d.y },
      id = Math.floor(Math.random() * 10000), //Create semi-unique ID in case user doesn't select one
      color = d3.scale.category20().range(),
      valueFormat = d3.format(',.2f'),
      showLabels = true,
      labelThreshold = .02, //if slice percentage is under this, don't show label
      donut = false;

  var  dispatch = d3.dispatch('chartClick', 'elementClick', 'elementDblClick', 'elementMouseover', 'elementMouseout');

  function chart(selection) {
    selection.each(function(data) {
      var availableWidth = width - margin.left - margin.right,
          availableHeight = height - margin.top - margin.bottom,
          radius = Math.min(availableWidth, availableHeight) / 2;

      var container = d3.select(this)
          .on('click', function(d,i) {
              dispatch.chartClick({
                  data: d,
                  index: i,
                  pos: d3.event,
                  id: id
              });
          });


      var wrap = container.selectAll('.wrap.pie').data([getValues(data[0])]);
      var wrapEnter = wrap.enter().append('g').attr('class','wrap nvd3 pie chart-' + id);
      var gEnter = wrapEnter.append('g');
      var g = wrap.select('g')

      gEnter.append('g').attr('class', 'pie');

      wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      g.select('.pie').attr('transform', 'translate(' + availableWidth / 2 + ',' + availableHeight / 2 + ')');



      var arc = d3.svg.arc()
                  .outerRadius((radius-(radius / 5)));

      if (donut) arc.innerRadius(radius / 2);


      // Setup the Pie chart and choose the data element
      var pie = d3.layout.pie()
          .sort(null)
          .value(function(d) { return d.disabled ? 0 : getY(d) });

      var slices = wrap.select('.pie').selectAll('.slice')
          .data(pie);

      slices.exit().remove();

      var ae = slices.enter().append('svg:g')
              .attr('class', 'slice')
              .on('mouseover', function(d,i){
                d3.select(this).classed('hover', true);
                dispatch.elementMouseover({
                    label: getX(d.data),
                    value: getY(d.data),
                    point: d.data,
                    pointIndex: i,
                    pos: [d3.event.pageX, d3.event.pageY],
                    id: id
                });
              })
              .on('mouseout', function(d,i){
                d3.select(this).classed('hover', false);
                dispatch.elementMouseout({
                    label: getX(d.data),
                    value: getY(d.data),
                    point: d.data,
                    index: i,
                    id: id
                });
              })
              .on('click', function(d,i) {
                dispatch.elementClick({
                    label: getX(d.data),
                    value: getY(d.data),
                    point: d.data,
                    index: i,
                    pos: d3.event,
                    id: id
                });
                d3.event.stopPropagation();
              })
              .on('dblclick', function(d,i) {
                dispatch.elementDblClick({
                    label: getX(d.data),
                    value: getY(d.data),
                    point: d.data,
                    index: i,
                    pos: d3.event,
                    id: id
                });
                d3.event.stopPropagation();
              });

        slices
            .attr('fill', function(d,i) { return color[i]; })
            .attr('stroke', function(d,i) { return color[i]; });

        var paths = ae.append('svg:path')
            .each(function(d) { this._current = d; });
            //.attr('d', arc);

        d3.transition(slices.select('path'))
            .attr('d', arc)
            //.ease('bounce')
            .attrTween('d', arcTween);
            //.attrTween('d', tweenPie);

        if (showLabels) {
          // This does the normal label
          ae.append('text')
            .attr('transform', function(d) {
               d.outerRadius = radius + 10; // Set Outer Coordinate
               d.innerRadius = radius + 15; // Set Inner Coordinate
               return 'translate(' + arc.centroid(d) + ')';
            })
            .style('text-anchor', 'middle') //center the text on it's origin
            .style('fill', '#000');

          d3.transition(slices.select('text'))
              //.ease('bounce')
              .attr('transform', function(d) {
                 d.outerRadius = radius + 10; // Set Outer Coordinate
                 d.innerRadius = radius + 15; // Set Inner Coordinate
                 return 'translate(' + arc.centroid(d) + ')';
              })
              //.style('font', 'bold 12px Arial') // font style's should be set in css!
              .text(function(d, i) { 
                var percent = (d.endAngle - d.startAngle) / (2 * Math.PI);
                return (d.value && percent > labelThreshold) ? getX(d.data) : ''; 
              });
        }


        // Computes the angle of an arc, converting from radians to degrees.
        function angle(d) {
          var a = (d.startAngle + d.endAngle) * 90 / Math.PI - 90;
          return a > 90 ? a - 180 : a;
        }

        function arcTween(a) {
          if (!donut) a.innerRadius = 0;
          var i = d3.interpolate(this._current, a);
          this._current = i(0);
          return function(t) {
            return arc(i(t));
          };
        }

        function tweenPie(b) {
          b.innerRadius = 0;
          var i = d3.interpolate({startAngle: 0, endAngle: 0}, b);
          return function(t) {
              return arc(i(t));
          };
        }

    });

    return chart;
  }


  chart.dispatch = dispatch;

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

  chart.values = function(_) {
    if (!arguments.length) return getValues;
    getValues = _;
    return chart;
  };

  chart.x = function(_) {
    if (!arguments.length) return getX;
    getX = _;
    return chart;
  };

  chart.y = function(_) {
    if (!arguments.length) return getY;
    getY = d3.functor(_);
    return chart;
  };

  chart.showLabels = function(_) {
    if (!arguments.length) return showLabels;
    showLabels = _;
    return chart;
  };

  chart.donut = function(_) {
    if (!arguments.length) return donut;
    donut = _;
    return chart;
  };

  chart.id = function(_) {
    if (!arguments.length) return id;
    id = _;
    return chart;
  };

  chart.color = function(_) {
    if (!arguments.length) return color;
    color = _;
    return chart;
  };

  chart.valueFormat = function(_) {
    if (!arguments.length) return valueFormat;
    valueFormat = _;
    return chart;
  };

  chart.labelThreshold = function(_) {
    if (!arguments.length) return labelThreshold;
    labelThreshold = _;
    return chart;
  };


  return chart;
}

nv.models.pieChart = function() {
  var margin = {top: 30, right: 20, bottom: 20, left: 20},
      width = null,
      height = null,
      showLegend = true,
      color = d3.scale.category20().range(),
      tooltips = true,
      tooltip = function(key, y, e, graph) { 
        return '<h3>' + key + '</h3>' +
               '<p>' +  y + '</p>'
      };


  var pie = nv.models.pie(),
      legend = nv.models.legend().height(30),
      dispatch = d3.dispatch('tooltipShow', 'tooltipHide');


  var showTooltip = function(e, offsetElement) {
    var left = e.pos[0] + ( (offsetElement && offsetElement.offsetLeft) || 0 ),
        top = e.pos[1] + ( (offsetElement && offsetElement.offsetTop) || 0),
        y = pie.valueFormat()(pie.y()(e.point)),
        content = tooltip(pie.x()(e.point), y, e, chart);

    nv.tooltip.show([left, top], content, e.value < 0 ? 'n' : 's');
  };



  function chart(selection) {
    selection.each(function(data) {
      var container = d3.select(this),
          that = this;

      var availableWidth = (width  || parseInt(container.style('width')) || 960)
                             - margin.left - margin.right,
          availableHeight = (height || parseInt(container.style('height')) || 400)
                             - margin.top - margin.bottom;



      var wrap = container.selectAll('g.wrap.pieChart').data([data]);
      var gEnter = wrap.enter().append('g').attr('class', 'wrap nvd3 pieChart').append('g');

      gEnter.append('g').attr('class', 'pieWrap');
      gEnter.append('g').attr('class', 'legendWrap');

      var g = wrap.select('g');


      if (showLegend) {
        legend
          .width( availableWidth )
          .key(pie.x());

        wrap.select('.legendWrap')
            .datum(pie.values()(data[0]))
            .call(legend);

        if ( margin.top != legend.height()) {
          margin.top = legend.height();
          availableHeight = (height || parseInt(container.style('height')) || 400)
                             - margin.top - margin.bottom;
        }

        wrap.select('.legendWrap')
            .attr('transform', 'translate(0,' + (-margin.top) +')');
      }


      pie
        .width(availableWidth)
        .height(availableHeight)
        //.color(data.map(function(d,i) {
          //return d.color || color[i % color.length];
        //}).filter(function(d,i) { return !data[i].disabled }))



      g.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      var pieWrap = g.select('.pieWrap')
          .datum(data)
          //.datum(data.filter(function(d) { return !d.disabled }))


      d3.transition(pieWrap).call(pie);


      legend.dispatch.on('legendClick', function(d,i, that) {
        d.disabled = !d.disabled;

        if (!pie.values()(data[0]).filter(function(d) { return !d.disabled }).length) {
          pie.values()(data[0]).map(function(d) {
            d.disabled = false;
            wrap.selectAll('.series').classed('disabled', false);
            return d;
          });
        }

        selection.transition().call(chart)
      });

      pie.dispatch.on('elementMouseover.tooltip', function(e) {
        e.pos = [e.pos[0] +  margin.left, e.pos[1] + margin.top];
        dispatch.tooltipShow(e);
      });
      if (tooltips) dispatch.on('tooltipShow', function(e) { showTooltip(e) } ); // TODO: maybe merge with above?

      pie.dispatch.on('elementMouseout.tooltip', function(e) {
        dispatch.tooltipHide(e);
      });
      if (tooltips) dispatch.on('tooltipHide', nv.tooltip.cleanup);


      //TODO: decide if this makes sense to add into all the models for ease of updating (updating without needing the selection)
      chart.update = function() { selection.transition().call(chart); };
      chart.container = this; // I need a reference to the container in order to have outside code check if the chart is visible or not

    });

    return chart;
  }


  chart.dispatch = dispatch;
  chart.pie = pie; // really just makign the accessible for discretebar.dispatch, may rethink slightly

  d3.rebind(chart, pie, 'values', 'x', 'y', 'id', 'showLabels', 'donut', 'labelThreshold');


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
    pie.color(_);
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
}

nv.models.scatter = function() {
  //Default Settings
  var margin = {top: 0, right: 0, bottom: 0, left: 0},
      width = 960,
      height = 500,
      color = d3.scale.category20().range(), // array of colors to be used in order
      id = Math.floor(Math.random() * 100000), //Create semi-unique ID incase user doesn't selet one
      x = d3.scale.linear(),
      y = d3.scale.linear(),
      z = d3.scale.linear(), //linear because d3.svg.shape.size is treated as area
      getX = function(d) { return d.x }, // accessor to get the x value from a data point
      getY = function(d) { return d.y }, // accessor to get the y value from a data point
      getSize = function(d) { return d.size }, // accessor to get the point radius from a data point //TODO: consider renamig size to z
      getShape = function(d) { return d.shape || 'circle' },
      forceX = [], // List of numbers to Force into the X scale (ie. 0, or a max / min, etc.)
      forceY = [], // List of numbers to Force into the Y scale 
      forceSize = [], // List of numbers to Force into the Size scale 
      interactive = true, // If true, plots a voronoi overlay for advanced point interection
      //removeZeroes = false, // If true, filters out points with y == 0 from being interactive //TODO: implement
      clipEdge = false, // if true, masks lines within x and y scale
      clipVoronoi = true, // if true, masks each point with a circle... can turn off to slightly increase performance
      clipRadius = function() { return 25 }, // function to get the radius for point clips
      xDomain, yDomain, sizeDomain; // Used to manually set the x and y domain, good to save time if calculation has already been made

  var dispatch = d3.dispatch('elementClick', 'elementMouseover', 'elementMouseout'),
      x0, y0, z0,
      timeoutID;


  function chart(selection) {
    selection.each(function(data) {

      var availableWidth = width - margin.left - margin.right,
          availableHeight = height - margin.top - margin.bottom,
          container = d3.select(this);

      //store old scales if they exist
      x0 = x0 || x;
      y0 = y0 || y;
      z0 = z0 || z;

      //add series index to each data point for reference
      data = data.map(function(series, i) {
        series.values = series.values.map(function(point) {
          point.series = i;
          return point;
        });
        return series;
      });


      // slight remap of the data for use in calculating the scales domains
      var seriesData = (xDomain && yDomain && sizeDomain) ? [] : // if we know xDomain and yDomain and sizeDomain, no need to calculate.... if Size is constant remember to set sizeDomain to speed up performance
            data.map(function(d) {
              return d.values.map(function(d,i) {
                return { x: getX(d,i), y: getY(d,i), size: getSize(d,i) }
              })
            });

      //TODO: figure out the best way to deal with scales with equal MIN and MAX
      x   .domain(xDomain || d3.extent(d3.merge(seriesData).map(function(d) { return d.x }).concat(forceX)))
          .range([0, availableWidth]);

      y   .domain(yDomain || d3.extent(d3.merge(seriesData).map(function(d) { return d.y }).concat(forceY)))
          .range([availableHeight, 0]);

      z   .domain(sizeDomain || d3.extent(d3.merge(seriesData).map(function(d) { return d.size }).concat(forceSize)))
          .range([16, 256]);
          //.range([2, 10]);



      var wrap = container.selectAll('g.wrap.scatter').data([data]);
      var wrapEnter = wrap.enter().append('g').attr('class', 'wrap nvd3 scatter chart-' +id);
      var defsEnter = wrapEnter.append('defs');
      var gEnter = wrapEnter.append('g');
      var g = wrap.select('g')

      gEnter.append('g').attr('class', 'groups');

      wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');


      defsEnter.append('clipPath')
          .attr('id', 'edge-clip-' + id)
        .append('rect');

      wrap.select('#edge-clip-' + id + ' rect')
          .attr('width', availableWidth)
          .attr('height', availableHeight);

      g   .attr('clip-path', clipEdge ? 'url(#edge-clip-' + id + ')' : '');



      function updateInteractiveLayer() {

        if (!interactive) {
          //wrap.select('#points-clip-' + id).remove();
          //wrap.select('.point-paths').remove();
          return false;
        }

        gEnter.append('g').attr('class', 'point-paths');

        // TODO: add a removeZeros option, useful for the stacked chart and maybe others
        var vertices = d3.merge(data.map(function(group, groupIndex) {
            return group.values.map(function(point, pointIndex) {
              // Adding noise to make duplicates very unlikely
              // Injecting series and point index for reference
              return [x(getX(point,pointIndex)) * (Math.random() / 1e12 + 1)  , y(getY(point,pointIndex)) * (Math.random() / 1e12 + 1), groupIndex, pointIndex]; //temp hack to add noise untill I think of a better way so there are no duplicates
            })
          })
        );


        if (clipVoronoi) {
          defsEnter.append('clipPath').attr('id', 'points-clip-' + id);

          var pointClips = wrap.select('#points-clip-' + id).selectAll('circle')
              .data(vertices);
          pointClips.enter().append('circle')
              .attr('r', clipRadius);
          pointClips.exit().remove();
          pointClips
              .attr('cx', function(d) { return d[0] })
              .attr('cy', function(d) { return d[1] });

          wrap.select('.point-paths')
              .attr('clip-path', 'url(#points-clip-' + id + ')');
        }


        //inject series and point index for reference into voronoi
        var voronoi = d3.geom.voronoi(vertices).map(function(d, i) { return { 'data': d, 'series': vertices[i][2], 'point': vertices[i][3] } });


        var pointPaths = wrap.select('.point-paths').selectAll('path')
            .data(voronoi);
        pointPaths.enter().append('path')
            .attr('class', function(d,i) { return 'path-'+i; });
        pointPaths.exit().remove();
        pointPaths
            .attr('d', function(d) { return 'M' + d.data.join(',') + 'Z'; })
            .on('click', function(d) {
              var series = data[d.series],
                  point  = series.values[d.point];

              dispatch.elementClick({
                point: point,
                series: series,
                pos: [x(getX(point, d.point)) + margin.left, y(getY(point, d.point)) + margin.top],
                seriesIndex: d.series,
                pointIndex: d.point
              });
            })
            .on('mouseover', function(d) {
              var series = data[d.series],
                  point  = series.values[d.point];

              dispatch.elementMouseover({
                point: point,
                series: series,
                pos: [x(getX(point, d.point)) + margin.left, y(getY(point, d.point)) + margin.top],
                seriesIndex: d.series,
                pointIndex: d.point
              });
            })
            .on('mouseout', function(d, i) {
              dispatch.elementMouseout({
                point: data[d.series].values[d.point],
                series: data[d.series],
                seriesIndex: d.series,
                pointIndex: d.point
              });
            });

        dispatch.on('elementMouseover.point', function(d) {
            d3.select('.chart-' + id + ' .series-' + d.seriesIndex + ' .point-' + d.pointIndex)
                .classed('hover', true);
        });

        dispatch.on('elementMouseout.point', function(d) {
            d3.select('.chart-' + id + ' .series-' + d.seriesIndex + ' .point-' + d.pointIndex)
                .classed('hover', false);
        });

      }




      var groups = wrap.select('.groups').selectAll('.group')
          .data(function(d) { return d }, function(d) { return d.key });
      groups.enter().append('g')
          .style('stroke-opacity', 1e-6)
          .style('fill-opacity', 1e-6);
      d3.transition(groups.exit())
          .style('stroke-opacity', 1e-6)
          .style('fill-opacity', 1e-6)
          .remove();
      groups
          .attr('class', function(d,i) { return 'group series-' + i })
          .classed('hover', function(d) { return d.hover });
      d3.transition(groups)
          .style('fill', function(d,i) { return color[i % color.length] })
          .style('stroke', function(d,i) { return color[i % color.length] })
          .style('stroke-opacity', 1)
          .style('fill-opacity', .5);


      var points = groups.selectAll('path.point')
          .data(function(d) { return d.values });
      points.enter().append('path')
          .attr('transform', function(d,i) {
            return 'translate(' + x0(getX(d,i)) + ',' + y0(getY(d,i)) + ')'
          })
          .attr('d',
                d3.svg.symbol()
                  .type(getShape)
                  .size(function(d,i) { return z(getSize(d,i)) })
               );
      d3.transition(groups.exit().selectAll('path.point'))
          .attr('transform', function(d,i) {
            return 'translate(' + x(getX(d,i)) + ',' + y(getY(d,i)) + ')'
          })
          .remove();
      points.attr('class', function(d,i) { return 'point point-' + i });
      d3.transition(points)
          .attr('transform', function(d,i) {
            return 'translate(' + x(getX(d,i)) + ',' + y(getY(d,i)) + ')'
          })
          .attr('d',
                d3.svg.symbol()
                  .type(getShape)
                  .size(function(d,i) { return z(getSize(d,i)) })
               );


      // Delay the update of the invisible interactive layer so animations are smoother in the meantime
      clearTimeout(timeoutID); //make sure unncesary repeat calls to updateInteractiveLayer don't occur
      timeoutID = setTimeout(updateInteractiveLayer, 1000);

      //store old scales for use in transitions on update, to animate from old to new positions, and sizes
      x0 = x.copy();
      y0 = y.copy();
      z0 = z.copy();

    });

    return chart;
  }


  chart.dispatch = dispatch;

  chart.x = function(_) {
    if (!arguments.length) return getX;
    getX = d3.functor(_);
    return chart;
  };

  chart.y = function(_) {
    if (!arguments.length) return getY;
    getY = d3.functor(_);
    return chart;
  };

  chart.size = function(_) {
    if (!arguments.length) return getSize;
    getSize = d3.functor(_);
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

  chart.zScale = function(_) {
    if (!arguments.length) return z;
    z = _;
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

  chart.sizeDomain = function(_) {
    if (!arguments.length) return sizeDomain;
    sizeDomain = _;
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

  chart.forceSize = function(_) {
    if (!arguments.length) return forceSize;
    forceSize = _;
    return chart;
  };

  chart.interactive = function(_) {
    if (!arguments.length) return interactive;
    interactive = _;
    return chart;
  };

  chart.clipEdge = function(_) {
    if (!arguments.length) return clipEdge;
    clipEdge = _;
    return chart;
  };

  chart.clipVoronoi= function(_) {
    if (!arguments.length) return clipVoronoi;
    clipVoronoi = _;
    return chart;
  };

  chart.clipRadius = function(_) {
    if (!arguments.length) return clipRadius;
    clipRadius = _;
    return chart;
  };

  chart.color = function(_) {
    if (!arguments.length) return color;
    color = _;
    return chart;
  };

  chart.shape= function(_) {
    if (!arguments.length) return getShape;
    getShape = _;
    return chart;
  };

  chart.id = function(_) {
    if (!arguments.length) return id;
    id = _;
    return chart;
  };


  return chart;
}

nv.models.scatterChart = function() {
  var margin = {top: 30, right: 20, bottom: 50, left: 60},
      width = null,
      height = null,
      color = d3.scale.category20().range(),
      showDistX = false,
      showDistY = false,
      showLegend = true,
      showControls = true,
      fisheye = 0,
      pauseFisheye = false,
      tooltips = true,
      tooltipX = function(key, x, y) { return '<strong>' + x + '</strong>' },
      tooltipY = function(key, x, y) { return '<strong>' + y + '</strong>' },
      tooltip = function(key, x, y, e, graph) { 
        return '<h3>' + key + '</h3>' +
               '<p>' +  y + ' at ' + x + '</p>'
      };


  var x = d3.fisheye.scale(d3.scale.linear).distortion(0),
      y = d3.fisheye.scale(d3.scale.linear).distortion(0);

  var scatter = nv.models.scatter().xScale(x).yScale(y),
      //x = scatter.xScale(),
      //y = scatter.yScale(),
      xAxis = nv.models.axis().orient('bottom').scale(x).tickPadding(10),
      yAxis = nv.models.axis().orient('left').scale(y).tickPadding(10),
      legend = nv.models.legend().height(30),
      controls = nv.models.legend().height(30),
      distX = nv.models.distribution().axis('x').scale(x),
      distY = nv.models.distribution().axis('y').scale(y),
      dispatch = d3.dispatch('tooltipShow', 'tooltipHide'),
      x0, y0; //TODO: abstract distribution component and have old scales stored there

  var showTooltip = function(e, offsetElement) {
    //TODO: make tooltip style an option between single or dual on axes (maybe on all charts with axes?)

    //var left = e.pos[0] + ( offsetElement.offsetLeft || 0 ),
        //top = e.pos[1] + ( offsetElement.offsetTop || 0),
    var leftX = e.pos[0] + ( offsetElement.offsetLeft || 0 ),
        topX = y.range()[0] + margin.top + ( offsetElement.offsetTop || 0),
        leftY = x.range()[0] + margin.left + ( offsetElement.offsetLeft || 0 ),
        topY = e.pos[1] + ( offsetElement.offsetTop || 0),
        xVal = xAxis.tickFormat()(scatter.x()(e.point)),
        yVal = yAxis.tickFormat()(scatter.y()(e.point)),
        contentX = tooltipX(e.series.key, xVal, yVal, e, chart),
        contentY = tooltipY(e.series.key, xVal, yVal, e, chart);
        //content = tooltip(e.series.key, xVal, yVal, e, chart);

    nv.tooltip.show([leftX, topX], contentX, 'n', 1);
    nv.tooltip.show([leftY, topY], contentY, 'e', 1);
    //nv.tooltip.show([left, top], content, e.value < 0 ? 'n' : 's');
  };

  var controlsData = [
    { key: 'Magnify', disabled: true }
  ];


  function chart(selection) {
    selection.each(function(data) {
      var container = d3.select(this),
          that = this;


      var availableWidth = (width  || parseInt(container.style('width')) || 960)
                             - margin.left - margin.right,
          availableHeight = (height || parseInt(container.style('height')) || 400)
                             - margin.top - margin.bottom;



      x0 = x0 || scatter.xScale();
      y0 = y0 || scatter.yScale();



      var wrap = container.selectAll('g.wrap.scatterChart').data([data]);
      var gEnter = wrap.enter().append('g').attr('class', 'wrap nvd3 scatterChart chart-' + scatter.id()).append('g');


      gEnter.append('rect')
          .attr('class', 'nvd3 background')
          .attr('width', availableWidth)
          .attr('height', availableHeight);


      gEnter.append('g').attr('class', 'x axis');
      gEnter.append('g').attr('class', 'y axis');
      gEnter.append('g').attr('class', 'scatterWrap');
      gEnter.append('g').attr('class', 'distWrap');
      gEnter.append('g').attr('class', 'legendWrap');
      gEnter.append('g').attr('class', 'controlsWrap');

      var g = wrap.select('g')

      if (showLegend) {
        legend.width( availableWidth / 2 );

        wrap.select('.legendWrap')
            .datum(data)
            .call(legend);

        if ( margin.top != legend.height()) {
          margin.top = legend.height();
          availableHeight = (height || parseInt(container.style('height')) || 400)
                             - margin.top - margin.bottom;
        }

        wrap.select('.legendWrap')
            .attr('transform', 'translate(' + (availableWidth / 2) + ',' + (-margin.top) +')');
      }

      if (showControls) {
        controls.width(180).color(['#444']);
        g.select('.controlsWrap')
            .datum(controlsData)
            .attr('transform', 'translate(0,' + (-margin.top) +')')
            .call(controls);
      }


      scatter
        .width(availableWidth)
        .height(availableHeight)
        .color(data.map(function(d,i) {
          return d.color || color[i % color.length];
        }).filter(function(d,i) { return !data[i].disabled }))


      g.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');


      var scatterWrap = wrap.select('.scatterWrap')
          .datum(data.filter(function(d) { return !d.disabled }));
      d3.transition(scatterWrap).call(scatter);


      xAxis
        .ticks( availableWidth / 100 )
        .tickSize( -availableHeight , 0);

      g.select('.x.axis')
          .attr('transform', 'translate(0,' + y.range()[0] + ')');
      d3.transition(g.select('.x.axis'))
          .call(xAxis);


      yAxis
        .ticks( availableHeight / 36 )
        .tickSize( -availableWidth, 0);

      d3.transition(g.select('.y.axis'))
          .call(yAxis);


      distX
        .width(availableWidth)
        .color(data.map(function(d,i) {
          return d.color || color[i % color.length];
        }).filter(function(d,i) { return !data[i].disabled }));
      gEnter.select('.distWrap').append('g')
          .attr('class', 'distributionX')
          .attr('transform', 'translate(0,' + y.range()[0] + ')');
      g.select('.distributionX')
          .datum(data.filter(function(d) { return !d.disabled }))
          .call(distX);


      distY
        .width(availableHeight)
        .color(data.map(function(d,i) {
          return d.color || color[i % color.length];
        }).filter(function(d,i) { return !data[i].disabled }));
      gEnter.select('.distWrap').append('g')
          .attr('class', 'distributionY')
          .attr('transform', 'translate(-' + distY.size() + ',0)');
      g.select('.distributionY')
          .datum(data.filter(function(d) { return !d.disabled }))
          .call(distY);


      g.select('.background').on('mousemove', updateFisheye);
      g.select('.background').on('click', function() { pauseFisheye = !pauseFisheye; });
      //g.select('.point-paths').on('mousemove', updateFisheye);


      function updateFisheye() {
        if (pauseFisheye) {
          //g.select('.background') .style('pointer-events', 'none');
          g.select('.point-paths').style('pointer-events', 'all');
          return false;
        }

        g.select('.background') .style('pointer-events', 'all');
        g.select('.point-paths').style('pointer-events', 'none' );

        var mouse = d3.mouse(this);
        x.distortion(fisheye).focus(mouse[0]);
        y.distortion(fisheye).focus(mouse[1]);

        scatterWrap.call(scatter);
        g.select('.x.axis').call(xAxis);
        g.select('.y.axis').call(yAxis);
        g.select('.distributionX')
          .datum(data.filter(function(d) { return !d.disabled }))
            .call(distX);
        g.select('.distributionY')
          .datum(data.filter(function(d) { return !d.disabled }))
            .call(distY);
      }




      controls.dispatch.on('legendClick', function(d,i) { 
        d.disabled = !d.disabled;

        fisheye = d.disabled ? 0 : 2.5;
        g.select('.background') .style('pointer-events', d.disabled ? 'none' : 'all');
        g.select('.point-paths').style('pointer-events', d.disabled ? 'all' : 'none' );

        //scatter.interactive(d.disabled);
        //tooltips = d.disabled;

        if (d.disabled) {
          x.distortion(fisheye).focus(0);
          y.distortion(fisheye).focus(0);

          scatterWrap.call(scatter);
          g.select('.x.axis').call(xAxis);
          g.select('.y.axis').call(yAxis);
        } else {
          pauseFisheye = false;
        }

        selection.transition().call(chart);
      });


      legend.dispatch.on('legendClick', function(d,i, that) {
        d.disabled = !d.disabled;

        if (!data.filter(function(d) { return !d.disabled }).length) {
          data.map(function(d) {
            d.disabled = false;
            wrap.selectAll('.series').classed('disabled', false);
            return d;
          });
        }

        selection.transition().call(chart)
      });

      /*
      legend.dispatch.on('legendMouseover', function(d, i) {
        d.hover = true;
        selection.transition().call(chart)
      });

      legend.dispatch.on('legendMouseout', function(d, i) {
        d.hover = false;
        selection.transition().call(chart)
      });
      */


      scatter.dispatch.on('elementMouseover.tooltip', function(e) {
        d3.select('.chart-' + scatter.id() + ' .series-' + e.seriesIndex + ' .distx-' + e.pointIndex)
            .attr('y1', e.pos[1] - availableHeight);
        d3.select('.chart-' + scatter.id() + ' .series-' + e.seriesIndex + ' .disty-' + e.pointIndex)
            .attr('x2', e.pos[0] + distX.size());

        e.pos = [e.pos[0] + margin.left, e.pos[1] + margin.top];
        dispatch.tooltipShow(e);
      });
      if (tooltips) dispatch.on('tooltipShow', function(e) { showTooltip(e, that.parentNode) } ); // TODO: maybe merge with above?

      scatter.dispatch.on('elementMouseout.tooltip', function(e) {
        dispatch.tooltipHide(e);

        d3.select('.chart-' + scatter.id() + ' .series-' + e.seriesIndex + ' .distx-' + e.pointIndex)
            .attr('y1', 0);
        d3.select('.chart-' + scatter.id() + ' .series-' + e.seriesIndex + ' .disty-' + e.pointIndex)
            .attr('x2', distY.size());
      });
      if (tooltips) dispatch.on('tooltipHide', nv.tooltip.cleanup);


      //store old scales for use in transitions on update, to animate from old to new positions, and sizes
      x0 = x.copy();
      y0 = y.copy();


      //TODO: decide if this makes sense to add into all the models for ease of updating (updating without needing the selection)
      chart.update = function() { selection.transition().call(chart) };
      chart.container = this; // I need a reference to the container in order to have outside code check if the chart is visible or not


    });

    return chart;
  }


  chart.dispatch = dispatch;
  chart.legend = legend;
  chart.xAxis = xAxis;
  chart.yAxis = yAxis;

  d3.rebind(chart, scatter, 'interactive', 'shape', 'size', 'xScale', 'yScale', 'zScale', 'xDomain', 'yDomain', 'sizeDomain', 'forceX', 'forceY', 'forceSize', 'clipVoronoi', 'clipRadius', 'fisheye', 'fisheyeRadius');


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
    distX.color(_);
    distY.color(_);
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


  return chart;
}

nv.models.sparkline = function() {
  var margin = {top: 0, right: 0, bottom: 0, left: 0},
      width = 400,
      height = 32,
      animate = true,
      getX = function(d) { return d.x },
      getY = function(d) { return d.y },
      color = d3.scale.category20().range(),
      xDomain, yDomain;

  var x = d3.scale.linear(),
      y = d3.scale.linear();

  function chart(selection) {
    selection.each(function(data) {
      var availableWidth = width - margin.left - margin.right,
          availableHeight = height - margin.top - margin.bottom;


      x   .domain(xDomain || d3.extent(data, getX ))
          .range([0, availableWidth]);

      y   .domain(yDomain || d3.extent(data,getY ))
          .range([availableHeight, 0]);


      var wrap = d3.select(this).selectAll('g.sparkline').data([data]);

      var gEnter = wrap.enter().append('g').attr('class', 'nvd3 sparkline');
      //var gEnter = svg.enter().append('svg').append('g');
      //gEnter.append('g').attr('class', 'sparkline')
      gEnter
          .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
          .style('stroke', function(d,i) { return d.color || color[i * color.length] });

/*
      d3.select(this)
          .attr('width', width)
          .attr('height', height);
         */


      //var paths = gEnter.select('.sparkline').selectAll('path')
      var paths = gEnter.selectAll('path')
          .data(function(d) { return [d] });
      paths.enter().append('path');
      paths.exit().remove();
      paths
          .attr('d', d3.svg.line()
            .x(function(d,i) { return x(getX(d,i)) })
            .y(function(d,i) { return y(getY(d,i)) })
          );


      // TODO: Add CURRENT data point (Need Min, Mac, Current / Most recent)
      var points = gEnter.selectAll('circle.point')
          .data(function(d) { return d.filter(function(p,i) { return y.domain().indexOf(getY(p,i)) != -1 || getX(p,i) == x.domain()[1]  }) });
      points.enter().append('circle').attr('class', 'point');
      points.exit().remove();
      points
          .attr('cx', function(d,i) { return x(getX(d,i)) })
          .attr('cy', function(d,i) { return y(getY(d,i)) })
          .attr('r', 2)
          .style('stroke', function(d,i) { return d.x == x.domain()[1] ? '#444' : d.y == y.domain()[0] ? '#d62728' : '#2ca02c' })
          .style('fill', function(d,i) { return d.x == x.domain()[1] ? '#444' : d.y == y.domain()[0] ? '#d62728' : '#2ca02c' });
    });

    return chart;
  }


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

  chart.x = function(_) {
    if (!arguments.length) return getX;
    getX = d3.functor(_);
    return chart;
  };

  chart.y = function(_) {
    if (!arguments.length) return getY;
    getY = d3.functor(_);
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

  chart.animate = function(_) {
    if (!arguments.length) return animate;
    animate = _;
    return chart;
  };

  return chart;
}

nv.models.sparklinePlus = function() {
  var margin = {top: 15, right: 40, bottom: 3, left: 40},
      width = 400,
      height = 50,
      animate = true,
      getX = function(d) { return d.x },
      getY = function(d) { return d.y },
      color = d3.scale.category20().range(),
      id = Math.floor(Math.random() * 100000), //Create semi-unique ID incase user doesn't selet one
      xTickFormat = d3.format(',r'),
      yTickFormat = d3.format(',.2f');

  var x = d3.scale.linear(),
      y = d3.scale.linear(),
      sparkline = nv.models.sparkline();

  function chart(selection) {
    selection.each(function(data) {
      var availableWidth = width - margin.left - margin.right,
          availableHeight = height - margin.top - margin.bottom;

      x   .domain(d3.extent(data, getX ))
          .range([0, availableWidth]);

      y   .domain(d3.extent(data, getY ))
          .range([availableHeight, 0]);


      var wrap = d3.select(this).selectAll('g.sparklineplus').data([data]);


      var gEnter = wrap.enter().append('g')
      //var gEnter = svg.enter().append('svg').append('g');
      var sparklineWrap = gEnter.append('g').attr('class', 'nvd3 sparklineplus')
          .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
          .style('stroke', function(d, i){ return d.color || color[i % color.length] });

      sparkline
        .xDomain(x.domain())
        .yDomain(y.domain());


      sparklineWrap
          //.attr('width', width)
          //.attr('height', height)
          .call(sparkline);

      var hoverValue = sparklineWrap.append('g').attr('class', 'hoverValue');
      var hoverArea = sparklineWrap.append('g').attr('class', 'hoverArea');


      hoverValue.attr('transform', function(d) { return 'translate(' + x(d) + ',0)' });

      var hoverLine = hoverValue.append('line')
          .attr('x1', x.range()[1])
          .attr('y1', -margin.top)
          .attr('x2', x.range()[1])
          .attr('y2', height)

     var hoverX = hoverValue.append('text').attr('class', 'xValue')
          .attr('text-anchor', 'end')
          .attr('dy', '.9em')

     var hoverY = hoverValue.append('text').attr('class', 'yValue')
          //.attr('transform', function(d) { return 'translate(' + x(d) + ',0)' })
          .attr('text-anchor', 'start')
          .attr('dy', '.9em')


      hoverArea.append('rect')
          .attr('width', availableWidth)
          .attr('height', availableHeight)
          .on('mousemove', sparklineHover);



      function sparklineHover() { 
        var pos = d3.event.offsetX - margin.left;

        hoverLine
            .attr('x1', pos)
            .attr('x2', pos);

        hoverX
            .attr('transform', function(d) { return 'translate(' + (pos - 6) + ',' + (-margin.top) + ')' })
            //.text(xTickFormat(pos));
            .text(xTickFormat(Math.round(x.invert(pos)))); //TODO: refactor this line

        hoverY
            .attr('transform', function(d) { return 'translate(' + (pos + 6) + ',' + (-margin.top) + ')' })
            //.text(data[pos] && yTickFormat(data[pos].y));
            .text(yTickFormat(getY(data[Math.round(x.invert(pos))]))); //TODO: refactor this line
      }

    });

    return chart;
  }


  chart.margin = function(_) {
    if (!arguments.length) return margin;
    margin = _;
    return chart;
  };

  chart.width = function(_) {
    if (!arguments.length) return width;
    width = _;
    sparkline.width(_ - margin.left - margin.right);
    return chart;
  };

  chart.height = function(_) {
    if (!arguments.length) return height;
    height = _;
    sparkline.height(_ - margin.top - margin.bottom);
    return chart;
  };

  chart.x = function(_) {
    if (!arguments.length) return getX;
    getX = d3.functor(_);
    sparkline.x(_);
    return chart;
  };

  chart.y = function(_) {
    if (!arguments.length) return getY;
    getY = d3.functor(_);
    sparkline.y(_);
    return chart;
  };

  chart.id = function(_) {
    if (!arguments.length) return id;
    id = _;
    return chart;
  };

  chart.animate = function(_) {
    if (!arguments.length) return animate;
    animate = _;
    return chart;
  };

  return chart;
}
// THIS IS AN ATTEMPT TO CLEAN UP THIS MODEL

nv.models.stackedArea = function() {
  //Default Settings
  var margin = {top: 0, right: 0, bottom: 0, left: 0},
      width = 960,
      height = 500,
      color = d3.scale.category20().range(), // array of colors to be used in order
      id = Math.floor(Math.random() * 100000), //Create semi-unique ID incase user doesn't selet one
      getX = function(d) { return d.x }, // accessor to get the x value from a data point
      getY = function(d) { return d.y }, // accessor to get the y value from a data point
      style = 'stack',
      offset = 'zero',
      order = 'default',
      clipEdge = false; // if true, masks lines within x and y scale

/************************************
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

  var stacked = d3.layout.stack()
                 //.offset('zero')
                 .values(function(d) { return d.values })  //TODO: make values customizeable in EVERY model in this fashion
                 .x(getX)
                 .y(function(d) { return d.stackedY })
                 .out(function(d, y0, y) {
                    d.display = {
                      y: y,
                     y0: y0
                    };
                  }),
      scatter = nv.models.scatter()
                  .size(2.2) // default size
                  .sizeDomain([2.5]), //set to speed up calculation, needs to be unset if there is a cstom size accessor
      x = scatter.xScale(),
      y = scatter.yScale(),
      dispatch =  d3.dispatch('tooltipShow', 'tooltipHide', 'areaClick', 'areaMouseover', 'areaMouseout');

  function chart(selection) {
    selection.each(function(data) {
        var availableWidth = width - margin.left - margin.right,
            availableHeight = height - margin.top - margin.bottom;


        // Injecting point index into each point because d3.layout.stack().out does not give index
        // ***Also storing getY(d,i) as yStacked so that it can be set to 0 if series is disabled
        // TODO: see if theres a way to deal with disabled series more consistent with the other models
        data = data.map(function(aseries, i) {
                 aseries.values = aseries.values.map(function(d, j) {
                   d.index = j;
                   d.stackedY = aseries.disabled ? 0 : getY(d,j);
                   return d;
                 })
                 return aseries;
               });

/*
        //TODO: Figure out why stream mode is broken with this
        data = stacked
                .order(order)
                .offset(offset)
                (data);
*/

        data = d3.layout.stack()
                 .order(order)
                 .offset(offset)
                 .values(function(d) { return d.values })  //TODO: make values customizeable in EVERY model in this fashion
                 .x(getX)
                 .y(function(d) { return d.stackedY })
                 .out(function(d, y0, y) {
                    d.display = {
                      y: y,
                     y0: y0
                    };
                  })
                (data);


        var wrap = d3.select(this).selectAll('g.wrap.stackedarea').data([data]);
        var wrapEnter = wrap.enter().append('g').attr('class', 'wrap nvd3 stackedarea');
        var defsEnter = wrapEnter.append('defs');
        var gEnter = wrapEnter.append('g');
        var g = wrap.select('g');

        gEnter.append('g').attr('class', 'areaWrap');


        scatter
          .width(availableWidth)
          .height(availableHeight)
          //.x(function(d) { return d.display.x })
          .x(getX)
          .y(function(d) { return d.display.y + d.display.y0 }) // TODO: allow for getY to be other than d.y
          .forceY([0])
          .color(data.map(function(d,i) {
            return d.color || color[i % color.length];
          }).filter(function(d,i) { return !data[i].disabled }));


        gEnter.append('g').attr('class', 'scatterWrap');
        var scatterWrap = g.select('.scatterWrap')
            .datum(data.filter(function(d) { return !d.disabled }))

        d3.transition(scatterWrap).call(scatter);




        wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');


        defsEnter.append('clipPath')
            .attr('id', 'edge-clip-' + id)
          .append('rect');

        wrap.select('#edge-clip-' + id + ' rect')
            .attr('width', availableWidth)
            .attr('height', availableHeight);

        g   .attr('clip-path', clipEdge ? 'url(#edge-clip-' + id + ')' : '');




        var area = d3.svg.area()
            .x(function(d,i)  { return x(getX(d,i)) })
            //.x(function(d)  { return x(d.display.x) })
            .y0(function(d) { return y(d.display.y0) })
            .y1(function(d) { return y(d.display.y + d.display.y0) });

        var zeroArea = d3.svg.area()
            .x(function(d,i)  { return x(getX(d,i)) })
            //.x(function(d)  { return x(d.display.x) })
            .y0(function(d) { return y(d.display.y0) })
            .y1(function(d) { return y(d.display.y0) });


        var path = g.select('.areaWrap').selectAll('path.area')
            .data(function(d) { return d });
            //.data(function(d) { return d }, function(d) { return d.key });
        path.enter().append('path').attr('class', function(d,i) { return 'area area-' + i })
            .on('mouseover', function(d,i) {
              d3.select(this).classed('hover', true);
              dispatch.areaMouseover({
                point: d,
                series: d.key,
                pos: [d3.event.pageX, d3.event.pageY],
                seriesIndex: i
              });
            })
            .on('mouseout', function(d,i) {
              d3.select(this).classed('hover', false);
              dispatch.areaMouseout({
                point: d,
                series: d.key,
                pos: [d3.event.pageX, d3.event.pageY],
                seriesIndex: i
              });
            })
            .on('click', function(d,i) {
              d3.select(this).classed('hover', false);
              dispatch.areaClick({
                point: d,
                series: d.key,
                pos: [d3.event.pageX, d3.event.pageY],
                seriesIndex: i
              });
            })
        d3.transition(path.exit())
            .attr('d', function(d,i) { return zeroArea(d.values,i) }) // TODO: fix this so transition is still fluid
            .remove();
        path
            .style('fill', function(d,i){ return d.color || color[i % color.length] })
            .style('stroke', function(d,i){ return d.color || color[i % color.length] });
        d3.transition(path)
            .attr('d', function(d,i) { return area(d.values,i) })


        scatter.dispatch.on('elementClick.area', function(e) {
          dispatch.areaClick(e);
        })
        scatter.dispatch.on('elementMouseover.area', function(e) {
          g.select('.area-' + e.seriesIndex).classed('hover', true);
        });
        scatter.dispatch.on('elementMouseout.area', function(e) {
          g.select('.area-' + e.seriesIndex).classed('hover', false);
        });

    });


    return chart;
  }


  chart.dispatch = dispatch;
  chart.scatter = scatter;

  d3.rebind(chart, scatter, 'interactive', 'size', 'xScale', 'yScale', 'zScale', 'xDomain', 'yDomain', 'sizeDomain', 'forceX', 'forceY', 'forceSize', 'clipVoronoi', 'clipRadius');

  chart.x = function(_) {
    if (!arguments.length) return getX;
    getX = d3.functor(_);
    return chart;
  };

  chart.y = function(_) {
    if (!arguments.length) return getY;
    getY = d3.functor(_);
    return chart;
  }

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

  chart.clipEdge = function(_) {
    if (!arguments.length) return clipEdge;
    clipEdge = _;
    return chart;
  };

  chart.color = function(_) {
    if (!arguments.length) return color;
    color = _;
    return chart;
  };

  chart.offset = function(_) {
    if (!arguments.length) return offset;
    offset = _;
    //stacked.offset(offset);
    return chart;
  };

  chart.order = function(_) {
    if (!arguments.length) return order;
    order = _;
    //stacked.order(order);
    return chart;
  };

  //shortcut for offset + order
  chart.style = function(_) {
    if (!arguments.length) return style;
    style = _;

    switch (style) {
      case 'stack':
        chart.offset('zero');
        chart.order('default');
        break;
      case 'stream':
        chart.offset('wiggle');
        chart.order('inside-out');
        break;
      case 'expand':
        chart.offset('expand');
        chart.order('default');
        break;
    }

    return chart;
  };



  scatter.dispatch.on('elementMouseover.tooltip', function(e) {
        e.pos = [e.pos[0] + margin.left, e.pos[1] + margin.top],
        dispatch.tooltipShow(e);
  });

  scatter.dispatch.on('elementMouseout.tooltip', function(e) {
        dispatch.tooltipHide(e);
  });


  return chart;
}

nv.models.stackedAreaChart = function() {
  var margin = {top: 30, right: 25, bottom: 50, left: 60},
      width = null,
      height = null,
      color = d3.scale.category20().range(),
      showControls = true,
      showLegend = true,
      tooltips = true,
      tooltip = function(key, x, y, e, graph) { 
        return '<h3>' + key + '</h3>' +
               '<p>' +  y + ' on ' + x + '</p>'
      };


  var stacked = nv.models.stackedArea(),
      x = stacked.xScale(),
      y = stacked.yScale(),
      xAxis = nv.models.axis().scale(x).orient('bottom').tickPadding(5),
      yAxis = nv.models.axis().scale(y).orient('left'),
      legend = nv.models.legend().height(30),
      controls = nv.models.legend().height(30),
      dispatch = d3.dispatch('tooltipShow', 'tooltipHide');

  //TODO: let user select default
  var controlsData = [
    { key: 'Stacked' },
    { key: 'Stream', disabled: true },
    { key: 'Expanded', disabled: true }
  ];

  var showTooltip = function(e, offsetElement) {
    var left = e.pos[0] + ( offsetElement.offsetLeft || 0 ),
        top = e.pos[1] + ( offsetElement.offsetTop || 0),
        x = xAxis.tickFormat()(stacked.x()(e.point)),
        y = yAxis.tickFormat()(stacked.y()(e.point)),
        content = tooltip(e.series.key, x, y, e, chart);

    nv.tooltip.show([left, top], content, e.value < 0 ? 'n' : 's');
  };


  function chart(selection) {
    selection.each(function(data) {
      var container = d3.select(this),
          that = this;


      var availableWidth = (width  || parseInt(container.style('width')) || 960)
                             - margin.left - margin.right,
          availableHeight = (height || parseInt(container.style('height')) || 400)
                             - margin.top - margin.bottom;



      var wrap = container.selectAll('g.wrap.stackedAreaChart').data([data]);
      var gEnter = wrap.enter().append('g').attr('class', 'wrap nvd3 stackedAreaChart').append('g');

      gEnter.append('g').attr('class', 'x axis');
      gEnter.append('g').attr('class', 'y axis');
      gEnter.append('g').attr('class', 'stackedWrap');
      gEnter.append('g').attr('class', 'legendWrap');
      gEnter.append('g').attr('class', 'controlsWrap');


      var g = wrap.select('g');


      if (showLegend) {
        legend
          .width( availableWidth / 2 );

        g.select('.legendWrap')
            .datum(data)
            .call(legend);

        if ( margin.top != legend.height()) {
          margin.top = legend.height();
          availableHeight = (height || parseInt(container.style('height')) || 400)
                             - margin.top - margin.bottom;
        }

        g.select('.legendWrap')
            .attr('transform', 'translate(' + (availableWidth/2 - margin.left) + ',' + (-margin.top) +')');
      }


      stacked
        .width(availableWidth)
        .height(availableHeight)



      if (showControls) {
        controls.width(280).color(['#444', '#444', '#444']);
        g.select('.controlsWrap')
            .datum(controlsData)
            .attr('transform', 'translate(0,' + (-margin.top) +')')
            .call(controls);
      }


      g.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');


      var stackedWrap = g.select('.stackedWrap')
          .datum(data);
      d3.transition(stackedWrap).call(stacked);


      xAxis
        .ticks( availableWidth / 100 )
        .tickSize( -availableHeight, 0);

      g.select('.x.axis')
          .attr('transform', 'translate(0,' + availableHeight + ')');
      d3.transition(g.select('.x.axis'))
          .call(xAxis);

      yAxis
        .ticks(stacked.offset() == 'wiggle' ? 0 : availableHeight / 36)
        .tickSize(-availableWidth, 0)
        .tickFormat(stacked.offset() == 'expand' ? d3.format('%') : d3.format(',.2f')); //TODO: stacked format should be set by caller

      d3.transition(g.select('.y.axis'))
          .call(yAxis);



      stacked.dispatch.on('areaClick.toggle', function(e) {
        if (data.filter(function(d) { return !d.disabled }).length === 1)
          data = data.map(function(d) {
            d.disabled = false; 
            return d
          });
        else
          data = data.map(function(d,i) {
            d.disabled = (i != e.seriesIndex);
            return d
          });

        selection.transition().call(chart);
      });

      legend.dispatch.on('legendClick', function(d,i) { 
        d.disabled = !d.disabled;

        if (!data.filter(function(d) { return !d.disabled }).length) {
          data.map(function(d) {
            d.disabled = false;
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
          case 'Stacked':
            stacked.style('stack');
            break;
          case 'Stream':
            stacked.style('stream');
            break;
          case 'Expanded':
            stacked.style('expand');
            break;
        }

        selection.transition().call(chart);
      });


      stacked.dispatch.on('tooltipShow', function(e) {
        //disable tooltips when value ~= 0
        //// TODO: consider removing points from voronoi that have 0 value instead of this hack
        if (!Math.round(stacked.y()(e.point) * 100)) {  // 100 will not be good for very small numbers... will have to think about making this valu dynamic, based on data range
          setTimeout(function() { d3.selectAll('.point.hover').classed('hover', false) }, 0);
          return false;
        }

        e.pos = [e.pos[0] + margin.left, e.pos[1] + margin.top],
        dispatch.tooltipShow(e);
      });
      if (tooltips) dispatch.on('tooltipShow', function(e) { showTooltip(e, that.parentNode) } ); // TODO: maybe merge with above?

      stacked.dispatch.on('tooltipHide', function(e) {
        dispatch.tooltipHide(e);
      });
      if (tooltips) dispatch.on('tooltipHide', nv.tooltip.cleanup);


      //TODO: decide if this makes sense to add into all the models for ease of updating (updating without needing the selection)
      chart.update = function() { selection.transition().call(chart) };
      chart.container = this; // I need a reference to the container in order to have outside code check if the chart is visible or not

    });


    return chart;
  }


  chart.dispatch = dispatch;
  chart.stacked = stacked;
  chart.xAxis = xAxis;
  chart.yAxis = yAxis;

  d3.rebind(chart, stacked, 'x', 'y', 'interactive', 'offset', 'order', 'style', 'clipEdge', 'size', 'forceX', 'forceY', 'forceSize');

  /*
  chart.x = function(_) {
    if (!arguments.length) return getX;
    getX = d3.functor(_); //not used locally, so could jsut be a rebind
    stacked.x(getX);
    return chart;
  };

  chart.y = function(_) {
    if (!arguments.length) return getY;
    getY = d3.functor(_);
    stacked.y(getY);
    return chart;
  };
  */

  chart.margin = function(_) {
    if (!arguments.length) return margin;
    margin = _;
    return chart;
  };

  chart.width = function(_) {
    if (!arguments.length) return getWidth;
    width = _;
    return chart;
  };

  chart.height = function(_) {
    if (!arguments.length) return getHeight;
    height = _;
    return chart;
  };

  chart.color = function(_) {
    if (!arguments.length) return color;
    color = _;
    legend.color(_);
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
}
})();