
nv.models.stackedAreaWithLegend = function() {
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
      controls = nv.models.legend().height(30),
      stacked = nv.models.stackedArea();

  var controlsData = [
    { key: 'Stacked' },
    { key: 'Stream', disabled: true },
    { key: 'Expanded', disabled: true }
  ];



  function chart(selection) {
    selection.each(function(data) {
      var series = data.filter(function(d) { return !d.disabled })
            //.map(function(d) { return d.values });
            .reduce(function(prev, curr, index) {  //sum up all the y's
                curr.values.forEach(function(d,i) {
                  if (!index) prev[i] = {x: d.x, y:0};
                  prev[i].y += getY(d);
                });
                return prev;
              }, []);


      x   .domain(d3.extent(d3.merge(series), getX ))
          .range([0, width - margin.left - margin.right]);

      y   .domain(stacked.offset() == 'zero' ?
            [0, d3.max(d3.merge(series), getY )] :
            [0, 1]  // 0 - 100%
          )
          .range([height - margin.top - margin.bottom, 0]);

      stacked
        .width(width - margin.left - margin.right)
        .height(height - margin.top - margin.bottom)


      var wrap = d3.select(this).selectAll('g.wrap').data([data]);
      var gEnter = wrap.enter().append('g').attr('class', 'wrap d3stackedWithLegend').append('g');

      gEnter.append('g').attr('class', 'x axis');
      gEnter.append('g').attr('class', 'y axis');
      gEnter.append('g').attr('class', 'stackedWrap');
      gEnter.append('g').attr('class', 'legendWrap');
      gEnter.append('g').attr('class', 'controlsWrap');


      legend.dispatch.on('legendClick', function(d,i) { 
        d.disabled = !d.disabled;

        if (d.disabled)
          d.values.map(function(p) { p._y = p.y; p.y = 0; return p });
        else
          d.values.map(function(p) { p.y = p._y; return p });

        if (!data.filter(function(d) { return !d.disabled }).length) {
          data.map(function(d) {
            d.disabled = false;
            d.values.map(function(p) { p.y = p._y; return p });
            //wrap.selectAll('.series').classed('disabled', false);
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

      stacked.dispatch.on('pointMouseover.tooltip', function(e) {
        dispatch.tooltipShow({
          point: e.point,
          series: e.series,
          pos: [e.pos[0] + margin.left, e.pos[1] + margin.top],
          seriesIndex: e.seriesIndex,
          pointIndex: e.pointIndex
        });
      });

      stacked.dispatch.on('pointMouseout.tooltip', function(e) {
        dispatch.tooltipHide(e);
      });



      //TODO: margins should be adjusted based on what components are used: axes, axis labels, legend
      margin.top = legend.height();

      var g = wrap.select('g')
          .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');


      legend.width(width/2 - margin.right);
      controls
          .width(280)
          .color(['#666', '#666', '#666']);

      g.select('.legendWrap')
          .datum(data)
          .attr('transform', 'translate(' + (width/2 - margin.left) + ',' + (-margin.top) +')')
          .call(legend);


      g.select('.controlsWrap')
          .datum(controlsData)
          .attr('transform', 'translate(0,' + (-margin.top) +')')
          .call(controls);



      var stackedWrap = g.select('.stackedWrap')
          .datum(data);
          //.datum(data.filter(function(d) { return !d.disabled }))


      d3.transition(stackedWrap).call(stacked);


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
        .ticks( stacked.offset() == 'wiggle' ? 0 : height / 36 )
        .tickSize(-(width - margin.right - margin.left), 0)
        .tickFormat(stacked.offset() == 'zero' ? d3.format(',.2f') : d3.format('%')); //TODO: stacked format should be set by caller

      d3.transition(g.select('.y.axis'))
          .call(yAxis);

    });

    return chart;
  }

  chart.dispatch = dispatch;

  chart.x = function(_) {
    if (!arguments.length) return getX;
    getX = _;
    stacked.x(_);
    return chart;
  };

  chart.y = function(_) {
    if (!arguments.length) return getY;
    getY = _;
    stacked.y(_);
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
    stacked.dotRadius = _;
    return chart;
  };

  chart.stacked = stacked;

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
