nv.models.multiBarHorizontalChart = function() {
  "use strict";
  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var multibar = nv.models.multiBarHorizontal()
    , xAxis = nv.models.axis()
    , yAxis = nv.models.axis()
    , legend = nv.models.legend().height(30)
    , controls = nv.models.legend().height(30)
    ;

  var canvas = new Canvas({
        margin: {top: 30, right: 20, bottom: 50, left: 60}
        , chartClass: 'multiBarHorizontalChart'
      })
    , color = nv.utils.defaultColor()
    , showControls = true
    , showXAxis = true
    , showYAxis = true
    , stacked = false
    , tooltips = true
    , tooltip = function(key, x, y) {
        return '<h3>' + key + ' - ' + x + '</h3>' +
               '<p>' +  y + '</p>'
      }
    , x //can be accessed via chart.xScale()
    , y //can be accessed via chart.yScale()
    , state = { stacked: stacked }
    , defaultState = null
    , dispatch = d3.dispatch('tooltipShow', 'tooltipHide', 'stateChange', 'changeState','renderEnd')
    , controlWidth = function() { return showControls ? 180 : 0 }
    , transitionDuration = 250
    ;

  multibar
    .stacked(stacked);
  xAxis
    .orient('left')
    .tickPadding(5)
    .highlightZero(false)
    .showMaxMin(false)
    .tickFormat(function(d) { return d });
  yAxis
    .orient('bottom')
    .tickFormat(d3.format(',.1f'));

  controls.updateState(false);
  //============================================================


  //============================================================
  // Private Variables
  //------------------------------------------------------------

  var showTooltip = function(e, offsetElement) {
    var left = e.pos[0] + ( offsetElement.offsetLeft || 0 ),
        top = e.pos[1] + ( offsetElement.offsetTop || 0),
        x = xAxis.tickFormat()(multibar.x()(e.point, e.pointIndex)),
        y = yAxis.tickFormat()(multibar.y()(e.point, e.pointIndex)),
        content = tooltip(e.series.key, x, y);

    nv.tooltip.show([left, top], content, e.value < 0 ? 'e' : 'w', null, offsetElement);
  };

  //============================================================
  var renderWatch = nv.utils.renderWatch(dispatch, transitionDuration);

  function chart(selection) {

    renderWatch.reset();

    selection.each(function(data) {

      canvas.setRoot(this);

      if (canvas.noData(data))
        return chart;

      var that = this,
        availableWidth = canvas.available.width,
        availableHeight = canvas.available.height;

      chart.update = function() { canvas.svg.transition().duration(transitionDuration).call(chart) };

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

      x = multibar.xScale();
      y = multibar.yScale();

      //------------------------------------------------------------

      //------------------------------------------------------------
      // Setup containers and skeleton of chart

      canvas.wrapChart(data);
      canvas.gEnter.append('g').attr('class', 'nv-x nv-axis');
      canvas.gEnter.append('g').attr('class', 'nv-y nv-axis')
            .append('g').attr('class', 'nv-zeroLine')
            .append('line');
      canvas.gEnter.append('g').attr('class', 'nv-barsWrap');
      canvas.gEnter.append('g').attr('class', 'nv-legendWrap');
      canvas.gEnter.append('g').attr('class', 'nv-controlsWrap');

      //------------------------------------------------------------

      //------------------------------------------------------------
      // Legend

      if (canvas.options.showLegend) {
        legend.width(availableWidth - controlWidth());
        if (multibar.barColor())
          data.forEach(function(series,i) { series.color = d3.rgb('#ccc').darker(i * 1.5).toString() });
        canvas.g.select('.nv-legendWrap')
          .datum(data)
          .call(legend);
        if ( canvas.margin.top != legend.height()) {
          canvas.margin.top = legend.height();
          availableHeight = (height || parseInt(canvas.svg.style('height')) || 400) - canvas.margin.top - canvas.margin.bottom;
        }
        canvas.g.select('.nv-legendWrap').attr('transform', 'translate(' + controlWidth() + ',' + (-canvas.margin.top) +')');
      }
        
      //------------------------------------------------------------

      //------------------------------------------------------------
      // Controls

      if (showControls) {
        var controlsData = [
          { key: 'Grouped', disabled: multibar.stacked() },
          { key: 'Stacked', disabled: !multibar.stacked() }
        ];
        controls.width(controlWidth()).color(['#444', '#444', '#444']);
        canvas.g.select('.nv-controlsWrap')
          .datum(controlsData)
          .attr('transform', 'translate(0,' + (-canvas.margin.top) +')')
          .call(controls);
      }

      //------------------------------------------------------------

      //------------------------------------------------------------
      // Main Chart Component(s)

      multibar
        .disabled(data.map(function(series) { return series.disabled }))
        .width(availableWidth)
        .height(availableHeight)
        .color(
              data.map(function(d,i) { return d.color || color(d, i) })
                  .filter(function(d,i) { return !data[i].disabled })
          );

      var barsWrap = canvas.g.select('.nv-barsWrap')
          .datum(data.filter(function(d) { return !d.disabled }));

      barsWrap.transition().call(multibar);

      //------------------------------------------------------------

      //------------------------------------------------------------
      // Setup Axes

      if (showXAxis) {
          xAxis
            .scale(x)
            .ticks( availableHeight / 24 )
            .tickSize(-availableWidth, 0 );
          canvas.g.select('.nv-x.nv-axis')
            .transition()
            .call(xAxis);
      }

      if (showYAxis) {
        yAxis
          .scale(y)
          .ticks( availableWidth / 100 )
          .tickSize( -availableHeight, 0 );
        canvas.g.select('.nv-y.nv-axis')
          .attr('transform', 'translate(0,' + availableHeight + ')')
          .transition()
          .call(yAxis);
      }

      // Zero line
      canvas.g.select(".nv-zeroLine line")
        .attr("x1", y(0))
        .attr("x2", y(0))
        .attr("y1", 0)
        .attr("y2", -availableHeight);

      //------------------------------------------------------------

      //============================================================
      // Event Handling/Dispatching (in chart's scope)
      //------------------------------------------------------------

      legend.dispatch.on('stateChange', function(newState) {
        state = newState;
        dispatch.stateChange(state);
        chart.update();
      });

      controls.dispatch.on('legendClick', function(d) {
        if (!d.disabled) return;
        controlsData = controlsData.map(function(s) {
          s.disabled = true;
          return s;
        });
        d.disabled = false;
        switch (d.key) {
          case 'Grouped':
            multibar.stacked(false);
            break;
          case 'Stacked':
            multibar.stacked(true);
            break;
        }
        state.stacked = multibar.stacked();
        dispatch.stateChange(state);
        chart.update();
      });

      dispatch.on('tooltipShow', function(e) {
        if (tooltips) showTooltip(e, that.parentNode);
      });

      // Update chart from a state object passed to event handler
      dispatch.on('changeState', function(e) {
        if (typeof e.disabled !== 'undefined') {
          data.forEach(function(series,i) { series.disabled = e.disabled[i] });
          state.disabled = e.disabled;
        }
        if (typeof e.stacked !== 'undefined') {
          multibar.stacked(e.stacked);
          state.stacked = e.stacked;
        }
        chart.update();
      });

      //============================================================

    });

    renderWatch.renderEnd('multibar horizontal chart immediate');

    return chart;

  }


  //============================================================
  // Event Handling/Dispatching (out of chart's scope)
  //------------------------------------------------------------

  multibar.dispatch
    .on('elementMouseover.tooltip', function(e) {
      e.pos = [e.pos[0] +  canvas.margin.left, e.pos[1] + canvas.margin.top];
      dispatch.tooltipShow(e);
    })
    .on('elementMouseout.tooltip', function(e) {
      dispatch.tooltipHide(e);
    });
  dispatch.on('tooltipHide', function() {
    if (tooltips)
        nv.tooltip.cleanup();
  });

  //============================================================

  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  // expose chart's sub-components
  chart.dispatch = dispatch;
  chart.multibar = multibar;
  chart.legend = legend;
  chart.xAxis = xAxis;
  chart.yAxis = yAxis;

  d3.rebind(chart, multibar, 'x', 'y', 'xDomain', 'yDomain', 'xRange', 'yRange', 'forceX', 'forceY',
    'clipEdge', 'id', 'delay', 'showValues','showBarLabels', 'valueFormat', 'stacked', 'barColor');

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
    if (!arguments.length) return transitionDuration;
    transitionDuration = _;
    return chart;
  };
  //============================================================

  return chart;
};