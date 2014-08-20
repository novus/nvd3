
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
    selection.each(function(data) {
      var availableWidth = width - margin.left - margin.right,
      availableHeight = height - margin.top - margin.bottom,
      container = d3.select(this);

      // domain raw data
      var seriesData = (xDomain && yDomain) ? [] : // if we know xDomain and yDomain, no need to calculate
        data.map(function(d) {
          return d.values.map(function(d,i) {
            return { x: getX(d,i), y: getY(d,i) }
          });
        });

      // X domain ex: x.domain([0,183]); 
      x.domain(xDomain || d3.extent(d3.merge(seriesData).map(function(d) { return d.x }).concat(forceX)));

      // Y domain ex: y.domain(['A','B','C','D']); Range : equaling height value (0.1x for padding)
      y.domain(yDomain || d3.merge(seriesData).map(function(d) { return d.y }) )
       .rangeBands(yRange || [0, availableHeight], .1);

      // show the value label of each bar 
      if(showValues) {
        // customizing when showValues
        x.range(xRange || [ 0, availableWidth]);
      } else {
        x.range(xRange || [ 0, availableWidth]);
      }

      /* Setup containers and skeleton of chart */
      var wrap = container.selectAll('g.nv-wrap.nv-horizontalbar').data([data]),
        wrapEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap nv-horizontalbar'),
        gEnter = wrapEnter.append('g'),
        g = wrap.select('g');

      gEnter.append('g').attr('class', 'nv-groups');

			wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

			//TODO: by definition, the discrete bar should not have multiple groups, will modify/remove later
			var groups = wrap.select('.nv-groups').selectAll('.nv-group')
			  .data(function(d) { return d }, function(d) { return d.key });
			groups.enter().append('g')
			  .style('stroke-opacity', 1e-6)
			  .style('fill-opacity', 1e-6);
			groups.exit()
			  .transition()
			  .style('stroke-opacity', 1e-6)
			  .style('fill-opacity', 1e-6)
			  .remove();
			groups
			  .attr('class', function(d,i) { return 'nv-group nv-series-' + i })
			  .classed('hover', function(d) { return d.hover });
			groups
			  .transition()
			  .style('stroke-opacity', 1)
			  .style('fill-opacity', .75);			

			var bars = groups.selectAll('g.nv-bar')
				.data(function(d) { 
					return d.values; 
				});

			bars.exit().remove();

			var barsEnter = bars.enter().append('g')
				.attr('transform', function(d,i,j) {
					return 'translate(' + x(0) + ', ' + (y(getY(d,i)) + y.rangeBand() * .05 ) + ')';
				})
				.on('mouseover', function(d,i) {
          d3.select(this).classed('hover', true);
          dispatch.elementMouseover({
            value: getX(d,i),
            point: d,
            series: data[0],
            pos: [ x(getX(d,i)),  y(getY(d,i)) + (y.rangeBand() * .5 ) ],  // TODO: Figure out why the value appears to be shifted
            pointIndex: i,
            seriesIndex: 0,
            e: d3.event
          });
				})
				.on('mouseout', function(d,i) {
          d3.select(this).classed('hover', false);
          dispatch.elementMouseout({
            value: getX(d,i),
            point: d,
            series: data[0],
            pointIndex: i,
            seriesIndex: 0,
            e: d3.event
          });
				})
				.on('click', function(d,i) {
          dispatch.elementClick({
            value: getX(d,i),
            point: d,
            series: data[0],
            pos: [ x(getX(d,i)), y(getY(d,i)) + (y.rangeBand() * .5 ) ],  // TODO: Figure out why the value appears to be shifted
            pointIndex: i,
            seriesIndex: 0,
            e: d3.event
          });
          d3.event.stopPropagation();
				})
				.on('dbclick', function(d,i) {
          dispatch.elementDblClick({
            value: getX(d,i),
            point: d,
            series: data[0],
            pos: [ x(getX(d,i)), y(getY(d,i)) + (y.rangeBand() * .5 ) ],  // TODO: Figure out why the value appears to be shifted
            pointIndex: i,
            seriesIndex: 0,
            e: d3.event
          });
          d3.event.stopPropagation();
				});

			// bars' attributes
			barsEnter.append('rect')
				.attr('height', y.rangeBand() * .9 / data.length)
				.attr('width', 0 );
			
			if(showValues) {
				barsEnter
					.append('text')
					.append('text-anchor', 'middle')
				;

				bars.select('text')
					.text(function(d,i) {
						return valueFormat(getX(d,i));
					})
					.transition()
					.attr('x', function(d,i) {
						//customizing text label position
						return getX(d,i) > 0 ? x(getX(d,i)) - x(0) + 10 : 10 ;
					})
					.attr('y', y.rangeBand() * .9 / 2 )
					;
			} else {
				bars.selectAll('text').remove();
			}

			bars
				.attr('class', function(d,i) {
					return getX(d,i) < 0 ? 'nv-bar negative' : 'nv-bar positive';
				})
				.style('fill', function(d,i) {
					return d.color || color(d,i);
				})
				.style('stroke', function(d,i) {
					return d.color || color(d,i);
				})
				.select('rect')
				.attr('class', rectClass)
				.transition()
				.attr('height', y.rangeBand() * .9 / data.length )
				;

			bars.transition()
				.attr('transform', function(d,i) {
					var top = y(getY(d,i)) + y.rangeBand() * .05,
						left =  x(getX(d,i)) - x(0) < 1 ? 1 : x(0) + 1;
					return 'translate(' + left + ', ' + top + ')';
				})
				.select('rect')
				.attr('width' , function(d,i) {
					return Math.max(Math.abs( x(getX(d,i)) - x( (xDomain && xDomain[0]) || 0 ) ) || 1);
				});
			x0 = x.copy();
			y0 = y.copy();
		});

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