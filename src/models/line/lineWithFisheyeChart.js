
nv.models.lineChartFisheye = function() {
  "use strict";
  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var Layer = new Layer({
        margin: {top: 30, right: 20, bottom: 50, left: 60}
        , chartClass: 'lineChart'
      })
      , color = nv.utils.defaultColor()
      , showControls = true
      , fisheye = 0
      , pauseFisheye = false
      , tooltips = true
      , tooltip = function(key, x, y) {
          return '<h3>' + key + '</h3>' +
                 '<p>' +  y + ' at ' + x + '</p>'
        }
      , lines = nv.models.lineFisheye().xScale(x)
      , xAxis = nv.models.axis().scale(x).orient('bottom').tickPadding(5)
      , yAxis = nv.models.axis().scale(y).orient('left')
      , legend = nv.models.legend().height(30)
      , controls = nv.models.legend().height(30).updateState(false)
      , x = d3.fisheye.scale(d3.scale.linear).distortion(0)
      , y = lines.yScale()
      , dispatch = d3.dispatch('tooltipShow', 'tooltipHide');

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
      },
    controlsData = [ { key: 'Magnify', disabled: true } ];

  function chart(selection) {
    selection.each(function(data) {

      Layer.setRoot(this);
      if (Layer.noData(data))
        return chart;

      var that = this
          , availableWidth = Layer.available.width
          , availableHeight = Layer.available.height;

      chart.update = function() { Layer.svg.transition().call(chart) };
      chart.container = this; // I need a reference to the container in order to have outside code check if the chart is visible or not

      Layer.wrapChart(data);

      Layer.gEnter.append('rect')
          .attr('class', 'nvd3 nv-background')
          .attr('width', availableWidth)
          .attr('height', availableHeight);

        Layer.gEnter.append('g').attr('class', 'nv-x nv-axis');
        Layer.gEnter.append('g').attr('class', 'nv-y nv-axis');
        Layer.gEnter.append('g').attr('class', 'nv-linesWrap');
        Layer.gEnter.append('g').attr('class', 'nv-legendWrap');
        Layer.gEnter.append('g').attr('class', 'nv-controlsWrap');
        Layer.gEnter.append('g').attr('class', 'nv-controlsWrap');

      var g = Layer.wrap.select('g');

      if (Layer.options.showLegend) {
        legend.width(availableWidth);
        g.select('.nv-legendWrap').datum(data).call(legend);
        if ( Layer.margin.top != legend.height()) {
          Layer.margin.top = legend.height();
          availableHeight = (Layer.options.size.height || parseInt(Layer.svg.style('height')) || 400)
                             - Layer.margin.top - Layer.margin.bottom;
        }
        g.select('.nv-legendWrap').attr('transform', 'translate(0,' + (-Layer.margin.top) +')')
      }
      if (showControls) {
        controls.width(180).color(['#444']);
        g.select('.nv-controlsWrap')
            .datum(controlsData)
            .attr('transform', 'translate(0,' + (-Layer.margin.top) +')')
            .call(controls);
      }
      lines
        .width(availableWidth)
        .height(availableHeight)
        .color(
              data
                  .map(function(d,i) { return d.color || color(d, i) })
                  .filter(function(d,i) { return !data[i].disabled })
          );
      var linesWrap = g.select('.nv-linesWrap')
          .datum(data.filter(function(d) { return !d.disabled }));
      d3.transition(linesWrap).call(lines);
      xAxis
        //.scale(x)
        .ticks( availableWidth / 100 )
        .tickSize(-availableHeight, 0);
      g.select('.nv-x.nv-axis')
          .attr('transform', 'translate(0,' + y.range()[0] + ')');
      d3.transition(g.select('.nv-x.nv-axis'))
          .call(xAxis);
      yAxis
        //.scale(y)
        .ticks( availableHeight / 36 )
        .tickSize( -availableWidth, 0);
      d3.transition(g.select('.nv-y.nv-axis'))
          .call(yAxis);
      g.select('.nv-background')
          .on('mousemove', updateFisheye)
          .on('click', function() { pauseFisheye = !pauseFisheye; });

      function updateFisheye() {
        if (pauseFisheye) {
          //g.select('.background') .style('pointer-events', 'none');
          g.select('.nv-point-paths').style('pointer-events', 'all');
          return false;
        }

        g.select('.nv-background').style('pointer-events', 'all');
        g.select('.nv-point-paths').style('pointer-events', 'none' );

        var mouse = d3.mouse(this);
        linesWrap.call(lines);
        g.select('.nv-x.nv-axis').call(xAxis);
        x.distortion(fisheye).focus(mouse[0]);
      }

      controls.dispatch.on('legendClick', function(d) {
        d.disabled = !d.disabled;

        fisheye = d.disabled ? 0 : 5;
        g.select('.nv-background') .style('pointer-events', d.disabled ? 'none' : 'all');
        g.select('.nv-point-paths').style('pointer-events', d.disabled ? 'all' : 'none' );

        if (d.disabled) {
          x.distortion(fisheye).focus(0);
          linesWrap.call(lines);
          g.select('.nv-x.nv-axis').call(xAxis);
        } else
          pauseFisheye = false;
        chart.update();
      });

      legend.dispatch
        .on('stateChange', function(newState) {
          chart.update();
        })
        .on('elementMouseover.tooltip', function(e) {
          e.pos = [e.pos[0] +  Layer.margin.left, e.pos[1] + Layer.margin.top];
          dispatch.tooltipShow(e);
        });
      if (tooltips)
          dispatch.on('tooltipShow', function(e) { showTooltip(e, that.parentNode) } ); // TODO: maybe merge with above?
      lines.dispatch.on('elementMouseout.tooltip', function(e) {
        dispatch.tooltipHide(e);
      });
      if (tooltips) dispatch.on('tooltipHide', nv.tooltip.cleanup);
    });

    return chart;
  }

  chart.dispatch = dispatch;
  chart.legend = legend;
  chart.xAxis = xAxis;
  chart.yAxis = yAxis;

  d3.rebind(chart, lines, 'defined', 'x', 'y', 'size', 'xDomain', 'yDomain', 'xRange', 'yRange', 'forceX', 'forceY',
      'interactive', 'clipEdge', 'clipVoronoi', 'id', 'interpolate');

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

  chart.noData = function(_) {
    if (!arguments.length) return Layer.options.noData;
    Layer.options.noData = _;
    return chart;
  };

  return chart;
};
