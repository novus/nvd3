nv.addGraph(function() {
  var chart = nv.models.lineWithFocusChart();

  chart.xAxis
      .tickFormat(d3.format(',f'));

  chart.yAxis
      .tickFormat(d3.format(',.2f'));

  chart.y2Axis
      .tickFormat(d3.format(',.2f'));

  d3.select('#chart svg')
      .datum(testData())
      .transition().duration(500)
      .call(chart);

  nv.utils.windowResize(chart.update);

  return chart;
});
/**************************************
 * Simple test data generator
 */

function testData() {
  return stream_layers(3,128,.1).map(function(data, i) {
    return { 
      key: 'Stream' + i,
      values: data
    };
  });
}
