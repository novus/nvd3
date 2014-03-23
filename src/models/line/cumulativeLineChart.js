
nv.models.cumulativeLineChart = function() {
  "use strict";
  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var lines = nv.models.line()
    , xAxis = nv.models.axis()
    , yAxis = nv.models.axis()
    , legend = nv.models.legend()
    , controls = nv.models.legend()
    , interactiveLayer = nv.interactiveGuideline()
    ;

  var Layer = new Layer({
        margin: {top: 30, right: 30, bottom: 50, left: 60}
        , chartClass: 'cumulativeLine'
      })
    , color = nv.utils.defaultColor()
    , showXAxis = true
    , showYAxis = true
    , rightAlignYAxis = false
    , tooltips = true
    , showControls = true
    , useInteractiveGuideline = false
    , rescaleY = true
    , tooltip = function(key, x, y) {
        return '<h3>' + key + '</h3>' +
               '<p>' +  y + ' at ' + x + '</p>'
      }
    , x //can be accessed via chart.xScale()
    , y //can be accessed via chart.yScale()
    , id = lines.id()
    , state = { index: 0, rescaleY: rescaleY }
    , defaultState = null
    , average = function(d) { return d.average }
    , dispatch = d3.dispatch('tooltipShow', 'tooltipHide', 'stateChange', 'changeState', 'renderEnd')
    , transitionDuration = 250
    , duration = 250
    , noErrorCheck = false  //if set to TRUE, will bypass an error check in the indexify function.
    ;

  xAxis
    .orient('bottom')
    .tickPadding(7)
    ;
  yAxis
    .orient((rightAlignYAxis) ? 'right' : 'left')
    ;

  //============================================================
  controls.updateState(false);

  //============================================================
  // Private Variables
  //------------------------------------------------------------

  var dx = d3.scale.linear()
    , index = {i: 0, x: 0}
    , renderWatch = nv.utils.renderWatch(dispatch, duration)
    ;

  var showTooltip = function(e, offsetElement) {
    var left = e.pos[0] + ( offsetElement.offsetLeft || 0 ),
        top = e.pos[1] + ( offsetElement.offsetTop || 0),
        x = xAxis.tickFormat()(lines.x()(e.point, e.pointIndex)),
        y = yAxis.tickFormat()(lines.y()(e.point, e.pointIndex)),
        content = tooltip(e.series.key, x, y);

    nv.tooltip.show([left, top], content, null, null, offsetElement);
  };

  //============================================================

  function chart(selection) {
    renderWatch.reset();
    renderWatch.models(lines);
    if (showXAxis) renderWatch.models(xAxis);
    if (showYAxis) renderWatch.models(yAxis);
    selection.each(function(data) {

      Layer.setRoot(this);
      d3.select(this).classed('nv-chart-' + id, true);
      if (Layer.noData(data))
        return chart;

      var that = this,
          availableWidth = Layer.available.width,
          availableHeight = Layer.available.height;
      chart.container = this;

      chart.update = function() {
        if (duration === 0)
          Layer.svg.call(chart);
        else
          Layer.svg.transition().duration(duration).call(chart)
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

      var indexDrag = d3.behavior.drag()
                        .on('dragstart', dragStart)
                        .on('drag', dragMove)
                        .on('dragend', dragEnd);

      function dragStart() {
        d3.select(chart.container).style('cursor', 'ew-resize');
      }

      function dragMove() {
        index.x = d3.event.x;
        index.i = Math.round(dx.invert(index.x));
        updateZero();
      }

      function dragEnd() {
        d3.select(chart.container)
            .style('cursor', 'auto');
        // update state and send stateChange with new index
        state.index = index.i;
        dispatch.stateChange(state);
      }

      //------------------------------------------------------------
      // Setup Scales

      x = lines.xScale();
      y = lines.yScale();

      if (!rescaleY) {
        var seriesDomains = data
          .filter(function(series) { return !series.disabled })
          .map(function(series) {
            var initialDomain = d3.extent(series.values, lines.y());

            //account for series being disabled when losing 95% or more
            if (initialDomain[0] < -.95)
                initialDomain[0] = -.95;

            return [
              (initialDomain[0] - initialDomain[1]) / (1 + initialDomain[1]),
              (initialDomain[1] - initialDomain[0]) / (1 + initialDomain[0])
            ];
          });
        var completeDomain = [
          d3.min(seriesDomains, function(d) { return d[0] }),
          d3.max(seriesDomains, function(d) { return d[1] })
        ];
        lines.yDomain(completeDomain);
      } else
        lines.yDomain(null);

      dx.domain([0, data[0].values.length - 1]) //Assumes all series have same length
        .range([0, availableWidth])
        .clamp(true);

      //------------------------------------------------------------

      var data = indexify(index.i, data);

      //------------------------------------------------------------
      // Setup containers and skeleton of chart

      Layer.wrapChart(data);
      Layer.gEnter.append('g').attr('class', 'nv-interactive');
      Layer.gEnter.append('g').attr('class', 'nv-x nv-axis').style("pointer-events","none");
      Layer.gEnter.append('g').attr('class', 'nv-y nv-axis');
      Layer.gEnter.append('g').attr('class', 'nv-background');
      Layer.gEnter.append('g').attr('class', 'nv-linesWrap').style("pointer-events", (useInteractiveGuideline) ? "none" : "all");
      Layer.gEnter.append('g').attr('class', 'nv-avgLinesWrap').style("pointer-events","none");
      Layer.gEnter.append('g').attr('class', 'nv-legendWrap');
      Layer.gEnter.append('g').attr('class', 'nv-controlsWrap');

      //------------------------------------------------------------
      // Legend

      if (Layer.options.showLegend) {
        legend.width(availableWidth);

        Layer.g.select('.nv-legendWrap')
            .datum(data)
            .call(legend);

        if ( Layer.margin.top != legend.height()) {
          Layer.margin.top = legend.height();
          availableHeight = (height || parseInt(Layer.svg.style('height')) || 400)
                             - Layer.margin.top - Layer.margin.bottom;
        }

        Layer.g.select('.nv-legendWrap')
            .attr('transform', 'translate(0,' + (-Layer.margin.top) +')')
      }

      //------------------------------------------------------------

      //------------------------------------------------------------
      // Controls

      if (showControls) {
        var controlsData = [
          { key: 'Re-scale y-axis', disabled: !rescaleY }
        ];

        controls
            .width(140)
            .color(['#444', '#444', '#444'])
            .rightAlign(false)
            .margin({top: 5, right: 0, bottom: 5, left: 20})
            ;

        Layer.g.select('.nv-controlsWrap')
            .datum(controlsData)
            .attr('transform', 'translate(0,' + (-Layer.margin.top) +')')
            .call(controls);
      }

      //------------------------------------------------------------

      if (rightAlignYAxis)
          Layer.g.select(".nv-y.nv-axis")
              .attr("transform", "translate(" + availableWidth + ",0)");

      // Show error if series goes below 100%
      var tempDisabled = data.filter(function(d) { return d.tempDisabled });

      Layer.wrap.select('.tempDisabled').remove(); //clean-up and prevent duplicates
      if (tempDisabled.length) {
        Layer.wrap.append('text').attr('class', 'tempDisabled')
          .attr('x', availableWidth / 2)
          .attr('y', '-.71em')
          .style('text-anchor', 'end')
          .text(tempDisabled.map(function(d) { return d.key }).join(', ') + ' values cannot be calculated for this time period.');
      }

      //------------------------------------------------------------
      // Main Chart Component(s)

      //------------------------------------------------------------
      //Set up interactive layer
      if (useInteractiveGuideline) {
        interactiveLayer
          .width(availableWidth)
          .height(availableHeight)
          .margin({left:Layer.margin.left,top:Layer.margin.top})
          .svgContainer(Layer.svg)
          .xScale(x);
        Layer.wrap.select(".nv-interactive").call(interactiveLayer);
      }

      Layer.gEnter.select('.nv-background')
        .append('rect');

      Layer.g.select('.nv-background rect')
        .attr('width', availableWidth)
        .attr('height', availableHeight);

      lines
        //.x(function(d) { return d.x })
        .y(function(d) { return d.display.y })
        .width(availableWidth)
        .height(availableHeight)
        .color(
              data
                  .map(function(d,i){return d.color || color(d, i)})
                  .filter(function(d,i) { return !data[i].disabled && !data[i].tempDisabled; })
          );

      var linesWrap = Layer.g.select('.nv-linesWrap')
          .datum(data.filter(function(d) { return  !d.disabled && !d.tempDisabled }));

      //d3.transition(linesWrap).call(lines);
      linesWrap.call(lines);

      /*Handle average lines [AN-612] ----------------------------*/

      //Store a series index number in the data array.
      data.forEach(function(d,i) {
        d.seriesIndex = i;
      });

      var avgLineData = data.filter(function(d) {
        return !d.disabled && !!average(d);
      });

      var avgLines = Layer.g.select(".nv-avgLinesWrap").selectAll("line")
              .data(avgLineData, function(d) { return d.key; });

      var getAvgLineY = function(d) {
        //If average lines go off the svg element, clamp them to the svg bounds.
        var yVal = y(average(d));
        if (yVal < 0) return 0;
        if (yVal > availableHeight) return availableHeight;
        return yVal;
      };

      avgLines.enter()
              .append('line')
              .style('stroke-width',2)
              .style('stroke-dasharray','10,10')
              .style('stroke',function (d) {
                  return lines.color()(d,d.seriesIndex);
              })
              .attr('x1',0)
              .attr('x2',availableWidth)
              .attr('y1', getAvgLineY)
              .attr('y2', getAvgLineY);

      avgLines
              .style('stroke-opacity',function(d){
                  //If average lines go offscreen, make them transparent
                  var yVal = y(average(d));
                  if (yVal < 0 || yVal > availableHeight) return 0;
                  return 1;
              })
              .attr('x1',0)
              .attr('x2',availableWidth)
              .attr('y1', getAvgLineY)
              .attr('y2', getAvgLineY);

      avgLines.exit().remove();

      //Create index line -----------------------------------------

      var indexLine = linesWrap.selectAll('.nv-indexLine')
          .data([index]);
      indexLine.enter().append('rect').attr('class', 'nv-indexLine')
          .attr('width', 3)
          .attr('x', -2)
          .attr('fill', 'red')
          .attr('fill-opacity', .5)
          .style("pointer-events","all")
          .call(indexDrag);

      indexLine
          .attr('transform', function(d) { return 'translate(' + dx(d.i) + ',0)' })
          .attr('height', availableHeight);

      //------------------------------------------------------------

      //------------------------------------------------------------
      // Setup Axes

      if (showXAxis) {
        xAxis
          .scale(x)
          //Suggest how many ticks based on the chart width and D3 should listen (70 is the optimal number for MM/DD/YY dates)
          .ticks( Math.min(data[0].values.length,availableWidth/70) )
          .tickSize(-availableHeight, 0);

        Layer.g.select('.nv-x.nv-axis')
            .attr('transform', 'translate(0,' + y.range()[0] + ')')
            .call(xAxis);
      }

      if (showYAxis) {
        yAxis
          .scale(y)
          .ticks( availableHeight / 36 )
          .tickSize( -availableWidth, 0);

        Layer.g.select('.nv-y.nv-axis')
          .call(yAxis);
      }
      //------------------------------------------------------------

      //============================================================
      // Event Handling/Dispatching (in chart's scope)
      //------------------------------------------------------------


      function updateZero() {
        indexLine
          .data([index]);

        //When dragging the index line, turn off line transitions.
        // Then turn them back on when done dragging.
        var oldDuration = chart.duration();
        chart.duration(0);
        chart.update();
        chart.duration(oldDuration);
      }

      Layer.g.select('.nv-background rect')
        .on('click', function() {
          index.x = d3.mouse(this)[0];
          index.i = Math.round(dx.invert(index.x));
          // update state and send stateChange with new index
          state.index = index.i;
          dispatch.stateChange(state);
          updateZero();
        });

      lines.dispatch.on('elementClick', function(e) {
        index.i = e.pointIndex;
        index.x = dx(index.i);
        // update state and send stateChange with new index
        state.index = index.i;
        dispatch.stateChange(state);
        updateZero();
      });

      controls.dispatch.on('legendClick', function(d) {
        d.disabled = !d.disabled;
        rescaleY = !d.disabled;
        state.rescaleY = rescaleY;
        dispatch.stateChange(state);
        chart.update();
      });

      legend.dispatch.on('stateChange', function(newState) {
        state.disabled = newState.disabled;
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

          var xValue = xAxis.tickFormat()(chart.x()(singlePoint,pointIndex), pointIndex);
          interactiveLayer.tooltip
              .position({left: pointXLocation + Layer.margin.left, top: e.mouseY + Layer.margin.top})
              .chartContainer(that.parentNode)
              .enabled(tooltips)
              .valueFormatter(function(d) {
                return yAxis.tickFormat()(d);
              })
              .data({ value: xValue, series: allData })
              ();

          interactiveLayer.renderGuideLine(pointXLocation);
      });

      interactiveLayer.dispatch.on("elementMouseout",function() {
          dispatch.tooltipHide();
          lines.clearHighlights();
      });

        dispatch
          .on('tooltipShow', function(e) {
            if (tooltips)
                showTooltip(e, that.parentNode);
          })
          .on('changeState', function(e) { // Update chart from a state object passed to event handler
            if (typeof e.disabled !== 'undefined') {
              data.forEach(function(series,i) { series.disabled = e.disabled[i] });
              state.disabled = e.disabled;
            }
            if (typeof e.index !== 'undefined') {
              index.i = e.index;
              index.x = dx(index.i);
              state.index = e.index;
              indexLine.data([index]);
            }
            if (typeof e.rescaleY !== 'undefined')
              rescaleY = e.rescaleY;
            chart.update();
          });

      //============================================================

    });

    renderWatch.renderEnd('cumulativeLineChart immediate');

    return chart;
  }


  //============================================================
  // Event Handling/Dispatching (out of chart's scope)
  //------------------------------------------------------------

  lines.dispatch
    .on('elementMouseover.tooltip', function(e) {
      e.pos = [e.pos[0] +  Layer.margin.left, e.pos[1] + Layer.margin.top];
      dispatch.tooltipShow(e);
    }).on('elementMouseout.tooltip', function(e) {
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

  d3.rebind(chart, lines, 'defined', 'isArea', 'x', 'y', 'xScale','yScale', 'size', 'xDomain', 'yDomain', 'xRange', 'yRange', 'forceX', 'forceY', 'interactive', 'clipEdge', 'clipVoronoi','useVoronoi',  'id');

  chart.options = nv.utils.optionsFunc.bind(chart);

  chart.margin = function(_) {
    if (!arguments.length) return Layer.margin;
      Layer.margin.top    = nv.utils.valueOrDefault(_.top, Layer.margin.top);
      Layer.margin.right  = nv.utils.valueOrDefault(_.right, Layer.margin.right);
      Layer.margin.bottom = nv.utils.valueOrDefault(_.bottom, Layer.margin.bottom);
      Layer.margin.left   = nv.utils.valueOrDefault(_.left, Layer.margin.left);
    return chart;
  };

  chart.width = function(_) {
    if (!arguments.length) return Layer.options.size.width;
    Layer.options.size.width = _;
    return chart;
  };

  chart.height = function(_) {
    if (!arguments.length) return Layer.options.size.height;
    Layer.options.size.height = _;
    return chart;
  };

  chart.color = function(_) {
    if (!arguments.length) return color;
    color = nv.utils.getColor(_);
    legend.color(color);
    return chart;
  };

  chart.rescaleY = function(_) {
    if (!arguments.length) return rescaleY;
    rescaleY = _;
    return chart;
  };

  chart.showControls = function(_) {
    if (!arguments.length) return showControls;
    showControls = _;
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

  chart.showLegend = function(_) {
    if (!arguments.length) return Layer.options.showLegend;
    Layer.options.showLegend = _;
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
    if (!arguments.length) return Layer.options.noData;
    Layer.options.noData = _;
    return chart;
  };

  chart.average = function(_) {
     if(!arguments.length) return average;
     average = _;
     return chart;
  };

  chart.transitionDuration = function(_) {
    nv.deprecated('cumulativeLineChart.transitionDuration');
    return chart.duration(_);
  };

  chart.duration = function(_) {
    if(!arguments.length) return duration;
    duration = _;
    lines.duration(duration);
    xAxis.duration(duration);
    yAxis.duration(duration);
    renderWatch.reset(duration);
    return chart;
  };

  chart.noErrorCheck = function(_) {
    if (!arguments.length) return noErrorCheck;
    noErrorCheck = _;
    return chart;
  };

  //============================================================


  //============================================================
  // Functions
  //------------------------------------------------------------

  /* Normalize the data according to an index point. */
  function indexify(idx, data) {
    return data.map(function(line) {
      if (!line.values) {
         return line;
      }
      var indexValue = line.values[idx];
      if (indexValue == null) {
        return line;
      }
      var v = lines.y()(indexValue, idx);

      //TODO: implement check below, and disable series if series loses 100% or more cause divide by 0 issue
      if (v < -.95 && !noErrorCheck) {
        //if a series loses more than 100%, calculations fail.. anything close can cause major distortion (but is mathematically correct till it hits 100)

        line.tempDisabled = true;
        return line;
      }

      line.tempDisabled = false;

      line.values = line.values.map(function(point, pointIndex) {
        point.display = {'y': (lines.y()(point, pointIndex) - v) / (1 + v) };
        return point;
      });

      return line;
    })
  }

  //============================================================

  return chart;
};
