
nv.models.xaxis = function() {
  var domain = [0,1], //just to have something to start with, maybe I dont need this
      range = [0,1],
      axisLabelText = false;

  var scale = d3.scale.linear(),
      axis = d3.svg.axis().scale(scale).orient('bottom');

  function chart(selection) {
    selection.each(function(data) {

      scale.domain(domain)
           .range(range);

      //TODO: consider calculating height based on whether or not label is added, for reference in charts using this component

      var axisLabel = d3.select(this).selectAll('text.axislabel')
          .data([axisLabelText || null]);
      axisLabel.enter().append('text').attr('class', 'axislabel')
          .attr('text-anchor', 'middle')
          .attr('x', range[1] / 2)
          .attr('y', 25);
      axisLabel.exit().remove();
      axisLabel.text(function(d) { return d });


      //d3.select(this)
      d3.transition(d3.select(this))
          .call(axis);

      d3.select(this)
        .selectAll('line.tick')
        //.filter(function(d) { return !parseFloat(d) })
        .filter(function(d) { return !parseFloat(Math.round(d*100000)/1000000) })
          .classed('zero', true);

    });

    return chart;
  }


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


  d3.rebind(chart, axis, 'orient', 'ticks', 'tickSubdivide', 'tickSize', 'tickPadding', 'tickFormat');

  return chart;
}
