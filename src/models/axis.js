
nv.models.axis = function() {
  //Default Settings
  var scale = d3.scale.linear(),
      axisLabelText = null,
      showMaxMin = true, //TODO: showMaxMin should be disabled on all ordinal scaled axes
      highlightZero = true;
      //TODO: considering adding margin

  var axis = d3.svg.axis()
               .scale(scale)
               .orient('bottom')
               .tickFormat(function(d) { return d }), //TODO: decide if we want to keep this
      scale0;

  function chart(selection) {
    selection.each(function(data) {
      var container = d3.select(this);

      var wrap = container.selectAll('g.wrap.axis').data([data]);
      var wrapEnter = wrap.enter().append('g').attr('class', 'wrap axis');
      var gEnter = wrapEnter.append('g');
      var g = wrap.select('g')

      if (axis.orient() == 'top' || axis.orient() == 'bottom')
        axis.ticks(Math.abs(scale.range()[1] - scale.range()[0]) / 100);

      //TODO: consider calculating width/height based on whether or not label is added, for reference in charts using this component


      d3.transition(g)
          .call(axis);

      scale0 = scale0 || axis.scale();

      var axisLabel = g.selectAll('text.axislabel')
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
        case 'bottom':
          axisLabel.enter().append('text').attr('class', 'axislabel')
              .attr('text-anchor', 'middle')
              .attr('y', 25);
          axisLabel
              .attr('x', scale.range()[1] / 2);
          break;
        case 'right':
          axisLabel.enter().append('text').attr('class', 'axislabel')
               .attr('transform', 'rotate(90)')
              .attr('y', -40); //TODO: consider calculating this based on largest tick width... OR at least expose this on chart
          axisLabel
              .attr('x', -scale.range()[0] / 2);
          if (showMaxMin) {
            var axisMaxMin = wrap.selectAll('g.axisMaxMin')
                           .data(scale.domain());
            axisMaxMin.enter().append('g').attr('class', 'axisMaxMin').append('text');
            axisMaxMin.exit().remove();
            axisMaxMin
                .attr('transform', function(d,i) {
                  return 'translate(0,' + scale(d) + ')'
                })
              .select('text')
                .attr('dy', '.32em')
                .attr('dx', axis.tickPadding())
                .attr('text-anchor', 'start')
                .text(function(d,i) {
                  return axis.tickFormat()(d)
                });
            d3.transition(axisMaxMin)
                .attr('transform', function(d,i) {
                  return 'translate(0,' + scale.range()[i] + ')'
                });
          }
          break;
        case 'left':
          axisLabel.enter().append('text').attr('class', 'axislabel')
               .attr('transform', 'rotate(-90)')
              .attr('y', -40); //TODO: consider calculating this based on largest tick width... OR at least expose this on chart
          axisLabel
              .attr('x', -scale.range()[0] / 2);
          if (showMaxMin) {
            var axisMaxMin = wrap.selectAll('g.axisMaxMin')
                           .data(scale.domain());
            axisMaxMin.enter().append('g').attr('class', 'axisMaxMin').append('text');
            axisMaxMin.exit().remove();
            axisMaxMin
                .attr('transform', function(d,i) {
                  return 'translate(0,' + scale0(d) + ')'
                })
              .select('text')
                .attr('dy', '.32em')
                .attr('dx', -axis.tickPadding())
                .attr('text-anchor', 'end')
                .text(function(d,i) {
                  return axis.tickFormat()(d)
                });
            d3.transition(axisMaxMin)
                .attr('transform', function(d,i) {
                  return 'translate(0,' + scale.range()[i] + ')'
                });
          }
          break;
      }
      axisLabel
          .text(function(d) { return d });


      //check if max and min overlap other values, if so, hide the values that overlap
      if (showMaxMin && (axis.orient() === 'left' || axis.orient() === 'right')) {
        g.selectAll('g') // the g's wrapping each tick
            .filter(function(d,i) {
              return scale(d) < 8 || scale(d) > scale.range()[0] - 8; // 8 is assuming text height is 16
            })
            .remove();
      }


      //highlight zero line ... Maybe should not be an option and should just be in CSS?
      if (highlightZero)
        g.selectAll('line.tick')
          .filter(function(d) { return !parseFloat(Math.round(d*100000)/1000000) }) //this is because sometimes the 0 tick is a very small fraction, TODO: think of cleaner technique
            .classed('zero', true);

      scale0 = scale.copy();

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

  chart.showMaxMin = function(_) {
    if (!arguments.length) return showMaxMin;
    showMaxMin = _;
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
