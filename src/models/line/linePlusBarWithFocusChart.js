nv.models.linePlusBarWithFocusChart = function() {
  "use strict";
  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var lines = nv.models.line()
    , lines2 = nv.models.line()
    , bars = nv.models.historicalBar()
    , bars2 = nv.models.historicalBar()
    , xAxis = nv.models.axis()
    , x2Axis = nv.models.axis()
    , y1Axis = nv.models.axis()
    , y2Axis = nv.models.axis()
    , y3Axis = nv.models.axis()
    , y4Axis = nv.models.axis()
    , legend = nv.models.legend()
    , brush = d3.svg.brush()
    ;

  var canvas = new Canvas({
          margin: {top: 30, right: 30, bottom: 30, left: 60}
          , chartClass: 'linePlusBar'
          , wrapClass: ''
      })
    , margin2 = {top: 0, right: 30, bottom: 20, left: 60}
    , finderHeight = 100
    , getX = function(d) { return d.x }
    , getY = function(d) { return d.y }
    , color = nv.utils.defaultColor()
    , extent
    , brushExtent = null
    , tooltips = true
    , tooltip = function(key, x, y) {
        return '<h3>' + key + '</h3>' +
               '<p>' +  y + ' at ' + x + '</p>';
      }
    , x
    , x2
    , y1
    , y2
    , y3
    , y4
    , dispatch = d3.dispatch('tooltipShow', 'tooltipHide', 'brush')
    , transitionDuration = 0
    ;

  lines
    .clipEdge(true)
    ;
  lines2
    .interactive(false)
    ;
  xAxis
    .orient('bottom')
    .tickPadding(5)
    ;
  y1Axis
    .orient('left')
    ;
  y2Axis
    .orient('right')
    ;
  x2Axis
    .orient('bottom')
    .tickPadding(5)
    ;
  y3Axis
    .orient('left')
    ;
  y4Axis
    .orient('right')
    ;

  //============================================================


  //============================================================
  // Private Variables
  //------------------------------------------------------------

  var showTooltip = function(e, offsetElement) {
    if (extent)
        e.pointIndex += Math.ceil(extent[0]);
    var left = e.pos[0] + ( offsetElement.offsetLeft || 0 ),
        top = e.pos[1] + ( offsetElement.offsetTop || 0),
        x = xAxis.tickFormat()(lines.x()(e.point, e.pointIndex)),
        y = (e.series.bar ? y1Axis : y2Axis).tickFormat()(lines.y()(e.point, e.pointIndex)),
        content = tooltip(e.series.key, x, y);

    nv.tooltip.show([left, top], content, e.value < 0 ? 'n' : 's', null, offsetElement);
  };

  //------------------------------------------------------------



  function chart(selection) {
    selection.each(function(data) {

      canvas.setRoot(this);
      if (canvas.noData(data))
        return chart;

      var that = this
        , availableWidth = canvas.available.width
        , availableHeight1 = canvas.available.height - finderHeight
        , availableHeight2 = finderHeight - margin2.top - margin2.bottom;

      chart.update = function() { canvas.svg.transition().duration(transitionDuration).call(chart); };

      //------------------------------------------------------------
      // Setup Scales

      var dataBars = data.filter(function(d) { return !d.disabled && d.bar });
      var dataLines = data.filter(function(d) { return !d.bar }); // removed the !d.disabled clause here to fix Issue #240

      x = bars.xScale();
      x2 = x2Axis.scale();
      y1 = bars.yScale();
      y2 = lines.yScale();
      y3 = bars2.yScale();
      y4 = lines2.yScale();

      var series1 = data
        .filter(function(d) { return !d.disabled && d.bar })
        .map(function(d) {
          return d.values.map(function(d,i) {
            return { x: getX(d,i), y: getY(d,i) }
          })
        });

      var series2 = data
        .filter(function(d) { return !d.disabled && !d.bar })
        .map(function(d) {
          return d.values.map(function(d,i) {
            return { x: getX(d,i), y: getY(d,i) }
          })
        });

      x.range([0, availableWidth]);
      
      x2.domain(d3.extent(d3.merge(series1.concat(series2)), function(d) { return d.x } ))
          .range([0, availableWidth]);

      //------------------------------------------------------------

      //------------------------------------------------------------
      // Setup containers and skeleton of chart

      canvas.wrapChart(data);

      canvas.gEnter.append('g').attr('class', 'nv-legendWrap');

      var focusEnter = canvas.gEnter.append('g').attr('class', 'nv-focus');
      focusEnter.append('g').attr('class', 'nv-x nv-axis');
      focusEnter.append('g').attr('class', 'nv-y1 nv-axis');
      focusEnter.append('g').attr('class', 'nv-y2 nv-axis');
      focusEnter.append('g').attr('class', 'nv-barsWrap');
      focusEnter.append('g').attr('class', 'nv-linesWrap');

      var contextEnter = canvas.gEnter.append('g').attr('class', 'nv-context');
      contextEnter.append('g').attr('class', 'nv-x nv-axis');
      contextEnter.append('g').attr('class', 'nv-y1 nv-axis');
      contextEnter.append('g').attr('class', 'nv-y2 nv-axis');
      contextEnter.append('g').attr('class', 'nv-barsWrap');
      contextEnter.append('g').attr('class', 'nv-linesWrap');
      contextEnter.append('g').attr('class', 'nv-brushBackground');
      contextEnter.append('g').attr('class', 'nv-x nv-brush');

      //------------------------------------------------------------

      //------------------------------------------------------------
      // Legend

      if (canvas.options.showLegend) {
        legend.width( availableWidth / 2 );
        canvas.g.select('.nv-legendWrap')
          .datum(data.map(function(series) {
            series.originalKey = series.originalKey === undefined ? series.key : series.originalKey;
            series.key = series.originalKey + (series.bar ? ' (left axis)' : ' (right axis)');
            return series;
          }))
        .call(legend);

        if ( canvas.margin.top != legend.height()) {
          canvas.margin.top = legend.height();
          availableHeight1 = (canvas.options.height || parseInt(canvas.svg.style('height')) || 400)
                             - canvas.margin.top - canvas.margin.bottom - finderHeight;
        }

        canvas.g.select('.nv-legendWrap')
          .attr('transform', 'translate(' + ( availableWidth / 2 ) + ',' + (-canvas.margin.top) +')');
      }

      //------------------------------------------------------------
      // Context Components

      bars2
        .width(availableWidth)
        .height(availableHeight2)
        .color(
          data.map(function(d,i) {return d.color || color(d, i);})
              .filter(function(d,i) { return !data[i].disabled && data[i].bar })
          );

      lines2
        .width(availableWidth)
        .height(availableHeight2)
        .color(
              data.map(function(d,i) { return d.color || color(d, i) })
                  .filter(function(d,i) { return !data[i].disabled && !data[i].bar })
          );
        
      var bars2Wrap = canvas.g.select('.nv-context .nv-barsWrap')
          .datum(dataBars.length ? dataBars : [{values:[]}]);

      var lines2Wrap = canvas.g.select('.nv-context .nv-linesWrap')
          .datum(!dataLines[0].disabled ? dataLines : [{values:[]}]);
          
      canvas.g.select('.nv-context')
          .attr('transform', 'translate(0,' + ( availableHeight1 + canvas.margin.bottom + margin2.top) + ')');

      bars2Wrap.transition().call(bars2);
      lines2Wrap.transition().call(lines2);

      //------------------------------------------------------------

      //------------------------------------------------------------
      // Setup Brush

      brush
        .x(x2)
        .on('brush', onBrush);

      if (brushExtent) brush.extent(brushExtent);

      var brushBG = canvas.g.select('.nv-brushBackground').selectAll('g')
          .data([brushExtent || brush.extent()]);

      var brushBGenter = brushBG.enter()
          .append('g');

      brushBGenter.append('rect')
          .attr('class', 'left')
          .attr('x', 0)
          .attr('y', 0)
          .attr('height', availableHeight2);

      brushBGenter.append('rect')
          .attr('class', 'right')
          .attr('x', 0)
          .attr('y', 0)
          .attr('height', availableHeight2);

      var gBrush = canvas.g.select('.nv-x.nv-brush')
          .call(brush);
      gBrush.selectAll('rect')
          //.attr('y', -5)
          .attr('height', availableHeight2);
      gBrush.selectAll('.resize').append('path').attr('d', resizePath);

      //------------------------------------------------------------

      //------------------------------------------------------------
      // Setup Secondary (Context) Axes

      x2Axis
        .ticks( availableWidth / 100 )
        .tickSize(-availableHeight2, 0);

      canvas.g.select('.nv-context .nv-x.nv-axis')
          .attr('transform', 'translate(0,' + y3.range()[0] + ')');
      canvas.g.select('.nv-context .nv-x.nv-axis').transition()
          .call(x2Axis);

      y3Axis
        .scale(y3)
        .ticks( availableHeight2 / 36 )
        .tickSize( -availableWidth, 0);

      canvas.g.select('.nv-context .nv-y1.nv-axis')
          .style('opacity', dataBars.length ? 1 : 0)
          .attr('transform', 'translate(0,' + x2.range()[0] + ')');

      canvas.g.select('.nv-context .nv-y1.nv-axis').transition()
          .call(y3Axis);

      y4Axis
        .scale(y4)
        .ticks( availableHeight2 / 36 )
        .tickSize(dataBars.length ? 0 : -availableWidth, 0); // Show the y2 rules only if y1 has none

      canvas.g.select('.nv-context .nv-y2.nv-axis')
          .style('opacity', dataLines.length ? 1 : 0)
          .attr('transform', 'translate(' + x2.range()[1] + ',0)');

      canvas.g.select('.nv-context .nv-y2.nv-axis').transition()
          .call(y4Axis);
          
      //------------------------------------------------------------

      //============================================================
      // Event Handling/Dispatching (in chart's scope)
      //------------------------------------------------------------

      legend.dispatch.on('stateChange', function(newState) { 
        chart.update();
      });

      dispatch.on('tooltipShow', function(e) {
        if (tooltips) showTooltip(e, that.parentNode);
      });

      //============================================================


      //============================================================
      // Functions
      //------------------------------------------------------------

      // Taken from crossfilter (http://square.github.com/crossfilter/)
      function resizePath(d) {
        var e = +(d == 'e'),
            x = e ? 1 : -1,
            y = availableHeight2 / 3;
        return 'M' + (.5 * x) + ',' + y
            + 'A6,6 0 0 ' + e + ' ' + (6.5 * x) + ',' + (y + 6)
            + 'V' + (2 * y - 6)
            + 'A6,6 0 0 ' + e + ' ' + (.5 * x) + ',' + (2 * y)
            + 'Z'
            + 'M' + (2.5 * x) + ',' + (y + 8)
            + 'V' + (2 * y - 8)
            + 'M' + (4.5 * x) + ',' + (y + 8)
            + 'V' + (2 * y - 8);
      }

      function updateBrushBG() {
        if (!brush.empty()) brush.extent(brushExtent);
        brushBG
            .data([brush.empty() ? x2.domain() : brushExtent])
            .each(function(d) {
              var leftWidth = x2(d[0]) - x2.range()[0],
                  rightWidth = x2.range()[1] - x2(d[1]);
              d3.select(this).select('.left')
                .attr('width',  leftWidth < 0 ? 0 : leftWidth);
              d3.select(this).select('.right')
                .attr('x', x2(d[1]))
                .attr('width', rightWidth < 0 ? 0 : rightWidth);
            });
      }

      function onBrush() {
        brushExtent = brush.empty() ? null : brush.extent();
        extent = brush.empty() ? x2.domain() : brush.extent();

        dispatch.brush({extent: extent, brush: brush});

        updateBrushBG();

        //------------------------------------------------------------
        // Prepare Main (Focus) Bars and Lines
        
        bars
        .width(availableWidth)
        .height(availableHeight1)
        .color(
                data.map(function(d,i) { return d.color || color(d, i) })
                    .filter(function(d,i) { return !data[i].disabled && data[i].bar })
            );

        lines
        .width(availableWidth)
        .height(availableHeight1)
        .color(
                data.map(function(d,i) { return d.color || color(d, i) })
                    .filter(function(d,i) { return !data[i].disabled && !data[i].bar })
            );

        var focusBarsWrap = canvas.g.select('.nv-focus .nv-barsWrap')
            .datum(!dataBars.length ? [{values:[]}] :
              dataBars
                .map(function(d) {
                  return {
                    key: d.key,
                    values: d.values.filter(function(d,i) {
                      return bars.x()(d,i) >= extent[0] && bars.x()(d,i) <= extent[1];
                    })
                  }
                })
            );
        
        var focusLinesWrap = canvas.g.select('.nv-focus .nv-linesWrap')
            .datum(dataLines[0].disabled ? [{values:[]}] :
              dataLines
                .map(function(d) {
                  return {
                    key: d.key,
                    values: d.values.filter(function(d,i) {
                      return lines.x()(d,i) >= extent[0] && lines.x()(d,i) <= extent[1];
                    })
                  }
                })
             );
                 
        //------------------------------------------------------------
        
        
        //------------------------------------------------------------
        // Update Main (Focus) X Axis

        if (dataBars.length)
          x = bars.xScale();
        else
          x = lines.xScale();

        xAxis
        .scale(x)
        .ticks( availableWidth / 100 )
        .tickSize(-availableHeight1, 0);

        xAxis.domain([Math.ceil(extent[0]), Math.floor(extent[1])]);

        canvas.g.select('.nv-x.nv-axis').transition().duration(transitionDuration)
          .call(xAxis);
        //------------------------------------------------------------
        
        
        //------------------------------------------------------------
        // Update Main (Focus) Bars and Lines

        focusBarsWrap.transition().duration(transitionDuration).call(bars);
        focusLinesWrap.transition().duration(transitionDuration).call(lines);
        
        //------------------------------------------------------------
        
          
        //------------------------------------------------------------
        // Setup and Update Main (Focus) Y Axes

        canvas.g.select('.nv-focus .nv-x.nv-axis')
          .attr('transform', 'translate(0,' + y1.range()[0] + ')');

        y1Axis
          .scale(y1)
          .ticks( availableHeight1 / 36 )
          .tickSize(-availableWidth, 0);

        canvas.g.select('.nv-focus .nv-y1.nv-axis')
          .style('opacity', dataBars.length ? 1 : 0);

        y2Axis
          .scale(y2)
          .ticks( availableHeight1 / 36 )
          .tickSize(dataBars.length ? 0 : -availableWidth, 0); // Show the y2 rules only if y1 has none

        canvas.g.select('.nv-focus .nv-y2.nv-axis')
          .style('opacity', dataLines.length ? 1 : 0)
          .attr('transform', 'translate(' + x.range()[1] + ',0)');

        canvas.g.select('.nv-focus .nv-y1.nv-axis').transition().duration(transitionDuration)
          .call(y1Axis);
        canvas.g.select('.nv-focus .nv-y2.nv-axis').transition().duration(transitionDuration)
          .call(y2Axis);
      }

      //============================================================

      onBrush();

    });

    return chart;
  }


  //============================================================
  // Event Handling/Dispatching (out of chart's scope)
  //------------------------------------------------------------

  lines.dispatch.on('elementMouseover.tooltip', function(e) {
    e.pos = [e.pos[0] +  canvas.margin.left, e.pos[1] + canvas.margin.top];
    dispatch.tooltipShow(e);
  });

  lines.dispatch.on('elementMouseout.tooltip', function(e) {
    dispatch.tooltipHide(e);
  });

  bars.dispatch.on('elementMouseover.tooltip', function(e) {
    e.pos = [e.pos[0] +  canvas.margin.left, e.pos[1] + canvas.margin.top];
    dispatch.tooltipShow(e);
  });

  bars.dispatch.on('elementMouseout.tooltip', function(e) {
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
  chart.legend = legend;
  chart.lines = lines;
  chart.lines2 = lines2;
  chart.bars = bars;
  chart.bars2 = bars2;
  chart.xAxis = xAxis;
  chart.x2Axis = x2Axis;
  chart.y1Axis = y1Axis;
  chart.y2Axis = y2Axis;
  chart.y3Axis = y3Axis;
  chart.y4Axis = y4Axis;

  d3.rebind(chart, lines, 'defined', 'size', 'clipVoronoi', 'interpolate');
  //TODO: consider rebinding x, y and some other stuff, and simply do something like bars.x(lines.x()), etc.
  //d3.rebind(chart, lines, 'x', 'y', 'size', 'xDomain', 'yDomain', 'xRange', 'yRange', 'forceX', 'forceY', 'interactive', 'clipEdge', 'clipVoronoi', 'id');

  chart.options = nv.utils.optionsFunc.bind(chart);
  
  chart.x = function(_) {
    if (!arguments.length) return getX;
    getX = _;
    lines.x(_);
    bars.x(_);
    return chart;
  };

  chart.y = function(_) {
    if (!arguments.length) return getY;
    getY = _;
    lines.y(_);
    bars.y(_);
    return chart;
  };

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

  chart.color = function(_) {
    if (!arguments.length) return color;
    color = nv.utils.getColor(_);
    legend.color(color);
    return chart;
  };

  chart.showLegend = function(_) {
    if (!arguments.length) return canvas.options.showLegend;
    canvas.options.showLegend = _;
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

  chart.noData = function(_) {
    if (!arguments.length) return canvas.options.noData;
    canvas.options.noData = _;
    return chart;
  };

  chart.brushExtent = function(_) {
    if (!arguments.length) return brushExtent;
    brushExtent = _;
    return chart;
  };

  chart.finderHeight = function(_){
    if (!arguments.length) return finderHeight;
    finderHeight = _;
    return chart;
  };

  //============================================================

  return chart;
};
