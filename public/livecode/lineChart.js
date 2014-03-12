nv.addGraph(function() {
  var chart = nv.models.lineChart()
        .useInteractiveGuideline(true)
  ;

  chart.xAxis
      .axisLabel('Time (ms)')
      .tickFormat(d3.format(',r'));

  chart.yAxis
      .axisLabel('Voltage (v)')
      .tickFormat(d3.format('.02f'));

  d3.select('#chart svg')
      .datum(data())
    .transition().duration(500)
      .call(chart);

  nv.utils.windowResize(chart.update);

  return chart;
});
