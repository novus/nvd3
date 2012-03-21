
nv.models.lineWithFocus = function() {
  var margin  = {top: 30, right: 20, bottom: 30, left: 60},
      margin2 = {top: 0, right: 20, bottom: 20, left: 60},
      width = 960,
      height = 500,
      height1 = 400,
      height2 = 100,
      dotRadius = function() { return 2.5 },
      color = d3.scale.category10().range(),
      id = Math.floor(Math.random() * 10000), //Create semi-unique ID incase user doesn't select one
      dispatch = d3.dispatch('tooltipShow', 'tooltipHide');

  var x = d3.scale.linear(),
      y = d3.scale.linear(),
      x2 = d3.scale.linear(),
      y2 = d3.scale.linear(),
      getX = function(d) { return d.x },
      getY = function(d) { return d.y },
      xAxis = nv.models.xaxis().scale(x),
      yAxis = nv.models.yaxis().scale(y),
      xAxis2 = nv.models.xaxis().scale(x2),
      yAxis2 = nv.models.yaxis().scale(y2),
      legend = nv.models.legend().height(30),
      focus = nv.models.line(),
      context = nv.models.line().dotRadius(.1).interactive(false);

  var brush = d3.svg.brush()
            .x(x2)
            .on('brush', onBrush);


  var wrap, gEnter, g, focus, focusLines, contextWrap, focusWrap, contextLines;  //brought all variables to this scope for use within function... is this a bad idea?


  function chart(selection) {
    selection.each(function(data) {
      var seriesData = data.filter(function(d) { return !d.disabled })
            .map(function(d) { return d.values });

      x2  .domain(d3.extent(d3.merge(seriesData), getX ))
          .range([0, width - margin.left - margin.right]);
      y2  .domain(d3.extent(d3.merge(seriesData), getY ))
          .range([height2 - margin2.top - margin2.bottom, 0]);

      x   .domain(brush.empty() ? x2.domain() : brush.extent())
          .range([0, width - margin.left - margin.right]);
      y   .domain(y2.domain())
          .range([height1 - margin.top - margin.bottom, 0]);


      focus
        .width(width - margin.left - margin.right)
        .height(height1 - margin.top - margin.bottom)
        .color(data.map(function(d,i) {
          return d.color || color[i % 10];
        }).filter(function(d,i) { return !data[i].disabled }))

      context
        .width(width - margin.left - margin.right)
        .height(height2 - margin2.top - margin2.bottom)
        .color(data.map(function(d,i) {
          return d.color || color[i % 10];
        }).filter(function(d,i) { return !data[i].disabled }))




      wrap = d3.select(this).selectAll('g.wrap').data([data]);
      gEnter = wrap.enter().append('g').attr('class', 'wrap d3lineWithFocus').append('g');

      gEnter.append('g').attr('class', 'focus');
      gEnter.append('g').attr('class', 'context');
      gEnter.append('g').attr('class', 'legendWrap');



      g = wrap.select('g')
          //.attr('transform', 'translate(0,0)');




      // ********** LEGEND **********

      legend.width(width/2 - margin.right);

      g.select('.legendWrap')
          .datum(data)
          .attr('transform', 'translate(' + (width/2 - margin.left) + ',0)')
          .call(legend);


      //TODO: margins should be adjusted based on what components are used: axes, axis labels, legend
      margin.top = legend.height();




      // ********** FOCUS **********

      focusWrap = g.select('.focus')
          .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      gEnter.select('.focus').append('g').attr('class', 'x axis');
      gEnter.select('.focus').append('g').attr('class', 'y axis');
      gEnter.select('.focus').append('g').attr('class', 'focusLines');


      focusLines = g.select('.focusLines')
          .datum(data.filter(function(d) { return !d.disabled }))

      d3.transition(focusLines).call(focus);


      xAxis
        .domain(x.domain())
        .range(x.range())
        .ticks( width / 100 )
        .tickSize(-(height1 - margin.top - margin.bottom), 0);

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




      // ********** CONTEXT **********

      contextWrap = g.select('.context')
          .attr('transform', 'translate(' + margin2.left + ',' + height1 + ')');

      gEnter.select('.context').append('g').attr('class', 'x2 axis');
      gEnter.select('.context').append('g').attr('class', 'y2 axis');
      gEnter.select('.context').append('g').attr('class', 'contextLines');
      gEnter.select('.context').append('g').attr('class', 'x brush')
          .attr('class', 'x brush')
          .call(brush)
        .selectAll('rect')
          .attr('y', -5)
          .attr('height', height2 + 4);

      contextLines = contextWrap.select('.contextLines')
          .datum(data.filter(function(d) { return !d.disabled }))

      d3.transition(contextLines).call(context);


      xAxis2
        .domain(x2.domain())
        .range(x2.range())
        .ticks( width / 100 )
        .tickSize(-(height2 - margin2.top - margin2.bottom), 0);

      contextWrap.select('.x2.axis')
          .attr('transform', 'translate(0,' + y2.range()[0] + ')');
      d3.transition(contextWrap.select('.x2.axis'))
          .call(xAxis2);


      yAxis2
        .domain(y2.domain())
        .range(y2.range())
        .ticks( (height2 - margin2.top  - margin2.bottom) / 24 )
        .tickSize(-(width - margin2.right - margin2.left), 0);

      contextWrap.select('.y2.axis');

      d3.transition(contextWrap.select('.y2.axis'))
          .call(yAxis2);






      // ********** EVENT LISTENERS **********

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


      focus.dispatch.on('pointMouseover.tooltip', function(e) {
        dispatch.tooltipShow({
          point: e.point,
          series: e.series,
          pos: [e.pos[0] + margin.left, e.pos[1] + margin.top],
          seriesIndex: e.seriesIndex,
          pointIndex: e.pointIndex
        });
      });
      focus.dispatch.on('pointMouseout.tooltip', function(e) {
        dispatch.tooltipHide(e);
      });

    });

    return chart;
  }



  // ********** FUNCTIONS **********

  function onBrush() {
    x.domain(brush.empty() ? x2.domain() : brush.extent());

    focus.xDomain(x.domain());

    focusLines.call(focus)

    wrap.select('.x.axis').call(xAxis);
  }




  // ********** PUBLIC ACCESSORS **********

  chart.dispatch = dispatch;

  chart.x = function(_) {
    if (!arguments.length) return getX;
    getX = _;
    focus.x(_);
    context.x(_);
    return chart;
  };

  chart.y = function(_) {
    if (!arguments.length) return getY;
    getY = _;
    focus.y(_);
    context.y(_);
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
    height1 =  _ - height2;
    return chart;
  };

  chart.contextHeight = function(_) {
    if (!arguments.length) return height2;
    height2 = _;
    height1 = height - _;
    return chart;
  };

  chart.dotRadius = function(_) {
    if (!arguments.length) return dotRadius;
    dotRadius = d3.functor(_);
    focus.dotRadius = _;
    return chart;
  };

  chart.id = function(_) {
    if (!arguments.length) return id;
    id = _;
    return chart;
  };


  // Chart has multiple similar Axes, to prevent code duplication, probably need to link all axis functions manually like below
  chart.xTickFormat = function(_) {
    if (!arguments.length) return x.tickFormat();
    xAxis.tickFormat(_);
    xAxis2.tickFormat(_);
    return chart;
  };

  chart.yTickFormat = function(_) {
    if (!arguments.length) return y.tickFormat();
    yAxis.tickFormat(_);
    yAxis2.tickFormat(_);
    return chart;
  };



  //TODO: allow for both focus and context axes to be linked
  chart.xAxis = xAxis;
  chart.yAxis = yAxis;


  return chart;
}
