nv.models.multiChart = function() {

  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var margin = {top: 30, right: 20, bottom: 50, left: 60},
      color = d3.scale.category20().range(),
      width = null, 
      height = null,
      showLegend = true,
      tooltips = true,
      tooltip = function(key, x, y, e, graph) {
        return '<h3>' + key + '</h3>' +
               '<p>' +  y + ' at ' + x + '</p>'
      },
      x, y; //can be accessed via chart.lines.[x/y]Scale()

  //============================================================
  // Private Variables
  //------------------------------------------------------------

  var x = d3.scale.linear(),
      lines1 = nv.models.line(),
      yLines1 = lines1.yScale(),
      lines2 = nv.models.line(),
      yLines2 = lines2.yScale(),
      bars1 = nv.models.multiBar().stacked(false),
      yBars1 = bars1.yScale(),
      bars2 = nv.models.multiBar().stacked(false),
      yBars2 = bars2.yScale(),
      stack1 = nv.models.stackedArea(),
      yStack1 = stack1.yScale(),
      stack2 = nv.models.stackedArea(),
      yStack2 = stack2.yScale(),
      xAxis = nv.models.axis().scale(x).orient('bottom').tickPadding(5),
      yLinesAxis1 = nv.models.axis().scale(yLines1).orient('left'),
      yBarsAxis1 = nv.models.axis().scale(yBars1).orient('left'),
      yStackAxis1 = nv.models.axis().scale(yStack1).orient('left'),
      yLinesAxis2 = nv.models.axis().scale(yLines2).orient('right'),
      yBarsAxis2 = nv.models.axis().scale(yBars2).orient('right'),
      yStackAxis2 = nv.models.axis().scale(yStack2).orient('right'),
      legend = nv.models.legend().height(30),
      dispatch = d3.dispatch('tooltipShow', 'tooltipHide');

  function chart(selection) {
    selection.each(function(data) {
      var container = d3.select(this),
          that = this;

      var availableWidth = (width  || parseInt(container.style('width')) || 960)
                             - margin.left - margin.right,
          availableHeight = (height || parseInt(container.style('height')) || 400)
                             - margin.top - margin.bottom;

      var dataLines1 = data.filter(function(d) {return !d.disabled && d.type == 'line' && d.yAxis == 1})
      var dataLines2 = data.filter(function(d) {return !d.disabled && d.type == 'line' && d.yAxis == 2})
      var dataBars1 = data.filter(function(d) {return !d.disabled && d.type == 'bar' && d.yAxis == 1})
      var dataBars2 = data.filter(function(d) {return !d.disabled && d.type == 'bar' && d.yAxis == 2})
      var dataStack1 = data.filter(function(d) {return !d.disabled && d.type == 'area' && d.yAxis == 1})
      var dataStack2 = data.filter(function(d) {return !d.disabled && d.type == 'area' && d.yAxis == 2})

      var series1 = data.filter(function(d) {return !d.disabled && d.yAxis == 1})
            .map(function(d) {
              return d.values.map(function(d,i) {
                return { x: d.x, y: d.y }
              })
            })

      var series2 = data.filter(function(d) {return !d.disabled && d.yAxis == 2})
            .map(function(d) {
              return d.values.map(function(d,i) {
                return { x: d.x, y: d.y }
              })
            })

      x   .domain(d3.extent(d3.merge(series1.concat(series2)), function(d) { return d.x } ))
          .range([0, availableWidth]);

      var wrap = container.selectAll('g.wrap.multiChart').data([data]);
      var gEnter = wrap.enter().append('g').attr('class', 'wrap nvd3 multiChart').append('g');

      gEnter.append('g').attr('class', 'x axis');
      gEnter.append('g').attr('class', 'y1 axis');
      gEnter.append('g').attr('class', 'y2 axis');
      gEnter.append('g').attr('class', 'lines1Wrap');
      gEnter.append('g').attr('class', 'lines2Wrap');
      gEnter.append('g').attr('class', 'bars1Wrap');
      gEnter.append('g').attr('class', 'bars2Wrap');
      gEnter.append('g').attr('class', 'stack1Wrap');
      gEnter.append('g').attr('class', 'stack2Wrap');

      var g = wrap.select('g');

      lines1
        .width(availableWidth)
        .height(availableHeight)
        .interpolate("monotone")
        .color(data.map(function(d,i) {
          return d.color || color[i % color.length];
        }).filter(function(d,i) { return !data[i].disabled && data[i].yAxis == 1 && data[i].type == 'line'}));

      lines2
        .width(availableWidth)
        .height(availableHeight)
        .interpolate("monotone")
        .color(data.map(function(d,i) {
          return d.color || color[i % color.length];
        }).filter(function(d,i) { return !data[i].disabled && data[i].yAxis == 2 && data[i].type == 'line'}));

      bars1
        .width(availableWidth)
        .height(availableHeight)
        .color(data.map(function(d,i) {
          return d.color || color[i % color.length];
        }).filter(function(d,i) { return !data[i].disabled && data[i].yAxis == 1 && data[i].type == 'bar'}));

      bars2
        .width(availableWidth)
        .height(availableHeight)
        .color(data.map(function(d,i) {
          return d.color || color[i % color.length];
        }).filter(function(d,i) { return !data[i].disabled && data[i].yAxis == 2}));

      stack1
        .width(availableWidth)
        .height(availableHeight)
        .color(data.map(function(d,i) {
          return d.color || color[i % color.length];
        }).filter(function(d,i) { return !data[i].disabled && data[i].yAxis == 1}));

      stack2
        .width(availableWidth)
        .height(availableHeight)
        .color(data.map(function(d,i) {
          return d.color || color[i % color.length];
        }).filter(function(d,i) { return !data[i].disabled && data[i].yAxis == 2}));

      g.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');


      var lines1Wrap = g.select('.lines1Wrap')
          .datum(dataLines1)
      var bars1Wrap = g.select('.bars1Wrap')
          .datum(dataBars1)
      var stack1Wrap = g.select('.stack1Wrap')
          .datum(dataStack1)

      var lines2Wrap = g.select('.lines2Wrap')
          .datum(dataLines2)
      var bars2Wrap = g.select('.bars2Wrap')
          .datum(dataBars2)
      var stack2Wrap = g.select('.stack2Wrap')
          .datum(dataStack2)

      var extraValue1 = []
      var extraValue2 = []

      if(dataLines1.length){d3.transition(lines1Wrap).call(lines1);}
      if(dataBars1.length){d3.transition(bars1Wrap).call(bars1);}
      if(dataStack1.length){
        d3.transition(stack1Wrap).call(stack1);
        extraValue1.push({x:0, y:0})
      }

      if(dataLines2.length){d3.transition(lines2Wrap).call(lines2);}
      if(dataBars2.length){d3.transition(bars2Wrap).call(bars2);}
      if(dataStack2.length){
        d3.transition(stack2Wrap).call(stack2);
        extraValue2.push({x:0, y:0})
      }

      yLinesAxis1.domain(d3.extent(d3.merge(series1), function(d) { return d.y } ))
      yBarsAxis1.domain(d3.extent(d3.merge(series1), function(d) { return d.y } ))
      yStackAxis1.domain(d3.extent(d3.merge(series1).concat(extraValue1), function(d) { return d.y } ))

      yLinesAxis2.domain(d3.extent(d3.merge(series2), function(d) { return d.y } ))
      yBarsAxis2.domain(d3.extent(d3.merge(series2), function(d) { return d.y } ))
      yStackAxis2.domain(d3.extent(d3.merge(series2).concat(extraValue2), function(d) { return d.y } ))

      xAxis
        .ticks( availableWidth / 100 )
        .tickSize(-availableHeight, 0);

      g.select('.x.axis')
          .attr('transform', 'translate(0,' + availableHeight + ')');
      d3.transition(g.select('.x.axis'))
          .call(xAxis);

      yLinesAxis1
        .ticks( availableHeight / 36 )
        .tickSize( -availableWidth, 0);

      // d3.transition(g.select('.y1.axis'))
      //     .call(yLinesAxis1);

      d3.transition(g.select('.y1.axis'))
          .call(yStackAxis1);

      yLinesAxis2
        .ticks( availableHeight / 36 )
        .tickSize( -availableWidth, 0);

      d3.transition(g.select('.y2.axis'))
          .call(yLinesAxis2);

      g.select('.y2.axis')
          .style('opacity', series2.length ? 1 : 0)
          .attr('transform', 'translate(' + x.range()[1] + ',0)');
    });

    chart.update = function() { chart(selection) };
    chart.container = this;

    return chart;
  }



  //============================================================
  // Global getters and setters
  //------------------------------------------------------------

  chart.dispatch = dispatch;
  chart.lines1 = lines1;
  chart.lines2 = lines2;
  chart.bars1 = bars1;
  chart.bars2 = bars2;
  chart.stack1 = stack1;
  chart.stack2 = stack2;
  chart.xAxis = xAxis;
  chart.yLinesAxis1 = yStackAxis1;
  chart.yLinesAxis2 = yLinesAxis2;

  d3.rebind(chart, lines1, 'defined', 'isArea', 'x', 'y', 'size', 'xScale', 'yScale', 'xDomain', 'yDomain', 'forceX', 'forceY', 'interactive', 'clipEdge', 'clipVoronoi', 'id', 'interpolate');


  chart.x = function(_) {
    if (!arguments.length) return getX;
    getX = _;
    lines1.x(_);
    bars1.x(_);
    return chart;
  };

  chart.y = function(_) {
    if (!arguments.length) return getY;
    getY = _;
    lines1.y(_);
    bars1.y(_);
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

  // chart.showLegend = function(_) {
  //   if (!arguments.length) return showLegend;
  //   showLegend = _;
  //   return chart;
  // };

  // chart.tooltips = function(_) {
  //   if (!arguments.length) return tooltips;
  //   tooltips = _;
  //   return chart;
  // };

  // chart.tooltipContent = function(_) {
  //   if (!arguments.length) return tooltip;
  //   tooltip = _;
  //   return chart;
  // };

  return chart;
}

