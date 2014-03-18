
nv.models.lineFisheye = function() {
  "use strict";
  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var canvas = new Canvas({
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
        
      canvas.setRoot(this);
        
      var availableWidth = canvas.available.width,
          availableHeight = canvas.available.height;

      //get the scales inscase scatter scale was set manually
      x = x || scatter.xScale();
      y = y || scatter.yScale();

      //store old scales if they exist
      x0 = x0 || x;
      y0 = y0 || y;

      canvas.wrapChart(data);
      var scatterWrap = canvas.wrap.select('.nv-scatterWrap').datum(data);
      canvas.gEnter.append('g').attr('class', 'nv-groups');

      scatter.width(availableWidth).height(availableHeight);

      d3.transition(scatterWrap).call(scatter);

      canvas.defsEnter.append('clipPath')
        .attr('id', 'nv-edge-clip-' + id)
        .append('rect');

      canvas.wrap.select('#nv-edge-clip-' + id + ' rect')
          .attr('width', availableWidth)
          .attr('height', availableHeight);

      canvas.g.attr('clip-path', clipEdge ? 'url(#nv-edge-clip-' + id + ')' : '');
      scatterWrap.attr('clip-path', clipEdge ? 'url(#nv-edge-clip-' + id + ')' : '');

      var groups = canvas.wrap.select('.nv-groups').selectAll('.nv-group')
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
    if (!arguments.length) return canvas.margin;
      canvas.margin.top    = nv.utils.valueOrDefault(_.top, canvas.margin.top);
      canvas.margin.right  = nv.utils.valueOrDefault(_.right, canvas.margin.right);
      canvas.margin.bottom = nv.utils.valueOrDefault(_.bottom, canvas.margin.bottom);
      canvas.margin.left   = nv.utils.valueOrDefault(_.left, canvas.margin.left);
    return chart;
  };

  chart.width = function(_) {
    if (!arguments.length) return canvas.options.size.width;
    canvas.options.size.width = _;
    return chart;
  };

  chart.height = function(_) {
    if (!arguments.length) return canvas.options.size.height;
    canvas.options.size.height = _;
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
