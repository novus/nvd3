
/***
 * Creating a separate bar chart for historical view of a single series
 *   this will likely be merged into the bar representation, just developing
 *   it separately to not interfere with the regular bar model
 */
nv.models.historicalBar = function() {
  var margin = {top: 0, right: 0, bottom: 0, left: 0},
      width = 960,
      height = 500,
      id = Math.floor(Math.random() * 10000), //Create semi-unique ID in case user doesn't select one
      getX = function(d) { return d.x },
      getY = function(d) { return d.y },
      color = d3.scale.category10(),
      xDomain, yDomain;

  var x = d3.scale.linear(),
      y = d3.scale.linear(),
      xAxis = d3.svg.axis().scale(x).orient('bottom'),
      yAxis = d3.svg.axis().scale(y).orient('left'),
      dispatch = d3.dispatch('chartClick', 'elementClick', 'elementDblClick', 'tooltipShow', 'tooltipHide');


  function chart(selection) {
    selection.each(function(data) {
      var availableWidth = width - margin.left - margin.right,
          availableHeight = height - margin.top - margin.bottom;

      data = data[0].values; //currently only using a single series for this


      x   .domain(xDomain || d3.extent(data, getX ))
          .range([0, availableWidth]);

      y   .domain(yDomain || d3.extent(data, getY )) //Should 0 always be forced in bar charts?
          .range([availableHeight, 0]);
          //.nice(); // remove for consistency?


      var parent = d3.select(this)
          .on('click', function(d,i) {
            dispatch.chartClick({
                data: d,
                index: i,
                pos: d3.event,
                id: id
            });
          });


      var wrap = parent.selectAll('g.wrap').data([data]);
      var gEnter = wrap.enter();
      gEnter = gEnter.append('g').attr('class', 'wrap').attr('id','wrap-'+id).append('g');


      gEnter.append('g').attr('class', 'bars');


      wrap.attr('width', width)
          .attr('height', height);

      var g = wrap.select('g')
          .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');


      var bars = wrap.select('.bars').selectAll('.bar')
          .data(function(d) { return d });

      bars.exit().remove();


      var barsEnter = bars.enter().append('svg:rect')
          .attr('class', function(d,i) { return getY(d,i) < 0 ? 'bar negative' : 'bar positive'})
          //.attr('fill', function(d, i) { return color(i); })
          .attr('fill', function(d,i) { return color(0); })
          .attr('x', 0 )
          .on('mouseover', function(d,i) {
            d3.select(this).classed('hover', true);
            dispatch.tooltipShow({
                //label: d[label],
                value: getY(d),
                data: d,
                index: i,
                pos: [x(getX(d) + .5), y(getY(d))],  // TODO: Figure out why the value appears to be shifted
                //pos: [d3.event.pageX, d3.event.pageY],
                    e: d3.event,
                id: id
            });

          })
          .on('mouseout', function(d,i) {
                d3.select(this).classed('hover', false);
                dispatch.tooltipHide({
                    //label: d[label],
                    value: getY(d),
                    data: d,
                    index: i,
                    id: id
                });
          })
          .on('click', function(d,i) {
                dispatch.elementClick({
                    //label: d[label],
                    value: getY(d),
                    data: d,
                    index: i,
                    pos: [x(getX(d)), y(getY(d))],
                    e: d3.event,
                    id: id
                });
              d3.event.stopPropagation();
          })
          .on('dblclick', function(d,i) {
              dispatch.elementDblClick({
                  //label: d[label],
                  value: getY(d),
                  data: d,
                  index: i,
                  pos: [x(getX(d)), y(getY(d))],
                  e: d3.event,
                  id: id
              });
              d3.event.stopPropagation();
          });


      d3.transition(bars)
          .attr('class', function(d) { return getY(d) < 0 ? 'bar negative' : 'bar positive'})
          .attr('transform', function(d,i) { return 'translate(' + x(getX(d,i)) + ',0)'; })
          .attr('width', x(.9) )
          .attr('y', function(d,i) {  return y(Math.max(0, getY(d,i))) })
          .attr('height', function(d,i) { return Math.abs(y(getY(d,i)) - y(0)) });
          //.order();  // not sure if this makes any sense for this model

    });

    return chart;
  }


  chart.dispatch = dispatch;

  chart.x = function(_) {
    if (!arguments.length) return getX;
    getX = _;
    return chart;
  };

  chart.y = function(_) {
    if (!arguments.length) return getY;
    getY = _;
    return chart;
  };

  chart.margin = function(_) {
    if (!arguments.length) return margin;
    margin = _;
    return chart;
  };

  chart.width = function(_) {
    if (!arguments.length) return width;
    if (margin.left + margin.right + 20 > _)
      width = margin.left + margin.right + 20; // Min width.... while this is a good idea, I may move this somewhere else.. OR need to implement in all other logical spots
    else
      width = _;
    return chart;
  };

  chart.height = function(_) {
    if (!arguments.length) return height;
    if (margin.top + margin.bottom + 20 > _)
      height = margin.top + margin.bottom + 20; // Min height
    else
      height = _;
    return chart;
  };

  chart.xDomain = function(_) {
    if (!arguments.length) return xDomain;
    xDomain = _;
    return chart;
  };

  chart.yDomain = function(_) {
    if (!arguments.length) return yDomain;
    yDomain = _;
    return chart;
  };

  chart.id = function(_) {
        if (!arguments.length) return id;
        id = _;
        return chart;
  };



  return chart;
}
