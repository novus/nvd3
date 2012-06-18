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
    container.style.left = 1;
    container.style.top = 1;
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
      highlightZero = true;
      //TODO: considering adding margin

  var axis = d3.svg.axis()
               .scale(scale)
               .orient('bottom')
               .tickFormat(function(d) { return d }); //TODO: decide if we want to keep this

  function chart(selection) {
    selection.each(function(data) {

      if (axis.orient() == 'top' || axis.orient() == 'bottom')
        axis.ticks(Math.abs(scale.range()[1] - scale.range()[0]) / 100);

      //TODO: consider calculating height based on whether or not label is added, for reference in charts using this component

      var axisLabel = d3.select(this).selectAll('text.axislabel')
          .data([axisLabelText || null]);
      axisLabel.exit().remove();
      switch (axis.orient()) {
        case 'top':
          axisLabel.enter().append('text').attr('class', 'axislabel')
              .attr('text-anchor', 'middle')
              .attr('y', 0);
          axisLabel
              .attr('x', scale.range()[1] / 2);
              break;
        case 'right':
          axisLabel.enter().append('text').attr('class', 'axislabel')
               .attr('transform', 'rotate(90)')
              .attr('y', -40); //TODO: consider calculating this based on largest tick width... OR at least expose this on chart
          axisLabel
              .attr('x', -scale.range()[0] / 2);
              break;
        case 'bottom':
          axisLabel.enter().append('text').attr('class', 'axislabel')
              .attr('text-anchor', 'middle')
              .attr('y', 25);
          axisLabel
              .attr('x', scale.range()[1] / 2);
              break;
        case 'left':
          axisLabel.enter().append('text').attr('class', 'axislabel')
               .attr('transform', 'rotate(-90)')
              .attr('y', -40); //TODO: consider calculating this based on largest tick width... OR at least expose this on chart
          axisLabel
              .attr('x', -scale.range()[0] / 2);
              break;
      }
      axisLabel
          .text(function(d) { return d });


      d3.transition(d3.select(this))
          .call(axis);

      //highlight zero line ... Maybe should not be an option and should just be in CSS?
      if (highlightZero)
        d3.select(this)
          .selectAll('line.tick')
          .filter(function(d) { return !parseFloat(Math.round(d*100000)/1000000) }) //this is because sometimes the 0 tick is a very small fraction, TODO: think of cleaner technique
            .classed('zero', true);

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

nv.models.bar = function() {
  var margin = {top: 20, right: 10, bottom: 80, left: 60},
      width = 960,
      height = 500,
      animate = 500,
      label ='label',
      rotatedLabel = true,
      showLabels = true,
      id = Math.floor(Math.random() * 10000), //Create semi-unique ID in case user doesn't select one
      color = d3.scale.category20(),
      field ='y',
      title = '';

  var x = d3.scale.ordinal(),
      y = d3.scale.linear(),
      xAxis = d3.svg.axis().scale(x).orient('bottom'),
      yAxis = d3.svg.axis().scale(y).orient('left'),
      dispatch = d3.dispatch('chartClick', 'elementClick', 'elementDblClick', 'tooltipShow', 'tooltipHide');


  function chart(selection) {
    selection.each(function(data) {
      x .domain(data.map(function(d,i) { return d[label]; }))
        .rangeRoundBands([0, width - margin.left - margin.right], .1);


      var min = d3.min(data, function(d) { return d[field] });
      var max = d3.max(data, function(d) { return d[field] });
      var x0 = Math.max(-min, max);
      var x1 = -x0;

      // If we have no negative values, then lets stack this with just positive bars
      if (min >= 0) x1 = 0;

      y .domain([x1, x0])
        .range([height - margin.top - margin.bottom, 0])
        .nice();

      xAxis.ticks( width / 100 );
      yAxis.ticks( height / 36 ).tickSize(-(width - margin.right - margin.left), 0);

      var parent = d3.select(this)
          .on("click", function(d,i) {
            dispatch.chartClick({
                data: d,
                index: i,
                pos: d3.event,
                id: id
            });
          });


      var wrap = parent.selectAll('g.wrap').data([data]);
      var gEnter = wrap.enter();
      gEnter.append("text")
          .attr("class", "title")
          .attr("dy", ".91em")
          .attr("text-anchor", "start")
          .text(title);
      gEnter = gEnter.append('g').attr('class', 'nvd3 wrap').attr('id','wrap-'+id).append('g');



      gEnter.append('g').attr('class', 'x axis');
      gEnter.append('g').attr('class', 'y axis');
      gEnter.append('g').attr('class', 'bars');


      wrap.attr('width', width)
          .attr('height', height);

      var g = wrap.select('g')
          .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');


      var bars = wrap.select('.bars').selectAll('.bar')
          .data(function(d) { return d; });

      bars.exit().remove();


      var barsEnter = bars.enter().append('svg:rect')
          .attr('class', function(d) { return d[field] < 0 ? "bar negative" : "bar positive"})
          .attr("fill", function(d, i) { return color(i); })
          .attr('x', 0 )
          .on('mouseover', function(d,i){
            d3.select(this).classed('hover', true);
            dispatch.tooltipShow({
                label: d[label],
                value: d[field],
                data: d,
                index: i,
                // TODO: Calculate the center to the bar
                pos: [d3.event.pageX, d3.event.pageY],
                id: id
            });

          })
          .on('mouseout', function(d,i){
                d3.select(this).classed('hover', false);
                dispatch.tooltipHide({
                    label: d[label],
                    value: d[field],
                    data: d,
                    index: i,
                    id: id
                });
          })
          .on('click', function(d,i) {
                dispatch.elementClick({
                    label: d[label],
                    value: d[field],
                    data: d,
                    index: i,
                    pos: d3.event,
                    id: id
                });
              d3.event.stopPropagation();
          })
          .on('dblclick', function(d,i) {
              dispatch.elementDblClick({
                  label: d[label],
                  value: d[field],
                  data: d,
                  index: i,
                  pos: d3.event,
                  id: id
              });
              d3.event.stopPropagation();
          });


      bars
          .attr('class', function(d) { return d[field] < 0 ? "bar negative" : "bar positive"})
          .attr('transform', function(d,i) { return 'translate(' + x(d[label]) + ',0)'; })
          .attr('width', x.rangeBand )
          .order()
          .transition()
          .duration(animate)
          .attr('y', function(d) {  return y(Math.max(0, d[field])); })
          .attr('height', function(d) { return Math.abs(y(d[field]) - y(0));  });


      g.select('.x.axis')
          .attr('transform', 'translate(0,' + y.range()[0] + ')')
          .call(xAxis);


      if (rotatedLabel) {
        g.select('.x.axis').selectAll('text').attr('text-anchor','start').attr("transform", function(d) {
          return "rotate(35)translate(" + this.getBBox().height/2 + "," + '0' + ")";
        });
      }
      if (!showLabels) {
        g.select('.x.axis').selectAll('text').attr('fill', 'rgba(0,0,0,0)');
        g.select('.x.axis').selectAll('line').attr('style', 'opacity: 0');
      }
      /*else {
        g.select('.x.axis').selectAll('text').attr('fill', 'rgba(0,0,0,1)');
        g.select('.x.axis').selectAll('line').attr('style', 'opacity: 1');
      }*/



      g.select('.y.axis')
        .call(yAxis);
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
    if (margin.left + margin.right + 20 > _)
      width = margin.left + margin.right + 20; // Min width
    else
      width = _;
    return chart;
  };

  chart.height = function(_) {
    if (!arguments.length) return height;
    if (margin.top + margin.bottom + 20 > _)
      height = margin.top + margin.bottom + 20; // Min height
    else
      height = _;
    return chart;
  };

  chart.animate = function(_) {
    if (!arguments.length) return animate;
    animate = _;
    return chart;
  };

  chart.labelField = function(_) {
    if (!arguments.length) return (label);
      label = _;
      return chart;
  };

  chart.dataField = function(_) {
    if (!arguments.length) return (field);
    field = _;
    return chart;
  };

  chart.id = function(_) {
        if (!arguments.length) return id;
        id = _;
        return chart;
  };

  chart.rotatedLabel = function(_) {
        if (!arguments.length) return rotatedLabel;
        rotatedLabel = _;
        return chart;
  };

  chart.showLabels = function(_) {
        if (!arguments.length) return (showLabels);
        showLabels = _;
        return chart;
  };

  chart.title = function(_) {
      if (!arguments.length) return (title);
      title = _;
      return chart;
  };

  chart.xaxis = {};
  // Expose the x-axis' tickFormat method.
  d3.rebind(chart.xaxis, xAxis, 'tickFormat');

  chart.yaxis = {};
  // Expose the y-axis' tickFormat method.
  d3.rebind(chart.yaxis, yAxis, 'tickFormat');

  chart.dispatch = dispatch;

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
  var orient = "left", // TODO top & bottom
      reverse = false,
      duration = 0,
      ranges = function(d) { return d.ranges },
      markers = function(d) { return d.markers },
      measures = function(d) { return d.measures },
      width = 380,
      height = 30,
      tickFormat = null;

  var dispatch = d3.dispatch('elementMouseover', 'elementMouseout');

  // For each small multipleâ€¦
  function bullet(g) {
    g.each(function(d, i) {
      var rangez = ranges.call(this, d, i).slice().sort(d3.descending),
          markerz = markers.call(this, d, i).slice().sort(d3.descending),
          measurez = measures.call(this, d, i).slice().sort(d3.descending),
          g = d3.select(this);

      // Compute the new x-scale.
      var x1 = d3.scale.linear()
          .domain([0, Math.max(rangez[0], markerz[0], measurez[0])])  // TODO: need to allow forceX and forceY, and xDomain, yDomain
          .range(reverse ? [width, 0] : [0, width]);

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
          return "translate(" + x(d) + ",0)";
        };
      }
      */

      var w0 = function(d) { return Math.abs(x0(d) - x0(0)) }, // TODO: could optimize by precalculating x0(0) and x1(0)
          w1 = function(d) { return Math.abs(x1(d) - x1(0)) };


      // Update the range rects.
      var range = g.selectAll("rect.range")
          .data(rangez);

      range.enter().append("rect")
          .attr("class", function(d, i) { return "range s" + i; })
          .attr("width", w0)
          .attr("height", height)
          .attr("x", reverse ? x0 : 0)
          .on('mouseover', function(d,i) { 
              dispatch.elementMouseover({
                value: d,
                label: (i <= 0) ? 'Maximum' : (i > 1) ? 'Minimum' : 'Mean', //TODO: make these labels a variable
                pos: [x1(d), height/2]
              })
          })
          .on('mouseout', function(d,i) { 
              dispatch.elementMouseout({
                value: d,
                label: (i <= 0) ? 'Minimum' : (i >=1) ? 'Maximum' : 'Mean', //TODO: make these labels a variable
              })
          })
        .transition()
          .duration(duration)
          .attr("width", w1)
          .attr("x", reverse ? x1 : 0);

      range.transition()
          .duration(duration)
          .attr("x", reverse ? x1 : 0)
          .attr("width", w1)
          .attr("height", height);


      // Update the measure rects.
      var measure = g.selectAll("rect.measure")
          .data(measurez);

      measure.enter().append("rect")
          .attr("class", function(d, i) { return "measure s" + i; })
          .attr("width", w0)
          .attr("height", height / 3)
          .attr("x", reverse ? x0 : 0)
          .attr("y", height / 3)
          .on('mouseover', function(d) { 
              dispatch.elementMouseover({
                value: d,
                label: 'Current', //TODO: make these labels a variable
                pos: [x1(d), height/2]
              })
          })
          .on('mouseout', function(d) { 
              dispatch.elementMouseout({
                value: d,
                label: 'Current' //TODO: make these labels a variable
              })
          })
        .transition()
          .duration(duration)
          .attr("width", w1)
          .attr("x", reverse ? x1 : 0)

      measure.transition()
          .duration(duration)
          .attr("width", w1)
          .attr("height", height / 3)
          .attr("x", reverse ? x1 : 0)
          .attr("y", height / 3);



      // Update the marker lines.
      var marker = g.selectAll("path.markerTriangle")
          .data(markerz);

      var h3 =  height / 6;
      marker.enter().append("path")
          .attr("class", "markerTriangle")
          .attr('transform', function(d) { return 'translate(' + x0(d) + ',' + (height / 2) + ')' })
          .attr('d', 'M0,' + h3 + 'L' + h3 + ',' + (-h3) + ' ' + (-h3) + ',' + (-h3) + 'Z')
          .on('mouseover', function(d,i) { 
              dispatch.elementMouseover({
                value: d,
                label: 'Previous',
                pos: [x1(d), height/2]
              })
          })
          .on('mouseout', function(d,i) { 
              dispatch.elementMouseout({
                value: d,
                label: 'Previous'
              })
          });

      marker.transition().duration(duration)
          .attr('transform', function(d) { return 'translate(' + x1(d) + ',' + (height / 2) + ')' });

      marker.exit().remove();


/*
      marker.enter().append("line")
          .attr("class", "marker")
          .attr("x1", x0)
          .attr("x2", x0)
          .attr("y1", height / 6)
          .attr("y2", height * 5 / 6)
        .transition()
          .duration(duration)
          .attr("x1", x1)
          .attr("x2", x1);


      marker.transition(
          .duration(duration)
          .attr("x1", x1)
          .attr("x2", x1)
          .attr("y1", height / 6)
          .attr("y2", height * 5 / 6);
         */

      // Compute the tick format.
      var format = tickFormat || x1.tickFormat(8);

      // Update the tick groups.
      var tick = g.selectAll("g.tick")
          .data(x1.ticks(8), function(d) {
            return this.textContent || format(d);
          });

      // Initialize the ticks with the old scale, x0.
      var tickEnter = tick.enter().append("g")
          .attr("class", "tick")
          .attr("transform", function(d) { return "translate(" + x0(d) + ",0)" })
          .style("opacity", 1e-6);

      tickEnter.append("line")
          .attr("y1", height)
          .attr("y2", height * 7 / 6);

      tickEnter.append("text")
          .attr("text-anchor", "middle")
          .attr("dy", "1em")
          .attr("y", height * 7 / 6)
          .text(format);

      // Transition the entering ticks to the new scale, x1.
      tickEnter.transition()
          .duration(duration)
          .attr("transform", function(d) { return "translate(" + x1(d) + ",0)" })
          .style("opacity", 1);

      // Transition the updating ticks to the new scale, x1.
      var tickUpdate = tick.transition()
          .duration(duration)
          .attr("transform", function(d) { return "translate(" + x1(d) + ",0)" })
          .style("opacity", 1);

      tickUpdate.select("line")
          .attr("y1", height)
          .attr("y2", height * 7 / 6);

      tickUpdate.select("text")
          .attr("y", height * 7 / 6);

      // Transition the exiting ticks to the new scale, x1.
      tick.exit().transition()
          .duration(duration)
          .attr("transform", function(d) { return "translate(" + x1(d) + ",0)" })
          .style("opacity", 1e-6)
          .remove();
    });
    d3.timer.flush();
  }


  bullet.dispatch = dispatch;

  // left, right, top, bottom
  bullet.orient = function(x) {
    if (!arguments.length) return orient;
    orient = x;
    reverse = orient == "right" || orient == "bottom";
    return bullet;
  };

  // ranges (bad, satisfactory, good)
  bullet.ranges = function(x) {
    if (!arguments.length) return ranges;
    ranges = x;
    return bullet;
  };

  // markers (previous, goal)
  bullet.markers = function(x) {
    if (!arguments.length) return markers;
    markers = x;
    return bullet;
  };

  // measures (actual, forecast)
  bullet.measures = function(x) {
    if (!arguments.length) return measures;
    measures = x;
    return bullet;
  };

  bullet.width = function(x) {
    if (!arguments.length) return width;
    width = x;
    return bullet;
  };

  bullet.height = function(x) {
    if (!arguments.length) return height;
    height = x;
    return bullet;
  };

  bullet.tickFormat = function(x) {
    if (!arguments.length) return tickFormat;
    tickFormat = x;
    return bullet;
  };

  bullet.duration = function(x) {
    if (!arguments.length) return duration;
    duration = x;
    return bullet;
  };

  return bullet;
};



nv.models.cumulativeLine = function() {
  var margin = {top: 30, right: 20, bottom: 30, left: 60},
      getWidth = function() { return 960 },
      getHeight = function() { return 500 },
      color = d3.scale.category20().range(),
      dotRadius = function() { return 2.5 },
      getX = function(d) { return d.x },
      getY = function(d) { return d.y },
      id = Math.floor(Math.random() * 10000), //Create semi-unique ID incase user doesn't select one
      showRescaleToggle = true,
      rescaleY = true;

  var x = d3.scale.linear(),
      dx = d3.scale.linear(),
      y = d3.scale.linear(),
      xAxis = nv.models.axis().scale(x).orient('bottom'),
      yAxis = nv.models.axis().scale(y).orient('left'),
      legend = nv.models.legend().height(30),
      controls = nv.models.legend().height(30),
      lines = nv.models.line(),
      dispatch = d3.dispatch('tooltipShow', 'tooltipHide'),
      index = {i: 0, x: 0};

  //TODO: let user select default
  var controlsData = [
    { key: 'Re-scale y-axis' }
  ];

  var indexDrag = d3.behavior.drag()
                    .on('dragstart', dragStart)
                    .on('drag', dragMove)
                    .on('dragend', dragEnd);

  function dragStart(d,i) {}

  function dragMove(d,i) {
    d.x += d3.event.dx;
    d.i = Math.round(dx.invert(d.x));

    //d3.transition(d3.select('.chart-' + id)).call(chart);
    d3.select(this).attr("transform", "translate(" + dx(d.i) + ",0)");
  }

  function dragEnd(d,i) {
    d3.transition(d3.select('.chart-' + id)).call(chart);
  }


  function chart(selection) {
    selection.each(function(data) {
      var width = getWidth(),
          height = getHeight(),
          availableWidth = width - margin.left - margin.right,
          availableHeight = height - margin.top - margin.bottom;

      var series = indexify(index.i, data);

      var seriesData = series
            .filter(function(d) { return !rescaleY || !d.disabled }) // only filter out if rescaling y axis
            .map(function(d) { return d.values });


      x   .domain(d3.extent(d3.merge(seriesData), function(d) { return d.x } ))
          .range([0, availableWidth]);

      dx  .domain([0, data[0].values.length - 1]) //Assumes all series have same length
          .range([0, availableWidth])
          .clamp(true);

      y   .domain(d3.extent(d3.merge(seriesData), function(d) { return d.y } ))
          .range([availableHeight, 0]);


      lines
        .width(availableWidth)
        .height(availableHeight)
        .color(data.map(function(d,i) {
          return d.color || color[i % 10];
        }).filter(function(d,i) { return !data[i].disabled }))


      var wrap = d3.select(this).classed('chart-' + id, true).selectAll('g.wrap').data([series]);
      var gEnter = wrap.enter().append('g').attr('class', 'wrap nvd3 cumulativeLine').append('g');

      gEnter.append('g').attr('class', 'x axis');
      gEnter.append('g').attr('class', 'y axis');
      gEnter.append('g').attr('class', 'linesWrap');
      gEnter.append('g').attr('class', 'legendWrap');
      gEnter.append('g').attr('class', 'controlsWrap');



      //TODO: margins should be adjusted based on what components are used: axes, axis labels, legend
      margin.top = legend.height();

      var g = wrap.select('g')
          .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');


      legend.width(width/2 - margin.right);

      g.select('.legendWrap')
          .datum(data)
          .attr('transform', 'translate(' + (width/2 - margin.left) + ',' + (-margin.top) +')')
          .call(legend);

      if (showRescaleToggle) {
        controls.width(140).color(['#444', '#444', '#444']);
        g.select('.controlsWrap')
            .datum(controlsData)
            .attr('transform', 'translate(0,' + (-margin.top) +')')
            .call(controls);
      }


      var linesWrap = g.select('.linesWrap')
          .datum(series.filter(function(d) { return !d.disabled }))


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
          .attr("transform", function(d) { return "translate(" + dx(d.i) + ",0)" })
          .attr('height', availableHeight)


      xAxis
        .domain(x.domain())
        .range(x.range())
        .ticks( width / 100 )
        .tickSize(-availableHeight, 0);

      g.select('.x.axis')
          .attr('transform', 'translate(0,' + y.range()[0] + ')');
      d3.transition(g.select('.x.axis'))
          .call(xAxis);

      yAxis
        .domain(y.domain())
        .range(y.range())
        .ticks( height / 36 )
        .tickSize(-availableWidth, 0);

      d3.transition(g.select('.y.axis'))
          .call(yAxis);





      // ********** EVENT LISTENERS **********

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
      legend.dispatch.on('legendMouseover', function(d, i) {
        d.hover = true;
        selection.transition().call(chart)
      });

      legend.dispatch.on('legendMouseout', function(d, i) {
        d.hover = false;
        selection.transition().call(chart)
      });
      */


      controls.dispatch.on('legendClick', function(d,i) { 
        d.disabled = !d.disabled;
        rescaleY = !d.disabled;

        //console.log(d,i,arguments);

        selection.transition().call(chart);
      });




      lines.dispatch.on('elementMouseover.tooltip', function(e) {
        dispatch.tooltipShow({
          point: e.point,
          series: e.series,
          pos: [e.pos[0] + margin.left, e.pos[1] + margin.top],
          seriesIndex: e.seriesIndex,
          pointIndex: e.pointIndex
        });
      });

      lines.dispatch.on('elementMouseout.tooltip', function(e) {
        dispatch.tooltipHide(e);
      });


    });

    return chart;
  }



  // ********** FUNCTIONS **********

  /* Normalize the data according to an index point. */
  function indexify(idx, data) {
    return data.map(function(line, i) {
      var v = getY(line.values[idx], idx);

      return {
        key: line.key,
        values: line.values.map(function(point, pointIndex) {
          return {'x': getX(point, pointIndex), 'y': (getY(point, pointIndex) - v) / (1 + v) };
        }),
        disabled: line.disabled,
        hover: line.hover
        /*
        if (v < -.9) {
          //if a series loses more than 100%, calculations fail.. anything close can cause major distortion (but is mathematically currect till it hits 100)
        }
        */
      };
    });
  };




  // ********** PUBLIC ACCESSORS **********

  chart.dispatch = dispatch;

  chart.x = function(_) {
    if (!arguments.length) return getX;
    getX = _;
    //lines.x(_);
    return chart;
  };

  chart.y = function(_) {
    if (!arguments.length) return getY;
    getY = _;
    //lines.y(_);
    return chart;
  };

  chart.margin = function(_) {
    if (!arguments.length) return margin;
    margin = _;
    return chart;
  };

  /*
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
  */

  chart.width = function(_) {
    if (!arguments.length) return getWidth;
    getWidth = d3.functor(_);
    return chart;
  };

  chart.height = function(_) {
    if (!arguments.length) return getHeight;
    getHeight = d3.functor(_);
    return chart;
  };

  chart.color = function(_) {
    if (!arguments.length) return color;
    color = _;
    legend.color(_);
    return chart;
  };

  chart.dotRadius = function(_) {
    if (!arguments.length) return dotRadius;
    dotRadius = d3.functor(_);
    lines.dotRadius = _;
    return chart;
  };

  chart.showRescaleToggle = function(_) {
    if (!arguments.length) return showRescaleToggle;
    showRescaleToggle = _;
    return chart;
  };


  // Expose the x-axis' tickFormat method.
  //chart.xAxis = {};
  //d3.rebind(chart.xAxis, xAxis, 'tickFormat');
  chart.xAxis = xAxis;

  // Expose the y-axis' tickFormat method.
  //chart.yAxis = {};
  //d3.rebind(chart.yAxis, yAxis, 'tickFormat');
  chart.yAxis = yAxis;


  return chart;
}

nv.models.cumulativeLineChart = function() {
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
      showRescaleToggle = false,
      rescaleY = true;

  var lines = nv.models.line(),
      x = lines.xScale(),
      y = lines.yScale(),
      dx = d3.scale.linear(),
      id = lines.id(),
      xAxis = nv.models.axis().scale(x).orient('bottom'),
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
    d3.select(this).attr("transform", "translate(" + dx(d.i) + ",0)");
  }

  function dragEnd(d,i) {
    //d3.transition(d3.select('.chart-' + id)).call(chart);
    chart.update();
  }



  function chart(selection) {
    selection.each(function(data) {
      var container = d3.select(this).classed('chart-' + id, true);

      var availableWidth = (width  || parseInt(container.style('width')) || 960)
                             - margin.left - margin.right,
          availableHeight = (height || parseInt(container.style('height')) || 400)
                             - margin.top - margin.bottom;


      var series = indexify(index.i, data);


      dx  .domain([0, data[0].values.length - 1]) //Assumes all series have same length
          .range([0, availableWidth])
          .clamp(true);



      var wrap = container.selectAll('g.wrap.cumulativeLine').data([series]);
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
        .width(availableWidth)
        .height(availableHeight)
        .color(series.map(function(d,i) {
          return d.color || color[i % 10];
        }).filter(function(d,i) { return !data[i].disabled }));



      g.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');


      var linesWrap = g.select('.linesWrap')
          .datum(series.filter(function(d) { return !d.disabled }))

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
          .attr("transform", function(d) { return "translate(" + dx(d.i) + ",0)" })
          .attr('height', availableHeight)



      xAxis
        .scale(x)
        .ticks( availableWidth / 100 )
        .tickSize(-availableHeight, 0);

      g.select('.x.axis')
          .attr('transform', 'translate(0,' + y.range()[0] + ')');
      d3.transition(g.select('.x.axis'))
          .call(xAxis);


      yAxis
        .scale(y)
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
      if (tooltips) dispatch.on('tooltipShow', function(e) { showTooltip(e, container[0][0]) } ); // TODO: maybe merge with above?

      lines.dispatch.on('elementMouseout.tooltip', function(e) {
        dispatch.tooltipHide(e);
      });
      if (tooltips) dispatch.on('tooltipHide', nv.tooltip.cleanup);

    });


    //TODO: decide if this is a good idea, and if it should be in all models
    chart.update = function() { chart(selection) };


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

      return {
        key: line.key,
        values: line.values.map(function(point, pointIndex) {
          return {'x': lines.x()(point, pointIndex), 'y': (lines.y()(point, pointIndex) - v) / (1 + v) };
        }),
        disabled: line.disabled,
        hover: line.hover
        /*
        if (v < -.9) {
          //if a series loses more than 100%, calculations fail.. anything close can cause major distortion (but is mathematically currect till it hits 100)
        }
        */
      };
    });
  };





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

      //store old scales if they exist
      x0 = x0 || x;
      y0 = y0 || y;



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

      if (showValues) y.range([availableHeight - (y.domain()[0] < 0 ? 12 : 0), y.domain()[1] < 0 ? 0 : 12]);
      else y.range([availableHeight, 0]);


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
          .style('fill', function(d,i){  return d.color || color[i % 10] }) //this is a 'hack' to allow multiple colors in a single series... will need to rethink this methodology
          .style('stroke', function(d,i){ return d.color || color[i % 10] })

      if (showValues) {
        barsEnter.append('text')
          .attr('text-anchor', 'middle')
        bars.selectAll('text')
          .attr('dx', x.rangeBand() / 2)
          .attr('dy', function(d,i) { return getY(d,i) < 0 ? y(getY(d,i)) - y(0) + 12 : -4 })
          .text(function(d,i) { return valueFormat(getY(d,i)) })
      } else {
        bars.selectAll('text').remove();
      }

      bars
          .attr('class', function(d,i) { return getY(d,i) < 0 ? 'bar negative' : 'bar positive'})
          //.attr('transform', function(d,i) { return 'translate(' + x(getX(d,i)) + ',0)'; })
      d3.transition(bars)
        //.delay(function(d,i) { return i * 1200 / data[0].values.length })
          .attr('transform', function(d,i) {
              return 'translate(' + x(getX(d,i)) + ', ' + (getY(d,i) < 0 ? y(0) : y(getY(d,i))) + ')' 
          })
        .selectAll('rect')
          .attr('width', x.rangeBand() / data.length)
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

  chart.valuesFormat= function(_) {
    if (!arguments.length) return valueFormat;
    valueFormat = _;
    return chart;
  };


  return chart;
}

