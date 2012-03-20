
nv.models.lineWithLegend = function() {
  var margin = {top: 30, right: 20, bottom: 50, left: 60},
      width = 960,
      height = 500,
      dotRadius = function() { return 2.5 },
      color = d3.scale.category10().range(),
      dispatch = d3.dispatch('tooltipShow', 'tooltipHide');

  var x = d3.scale.linear(),
      y = d3.scale.linear(),
      getX = function(d) { return d.x },
      getY = function(d) { return d.y },
      xAxis = nv.models.xaxis().scale(x),
      yAxis = nv.models.yaxis().scale(y),
      legend = nv.models.legend().height(30),
      lines = nv.models.line();


  function chart(selection) {
    selection.each(function(data) {
      var series = data.filter(function(d) { return !d.disabled })
            .map(function(d) { return d.values });

      x   .domain(d3.extent(d3.merge(series), getX ))
          .range([0, width - margin.left - margin.right]);

      y   .domain(d3.extent(d3.merge(series), getY ))
          .range([height - margin.top - margin.bottom, 0]);

      lines
        .width(width - margin.left - margin.right)
        .height(height - margin.top - margin.bottom)
        .color(data.map(function(d,i) {
          return d.color || color[i % 10];
        }).filter(function(d,i) { return !data[i].disabled }))


      var wrap = d3.select(this).selectAll('g.wrap').data([data]);
      var gEnter = wrap.enter().append('g').attr('class', 'wrap d3lineWithLegend').append('g');

      gEnter.append('g').attr('class', 'x axis');
      gEnter.append('g').attr('class', 'y axis');
      gEnter.append('g').attr('class', 'linesWrap');
      gEnter.append('g').attr('class', 'legendWrap');


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

      legend.dispatch.on('legendMouseover', function(d, i) {
        d.hover = true;
        selection.transition().call(chart)
      });

      legend.dispatch.on('legendMouseout', function(d, i) {
        d.hover = false;
        selection.transition().call(chart)
      });

      lines.dispatch.on('pointMouseover.tooltip', function(e) {
        dispatch.tooltipShow({
          point: e.point,
          series: e.series,
          pos: [e.pos[0] + margin.left, e.pos[1] + margin.top],
          seriesIndex: e.seriesIndex,
          pointIndex: e.pointIndex
        });
      });

      lines.dispatch.on('pointMouseout.tooltip', function(e) {
        dispatch.tooltipHide(e);
      });


      //TODO: margins should be adjusted based on what components are used: axes, axis labels, legend
      margin.top = legend.height();

      var g = wrap.select('g')
          .attr('transform', 'translate(' + margin.left + ',' + legend.height() + ')');


      legend.width(width/2 - margin.right);

      g.select('.legendWrap')
          .datum(data)
          .attr('transform', 'translate(' + (width/2 - margin.left) + ',' + (-legend.height()) +')')
          .call(legend);


      var linesWrap = g.select('.linesWrap')
          .datum(data.filter(function(d) { return !d.disabled }))


      d3.transition(linesWrap).call(lines);


      xAxis
        .domain(x.domain())
        .range(x.range())
        .ticks( width / 100 )
        .tickSize(-(height - margin.top - margin.bottom), 0);

      g.select('.x.axis')
          .attr('transform', 'translate(0,' + y.range()[0] + ')');
      d3.transition(g.select('.x.axis'))
          .call(xAxis);

      yAxis
        .domain(y.domain())
        .range(y.range())
        .ticks( height / 36 )
        .tickSize(-(width - margin.right - margin.left), 0);

      d3.transition(g.select('.y.axis'))
          .call(yAxis);

    });

    return chart;
  }

  chart.dispatch = dispatch;

  chart.x = function(_) {
    if (!arguments.length) return getX;
    getX = _;
    lines.x(_);
    return chart;
  };

  chart.y = function(_) {
    if (!arguments.length) return getY;
    getY = _;
    lines.y(_);
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

  chart.dotRadius = function(_) {
    if (!arguments.length) return dotRadius;
    dotRadius = d3.functor(_);
    lines.dotRadius = _;
    return chart;
  };


  // Expose the x-axis' tickFormat method.
  //chart.xAxis = {};
  //d3.rebind(chart.xAxis, xAxis, 'tickFormat');
  chart.xAxis = xAxis;

  // Expose the y-axis' tickFormat method.
  //chart.yAxis = {};
  //d3.rebind(chart.yAxis, yAxis, 'tickFormat');
  chart.yAxis = yAxis;


  return chart;
}
