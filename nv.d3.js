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


nv.models.axis = function() {
  var domain = [0,1], //just to have something to start with, maybe I dont need this
      range = [0,1],
      orient = 'bottom',
      axisLabelText = false;

  var scale = d3.scale.linear(),
      axis = d3.svg.axis().scale(scale);

  function chart(selection) {
    selection.each(function(data) {

      scale.domain(domain)
           .range(range);

      axis.orient(orient);

      //TODO: consider calculating height based on whether or not label is added, for reference in charts using this component

      var axisLabel = d3.select(this).selectAll('text.axislabel')
          .data([axisLabelText || null]);
      switch (orient) {
        case 'top':
          axisLabel.enter().append('text').attr('class', 'axislabel')
              .attr('text-anchor', 'middle')
              .attr('y', 0);
          axisLabel
              .attr('x', range[1] / 2);
              break;
        case 'right':
          axisLabel.enter().append('text').attr('class', 'axislabel')
               .attr('transform', 'rotate(90)')
              .attr('y', -40); //TODO: consider calculating this based on largest tick width... OR at least expose this on chart
          axisLabel
              .attr('x', -range[0] / 2);
              break;
        case 'bottom':
          axisLabel.enter().append('text').attr('class', 'axislabel')
              .attr('text-anchor', 'middle')
              .attr('y', 25);
          axisLabel
              .attr('x', range[1] / 2);
              break;
        case 'left':
          axisLabel.enter().append('text').attr('class', 'axislabel')
               .attr('transform', 'rotate(-90)')
              .attr('y', -40); //TODO: consider calculating this based on largest tick width... OR at least expose this on chart
          axisLabel
              .attr('x', -range[0] / 2);
              break;
      }
      axisLabel.exit().remove();
      axisLabel
          .text(function(d) { return d });


      //d3.select(this)
      d3.transition(d3.select(this))
          .call(axis);

      d3.select(this)
        .selectAll('line.tick')
        //.filter(function(d) { return !parseFloat(d) })
        .filter(function(d) { return !parseFloat(Math.round(d*100000)/1000000) }) //this is because sometimes the 0 tick is a very small fraction, TODO: think of cleaner technique
          .classed('zero', true);

    });

    return chart;
  }


  chart.orient = function(_) {
    if (!arguments.length) return orient;
    orient = _;
    return chart;
  };

  chart.domain = function(_) {
    if (!arguments.length) return domain;
    domain = _;
    return chart;
  };

  chart.range = function(_) {
    if (!arguments.length) return range;
    range = _;
    return chart;
  };

  chart.scale = function(_) {
    if (!arguments.length) return scale;
    scale = _;
    axis.scale(scale);
    return chart;
  };

  chart.axisLabel = function(_) {
    if (!arguments.length) return axisLabelText;
    axisLabelText = _;
    return chart;
  }


  d3.rebind(chart, axis, 'ticks', 'tickSubdivide', 'tickSize', 'tickPadding', 'tickFormat');

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
      gEnter = gEnter.append('g').attr('class', 'wrap').attr('id','wrap-'+id).append('g');



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
      color = d3.scale.category10().range(),
      dotRadius = function() { return 2.5 },
      getX = function(d) { return d.x },
      getY = function(d) { return d.y },
      id = Math.floor(Math.random() * 10000); //Create semi-unique ID incase user doesn't select one

  var x = d3.scale.linear(),
      dx = d3.scale.linear(),
      y = d3.scale.linear(),
      xAxis = nv.models.axis().scale(x).orient('bottom'),
      yAxis = nv.models.axis().scale(y).orient('left'),
      legend = nv.models.legend().height(30),
      lines = nv.models.line(),
      dispatch = d3.dispatch('tooltipShow', 'tooltipHide'),
      index = {i: 0, x: 0};


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
            .filter(function(d) { return !d.disabled })
            .map(function(d) { return d.values });

      x   .domain(d3.extent(d3.merge(seriesData), function(d) { return d.x } ))
          .range([0, width - margin.left - margin.right]);

      dx  .domain([0, data[0].values.length - 1]) //Assumes all series have same length
          .range([0, width - margin.left - margin.right])
          .clamp(true);

      y   .domain(d3.extent(d3.merge(seriesData), function(d) { return d.y } ))
          .range([height - margin.top - margin.bottom, 0]);


      lines
        .width(width - margin.left - margin.right)
        .height(height - margin.top - margin.bottom)
        .color(data.map(function(d,i) {
          return d.color || color[i % 10];
        }).filter(function(d,i) { return !data[i].disabled }))


      var wrap = d3.select(this).classed('chart-' + id, true).selectAll('g.wrap').data([series]);
      var gEnter = wrap.enter().append('g').attr('class', 'wrap d3cumulativeLine').append('g');

      gEnter.append('g').attr('class', 'x axis');
      gEnter.append('g').attr('class', 'y axis');
      gEnter.append('g').attr('class', 'linesWrap');
      gEnter.append('g').attr('class', 'legendWrap');



      //TODO: margins should be adjusted based on what components are used: axes, axis labels, legend
      margin.top = legend.height();

      var g = wrap.select('g')
          .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');


      legend.width(width/2 - margin.right);

      g.select('.legendWrap')
          .datum(data)
          .attr('transform', 'translate(' + (width/2 - margin.left) + ',' + (-margin.top) +')')
          .call(legend);


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
          .attr('height', height - margin.top - margin.bottom)


      xAxis
        .domain(x.domain())
        .range(x.range())
        .ticks( width / 100 )
        .tickSize(-(height - margin.top - margin.bottom), 0);

      g.select('.x.axis')
          .attr('transform', 'translate(0,' + y.range()[0] + ')');
      d3.transition(g.select('.x.axis'))
          .call(xAxis);

      yAxis
        .domain(y.domain())
        .range(y.range())
        .ticks( height / 36 )
        .tickSize(-(width - margin.right - margin.left), 0);

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

      lines.dispatch.on('pointMouseover.tooltip', function(e) {
        dispatch.tooltipShow({
          point: e.point,
          series: e.series,
          pos: [e.pos[0] + margin.left, e.pos[1] + margin.top],
          seriesIndex: e.seriesIndex,
          pointIndex: e.pointIndex
        });
      });

      lines.dispatch.on('pointMouseout.tooltip', function(e) {
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

  chart.dotRadius = function(_) {
    if (!arguments.length) return dotRadius;
    dotRadius = d3.functor(_);
    lines.dotRadius = _;
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

nv.models.legend = function() {
  var margin = {top: 5, right: 0, bottom: 5, left: 10},
      width = 400,
      height = 20,
      color = d3.scale.category10().range();

  var dispatch = d3.dispatch('legendClick', 'legendMouseover', 'legendMouseout');

  function chart(selection) {
    selection.each(function(data) {

      var wrap = d3.select(this).selectAll('g.legend').data([data]);
      var gEnter = wrap.enter().append('g').attr('class', 'legend').append('g');


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
      color = d3.scale.category10().range(),
      id = Math.floor(Math.random() * 10000), //Create semi-unique ID incase user doesn't select one
      getX = function(d) { return d.x }, // accessor to get the x value from a data point
      getY = function(d) { return d.y }, // accessor to get the y value from a data point
      getSize = function() { return 2.5 }, // accessor to get the point radius from a data point
      forceX = [], // List of numbers to Force into the X scale (ie. 0, or a max / min, etc.)
      forceY = [], // List of numbers to Force into the Y scale 
      interactive = true, // If true, plots a voronoi overlay for advanced point interection
      clipEdge = false, // if true, masks lines within x and y scale
      clipVoronoi = true, // if true, masks each point with a circle... can turn off to slightly increase performance
      xDomain, yDomain; // Used to manually set the x and y domain, good to save time if calculation has already been made

  var x = d3.scale.linear(),
      y = d3.scale.linear(),
      scatter = nv.models.scatter(),
      x0, y0,
      timeoutID;


  function chart(selection) {
    selection.each(function(data) {
      var seriesData = (xDomain && yDomain) ? [] : // if we know xDomain and yDomain, no need to calculate
            data.map(function(d) { 
              return d.values.map(function(d,i) {
                return { x: getX(d,i), y: getY(d,i) }
              })
            }),
          availableWidth = width - margin.left - margin.right,
          availableHeight = height - margin.top - margin.bottom;

      //store old scales if they exist
      x0 = x0 || x;
      y0 = y0 || y;


      x   .domain(xDomain || d3.extent(d3.merge(seriesData).map(function(d) { return d.x }).concat(forceX)))
          .range([0, availableWidth]);

      y   .domain(yDomain || d3.extent(d3.merge(seriesData).map(function(d) { return d.y }).concat(forceY)))
          .range([availableHeight, 0]);

      var wrap = d3.select(this).selectAll('g.d3line').data([data]);
      var wrapEnter = wrap.enter().append('g').attr('class', 'd3line');
      var defsEnter = wrapEnter.append('defs');
      var gEnter = wrapEnter.append('g');

      gEnter.append('g').attr('class', 'groups');

      wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');


      if (clipEdge) {
        defsEnter.append('clipPath')
            .attr('id', 'edge-clip-' + id)
          .append('rect');

        wrap.select('#edge-clip-' + id + ' rect')
            .attr('width', availableWidth)
            .attr('height', availableHeight);

        gEnter
            .attr('clip-path', 'url(#edge-clip-' + id + ')');
      }




      var groups = wrap.select('.groups').selectAll('.line')
          .data(function(d) { return d }, function(d) { return d.key });
      groups.enter().append('g')
          .style('stroke-opacity', 1e-6)
          .style('fill-opacity', 1e-6);
      d3.transition(groups.exit())
          .style('stroke-opacity', 1e-6)
          .style('fill-opacity', 1e-6)
          .remove();
      groups
          .attr('class', function(d,i) { return 'line series-' + i })
          .classed('hover', function(d) { return d.hover })
          .style('fill', function(d,i){ return color[i % 10] })
          .style('stroke', function(d,i){ return color[i % 10] })
      d3.transition(groups)
          .style('stroke-opacity', 1)
          .style('fill-opacity', .5)


      var paths = groups.selectAll('path')
          .data(function(d, i) { return [d.values] });
      paths.enter().append('path')
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


      scatter
        .size(getSize)
        .id(id)
        .interactive(interactive)
        .width(availableWidth)
        .height(availableHeight)
        .xDomain(x.domain())
        .yDomain(y.domain());


      wrapEnter.append('g').attr('class', 'scatterWrap');
      var scatterWrap = wrap.select('.scatterWrap').datum(data);

      d3.transition(scatterWrap).call(scatter);


      //store old scales for use in transitions on update, to animate from old to new positions
      x0 = x.copy();
      y0 = y.copy();

    });

    return chart;
  }


  chart.dispatch = scatter.dispatch;

  d3.rebind(chart, scatter, 'size');

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

nv.models.linePlusBar = function() {
  var margin = {top: 30, right: 60, bottom: 50, left: 60},
      getWidth = function() { return 960 },
      getHeight = function() { return 500 },
      dotRadius = function() { return 2.5 },
      getX = function(d) { return d.x },
      getY = function(d) { return d.y },
      color = d3.scale.category10().range(),
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
        //.x(getX)
        //.y(getY)
        .color(data.map(function(d,i) {
          return d.color || color[i % 10];
        }).filter(function(d,i) { return !data[i].disabled && !data[i].bar }))

      bars
        .width(availableWidth)
        .height(availableHeight)
        .color(data.map(function(d,i) {
          return d.color || color[i % 10];
        }).filter(function(d,i) { return !data[i].disabled && data[i].bar }))


      var wrap = d3.select(this).selectAll('g.wrap').data([data]);
      var gEnter = wrap.enter().append('g').attr('class', 'wrap d3linePlusBar').append('g');

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


      lines.dispatch.on('pointMouseover.tooltip', function(e) {
        dispatch.tooltipShow({
          point: e.point,
          series: e.series,
          pos: [e.pos[0] + margin.left, e.pos[1] + margin.top],
          seriesIndex: e.seriesIndex,
          pointIndex: e.pointIndex
        });
      });

      lines.dispatch.on('pointMouseout.tooltip', function(e) {
        dispatch.tooltipHide(e);
      });



      bars.dispatch.on('elementMouseover.tooltip', function(e) {
        dispatch.tooltipShow({
          point: e.point,
          series: e.series,
          pos: [e.pos[0] + margin.left, e.pos[1] + margin.top],
          seriesIndex: e.seriesIndex,
          pointIndex: e.pointIndex
        });
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


  return chart;
}

nv.models.lineWithFocus = function() {
  var margin  = {top: 30, right: 20, bottom: 30, left: 60},
      margin2 = {top: 0, right: 20, bottom: 20, left: 60},
      width = 960,
      height = 500,
      height1 = 400,
      height2 = 100,
      dotRadius = function() { return 2.5 },
      color = d3.scale.category10().range(),
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
      context = nv.models.line().dotRadius(.1).interactive(false),
      dispatch = d3.dispatch('tooltipShow', 'tooltipHide'),
      brush = d3.svg.brush()
            .x(x2);


  //var wrap, gEnter, g, focus, focusLines, contextWrap, focusWrap, contextLines;  //brought all variables to this scope for use within brush function... is this a bad idea?

  //var seriesData;  //Temporarily bringing this data to this scope.... may be bad idea (same with above).. may need to rethink brushing

  function chart(selection) {
    selection.each(function(data) {
      seriesData = data.filter(function(d) { return !d.disabled })
            .map(function(d) { return d.values });

      x2  .domain(d3.extent(d3.merge(seriesData), getX ))
          .range([0, width - margin.left - margin.right]);
      y2  .domain(d3.extent(d3.merge(seriesData), getY ))
          .range([height2 - margin2.top - margin2.bottom, 0]);

      x   .domain(brush.empty() ? x2.domain() : brush.extent())
          .range([0, width - margin.left - margin.right]);
      y   .domain(y2.domain())
          .range([height1 - margin.top - margin.bottom, 0]);

      brush.on('brush', onBrush);

      focus
        .width(width - margin.left - margin.right)
        .height(height1 - margin.top - margin.bottom)
        .color(data.map(function(d,i) {
          return d.color || color[i % 10];
        }).filter(function(d,i) { return !data[i].disabled }))

      context
        .width(width - margin.left - margin.right)
        .height(height2 - margin2.top - margin2.bottom)
        .color(data.map(function(d,i) {
          return d.color || color[i % 10];
        }).filter(function(d,i) { return !data[i].disabled }))


      updateFocus();


      var wrap = d3.select(this).selectAll('g.wrap').data([data]);
      var gEnter = wrap.enter().append('g').attr('class', 'wrap d3lineWithFocus').append('g');

      gEnter.append('g').attr('class', 'focus');
      gEnter.append('g').attr('class', 'context');
      gEnter.append('g').attr('class', 'legendWrap');



      var g = wrap.select('g')
          //.attr('transform', 'translate(0,0)');




      // ********** LEGEND **********

      legend.width(width/2 - margin.right);

      g.select('.legendWrap')
          .datum(data)
          .attr('transform', 'translate(' + (width/2 - margin.left) + ',0)')
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
        .tickSize(-(height1 - margin.top - margin.bottom), 0);

      focusWrap.select('.x.axis')
          .attr('transform', 'translate(0,' + y.range()[0] + ')');
      d3.transition(g.select('.x.axis'))
          .call(xAxis);

      yAxis
        .domain(y.domain())
        .range(y.range())
        .ticks( height / 36 )
        .tickSize(-(width - margin.right - margin.left), 0);

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
        .tickSize(-(height2 - margin2.top - margin2.bottom), 0);

      contextWrap.select('.x2.axis')
          .attr('transform', 'translate(0,' + y2.range()[0] + ')');
      d3.transition(contextWrap.select('.x2.axis'))
          .call(xAxis2);


      yAxis2
        .domain(y2.domain())
        .range(y2.range())
        .ticks( (height2 - margin2.top  - margin2.bottom) / 24 )
        .tickSize(-(width - margin2.right - margin2.left), 0);

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

      focus.dispatch.on('pointMouseover.tooltip', function(e) {
        dispatch.tooltipShow({
          point: e.point,
          series: e.series,
          pos: [e.pos[0] + margin.left, e.pos[1] + margin.top],
          seriesIndex: e.seriesIndex,
          pointIndex: e.pointIndex
        });
      });
      focus.dispatch.on('pointMouseout.tooltip', function(e) {
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
        //         no always be)
        
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

  chart.dotRadius = function(_) {
    if (!arguments.length) return dotRadius;
    dotRadius = d3.functor(_);
    focus.dotRadius = _;
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

nv.models.lineWithLegend = function() {
  var margin = {top: 30, right: 20, bottom: 50, left: 60},
      width = function() { return 960 },
      height = function() { return 500 },
      color = d3.scale.category10().range();

  var x = d3.scale.linear(),
      y = d3.scale.linear(),
      xAxis = nv.models.axis().scale(x).orient('bottom'),
      yAxis = nv.models.axis().scale(y).orient('left'),
      legend = nv.models.legend().height(30),
      lines = nv.models.line(),
      dispatch = d3.dispatch('tooltipShow', 'tooltipHide');


  function chart(selection) {
    selection.each(function(data) {
      var seriesData = data.filter(function(d) { return !d.disabled })
            .map(function(d) { 
              return d.values.map(function(d,i) {
                return { x: lines.x()(d,i), y: lines.y()(d,i) }
              })
            }),
          availableWidth = width() - margin.left - margin.right,
          availableHeight = height() - margin.top - margin.bottom;


      x   .domain(d3.extent(d3.merge(seriesData).map(function(d) { return d.x }).concat(lines.forceX) ))
          .range([0, availableWidth]);

      y   .domain(d3.extent(d3.merge(seriesData).map(function(d) { return d.y }).concat(lines.forceY) ))
          .range([availableHeight, 0]);

      lines
        .width(availableWidth)
        .height(availableHeight)
        .xDomain(x.domain())
        .yDomain(y.domain())
        .color(data.map(function(d,i) {
          return d.color || color[i % 10];
        }).filter(function(d,i) { return !data[i].disabled }))



      var wrap = d3.select(this).selectAll('g.wrap').data([data]);
      var gEnter = wrap.enter().append('g').attr('class', 'wrap d3lineWithLegend').append('g');

      gEnter.append('g').attr('class', 'x axis');
      gEnter.append('g').attr('class', 'y axis');
      gEnter.append('g').attr('class', 'linesWrap');
      gEnter.append('g').attr('class', 'legendWrap');



      //TODO: margins should be adjusted based on what components are used: axes, axis labels, legend
      margin.top = legend.height();

      var g = wrap.select('g')
          .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');


      legend.width(availableWidth / 2);

      g.select('.legendWrap')
          .datum(data)
          .attr('transform', 'translate(' + (availableWidth / 2) + ',' + (-margin.top) +')')
          .call(legend);


      var linesWrap = g.select('.linesWrap')
          .datum(data.filter(function(d) { return !d.disabled }))


      d3.transition(linesWrap).call(lines);


      xAxis
        .domain(x.domain())
        .range(x.range())
        .ticks( availableWidth / 100 )
        .tickSize(-availableHeight, 0);

      g.select('.x.axis')
          .attr('transform', 'translate(0,' + y.range()[0] + ')');
      d3.transition(g.select('.x.axis'))
          .call(xAxis);


      yAxis
        .domain(y.domain())
        .range(y.range())
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

      lines.dispatch.on('pointMouseover.tooltip', function(e) {
        dispatch.tooltipShow({
          point: e.point,
          series: e.series,
          pos: [e.pos[0] + margin.left, e.pos[1] + margin.top],
          seriesIndex: e.seriesIndex,
          pointIndex: e.pointIndex
        });
      });

      lines.dispatch.on('pointMouseout.tooltip', function(e) {
        dispatch.tooltipHide(e);
      });

    });

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
    width = d3.functor(_);
    return chart;
  };

  chart.height = function(_) {
    if (!arguments.length) return height;
    height = d3.functor(_);
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
  var margin = {top: 0, right: 0, bottom: 0, left: 0},
      width = 960,
      height = 500,
      color = d3.scale.category10().range(),
      id = Math.floor(Math.random() * 100000), //Create semi-unique ID incase user doesn't selet one
      getX = function(d) { return d.x }, // accessor to get the x value from a data point
      getY = function(d) { return d.y }, // accessor to get the y value from a data point
      getSize = function(d) { return d.size }, // accessor to get the point radius from a data point
      forceX = [], // List of numbers to Force into the X scale (ie. 0, or a max / min, etc.)
      forceY = [], // List of numbers to Force into the Y scale 
      forceSize = [], // List of numbers to Force into the Size scale 
      interactive = true, // If true, plots a voronoi overlay for advanced point interection
      clipEdge = false, // if true, masks lines within x and y scale
      clipVoronoi = true, // if true, masks each point with a circle... can turn off to slightly increase performance
      clipRadius = function() { return 25 }, // function to get the radius for point clips
      xDomain, yDomain, sizeDomain; // Used to manually set the x and y domain, good to save time if calculation has already been made

  var x = d3.scale.linear(),
      y = d3.scale.linear(),
      z = d3.scale.sqrt(), //sqrt because point size is done by area, not radius
      dispatch = d3.dispatch('pointClick', 'pointMouseover', 'pointMouseout'),//TODO: consider renaming to elementMouseove and elementMouseout for consistency
      x0, y0, z0,
      timeoutID;


  function chart(selection) {
    selection.each(function(data) {
      var seriesData = data.map(function(d) { 
            return d.values.map(function(d,i) {
              return { x: getX(d,i), y: getY(d,i), size: getSize(d,i) }
            })
          }),
          availableWidth = width - margin.left - margin.right,
          availableHeight = height - margin.top - margin.bottom;

      //store old scales if they exist
      x0 = x0 || x;
      y0 = y0 || y;
      z0 = z0 || z;

      //add series index to each data point for reference
      data = data.map(function(series, i) {
        series.values = series.values.map(function(point) {
          //point.label = series.label;
          //point.color = series.color;
          point.series = i;
          return point;
        });
        return series;
      });


      //TODO: figure out the best way to deal with scales with equal MIN and MAX
      x   .domain(xDomain || d3.extent(d3.merge(seriesData).map(function(d) { return d.x }).concat(forceX)))
          .range([0, availableWidth]);

      y   .domain(yDomain || d3.extent(d3.merge(seriesData).map(function(d) { return d.y }).concat(forceY)))
          .range([availableHeight, 0]);

      z   .domain(sizeDomain || d3.extent(d3.merge(seriesData).map(function(d) { return d.size }).concat(forceSize)))
          .range([2, 10]);



      var wrap = d3.select(this).selectAll('g.d3scatter').data([data]);
      var wrapEnter = wrap.enter().append('g').attr('class', 'd3scatter');
      var defsEnter = wrapEnter.append('defs');
      var gEnter = wrapEnter.append('g');

      gEnter.append('g').attr('class', 'groups');

      wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');


      if (clipEdge) {
        defsEnter.append('clipPath')
            .attr('id', 'edge-clip-' + id)
          .append('rect');

        wrap.select('#edge-clip-' + id + ' rect')
            .attr('width', availableWidth)
            .attr('height', availableHeight);

        gEnter
            .attr('clip-path', 'url(#edge-clip-' + id + ')');
      }



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
              // TODO: see how much time this consumes
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

              dispatch.pointClick({
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

              dispatch.pointMouseover({
                point: point,
                series:series,
                pos: [x(getX(point, d.point)) + margin.left, y(getY(point, d.point)) + margin.top],
                seriesIndex: d.series,
                pointIndex: d.point
              });
            })
            .on('mouseout', function(d, i) {
              dispatch.pointMouseout({
                point: data[d.series].values[d.point],
                series: data[d.series],
                seriesIndex: d.series,
                pointIndex: d.point
              });
            });

        dispatch.on('pointMouseover.point', function(d) {
            wrap.select('.series-' + d.seriesIndex + ' .point-' + d.pointIndex)
                .classed('hover', true);
        });

        dispatch.on('pointMouseout.point', function(d) {
            wrap.select('.series-' + d.seriesIndex + ' circle.point-' + d.pointIndex)
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
          .classed('hover', function(d) { return d.hover && !d.disabled });
      d3.transition(groups)
          .style('fill', function(d,i) { return color[i % 10] })
          .style('stroke', function(d,i) { return color[i % 10] })
          .style('stroke-opacity', 1)
          .style('fill-opacity', .5);


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

  chart.id = function(_) {
    if (!arguments.length) return id;
    id = _;
    return chart;
  };


  return chart;
}

nv.models.scatterWithLegend = function() {
  var margin = {top: 30, right: 20, bottom: 50, left: 60},
      width = function() { return 960 },
      height = function() { return 500 },
      xAxisRender = true,
      yAxisRender = true,
      xAxisLabelText = false,
      yAxisLabelText = false,
      showDistX = false,
      showDistY = false,
      color = d3.scale.category10().range(),
      forceX = [],
      forceY = [];

  var x = d3.scale.linear(),
      y = d3.scale.linear(),
      xAxis = nv.models.axis().scale(x).orient('bottom').tickPadding(10),
      yAxis = nv.models.axis().scale(y).orient('left').tickPadding(10),
      legend = nv.models.legend().height(30),
      scatter = nv.models.scatter(),
      dispatch = d3.dispatch('tooltipShow', 'tooltipHide');


  function chart(selection) {
    selection.each(function(data) {
      var seriesData = data.filter(function(d) { return !d.disabled })
            .map(function(d) { 
              return d.values.map(function(d,i) {
                return { x: scatter.x()(d,i), y: scatter.y()(d,i) }
              })
            }),
          availableWidth = width() - margin.left - margin.right,
          availableHeight = height() - margin.top - margin.bottom;

      x   .domain(d3.extent(d3.merge(seriesData).map(function(d) { return d.x }).concat(scatter.forceX) ))
          .range([0, availableWidth]);

      y   .domain(d3.extent(d3.merge(seriesData).map(function(d) { return d.y }).concat(scatter.forceY) ))
          .range([availableHeight, 0]);

      scatter
        .width(availableWidth)
        .height(availableHeight)
        .xDomain(x.domain())
        .yDomain(y.domain())
        .color(data.map(function(d,i) {
          return d.color || color[i % 20];
        }).filter(function(d,i) { return !data[i].disabled }))



      var wrap = d3.select(this).selectAll('g.wrap').data([data]);
      var gEnter = wrap.enter().append('g').attr('class', 'wrap d3scatterWithLegend').append('g');

      gEnter.append('g').attr('class', 'legendWrap');
      gEnter.append('g').attr('class', 'x axis');
      gEnter.append('g').attr('class', 'y axis');
      gEnter.append('g').attr('class', 'scatterWrap');
      //gEnter.append('g').attr('class', 'distWrap');



      //TODO: margins should be adjusted based on what components are used: axes, axis labels, legend
      margin.top = legend.height();

      var g = wrap.select('g')
          .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');


      legend.width(availableWidth / 2);

      wrap.select('.legendWrap')
          .datum(data)
          .attr('transform', 'translate(' + (availableWidth / 2) + ',' + (-margin.top) +')')
          .call(legend);


      var scatterWrap = wrap.select('.scatterWrap')
          .datum(data.filter(function(d) { return !d.disabled }));


      d3.transition(scatterWrap).call(scatter);


      //TODO: FIX the dist line rotate on enable/disable series
      if ( showDistX || showDistY) {
        var distWrap = scatterWrap.selectAll('g.distribution')
              .data(function(d) { return d })

        distWrap.enter().append('g').attr('class', function(d,i) { return 'distribution series-' + i })

        distWrap.style('stroke', function(d,i) { return color.filter(function(d,i) { return data[i] && !data[i].disabled })[i % 10] })
      }

      if (showDistX) {
        var distX = distWrap.selectAll('line.distX')
              .data(function(d) { return d.values })
        distX.enter().append('line')
            //.attr('x1', function(d,i) { return x0(scatter.x()(d,i)) })
            //.attr('x2', function(d,i) { return x0(scatter.x()(d,i)) })
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
            //.attr('y1', function(d,i) { return y0(scatter.y()(d,i)) })
            //.attr('y2', function(d,i) { return y0(scatter.y()(d,i)) });
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
            .attr('y1', function(d,i) { return y(scatter.y()(d,i)) })
            .attr('y2', function(d,i) { return y(scatter.y()(d,i)) });
      }


      xAxis
        .domain(x.domain())
        .range(x.range())
        .ticks( availableWidth / 100 )
        .tickSize(-availableHeight, 0);

      g.select('.x.axis')
          .attr('transform', 'translate(0,' + y.range()[0] + ')');

      d3.transition(g.select('.x.axis'))
          .call(xAxis);


      yAxis
        .domain(y.domain())
        .range(y.range())
        .ticks( availableHeight / 36 )
        .tickSize( -availableWidth, 0);

      d3.transition(g.select('.y.axis'))
          .call(yAxis);




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


      scatter.dispatch.on('pointMouseover.tooltip', function(e) {
        dispatch.tooltipShow({
          point: e.point,
          series: e.series,
          pos: [e.pos[0] + margin.left, e.pos[1] + margin.top],
          seriesIndex: e.seriesIndex,
          pointIndex: e.pointIndex
        });
      });

      scatter.dispatch.on('pointMouseout.tooltip', function(e) {
        dispatch.tooltipHide(e);
      });

      scatter.dispatch.on('pointMouseover.dist', function(d) {
          scatterWrap.select('.series-' + d.seriesIndex + ' .distX-' + d.pointIndex)
              .attr('y1', d.pos[1]);
          scatterWrap.select('.series-' + d.seriesIndex + ' .distY-' + d.pointIndex)
              .attr('x1', d.pos[0]);
      });

      scatter.dispatch.on('pointMouseout.dist', function(d) {
          scatterWrap.select('.series-' + d.seriesIndex + ' .distX-' + d.pointIndex)
              .attr('y1', y.range()[0]);
          scatterWrap.select('.series-' + d.seriesIndex + ' .distY-' + d.pointIndex)
              .attr('x1', x.range()[0]);
      });

    });

    return chart;
  }


  chart.dispatch = dispatch;
  chart.legend = legend;
  chart.xAxis = xAxis;
  chart.yAxis = yAxis;

  d3.rebind(chart, scatter, 'x', 'y', 'size', 'xDomain', 'yDomain', 'forceX', 'forceY', 'interactive', 'clipEdge', 'clipVoronoi', 'id', 'showDistX', 'showDistY');


  chart.margin = function(_) {
    if (!arguments.length) return margin;
    margin = _;
    return chart;
  };

  chart.width = function(_) {
    if (!arguments.length) return width;
    width = d3.functor(_);
    return chart;
  };

  chart.height = function(_) {
    if (!arguments.length) return height;
    height = d3.functor(_);
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

      var gEnter = wrap.enter().append('g').attr('class', 'sparkline');
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
      color = d3.scale.category10().range(),
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
      var sparklineWrap = gEnter.append('g').attr('class', 'sparklineplus')
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
      color = d3.scale.category10().range(),
      getX = function(d) { return d.x },
      getY = function(d) { return d.y },
      style = 'stack',
      offset = 'zero',
      order = 'default',
      interactive = true, // If true, plots a voronoi overlay for advanced point interection
      clipEdge = false, // if true, masks lines within x and y scale
      xDomain, yDomain;

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

  var scatter= nv.models.scatter().size(2),
      x = d3.scale.linear(),
      y = d3.scale.linear(),
      dispatch =  d3.dispatch('tooltipShow', 'tooltipHide', 'areaClick', 'areaMouseover', 'areaMouseout');

  function chart(selection) {
    selection.each(function(data) {
        // Need to leave data alone to switch between stacked, stream, and expanded
        var dataCopy = JSON.parse(JSON.stringify(data)),
            seriesData = dataCopy.map(function(d) { 
              return d.values.map(function(d,i) {
                return { x: getX(d,i), y: getY(d,i) }
              })
            }),
            availableWidth = width - margin.left - margin.right,
            availableHeight = height - margin.top - margin.bottom;


        //compute the data based on offset and order (calc's y0 for every point)
        dataCopy = d3.layout.stack()
                     .offset(offset)
                     .order(order)
                     .values(function(d){ return d.values })
                     .y(getY)
                     (dataCopy);


        x   .domain(xDomain || d3.extent(d3.merge(seriesData), function(d) { return d.x } ))
            .range([0, availableWidth]);

        //TODO: deal with negative stacked charts
        y   .domain(yDomain || [0, d3.max(dataCopy, function(d) {   //TODO; if dataCopy not fed {x, y} (custom getX or getY), this will probably cause an error
              return d3.max(d.values, function(d) { return d.y0 + d.y })
            }) ])
            .range([availableHeight, 0]);



        var wrap = d3.select(this).selectAll('g.d3stackedarea').data([dataCopy]);
        var wrapEnter = wrap.enter().append('g').attr('class', 'd3stackedarea');
        var defsEnter = wrapEnter.append('defs');
        var gEnter = wrapEnter.append('g');
        var g = wrap.select('g');

        gEnter.append('g').attr('class', 'areaWrap');


        wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');


        if (clipEdge) {
          defsEnter.append('clipPath')
              .attr('id', 'edge-clip-' + id)
            .append('rect');

          wrap.select('#edge-clip-' + id + ' rect')
              .attr('width', availableWidth)
              .attr('height', availableHeight);

          gEnter
              .attr('clip-path', 'url(#edge-clip-' + id + ')');
        }



        //TODO: need to also remove area Hover/Click to turn off interactive
        if (interactive) {
          scatter
            .width(availableWidth)
            .height(availableHeight)
            .xDomain(x.domain())
            .yDomain(y.domain())
            .x(getX)
            .y(function(d) { return d.y + d.y0 }) // TODO: allow for getY to be other than d.y
            .color(data.map(function(d,i) {
              return d.color || color[i % 10];
            }).filter(function(d,i) { return !data[i].disabled }));

          gEnter.append('g').attr('class', 'scatterWrap');
          var scatterWrap= g.select('.scatterWrap')
              .datum(dataCopy.filter(function(d) { return !d.disabled }))

          d3.transition(scatterWrap).call(scatter);
        }


        var area = d3.svg.area()
            .x(function(d,i) { return x(getX(d,i)) })
            .y0(function(d) { return y(d.y0) })
            .y1(function(d) { return y(d.y + d.y0) });

        var zeroArea = d3.svg.area()
            .x(function(d,i) { return x(getX(d,i)) })
            .y0(function(d) { return y(d.y0) })
            .y1(function(d) { return y(d.y0) });


        var path = g.select('.areaWrap').selectAll('path.area')
            .data(function(d) { return d });
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
            .attr('d', function(d,i) { return zeroArea(d.values,i) })
            .remove();
        path
            .style('fill', function(d,i){ return color[i % 10] })
            .style('stroke', function(d,i){ return color[i % 10] });
        d3.transition(path)
            .attr('d', function(d,i) { return area(d.values,i) })


        //TODO: these disptach handlers don't need to be called everytime the chart
        //      is called, but 'g' is only in this scope... so need to rethink.
        scatter.dispatch.on('pointClick.area', function(e) {
          dispatch.areaClick(e);
        })
        scatter.dispatch.on('pointMouseover.area', function(e) {
          g.select('.area-' + e.seriesIndex).classed('hover', true);
        });
        scatter.dispatch.on('pointMouseout.area', function(e) {
          g.select('.area-' + e.seriesIndex).classed('hover', false);
        });

    });


    return chart;
  }

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

  chart.dispatch = dispatch;
  chart.scatter = scatter;


  scatter.dispatch.on('pointMouseover.tooltip', function(e) {
        e.pos = [e.pos[0] + margin.left, e.pos[1] + margin.top],
        dispatch.tooltipShow(e);
  });

  scatter.dispatch.on('pointMouseout.tooltip', function(e) {
        dispatch.tooltipHide(e);
  });


  return chart;
}

nv.models.stackedAreaWithLegend = function() {
  var margin = {top: 30, right: 20, bottom: 50, left: 60},
      getWidth = function() { return 960 },
      getHeight = function() { return 500 },
      dotRadius = function() { return 2.5 },
      color = d3.scale.category10().range();

  var x = d3.scale.linear(),
      y = d3.scale.linear(),
      getX = function(d) { return d.x },
      getY = function(d) { return d.y },
      xAxis = nv.models.axis().scale(x).orient('bottom'),
      yAxis = nv.models.axis().scale(y).orient('left'),
      legend = nv.models.legend().height(30),
      controls = nv.models.legend().height(30),
      stacked = nv.models.stackedArea(),
      dispatch = d3.dispatch('tooltipShow', 'tooltipHide');

  //TODO: let user select default
  var controlsData = [
    { key: 'Stacked' },
    { key: 'Stream', disabled: true },
    { key: 'Expanded', disabled: true }
  ];


  function chart(selection) {
    selection.each(function(data) {
      var width = getWidth(),
          height = getHeight(),
          availableWidth = width - margin.left - margin.right,
          availableHeight = height - margin.top - margin.bottom;

      var series = data.filter(function(d) { return !d.disabled })
            //.map(function(d) { return d.values });
            .reduce(function(prev, curr, index) {  //sum up all the y's
                curr.values.forEach(function(d,i) {
                  if (!index) prev[i] = {x: getX(d,i), y:0};
                  prev[i].y += getY(d,i);
                });
                return prev;
              }, []);


      x   .domain(d3.extent(d3.merge(series), function(d) { return d.x } ))
          .range([0, availableWidth]);

      y   .domain(stacked.offset() == 'zero' ?
            [0, d3.max(series, function(d) { return d.y } )] :
            [0, 1]  // 0 - 100%
          )
          .range([availableHeight, 0]);

      stacked
        .width(availableWidth)
        .height(availableHeight)


      var wrap = d3.select(this).selectAll('g.wrap').data([data]);
      var gEnter = wrap.enter().append('g').attr('class', 'wrap d3stackedWithLegend').append('g');

      gEnter.append('g').attr('class', 'x axis');
      gEnter.append('g').attr('class', 'y axis');
      gEnter.append('g').attr('class', 'stackedWrap');
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

      controls.width(280).color(['#444', '#444', '#444']);
      g.select('.controlsWrap')
          .datum(controlsData)
          .attr('transform', 'translate(0,' + (-margin.top) +')')
          .call(controls);


      var stackedWrap = g.select('.stackedWrap')
          .datum(data);
      d3.transition(stackedWrap).call(stacked);


      xAxis
        .domain(x.domain())
        .range(x.range())
        .ticks( width / 100 )
        .tickSize(-availableHeight, 0);

      g.select('.x.axis')
          .attr('transform', 'translate(0,' + availableHeight + ')');
      d3.transition(g.select('.x.axis'))
          .call(xAxis);

      yAxis
        .domain(y.domain())
        .range(y.range())
        .ticks(stacked.offset() == 'wiggle' ? 0 : height / 36)
        .tickSize(-availableWidth, 0)
        .tickFormat(stacked.offset() == 'zero' ? d3.format(',.2f') : d3.format('%')); //TODO: stacked format should be set by caller

      d3.transition(g.select('.y.axis'))
          .call(yAxis);



      //TODO: FIX Logic error, screws up when series are disabled by clicking legend, then series are desiabled by clicking the area
      stacked.dispatch.on('areaClick.toggle', function(e) {
        if (data.filter(function(d) { return !d.disabled }).length === 1)
          data = data.map(function(d) { 
            d.disabled = false; 
            if (d.disabled)
              d.values.map(function(p) { p._y = p.y; p.y = 0; return p }); //TODO: need to use value from getY, not always d.y
            else
              d.values.map(function(p) { p.y = p._y || p.y; return p }); // ....
            return d 
          });
        else
          data = data.map(function(d,i) { 
            d.disabled = (i != e.seriesIndex); 
            if (d.disabled)
              d.values.map(function(p) { p._y = p.y; p.y = 0; return p }); //TODO: need to use value from getY, not always d.y
            else
              d.values.map(function(p) { p.y = p._y || p.y; return p }); // ....
            return d 
          });

        selection.transition().call(chart);
      });
      legend.dispatch.on('legendClick', function(d,i) { 
        d.disabled = !d.disabled;

        if (d.disabled)
          d.values.map(function(p) { p._y = p.y; p.y = 0; return p }); //TODO: need to use value from getY, not always d.y
        else
          d.values.map(function(p) { p.y = p._y; return p }); // ....

        if (!data.filter(function(d) { return !d.disabled }).length) {
          data.map(function(d) {
            d.disabled = false;
            d.values.map(function(p) { p.y = p._y; return p }); // ....
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

      stacked.dispatch.on('tooltipShow', function(e) {
        //disable tooltips when value ~= 0
        //// TODO: consider removing points from voronoi that have 0 value instead of this hack
        if (!Math.round(getY(e.point) * 100)) {  // 100 will not be good for very small numbers... will have to think about making this valu dynamic, based on data range
          setTimeout(function() { d3.selectAll('.point.hover').classed('hover', false) }, 0);
          return false;
        }

        dispatch.tooltipShow({
          point: e.point,
          series: e.series,
          pos: [e.pos[0] + margin.left,  e.pos[1] + margin.top],
          seriesIndex: e.seriesIndex,
          pointIndex: e.pointIndex
        });
      });

      stacked.dispatch.on('tooltipHide', function(e) {
        dispatch.tooltipHide(e);
      });
    });

    return chart;
  }

  chart.dispatch = dispatch;

  d3.rebind(chart, stacked, 'interactive');

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
    stacked.dotRadius = _;
    return chart;
  };

  chart.stacked = stacked;
  chart.xAxis = xAxis;
  chart.yAxis = yAxis;

  return chart;
}

// This technique works AS IS for month end data points
//   In fact, this works for any series where each value is evenly spaced,
//   and every series starts at the same value and is 1 to 1
//     In other words, values at the same index, need to have the same x value
//     for all series
nv.charts.cumulativeLineChartDaily = function() {
  var selector = null,
      data = [],
      duration = 500,
      tooltip = function(key, x, y, e, graph) { 
        return '<h3>' + key + '</h3>' +
               '<p>' +  y + ' at ' + x + '</p>'
      };


  var graph = nv.models.cumulativeLine()
                .x(function(d,i) { return i }),
      showTooltip = function(e) {
        var offsetElement = document.getElementById(selector.substr(1)),
            left = e.pos[0] + offsetElement.offsetLeft,
            top = e.pos[1] + offsetElement.offsetTop,
            formatX = graph.xAxis.tickFormat(),
            formatY = graph.yAxis.tickFormat(),
            x = formatX(graph.x()(e, e.pointIndex)),
            //x = formatX(graph.x()(e.point)),
            y = formatY(graph.y()(e.point)),
            content = tooltip(e.series.key, x, y, e, graph);

        nv.tooltip.show([left, top], content);
      };

  //setting component defaults
  //graph.xAxis.tickFormat(d3.format(',r'));
  graph.xAxis.tickFormat(function(d) {
    //return d3.time.format('%x')(new Date(d))
    return d3.time.format('%x')(new Date(data[0].values[d].x))
  });

  //graph.yAxis.tickFormat(d3.format(',.2f'));
  graph.yAxis.tickFormat(d3.format(',.2%'));


  //TODO: consider a method more similar to how the models are built
  function chart() {
    if (!selector || !data.length) return chart; //do nothing if you have nothing to work with

    d3.select(selector).select('svg')
        .datum(data)
      .transition().duration(duration).call(graph); //consider using transition chaining like in the models

    return chart;
  }


  // This should always only be called once, then update should be used after, 
  //     in which case should consider the 'd3 way' and merge this with update, 
  //     but simply do this on enter... should try anoter example that way
  chart.build = function() {
    if (!selector || !data.length) return chart; //do nothing if you have nothing to work with

    nv.addGraph({
      generate: function() {
        var container = d3.select(selector),
            width = function() { return parseInt(container.style('width')) },
            height = function() { return parseInt(container.style('height')) },
            svg = container.append('svg');

        graph
            .width(width)
            .height(height);

        svg
            .attr('width', width())
            .attr('height', height())
            .datum(data)
          .transition().duration(duration).call(graph);

        return graph;
      },
      callback: function(graph) {
        graph.dispatch.on('tooltipShow', showTooltip);
        graph.dispatch.on('tooltipHide', nv.tooltip.cleanup);

        //TODO: create resize queue and have nv core handle resize instead of binding all to window resize
        window.onresize =
        function() {
          // now that width and height are functions, should be automatic..of course you can always override them
          d3.select(selector + ' svg')
              .attr('width', graph.width()()) //need to set SVG dimensions, chart is not aware of the SVG component
              .attr('height', graph.height()())
              .call(graph);
        };
      }
    });

    return chart;
  };


  /*
  //  moved to chart()
  chart.update = function() {
    if (!selector || !data.length) return chart; //do nothing if you have nothing to work with

    d3.select(selector).select('svg')
        .datum(data)
      .transition().duration(duration).call(graph);

    return chart;
  };
  */

  chart.data = function(_) {
    if (!arguments.length) return data;
    data = _;
    return chart;
  };

  chart.selector = function(_) {
    if (!arguments.length) return selector;
    selector = _;
    return chart;
  };

  chart.duration = function(_) {
    if (!arguments.length) return duration;
    duration = _;
    return chart;
  };

  chart.tooltip = function(_) {
    if (!arguments.length) return tooltip;
    tooltip = _;
    return chart;
  };

  chart.xTickFormat = function(_) {
    if (!arguments.length) return graph.xAxis.tickFormat();
    graph.xAxis.tickFormat(typeof _ === 'function' ? _ : d3.format(_));
    return chart;
  };

  chart.yTickFormat = function(_) {
    if (!arguments.length) return graph.yAxis.tickFormat();
    graph.yAxis.tickFormat(typeof _ === 'function' ? _ : d3.format(_));
    return chart;
  };

  chart.xAxisLabel = function(_) {
    if (!arguments.length) return graph.xAxis.axisLabel();
    graph.xAxis.axisLabel(_);
    return chart;
  };

  chart.yAxisLabel = function(_) {
    if (!arguments.length) return graph.yAxis.axisLabel();
    graph.yAxis.axisLabel(_);
    return chart;
  };

  d3.rebind(chart, graph, 'x', 'y');

  chart.graph = graph; // Give direct access for getter/setters, and dispatchers

  return chart;
};


// This is an attempt to make an extremely easy to use chart that is ready to go,
//    basically the chart models with the extra glue... Queuing, tooltips, automatic resize, etc.
// I may make these more specific, like 'time series line with month end data points', etc.
//    or may make yet another layer of abstraction... common settings.
nv.charts.line = function() {
  var selector = null,
      data = [],
      duration = 500,
      tooltip = function(key, x, y, e, graph) { 
        return '<h3>' + key + '</h3>' +
               '<p>' +  y + ' at ' + x + '</p>'
      };


  var graph = nv.models.lineWithLegend(),
      showTooltip = function(e) {
        var offsetElement = document.getElementById(selector.substr(1)),
            left = e.pos[0] + offsetElement.offsetLeft,
            top = e.pos[1] + offsetElement.offsetTop,
            formatX = graph.xAxis.tickFormat(),
            formatY = graph.yAxis.tickFormat(),
            x = formatX(graph.x()(e.point)),
            y = formatY(graph.y()(e.point)),
            content = tooltip(e.series.key, x, y, e, graph);

        nv.tooltip.show([left, top], content);
      };

  //setting component defaults
  graph.xAxis.tickFormat(d3.format(',r'));
  graph.yAxis.tickFormat(d3.format(',.2f'));


  //TODO: consider a method more similar to how the models are built
  function chart() {
    if (!selector || !data.length) return chart; //do nothing if you have nothing to work with

    d3.select(selector).select('svg')
        .datum(data)
      .transition().duration(duration).call(graph); //consider using transition chaining like in the models

    return chart;
  }


  // This should always only be called once, then update should be used after, 
  //     in which case should consider the 'd3 way' and merge this with update, 
  //     but simply do this on enter... should try anoter example that way
  chart.build = function() {
    if (!selector || !data.length) return chart; //do nothing if you have nothing to work with

    nv.addGraph({
      generate: function() {
        var container = d3.select(selector),
            width = function() { return parseInt(container.style('width')) },
            height = function() { return parseInt(container.style('height')) },
            svg = container.append('svg');

        graph
            .width(width)
            .height(height);

        svg
            .attr('width', width())
            .attr('height', height())
            .datum(data)
          .transition().duration(duration).call(graph);

        return graph;
      },
      callback: function(graph) {
        graph.dispatch.on('tooltipShow', showTooltip);
        graph.dispatch.on('tooltipHide', nv.tooltip.cleanup);

        //TODO: create resize queue and have nv core handle resize instead of binding all to window resize
        window.onresize =
        function() {
          // now that width and height are functions, should be automatic..of course you can always override them
          d3.select(selector + ' svg')
              .attr('width', graph.width()()) //need to set SVG dimensions, chart is not aware of the SVG component
              .attr('height', graph.height()())
              .call(graph);
        };
      }
    });

    return chart;
  };


  /*
  //  moved to chart()
  chart.update = function() {
    if (!selector || !data.length) return chart; //do nothing if you have nothing to work with

    d3.select(selector).select('svg')
        .datum(data)
      .transition().duration(duration).call(graph);

    return chart;
  };
  */

  chart.data = function(_) {
    if (!arguments.length) return data;
    data = _;
    return chart;
  };

  chart.selector = function(_) {
    if (!arguments.length) return selector;
    selector = _;
    return chart;
  };

  chart.duration = function(_) {
    if (!arguments.length) return duration;
    duration = _;
    return chart;
  };

  chart.tooltip = function(_) {
    if (!arguments.length) return tooltip;
    tooltip = _;
    return chart;
  };

  chart.xTickFormat = function(_) {
    if (!arguments.length) return graph.xAxis.tickFormat();
    graph.xAxis.tickFormat(typeof _ === 'function' ? _ : d3.format(_));
    return chart;
  };

  chart.yTickFormat = function(_) {
    if (!arguments.length) return graph.yAxis.tickFormat();
    graph.yAxis.tickFormat(typeof _ === 'function' ? _ : d3.format(_));
    return chart;
  };

  chart.xAxisLabel = function(_) {
    if (!arguments.length) return graph.xAxis.axisLabel();
    graph.xAxis.axisLabel(_);
    return chart;
  };

  chart.yAxisLabel = function(_) {
    if (!arguments.length) return graph.yAxis.axisLabel();
    graph.yAxis.axisLabel(_);
    return chart;
  };

  d3.rebind(chart, graph, 'x', 'y');

  chart.graph = graph; // Give direct access for getter/setters, and dispatchers

  return chart;
};


// This is an attempt to make an extremely easy to use chart that is ready to go,
//    basically the chart models with the extra glue... Queuing, tooltips, automatic resize, etc.
// I may make these more specific, like 'time series line with month end data points', etc.
//    or may make yet another layer of abstraction... common settings.
nv.charts.lineChartDaily = function() {
  var selector = null,
      data = [],
      duration = 500,
      tooltip = function(key, x, y, e, graph) { 
        return '<h3>' + key + '</h3>' +
               '<p>' +  y + ' at ' + x + '</p>'
      };


  var graph = nv.models.lineWithLegend()
                .x(function(d,i) { return i }),
      showTooltip = function(e) {
        var offsetElement = document.getElementById(selector.substr(1)),
            left = e.pos[0] + offsetElement.offsetLeft,
            top = e.pos[1] + offsetElement.offsetTop,
            formatX = graph.xAxis.tickFormat(),
            formatY = graph.yAxis.tickFormat(),
            x = formatX(graph.x()(e, e.pointIndex)),
            //x = formatX(graph.x()(e.point)),
            y = formatY(graph.y()(e.point)),
            content = tooltip(e.series.key, x, y, e, graph);

        nv.tooltip.show([left, top], content);
      };

  //setting component defaults
  //graph.xAxis.tickFormat(d3.format(',r'));
  graph.xAxis.tickFormat(function(d) {
    //return d3.time.format('%x')(new Date(d))
    //log(d, data[0].values[d]);
    return d3.time.format('%x')(new Date(data[0].values[d].x))
  });

  //graph.yAxis.tickFormat(d3.format(',.2f'));
  graph.yAxis.tickFormat(d3.format(',.2%'));


  //TODO: consider a method more similar to how the models are built
  function chart() {
    if (!selector || !data.length) return chart; //do nothing if you have nothing to work with

    d3.select(selector).select('svg')
        .datum(data)
      .transition().duration(duration).call(graph); //consider using transition chaining like in the models

    return chart;
  }


  // This should always only be called once, then update should be used after, 
  //     in which case should consider the 'd3 way' and merge this with update, 
  //     but simply do this on enter... should try anoter example that way
  chart.build = function() {
    if (!selector || !data.length) return chart; //do nothing if you have nothing to work with

    nv.addGraph({
      generate: function() {
        var container = d3.select(selector),
            width = function() { return parseInt(container.style('width')) },
            height = function() { return parseInt(container.style('height')) },
            svg = container.append('svg');

        graph
            .width(width)
            .height(height);

        svg
            .attr('width', width())
            .attr('height', height())
            .datum(data)
          .transition().duration(duration).call(graph);

        return graph;
      },
      callback: function(graph) {
        graph.dispatch.on('tooltipShow', showTooltip);
        graph.dispatch.on('tooltipHide', nv.tooltip.cleanup);

        //TODO: create resize queue and have nv core handle resize instead of binding all to window resize
        window.onresize =
        function() {
          // now that width and height are functions, should be automatic..of course you can always override them
          d3.select(selector + ' svg')
              .attr('width', graph.width()()) //need to set SVG dimensions, chart is not aware of the SVG component
              .attr('height', graph.height()())
              .call(graph);
        };
      }
    });

    return chart;
  };


  /*
  //  moved to chart()
  chart.update = function() {
    if (!selector || !data.length) return chart; //do nothing if you have nothing to work with

    d3.select(selector).select('svg')
        .datum(data)
      .transition().duration(duration).call(graph);

    return chart;
  };
  */

  chart.data = function(_) {
    if (!arguments.length) return data;
    data = _;
    return chart;
  };

  chart.selector = function(_) {
    if (!arguments.length) return selector;
    selector = _;
    return chart;
  };

  chart.duration = function(_) {
    if (!arguments.length) return duration;
    duration = _;
    return chart;
  };

  chart.tooltip = function(_) {
    if (!arguments.length) return tooltip;
    tooltip = _;
    return chart;
  };

  chart.xTickFormat = function(_) {
    if (!arguments.length) return graph.xAxis.tickFormat();
    graph.xAxis.tickFormat(typeof _ === 'function' ? _ : d3.format(_));
    return chart;
  };

  chart.yTickFormat = function(_) {
    if (!arguments.length) return graph.yAxis.tickFormat();
    graph.yAxis.tickFormat(typeof _ === 'function' ? _ : d3.format(_));
    return chart;
  };

  chart.xAxisLabel = function(_) {
    if (!arguments.length) return graph.xAxis.axisLabel();
    graph.xAxis.axisLabel(_);
    return chart;
  };

  chart.yAxisLabel = function(_) {
    if (!arguments.length) return graph.yAxis.axisLabel();
    graph.yAxis.axisLabel(_);
    return chart;
  };

  d3.rebind(chart, graph, 'x', 'y');

  chart.graph = graph; // Give direct access for getter/setters, and dispatchers

  return chart;
};

})();