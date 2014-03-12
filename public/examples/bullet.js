nv.addGraph(function() {  
  var chart = nv.models.bulletChart();

  d3.select('#chart svg')
      .datum(exampleData())
      .transition().duration(1000)
      .call(chart);

  return chart;
});


function exampleData() {
  return {
  	"title":"Revenue",		//Label the bullet chart
  	"subtitle":"US$, in thousands",		//sub-label for bullet chart
  	"ranges":[150,225,300],	 //Minimum, mean and maximum values.
  	"measures":[220],		 //Value representing current measurement (the thick blue line in the example)
  	"markers":[250]			 //Place a marker on the chart (the white triangle marker)
  };
}
