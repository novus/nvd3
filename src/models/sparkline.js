
nv.models.sparkline = function() {
  var margin = {top: 0, right: 0, bottom: 0, left: 0},
      width = 400,
      height = 32,
      animate = true,
      getX = function(d) { return d.x },
      getY = function(d) { return d.y },
      color = nv.utils.defaultColor(),
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


      var wrap = d3.select(this).selectAll('g.nv-wrap.nv-sparkline').data([data]);

      var gEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap nv-sparkline');
      //var gEnter = svg.enter().append('svg').append('g');
      //gEnter.append('g').attr('class', 'sparkline')
      gEnter
          .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
          .style('stroke', function(d,i) { return d.color || color(d, i) });

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
      var points = gEnter.selectAll('circle.nv-point')
          .data(function(d) { return d.filter(function(p,i) { return y.domain().indexOf(getY(p,i)) != -1 || getX(p,i) == x.domain()[1]  }) });
      points.enter().append('circle').attr('class', 'nv-point');
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
