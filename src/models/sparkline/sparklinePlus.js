
nv.models.sparklinePlus = function() {
  "use strict";
  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var sparkline = nv.models.sparkline();

  var Layer = new Layer({
        margin: {top: 15, right: 100, bottom: 10, left: 50}
        , chartClass: 'sparklineplus'
      })
    , x
    , y
    , index = []
    , paused = false
    , xTickFormat = d3.format(',r')
    , yTickFormat = d3.format(',.2f')
    , showValue = true
    , alignValue = true
    , rightAlignValue = false
    ;

  //============================================================


  function chart(selection) {
    selection.each(function(data) {

      Layer.setRoot(this);

      var availableWidth = Layer.available.width,
          availableHeight = Layer.available.height;

      chart.update = function() { chart(selection) };

      //------------------------------------------------------------
      // Display No Data message if there's nothing to show.

      if (Layer.noData(data))
        return chart;

      var currentValue = sparkline.y()(data[data.length-1], data.length-1);

      //------------------------------------------------------------

      //------------------------------------------------------------
      // Setup Scales

      x = sparkline.xScale();
      y = sparkline.yScale();

      //------------------------------------------------------------

      //------------------------------------------------------------
      // Setup containers and skeleton of chart

      Layer.wrapChart(data);

      Layer.gEnter.append('g').attr('class', 'nv-sparklineWrap');
      Layer.gEnter.append('g').attr('class', 'nv-valueWrap');
      Layer.gEnter.append('g').attr('class', 'nv-hoverArea');

      //------------------------------------------------------------

      //------------------------------------------------------------
      // Main Chart Component(s)

      var sparklineWrap = Layer.g.select('.nv-sparklineWrap');

      sparkline
        .width(availableWidth)
        .height(availableHeight);

      sparklineWrap
        .call(sparkline);

      //------------------------------------------------------------

      var valueWrap = Layer.g.select('.nv-valueWrap');

      var value = valueWrap.selectAll('.nv-currentValue')
          .data([currentValue]);

      value.enter().append('text').attr('class', 'nv-currentValue')
          .attr('dx', rightAlignValue ? -8 : 8)
          .attr('dy', '.9em')
          .style('text-anchor', rightAlignValue ? 'end' : 'start');

      value
          .attr('x', availableWidth + (rightAlignValue ? Layer.margin.right : 0))
          .attr('y', alignValue ? function(d) { return y(d) } : 0)
          .style('fill', sparkline.color()(data[data.length-1], data.length-1))
          .text(yTickFormat(currentValue));

      Layer.gEnter.select('.nv-hoverArea').append('rect')
          .on('mousemove', sparklineHover)
          .on('click', function() { paused = !paused })
          .on('mouseout', function() { index = []; updateValueLine(); });
          //.on('mouseout', function() { index = null; updateValueLine(); });

      Layer.g.select('.nv-hoverArea rect')
          .attr('transform', function() { return 'translate(' + -Layer.margin.left + ',' + -Layer.margin.top + ')' })
          .attr('width', availableWidth + Layer.margin.left + Layer.margin.right)
          .attr('height', availableHeight + Layer.margin.top);

      function updateValueLine() { //index is currently global (within the chart), may or may not keep it that way
        if (paused) return;

        var hoverValue = Layer.g.selectAll('.nv-hoverValue').data(index);

        var hoverEnter = hoverValue.enter()
          .append('g').attr('class', 'nv-hoverValue')
            .style('stroke-opacity', 0)
            .style('fill-opacity', 0);

        hoverValue.exit()
          .transition().duration(250)
            .style('stroke-opacity', 0)
            .style('fill-opacity', 0)
            .remove();

        hoverValue
            .attr('transform', function(d) { return 'translate(' + x(sparkline.x()(data[d],d)) + ',0)' })
          .transition().duration(250)
            .style('stroke-opacity', 1)
            .style('fill-opacity', 1);

        if (!index.length) return;

        hoverEnter.append('line')
            .attr('x1', 0)
            .attr('y1', -Layer.margin.top)
            .attr('x2', 0)
            .attr('y2', availableHeight);

        hoverEnter.append('text').attr('class', 'nv-xValue')
            .attr('x', -6)
            .attr('y', -Layer.margin.top)
            .attr('text-anchor', 'end')
            .attr('dy', '.9em');

        Layer.g.select('.nv-hoverValue .nv-xValue')
            .text(xTickFormat(sparkline.x()(data[index[0]], index[0])));

        hoverEnter.append('text').attr('class', 'nv-yValue')
            .attr('x', 6)
            .attr('y', -Layer.margin.top)
            .attr('text-anchor', 'start')
            .attr('dy', '.9em');

        Layer.g.select('.nv-hoverValue .nv-yValue')
            .text(yTickFormat(sparkline.y()(data[index[0]], index[0])));
      }

      function sparklineHover() {
        if (paused) return;
        var pos = d3.mouse(this)[0] - Layer.margin.left;
        function getClosestIndex(data, x) {
          var distance = Math.abs(sparkline.x()(data[0], 0) - x);
          var closestIndex = 0;
          for (var i = 0; i < data.length; i++){
            if (Math.abs(sparkline.x()(data[i], i) - x) < distance) {
              distance = Math.abs(sparkline.x()(data[i], i) - x);
              closestIndex = i;
            }
          }
          return closestIndex;
        }
        index = [getClosestIndex(data, Math.round(x.invert(pos)))];
        updateValueLine();
      }
    });
    return chart;
  }


  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  // expose chart's sub-components
  chart.sparkline = sparkline;

  d3.rebind(chart, sparkline, 'x', 'y', 'xScale', 'yScale', 'color');

  chart.options = nv.utils.optionsFunc.bind(chart);

  chart.margin = function(_) {
    if (!arguments.length) return Layer.margin;
    Layer.margin.top    = typeof _.top    != 'undefined' ? _.top    : Layer.margin.top;
    Layer.margin.right  = typeof _.right  != 'undefined' ? _.right  : Layer.margin.right;
    Layer.margin.bottom = typeof _.bottom != 'undefined' ? _.bottom : Layer.margin.bottom;
    Layer.margin.left   = typeof _.left   != 'undefined' ? _.left   : Layer.margin.left;
    return chart;
  };

  chart.width = function(_) {
    if (!arguments.length) return Layer.options.size.width;
    Layer.options.size.width = _;
    return chart;
  };

  chart.height = function(_) {
    if (!arguments.length) return Layer.options.size.height;
    Layer.options.size.height = _;
    return chart;
  };

  chart.xTickFormat = function(_) {
    if (!arguments.length) return xTickFormat;
    xTickFormat = _;
    return chart;
  };

  chart.yTickFormat = function(_) {
    if (!arguments.length) return yTickFormat;
    yTickFormat = _;
    return chart;
  };

  chart.showValue = function(_) {
    if (!arguments.length) return showValue;
    showValue = _;
    return chart;
  };

  chart.alignValue = function(_) {
    if (!arguments.length) return alignValue;
    alignValue = _;
    return chart;
  };

  chart.rightAlignValue = function(_) {
    if (!arguments.length) return rightAlignValue;
    rightAlignValue = _;
    return chart;
  };

  chart.noData = function(_) {
    if (!arguments.length) return Layer.options.noData;
    Layer.options.noData = _;
    return chart;
  };

  //============================================================

  return chart;
};
