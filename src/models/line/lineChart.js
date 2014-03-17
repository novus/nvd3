
nv.models.lineChart = function() {
  "use strict";
  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var lines = nv.models.line()
    , xAxis = nv.models.axis()
    , yAxis = nv.models.axis()
    , interactiveLayer = nv.interactiveGuideline()
    ;

  var canvas = new Chart({
      margin: {
        top     : 30,
        right   : 20,
        bottom  : 50,
        left    : 60
      },
      chartClass: 'lineChart',
      wrapClass: 'linesWrap'
    })
    , color = nv.utils.defaultColor()
    , showXAxis = true
    , showYAxis = true
    , rightAlignYAxis = false
    , useInteractiveGuideline = false
    , tooltips = true
    , tooltip = function(key, x, y) {
        return '<h3>' + key + '</h3>' +
               '<p>' +  y + ' at ' + x + '</p>'
      }
    , x
    , y
    , state = {}
    , defaultState = null
    , dispatch = d3.dispatch('tooltipShow', 'tooltipHide', 'stateChange', 'changeState', 'renderEnd')
    , duration = 250
    ;

  xAxis
    .orient('bottom')
    .tickPadding(7);
  yAxis
    .orient((rightAlignYAxis) ? 'right' : 'left');

  //============================================================


  //============================================================
  // Private Variables
  //------------------------------------------------------------

  var showTooltip = function(e, offsetElement) {
    var left = e.pos[0] + ( offsetElement.offsetLeft || 0 ),
        top = e.pos[1] + ( offsetElement.offsetTop || 0),
        x = xAxis.tickFormat()(lines.x()(e.point, e.pointIndex)),
        y = yAxis.tickFormat()(lines.y()(e.point, e.pointIndex)),
        content = tooltip(e.series.key, x, y);

    nv.tooltip.show([left, top], content, null, null, offsetElement);
  };

  //============================================================

  var renderWatch = nv.utils.renderWatch(dispatch, duration);
  function chart(selection) {
    renderWatch.reset();
    renderWatch.models(lines);
    if (showXAxis) renderWatch.models(xAxis);
    if (showYAxis) renderWatch.models(yAxis);

    selection.each(function(data) {

      canvas.setRoot(this);

      var that = this,
          availableWidth = canvas.available.width,
          availableHeight = canvas.available.height;

      chart.update = function() {
        canvas.svg
          .transition()
          .duration(duration)
          .call(chart)
      };

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

      if (canvas.noData(data))
        return chart;

      //------------------------------------------------------------


      //------------------------------------------------------------
      // Setup Scales

      x = lines.xScale();
      y = lines.yScale();

      //------------------------------------------------------------


      //------------------------------------------------------------
      // Setup containers and skeleton of chart

      canvas.wrapChart(data, ['nv-interactive']);

      if (rightAlignYAxis)
          canvas.g.select(".nv-y.nv-axis")
              .attr("transform", "translate(" + availableWidth + ",0)");

      //------------------------------------------------------------
      // Main Chart Component(s)

      //------------------------------------------------------------
      //Set up interactive layer
      if (useInteractiveGuideline) {
        interactiveLayer
          .width(availableWidth)
          .height(availableHeight)
          .margin({
             left: canvas.margin.left,
             top: canvas.margin.top
           })
          .svgContainer(canvas.svg)
          .xScale(x);
        canvas.wrap.select(".nv-interactive").call(interactiveLayer);
      }

      lines
        .width(availableWidth)
        .height(availableHeight)
        .color(data.map(function(d,i) {
          return d.color || color(d, i);
        })
        .filter(function(d,i) { return !data[i].disabled }));

      var linesWrap = canvas.g.select('.nv-linesWrap')
        .datum(data.filter(function(d) { return !d.disabled }))
        .transition()
        .call(lines);

      //------------------------------------------------------------


      //------------------------------------------------------------
      // Setup Axes

      if (showXAxis) {
        xAxis
          .scale(x)
          .ticks( availableWidth / 100 )
          .tickSize(-availableHeight, 0);
        canvas.g.select('.nv-x.nv-axis')
          .attr('transform', 'translate(0,' + y.range()[0] + ')')
          .transition()
          .call(xAxis);
      }

      if (showYAxis) {
        yAxis
          .scale(y)
          .ticks( availableHeight / 36 )
          .tickSize( -availableWidth, 0);
        canvas.g.select('.nv-y.nv-axis')
          .transition()
          .call(yAxis);
      }

      //============================================================
      // Event Handling/Dispatching (in chart's scope)
      //------------------------------------------------------------

      canvas.legend.dispatch.on('stateChange', function(newState) {
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

          var xValue = xAxis.tickFormat()(chart.x()(singlePoint, pointIndex));
          interactiveLayer.tooltip
            .position({
              left: pointXLocation + canvas.margin.left,
              top: e.mouseY + canvas.margin.top
            })
            .chartContainer(that.parentNode)
            .enabled(tooltips)
            .valueFormatter(function(d) {
             return yAxis.tickFormat()(d);
            })
            .data({
              value: xValue,
              series: allData
            })();

          interactiveLayer.renderGuideLine(pointXLocation);
      });

      interactiveLayer.dispatch.on("elementMouseout",function() {
          dispatch.tooltipHide();
          lines.clearHighlights();
      });

      dispatch
        .on('tooltipShow', function(e) { if (tooltips) showTooltip(e, that.parentNode) })
        .on('changeState', function(e) {
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

    renderWatch.renderEnd('lineChart immediate');
    return chart;
  }

  //============================================================
  // Event Handling/Dispatching (out of chart's scope)
  //------------------------------------------------------------

  lines.dispatch
    .on('elementMouseover.tooltip', function(e) {
      e.pos = [e.pos[0] +  canvas.margin.left, e.pos[1] + canvas.margin.top];
      dispatch.tooltipShow(e);
    })
    .on('elementMouseout.tooltip', function(e) {
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
  chart.legend = canvas.legend;
  chart.xAxis = xAxis;
  chart.yAxis = yAxis;
  chart.interactiveLayer = interactiveLayer;

  d3.rebind(chart, lines, 'defined', 'isArea', 'x', 'y', 'size', 'xScale', 'yScale', 'xDomain', 'yDomain', 'xRange', 'yRange'
    , 'forceX', 'forceY', 'interactive', 'clipEdge', 'clipVoronoi', 'useVoronoi','id', 'interpolate', 'showLegend');

  chart.options = nv.utils.optionsFunc.bind(chart);

  chart.margin = function(_) {
    if (!arguments.length) return canvas.margin;
      canvas.margin.top    = nv.utils.valueOrDefault(_.top, canvas.margin.top);
      canvas.margin.right  = nv.utils.valueOrDefault(_.right, canvas.margin.right);
      canvas.margin.bottom = nv.utils.valueOrDefault(_.bottom, canvas.margin.bottom);
      canvas.margin.left   = nv.utils.valueOrDefault(_.left, canvas.margin.left);
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

  chart.color = function(_) {
    if (!arguments.length) return color;
    color = nv.utils.getColor(_);
    canvas.legend.color(color);
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
    if (!arguments.length) return canvas.options.noData;
    canvas.options.noData = _;
    return chart;
  };

  chart.duration = function(_) {
    if (!arguments.length) return duration;
    duration = _;
    renderWatch.reset(duration);
    lines.duration(duration);
    xAxis.duration(duration);
    yAxis.duration(duration);
    return chart;
  };
  return chart;
};
