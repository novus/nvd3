
nv.models.linePlusBarChart = function() {
  "use strict";
  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var lines = nv.models.line()
    , bars = nv.models.historicalBar()
    , xAxis = nv.models.axis()
    , y1Axis = nv.models.axis()
    , y2Axis = nv.models.axis()
    , legend = nv.models.legend()
    ;

  var canvas = new Canvas({
        margin : {top: 30, right: 60, bottom: 50, left: 60},
        chartClass: 'linePlusBar'
      })
    , getX = function(d) { return d.x }
    , getY = function(d) { return d.y }
    , color = nv.utils.defaultColor()
    , tooltips = true
    , tooltip = function(key, x, y) {
        return '<h3>' + key + '</h3>' +
               '<p>' +  y + ' at ' + x + '</p>';
      }
    , x
    , y1
    , y2
    , state = {}
    , defaultState = null
    , dispatch = d3.dispatch('tooltipShow', 'tooltipHide', 'stateChange', 'changeState')
    ;

  bars
    .padData(true)
    ;
  lines
    .clipEdge(false)
    .padData(true)
    ;
  xAxis
    .orient('bottom')
    .tickPadding(7)
    .highlightZero(false)
    ;
  y1Axis
    .orient('left')
    ;
  y2Axis
    .orient('right')
    ;

  //============================================================


  //============================================================
  // Private Variables
  //------------------------------------------------------------

  var showTooltip = function(e, offsetElement) {
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

      var that = this,
          availableWidth = canvas.available.width,
          availableHeight = canvas.available.height;

      chart.update = function() {
          canvas.svg.transition().call(chart);
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
      // Setup Scales

      var dataBars = data.filter(function(d) { return !d.disabled && d.bar });
      var dataLines = data.filter(function(d) { return !d.bar }); // removed the !d.disabled clause here to fix Issue #240

      //x = xAxis.scale();
      x = dataLines.filter(function(d) { return !d.disabled; }).length && dataLines.filter(function(d) { return !d.disabled; })[0].values.length ? lines.xScale() : bars.xScale();
      //x = dataLines.filter(function(d) { return !d.disabled; }).length ? lines.xScale() : bars.xScale(); //old code before change above
      y1 = bars.yScale();
      y2 = lines.yScale();

      //------------------------------------------------------------

      //------------------------------------------------------------
      // Setup containers and skeleton of chart

/*      var wrap = d3.select(this).selectAll('g.nv-wrap.nv-linePlusBar').data([data]);
      var gEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap nv-linePlusBar').append('g');
      var g = wrap.select('g');*/
      canvas.wrapChart(data);

      canvas.gEnter.append('g').attr('class', 'nv-x nv-axis');
      canvas.gEnter.append('g').attr('class', 'nv-y1 nv-axis');
      canvas.gEnter.append('g').attr('class', 'nv-y2 nv-axis');
      canvas.gEnter.append('g').attr('class', 'nv-barsWrap');
      canvas.gEnter.append('g').attr('class', 'nv-linesWrap');
      canvas.gEnter.append('g').attr('class', 'nv-legendWrap');

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
            availableHeight = (height || parseInt(canvas.svg.style('height')) || 400)
                             - canvas.margin.top - canvas.margin.bottom;
        }
        canvas.g.select('.nv-legendWrap')
            .attr('transform', 'translate(' + ( availableWidth / 2 ) + ',' + (-canvas.margin.top) +')');
      }

      //------------------------------------------------------------

      canvas.wrap.attr('transform', 'translate(' + canvas.margin.left + ',' + canvas.margin.top + ')');

      //------------------------------------------------------------
      // Main Chart Component(s)

      lines
        .width(availableWidth)
        .height(availableHeight)
        .color(data.map(function(d,i) {
          return d.color || color(d, i);
        }).filter(function(d,i) { return !data[i].disabled && !data[i].bar }));

      bars
        .width(availableWidth)
        .height(availableHeight)
        .color(data.map(function(d,i) {
          return d.color || color(d, i);
        }).filter(function(d,i) { return !data[i].disabled && data[i].bar }));

      var barsWrap = canvas.g.select('.nv-barsWrap')
          .datum(dataBars.length ? dataBars : [{values:[]}]);

      var linesWrap = canvas.g.select('.nv-linesWrap')
          .datum(dataLines[0] && !dataLines[0].disabled ? dataLines : [{values:[]}] );
          //.datum(!dataLines[0].disabled ? dataLines : [{values:dataLines[0].values.map(function(d) { return [d[0], null] }) }] );

      d3.transition(barsWrap).call(bars);
      d3.transition(linesWrap).call(lines);

      //------------------------------------------------------------


      //------------------------------------------------------------
      // Setup Axes

      xAxis
        .scale(x)
        .ticks( availableWidth / 100 )
        .tickSize(-availableHeight, 0);

      canvas.g.select('.nv-x.nv-axis')
          .attr('transform', 'translate(0,' + y1.range()[0] + ')');
      d3.transition(canvas.g.select('.nv-x.nv-axis'))
          .call(xAxis);

      y1Axis
        .scale(y1)
        .ticks( availableHeight / 36 )
        .tickSize(-availableWidth, 0);

      d3.transition(canvas.g.select('.nv-y1.nv-axis'))
          .style('opacity', dataBars.length ? 1 : 0)
          .call(y1Axis);

      y2Axis
        .scale(y2)
        .ticks( availableHeight / 36 )
        .tickSize(dataBars.length ? 0 : -availableWidth, 0); // Show the y2 rules only if y1 has none

      canvas.g.select('.nv-y2.nv-axis')
          .style('opacity', dataLines.length ? 1 : 0)
          .attr('transform', 'translate(' + availableWidth + ',0)');
          //.attr('transform', 'translate(' + x.range()[1] + ',0)');

      d3.transition(canvas.g.select('.nv-y2.nv-axis'))
          .call(y2Axis);

      //------------------------------------------------------------


      //============================================================
      // Event Handling/Dispatching (in chart's scope)
      //------------------------------------------------------------

      legend.dispatch.on('stateChange', function(newState) { 
        state = newState;
        dispatch.stateChange(state);
        chart.update();
      });

      dispatch
          .on('tooltipShow', function(e) {
            if (tooltips) showTooltip(e, that.parentNode);
          })
          // Update chart from a state object passed to event handler
          .on('changeState', function(e) {
            if (typeof e.disabled !== 'undefined') {
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

  lines
    .dispatch.on('elementMouseover.tooltip', function(e) {
      e.pos = [e.pos[0] +  canvas.margin.left, e.pos[1] + canvas.margin.top];
      dispatch.tooltipShow(e);
    })
    .on('elementMouseout.tooltip', function(e) {
      dispatch.tooltipHide(e);
    });

  bars
    .dispatch.on('elementMouseover.tooltip', function(e) {
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
  chart.legend = legend;
  chart.lines = lines;
  chart.bars = bars;
  chart.xAxis = xAxis;
  chart.y1Axis = y1Axis;
  chart.y2Axis = y2Axis;

  d3.rebind(chart, lines, 'defined', 'size', 'clipVoronoi', 'interpolate');
  //TODO: consider rebinding x, y and some other stuff, and simply do soemthign lile bars.x(lines.x()), etc.
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
      canvas.margin.top    = nv.utils.valueOrDefault(_.top, canvas.margin.top);
      canvas.margin.right  = nv.utils.valueOrDefault(_.right, canvas.margin.right);
      canvas.margin.bottom = nv.utils.valueOrDefault(_.bottom, canvas.margin.bottom);
      canvas.margin.left   = nv.utils.valueOrDefault(_.left, canvas.margin.left);
    return chart;
  };

  chart.width = function(_) {
    if (!arguments.length) return canvas.options.width;
    canvas.options.width = _;
    return chart;
  };

  chart.height = function(_) {
    if (!arguments.length) return canvas.options.height;
      canvas.options.height = _;
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

  //============================================================


  return chart;
};
