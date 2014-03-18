
nv.models.stackedAreaChart = function() {
  "use strict";
  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var stacked = nv.models.stackedArea()
    , xAxis = nv.models.axis()
    , yAxis = nv.models.axis()
    , legend = nv.models.legend()
    , controls = nv.models.legend()
    , interactiveLayer = nv.interactiveGuideline()
    ;

  var canvas = new Canvas({
          margin: {top: 30, right: 25, bottom: 50, left: 60}
          , chartClass: 'stackedAreaChart'
          , wrapClass: 'stackedAreaChartWrap'
      })
    , color = nv.utils.defaultColor() // a function that takes in d, i and returns color
    , showControls = true
    , showXAxis = true
    , showYAxis = true
    , rightAlignYAxis = false
    , useInteractiveGuideline = false
    , tooltips = true
    , tooltip = function(key, x, y) {
        return '<h3>' + key + '</h3>' +
               '<p>' +  y + ' on ' + x + '</p>'
      }
    , x //can be accessed via chart.xScale()
    , y //can be accessed via chart.yScale()
    , yAxisTickFormat = d3.format(',.2f')
    , state = { style: stacked.style() }
    , defaultState = null
    , dispatch = d3.dispatch('tooltipShow', 'tooltipHide', 'stateChange', 'changeState', 'renderEnd')
    , controlWidth = 250
    , cData = ['Stacked','Stream','Expanded']
    , controlLabels = {}
    , duration = 250
    ;

  xAxis
    .orient('bottom')
    .tickPadding(7)
    ;
  yAxis
    .orient((rightAlignYAxis) ? 'right' : 'left')
    ;

  controls.updateState(false);
  //============================================================


  //============================================================
  // Private Variables
  //------------------------------------------------------------

  var showTooltip = function(e, offsetElement) {
    var left = e.pos[0] + ( offsetElement.offsetLeft || 0 ),
        top = e.pos[1] + ( offsetElement.offsetTop || 0),
        x = xAxis.tickFormat()(stacked.x()(e.point, e.pointIndex)),
        y = yAxis.tickFormat()(stacked.y()(e.point, e.pointIndex)),
        content = tooltip(e.series.key, x, y);

    nv.tooltip.show([left, top], content, e.value < 0 ? 'n' : 's', null, offsetElement);
  };

  var renderWatch = nv.utils.renderWatch(dispatch, duration);
  //============================================================

  function chart(selection) {
      
    renderWatch.reset();
    renderWatch.models(stacked);
    if (showXAxis) renderWatch.models(xAxis);
    if (showYAxis) renderWatch.models(yAxis);

    selection.each(function(data) {
        
      canvas.setRoot(this);
      if (canvas.noData(data))
        return chart;

      var that = this,
        availableWidth = canvas.available.width,
        availableHeight = canvas.available.height;

      chart.update = function() { canvas.svg.transition().duration(duration).call(chart); };
      chart.container = this;

      //set state.disabled
      state.disabled = data.map(function(d) { return !!d.disabled });

      if (!defaultState) {
        var key;
        defaultState = {};
        for (key in state) {
          if (state[key] instanceof Array) defaultState[key] = state[key].slice(0);
          else defaultState[key] = state[key];
        }
      }

      //------------------------------------------------------------
      // Setup Scales

      x = stacked.xScale();
      y = stacked.yScale();

      //------------------------------------------------------------

      //------------------------------------------------------------
      // Setup containers and skeleton of chart

      canvas.wrapChart(data);

      canvas.gEnter.append("rect").style("opacity",0);
      canvas.gEnter.append('g').attr('class', 'nv-x nv-axis');
      canvas.gEnter.append('g').attr('class', 'nv-y nv-axis');
      canvas.gEnter.append('g').attr('class', 'nv-stackedWrap');
      canvas.gEnter.append('g').attr('class', 'nv-legendWrap');
      canvas.gEnter.append('g').attr('class', 'nv-controlsWrap');
      canvas.gEnter.append('g').attr('class', 'nv-interactive');
      canvas.g.select("rect").attr("width", availableWidth).attr("height", availableHeight);

      //------------------------------------------------------------
      // Legend

      if (canvas.options.showLegend) {
        var legendWidth = (showControls) ? availableWidth - controlWidth : availableWidth;

        legend.width(legendWidth);

        canvas.g.select('.nv-legendWrap')
          .datum(data)
          .call(legend);

        if ( canvas.margin.top != legend.height()) {
          canvas.margin.top = legend.height();
          availableHeight = (canvas.options.size.height || parseInt(canvas.svg.style('height')) || 400) - canvas.margin.top - canvas.margin.bottom;
        }

        canvas.g.select('.nv-legendWrap')
          .attr('transform', 'translate(' + (availableWidth-legendWidth) + ',' + (-canvas.margin.top) +')');
      }

      //------------------------------------------------------------

      //------------------------------------------------------------
      // Controls

      if (showControls) {
        var controlsData = [
          {
            key     : controlLabels.stacked || 'Stacked',
            metaKey : 'Stacked',
            disabled: stacked.style() != 'stack',
            style   : 'stack'
          },
          {
            key     : controlLabels.stream || 'Stream',
            metaKey : 'Stream',
            disabled: stacked.style() != 'stream',
            style   : 'stream'
          },
          {
            key     : controlLabels.expanded || 'Expanded',
            metaKey : 'Expanded',
            disabled: stacked.style() != 'expand',
            style   : 'expand'
          },
          {
            key     : controlLabels.stack_percent || 'Stack %',
            metaKey : 'Stack_Percent',
            disabled: stacked.style() != 'stack_percent',
            style   : 'stack_percent'
          }
        ];

        controlWidth = (cData.length/3) * 260;

        controlsData = controlsData.filter(function(d) { return cData.indexOf(d.metaKey) !== -1 });

        controls
          .width( controlWidth )
          .color(['#444', '#444', '#444']);

        canvas.g.select('.nv-controlsWrap')
          .datum(controlsData)
          .call(controls);

        if ( canvas.margin.top != Math.max(controls.height(), legend.height()) ) {
          canvas.margin.top = Math.max(controls.height(), legend.height());
          availableHeight = (height || parseInt(canvas.svg.style('height')) || 400)
                             - canvas.margin.top - canvas.margin.bottom;
        }

        canvas.g.select('.nv-controlsWrap')
          .attr('transform', 'translate(0,' + (-canvas.margin.top) +')');
      }

      //------------------------------------------------------------

      canvas.wrap.attr('transform', 'translate(' + canvas.margin.left + ',' + canvas.margin.top + ')');

      if (rightAlignYAxis) {
        canvas.g.select(".nv-y.nv-axis")
          .attr("transform", "translate(" + availableWidth + ",0)");
      }

      //------------------------------------------------------------
      // Main Chart Component(s)

      //------------------------------------------------------------
      //Set up interactive layer
      if (useInteractiveGuideline) {
        interactiveLayer
           .width(availableWidth)
           .height(availableHeight)
           .margin({left: canvas.margin.left, top: canvas.margin.top})
           .svgContainer(canvas.svg)
           .xScale(x);
        canvas.wrap.select(".nv-interactive").call(interactiveLayer);
      }

      stacked
        .width(availableWidth)
        .height(availableHeight);

      var stackedWrap = canvas.g.select('.nv-stackedWrap')
          .datum(data);

      stackedWrap.transition().call(stacked);

      //------------------------------------------------------------

      //------------------------------------------------------------
      // Setup Axes

      if (showXAxis) {
        xAxis
            .scale(x)
          .ticks( availableWidth / 100 )
          .tickSize( -availableHeight, 0);

        canvas.g.select('.nv-x.nv-axis')
          .attr('transform', 'translate(0,' + availableHeight + ')')
          .transition().duration(0)
          .call(xAxis);
      }

      if (showYAxis) {
        yAxis
          .scale(y)
          .ticks(stacked.offset() == 'wiggle' ? 0 : availableHeight / 36)
          .tickSize(-availableWidth, 0)
          .setTickFormat(
                (stacked.style() == 'expand' || stacked.style() == 'stack_percent') ? d3.format('%') : yAxisTickFormat
            );

        canvas.g.select('.nv-y.nv-axis')
          .transition().duration(0)
          .call(yAxis);
      }

      //------------------------------------------------------------

      //============================================================
      // Event Handling/Dispatching (in chart's scope)
      //------------------------------------------------------------

      stacked.dispatch
        .on('areaClick.toggle', function(e) {
          if (data.filter(function(d) { return !d.disabled }).length === 1)
            data.forEach(function(d) { d.disabled = false });
          else
            data.forEach(function(d,i) { d.disabled = (i != e.seriesIndex) });
        state.disabled = data.map(function(d) { return !!d.disabled });
        dispatch.stateChange(state);
        chart.update();
      });

      legend.dispatch.on('stateChange', function(newState) {
        state.disabled = newState.disabled;
        dispatch.stateChange(state);
        chart.update();
      });

      controls.dispatch.on('legendClick', function(d) {
        if (!d.disabled)  return;
        controlsData = controlsData.map(function(s) { s.disabled = true; return s });
        d.disabled = false;
        stacked.style(d.style);
        state.style = stacked.style();
        dispatch.stateChange(state);
        chart.update();
      });

      interactiveLayer.dispatch.on('elementMousemove', function(e) {
          stacked.clearHighlights();
          var singlePoint, pointIndex, pointXLocation, allData = [];
          data
            .filter(function(series, i) { series.seriesIndex = i; return !series.disabled })
            .forEach(function(series,i) {
              pointIndex = nv.interactiveBisect(series.values, e.pointXValue, chart.x());
              stacked.highlightPoint(i, pointIndex, true);

              var point = series.values[pointIndex];
              if (typeof point === 'undefined') return;
              if (typeof singlePoint === 'undefined') singlePoint = point;
              if (typeof pointXLocation === 'undefined') pointXLocation = chart.xScale()(chart.x()(point,pointIndex));

              //If we are in 'expand' mode, use the stacked percent value instead of raw value.
              var tooltipValue = (stacked.style() == 'expand') ? point.display.y : chart.y()(point,pointIndex);
              allData.push({
                  key: series.key,
                  value: tooltipValue,
                  color: color(series,series.seriesIndex),
                  stackedValue: point.display
              });
            });

          allData.reverse();

          //Highlight the tooltip entry based on which stack the mouse is closest to.
          if (allData.length > 2) {
            var yValue = chart.yScale().invert(e.mouseY);
            var yDistMax = Infinity, indexToHighlight = null;
            allData.forEach(function(series,i) {

               //To handle situation where the stacked area chart is negative, we need to use absolute values
               //when checking if the mouse Y value is within the stack area.
               yValue = Math.abs(yValue);
               var stackedY0 = Math.abs(series.stackedValue.y0);
               var stackedY = Math.abs(series.stackedValue.y);
               if ( yValue >= stackedY0 && yValue <= (stackedY + stackedY0)) {
                  indexToHighlight = i;
                  return;
               }
            });
            if (indexToHighlight != null)
               allData[indexToHighlight].highlight = true;
          }

          var xValue = xAxis.tickFormat()(chart.x()(singlePoint,pointIndex));

          //If we are in 'expand' mode, force the format to be a percentage.
          var valueFormatter = (stacked.style() == 'expand') ?
               function(d) {return d3.format(".1%")(d);} :
               function(d) {return yAxis.tickFormat()(d); };
          interactiveLayer.tooltip
                  .position({left: pointXLocation + canvas.margin.left, top: e.mouseY + canvas.margin.top})
                  .chartContainer(that.parentNode)
                  .enabled(tooltips)
                  .valueFormatter(valueFormatter)
                  .data(
                      {
                        value: xValue,
                        series: allData
                      }
                  )();

          interactiveLayer.renderGuideLine(pointXLocation);
      });

      interactiveLayer.dispatch.on("elementMouseout",function() {
        dispatch.tooltipHide();
        stacked.clearHighlights();
      });

      dispatch
        .on('tooltipShow', function(e) {
          if (tooltips)
              showTooltip(e, that.parentNode);
        })
        .on('changeState', function(e) { // Update chart from a state object passed to event handler
          if (typeof e.disabled !== 'undefined' && data.length === e.disabled.length) {
            data.forEach(function(series,i) { series.disabled = e.disabled[i] });
            state.disabled = e.disabled;
          }
          if (typeof e.style !== 'undefined')
              stacked.style(e.style);
          chart.update();
        });

    });

    renderWatch.renderEnd('stacked Area chart immediate');
    return chart;
  }


  //============================================================
  // Event Handling/Dispatching (out of chart's scope)
  //------------------------------------------------------------

  stacked.dispatch
    .on('tooltipShow', function(e) {
      //disable tooltips when value ~= 0
      //// TODO: consider removing points from voronoi that have 0 value instead of this hack
      /*
      if (!Math.round(stacked.y()(e.point) * 100)) {  // 100 will not be good for very small numbers... will have to think about making this valu dynamic, based on data range
        setTimeout(function() { d3.selectAll('.point.hover').classed('hover', false) }, 0);
        return false;
      }
      */

      e.pos = [e.pos[0] + canvas.margin.left, e.pos[1] + canvas.margin.top];
      dispatch.tooltipShow(e);
    })
    .on('tooltipHide', function(e) {
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
  chart.stacked = stacked;
  chart.legend = legend;
  chart.controls = controls;
  chart.xAxis = xAxis;
  chart.yAxis = yAxis;
  chart.interactiveLayer = interactiveLayer;

  d3.rebind(chart, stacked, 'x', 'y', 'size', 'xScale', 'yScale', 'xDomain', 'yDomain', 'xRange', 'yRange', 'sizeDomain',
      'interactive', 'useVoronoi', 'offset', 'order', 'style', 'clipEdge', 'forceX', 'forceY', 'forceSize', 'interpolate');

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
    legend.color(color);
    stacked.color(color);
    return chart;
  };

  chart.showControls = function(_) {
    if (!arguments.length) return showControls;
    showControls = _;
    return chart;
  };

  chart.showLegend = function(_) {
    if (!arguments.length) return canvas.options.showLegend;
    canvas.options.showLegend = _;
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

  chart.tooltip = function(_) {
    if (!arguments.length) return tooltip;
    tooltip = _;
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

  chart.transitionDuration = function(_) {
    if (!arguments.length) return duration;
    duration = _;
    return chart;
  };

  chart.controlsData = function(_) {
    if (!arguments.length) return cData;
    cData = _;
    return chart;
  };

  chart.controlLabels = function(_) {
    if (!arguments.length) return controlLabels;
    if (typeof _ !== 'object') return controlLabels;
    controlLabels = _;
    return chart;
  };

  yAxis.setTickFormat = yAxis.tickFormat;

  yAxis.tickFormat = function(_) {
    if (!arguments.length) return yAxisTickFormat;
    yAxisTickFormat = _;
    return yAxis;
  };

  chart.duration = function(_) {
    if (!arguments.length) return duration;
    duration = _;
    renderWatch.reset(duration);
    // stacked.duration(duration);
    xAxis.duration(duration);
    yAxis.duration(duration);
    return chart;
  };

  return chart;
};
