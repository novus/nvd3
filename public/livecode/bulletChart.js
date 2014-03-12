nv.addGraph(function() {
  var chart = nv.models.bulletChart();

  d3.select('#chart svg')
      .datum(data)
    .transition().duration(1000)
      .call(chart);

  return chart;
});
