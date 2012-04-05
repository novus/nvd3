
//may make these more specific, like 'time series line with month end data points', etc.
//  or may make that yet another layer of abstraction.... trying to not get too crazy
nv.charts.line = function() {

  var selector = null,
      data = [],
      xTickFormat = d3.format(',r'),
      yTickFormat = d3.format(',.2f'),
      xAxisLabel = null,
      yAxisLabel = null,
      duration = 500;

  var graph = nv.models.lineWithLegend(),
      showTooltip = function(e) {  //TODO: simplify so all the calcualtions don't need to be done by the user.
        var offset = $(selector).offset(),
            left = e.pos[0] + offset.left,
            top = e.pos[1] + offset.top,
            formatY = graph.yAxis.tickFormat(), //Assumes using same format as axis, can customize to show higher precision, etc.
            formatX = graph.xAxis.tickFormat();

        // uses the chart's getX and getY, you may customize if x position is not the same as the value you want 
        //   ex. daily data without weekends, x is the index, while you want the date
        var content = '<h3>' + e.series.key + '</h3>' +
                      '<p>' +
                      formatY(graph.y()(e.point)) + ' at ' + formatX(graph.x()(e.point)) +
                      '</p>';

        nvtooltip.show([left, top], content);
      };


  function chart() {
    return chart;
  }


  chart.build = function() {
    if (!selector || !data.length) return chart; //do nothing if you have nothing to work with

    nv.addGraph({
      generate: function() {
        var container = d3.select(selector),
            width = function() { return parseInt(container.style('width')) },
            height = function() { return parseInt(container.style('height')) },
            svg = container.append('svg');

        graph
            .width(width)
            .height(height);

        graph.xAxis
            .tickFormat(xTickFormat);

        graph.yAxis
            .tickFormat(yTickFormat)
            .axisLabel(yAxisLabel);

        svg
            .attr('width', width())
            .attr('height', height())
            .datum(data)
          .transition().duration(duration).call(graph);

        return graph;
      },
      callback: function(graph) {
        graph.dispatch.on('tooltipShow', showTooltip);
        graph.dispatch.on('tooltipHide', nvtooltip.cleanup);

        $(window).resize(function() {
          // now that width and height are functions, should be automatic..of course you can always override them
          d3.select(selector + ' svg')
              .attr('width', graph.width()()) //need to set SVG dimensions, chart is not aware of the SVG component
              .attr('height', graph.height()())
              .call(graph);
        });
      }
    });

    return chart;
  };


  chart.update = function() {
    //TODO: create update code

    return chart;
  };


  chart.data = function(_) {
    if (!arguments.length) return data;
    data = _;
    return chart;
  };

  chart.selector = function(_) {
    if (!arguments.length) return selector;
    selector = _;
    return chart;
  };

  chart.duration = function(_) {
    if (!arguments.length) return duration;
    duration = _;
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

  chart.xAxisLabel = function(_) {
    if (!arguments.length) return xAxisLabel;
    xAxisLabel = _;
    return chart;
  };

  chart.yAxisLabel = function(_) {
    if (!arguments.length) return yAxisLabel;
    yAxisLabel = _;
    return chart;
  };


  return chart;
}

