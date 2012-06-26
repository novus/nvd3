
nv.models.lineWithFocusChart = function() {
  var margin = {top: 30, right: 20, bottom: 50, left: 60},
      margin2 = {top: 0, right: 20, bottom: 20, left: 60},
      color = d3.scale.category20().range(),
      width = null, 
      height = null,
      height2 = 100,
      showLegend = true,
      tooltips = true,
      tooltip = function(key, x, y, e, graph) { 
        return '<h3>' + key + '</h3>' +
               '<p>' +  y + ' at ' + x + '</p>'
      };

  var lines = nv.models.line().clipEdge(true),
      lines2 = nv.models.line().interactive(false),
      x = lines.xScale(),
      y = lines.yScale(),
      x2 = lines2.xScale(),
      y2 = lines2.yScale(),
      xAxis = nv.models.axis().scale(x).orient('bottom').tickPadding(5),
      yAxis = nv.models.axis().scale(y).orient('left'),
      x2Axis = nv.models.axis().scale(x).orient('bottom').tickPadding(5),
      y2Axis = nv.models.axis().scale(y2).orient('left'),
      legend = nv.models.legend().height(30),
      dispatch = d3.dispatch('tooltipShow', 'tooltipHide'),
      brush = d3.svg.brush().x(x2);


  var showTooltip = function(e, offsetElement) {
    var left = e.pos[0] + ( offsetElement.offsetLeft || 0 ),
        top = e.pos[1] + ( offsetElement.offsetTop || 0),
        x = xAxis.tickFormat()(lines.x()(e.point)),
        y = yAxis.tickFormat()(lines.y()(e.point)),
        content = tooltip(e.series.key, x, y, e, chart);

    nv.tooltip.show([left, top], content);
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


      brush.on('brush', onBrush);


      var wrap = container.selectAll('g.wrap.lineWithFocusChart').data([data]);
      var gEnter = wrap.enter().append('g').attr('class', 'wrap nvd3 lineWithFocusChart').append('g');

      var focusEnter = gEnter.append('g').attr('class', 'focus');
      focusEnter.append('g').attr('class', 'x axis');
      focusEnter.append('g').attr('class', 'y axis');
      focusEnter.append('g').attr('class', 'linesWrap');

      var contextEnter = gEnter.append('g').attr('class', 'context');
      contextEnter.append('g').attr('class', 'x axis');
      contextEnter.append('g').attr('class', 'y axis');
      contextEnter.append('g').attr('class', 'linesWrap');
      contextEnter.append('g').attr('class', 'x brush');

      gEnter.append('g').attr('class', 'legendWrap');


      var g = wrap.select('g');




      if (showLegend) {
        legend.width(availableWidth);

        g.select('.legendWrap')
            .datum(data)
            .call(legend);

        if ( margin.top != legend.height()) {
          margin.top = legend.height();
          availableHeight = (height || parseInt(container.style('height')) || 400)
                             - margin.top - margin.bottom;
        }

        g.select('.legendWrap')
            .attr('transform', 'translate(0,' + (-margin.top) +')')
      }


      lines
        .width(availableWidth)
        .height(availableHeight)
        .color(data.map(function(d,i) {
          return d.color || color[i % color.length];
        }).filter(function(d,i) { return !data[i].disabled }));

      lines2
        .width(availableWidth)
        .height(availableHeight2)
        .color(data.map(function(d,i) {
          return d.color || color[i % color.length];
        }).filter(function(d,i) { return !data[i].disabled }));


      g.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');


      var focusLinesWrap = g.select('.focus .linesWrap')
          .datum(data.filter(function(d) { return !d.disabled }))

      d3.transition(focusLinesWrap).call(lines);


      xAxis
        .ticks( availableWidth / 100 )
        .tickSize(-availableHeight, 0);

      g.select('.focus .x.axis')
          .attr('transform', 'translate(0,' + y.range()[0] + ')');
      d3.transition(g.select('.focus .x.axis'))
          .call(xAxis);


      yAxis
        .ticks( availableHeight / 36 )
        .tickSize( -availableWidth, 0);

      d3.transition(g.select('.focus .y.axis'))
          .call(yAxis);



      g.select('.context')
          .attr('transform', 'translate(0,' + ( availableHeight + margin.bottom + margin2.top) + ')')

      var contextLinesWrap = g.select('.context .linesWrap')
          .datum(data.filter(function(d) { return !d.disabled }))

      d3.transition(contextLinesWrap).call(lines2);


      gBrush = g.select('.x.brush')
          .call(brush);
      gBrush.selectAll('rect')
          //.attr('y', -5)
          .attr('height', availableHeight2);
      gBrush.selectAll(".resize").append("path").attr("d", resizePath);



      x2Axis
        .tickFormat(xAxis.tickFormat()) //TODO: make sure everythign set on the Axes is set on both x and x2, and y and y2 respectively
        .ticks( availableWidth / 100 )
        .tickSize(-availableHeight2, 0);

      g.select('.context .x.axis')
          .attr('transform', 'translate(0,' + y2.range()[0] + ')');
      d3.transition(g.select('.context .x.axis'))
          .call(x2Axis);


      y2Axis
        .tickFormat(yAxis.tickFormat())
        .ticks( availableHeight2 / 36 )
        .tickSize( -availableWidth, 0);

      d3.transition(g.select('.context .y.axis'))
          .call(y2Axis);


      updateFocus();



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


/*
      //
      legend.dispatch.on('legendMouseover', function(d, i) {
        d.hover = true;
        selection.transition().call(chart)
      });

      legend.dispatch.on('legendMouseout', function(d, i) {
        d.hover = false;
        selection.transition().call(chart)
      });
*/

      lines.dispatch.on('elementMouseover.tooltip', function(e) {
        e.pos = [e.pos[0] +  margin.left, e.pos[1] + margin.top];
        dispatch.tooltipShow(e);
      });
      if (tooltips) dispatch.on('tooltipShow', function(e) { showTooltip(e, that.parentNode) } ); // TODO: maybe merge with above?

      lines.dispatch.on('elementMouseout.tooltip', function(e) {
        dispatch.tooltipHide(e);
      });
      if (tooltips) dispatch.on('tooltipHide', nv.tooltip.cleanup);



      // Taken from crossfilter (http://square.github.com/crossfilter/)
      function resizePath(d) {
        var e = +(d == "e"),
            x = e ? 1 : -1,
            y = availableHeight2 / 3;
        return "M" + (.5 * x) + "," + y
            + "A6,6 0 0 " + e + " " + (6.5 * x) + "," + (y + 6)
            + "V" + (2 * y - 6)
            + "A6,6 0 0 " + e + " " + (.5 * x) + "," + (2 * y)
            + "Z"
            + "M" + (2.5 * x) + "," + (y + 8)
            + "V" + (2 * y - 8)
            + "M" + (4.5 * x) + "," + (y + 8)
            + "V" + (2 * y - 8);
      }


      function onBrush() {
        updateFocus();

        focusLinesWrap.call(lines)
        //var focusLinesWrap = g.select('.focus .linesWrap')
        g.select('.focus .x.axis').call(xAxis);
        g.select('.focus .y.axis').call(yAxis);
      }

      function updateFocus() {
        var yDomain = brush.empty() ? y2.domain() : d3.extent(d3.merge(data.filter(function(d) { return !d.disabled }).map(function(d) { return d.values })).filter(function(d) {
          return lines.x()(d) >= brush.extent()[0] && lines.x()(d) <= brush.extent()[1];
        }), lines.y());  //This doesn't account for the 1 point before and the 1 point after the domain.  Would fix, but likely need to change entire methodology here

        if (typeof yDomain[0] == 'undefined') yDomain = y2.domain(); //incase the brush doesn't cover a single point


        x.domain(brush.empty() ? x2.domain() : brush.extent());
        y.domain(yDomain);

        //TODO: Rethink this... performance is horrible, likely need to cut off focus data to within the range
        //      If I limit the data for focusLines would want to include 1 point before and after the extent,
        //      Need to figure out an optimized way to accomplish this.
        //      ***One concern is to try not to make the assumption that all lines are of the same length, and
        //         points with the same index have the same x value (while this is true in our test cases, may 
        //         not always be)

        lines.xDomain(x.domain());
        lines.yDomain(y.domain());
      }



    });



    //TODO: decide if this is a good idea, and if it should be in all models
    chart.update = function() { chart(selection) };


    return chart;
  }


  chart.dispatch = dispatch;
  chart.legend = legend;
  chart.xAxis = xAxis;
  chart.yAxis = yAxis;

  d3.rebind(chart, lines, 'x', 'y', 'size', 'xDomain', 'yDomain', 'forceX', 'forceY', 'interactive', 'clipEdge', 'clipVoronoi', 'id');


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
