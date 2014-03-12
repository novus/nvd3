

(function() {

  var mainExample, exampleOne, exampleTwo, exampleThree;

  //var colors = d3.scale.category20().range();

  var test_data = stream_layers(3,20 + Math.random()*50,.1).map(function(data, i) {
    return {
      key: 'Stream' + i
    , values: data
    //, color: colors[i]
    };
  });


  // --------------------------- MAIN EXAMPLE ---------------------------------


  nv.addGraph(function() {
    var chart = nv.models.multiBarChart()
                  .margin({top: 50, bottom: 30, left: 40, right: 10});

    chart.xAxis
        .tickFormat(d3.format(',f'));

    chart.yAxis
        .tickFormat(d3.format(',.1f'));

    d3.select('#mainExample')
        .datum(test_data)
      .transition().duration(500).call(chart);

    nv.utils.windowResize(chart.update);

    chart.legend.dispatch.on('legendClick.updateExamples', function() {
      setTimeout(function() {
        exampleOne.update();
        exampleTwo.update();
        exampleThree.update();
      }, 100);
    });

    mainExample = chart;

    return chart;
  });



  // --------------------------- EXAMPLE ONE ---------------------------------


  nv.addGraph(function() {  
    var chart = nv.models.lineChart()
                  .showLegend(false)
                  .margin({top: 10, bottom: 30, left: 40, right: 10})
                  .useInteractiveGuideline(true)
                  ;

    chart.xAxis // chart sub-models (ie. xAxis, yAxis, etc) when accessed directly, return themselves, not the partent chart, so need to chain separately
        .tickFormat(d3.format(',r'));

    chart.yAxis
        .tickFormat(d3.format(',.1f'));

    d3.select('#exampleOne')
        .datum(test_data)
      .transition().duration(500)
        .call(chart);

    //TODO: Figure out a good way to do this automatically
    nv.utils.windowResize(chart.update);
    //nv.utils.windowResize(function() { d3.select('#chart1 svg').call(chart) });

    exampleOne = chart;

    return chart;
  });


  // --------------------------- EXAMPLE TWO ---------------------------------



  nv.addGraph(function() {
      var chart = nv.models.stackedAreaChart()
                  .margin({top: 10, bottom: 30, left: 40, right: 10})
                  .showControls(false)
                  .showLegend(false)
                  .useInteractiveGuideline(true)
                  .style('stream');

      chart.yAxis
          .showMaxMin(false)
          .tickFormat(d3.format(',.1f'));

      d3.select("#exampleTwo")
        .datum(test_data)
          .transition().duration(500).call(chart);

      nv.utils.windowResize(chart.update);


      chart.stacked.dispatch.on('areaClick.updateExamples', function(e) {
        setTimeout(function() {
          mainExample.update();
          exampleOne.update();
          //exampleTwo.update();
          exampleThree.update();
        }, 100);
      })

      exampleTwo = chart;

      return chart;
  });



  // --------------------------- EXAMPLE THREE ---------------------------------


  nv.addGraph(function() {
      var chart = nv.models.stackedAreaChart()
                  .margin({top: 10, bottom: 30, left: 40, right: 10})
                  .showControls(false)
                  .showLegend(false)
                  .useInteractiveGuideline(true)
                  .style('stacked');

      chart.yAxis
          .tickFormat(d3.format(',.1f'));

      d3.select("#exampleThree")
        .datum(test_data)
          .transition().duration(500).call(chart);

      nv.utils.windowResize(chart.update);


      chart.stacked.dispatch.on('areaClick.updateExamples', function(e) {
        setTimeout(function() {
          mainExample.update();
          exampleOne.update();
          exampleTwo.update();
          //exampleThree.update();
        }, 100);
      })

      exampleThree = chart;

      return chart;
  });


})();

