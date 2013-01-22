
nv.models.gantt = function() {

  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var margin = {top: 0, right: 0, bottom: 0, left: 0}
    , orient = 'left' // TODO top & bottom
    , reverse = false
    , rowHeight = 32
    , labelWidth = 300
    , x = d3.time.scale()
    , y = d3.scale.linear()
    , getTitle    = function(d,i) { return d.start }
    , getStart    = function(d,i) { return d.start }
    , getEnd      = function(d,i) { return d.start + d.duration }
    , getDuration = function(d,i) { return d.duration }
    , getSize     = function(d) { return d.size || 30} // accessor to get the point size
    , shape       = function(d) { return d.shape || 'circle' } // accessor to get point shape
    , forceX = [0] // List of numbers to Force into the X scale (ie. 0, or a max / min, etc.)
    , width = 960
    , height = 500
    , xDomain = null
    , yDomain = null
    , tickFormat = null
    , color = nv.utils.getColor(['#1f77b4'])
    , dispatch = d3.dispatch('elementMouseover', 'elementMouseout')
    ;

  //============================================================
  // Private Variables
  //------------------------------------------------------------

  var x0, y0, x1 //used to store previous scales
      ;


  //============================================================


  function chart(selection) {
    selection.d3each(function(data, i) {
      var availableWidth = width - margin.left - margin.right,
          availableHeight = height - margin.top - margin.bottom,
          container = d3.select(this);


      //------------------------------------------------------------
      // Setup Scales
      // remap and flatten the data for use in calculating the scales' domains
      var seriesData =  // if we know xDomain, no need to calculate.... if Size is constant remember to set sizeDomain to speed up performance
            d3.merge(
              data.map(function(d) {
                return d.values.map(function(d,i) {
                  d.row = i;
                  return d;
                })
              })
            );

      x   .domain(xDomain || d3.extent(seriesData.map(function(d) { return getStart(d.start) }).concat(forceX)))
          .range([0, availableWidth]);

 
      // Compute the new x-scale.
      x1 = x.domain(xDomain || d3.extent(seriesData.map(function(d) { return getStart(d.start) }).concat(forceX)))
                .range([0, availableWidth]);

      // Retrieve the old x-scale, if this is an update.
      x0 = this.__chart__ || d3.time.scale()
          .domain([0, Infinity])
          .range(x1.range());

      // Stash the new scale.
      this.__chart__ = x1;

      y0 = y0 || d3.scale.linear().domain(y.domain()).range([y(0),y(0)]);


      //------------------------------------------------------------
      // Setup containers and skeleton of chart

      var wrap = container.selectAll('g.nv-wrap.nv-gantt').data(data);
      var wrapEnter = wrap.enter().append('g')
        .attr('class', function(d, i) {
            return i % 2 ? "nv-gantt nv-alt nv-row" + i : "nv-gantt nv-row" + i;
          });
      var gEnter = wrapEnter.append('g').attr('transform', function(d,i,j) {
              return 'translate(' + y0(0) + ',' + (i * rowHeight )  + ')'
          });
      var g = wrap.select('g');

      gEnter.append('rect').attr('class', 'nv-row')
          .attr('height', rowHeight - 1)
          .attr('width', availableWidth)
          .attr('y', -15)
          ;

      // container for row titles
      gEnter.append('g').attr('class', 'nv-titles');

      //------------------------------------------------------------



      var w0 = function(d) { return Math.abs(x0(getStart(d)) - x0(getEnd(d))) }, // TODO: could optimize by precalculating x0(0) and x1(0)
          w1 = function(d) { return Math.abs(x1(getStart(d)) - x1(getEnd(d))) };
      var xp0 = function(d) { return x0(getStart(d)) },
          xp1 = function(d) { return x1(getStart(d)) };

      var title = g.select('.nv-titles').append('g')
          .attr('text-anchor', 'end')
      title.append('text')
          .attr('class', 'nv-title')
          .text(function(d) { return d.key.title; });

      title.append('text')
          .attr('class', 'nv-subtitle')
          .attr('dy', '1em')
          .text(function(d) { return d.key.subtitle; });

      // Activities with non-zero duration
      var bars = g.selectAll('rect.nv-measure')
                .data(function(d) { return d.values });
      bars.enter().append('rect').filter(function(d,i) { return d.duration > 0 })
          .style('fill', color)
          .attr('class', "nv-measure")
          .attr('height', rowHeight / 4)
          .attr('width', function(d, i){ return w1(d) })
          .attr('x', function(d){ return  xp1(d) })
          .attr('y', 0 - rowHeight / 8)
          .on('mouseover', function(d) {
              dispatch.elementMouseover({
                value: d.duration,
                label: 'Current',
                pos: [x1(d.start), availableHeight/2]
              })
          })
          .on('mouseout', function(d) {
              dispatch.elementMouseout({
                value: d.duration,
                label: 'Current'
              })
          });
      bars.exit().remove();

      // Zero duration activities
      var points = g.selectAll('path.nv-milestone')
          .data(function(d) { return d.values });
      points.enter().append('path').filter(function(d,i) { return d.duration == 0 })
          .attr("class", "nv-milestone")
          .attr('transform', function(d,i) { 
            return 'translate(' + xp1(d) + ',0)'
          })
          .attr('d',
            d3.svg.symbol()
              .type(shape)
              .size(function(d,i) { return getSize(d,i) })
          )
          .on('mouseover', function(d,i) {
            var label = !i ? "Maximum" : i == 1 ? "Mean" : "Minimum";

            dispatch.elementMouseover({
              value: d,
              label: label,
              pos: [x1(d), availableHeight/2]
            })
          })
          .on('mouseout', function(d,i) {
            var label = !i ? "Maximum" : i == 1 ? "Mean" : "Minimum";

            dispatch.elementMouseout({
              value: d,
              label: label
            })
          });
      points.exit().remove();






    });
    
    // d3.timer.flush();  // Not needed?

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


  chart.start = function(_) {
    if (!arguments.length) return getStart;
    getStart = d3.functor(_);
    return chart;
  };

  chart.end = function(_) {
    if (!arguments.length) return getEnd;
    getEnd = d3.functor(_);
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


  chart.xScale = function(_) {
    if (!arguments.length) return xScale;
    xScale = _;
    return chart;
  };


  chart.xDomain = function(_) {
    if (!arguments.length) return xDomain;
    xDomain = _;
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

  chart.color = function(_) {
    if (!arguments.length) return color;
    color = nv.utils.getColor(_);
    return chart;
  };

  chart.shape = function(_) {
    if (!arguments.length) return shape;
    shape = _;
    return chart;
  };

  //============================================================


  return chart;
};


