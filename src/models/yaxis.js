
nv.models.yaxis = function() {
  var domain = [0,1], //just to have something to start with
      range = [0,1],
      axisLabelText = false;

  var y = d3.scale.linear(),
      axis = d3.svg.axis().scale(y).orient('left');

  function chart(selection) {
    selection.each(function(data) {

      y   .domain(domain)
          .range(range);


      //TODO: consider calculating width based on whether or not label is added, for reference in charts using this component

      var axisLabel = d3.select(this).selectAll('text.axislabel')
          .data([axisLabelText || null]);
      axisLabel.enter().append('text').attr('class', 'axislabel')
          .attr('transform', 'rotate(-90)')
          .attr('text-anchor', 'middle')
          .attr('y', -40); //TODO: consider calculating this based on largest tick width... OR at least expose this on chart
      axisLabel.exit().remove();
      axisLabel
          .attr('x', -range[0] / 2)
          .text(function(d) { return d });


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

  chart.axisLabel = function(_) {
    if (!arguments.length) return axisLabelText;
    axisLabelText = _;
    return chart;
  }


  d3.rebind(chart, axis, 'scale', 'orient', 'ticks', 'tickSubdivide', 'tickSize', 'tickPadding', 'tickFormat');

  return chart;
}
