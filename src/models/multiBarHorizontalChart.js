
nv.models.multiBarHorizontalChart = function() {
  var margin = {top: 30, right: 20, bottom: 50, left: 60},
      width = null,
      height = null,
      color = d3.scale.category20().range(),
      showControls = true,
      showLegend = true,
      tooltips = true,
      tooltip = function(key, x, y, e, graph) { 
        return '<h3>' + x + '</h3>' +
               '<p>' +  y + '</p>'
      };


  var multibar = nv.models.multiBarHorizontal().stacked(false),
      x = multibar.xScale(),
      y = multibar.yScale(),
      xAxis = nv.models.axis().scale(x).orient('left').highlightZero(false),
      yAxis = nv.models.axis().scale(y).orient('bottom'),
      legend = nv.models.legend().height(30),
      controls = nv.models.legend().height(30),
      dispatch = d3.dispatch('tooltipShow', 'tooltipHide');

  xAxis.tickFormat(function(d) { return d });
  yAxis.tickFormat(d3.format(',.1f'));

  var showTooltip = function(e, offsetElement) {
    //console.log('left: ' + offsetElement.offsetLeft);
    //console.log('top: ' + offsetElement.offsetLeft);

    //TODO: FIX offsetLeft and offSet top do not work if container is shifted anywhere
    //var offsetElement = document.getElementById(selector.substr(1)),
    var left = e.pos[0] + ( offsetElement.offsetLeft || 0 ),
        top = e.pos[1] + ( offsetElement.offsetTop || 0),
        x = xAxis.tickFormat()(multibar.x()(e.point)),
        y = yAxis.tickFormat()(multibar.y()(e.point)),
        content = tooltip(e.series.key, x, y, e, chart);

    nv.tooltip.show([left, top], content, e.value < 0 ? 'e' : 'w');
  };

  //TODO: let user select default
  var controlsData = [
    { key: 'Grouped' },
    { key: 'Stacked', disabled: true },
  ];

  function chart(selection) {
    selection.each(function(data) {
      var container = d3.select(this);

      var availableWidth = (width  || parseInt(container.style('width')) || 960)
                             - margin.left - margin.right,
          availableHeight = (height || parseInt(container.style('height')) || 400)
                             - margin.top - margin.bottom;




      var wrap = container.selectAll('g.wrap.multiBarHorizontalChart').data([data]);
      var gEnter = wrap.enter().append('g').attr('class', 'wrap nvd3 multiBarHorizontalChart').append('g');

      gEnter.append('g').attr('class', 'x axis');
      gEnter.append('g').attr('class', 'y axis');
      gEnter.append('g').attr('class', 'barsWrap');
      gEnter.append('g').attr('class', 'legendWrap');
      gEnter.append('g').attr('class', 'controlsWrap');



      //TODO: margins should be adjusted based on what components are used: axes, axis labels, legend
      margin.top = legend.height();

      var g = wrap.select('g');


      if (showLegend) {
        legend.width(availableWidth / 2);

        g.select('.legendWrap')
            .datum(data)
            .call(legend);

        if ( margin.top != legend.height()) {
          margin.top = legend.height();
          availableHeight = (height || parseInt(container.style('height')) || 400)
                             - margin.top - margin.bottom;
        }

        g.select('.legendWrap')
            .attr('transform', 'translate(' + (availableWidth / 2) + ',' + (-margin.top) +')')
      }


      multibar
        .width(availableWidth)
        .height(availableHeight)
        .color(data.map(function(d,i) {
          return d.color || color[i % 10];
        }).filter(function(d,i) { return !data[i].disabled }))



      if (showControls) {
        controls.width(180).color(['#444', '#444', '#444']);
        g.select('.controlsWrap')
            .datum(controlsData)
            .attr('transform', 'translate(0,' + (-margin.top) +')')
            .call(controls);
      }


      g.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      
      var barsWrap = g.select('.barsWrap')
          .datum(data.filter(function(d) { return !d.disabled }))


      d3.transition(barsWrap).call(multibar);


      xAxis
        .ticks( availableHeight / 24 )
        .tickSize(-availableWidth, 0);

      d3.transition(g.select('.x.axis'))
          .call(xAxis);

      var xTicks = g.select('.x.axis').selectAll('g');

      xTicks
          .selectAll('line, text')
          .style('opacity', 1)

      xTicks.filter(function(d,i) {
            return i % Math.ceil(data[0].values.length / (availableWidth / 100)) !== 0;
          })
          .selectAll('line, text')
          .style('opacity', 0)

      yAxis
        .ticks( availableWidth / 100 )
        .tickSize( -availableHeight, 0);

      g.select('.y.axis')
          .attr('transform', 'translate(0,' + availableHeight + ')');
      d3.transition(g.select('.y.axis'))
          .call(yAxis);




      legend.dispatch.on('legendClick', function(d,i) {
        d.disabled = !d.disabled;

        if (!data.filter(function(d) { return !d.disabled }).length) {
          data.map(function(d) {
            d.disabled = false;
            wrap.selectAll('.series').classed('disabled', false);
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
          case 'Grouped':
            multibar.stacked(false);
            break;
          case 'Stacked':
            multibar.stacked(true);
            break;
        }

        selection.transition().call(chart);
      });


      multibar.dispatch.on('elementMouseover.tooltip', function(e) {
        e.pos = [e.pos[0] +  margin.left, e.pos[1] + margin.top];
        dispatch.tooltipShow(e);
      });
      if (tooltips) dispatch.on('tooltipShow', function(e) { showTooltip(e, container[0][0]) } ); // TODO: maybe merge with above?

      multibar.dispatch.on('elementMouseout.tooltip', function(e) {
        dispatch.tooltipHide(e);
      });
      if (tooltips) dispatch.on('tooltipHide', nv.tooltip.cleanup);


      //TODO: decide if this makes sense to add into all the models for ease of updating (updating without needing the selection)
      chart.update = function() { selection.transition().call(chart) };

    });

    return chart;
  }


  chart.dispatch = dispatch;
  chart.multibar = multibar; // really just makign the accessible for multibar.dispatch, may rethink slightly
  chart.legend = legend;
  chart.xAxis = xAxis;
  chart.yAxis = yAxis;

  d3.rebind(chart, multibar, 'x', 'y', 'xDomain', 'yDomain', 'forceX', 'forceY', 'clipEdge', 'id', 'showValues', 'valueFormat');


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
