
nv.models.cumulativeLineChart = function() {

  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var margin = {top: 30, right: 20, bottom: 50, left: 60},
      color = d3.scale.category20().range(),
      width = null, 
      height = null,
      showLegend = true,
      tooltips = true,
      showRescaleToggle = false, //TODO: get rescale y functionality back (need to calculate exten of y for ALL possible re-zero points
      rescaleY = true,
      tooltip = function(key, x, y, e, graph) {
        return '<h3>' + key + '</h3>' +
               '<p>' +  y + ' at ' + x + '</p>'
      },
      x, y; //can be accessed via chart.lines.[x/y]Scale()


  //============================================================
  // Private Variables
  //------------------------------------------------------------

  var lines = nv.models.line(),
      dx = d3.scale.linear(),
      id = lines.id(),
      xAxis = nv.models.axis().orient('bottom').tickPadding(5),
      yAxis = nv.models.axis().orient('left'),
      legend = nv.models.legend().height(30),
      controls = nv.models.legend().height(30),
      dispatch = d3.dispatch('tooltipShow', 'tooltipHide'),
      index = {i: 0, x: 0};

  //TODO: let user select default
  var controlsData = [
    { key: 'Re-scale y-axis' }
  ];

  var showTooltip = function(e, offsetElement) {
    var left = e.pos[0] + ( offsetElement.offsetLeft || 0 ),
        top = e.pos[1] + ( offsetElement.offsetTop || 0),
        x = xAxis.tickFormat()(lines.x()(e.point, e.pointIndex)),
        y = yAxis.tickFormat()(lines.y()(e.point, e.pointIndex)),
        content = tooltip(e.series.key, x, y, e, chart);

    nv.tooltip.show([left, top], content);
  };


  var indexDrag = d3.behavior.drag()
                    .on('dragstart', dragStart)
                    .on('drag', dragMove)
                    .on('dragend', dragEnd);

  function dragStart(d,i) {}

  function dragMove(d,i) {
    d.x += d3.event.dx;
    d.i = Math.round(dx.invert(d.x));

    //d3.transition(d3.select('.chart-' + id)).call(chart);
    d3.select(this).attr('transform', 'translate(' + dx(d.i) + ',0)');
  }

  function dragEnd(d,i) {
    //d3.transition(d3.select('.chart-' + id)).call(chart);
    chart.update();
  }



  function chart(selection) {
    selection.each(function(data) {
      var container = d3.select(this).classed('chart-' + id, true),
          that = this;

      var availableWidth = (width  || parseInt(container.style('width')) || 960)
                             - margin.left - margin.right,
          availableHeight = (height || parseInt(container.style('height')) || 400)
                             - margin.top - margin.bottom;


      x = lines.xScale();
      y = lines.yScale();

      dx  .domain([0, data[0].values.length - 1]) //Assumes all series have same length
          .range([0, availableWidth])
          .clamp(true);


      var data = indexify(index.i, data);


      var wrap = container.selectAll('g.wrap.cumulativeLine').data([data]);
      var gEnter = wrap.enter().append('g').attr('class', 'wrap nvd3 cumulativeLine').append('g');

      gEnter.append('g').attr('class', 'x axis');
      gEnter.append('g').attr('class', 'y axis');
      gEnter.append('g').attr('class', 'linesWrap');
      gEnter.append('g').attr('class', 'legendWrap');
      gEnter.append('g').attr('class', 'controlsWrap');


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


      if (showRescaleToggle) {
        controls.width(140).color(['#444', '#444', '#444']);
        g.select('.controlsWrap')
            .datum(controlsData)
            .attr('transform', 'translate(0,' + (-margin.top) +')')
            .call(controls);
      }



      lines
        //.x(function(d) { return d.x })
        .y(function(d) { return d.display.y })
        .width(availableWidth)
        .height(availableHeight)
        .color(data.map(function(d,i) {
          return d.color || color[i % color.length];
        }).filter(function(d,i) { return !data[i].disabled }));



      g.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');


      var linesWrap = g.select('.linesWrap')
          .datum(data.filter(function(d) { return !d.disabled }))

      d3.transition(linesWrap).call(lines);


      var indexLine = linesWrap.selectAll('.indexLine')
          .data([index]);
      indexLine.enter().append('rect').attr('class', 'indexLine')
          .attr('width', 3)
          .attr('x', -2)
          .attr('fill', 'red')
          .attr('fill-opacity', .5)
          .call(indexDrag)

      indexLine
          .attr('transform', function(d) { return 'translate(' + dx(d.i) + ',0)' })
          .attr('height', availableHeight)



      xAxis
        .scale(x)
        .ticks( availableWidth / 100 )
        .tickSize(-availableHeight, 0);

      g.select('.x.axis')
          .attr('transform', 'translate(0,' + y.range()[0] + ')');
      d3.transition(g.select('.x.axis'))
          .call(xAxis);


      yAxis
        .scale(y)
        .ticks( availableHeight / 36 )
        .tickSize( -availableWidth, 0);

      d3.transition(g.select('.y.axis'))
          .call(yAxis);



      //============================================================
      // Event Handling/Dispatching (in chart's scope)
      //------------------------------------------------------------

      controls.dispatch.on('legendClick', function(d,i) { 
        d.disabled = !d.disabled;
        rescaleY = !d.disabled;

        //console.log(d,i,arguments);

        selection.transition().call(chart);
      });


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

      dispatch.on('tooltipShow', function(e) {
        if (tooltips) showTooltip(e, that.parentNode);
      });


    });


    //TODO: decide if this is a good idea, and if it should be in all models
    chart.update = function() { chart(selection) };
    chart.container = this; // I need a reference to the container in order to have outside code check if the chart is visible or not


    return chart;
  }


  //============================================================
  // Event Handling/Dispatching (out of chart's scope)
  //------------------------------------------------------------

  lines.dispatch.on('elementMouseover.tooltip', function(e) {
    e.pos = [e.pos[0] +  margin.left, e.pos[1] + margin.top];
    dispatch.tooltipShow(e);
  });

  lines.dispatch.on('elementMouseout.tooltip', function(e) {
    dispatch.tooltipHide(e);
  });

  dispatch.on('tooltipHide', function() {
    if (tooltips) nv.tooltip.cleanup();
  });


  //============================================================
  // Global getters and setters
  //------------------------------------------------------------

  chart.dispatch = dispatch;
  chart.legend = legend;
  chart.xAxis = xAxis;
  chart.yAxis = yAxis;

  d3.rebind(chart, lines, 'defined', 'isArea', 'x', 'y', 'size', 'xDomain', 'yDomain', 'forceX', 'forceY', 'interactive', 'clipEdge', 'clipVoronoi', 'id');


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




  //============================================================
  // Functions
  //------------------------------------------------------------

  /* Normalize the data according to an index point. */
  function indexify(idx, data) {
    return data.map(function(line, i) {
      var v = lines.y()(line.values[idx], idx);

      line.values = line.values.map(function(point, pointIndex) {
        point.display = {'y': (lines.y()(point, pointIndex) - v) / (1 + v) };
        return point;
      })
      /*
      if (v < -.9) {
        //if a series loses more than 100%, calculations fail.. anything close can cause major distortion (but is mathematically currect till it hits 100)
      }
      */
      return line;
    })
  }


  return chart;
}
