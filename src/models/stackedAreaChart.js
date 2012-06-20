
nv.models.stackedAreaChart = function() {
  var margin = {top: 30, right: 20, bottom: 50, left: 60},
      width = null,
      height = null,
      color = d3.scale.category20().range(),
      showControls = true,
      showLegend = true,
      tooltips = true,
      tooltip = function(key, x, y, e, graph) { 
        return '<h3>' + key + '</h3>' +
               '<p>' +  y + ' on ' + x + '</p>'
      };


  var stacked = nv.models.stackedArea(),
      x = stacked.xScale(),
      y = stacked.yScale(),
      xAxis = nv.models.axis().scale(x).orient('bottom'),
      yAxis = nv.models.axis().scale(y).orient('left'),
      legend = nv.models.legend().height(30),
      controls = nv.models.legend().height(30),
      dispatch = d3.dispatch('tooltipShow', 'tooltipHide');

  //TODO: let user select default
  var controlsData = [
    { key: 'Stacked' },
    { key: 'Stream', disabled: true },
    { key: 'Expanded', disabled: true }
  ];

  var showTooltip = function(e, offsetElement) {
    var left = e.pos[0] + ( offsetElement.offsetLeft || 0 ),
        top = e.pos[1] + ( offsetElement.offsetTop || 0),
        x = xAxis.tickFormat()(stacked.x()(e.point)),
        y = yAxis.tickFormat()(stacked.y()(e.point)),
        content = tooltip(e.series.key, x, y, e, chart);

    nv.tooltip.show([left, top], content, e.value < 0 ? 'n' : 's');
  };


  function chart(selection) {
    selection.each(function(data) {
      var container = d3.select(this),
          that = this;

      //TODO: decide if this makes sense to add into all the models for ease of updating (updating without needing the selection)
      chart.update = function() { selection.transition().call(chart) };


      var availableWidth = (width  || parseInt(container.style('width')) || 960)
                             - margin.left - margin.right,
          availableHeight = (height || parseInt(container.style('height')) || 400)
                             - margin.top - margin.bottom;



      var wrap = container.selectAll('g.wrap.stackedAreaChart').data([data]);
      var gEnter = wrap.enter().append('g').attr('class', 'wrap nvd3 stackedAreaChart').append('g');

      gEnter.append('g').attr('class', 'x axis');
      gEnter.append('g').attr('class', 'y axis');
      gEnter.append('g').attr('class', 'stackedWrap');
      gEnter.append('g').attr('class', 'legendWrap');
      gEnter.append('g').attr('class', 'controlsWrap');


      var g = wrap.select('g');


      if (showLegend) {
        legend
          .width( availableWidth / 2 );

        g.select('.legendWrap')
            .datum(data)
            .call(legend);

        if ( margin.top != legend.height()) {
          margin.top = legend.height();
          availableHeight = (height || parseInt(container.style('height')) || 400)
                             - margin.top - margin.bottom;
        }

        g.select('.legendWrap')
            .attr('transform', 'translate(' + (availableWidth/2 - margin.left) + ',' + (-margin.top) +')');
      }


      stacked
        .width(availableWidth)
        .height(availableHeight)



      if (showControls) {
        controls.width(280).color(['#444', '#444', '#444']);
        g.select('.controlsWrap')
            .datum(controlsData)
            .attr('transform', 'translate(0,' + (-margin.top) +')')
            .call(controls);
      }


      g.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');


      var stackedWrap = g.select('.stackedWrap')
          .datum(data);
      d3.transition(stackedWrap).call(stacked);


      xAxis
        .ticks( availableWidth / 100 )
        .tickSize( -availableHeight, 0);

      g.select('.x.axis')
          .attr('transform', 'translate(0,' + availableHeight + ')');
      d3.transition(g.select('.x.axis'))
          .call(xAxis);

      yAxis
        .ticks(stacked.offset() == 'wiggle' ? 0 : availableHeight / 36)
        .tickSize(-availableWidth, 0)
        .tickFormat(stacked.offset() == 'expand' ? d3.format('%') : d3.format(',.2f')); //TODO: stacked format should be set by caller

      d3.transition(g.select('.y.axis'))
          .call(yAxis);



      stacked.dispatch.on('areaClick.toggle', function(e) {
        if (data.filter(function(d) { return !d.disabled }).length === 1)
          data = data.map(function(d) {
            d.disabled = false; 
            return d
          });
        else
          data = data.map(function(d,i) {
            d.disabled = (i != e.seriesIndex);
            return d
          });

        selection.transition().call(chart);
      });

      legend.dispatch.on('legendClick', function(d,i) { 
        d.disabled = !d.disabled;

        if (!data.filter(function(d) { return !d.disabled }).length) {
          data.map(function(d) {
            d.disabled = false;
            return d;
          });
        }

        selection.transition().call(chart);
      });

      controls.dispatch.on('legendClick', function(d,i) { 
        if (!d.disabled) return;

        controlsData = controlsData.map(function(s) {
          s.disabled = true;
          return s;
        });
        d.disabled = false;

        switch (d.key) {
          case 'Stacked':
            stacked.style('stack');
            break;
          case 'Stream':
            stacked.style('stream');
            break;
          case 'Expanded':
            stacked.style('expand');
            break;
        }

        selection.transition().call(chart);
      });


      stacked.dispatch.on('tooltipShow', function(e) {
        //disable tooltips when value ~= 0
        //// TODO: consider removing points from voronoi that have 0 value instead of this hack
        if (!Math.round(stacked.y()(e.point) * 100)) {  // 100 will not be good for very small numbers... will have to think about making this valu dynamic, based on data range
          setTimeout(function() { d3.selectAll('.point.hover').classed('hover', false) }, 0);
          return false;
        }

        e.pos = [e.pos[0] + margin.left, e.pos[1] + margin.top],
        dispatch.tooltipShow(e);
      });
      if (tooltips) dispatch.on('tooltipShow', function(e) { showTooltip(e, that.parentNode) } ); // TODO: maybe merge with above?

      stacked.dispatch.on('tooltipHide', function(e) {
        dispatch.tooltipHide(e);
      });
      if (tooltips) dispatch.on('tooltipHide', nv.tooltip.cleanup);


    });


    return chart;
  }


  chart.dispatch = dispatch;
  chart.stacked = stacked;
  chart.xAxis = xAxis;
  chart.yAxis = yAxis;

  d3.rebind(chart, stacked, 'x', 'y', 'interactive', 'offset', 'order', 'style', 'clipEdge', 'size', 'forceX', 'forceY', 'forceSize');

  /*
  chart.x = function(_) {
    if (!arguments.length) return getX;
    getX = d3.functor(_); //not used locally, so could jsut be a rebind
    stacked.x(getX);
    return chart;
  };

  chart.y = function(_) {
    if (!arguments.length) return getY;
    getY = d3.functor(_);
    stacked.y(getY);
    return chart;
  };
  */

  chart.margin = function(_) {
    if (!arguments.length) return margin;
    margin = _;
    return chart;
  };

  chart.width = function(_) {
    if (!arguments.length) return getWidth;
    width = _;
    return chart;
  };

  chart.height = function(_) {
    if (!arguments.length) return getHeight;
    height = _;
    return chart;
  };

  chart.color = function(_) {
    if (!arguments.length) return color;
    color = _;
    legend.color(_);
    return chart;
  };

  chart.showControls = function(_) {
    if (!arguments.length) return showControls;
    showControls = _;
    return chart;
  };

  chart.showLegend = function(_) {
    if (!arguments.length) return showLegend;
    showLegend = _;
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


  return chart;
}
