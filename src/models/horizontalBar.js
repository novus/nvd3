
nv.models.horizontalBar = function() {
	"use strict";

	/* public variables */
	var margin = {top: 0, right: 0, bottom: 0, left: 0}, 
		width = 960,
		height = 500, 
		id = Math.floor(Math.random() * 10000), //Create semi-unique ID in case user doesn't select one
	    x = d3.scale.linear(),
	    y = d3.scale.ordinal(),
	    getX = function(d) { 
	    	return d.x 
	    },
    	getY = function(d) { 
    		return d.y 
    	},
    	color = nv.utils.defaultColor(),
    	showValues = false,
    	valueFormat = d3.format(',.2f'),
    	xDomain, // dynamically assign (not default)
    	yDomain, // dynamically assign (not default)
    	xRange,
    	yRange,
    	dispatch = d3.dispatch('chartClick', 'elementClick', 'elementDblClick', 'elementMouseover', 'elementMouseout'),
    	rectClass = 'horizontalbar',
    	forceX = [0], //force x start at zero
	    disabled // communicate with horizontalBarChart to disabled choosen bars
	    ;

	/* private variables */
	var x0, y0;

	function chart(selection) {
		return chart;
	}

	/* Expose Public Variables */

	chart.dispatch = dispatch;

	chart.options = nv.utils.optionsFunc.bind(chart);

	chart.x = function(_) {
		if (!arguments.length) 
			return getX;
		getX = _;
		return chart;
	};

	chart.y = function(_) {
		if (!arguments.length) 
			return getY;
		getY = _;
		return chart;
	};

	chart.margin = function(_) {
		if (!arguments.length) 
			return margin;
		margin.top    = typeof _.top    != 'undefined' ? _.top    : margin.top;
		margin.right  = typeof _.right  != 'undefined' ? _.right  : margin.right;
		margin.bottom = typeof _.bottom != 'undefined' ? _.bottom : margin.bottom;
		margin.left   = typeof _.left   != 'undefined' ? _.left   : margin.left;
		return chart;
	};

	chart.width = function(_) {
		if (!arguments.length) 
			return width;
		width = _;
		return chart;
	};

	chart.height = function(_) {
		if (!arguments.length) 
			return height;
		height = _;
		return chart;
	};

	chart.xScale = function(_) {
		if (!arguments.length) 
			return x;
		x = _;
		return chart;
	};

	chart.yScale = function(_) {
		if (!arguments.length) 
			return y;
		y = _;
		return chart;
	};

	chart.xDomain = function(_) {
		if (!arguments.length) 
			return xDomain;
		xDomain = _;
		return chart;
	};

	chart.yDomain = function(_) {
		if (!arguments.length) 
			return yDomain;
		yDomain = _;
		return chart;
	};

	chart.xRange = function(_) {
		if (!arguments.length) 
			return xRange;
		xRange = _;
		return chart;
	};

	chart.yRange = function(_) {
		if (!arguments.length) 
			return yRange;
		yRange = _;
		return chart;
	};

	chart.forceX = function(_) {
		if (!arguments.length) 
			return forceX;
		forceX = _;
		return chart;
	};

	chart.color = function(_) {
		if (!arguments.length) 
			return color;
		color = nv.utils.getColor(_);
		return chart;
	};

	chart.id = function(_) {
		if (!arguments.length) 
			return id;
		id = _;
		return chart;
	};

	chart.showValues = function(_) {
		if (!arguments.length) 
			return showValues;
		showValues = _;
		return chart;
	};

	chart.valueFormat= function(_) {
		if (!arguments.length) 
			return valueFormat;
		valueFormat = _;
		return chart;
	};

	chart.rectClass= function(_) {
		if (!arguments.length) 
			return rectClass;
		rectClass = _;
		return chart;
	};


	return chart;
}