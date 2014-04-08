nv.models.lineWithFocusChart = function() {
  "use strict";
  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var lines = nv.models.line()
    , lines2 = nv.models.line()
    , xAxis = nv.models.axis()
    , yAxis = nv.models.axis()
    , x2Axis = nv.models.axis()
    , y2Axis = nv.models.axis()
    , legend = nv.models.legend()
    , brush = d3.svg.brush()
    ;

  var Layer = new Layer({
        chartClass: 'lineWithFocusChart',
        margin: {top: 30, right: 30, bottom: 30, left: 60}
      })
    , margin2 = {top: 0, right: 30, bottom: 20, left: 60}
    , color = nv.utils.defaultColor()
    , height2 = 100
    , x
    , y
    , x2
    , y2
    , brushExtent = null
    , tooltips = true
    , tooltip = function(key, x, y) {
        return '<h3>' + key + '</h3>' +
               '<p>' +  y + ' at ' + x + '</p>'
      }
    , dispatch = d3.dispatch('tooltipShow', 'tooltipHide', 'brush')
    , transitionDuration = 250
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
  yAxis
    .orient('left')
    ;
  x2Axis
    .orient('bottom')
    .tickPadding(5)
    ;
  y2Axis
    .orient('left')
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
        content = tooltip(e.series.key, x, y);

    nv.tooltip.show([left, top], content, null, null, offsetElement);
  };

  //============================================================

  function chart(selection) {
    selection.each(function(data) {

      Layer.setRoot(this);
      if(Layer.noData(data))
        return chart;

      var that = this
          , availableWidth = Layer.available.width
          , availableHeight1 = (Layer.options.size.height || parseInt(Layer.svg.style('height')) || 400) -
              Layer.margin.top - Layer.margin.bottom - height2
          , availableHeight2 = height2 - margin2.top - margin2.bottom;

      chart.update = function() { Layer.svg.transition().duration(transitionDuration).call(chart) };

      //------------------------------------------------------------
      // Setup Scales

      x = lines.xScale();
      y = lines.yScale();
      x2 = lines2.xScale();
      y2 = lines2.yScale();

      //------------------------------------------------------------

      //------------------------------------------------------------
      // Setup containers and skeleton of chart

      Layer.wrapChart(data);

      var focusEnter = Layer.gEnter.append('g').attr('class', 'nv-focus');
      focusEnter.append('g').attr('class', 'nv-x nv-axis');
      focusEnter.append('g').attr('class', 'nv-y nv-axis');
      focusEnter.append('g').attr('class', 'nv-linesWrap');

      var contextEnter = Layer.gEnter.append('g').attr('class', 'nv-context');
      contextEnter.append('g').attr('class', 'nv-x nv-axis');
      contextEnter.append('g').attr('class', 'nv-y nv-axis');
      contextEnter.append('g').attr('class', 'nv-linesWrap');
      contextEnter.append('g').attr('class', 'nv-brushBackground');
      contextEnter.append('g').attr('class', 'nv-x nv-brush');

      //------------------------------------------------------------

      //------------------------------------------------------------
      // Legend

      if (Layer.options.showLegend) {
        legend.width(availableWidth);
        Layer.g.select('.nv-legendWrap').datum(data).call(legend);
        if ( Layer.margin.top != legend.height()) {
          Layer.margin.top = legend.height();
          availableHeight1 = (Layer.options.size.height || parseInt(Layer.svg.style('height')) || 400)
              - Layer.margin.top - Layer.margin.bottom - height2;
        }
        Layer.g.select('.nv-legendWrap').attr('transform', 'translate(0,' + (-Layer.margin.top) +')')
      }

      //------------------------------------------------------------

      //------------------------------------------------------------
      // Main Chart Component(s)

      lines
        .width(availableWidth)
        .height(availableHeight1)
        .color(
          data
            .map(function(d,i) { return d.color || color(d, i) })
            .filter(function(d,i) { return !data[i].disabled })
        );

      lines2
        .defined(lines.defined())
        .width(availableWidth)
        .height(availableHeight2)
        .color(
          data
            .map(function(d,i) { return d.color || color(d, i) })
            .filter(function(d,i) { return !data[i].disabled })
        );

      Layer.g.select('.nv-context')
          .attr('transform', 'translate(0,' + ( availableHeight1 + Layer.margin.bottom + margin2.top) + ')');

      var contextLinesWrap = Layer.g.select('.nv-context .nv-linesWrap')
          .datum(data.filter(function(d) { return !d.disabled }));

      d3.transition(contextLinesWrap).call(lines2);

      //------------------------------------------------------------

      //------------------------------------------------------------
      // Setup Main (Focus) Axes

      xAxis
        .scale(x)
        .ticks( availableWidth / 100 )
        .tickSize(-availableHeight1, 0);

      yAxis
        .scale(y)
        .ticks( availableHeight1 / 36 )
        .tickSize( -availableWidth, 0);

      Layer.g.select('.nv-focus .nv-x.nv-axis')
        .attr('transform', 'translate(0,' + availableHeight1 + ')');

      //------------------------------------------------------------


      //------------------------------------------------------------
      // Setup Brush

      brush
        .x(x2)
        .on('brush', function() {
            //When brushing, turn off transitions because chart needs to change immediately.
            var oldTransition = chart.transitionDuration();
            chart.transitionDuration(0);
            onBrush();
            chart.transitionDuration(oldTransition);
        });

      if (brushExtent)
          brush.extent(brushExtent);

      var brushBG = Layer.g.select('.nv-brushBackground').selectAll('g')
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

      var gBrush = Layer.g.select('.nv-x.nv-brush')
          .call(brush);
      gBrush.selectAll('rect')
          //.attr('y', -5)
          .attr('height', availableHeight2);
      gBrush.selectAll('.resize').append('path').attr('d', resizePath);

      onBrush();

      //------------------------------------------------------------

      //------------------------------------------------------------
      // Setup Secondary (Context) Axes

      x2Axis
        .scale(x2)
        .ticks( availableWidth / 100 )
        .tickSize(-availableHeight2, 0);

      Layer.g.select('.nv-context .nv-x.nv-axis')
          .attr('transform', 'translate(0,' + y2.range()[0] + ')');
      d3.transition(Layer.g.select('.nv-context .nv-x.nv-axis'))
          .call(x2Axis);

      y2Axis
        .scale(y2)
        .ticks( availableHeight2 / 36 )
        .tickSize( -availableWidth, 0);

      d3.transition(Layer.g.select('.nv-context .nv-y.nv-axis'))
          .call(y2Axis);

      Layer.g.select('.nv-context .nv-x.nv-axis')
          .attr('transform', 'translate(0,' + y2.range()[0] + ')');

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
              var leftWidth = x2(d[0]) - x.range()[0],
                  rightWidth = x.range()[1] - x2(d[1]);
              d3.select(this).select('.left')
                .attr('width',  leftWidth < 0 ? 0 : leftWidth);
              d3.select(this).select('.right')
                .attr('x', x2(d[1]))
                .attr('width', rightWidth < 0 ? 0 : rightWidth);
            });
      }

      function onBrush() {
        brushExtent = brush.empty() ? null : brush.extent();
        var extent = brush.empty() ? x2.domain() : brush.extent();

        //The brush extent cannot be less than one.  If it is, don't update the line chart.
        if (Math.abs(extent[0] - extent[1]) <= 1)
          return;

        dispatch.brush({extent: extent, brush: brush});

        updateBrushBG();

        // Update Main (Focus)
        var focusLinesWrap = Layer.g.select('.nv-focus .nv-linesWrap')
            .datum(
              data
                .filter(function(d) { return !d.disabled })
                .map(function(d) {
                  return {
                    key: d.key,
                    values: d.values.filter(function(d,i) {
                      return lines.x()(d,i) >= extent[0] && lines.x()(d,i) <= extent[1];
                    })
                  }
                })
            );
        focusLinesWrap.transition().duration(transitionDuration).call(lines);

        // Update Main (Focus) Axes
        Layer.g.select('.nv-focus .nv-x.nv-axis').transition().duration(transitionDuration).call(xAxis);
        Layer.g.select('.nv-focus .nv-y.nv-axis').transition().duration(transitionDuration).call(yAxis);
      }

      //============================================================

    });

    return chart;
  }


  //============================================================
  // Event Handling/Dispatching (out of chart's scope)
  //------------------------------------------------------------

  lines.dispatch.on('elementMouseover.tooltip', function(e) {
    e.pos = [e.pos[0] +  Layer.margin.left, e.pos[1] + Layer.margin.top];
    dispatch.tooltipShow(e);
  });

  lines.dispatch.on('elementMouseout.tooltip', function(e) {
    dispatch.tooltipHide(e);
  });

  dispatch.on('tooltipHide', function() {
    if (tooltips) nv.tooltip.cleanup();
  });

  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  // expose chart's sub-components
  chart.dispatch = dispatch;
  chart.legend = legend;
  chart.lines = lines;
  chart.lines2 = lines2;
  chart.xAxis = xAxis;
  chart.yAxis = yAxis;
  chart.x2Axis = x2Axis;
  chart.y2Axis = y2Axis;

  d3.rebind(chart, lines, 'defined', 'isArea', 'size', 'xDomain', 'yDomain', 'xRange', 'yRange', 'forceX', 'forceY',
      'interactive', 'clipEdge', 'clipVoronoi', 'id');

  chart.options = nv.utils.optionsFunc.bind(chart);

  chart.x = function(_) {
    if (!arguments.length) return lines.x;
    lines.x(_);
    lines2.x(_);
    return chart;
  };

  chart.y = function(_) {
    if (!arguments.length) return lines.y;
    lines.y(_);
    lines2.y(_);
    return chart;
  };

  chart.margin = function(_) {
    if (!arguments.length) return Layer.margin;
      Layer.margin.top    = nv.utils.valueOrDefault(_.top, Layer.margin.top);
      Layer.margin.right  = nv.utils.valueOrDefault(_.right, Layer.margin.right);
      Layer.margin.bottom = nv.utils.valueOrDefault(_.bottom, Layer.margin.bottom);
      Layer.margin.left   = nv.utils.valueOrDefault(_.left, Layer.margin.left);
    return chart;
  };

  chart.margin2 = function(_) {
    if (!arguments.length) return margin2;
    margin2 = _;
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

  chart.height2 = function(_) {
    if (!arguments.length) return height2;
    height2 = _;
    return chart;
  };

  chart.color = function(_) {
    if (!arguments.length) return color;
    color = nv.utils.getColor(_);
    legend.color(color);
    return chart;
  };

  chart.showLegend = function(_) {
    if (!arguments.length) return Layer.options.showLegend;
    Layer.options.showLegend = _;
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

  chart.interpolate = function(_) {
    if (!arguments.length) return lines.interpolate();
    lines.interpolate(_);
    lines2.interpolate(_);
    return chart;
  };

  chart.noData = function(_) {
    if (!arguments.length) return Layer.options.noData;
    Layer.options.noData = _;
    return chart;
  };

  // Chart has multiple similar Axes, to prevent code duplication, probably need to link all axis functions manually like below
  chart.xTickFormat = function(_) {
    if (!arguments.length) return xAxis.tickFormat();
    xAxis.tickFormat(_);
    x2Axis.tickFormat(_);
    return chart;
  };

  chart.yTickFormat = function(_) {
    if (!arguments.length) return yAxis.tickFormat();
    yAxis.tickFormat(_);
    y2Axis.tickFormat(_);
    return chart;
  };

  chart.brushExtent = function(_) {
    if (!arguments.length) return brushExtent;
    brushExtent = _;
    return chart;
  };

  chart.transitionDuration = function(_) {
    if (!arguments.length) return transitionDuration;
    transitionDuration = _;
    return chart;
  };

  //============================================================

  return chart;
};
