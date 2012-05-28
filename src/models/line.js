
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
