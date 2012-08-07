
nv.models.discreteBarChart = function() {
  var margin = {top: 10, right: 10, bottom: 50, left: 60},
      width = null,
      height = null,
      color = nv.utils.getColor(), //a function that gets color for a datum
      staggerLabels = false,
      tooltips = true,
      tooltip = function(key, x, y, e, graph) { 
        return '<h3>' + x + '</h3>' +
               '<p>' +  y + '</p>'
      },
      noData = "No Data Available."
      ;


  var discretebar = nv.models.discreteBar(),
      x = discretebar.xScale(),
      y = discretebar.yScale(),
      xAxis = nv.models.axis().scale(x).orient('bottom').highlightZero(false).showMaxMin(false),
      yAxis = nv.models.axis().scale(y).orient('left'),
      dispatch = d3.dispatch('tooltipShow', 'tooltipHide');

  xAxis.tickFormat(function(d) { return d });
  yAxis.tickFormat(d3.format(',.1f'));


  var showTooltip = function(e, offsetElement) {
    var left = e.pos[0] + ( offsetElement.offsetLeft || 0 ),
        top = e.pos[1] + ( offsetElement.offsetTop || 0),
        x = xAxis.tickFormat()(discretebar.x()(e.point, e.pointIndex)),
        y = yAxis.tickFormat()(discretebar.y()(e.point, e.pointIndex)),
        content = tooltip(e.series.key, x, y, e, chart);

    nv.tooltip.show([left, top], content, e.value < 0 ? 'n' : 's', null, offsetElement);
  };


  //TODO: let user select default
  var controlsData = [
    { key: 'Grouped' },
    { key: 'Stacked', disabled: true }
  ];

  function chart(selection) {
    selection.each(function(data) {
      var container = d3.select(this),
          that = this;

      var availableWidth = (width  || parseInt(container.style('width')) || 960)
                             - margin.left - margin.right,
          availableHeight = (height || parseInt(container.style('height')) || 400)
                             - margin.top - margin.bottom;


      //------------------------------------------------------------
      // Display No Data message if there's nothing to show.

      if (!data || !data.length || !data.filter(function(d) { return d.values.length }).length) {
        container.append('text')
          .attr('class', 'nvd3 nv-noData')
          .attr('x', availableWidth / 2)
          .attr('y', availableHeight / 2)
          .attr('dy', '-.7em')
          .style('text-anchor', 'middle')
          .text(noData);
          return chart;
      } else {
        container.select('.nv-noData').remove();
      }

      //------------------------------------------------------------


      discretebar
        .width(availableWidth)
        .height(availableHeight);


      var wrap = container.selectAll('g.nv-wrap.nv-discreteBarWithAxes').data([data]);
      var gEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap nv-discreteBarWithAxes').append('g');
      var defsEnter = gEnter.append('defs');

      gEnter.append('g').attr('class', 'nv-x nv-axis');
      gEnter.append('g').attr('class', 'nv-y nv-axis');
      gEnter.append('g').attr('class', 'nv-barsWrap');



      var g = wrap.select('g');


      g.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      var barsWrap = g.select('.nv-barsWrap')
          .datum(data.filter(function(d) { return !d.disabled }))


      d3.transition(barsWrap).call(discretebar);


      defsEnter.append('clipPath')
          .attr('id', 'nv-x-label-clip-' + discretebar.id())
        .append('rect')

      g.select('#nv-x-label-clip-' + discretebar.id() + ' rect')
          .attr('width', x.rangeBand() * (staggerLabels ? 2 : 1))
          .attr('height', 16)
          .attr('x', -x.rangeBand() / (staggerLabels ? 1 : 2 ));


      xAxis
        .ticks( availableWidth / 100 )
        .tickSize(-availableHeight, 0);

      g.select('.nv-x.nv-axis')
          .attr('transform', 'translate(0,' + (y.range()[0] + ((discretebar.showValues() && y.domain()[0] < 0) ? 16 : 0)) + ')')
      //d3.transition(g.select('.x.axis'))
      g.select('.nv-x.nv-axis').transition().duration(0)
          .call(xAxis);


      var xTicks = g.select('.nv-x.nv-axis').selectAll('g');

      if (staggerLabels)
        xTicks
            .selectAll('text')
            .attr('transform', function(d,i,j) { return 'translate(0,' + (j % 2 == 0 ? '0' : '12') + ')' })

      yAxis
        .ticks( availableHeight / 36 )
        .tickSize( -availableWidth, 0);

      d3.transition(g.select('.nv-y.nv-axis'))
          .call(yAxis);


      discretebar.dispatch.on('elementMouseover.tooltip', function(e) {
        e.pos = [e.pos[0] +  margin.left, e.pos[1] + margin.top];
        dispatch.tooltipShow(e);
      });
      if (tooltips) dispatch.on('tooltipShow', function(e) { showTooltip(e, that.parentNode) } ); // TODO: maybe merge with above?

      discretebar.dispatch.on('elementMouseout.tooltip', function(e) {
        dispatch.tooltipHide(e);
      });
      if (tooltips) dispatch.on('tooltipHide', nv.tooltip.cleanup);


      //TODO: decide if this makes sense to add into all the models for ease of updating (updating without needing the selection)
      chart.update = function() { selection.transition().call(chart); };
      chart.container = this; // I need a reference to the container in order to have outside code check if the chart is visible or not

    });

    return chart;
  }


  chart.dispatch = dispatch;
  chart.discretebar = discretebar; // really just makign the accessible for discretebar.dispatch, may rethink slightly
  chart.xAxis = xAxis;
  chart.yAxis = yAxis;

  d3.rebind(chart, discretebar, 'x', 'y', 'xDomain', 'yDomain', 'forceX', 'forceY', 'id', 'showValues', 'valueFormat');


  chart.margin = function(_) {
    if (!arguments.length) return margin;
    margin = _;
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
    discretebar.color(color);
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
    if (!arguments.length) return noData;
    noData = _;
    return chart;
  };


  return chart;
}
