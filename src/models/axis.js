
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
