
nv.models.bar = function() {
  var margin = {top: 20, right: 10, bottom: 20, left: 60},
      width = 960,
      height = 500,
      animate = 500;

  var x = d3.scale.ordinal(),
      y = d3.scale.linear(),
      xAxis = d3.svg.axis().scale(x).orient('bottom').ticks(5),
      yAxis = d3.svg.axis().scale(y).orient('left');

  function chart(selection) {
    selection.each(function(data) {

      //x   .domain(data.map(function(d,i) { return d.label }))
      x   .domain(["One", "Two", "Three", "Four", "Five"])
          .rangeRoundBands([0, width - margin.left - margin.right], .1);

      y   .domain([0, d3.max(data, function(d) { return d.y; })])
          .range([height - margin.top - margin.bottom, 0]);

      xAxis.ticks( width / 100 );
      yAxis.ticks( height / 36 ).tickSize(-(width - margin.right - margin.left), 0);

      yAxis.tickSize(-(width - margin.right - margin.left), 0);

      var wrap = d3.select(this).selectAll('g.wrap').data([data]);
      var gEnter = wrap.enter().append('g').attr('class', 'wrap').append('g');

      gEnter.append('g').attr('class', 'x axis');
      gEnter.append('g').attr('class', 'y axis');
      gEnter.append('g').attr('class', 'bars');


      wrap.attr('width', width)
          .attr('height', height);

      var g = wrap.select('g')
          .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');


      var bars = wrap.select('.bars').selectAll('.bar')
          .data(function(d) { return d });
      bars.exit().remove();


      var barsEnter = bars.enter().append('g')
          .attr('class', 'bar')
          .on('mouseover', function(d,i){ d3.select(this).classed('hover', true) })
          .on('mouseout', function(d,i){ d3.select(this).classed('hover', false) });
      barsEnter.append('rect')
          .attr('y', function(d) { return y(0) });
      barsEnter.append('text')
          .attr('text-anchor', 'middle')
          .attr('dy', '-4px');


      bars
          .attr('transform', function(d,i) { return 'translate(' + x(d.label) + ',0)' })
      bars.selectAll('rect')
          .order()
          .attr('width', x.rangeBand )
        .transition()
          .duration(animate)
          .attr('x', 0 )
          .attr('y', function(d) { return y(d.y) })
          .attr('height', function(d) { return y.range()[0] - y(d.y) });
      bars.selectAll('text')
          .attr('x', 0 )
          .attr('y', function(d) { return y(d.y) })
          .attr('dx', x.rangeBand() / 2)
          .text(function(d) { return d.y });


      g.select('.x.axis')
          .attr('transform', 'translate(0,' + y.range()[0] + ')')
          .call(xAxis);

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
      width = margin.left + margin.right + 20 // Min width
    else
      width = _;
    return chart;
  };

  chart.height = function(_) {
    if (!arguments.length) return height;
    if (margin.top + margin.bottom + 20 > _)
      height = margin.top + margin.bottom + 20 // Min height
    else
      height = _;
    return chart;
  };

  chart.animate = function(_) {
    if (!arguments.length) return animate;
    animate = _;
    return chart;
  };

  chart.xaxis = {};
  // Expose the x-axis' tickFormat method.
  d3.rebind(chart.xaxis, xAxis, 'tickFormat');

  chart.yaxis = {};
  // Expose the y-axis' tickFormat method.
  d3.rebind(chart.yaxis, yAxis, 'tickFormat');

  return chart;
}
