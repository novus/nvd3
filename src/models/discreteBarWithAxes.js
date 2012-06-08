
nv.models.discreteBarWithAxes = function() {
  var margin = {top: 30, right: 20, bottom: 50, left: 60},
      width = function() { return 960 },
      height = function() { return 500 },
      color = d3.scale.category20().range();

  //var x = d3.scale.linear(),
  var x = d3.scale.ordinal(),
      y = d3.scale.linear(),
      xAxis = nv.models.axis().scale(x).orient('bottom').highlightZero(false),
      yAxis = nv.models.axis().scale(y).orient('left'),
      discretebar = nv.models.discreteBar().stacked(false),
      dispatch = d3.dispatch('tooltipShow', 'tooltipHide');

  //TODO: let user select default
  var controlsData = [
    { key: 'Grouped' },
    { key: 'Stacked', disabled: true }
  ];

  function chart(selection) {
    selection.each(function(data) {
      var availableWidth = width() - margin.left - margin.right,
          availableHeight = height() - margin.top - margin.bottom,
          seriesData;

      if (discretebar.stacked()) {
        seriesData = data.filter(function(d) { return !d.disabled })
          .reduce(function(prev, curr, index) {  //sum up all the y's
              curr.values.forEach(function(d,i) {
                if (!index) prev[i] = {x: discretebar.x()(d,i), y:0};
                prev[i].y += discretebar.y()(d,i);
              });
              return prev;
            }, []);
      } else {
        seriesData = data.filter(function(d) { return !d.disabled })
          .map(function(d) { 
            return d.values.map(function(d,i) {
              return { x: discretebar.x()(d,i), y: discretebar.y()(d,i) }
            })
          });
      }


      //x   .domain(d3.extent(d3.merge(seriesData).map(function(d) { return d.x }).concat(discretebar.forceX) ))
          //.range([0, availableWidth]);

      x   .domain(d3.merge(seriesData).map(function(d) { return d.x }))
          .rangeBands([0, availableWidth], .1);
          //.rangeRoundBands([0, availableWidth], .1);

      y   .domain(d3.extent(d3.merge(seriesData).map(function(d) { return d.y }).concat(discretebar.forceY) ))
          .range([availableHeight, 0]);

      discretebar
        .width(availableWidth)
        .height(availableHeight)
        //.xDomain(x.domain())
        //.yDomain(y.domain())
        //.color(data.map(function(d,i) {
          //return d.color || color[i % 20];
        //}).filter(function(d,i) { return !data[i].disabled }))



      var wrap = d3.select(this).selectAll('g.wrap.discreteBarWithAxes').data([data]);
      var gEnter = wrap.enter().append('g').attr('class', 'wrap nvd3 discreteBarWithAxes').append('g');

      gEnter.append('g').attr('class', 'x axis');
      gEnter.append('g').attr('class', 'y axis');
      gEnter.append('g').attr('class', 'linesWrap');



      var g = wrap.select('g');


      g.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      var linesWrap = g.select('.linesWrap')
          .datum(data.filter(function(d) { return !d.disabled }))


      d3.transition(linesWrap).call(discretebar);


      xAxis
        .scale(x)
        //.domain(x.domain())
        //.range(x.range())
        .ticks( availableWidth / 100 )
        .tickSize(-availableHeight, 0);

      g.select('.x.axis')
          .attr('transform', 'translate(0,' + y.range()[0] + ')');
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
        .domain(y.domain())
        .range(y.range())
        .ticks( availableHeight / 36 )
        .tickSize( -availableWidth, 0);

      d3.transition(g.select('.y.axis'))
          .call(yAxis);


      discretebar.dispatch.on('elementMouseover.tooltip', function(e) {
        e.pos = [e.pos[0] +  margin.left, e.pos[1] + margin.top];
        dispatch.tooltipShow(e);
      });

      discretebar.dispatch.on('elementMouseout.tooltip', function(e) {
        dispatch.tooltipHide(e);
      });

    });

    return chart;
  }


  chart.dispatch = dispatch;
  chart.xAxis = xAxis;
  chart.yAxis = yAxis;

  d3.rebind(chart, discretebar, 'x', 'y', 'xDomain', 'yDomain', 'forceX', 'forceY', 'clipEdge', 'id');


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

  chart.color = function(_) {
    if (!arguments.length) return color;
    color = _;
    discretebar.color(_);
    return chart;
  };


  return chart;
}
