
nv.models.historicalStockChart = function() {
  var margin = {top: 10, right: 30, bottom: 25, left: 80},
      margin2 = {top: 0, right: 30, bottom: 20, left: 80},
      width = null,
      height = null,
      height2 = 120,
      getX = function(d) { return d.x },
      getY = function(d) { return d.y },
      color = d3.scale.category20().range(),
      showLegend = false,
      tooltips = true,
      tooltip = function(key, x, y, e, graph) { 
        return '<h3>' + key + '</h3>' +
               '<p>Closed at ' +  y + ' on ' + x + '</p>'
      };


  //var lines = nv.models.line(),
  var lines = nv.models.historicalStock(),
      bars = nv.models.historicalBar(),
      x = d3.scale.linear(), // needs to be both line and historicalBar x Axis
      y1 = bars.yScale(),
      y2 = lines.yScale(),
      xAxis = nv.models.axis().scale(x).orient('bottom').tickPadding(5),
      xAxis2 = nv.models.axis().scale(x).orient('bottom').tickPadding(5),
      yAxis1 = nv.models.axis().scale(y1).orient('left'),
      yAxis2 = nv.models.axis().scale(y2).orient('left'),
      legend = nv.models.legend().height(30),
      dispatch = d3.dispatch('tooltipShow', 'tooltipHide');

  var showTooltip = function(e, offsetElement) {
    var left = e.pos[0] + ( offsetElement.offsetLeft || 0 ),
        top = e.pos[1] + ( offsetElement.offsetTop || 0),
        x = xAxis2.tickFormat()(lines.x()(e.point, e.pointIndex)),
        y = (e.series.bar ? yAxis1 : yAxis2).tickFormat()(lines.y()(e.point, e.pointIndex)),
        content = tooltip(e.series.key, x, y, e, chart);

    nv.tooltip.show([left, top], content, e.value < 0 ? 'n' : 's');
  };



  function chart(selection) {
    selection.each(function(data) {
      var container = d3.select(this),
          that = this;

      var availableWidth = (width  || parseInt(container.style('width')) || 960)
                             - margin.left - margin.right,
          availableHeight = (height || parseInt(container.style('height')) || 400)
                             - margin.top - margin.bottom - height2,
          availableHeight2 = height2 - margin2.top - margin2.bottom;


      var dataBars = data.filter(function(d) { return !d.disabled && d.bar });

      var dataLines = data.filter(function(d) { return !d.disabled && !d.bar });



      //TODO: try to remove x scale computation from this layer

      var series1 = data.filter(function(d) { return !d.disabled && d.bar })
            .map(function(d) {
              return d.values.map(function(d,i) {
                return { x: getX(d,i), y: getY(d,i) }
              })
            });

      var series2 = data.filter(function(d) { return !d.disabled && !d.bar })
            .map(function(d) {
              return d.values.map(function(d,i) {
                return { x: getX(d,i), y: getY(d,i) }
              })
            });

      x   .domain(d3.extent(d3.merge(series1.concat(series2)), function(d) { return d.x } ))
          .range([0, availableWidth]);



          /*
      x   .domain(d3.extent(d3.merge(data.map(function(d) { return d.values })), getX ))
          .range([0, availableWidth]);

      y1  .domain(d3.extent(d3.merge(dataBars), function(d) { return d.y } ))
          .range([availableHeight, 0]);

      y2  .domain(d3.extent(d3.merge(dataLines), function(d) { return d.y } ))
          .range([availableHeight, 0]);
         */



      var wrap = d3.select(this).selectAll('g.wrap.historicalStockChart').data([data]);
      var gEnter = wrap.enter().append('g').attr('class', 'wrap nvd3 historicalStockChart').append('g');

      gEnter.append('g').attr('class', 'x axis');
      gEnter.append('g').attr('class', 'x2 axis');
      gEnter.append('g').attr('class', 'y1 axis');
      gEnter.append('g').attr('class', 'y2 axis');
      gEnter.append('g').attr('class', 'barsWrap');
      gEnter.append('g').attr('class', 'linesWrap');
      gEnter.append('g').attr('class', 'legendWrap');



      var g = wrap.select('g');


      if (showLegend) {
        legend.width( availableWidth / 2 );

        g.select('.legendWrap')
            .datum(data.map(function(series) { 
              series.originalKey = series.originalKey === undefined ? series.key : series.originalKey;
              series.key = series.originalKey;
              return series;
            }))
          .call(legend);

        if ( margin.top != legend.height()) {
          margin.top = legend.height();
          availableHeight = (height || parseInt(container.style('height')) || 400)
                             - margin.top - margin.bottom;
        }

        g.select('.legendWrap')
            .attr('transform', 'translate(' + ( availableWidth / 2 ) + ',' + (-margin.top) +')');
      }




      lines
        .width(availableWidth)
        .height(availableHeight)
        .color(data.map(function(d,i) {
          return d.color || color[i % color.length];
        }).filter(function(d,i) { return !data[i].disabled && !data[i].bar }))

      bars
        .width(availableWidth)
        .height(availableHeight2)
        .color(data.map(function(d,i) {
          return d.color || color[i % color.length];
        }).filter(function(d,i) { return !data[i].disabled && data[i].bar }))



      var barsWrap = g.select('.barsWrap')
          .attr('transform', 'translate(0,' + (availableHeight + margin.bottom) + ')')
          .datum(dataBars.length ? dataBars : [{values:[]}])

      var linesWrap = g.select('.linesWrap')
          .datum(dataLines.length ? dataLines : [{values:[]}])


      d3.transition(barsWrap).call(bars);
      d3.transition(linesWrap).call(lines);


      g.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');


      xAxis
        .ticks( availableWidth / 100 )
        .tickSize(-availableHeight2, 0);

      g.select('.x.axis')
          .attr('transform', 'translate(0,' + (availableHeight + margin.bottom + availableHeight2 + margin2.top) + ')');
      d3.transition(g.select('.x.axis'))
          .call(xAxis);

      xAxis2
        .ticks( availableWidth / 100 )
        .tickSize(-availableHeight, 0);

      g.select('.x2.axis')
          .attr('transform', 'translate(0,' + availableHeight + ')');
      d3.transition(g.select('.x2.axis'))
          .call(xAxis2);


      yAxis1
        .ticks( availableHeight2 / 36 )
        .tickSize(-availableWidth, 0)
        .width(margin2.left)
        .axisLabel('Volume (K)');

      g.select('.y1.axis')
          .attr('transform', 'translate(0,' + (availableHeight + margin.bottom) + ')');
      d3.transition(g.select('.y1.axis'))
          .style('opacity', dataBars.length ? 1 : 0)
          .call(yAxis1);


      yAxis2
        .ticks( availableHeight / 36 )
        .tickSize(-availableWidth, 0) // Show the y2 rules only if y1 has none
        .width(margin.left)
        .axisLabel('Price ($)');

      g.select('.y2.axis')
          .style('opacity', dataLines.length ? 1 : 0)
          //.attr('transform', 'translate(' + x.range()[1] + ',0)');

      d3.transition(g.select('.y2.axis'))
          .call(yAxis2);



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


      lines.dispatch.on('elementMouseover.tooltip', function(e) {
        e.pos = [e.pos[0] +  margin.left, e.pos[1] + margin.top];
        dispatch.tooltipShow(e);
      });
      if (tooltips) dispatch.on('tooltipShow', function(e) { showTooltip(e, that.parentNode) } ); // TODO: maybe merge with above?

      lines.dispatch.on('elementMouseout.tooltip', function(e) {
        dispatch.tooltipHide(e);
      });
      if (tooltips) dispatch.on('tooltipHide', nv.tooltip.cleanup);


      bars.dispatch.on('elementMouseover.tooltip', function(e) {
        //e.pos = [e.pos[0] +  margin.left, e.pos[1] + margin.top];
        e.pos = [e.pos[0] + margin2.left, e.pos[1] + availableHeight + margin.top + margin.bottom + margin2.top];
        dispatch.tooltipShow(e);
      });
      if (tooltips) dispatch.on('tooltipShow', function(e) { showTooltip(e, that.parentNode) } ); // TODO: maybe merge with above?

      bars.dispatch.on('elementMouseout.tooltip', function(e) {
        dispatch.tooltipHide(e);
      });
      if (tooltips) dispatch.on('tooltipHide', nv.tooltip.cleanup);


      chart.update = function() { selection.transition().call(chart) };
      chart.container = this; // I need a reference to the container in order to have outside code check if the chart is visible or not

    });

    return chart;
  }

  chart.dispatch = dispatch;
  chart.legend = legend;
  chart.lines = lines;
  chart.bars = bars;
  chart.xAxis = xAxis;
  chart.xAxis2 = xAxis2;
  chart.yAxis1 = yAxis1;
  chart.yAxis2 = yAxis2;

  //d3.rebind(chart, lines, 'defined', 'size', 'clipVoronoi', 'interpolate');
  d3.rebind(chart, lines, 'getOpen', 'getClose', 'getHigh', 'getLow');

  //TODO: consider rebinding x, y and some other stuff, and simply do soemthign lile bars.x(lines.x()), etc.
  //d3.rebind(chart, lines, 'x', 'y', 'size', 'xDomain', 'yDomain', 'forceX', 'forceY', 'interactive', 'clipEdge', 'clipVoronoi', 'id');

  //d3.rebind(chart, lines, 'interactive');
  //consider rebinding x and y as well

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
