
nv.models.discreteBarChart = function() {
  "use strict";
  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var discretebar = nv.models.discreteBar()
    , xAxis = nv.models.axis()
    , yAxis = nv.models.axis()
    ;

  var canvas = new Canvas({
        margin: {top: 15, right: 10, bottom: 50, left: 60}
          , chartClass: 'discreteBarWithAxes'
          , wrapClass: 'barsWrap'
      })
    , color = nv.utils.getColor()
    , showXAxis = true
    , showYAxis = true
    , rightAlignYAxis = false
    , staggerLabels = false
    , tooltips = true
    , tooltip = function(key, x, y) {
        return '<h3>' + x + '</h3>' +
               '<p>' +  y + '</p>'
      }
    , x
    , y
    , dispatch = d3.dispatch('tooltipShow', 'tooltipHide', 'beforeUpdate', 'renderEnd')
    , transitionDuration = 250
    ;

  xAxis
    .orient('bottom')
    .highlightZero(false)
    .showMaxMin(false)
    .tickFormat(function(d) { return d })
    ;
  yAxis
    .orient((rightAlignYAxis) ? 'right' : 'left')
    .tickFormat(d3.format(',.1f'))
    ;

  //============================================================


  //============================================================
  // Private Variables
  //------------------------------------------------------------

  var showTooltip = function(e, offsetElement) {
    var left = e.pos[0] + ( offsetElement.offsetLeft || 0 ),
        top = e.pos[1] + ( offsetElement.offsetTop || 0),
        x = xAxis.tickFormat()(discretebar.x()(e.point, e.pointIndex)),
        y = yAxis.tickFormat()(discretebar.y()(e.point, e.pointIndex)),
        content = tooltip(e.series.key, x, y);
    nv.tooltip.show([left, top], content, e.value < 0 ? 'n' : 's', null, offsetElement);
  };

  var renderWatch = nv.utils.renderWatch(dispatch, transitionDuration);
  //============================================================

  function chart(selection) {
    renderWatch.reset();
    selection.each(function(data) {

      canvas.setRoot(this);
      if (canvas.noData(data)) return;
      canvas.wrapChart(data);
      canvas.gEnter.insert('g', '.nv-'+canvas.options.wrapClass).attr('class', 'nv-x nv-axis');
      canvas.gEnter.insert('g', '.nv-'+canvas.options.wrapClass).attr('class', 'nv-y nv-axis')
          .append('g')
          .attr('class', 'nv-zeroLine')
          .append('line');

      var availableWidth = canvas.available.width
        , availableHeight = canvas.available.height
        , that = this
        , xTicksPadding = [5, 17]
        , xTicks = availableWidth / 100
        , yTicks = availableHeight / 36;

      if (rightAlignYAxis)
        canvas.g.select(".nv-y.nv-axis").attr("transform", "translate(" + availableWidth + ",0)");

      chart.update = function() {
        dispatch.beforeUpdate();
        canvas.svg.transition().duration(transitionDuration).call(chart);
      };

      x = discretebar.xScale();
      y = discretebar.yScale().clamp(true);

      //------------------------------------------------------------
      // Main Chart Component(s)

      var barsWrap = canvas.g.select('.nv-barsWrap')
          .datum(data.filter(function(d) { return !d.disabled }))
          .transition()
          .call( discretebar.width(availableWidth).height(availableHeight) );
        //------------------------------------------------------------

        canvas.defsEnter.append('clipPath')
          .attr('id', 'nv-x-label-clip-' + discretebar.id())
          .append('rect');

        canvas.g.select('#nv-x-label-clip-' + discretebar.id() + ' rect')
          .attr('width', x.rangeBand() * (staggerLabels ? 2 : 1))
          .attr('height', 16)
          .attr('x', -x.rangeBand() / (staggerLabels ? 1 : 2 ));

      //------------------------------------------------------------
      // Setup Axes

      if (showXAxis) {
          xAxis
            .scale(x)
            .ticks( xTicks )
            .tickSize( -availableHeight, 0 );

          canvas.g.select('.nv-x.nv-axis')
              .attr('transform', 'translate(0,' + (y.range()[0] + ((discretebar.showValues() && y.domain()[0] < 0) ? 16 : 0)) + ')')
              .transition()
              .call(xAxis);

          // xTicks
          if (staggerLabels) {
              canvas.g.select('.nv-x.nv-axis')
                .selectAll('g')
                .selectAll('text')
                .attr('transform', function(d,i,j) { return 'translate(0,' + (j % 2 == 0 ? xTicksPadding[0] : xTicksPadding[1]) + ')' })
          }
      }

      if (showYAxis) {
          yAxis
            .scale(y)
            .ticks( yTicks )
            .tickSize( -availableWidth, 0);

          canvas.g.select('.nv-y.nv-axis')
              .transition()
              .call(yAxis);
      }

      // Zero line
      canvas.g.select(".nv-zeroLine line")
        .attr("x1",0)
        .attr("x2", availableWidth)
        .attr("y1", y(0))
        .attr("y2", y(0));

      //------------------------------------------------------------


      //============================================================
      // Event Handling/Dispatching (in chart's scope)
      //------------------------------------------------------------

      dispatch.on('tooltipShow', function(e) {
        if (tooltips) showTooltip(e, that.parentNode);
      });

    });

    renderWatch.renderEnd('discreteBar chart immediate');
    return chart;
  }

  //============================================================
  // Event Handling/Dispatching (out of chart's scope)
  //------------------------------------------------------------

  discretebar.dispatch.on('elementMouseover.tooltip', function(e) {
    e.pos = [e.pos[0] +  canvas.margin.left, e.pos[1] + canvas.margin.top];
    dispatch.tooltipShow(e);
  });

  discretebar.dispatch.on('elementMouseout.tooltip', function(e) {
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
  chart.discretebar = discretebar;
  chart.xAxis = xAxis;
  chart.yAxis = yAxis;

  d3.rebind(chart, discretebar, 'x', 'y', 'xDomain', 'yDomain', 'xRange', 'yRange', 'forceX', 'forceY', 'id', 'showValues', 'valueFormat');

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
    if (!arguments.length) return canvas.width;
    canvas.width = _;
    return chart;
  };

  chart.height = function(_) {
    if (!arguments.length) return canvas.height;
      canvas.height = _;
    return chart;
  };

  chart.color = function(_) {
    if (!arguments.length) return color;
    color = nv.utils.getColor(_);
    discretebar.color(color);
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

  chart.staggerLabels = function(_) {
    if (!arguments.length) return staggerLabels;
    staggerLabels = _;
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

  chart.transitionDuration = function(_) {
    if (!arguments.length) return transitionDuration;
    transitionDuration = _;
    return chart;
  };

  //============================================================


  return chart;
};