nv.models.discreteBarChart = function() {
  var margin = {top: 30, right: 20, bottom: 50, left: 60},
      width = null,
      height = null,
      color = d3.scale.category20().range(),
      staggerLabels = false,
      tooltips = true,
      tooltip = function(key, x, y, e, graph) { 
        return '<h3>' + x + '</h3>' +
               '<p>' +  y + '</p>'
      };


  var discretebar = nv.models.discreteBar(),
      x = discretebar.xScale(),
      y = discretebar.yScale(),
      xAxis = nv.models.axis().scale(x).orient('bottom').highlightZero(false),
      yAxis = nv.models.axis().scale(y).orient('left'),
      dispatch = d3.dispatch('tooltipShow', 'tooltipHide');

  xAxis.tickFormat(function(d) { return d });
  yAxis.tickFormat(d3.format(',.1f'));


  var showTooltip = function(e, offsetElement) {
    //console.log('left: ' + offsetElement.offsetLeft);
    //console.log('top: ' + offsetElement.offsetLeft);

    //TODO: FIX offsetLeft and offSet top do not work if container is shifted anywhere
    //var offsetElement = document.getElementById(selector.substr(1)),
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
      var container = d3.select(this);

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

      /*
      var evenLabelClips = defsEnter.append('clipPath')
          .attr('id', 'x-label-clip-even-' + discretebar.id())
        .selectAll('rect')
          .data(function(d) { return d[0].values.filter(function(d,i) { return i % 2 === 0 }) });

      evenLabelClips.enter().append('rect')
            .attr('width', x.rangeBand())
            .attr('height', 32)
            .attr('y', y.range()[0])
            .attr('x', function(d,i) { return x(discretebar.x()(d,i)) });

      var oddLabelClips = defsEnter.append('clipPath')
          .attr('id', 'x-label-clip-odd-' + discretebar.id())
        .selectAll('rect')
          .data(function(d) { return d[0].values.filter(function(d,i) { return i % 2 === 1 }) });

      oddLabelClips.enter().append('rect')
            .attr('width', x.rangeBand())
            .attr('height', 16)
            .attr('y', y.range()[0] + 16 + (staggerLabels ? 12: 0))
            .attr('x', function(d,i) { return x(discretebar.x()(d,i)) });
            */



      xAxis
        .ticks( availableWidth / 100 )
        .tickSize(-availableHeight, 0);

      g.select('.x.axis')
          .attr('transform', 'translate(0,' + (y.range()[0] + (discretebar.showValues() ? 16 : 0)) + ')');
      d3.transition(g.select('.x.axis'))
          .call(xAxis);


      var xTicks = g.select('.x.axis').selectAll('g');

      if (staggerLabels)
        xTicks
            .selectAll('text')
            .attr('transform', function(d,i,j) { return 'translate(0,' + (j % 2 == 0 ? '0' : '12') + ')' })

      xTicks
          .selectAll('text')
          .attr('clip-path', function(d,i,j) { return 'url(#x-label-clip-' + discretebar.id() + ')' });


      yAxis
        .ticks( availableHeight / 36 )
        .tickSize( -availableWidth, 0);

      d3.transition(g.select('.y.axis'))
          .call(yAxis);


      discretebar.dispatch.on('elementMouseover.tooltip', function(e) {
        e.pos = [e.pos[0] +  margin.left, e.pos[1] + margin.top];
        dispatch.tooltipShow(e);
      });
      if (tooltips) dispatch.on('tooltipShow', function(e) { showTooltip(e, container[0][0]) } ); // TODO: maybe merge with above?

      discretebar.dispatch.on('elementMouseout.tooltip', function(e) {
        dispatch.tooltipHide(e);
      });
      if (tooltips) dispatch.on('tooltipHide', nv.tooltip.cleanup);


      //TODO: decide if this makes sense to add into all the models for ease of updating (updating without needing the selection)
      chart.update = function() {
        selection.transition().call(chart);
      }

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

nv.models.legend = function() {
  var margin = {top: 5, right: 0, bottom: 5, left: 10},
      width = 400,
      height = 20,
      color = d3.scale.category20().range();

  var dispatch = d3.dispatch('legendClick', 'legendMouseover', 'legendMouseout');

  function chart(selection) {
    selection.each(function(data) {

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
          });
      seriesEnter.append('circle')
          .style('fill', function(d,i) { return d.color || color[i % 20] })
          .style('stroke', function(d,i) { return d.color || color[i % 20] })
          .style('stroke-width', 2)
          .attr('r', 5);
      seriesEnter.append('text')
          .text(function(d) { return d.key })
          .attr('text-anchor', 'start')
          .attr('dy', '.32em')
          .attr('dx', '8');
      series.classed('disabled', function(d) { return d.disabled });
      series.exit().remove();


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

      //update height value if calculated larger than current
      //Asuming legend is always horizontal for now, removing if clause because this does not let legend shrink after expanding
      //TODO: allow legend to be horizontal or vertical, instead of definign height/width define one, and maybe call it maxHeight/maxWidth
      //if (height < margin.top + margin.bottom + ypos + 15)
        height = margin.top + margin.bottom + ypos + 15;

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

  chart.color = function(_) {
    if (!arguments.length) return color;
    color = _;
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
      x = scatter.xScale(),
      y = scatter.yScale(),
      x0 = x, 
      y0 = y,
      timeoutID;


  function chart(selection) {
    selection.each(function(data) {
      var availableWidth = width - margin.left - margin.right,
          availableHeight = height - margin.top - margin.bottom;


      var wrap = d3.select(this).selectAll('g.wrap.line').data([data]);
      var wrapEnter = wrap.enter().append('g').attr('class', 'wrap nvd3 line');
      var defsEnter = wrapEnter.append('defs');
      var gEnter = wrapEnter.append('g');
      var g = wrap.select('g')

      wrapEnter.append('g').attr('class', 'scatterWrap');
      var scatterWrap = wrap.select('.scatterWrap').datum(data);

      gEnter.append('g').attr('class', 'groups');


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
          .style('fill', function(d,i){ return color[i % 20] })
          .style('stroke', function(d,i){ return color[i % 20] })
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
          )
          .remove(); // redundant? line is already being removed
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
      xAxis = nv.models.axis().scale(x).orient('bottom'),
      yAxis = nv.models.axis().scale(y).orient('left'),
      legend = nv.models.legend().height(30),
      dispatch = d3.dispatch('tooltipShow', 'tooltipHide');


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


  function chart(selection) {
    selection.each(function(data) {
      var container = d3.select(this);

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
          return d.color || color[i % 10];
        }).filter(function(d,i) { return !data[i].disabled }));



      g.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');


      var linesWrap = g.select('.linesWrap')
          .datum(data.filter(function(d) { return !d.disabled }))

      d3.transition(linesWrap).call(lines);



      xAxis
        .scale(x)
        .ticks( availableWidth / 100 )
        .tickSize(-availableHeight, 0);

      g.select('.x.axis')
          .attr('transform', 'translate(0,' + y.range()[0] + ')');
      d3.transition(g.select('.x.axis'))
          .call(xAxis);


      yAxis
        .scale(y)
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
      if (tooltips) dispatch.on('tooltipShow', function(e) { showTooltip(e, container[0][0]) } ); // TODO: maybe merge with above?

      lines.dispatch.on('elementMouseout.tooltip', function(e) {
        dispatch.tooltipHide(e);
      });
      if (tooltips) dispatch.on('tooltipHide', nv.tooltip.cleanup);

    });


    //TODO: decide if this is a good idea, and if it should be in all models
    chart.update = function() { chart(selection) };


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

nv.models.linePlusBar = function() {
  var margin = {top: 30, right: 60, bottom: 50, left: 60},
      getWidth = function() { return 960 },
      getHeight = function() { return 500 },
      dotRadius = function() { return 2.5 },
      getX = function(d) { return d.x },
      getY = function(d) { return d.y },
      color = d3.scale.category20().range(),
      dispatch = d3.dispatch('tooltipShow', 'tooltipHide');

  var x = d3.scale.linear(),
      y1 = d3.scale.linear(),
      y2 = d3.scale.linear(),
      xAxis = nv.models.axis().scale(x).orient('bottom'),
      yAxis1 = nv.models.axis().scale(y1).orient('left'),
      yAxis2 = nv.models.axis().scale(y2).orient('right'),
      legend = nv.models.legend().height(30),
      lines = nv.models.line(),
      bars = nv.models.historicalBar();


  function chart(selection) {
    selection.each(function(data) {
      var width = getWidth(),
          height = getHeight(),
          availableWidth = width - margin.left - margin.right,
          availableHeight = height - margin.top - margin.bottom;

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

      y1  .domain(d3.extent(d3.merge(series1), function(d) { return d.y } ))
          .range([availableHeight, 0]);

      y2  .domain(d3.extent(d3.merge(series2), function(d) { return d.y } ))
          .range([availableHeight, 0]);

      lines
        .width(availableWidth)
        .height(availableHeight)
        .color(data.map(function(d,i) {
          return d.color || color[i % 10];
        }).filter(function(d,i) { return !data[i].disabled && !data[i].bar }))

      bars
        .width(availableWidth)
        .height(availableHeight)
        .color(data.map(function(d,i) {
          return d.color || color[i % 10];
        }).filter(function(d,i) { return !data[i].disabled && data[i].bar }))


      var wrap = d3.select(this).selectAll('g.wrap.linePlusBar').data([data]);
      var gEnter = wrap.enter().append('g').attr('class', 'wrap nvd3 linePlusBar').append('g');

      gEnter.append('g').attr('class', 'x axis');
      gEnter.append('g').attr('class', 'y1 axis');
      gEnter.append('g').attr('class', 'y2 axis');
      gEnter.append('g').attr('class', 'barsWrap');
      gEnter.append('g').attr('class', 'linesWrap');
      gEnter.append('g').attr('class', 'legendWrap');


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
        dispatch.tooltipShow({
          point: e.point,
          series: e.series,
          pos: [e.pos[0] + margin.left, e.pos[1] + margin.top],
          seriesIndex: e.seriesIndex,
          pointIndex: e.pointIndex
        });
      });

      lines.dispatch.on('elementMouseout.tooltip', function(e) {
        dispatch.tooltipHide(e);
      });



      bars.dispatch.on('elementMouseover.tooltip', function(e) {
        e.pos = [e.pos[0] +  margin.left, e.pos[1] + margin.top];
        dispatch.tooltipShow(e);
      });

      bars.dispatch.on('elementMouseout.tooltip', function(e) {
        dispatch.tooltipHide(e);
      });



      //TODO: margins should be adjusted based on what components are used: axes, axis labels, legend
      margin.top = legend.height();

      var g = wrap.select('g')
          .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');


      legend.width(width/2 - margin.right);

      g.select('.legendWrap')
          .datum(data.map(function(series) { 
            series.key = series.key + (series.bar ? ' (left axis)' : ' (right axis)');
            return series;
          }))
          .attr('transform', 'translate(' + (width/2 - margin.left) + ',' + (-margin.top) +')')
          .call(legend);


      var barsData = data.filter(function(d) { return !d.disabled && d.bar });

      var barsWrap = g.select('.barsWrap')
          .datum(barsData.length ? barsData : [{values:[]}])
          //.datum(data.filter(function(d) { return !d.disabled && d.bar }))

      var linesWrap = g.select('.linesWrap')
          .datum(data.filter(function(d) { return !d.disabled && !d.bar }))


      d3.transition(barsWrap).call(bars);
      d3.transition(linesWrap).call(lines);


      xAxis
        .domain(x.domain())
        .range(x.range())
        .ticks( width / 100 )
        .tickSize(-availableHeight, 0);

      g.select('.x.axis')
          .attr('transform', 'translate(0,' + y1.range()[0] + ')');
      d3.transition(g.select('.x.axis'))
          .call(xAxis);

      yAxis1
        .domain(y1.domain())
        .range(y1.range())
        .ticks( height / 36 )
        .tickSize(-availableWidth, 0);

      d3.transition(g.select('.y1.axis'))
          .call(yAxis1);

      yAxis2
        .domain(y2.domain())
        .range(y2.range())
        .ticks( height / 36 )
        .tickSize(series1.length ? 0 : -availableWidth, 0); // Show the y2 rules only if y1 has none

      g.select('.y2.axis')
          .attr('transform', 'translate(' + x.range()[1] + ',0)');

      d3.transition(g.select('.y2.axis'))
          .call(yAxis2);

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
    if (!arguments.length) return getWidth;
    getWidth = d3.functor(_);
    return chart;
  };

  chart.height = function(_) {
    if (!arguments.length) return getHeight;
    getHeight = d3.functor(_);
    return chart;
  };

  chart.dotRadius = function(_) {
    if (!arguments.length) return dotRadius;
    dotRadius = d3.functor(_);
    lines.dotRadius = _;
    return chart;
  };

  chart.color = function(_) {
    if (!arguments.length) return color;
    color = _;
    legend.color(_);
    return chart;
  };

  return chart;
}

nv.models.linePlusBarChart = function() {
  var margin = {top: 30, right: 60, bottom: 50, left: 60},
      width = null,
      height = null,
      dotRadius = function() { return 2.5 },
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
      xAxis = nv.models.axis().scale(x).orient('bottom'),
      yAxis1 = nv.models.axis().scale(y1).orient('left'),
      yAxis2 = nv.models.axis().scale(y2).orient('right'),
      legend = nv.models.legend().height(30),
      dispatch = d3.dispatch('tooltipShow', 'tooltipHide');

  var showTooltip = function(e, offsetElement) {
    //console.log('left: ' + offsetElement.offsetLeft);
    //console.log('top: ' + offsetElement.offsetLeft);

    //TODO: FIX offsetLeft and offSet top do not work if container is shifted anywhere
    //var offsetElement = document.getElementById(selector.substr(1)),
    var left = e.pos[0] + ( offsetElement.offsetLeft || 0 ),
        top = e.pos[1] + ( offsetElement.offsetTop || 0),
        x = xAxis.tickFormat()(lines.x()(e.point)),
        y = yAxis1.tickFormat()(lines.y()(e.point)),
        content = tooltip(e.series.key, x, y, e, chart);

    nv.tooltip.show([left, top], content, e.value < 0 ? 'n' : 's');
  };



  function chart(selection) {
    selection.each(function(data) {
      var container = d3.select(this);

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
          return d.color || color[i % 10];
        }).filter(function(d,i) { return !data[i].disabled && !data[i].bar }))

      bars
        .width(availableWidth)
        .height(availableHeight)
        .color(data.map(function(d,i) {
          return d.color || color[i % 10];
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
      if (tooltips) dispatch.on('tooltipShow', function(e) { showTooltip(e, container[0][0]) } ); // TODO: maybe merge with above?

      lines.dispatch.on('elementMouseout.tooltip', function(e) {
        dispatch.tooltipHide(e);
      });
      if (tooltips) dispatch.on('tooltipHide', nv.tooltip.cleanup);


      bars.dispatch.on('elementMouseover.tooltip', function(e) {
        e.pos = [e.pos[0] +  margin.left, e.pos[1] + margin.top];
        dispatch.tooltipShow(e);
      });
      if (tooltips) dispatch.on('tooltipShow', function(e) { showTooltip(e, container[0][0]) } ); // TODO: maybe merge with above?

      bars.dispatch.on('elementMouseout.tooltip', function(e) {
        dispatch.tooltipHide(e);
      });
      if (tooltips) dispatch.on('tooltipHide', nv.tooltip.cleanup);


      chart.update = function() { selection.transition().call(chart) };

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

nv.models.lineWithFocus = function() {
  var margin  = {top: 30, right: 20, bottom: 30, left: 60},
      margin2 = {top: 0, right: 20, bottom: 20, left: 60},
      width = 960,
      height = 500,
      height1 = 400,
      height2 = 100,
      color = d3.scale.category20().range(),
      getX = function(d) { return d.x },
      getY = function(d) { return d.y },
      id = Math.floor(Math.random() * 10000); //Create semi-unique ID incase user doesn't select one

  var x = d3.scale.linear(),
      y = d3.scale.linear(),
      x2 = d3.scale.linear(),
      y2 = d3.scale.linear(),
      xAxis = nv.models.axis().scale(x).orient('bottom'),
      yAxis = nv.models.axis().scale(y).orient('left'),
      xAxis2 = nv.models.axis().scale(x2).orient('bottom'),
      yAxis2 = nv.models.axis().scale(y2).orient('left'),
      legend = nv.models.legend().height(30),
      focus = nv.models.line().clipEdge(true),
      context = nv.models.line().interactive(false),
      dispatch = d3.dispatch('tooltipShow', 'tooltipHide'),
      brush = d3.svg.brush()
            .x(x2);


  //var wrap, gEnter, g, focus, focusLines, contextWrap, focusWrap, contextLines;  //brought all variables to this scope for use within brush function... is this a bad idea?

  //var seriesData;  //Temporarily bringing this data to this scope.... may be bad idea (same with above).. may need to rethink brushing

  function chart(selection) {
    selection.each(function(data) {
      var seriesData = data.filter(function(d) { return !d.disabled })
            .map(function(d) { return d.values }),
          availableWidth = width - margin.left - margin.right,
          availableHeight1 = height1 - margin.top - margin.bottom,
          availableHeight2 = height2 - margin2.top - margin2.bottom;

      x2  .domain(d3.extent(d3.merge(seriesData), getX ))
          .range([0, availableWidth]);
      y2  .domain(d3.extent(d3.merge(seriesData), getY ))
          .range([availableHeight2, 0]);

      x   .domain(brush.empty() ? x2.domain() : brush.extent())
          .range([0, availableWidth]);
      y   .domain(y2.domain())
          .range([availableHeight1, 0]);

      brush.on('brush', onBrush);

      focus
        .width(availableWidth)
        .height(availableHeight1)
        .color(data.map(function(d,i) {
          return d.color || color[i % 10];
        }).filter(function(d,i) { return !data[i].disabled }))

      context
        .width(availableWidth)
        .height(availableHeight2)
        .color(data.map(function(d,i) {
          return d.color || color[i % 10];
        }).filter(function(d,i) { return !data[i].disabled }))


      updateFocus();


      var wrap = d3.select(this).selectAll('g.wrap').data([data]);
      var gEnter = wrap.enter().append('g').attr('class', 'wrap nvd3 lineWithFocus').append('g');

      gEnter.append('g').attr('class', 'focus');
      gEnter.append('g').attr('class', 'context');
      gEnter.append('g').attr('class', 'legendWrap');



      var g = wrap.select('g')
          //.attr('transform', 'translate(0,0)');




      // ********** LEGEND **********

      legend.width(width/2 - margin.right);

      g.select('.legendWrap')
          .datum(data)
          .attr('transform', 'translate(' + (availableWidth / 2) + ',0)')
          .call(legend);


      //TODO: margins should be adjusted based on what components are used: axes, axis labels, legend
      margin.top = legend.height();




      // ********** FOCUS **********

      var focusWrap = g.select('.focus')
          .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      gEnter.select('.focus').append('g').attr('class', 'x axis');
      gEnter.select('.focus').append('g').attr('class', 'y axis');
      gEnter.select('.focus').append('g').attr('class', 'focusLines');


      var focusLines = focusWrap.select('.focusLines')
          .datum(data.filter(function(d) { return !d.disabled }))

      d3.transition(focusLines).call(focus);


      xAxis
        .domain(x.domain())
        .range(x.range())
        .ticks( width / 100 )
        .tickSize(-(availableHeight1), 0);

      focusWrap.select('.x.axis')
          .attr('transform', 'translate(0,' + y.range()[0] + ')');
      d3.transition(g.select('.x.axis'))
          .call(xAxis);

      yAxis
        .domain(y.domain())
        .range(y.range())
        .ticks( height / 36 )
        .tickSize(-(availableWidth), 0);

      d3.transition(g.select('.y.axis'))
          .call(yAxis);




      // ********** CONTEXT **********

      var contextWrap = g.select('.context')
          .attr('transform', 'translate(' + margin2.left + ',' + height1 + ')');

      gEnter.select('.context').append('g').attr('class', 'x2 axis');
      gEnter.select('.context').append('g').attr('class', 'y2 axis');
      gEnter.select('.context').append('g').attr('class', 'contextLines');
      gEnter.select('.context').append('g').attr('class', 'x brush')
          .attr('class', 'x brush')
          .call(brush)
        .selectAll('rect')
          .attr('y', -5)
          .attr('height', height2 + 4);

      var contextLines = contextWrap.select('.contextLines')
          .datum(data.filter(function(d) { return !d.disabled }))

      d3.transition(contextLines).call(context);


      xAxis2
        .domain(x2.domain())
        .range(x2.range())
        .ticks( width / 100 )
        .tickSize(-(availableHeight2), 0);

      contextWrap.select('.x2.axis')
          .attr('transform', 'translate(0,' + y2.range()[0] + ')');
      d3.transition(contextWrap.select('.x2.axis'))
          .call(xAxis2);


      yAxis2
        .domain(y2.domain())
        .range(y2.range())
        .ticks( availableHeight2 / 24 )
        .tickSize(-(availableWidth), 0);

      contextWrap.select('.y2.axis');

      d3.transition(contextWrap.select('.y2.axis'))
          .call(yAxis2);






      // ********** EVENT LISTENERS **********

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
      legend.dispatch.on('legendMouseover', function(d, i) {
        d.hover = true;
        selection.transition().call(chart)
      });
      legend.dispatch.on('legendMouseout', function(d, i) {
        d.hover = false;
        selection.transition().call(chart)
      });
*/

      focus.dispatch.on('elementMouseover.tooltip', function(e) {
        dispatch.tooltipShow({
          point: e.point,
          series: e.series,
          pos: [e.pos[0] + margin.left, e.pos[1] + margin.top],
          seriesIndex: e.seriesIndex,
          pointIndex: e.pointIndex
        });
      });
      focus.dispatch.on('elementMouseout.tooltip', function(e) {
        dispatch.tooltipHide(e);
      });





      function onBrush() {
        updateFocus();


        focusLines.call(focus)
        wrap.select('.x.axis').call(xAxis);
        wrap.select('.y.axis').call(yAxis);
      }

      function updateFocus() {
        var yDomain = brush.empty() ? y2.domain() : d3.extent(d3.merge(seriesData).filter(function(d) {
          return getX(d) >= brush.extent()[0] && getX(d) <= brush.extent()[1];
        }), getY);  //This doesn't account for the 1 point before and the 1 point after the domain.  Would fix, but likely need to change entire methodology here

        if (typeof yDomain[0] == 'undefined') yDomain = y2.domain(); //incase the brush doesn't cover a single point


        x.domain(brush.empty() ? x2.domain() : brush.extent());
        y.domain(yDomain);

        //TODO: Rethink this... performance is horrible, likely need to cut off focus data to within the range
        //      If I limit the data for focusLines would want to include 1 point before and after the extent,
        //      Need to figure out an optimized way to accomplish this.
        //      ***One concern is to try not to make the assumption that all lines are of the same length, and
        //         points with the same index have the same x value (while this is true in our test cases, may 
        //         not always be)
        
        focus.xDomain(x.domain());
        focus.yDomain(y.domain());
      }


    });

    return chart;
  }



  // ********** FUNCTIONS **********




  // ********** PUBLIC ACCESSORS **********

  chart.dispatch = dispatch;

  chart.x = function(_) {
    if (!arguments.length) return getX;
    getX = _;
    focus.x(_);
    context.x(_);
    return chart;
  };

  chart.y = function(_) {
    if (!arguments.length) return getY;
    getY = _;
    focus.y(_);
    context.y(_);
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
    height1 =  _ - height2;
    return chart;
  };

  chart.contextHeight = function(_) {
    if (!arguments.length) return height2;
    height2 = _;
    height1 = height - _;
    return chart;
  };

  chart.id = function(_) {
    if (!arguments.length) return id;
    id = _;
    return chart;
  };


  // Chart has multiple similar Axes, to prevent code duplication, probably need to link all axis functions manually like below
  chart.xTickFormat = function(_) {
    if (!arguments.length) return x.tickFormat();
    xAxis.tickFormat(_);
    xAxis2.tickFormat(_);
    return chart;
  };

  chart.yTickFormat = function(_) {
    if (!arguments.length) return y.tickFormat();
    yAxis.tickFormat(_);
    yAxis2.tickFormat(_);
    return chart;
  };



  //TODO: allow for both focus and context axes to be linked
  chart.xAxis = xAxis;
  chart.yAxis = yAxis;


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
        .delay(function(d,i) { return i * 1000 / data[0].values.length })
          .attr('y', function(d) { return stacked ? y0(d.y0) : y0(0) })
          .attr('height', 0)
          .remove();
      groups
          .attr('class', function(d,i) { return 'group series-' + i })
          .classed('hover', function(d) { return d.hover })
          .style('fill', function(d,i){ return color[i % 10] })
          .style('stroke', function(d,i){ return color[i % 10] });
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
            .delay(function(d,i) { return i * 1000 / data[0].values.length })
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
          .delay(function(d,i) { return i * 1200 / data[0].values.length })
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
      xAxis = nv.models.axis().scale(x).orient('bottom').highlightZero(false),
      yAxis = nv.models.axis().scale(y).orient('left'),
      legend = nv.models.legend().height(30),
      controls = nv.models.legend().height(30),
      dispatch = d3.dispatch('tooltipShow', 'tooltipHide');

  xAxis.tickFormat(function(d) { return d });
  yAxis.tickFormat(d3.format(',.1f'));

  var showTooltip = function(e, offsetElement) {
    //console.log('left: ' + offsetElement.offsetLeft);
    //console.log('top: ' + offsetElement.offsetLeft);

    //TODO: FIX offsetLeft and offSet top do not work if container is shifted anywhere
    //var offsetElement = document.getElementById(selector.substr(1)),
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
      var container = d3.select(this);

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
          return d.color || color[i % 20];
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

      xTicks.filter(function(d,i) {
            return i % Math.ceil(data[0].values.length / (availableWidth / 100)) !== 0;
          })
          .selectAll('line, text')
          .style('opacity', 0)

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
      if (tooltips) dispatch.on('tooltipShow', function(e) { showTooltip(e, container[0][0]) } ); // TODO: maybe merge with above?

      multibar.dispatch.on('elementMouseout.tooltip', function(e) {
        dispatch.tooltipHide(e);
      });
      if (tooltips) dispatch.on('tooltipHide', nv.tooltip.cleanup);


      chart.update = function() { selection.transition().call(chart) };

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
      xDomain, yDomain,
      x0, y0;

  var dispatch = d3.dispatch('chartClick', 'elementClick', 'elementDblClick', 'elementMouseover', 'elementMouseout');


  function chart(selection) {
    selection.each(function(data) {
      var availableWidth = width - margin.left - margin.right,
          availableHeight = height - margin.top - margin.bottom;

      //store old scales if they exist
      x0 = x0 || x;
      y0 = y0 || y;

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
          .style('fill', function(d,i){ return color[i % 10] })
          .style('stroke', function(d,i){ return color[i % 10] });
      d3.transition(groups)
          .style('stroke-opacity', 1)
          .style('fill-opacity', .75);


      var bars = groups.selectAll('g.bar')
          .data(function(d) { return d.values });

      bars.exit().remove();


      var barsEnter = bars.enter().append('g')
          .attr('transform', function(d,i,j) {
              //return 'translate(' + (stacked ? 0 : (j * x.rangeBand() / data.length )) + ',' + y0(stacked ? d.y0 : 0) + ')' 
              //return 'translate(' + y0(stacked ? d.y0 : 0) + ',' + (stacked ? 0 : (j * x.rangeBand() / data.length )) + ')'
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
            .attr('dy', '-.5em')
            .text(function(d,i) { return valueFormat(getY(d,i)) })
        d3.transition(bars)
            .delay(function(d,i) { return i * 1000 / data[0].values.length })
          .selectAll('text')
            .attr('dx', function(d,i) { return getY(d,i) < 0 ? -4 : y(getY(d,i)) - y(0) + 4 })
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
            .delay(function(d,i) { return i * 1000 / data[0].values.length })
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
          .delay(function(d,i) { return i * 1200 / data[0].values.length })
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
      xAxis = nv.models.axis().scale(x).orient('left').highlightZero(false),
      yAxis = nv.models.axis().scale(y).orient('bottom'),
      legend = nv.models.legend().height(30),
      controls = nv.models.legend().height(30),
      dispatch = d3.dispatch('tooltipShow', 'tooltipHide');

  xAxis.tickFormat(function(d) { return d });
  yAxis.tickFormat(d3.format(',.1f'));

  var showTooltip = function(e, offsetElement) {
    //console.log('left: ' + offsetElement.offsetLeft);
    //console.log('top: ' + offsetElement.offsetLeft);

    //TODO: FIX offsetLeft and offSet top do not work if container is shifted anywhere
    //var offsetElement = document.getElementById(selector.substr(1)),
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
      var container = d3.select(this);

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
          return d.color || color[i % 10];
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

      d3.transition(g.select('.x.axis'))
          .call(xAxis);

      var xTicks = g.select('.x.axis').selectAll('g');

      xTicks
          .selectAll('line, text')
          .style('opacity', 1)

      xTicks.filter(function(d,i) {
            return i % Math.ceil(data[0].values.length / (availableWidth / 100)) !== 0;
          })
          .selectAll('line, text')
          .style('opacity', 0)

      yAxis
        .ticks( availableWidth / 100 )
        .tickSize( -availableHeight, 0);

      g.select('.y.axis')
          .attr('transform', 'translate(0,' + availableHeight + ')');
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


      multibar.dispatch.on('elementMouseover.tooltip', function(e) {
        e.pos = [e.pos[0] +  margin.left, e.pos[1] + margin.top];
        dispatch.tooltipShow(e);
      });
      if (tooltips) dispatch.on('tooltipShow', function(e) { showTooltip(e, container[0][0]) } ); // TODO: maybe merge with above?

      multibar.dispatch.on('elementMouseout.tooltip', function(e) {
        dispatch.tooltipHide(e);
      });
      if (tooltips) dispatch.on('tooltipHide', nv.tooltip.cleanup);


      //TODO: decide if this makes sense to add into all the models for ease of updating (updating without needing the selection)
      chart.update = function() { selection.transition().call(chart) };

    });

    return chart;
  }


  chart.dispatch = dispatch;
  chart.multibar = multibar; // really just makign the accessible for multibar.dispatch, may rethink slightly
  chart.legend = legend;
  chart.xAxis = xAxis;
  chart.yAxis = yAxis;

  d3.rebind(chart, multibar, 'x', 'y', 'xDomain', 'yDomain', 'forceX', 'forceY', 'clipEdge', 'id', 'showValues', 'valueFormat');


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
  var margin = {top: 20, right: 20, bottom: 20, left: 20},
      width = 500,
      height = 500,
      animate = 2000,
      radius = Math.min(width-(margin.right+margin.left), height-(margin.top+margin.bottom)) / 2,
      label ='label',
      field ='y',
      id = Math.floor(Math.random() * 10000), //Create semi-unique ID in case user doesn't select one
      color = d3.scale.category20(),
      showLabels = true,
      donut = false,
      title = '';

      var lastWidth = 0,
      lastHeight = 0;


  var  dispatch = d3.dispatch('chartClick', 'elementClick', 'elementDblClick', 'tooltipShow', 'tooltipHide');

  function chart(selection) {
    selection.each(function(data) {

      var svg = d3.select(this)
          .on("click", function(d,i) {
              dispatch.chartClick({
                  data: d,
                  index: i,
                  pos: d3.event,
                  id: id
              });
          });



        var background = svg.selectAll('svg.margin').data([data]);
        var parent = background.enter();
        parent.append("text")
            .attr("class", "title")
            .attr("dy", ".91em")
            .attr("text-anchor", "start")
            .text(title);
        parent.append('svg')
            .attr('class','margin')
            .attr('x', margin.left)
            .attr('y', margin.top)
            .style('overflow','visible');

        var wrap = background.selectAll('g.wrap').data([data]);
        wrap.exit().remove();
        var wEnter = wrap.enter();

        wEnter
          .append('g')
            .attr('class', 'wrap')
            .attr('id','wrap-'+id)
          .append('g')
            .attr('class', 'pie');



        wrap
            .attr('width', width) //-(margin.left+margin.right))
            .attr('height', height) //-(margin.top+margin.bottom))
            .attr("transform", "translate(" + radius + "," + radius + ")");




        var arc = d3.svg.arc()
          .outerRadius((radius-(radius / 5)));

        if (donut) arc.innerRadius(radius / 2);


      // Setup the Pie chart and choose the data element
      var pie = d3.layout.pie()
         .value(function (d) { return d[field]; });

      var slices = background.select('.pie').selectAll(".slice")
            .data(pie);

          slices.exit().remove();

        var ae = slices.enter().append("svg:g")
              .attr("class", "slice")
              .on('mouseover', function(d,i){
                        d3.select(this).classed('hover', true);
                        dispatch.tooltipShow({
                            label: d.data[label],
                            value: d.data[field],
                            data: d.data,
                            index: i,
                            pos: [d3.event.pageX, d3.event.pageY],
                            id: id
                        });

              })
              .on('mouseout', function(d,i){
                        d3.select(this).classed('hover', false);
                        dispatch.tooltipHide({
                            label: d.data[label],
                            value: d.data[field],
                            data: d.data,
                            index: i,
                            id: id
                        });
              })
              .on('click', function(d,i) {
                    dispatch.elementClick({
                        label: d.data[label],
                        value: d.data[field],
                        data: d.data,
                        index: i,
                        pos: d3.event,
                        id: id
                    });
                    d3.event.stopPropagation();
              })
              .on('dblclick', function(d,i) {
                dispatch.elementDblClick({
                    label: d.data[label],
                    value: d.data[field],
                    data: d.data,
                    index: i,
                    pos: d3.event,
                    id: id
                });
                 d3.event.stopPropagation();
              });

        var paths = ae.append("svg:path")
            .attr('class','path')
            .attr("fill", function(d, i) { return color(i); });
            //.attr('d', arc);

        slices.select('.path')
            .attr('d', arc)
            .transition()
            .ease("bounce")
            .duration(animate)
            .attrTween("d", tweenPie);

        if (showLabels) {
            // This does the normal label
            ae.append("text");

            slices.select("text")
              .transition()
              .duration(animate)
              .ease('bounce')
              .attr("transform", function(d) {
                 d.outerRadius = radius + 10; // Set Outer Coordinate
                 d.innerRadius = radius + 15; // Set Inner Coordinate
                 return "translate(" + arc.centroid(d) + ")";
              })
              .attr("text-anchor", "middle") //center the text on it's origin
              .style("font", "bold 12px Arial")
              .text(function(d, i) {  return d.data[label]; });
        }


        // Computes the angle of an arc, converting from radians to degrees.
        function angle(d) {
            var a = (d.startAngle + d.endAngle) * 90 / Math.PI - 90;
            return a > 90 ? a - 180 : a;
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

  chart.margin = function(_) {
    if (!arguments.length) return margin;
    margin = _;
    return chart;
  };

  chart.width = function(_) {
    if (!arguments.length) return width;
    if (margin.left + margin.right + 20 > _) {
      width = margin.left + margin.right + 20; // Min width
    } else {
      width = _;
    }
    radius = Math.min(width-(margin.left+margin.right), height-(margin.top+margin.bottom)) / 2;
    return chart;
  };

  chart.height = function(_) {
    if (!arguments.length) return height;
    if (margin.top + margin.bottom + 20 > _) {
      height = margin.top + margin.bottom + 20; // Min height
    } else {
      height = _;
    }
    radius = Math.min(width-(margin.left+margin.right), height-(margin.top+margin.bottom)) / 2;
    return chart;
  };

  chart.animate = function(_) {
    if (!arguments.length) return animate;
    animate = _;
    return chart;
  };

  chart.labelField = function(_) {
    if (!arguments.length) return (label);
      label = _;
      return chart;
  };

  chart.dataField = function(_) {
    if (!arguments.length) return (field);
    field = _;
    return chart;
  };

  chart.showLabels = function(_) {
      if (!arguments.length) return (showLabels);
      showLabels = _;
      return chart;
  };

  chart.donut = function(_) {
        if (!arguments.length) return (donut);
        donut = _;
        return chart;
  };

  chart.title = function(_) {
        if (!arguments.length) return (title);
        title = _;
        return chart;
  };

  chart.id = function(_) {
        if (!arguments.length) return id;
        id = _;
        return chart;
  };

  chart.dispatch = dispatch;



    return chart;
}

nv.models.scatter = function() {
  //Default Settings
  var margin = {top: 0, right: 0, bottom: 0, left: 0},
      width = 960,
      height = 500,
      color = d3.scale.category20().range(), // array of colors to be used in order
      shape = 'circle',
      id = Math.floor(Math.random() * 100000), //Create semi-unique ID incase user doesn't selet one
      x = d3.scale.linear(),
      y = d3.scale.linear(),
      z = d3.scale.linear(), //linear because d3.svg.shape.size is treated as area
      //z = d3.scale.sqrt(), //sqrt because point size is done by area, not radius
      getX = function(d) { return d.x }, // accessor to get the x value from a data point
      getY = function(d) { return d.y }, // accessor to get the y value from a data point
      getSize = function(d) { return d.size }, // accessor to get the point radius from a data point //TODO: consider renamig size to z
      forceX = [], // List of numbers to Force into the X scale (ie. 0, or a max / min, etc.)
      forceY = [], // List of numbers to Force into the Y scale 
      forceSize = [], // List of numbers to Force into the Size scale 
      interactive = true, // If true, plots a voronoi overlay for advanced point interection
      clipEdge = false, // if true, masks lines within x and y scale
      clipVoronoi = true, // if true, masks each point with a circle... can turn off to slightly increase performance
      clipRadius = function() { return 25 }, // function to get the radius for point clips
      xDomain, yDomain, sizeDomain; // Used to manually set the x and y domain, good to save time if calculation has already been made

  var dispatch = d3.dispatch('elementClick', 'elementMouseover', 'elementMouseout'),//TODO: consider renaming to elementMouseove and elementMouseout for consistency
      x0, y0, z0,
      timeoutID;

  function chart(selection) {
    selection.each(function(data) {
      //var seriesData = data.map(function(d) {
      var availableWidth = width - margin.left - margin.right,
          availableHeight = height - margin.top - margin.bottom;

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
      //TODO: think of a good way to re-use scales
      x   .domain(xDomain || d3.extent(d3.merge(seriesData).map(function(d) { return d.x }).concat(forceX)))
          .range([0, availableWidth]);

      y   .domain(yDomain || d3.extent(d3.merge(seriesData).map(function(d) { return d.y }).concat(forceY)))
          .range([availableHeight, 0]);

      z   .domain(sizeDomain || d3.extent(d3.merge(seriesData).map(function(d) { return d.size }).concat(forceSize)))
          .range([16, 256]);
          //.range([2, 10]);



      var wrap = d3.select(this).selectAll('g.wrap.scatter').data([data]);
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
          wrap.select('#points-clip-' + id).remove();
          wrap.select('.point-paths').remove();
          return false;
        }

        gEnter.append('g').attr('class', 'point-paths');

        var vertices = d3.merge(data.map(function(group, groupIndex) {
            return group.values.map(function(point, pointIndex) {
              // Adding noise to make duplicates very unlikely
              // Inject series and point index for reference
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
        // considering adding a removeZeros option, may be useful for the stacked chart and maybe others
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
                series:series,
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
                series:series,
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
            //wrap.select('.series-' + d.seriesIndex + ' .point-' + d.pointIndex)
            d3.select('.chart-' + id + ' .series-' + d.seriesIndex + ' .point-' + d.pointIndex)
                .classed('hover', true);
        });

        dispatch.on('elementMouseout.point', function(d) {
            //wrap.select('.series-' + d.seriesIndex + ' .point-' + d.pointIndex)
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
          .style('fill', function(d,i) { return color[i % 20] })
          .style('stroke', function(d,i) { return color[i % 20] })
          .style('stroke-opacity', 1)
          .style('fill-opacity', .5);


          /*
      var points = groups.selectAll('circle.point')
          .data(function(d) { return d.values });
      points.enter().append('circle')
          .attr('cx', function(d,i) { return x0(getX(d,i)) })
          .attr('cy', function(d,i) { return y0(getY(d,i)) })
          .attr('r', function(d,i) { return z0(getSize(d,i)) });
      //d3.transition(points.exit())
      d3.transition(groups.exit().selectAll('circle.point'))
          .attr('cx', function(d,i) { return x(getX(d,i)) })
          .attr('cy', function(d,i) { return y(getY(d,i)) })
          .attr('r', function(d,i) { return z(getSize(d,i)) })
          .remove();
      points.attr('class', function(d,i) { return 'point point-' + i });
      d3.transition(points)
          .attr('cx', function(d,i) { return x(getX(d,i)) })
          .attr('cy', function(d,i) { return y(getY(d,i)) })
          .attr('r', function(d,i) { return z(getSize(d,i)) });
         */

      var points = groups.selectAll('path.point')
          .data(function(d) { return d.values });
      points.enter().append('path')
          .attr('transform', function(d,i) {
            return 'translate(' + x0(getX(d,i)) + ',' + y0(getY(d,i)) + ')'
          })
          .attr('d', 
                d3.svg.symbol()
                  .type(function(d,i) { return d.shape || shape })
                  .size(function(d,i) { return z(getSize(d,i)) })
               );
          //.attr('r', function(d,i) { return z0(getSize(d,i)) });
      //d3.transition(points.exit())
      d3.transition(groups.exit().selectAll('path.point'))
          .attr('transform', function(d,i) {
            return 'translate(' + x(getX(d,i)) + ',' + y(getY(d,i)) + ')'
          })
          //.attr('r', function(d,i) { return z(getSize(d,i)) })
          .remove();
      points.attr('class', function(d,i) { return 'point point-' + i });
      d3.transition(points)
          .attr('transform', function(d,i) {
            return 'translate(' + x(getX(d,i)) + ',' + y(getY(d,i)) + ')'
          })
          .attr('d', 
                d3.svg.symbol()
                  .type(function(d,i) { return d.shape || shape })
                  .size(function(d,i) { return z(getSize(d,i)) })
               );
          //.attr('r', function(d,i) { return z(getSize(d,i)) });



      clearTimeout(timeoutID);
      timeoutID = setTimeout(updateInteractiveLayer, 750);

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
    if (!arguments.length) return shape;
    shape = _;
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
      tooltips = true,
      tooltipX = function(key, x, y) { return '<strong>' + x + '</strong>' },
      tooltipY = function(key, x, y) { return '<strong>' + y + '</strong>' },
      tooltip = function(key, x, y, e, graph) { 
        return '<h3>' + key + '</h3>' +
               '<p>' +  y + ' at ' + x + '</p>'
      };


  var scatter = nv.models.scatter(),
      x = scatter.xScale(),
      y = scatter.yScale(),
      xAxis = nv.models.axis().orient('bottom').scale(x).tickPadding(10),
      yAxis = nv.models.axis().orient('left').scale(y).tickPadding(10),
      legend = nv.models.legend().height(30),
      dispatch = d3.dispatch('tooltipShow', 'tooltipHide'),
      x0, y0; //TODO: abstract distribution component and have old scales stored there

  var showTooltip = function(e, offsetElement) {
    //console.log('left: ' + offsetElement.offsetLeft);
    //console.log('top: ' + offsetElement.offsetLeft);

    //TODO: FIX offsetLeft and offSet top do not work if container is shifted anywhere
    //var offsetElement = document.getElementById(selector.substr(1)),
    //var left = e.pos[0] + ( offsetElement.offsetLeft || 0 ),
        //top = e.pos[1] + ( offsetElement.offsetTop || 0),
    var leftX = e.pos[0] + ( offsetElement.offsetLeft || 0 ),
        topX = y.range()[0] + margin.top + ( offsetElement.offsetTop || 0),
        leftY = x.range()[0] + margin.left + ( offsetElement.offsetLeft || 0 ),
        topY = e.pos[1] + ( offsetElement.offsetTop || 0),
        xVal = xAxis.tickFormat()(scatter.x()(e.point)),
        yVal = yAxis.tickFormat()(scatter.y()(e.point)),
        contentX = tooltipX(e.series.key, xVal, yVal, e, chart),
        contentY = tooltipY(e.series.key, xVal, yVal, e, chart),
        content = tooltip(e.series.key, xVal, yVal, e, chart);

    nv.tooltip.show([leftX, topX], contentX, 'n', 1);
    nv.tooltip.show([leftY, topY], contentY, 'e', 1);
    //nv.tooltip.show([left, top], content, e.value < 0 ? 'n' : 's');
  };


  function chart(selection) {
    selection.each(function(data) {

      //TODO: decide if this makes sense to add into all the models for ease of updating (updating without needing the selection)
      chart.update = function() { selection.transition().call(chart) };

      var container = d3.select(this);

      var availableWidth = (width  || parseInt(container.style('width')) || 960)
                             - margin.left - margin.right,
          availableHeight = (height || parseInt(container.style('height')) || 400)
                             - margin.top - margin.bottom;



      x0 = x0 || scatter.xScale();
      y0 = y0 || scatter.yScale();



      var wrap = container.selectAll('g.wrap.scatterChart').data([data]);
      var gEnter = wrap.enter().append('g').attr('class', 'wrap nvd3 scatterChart chart-' + scatter.id()).append('g');

      gEnter.append('g').attr('class', 'legendWrap');
      gEnter.append('g').attr('class', 'x axis');
      gEnter.append('g').attr('class', 'y axis');
      gEnter.append('g').attr('class', 'scatterWrap');
      //gEnter.append('g').attr('class', 'distWrap');

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


      scatter
        .width(availableWidth)
        .height(availableHeight)
        .color(data.map(function(d,i) {
          return d.color || color[i % 20];
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




      //TODO abstract Distribution into its own component
      if ( showDistX || showDistY) {
        var distWrap = scatterWrap.selectAll('g.distribution')
            .data(function(d) { return d }, function(d) { return d.key });

        distWrap.enter().append('g').attr('class', function(d,i) { return 'distribution series-' + i })

        distWrap.style('stroke', function(d,i) { return color.filter(function(d,i) { return data[i] && !data[i].disabled })[i % 10] })
      }

      if (showDistX) {
        var distX = distWrap.selectAll('line.distX')
              .data(function(d) { return d.values })
        distX.enter().append('line')
            .attr('x1', function(d,i) { return x0(scatter.x()(d,i)) })
            .attr('x2', function(d,i) { return x0(scatter.x()(d,i)) })
        //d3.transition(distX.exit())
        d3.transition(distWrap.exit().selectAll('line.distX'))
            .attr('x1', function(d,i) { return x(scatter.x()(d,i)) })
            .attr('x2', function(d,i) { return x(scatter.x()(d,i)) })
            .remove();
        distX
            .attr('class', function(d,i) { return 'distX distX-' + i })
            .attr('y1', y.range()[0])
            .attr('y2', y.range()[0] + 8);
        d3.transition(distX)
            .attr('x1', function(d,i) { return x(scatter.x()(d,i)) })
            .attr('x2', function(d,i) { return x(scatter.x()(d,i)) })
      }


      if (showDistY) {
        var distY = distWrap.selectAll('line.distY')
            .data(function(d) { return d.values })
        distY.enter().append('line')
            .attr('y1', function(d,i) { return y0(scatter.y()(d,i)) })
            .attr('y2', function(d,i) { return y0(scatter.y()(d,i)) });
        //d3.transition(distY.exit())
        d3.transition(distWrap.exit().selectAll('line.distY'))
            .attr('y1', function(d,i) { return y(scatter.y()(d,i)) })
            .attr('y2', function(d,i) { return y(scatter.y()(d,i)) })
            .remove();
        distY
            .attr('class', function(d,i) { return 'distY distY-' + i })
            .attr('x1', x.range()[0])
            .attr('x2', x.range()[0] - 8)
        d3.transition(distY)
            .attr('y1', function(d,i) { return y(scatter.y()(d,i)) }) .attr('y2', function(d,i) { return y(scatter.y()(d,i)) });
      }




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
        //scatterWrap.select('.series-' + e.seriesIndex + ' .distX-' + e.pointIndex)
        d3.select('.chart-' + scatter.id() + ' .series-' + e.seriesIndex + ' .distX-' + e.pointIndex)
            .attr('y1', e.pos[1]);
        //scatterWrap.select('.series-' + e.seriesIndex + ' .distY-' + e.pointIndex)
        d3.select('.chart-' + scatter.id() + ' .series-' + e.seriesIndex + ' .distY-' + e.pointIndex)
            .attr('x1', e.pos[0]);

        e.pos = [e.pos[0] + margin.left, e.pos[1] + margin.top];
        dispatch.tooltipShow(e);
      });
      if (tooltips) dispatch.on('tooltipShow', function(e) { showTooltip(e, container[0][0]) } ); // TODO: maybe merge with above?

      scatter.dispatch.on('elementMouseout.tooltip', function(e) {
        dispatch.tooltipHide(e);

        //scatterWrap.select('.series-' + e.seriesIndex + ' .distX-' + e.pointIndex)
        d3.select('.chart-' + scatter.id() + ' .series-' + e.seriesIndex + ' .distX-' + e.pointIndex)
            .attr('y1', y.range()[0]);
        //scatterWrap.select('.series-' + e.seriesIndex + ' .distY-' + e.pointIndex)
        d3.select('.chart-' + scatter.id() + ' .series-' + e.seriesIndex + ' .distY-' + e.pointIndex)
            .attr('x1', x.range()[0]);
      });
      if (tooltips) dispatch.on('tooltipHide', nv.tooltip.cleanup);


      //store old scales for use in transitions on update, to animate from old to new positions, and sizes
      x0 = x.copy();
      y0 = y.copy();

    });

    return chart;
  }


  chart.dispatch = dispatch;
  chart.legend = legend;
  chart.xAxis = xAxis;
  chart.yAxis = yAxis;

  d3.rebind(chart, scatter, 'interactive', 'shape', 'size', 'xScale', 'yScale', 'zScale', 'xDomain', 'yDomain', 'sizeDomain', 'forceX', 'forceY', 'forceSize', 'clipVoronoi', 'clipRadius');


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
          //.style('fill', function(d, i){ return d.color || color[i * 2 % 20] })
          .style('stroke', function(d,i) { return d.color || color[i * 2 % 20] });

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
          //.style('fill', function(d, i){ return d.color || color[i % 10] })
          .style('stroke', function(d, i){ return d.color || color[i % 10] });

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

  var scatter= nv.models.scatter()
        .size(2.2) // default size
        .sizeDomain([2.5]), //set to speed up calculation, needs to be unset if there is a cstom size accessor
      x = scatter.xScale(),
      y = scatter.yScale(),
      dispatch =  d3.dispatch('tooltipShow', 'tooltipHide', 'areaClick', 'areaMouseover', 'areaMouseout');

  function chart(selection) {
    selection.each(function(data) {
        // Need to leave data alone to switch between stacked, stream, and expanded
        var dataCopy = JSON.parse(JSON.stringify(data)),
            availableWidth = width - margin.left - margin.right,
            availableHeight = height - margin.top - margin.bottom;


        //console.log(dataCopy);
        dataCopy = dataCopy.map(function(series,i) {
          if (series.disabled)
            series.values = series.values.map(function(d,i) {
              d._y = d.y || d._y; 
              d.y = 0;  //TODO: need to use value from getY, not always d.y
              return d 
            });
          return series;
        });


        //TODO: deal with negative stacked charts

        //compute the data based on offset and order (calc's y0 for every point)
        dataCopy = d3.layout.stack()
                     .offset(offset)
                     .order(order)
                     .values(function(d){ return d.values })
                     .y(getY)
                     (dataCopy);



        var wrap = d3.select(this).selectAll('g.wrap.stackedarea').data([dataCopy]);
        var wrapEnter = wrap.enter().append('g').attr('class', 'wrap nvd3 stackedarea');
        var defsEnter = wrapEnter.append('defs');
        var gEnter = wrapEnter.append('g');
        var g = wrap.select('g');

        gEnter.append('g').attr('class', 'areaWrap');


        scatter
          .width(availableWidth)
          .height(availableHeight)
          //.x(getX)
          .y(function(d) { return d.y + d.y0 }) // TODO: allow for getY to be other than d.y
          .forceY([0])
          .color(dataCopy.map(function(d,i) {
            return d.color || color[i % 20];
          }).filter(function(d,i) { return !dataCopy[i].disabled }));

        gEnter.append('g').attr('class', 'scatterWrap');
        var scatterWrap= g.select('.scatterWrap')
            .datum(dataCopy.filter(function(d) { return !d.disabled }))

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
            .x(function(d,i) { return x(scatter.x()(d,i)) })
            .y0(function(d) { return y(d.y0) })
            .y1(function(d) { return y(d.y + d.y0) });

        var zeroArea = d3.svg.area()
            .x(function(d,i) { return x(scatter.x()(d,i)) })
            .y0(function(d) { return y(d.y0) })
            .y1(function(d) { return y(d.y0) });


        var path = g.select('.areaWrap').selectAll('path.area')
            .data(function(d) { return d });
            //.data(function(d) { return d }, function(d) { return d.key });
        path.enter().append('path').attr('class', function(d,i) { return 'area area-' + i })
            .on('mouseover', function(d,i) {
              d3.select(this).classed('hover', true);
              dispatch.areaMouseover({
                point: d,
                series: d.key,
                //pos: [x(getX(point, d.point)) + margin.left, y(getY(point, d.point)) + margin.top],
                pos: [d3.event.pageX, d3.event.pageY],
                seriesIndex: i
                //pointIndex: d.point
              });
            })
            .on('mouseout', function(d,i) {
              d3.select(this).classed('hover', false);
              dispatch.areaMouseout({
                point: d,
                series: d.key,
                //pos: [x(getX(point, d.point)) + margin.left, y(getY(point, d.point)) + margin.top],
                pos: [d3.event.pageX, d3.event.pageY],
                seriesIndex: i
                //pointIndex: d.point
              });
            })
            .on('click', function(d,i) {
              d3.select(this).classed('hover', false);
              dispatch.areaClick({
                point: d,
                series: d.key,
                //pos: [x(getX(point, d.point)) + margin.left, y(getY(point, d.point)) + margin.top],
                pos: [d3.event.pageX, d3.event.pageY],
                seriesIndex: i
                //pointIndex: d.point
              });
            })
        d3.transition(path.exit())
            .attr('d', function(d,i) { return zeroArea(d.values,i) }) // TODO: fix this so transition is still fluid
            .remove();
        path
            .style('fill', function(d,i){ return d.color || color[i % 20] })
            .style('stroke', function(d,i){ return d.color || color[i % 20] });
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

  d3.rebind(chart, scatter, 'x', 'interactive', 'size', 'xScale', 'yScale', 'zScale', 'xDomain', 'yDomain', 'sizeDomain', 'forceX', 'forceY', 'forceSize', 'clipVoronoi', 'clipRadius');

  /*
  chart.x = function(_) {
    if (!arguments.length) return getX;
    getX = d3.functor(_);
    scatter.x(_);
    return chart;
  };
  */

  chart.y = function(_) {
    if (!arguments.length) return getY;
    getY = d3.functor(_);
    //scatter.y(_);
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
    return chart;
  };

  chart.order = function(_) {
    if (!arguments.length) return order;
    order = _;
    return chart;
  };

  //shortcut for offset + order
  chart.style = function(_) {
    if (!arguments.length) return style;
    style = _;

    switch (style) {
      case 'stack':
        offset = 'zero';
        order = 'default';
        break;
      case 'stream':
        offset = 'wiggle';
        order = 'inside-out';
        break;
      case 'expand':
        offset = 'expand';
        order = 'default';
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


  var stacked = nv.models.stackedArea(),
      x = stacked.xScale(),
      y = stacked.yScale(),
      xAxis = nv.models.axis().scale(x).orient('bottom'),
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
    //console.log('left: ' + offsetElement.offsetLeft);
    //console.log('top: ' + offsetElement.offsetLeft);

    //TODO: FIX offsetLeft and offSet top do not work if container is shifted anywhere
    //var offsetElement = document.getElementById(selector.substr(1)),
    var left = e.pos[0] + ( offsetElement.offsetLeft || 0 ),
        top = e.pos[1] + ( offsetElement.offsetTop || 0),
        x = xAxis.tickFormat()(stacked.x()(e.point)),
        y = yAxis.tickFormat()(stacked.y()(e.point)),
        content = tooltip(e.series.key, x, y, e, chart);

    nv.tooltip.show([left, top], content, e.value < 0 ? 'n' : 's');
  };


  function chart(selection) {
    selection.each(function(data) {

      //TODO: decide if this makes sense to add into all the models for ease of updating (updating without needing the selection)
      chart.update = function() { selection.transition().call(chart) };

      var container = d3.select(this);

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
        .tickFormat(stacked.offset() == 'zero' ? d3.format(',.2f') : d3.format('%')); //TODO: stacked format should be set by caller

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
      if (tooltips) dispatch.on('tooltipShow', function(e) { showTooltip(e, container[0][0]) } ); // TODO: maybe merge with above?

      stacked.dispatch.on('tooltipHide', function(e) {
        dispatch.tooltipHide(e);
      });
      if (tooltips) dispatch.on('tooltipHide', nv.tooltip.cleanup);


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