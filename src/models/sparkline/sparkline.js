
nv.models.sparkline = function() {
  "use strict";
  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var canvas = new Canvas({
        margin: {top: 2, right: 0, bottom: 2, left: 0}
        , width : 400
        , height : 32
        , chartClass: 'sparkline'
      })
    , animate = true
    , x = d3.scale.linear()
    , y = d3.scale.linear()
    , getX = function(d) { return d.x }
    , getY = function(d) { return d.y }
    , color = nv.utils.getColor(['#000'])
    , xDomain
    , yDomain
    , xRange
    , yRange
    ;

  //============================================================


  function chart(selection) {
    selection.each(function(data) {

      canvas.setRoot(this);
      canvas.wrapChart(data);

      var availableWidth = canvas.available.width,
          availableHeight = canvas.available.height;

      //------------------------------------------------------------
      // Setup Scales

      x.domain(xDomain || d3.extent(data, getX ))
        .range(xRange || [0, availableWidth]);

      y.domain(yDomain || d3.extent(data, getY ))
        .range(yRange || [availableHeight, 0]);

      //------------------------------------------------------------

      var paths = canvas.wrap.selectAll('path')
          .data(function(d) { return [d] });
      paths.enter().append('path');
      paths.exit().remove();
      paths
        .style('stroke', function(d,i) { return d.color || color(d, i) })
        .attr('d', d3.svg.line()
          .x(function(d,i) { return x(getX(d,i)) })
          .y(function(d,i) { return y(getY(d,i)) })
        );

      // TODO: Add CURRENT data point (Need Min, Mac, Current / Most recent)
      var points = canvas.wrap.selectAll('circle.nv-point')
        .data(function(data) {
          var yValues = data.map(function(d, i) { return getY(d,i); });
          function pointIndex(index) {
            if (index != -1) {
	        var result = data[index];
                result.pointIndex = index;
                return result;
            } else
                return null;
          }
          var maxPoint = pointIndex(yValues.lastIndexOf(y.domain()[1])),
              minPoint = pointIndex(yValues.indexOf(y.domain()[0])),
              currentPoint = pointIndex(yValues.length - 1);
          return [minPoint, maxPoint, currentPoint].filter(function (d) {return d != null;});
        });
      points.enter().append('circle');
      points.exit().remove();
      points
        .attr('cx', function(d) { return x(getX(d,d.pointIndex)) })
        .attr('cy', function(d) { return y(getY(d,d.pointIndex)) })
        .attr('r', 2)
        .attr('class', function(d) {
            return getX(d, d.pointIndex) == x.domain()[1] ? 'nv-point nv-currentValue' :
                   getY(d, d.pointIndex) == y.domain()[0] ? 'nv-point nv-minValue' : 'nv-point nv-maxValue'
          });
    });

    return chart;
  }


  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------
  chart.options = nv.utils.optionsFunc.bind(chart);
  
  chart.margin = function(_) {
    if (!arguments.length) return canvas.margin;
    canvas.margin.top    = typeof _.top    != 'undefined' ? _.top    : canvas.margin.top;
    canvas.margin.right  = typeof _.right  != 'undefined' ? _.right  : canvas.margin.right;
    canvas.margin.bottom = typeof _.bottom != 'undefined' ? _.bottom : canvas.margin.bottom;
    canvas.margin.left   = typeof _.left   != 'undefined' ? _.left   : canvas.margin.left;
    return chart;
  };

  chart.width = function(_) {
    if (!arguments.length) return canvas.options.size.width;
    canvas.options.size.width = _;
    return chart;
  };

  chart.height = function(_) {
    if (!arguments.length) return canvas.options.size.height;
    canvas.options.size.height = _;
    return chart;
  };

  chart.x = function(_) {
    if (!arguments.length) return getX;
    getX = d3.functor(_);
    return chart;
  };

  chart.y = function(_) {
    if (!arguments.length) return getY;
    getY = d3.functor(_);
    return chart;
  };

  chart.xScale = function(_) {
    if (!arguments.length) return x;
    x = _;
    return chart;
  };

  chart.yScale = function(_) {
    if (!arguments.length) return y;
    y = _;
    return chart;
  };

  chart.xDomain = function(_) {
    if (!arguments.length) return xDomain;
    xDomain = _;
    return chart;
  };

  chart.yDomain = function(_) {
    if (!arguments.length) return yDomain;
    yDomain = _;
    return chart;
  };

  chart.xRange = function(_) {
    if (!arguments.length) return xRange;
    xRange = _;
    return chart;
  };

  chart.yRange = function(_) {
    if (!arguments.length) return yRange;
    yRange = _;
    return chart;
  };

  chart.animate = function(_) {
    if (!arguments.length) return animate;
    animate = _;
    return chart;
  };

  chart.color = function(_) {
    if (!arguments.length) return color;
    color = nv.utils.getColor(_);
    return chart;
  };

  //============================================================

  return chart;
};
