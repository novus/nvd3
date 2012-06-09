
nv.models.axis = function() {
  //Default Settings
  var scale = d3.scale.linear(),
      axisLabelText = null,
      highlightZero = true;
      //TODO: considering adding margin

  var axis = d3.svg.axis()
               .scale(scale)
               .orient('bottom')
               .tickFormat(function(d) { return d }); //TODO: decide if we want to keep this

  function chart(selection) {
    selection.each(function(data) {

      if (axis.orient() == 'top' || axis.orient() == 'bottom')
        axis.ticks(Math.abs(scale.range()[1] - scale.range()[0]) / 100);

      //TODO: consider calculating height based on whether or not label is added, for reference in charts using this component

      var axisLabel = d3.select(this).selectAll('text.axislabel')
          .data([axisLabelText || null]);
      axisLabel.exit().remove();
      switch (axis.orient()) {
        case 'top':
          axisLabel.enter().append('text').attr('class', 'axislabel')
              .attr('text-anchor', 'middle')
              .attr('y', 0);
          axisLabel
              .attr('x', scale.range()[1] / 2);
              break;
        case 'right':
          axisLabel.enter().append('text').attr('class', 'axislabel')
               .attr('transform', 'rotate(90)')
              .attr('y', -40); //TODO: consider calculating this based on largest tick width... OR at least expose this on chart
          axisLabel
              .attr('x', -scale.range()[0] / 2);
              break;
        case 'bottom':
          axisLabel.enter().append('text').attr('class', 'axislabel')
              .attr('text-anchor', 'middle')
              .attr('y', 25);
          axisLabel
              .attr('x', scale.range()[1] / 2);
              break;
        case 'left':
          axisLabel.enter().append('text').attr('class', 'axislabel')
               .attr('transform', 'rotate(-90)')
              .attr('y', -40); //TODO: consider calculating this based on largest tick width... OR at least expose this on chart
          axisLabel
              .attr('x', -scale.range()[0] / 2);
              break;
      }
      axisLabel
          .text(function(d) { return d });


      d3.transition(d3.select(this))
          .call(axis);

      //highlight zero line ... Maybe should not be an option and should just be in CSS?
      if (highlightZero)
        d3.select(this)
          .selectAll('line.tick')
          .filter(function(d) { return !parseFloat(Math.round(d*100000)/1000000) }) //this is because sometimes the 0 tick is a very small fraction, TODO: think of cleaner technique
            .classed('zero', true);

    });

    return chart;
  }


  d3.rebind(chart, axis, 'orient', 'ticks', 'tickValues', 'tickSubdivide', 'tickSize', 'tickPadding', 'tickFormat');
  d3.rebind(chart, scale, 'domain', 'range', 'rangeBand', 'rangeBands'); //these are also accessible by chart.scale(), but added common ones directly for ease of use

  chart.axisLabel = function(_) {
    if (!arguments.length) return axisLabelText;
    axisLabelText = _;
    return chart;
  }

  chart.highlightZero = function(_) {
    if (!arguments.length) return highlightZero;
    highlightZero = _;
    return chart;
  }

  chart.scale = function(_) {
    if (!arguments.length) return scale;
    scale = _;
    axis.scale(scale);
    d3.rebind(chart, scale, 'domain', 'range', 'rangeBand', 'rangeBands');
    return chart;
  }


  return chart;
}
