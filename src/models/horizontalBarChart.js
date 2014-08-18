
nv.models.horizontalBarChart = function(){
	"use strict";

	/* public variables */

	// Chart Components ( Take care of drawing order )
	var horizontalBar = nv.models.horizontalBar(),
		xAxis = nv.models.axis(),
		yAxis = nv.models.axis(),
		legend = nv.models.legend().height(30)
		;
	/* ----------------  */

	function chart(selection) {

		return chart;
	}

	/* Event Handling / Dispatching ( out of chart scope ) */
  	horizontalBar.dispatch.on('elementMouseover.tooltip', function(e) {
  	
  	  e.pos = [e.pos[0] +  margin.left, e.pos[1] + margin.top];
  	  dispatch.tooltipShow(e);
  	
  	});
	
  	horizontalBar.dispatch.on('elementMouseout.tooltip', function(e) {
  	
  	  dispatch.tooltipHide(e);
  	
  	});

  	dispatch.on('tooltipHide', function() {
  	  if (tooltips) {
  	  	nv.tooltip.cleanup();
  	  }

  	});

	/* Expose chart's sub-components  */
	chart.dispatch = dispatch;
	chart.horizontalBar = horizontalBar;
	chart.xAxis = xAxis;
	chart.yAxis = yAxis;
	chart.legend = legend;

	d3.rebind(chart, horizontalBar, 'x', 'y', 'xDomain', 'yDomain', 'xRange', 'yRange', 'forceX', 'forceY', 'id', 'showValues', 'valueFormat');

	chart.options = nv.utils.optionsFunc.bind(chart);


	return chart;
}