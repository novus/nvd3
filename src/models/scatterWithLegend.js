
nv.models.scatterWithLegend = function() {
  var margin = {top: 30, right: 20, bottom: 50, left: 60},
      width = function() { return 960 },
      height = function() { return 500 },
      animate = 500,
      xAxisRender = true,
      yAxisRender = true,
      xAxisLabelText = false,
      yAxisLabelText = false,
      color = d3.scale.category10().range(),
      forceX = [],
      forceY = [],
      dispatch = d3.dispatch('tooltipShow', 'tooltipHide');

  var x = d3.scale.linear(),
      y = d3.scale.linear(),
      xAxis = nv.models.axis().scale(x).orient('bottom').tickPadding(10),
      yAxis = nv.models.axis().scale(y).orient('left').tickPadding(10),
      legend = nv.models.legend().height(30),
      scatter = nv.models.scatter();


  function chart(selection) {
    selection.each(function(data) {
      var seriesData = data.filter(function(d) { return !d.disabled })
            .map(function(d) { 
              return d.values.map(function(d,i) {
                return { x: scatter.x()(d,i), y: scatter.y()(d,i) }
              })
            }),
          availableWidth = width() - margin.left - margin.right,
          availableHeight = height() - margin.top - margin.bottom;

      x   .domain(d3.extent(d3.merge(seriesData).map(function(d) { return d.x }).concat(scatter.forceX) ))
          .range([0, availableWidth]);

      y   .domain(d3.extent(d3.merge(seriesData).map(function(d) { return d.y }).concat(scatter.forceY) ))
          .range([availableHeight, 0]);

      scatter
        .width(availableWidth)
        .height(availableHeight)
        .xDomain(x.domain())
        .yDomain(y.domain())
        .color(data.map(function(d,i) {
          return d.color || color[i % 20];
        }).filter(function(d,i) { return !data[i].disabled }))



      var wrap = d3.select(this).selectAll('g.wrap').data([data]);
      var gEnter = wrap.enter().append('g').attr('class', 'wrap d3scatterWithLegend').append('g');

      gEnter.append('g').attr('class', 'legendWrap');
      gEnter.append('g').attr('class', 'x axis');
      gEnter.append('g').attr('class', 'y axis');
      gEnter.append('g').attr('class', 'scatterWrap');


      legend.dispatch.on('legendClick', function(d,i, that) {
        d.disabled = !d.disabled;

        if (!data.filter(function(d) { return !d.disabled }).length) {
          data.map(function(d) {
            d.disabled = false;
            wrap.selectAll('.series').classed('disabled', false);
            return d;
          });
        }

        selection.transition(animate).call(chart)
      });

      /*
      legend.dispatch.on('legendMouseover', function(d, i) {
        d.hover = true;
        selection.transition().call(chart)
      });

      legend.dispatch.on('legendMouseout', function(d, i) {
        d.hover = false;
        selection.transition().call(chart)
      });
      */



      scatter.dispatch.on('pointMouseover.tooltip', function(e) {
        dispatch.tooltipShow({
          point: e.point,
          series: e.series,
          pos: [e.pos[0] + margin.left, e.pos[1] + margin.top],
          seriesIndex: e.seriesIndex,
          pointIndex: e.pointIndex
        });
      });

      scatter.dispatch.on('pointMouseout.tooltip', function(e) {
        dispatch.tooltipHide(e);
      });


      //TODO: margins should be adjusted based on what components are used: axes, axis labels, legend
      margin.top = legend.height();

      var g = wrap.select('g')
          .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');


      legend.width(availableWidth / 2);

      wrap.select('.legendWrap')
          .datum(data)
          .attr('transform', 'translate(' + (availableWidth / 2) + ',' + (-margin.top) +')')
          .call(legend);



      var scatterWrap = wrap.select('.scatterWrap')
          .datum(data.filter(function(d) { return !d.disabled }));

      //log(d3.transition()[0][0].duration); //get parent's duration

      d3.transition(scatterWrap).call(scatter);


      xAxis
        .domain(x.domain())
        .range(x.range())
        .ticks( availableWidth / 100 )
        .tickSize(-availableHeight, 0);

      g.select('.x.axis')
          .attr('transform', 'translate(0,' + y.range()[0] + ')');

      d3.transition(g.select('.x.axis'))
          .call(xAxis);


      yAxis
        .domain(y.domain())
        .range(y.range())
        .ticks( availableHeight / 36 )
        .tickSize( -availableWidth, 0);

      d3.transition(g.select('.y.axis'))
          .call(yAxis);

    });

    return chart;
  }


  chart.dispatch = dispatch;
  chart.legend = legend;
  chart.xAxis = xAxis;
  chart.yAxis = yAxis;

  d3.rebind(chart, scatter, 'x', 'y', 'size', 'xDomain', 'yDomain', 'forceX', 'forceY', 'interactive', 'clipEdge', 'clipVoronoi', 'id', 'showDistX', 'showDistY');


  chart.margin = function(_) {
    if (!arguments.length) return margin;
    margin = _;
    return chart;
  };

  chart.width = function(_) {
    if (!arguments.length) return width;
    width = d3.functor(_);
    return chart;
  };

  chart.height = function(_) {
    if (!arguments.length) return height;
    height = d3.functor(_);
    return chart;
  };


  return chart;
}
