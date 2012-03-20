
nv.models.sparkline = function() {
  var margin = {top: 3, right: 3, bottom: 3, left: 3},
      width = 200,
      height = 20,
      animate = true,
      color = d3.scale.category20().range();

  var x = d3.scale.linear(),
      y = d3.scale.linear();

  function chart(selection) {
    selection.each(function(data) {


      x   .domain(d3.extent(data, function(d) { return d.x } ))
          .range([0, width - margin.left - margin.right]);

      y   .domain(d3.extent(data, function(d) { return d.y } ))
          .range([height - margin.top - margin.bottom, 0]);


      var svg = d3.select(this).selectAll('svg').data([data]);

      var gEnter = svg.enter().append('svg').append('g');
      gEnter.append('g').attr('class', 'sparkline')
          .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
          //.style('fill', function(d, i){ return d.color || color[i * 2 % 20] })
          .style('stroke', function(d, i){ return d.color || color[i * 2 % 20] });


      svg .attr('width', width)
          .attr('height', height);


      var paths = gEnter.select('.sparkline').selectAll('path')
          .data(function(d) { return [d] });
      paths.enter().append('path');
      paths.exit().remove();
      paths
          .attr('d', d3.svg.line()
            .x(function(d) { return x(d.x) })
            .y(function(d) { return y(d.y) })
          );


      var points = gEnter.select('.sparkline').selectAll('circle.point')
          .data(function(d) { return d.filter(function(p) { return y.domain().indexOf(p.y) != -1  }) });
      points.enter().append('circle').attr('class', 'point');
      points.exit().remove();
      points
          .attr('cx', function(d) { return x(d.x) })
          .attr('cy', function(d) { return y(d.y) })
          .attr('r', 2)
          .style('stroke', function(d, i){ return d.y == y.domain()[0] ? '#d62728' : '#2ca02c' })
          .style('fill', function(d, i){ return d.y == y.domain()[0] ? '#d62728' : '#2ca02c' });
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

  chart.animate = function(_) {
    if (!arguments.length) return animate;
    animate = _;
    return chart;
  };

  return chart;
}
