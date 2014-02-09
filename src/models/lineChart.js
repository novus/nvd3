
nv.models.lineChart = function() {
  "use strict";
  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var lines = nv.models.line()
    , xAxis = nv.models.axis()
    , yAxis = nv.models.axis()
    , legend = nv.models.legend()
    , interactiveLayer = nv.interactiveGuideline()
    ;

  var canvas
    , options = {
      margin: {
        top: 30,
        right: 20,
        bottom: 50,
        left: 60
      }
    }
    , color = nv.utils.defaultColor()
    , showLegend = true
    , showXAxis = true
    , showYAxis = true
    , rightAlignYAxis = false
    , useInteractiveGuideline = false
    , tooltips = true
    , tooltip = function(key, x, y, e, graph) {
        return '<h3>' + key + '</h3>' +
               '<p>' +  y + ' at ' + x + '</p>'
      }
    , x
    , y
    , state = {}
    , defaultState = null
    , noData = 'No Data Available.'
    , dispatch = d3.dispatch('tooltipShow', 'tooltipHide', 'stateChange', 'changeState')
    , transitionDuration = 250
    ;

  xAxis
    .orient('bottom')
    .tickPadding(7)
    ;
  yAxis
    .orient((rightAlignYAxis) ? 'right' : 'left')
    ;

  //============================================================


  //============================================================
  // Private Variables
  //------------------------------------------------------------

  var showTooltip = function(e, offsetElement) {
    var left = e.pos[0] + ( offsetElement.offsetLeft || 0 ),
        top = e.pos[1] + ( offsetElement.offsetTop || 0),
        x = xAxis.tickFormat()(lines.x()(e.point, e.pointIndex)),
        y = yAxis.tickFormat()(lines.y()(e.point, e.pointIndex)),
        content = tooltip(e.series.key, x, y, e, chart);

    nv.tooltip.show([left, top], content, null, null, offsetElement);
  };

  //============================================================


  function chart(selection) {
    selection.each(function(data) {
      canvas = new Canvas(this, options);
      var container = canvas.svg;
      var that = this;

      chart.update = function() { container.transition().duration(transitionDuration).call(chart) };
      chart.container = this;

      //set state.disabled
      state.disabled = data.map(function(d) { return !!d.disabled });

      if (!defaultState) {
        var key;
        defaultState = {};
        for (key in state) {
          if (state[key] instanceof Array)
            defaultState[key] = state[key].slice(0);
          else
            defaultState[key] = state[key];
        }
      }

      //------------------------------------------------------------
      // Display noData message if there's nothing to show.

      if (!data || !data.length || !data.filter(function(d) { return d.values.length }).length) {
        var noDataText = container.selectAll('.nv-noData').data([noData]);

        noDataText.enter().append('text')
          .attr('class', 'nvd3 nv-noData')
          .attr('dy', '-.7em')
          .style('text-anchor', 'middle');

        noDataText
          .attr('x', canvas.size.width / 2)
          .attr('y', canvas.size.height / 2)
          .text(function(d) { return d });

        return chart;
      } else {
        container.selectAll('.nv-noData').remove();
      }

      //------------------------------------------------------------


      //------------------------------------------------------------
      // Setup Scales

      x = lines.xScale();
      y = lines.yScale();

      //------------------------------------------------------------


      //------------------------------------------------------------
      // Setup containers and skeleton of chart

      var wrap = container.selectAll('g.nv-wrap.nv-lineChart').data([data]);
      var gEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap nv-lineChart').append('g');
      var g = wrap.select('g');

      gEnter.append("rect").style("opacity",0);
      gEnter.append('g').attr('class', 'nv-x nv-axis');
      gEnter.append('g').attr('class', 'nv-y nv-axis');
      gEnter.append('g').attr('class', 'nv-linesWrap');
      gEnter.append('g').attr('class', 'nv-legendWrap');
      gEnter.append('g').attr('class', 'nv-interactive');

      g.select("rect")
        .attr({
          width: canvas.available.width,
          height : (canvas.available.height > 0) ? canvas.available.height : 0
        });

      //------------------------------------------------------------
      // Legend

      if (showLegend) {
        legend.width(canvas.size.width);

        g.select('.nv-legendWrap')
            .datum(data)
            .call(legend);

        if ( canvas.margin.top != legend.height()) {
          canvas.margin.top = legend.height();
          canvas.available.height = canvas.size.height - canvas.margin.topbottom;
        }

        wrap.select('.nv-legendWrap')
            .attr('transform', 'translate(0,' + (-canvas.margin.top) +')')
      }

      //------------------------------------------------------------

      wrap.attr('transform', 'translate(' + canvas.margin.left + ',' + canvas.margin.top + ')');

      if (rightAlignYAxis) {
          g.select(".nv-y.nv-axis")
              .attr("transform", "translate(" + canvas.available.width + ",0)");
      }

      //------------------------------------------------------------
      // Main Chart Component(s)


      //------------------------------------------------------------
      //Set up interactive layer
      if (useInteractiveGuideline) {
        interactiveLayer
           .width(canvas.available.width)
           .height(canvas.available.height)
           .margin({
              left: canvas.margin.left,
              top: canvas.margin.top
            })
           .svgContainer(container)
           .xScale(x);
        wrap.select(".nv-interactive").call(interactiveLayer);
      }


      lines
        .width(canvas.available.width)
        .height(canvas.available.height)
        .color(data.map(function(d,i) {
          return d.color || color(d, i);
        }).filter(function(d,i) { return !data[i].disabled }));


      var linesWrap = g.select('.nv-linesWrap')
          .datum(data.filter(function(d) { return !d.disabled }))

      linesWrap.transition().call(lines);

      //------------------------------------------------------------


      //------------------------------------------------------------
      // Setup Axes

      if (showXAxis) {
        xAxis
          .scale(x)
          .ticks( canvas.available.width / 100 )
          .tickSize(-canvas.available.height, 0);

        g.select('.nv-x.nv-axis')
            .attr('transform', 'translate(0,' + y.range()[0] + ')');
        g.select('.nv-x.nv-axis')
            .transition()
            .call(xAxis);
      }

      if (showYAxis) {
        yAxis
          .scale(y)
          .ticks( canvas.available.height / 36 )
          .tickSize( -canvas.available.width, 0);

        g.select('.nv-y.nv-axis')
            .transition()
            .call(yAxis);
      }

      //============================================================
      // Event Handling/Dispatching (in chart's scope)
      //------------------------------------------------------------

      legend.dispatch.on('stateChange', function(newState) {
          state = newState;
          dispatch.stateChange(state);
          chart.update();
      });

      interactiveLayer.dispatch.on('elementMousemove', function(e) {
          lines.clearHighlights();
          var singlePoint, pointIndex, pointXLocation, allData = [];
          data
          .filter(function(series, i) {
            series.seriesIndex = i;
            return !series.disabled;
          })
          .forEach(function(series,i) {
              pointIndex = nv.interactiveBisect(series.values, e.pointXValue, chart.x());
              lines.highlightPoint(i, pointIndex, true);
              var point = series.values[pointIndex];
              if (typeof point === 'undefined') return;
              if (typeof singlePoint === 'undefined') singlePoint = point;
              if (typeof pointXLocation === 'undefined') pointXLocation = chart.xScale()(chart.x()(point,pointIndex));
              allData.push({
                  key: series.key,
                  value: chart.y()(point, pointIndex),
                  color: color(series,series.seriesIndex)
              });
          });
          //Highlight the tooltip entry based on which point the mouse is closest to.
          if (allData.length > 2) {
            var yValue = chart.yScale().invert(e.mouseY);
            var domainExtent = Math.abs(chart.yScale().domain()[0] - chart.yScale().domain()[1]);
            var threshold = 0.03 * domainExtent;
            var indexToHighlight = nv.nearestValueIndex(allData.map(function(d){return d.value}),yValue,threshold);
            if (indexToHighlight !== null)
              allData[indexToHighlight].highlight = true;
          }

          var xValue = xAxis.tickFormat()(chart.x()(singlePoint,pointIndex));
          interactiveLayer.tooltip
                  .position({left: pointXLocation + margin.left, top: e.mouseY + margin.top})
                  .chartContainer(that.parentNode)
                  .enabled(tooltips)
                  .valueFormatter(function(d,i) {
                     return yAxis.tickFormat()(d);
                  })
                  .data(
                      {
                        value: xValue,
                        series: allData
                      }
                  )();

          interactiveLayer.renderGuideLine(pointXLocation);

      });

      interactiveLayer.dispatch.on("elementMouseout",function(e) {
          dispatch.tooltipHide();
          lines.clearHighlights();
      });

      dispatch.on('tooltipShow', function(e) {
        if (tooltips) showTooltip(e, that.parentNode);
      });


      dispatch.on('changeState', function(e) {

        if (typeof e.disabled !== 'undefined' && data.length === e.disabled.length) {
          data.forEach(function(series,i) {
            series.disabled = e.disabled[i];
          });

          state.disabled = e.disabled;
        }

        chart.update();
      });

      //============================================================

    });

    return chart;
  }


  //============================================================
  // Event Handling/Dispatching (out of chart's scope)
  //------------------------------------------------------------

  lines.dispatch.on('elementMouseover.tooltip', function(e) {
    e.pos = [e.pos[0] +  margin.left, e.pos[1] + margin.top];
    dispatch.tooltipShow(e);
  });

  lines.dispatch.on('elementMouseout.tooltip', function(e) {
    dispatch.tooltipHide(e);
  });

  dispatch.on('tooltipHide', function() {
    if (tooltips) nv.tooltip.cleanup();
  });

  //============================================================


  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  // expose chart's sub-components
  chart.dispatch = dispatch;
  chart.lines = lines;
  chart.legend = legend;
  chart.xAxis = xAxis;
  chart.yAxis = yAxis;
  chart.interactiveLayer = interactiveLayer;

  d3.rebind(chart, lines, 'defined', 'isArea', 'x', 'y', 'size', 'xScale', 'yScale', 'xDomain', 'yDomain', 'xRange', 'yRange'
    , 'forceX', 'forceY', 'interactive', 'clipEdge', 'clipVoronoi', 'useVoronoi','id', 'interpolate');

  chart.options = nv.utils.optionsFunc.bind(chart);

  chart.margin = function(_) {
    if (!arguments.length) return options.margin;
    options.margin.top    = typeof _.top    != 'undefined' ? _.top    : options.margin.top;
    options.margin.right  = typeof _.right  != 'undefined' ? _.right  : options.margin.right;
    options.margin.bottom = typeof _.bottom != 'undefined' ? _.bottom : options.margin.bottom;
    options.margin.left   = typeof _.left   != 'undefined' ? _.left   : options.margin.left;
    return chart;
  };

  chart.width = function(_) {
    if (!arguments.length) return width;
    width = _;
    return chart;
  };

  chart.height = function(_) {
    if (!arguments.length) return height;
    height = _;
    return chart;
  };

  chart.color = function(_) {
    if (!arguments.length) return color;
    color = nv.utils.getColor(_);
    legend.color(color);
    return chart;
  };

  chart.showLegend = function(_) {
    if (!arguments.length) return showLegend;
    showLegend = _;
    return chart;
  };

  chart.showXAxis = function(_) {
    if (!arguments.length) return showXAxis;
    showXAxis = _;
    return chart;
  };

  chart.showYAxis = function(_) {
    if (!arguments.length) return showYAxis;
    showYAxis = _;
    return chart;
  };

  chart.rightAlignYAxis = function(_) {
    if(!arguments.length) return rightAlignYAxis;
    rightAlignYAxis = _;
    yAxis.orient( (_) ? 'right' : 'left');
    return chart;
  };

  chart.useInteractiveGuideline = function(_) {
    if(!arguments.length) return useInteractiveGuideline;
    useInteractiveGuideline = _;
    if (_ === true) {
       chart.interactive(false);
       chart.useVoronoi(false);
    }
    return chart;
  };

  chart.tooltips = function(_) {
    if (!arguments.length) return tooltips;
    tooltips = _;
    return chart;
  };

  chart.tooltipContent = function(_) {
    if (!arguments.length) return tooltip;
    tooltip = _;
    return chart;
  };

  chart.state = function(_) {
    if (!arguments.length) return state;
    state = _;
    return chart;
  };

  chart.defaultState = function(_) {
    if (!arguments.length) return defaultState;
    defaultState = _;
    return chart;
  };

  chart.noData = function(_) {
    if (!arguments.length) return noData;
    noData = _;
    return chart;
  };

  chart.transitionDuration = function(_) {
    if (!arguments.length) return transitionDuration;
    transitionDuration = _;
    return chart;
  };

  //============================================================


  return chart;
}
