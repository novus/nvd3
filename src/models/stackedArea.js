
nv.models.stackedArea = function() {
  var margin = {top: 0, right: 0, bottom: 0, left: 0},
      width = 960,
      height = 500,
      color = d3.scale.category10().range(),
      getX = function(d) { return d.x },
      getY = function(d) { return d.y },
      style = 'stack',
      offset = 'zero',
      order = 'default',
      xDomain, yDomain;

/************************************
 * offset:
 *   'wiggle' (stream)
 *   'zero' (stacked)
 *   'expand' (normalize to 100%)
 *   'silhouette' (simple centered)
 *
 * order:
 *   'inside-out' (stream)
 *   'default' (input order)
 ************************************/

  var lines = nv.models.line(),
      x = d3.scale.linear(),
      y = d3.scale.linear();

  function chart(selection) {
    selection.each(function(data) {
        // Need to leave data alone to switch between stacked, stream, and expanded
        var dataCopy = JSON.parse(JSON.stringify(data)),
            seriesData = dataCopy.map(function(d) { return d.values }),
            availableWidth = width - margin.left - margin.right,
            availableHeight = height - margin.top - margin.bottom;


        //compute the data based on offset and order (calc's y0 for every point)
        dataCopy = d3.layout.stack()
                     .offset(offset)
                     .order(order)
                     .values(function(d){ return d.values })
                     .y(getY)
                     (dataCopy);


        x   .domain(xDomain || d3.extent(d3.merge(seriesData), getX))
            .range([0, availableWidth]);

        y   .domain(yDomain || [0, d3.max(dataCopy, function(d) {
              return d3.max(d.values, function(d) { return d.y0 + d.y })
            }) ])
            .range([availableHeight, 0]);


        lines
          //.interactive(false) //if we were to turn off interactive, the whole line chart should be removed
          .width(availableWidth)
          .height(availableHeight)
          .xDomain(x.domain())
          .yDomain(y.domain())
          .y(function(d) { return d.y + d.y0 })
          .color(data.map(function(d,i) {
            return d.color || color[i % 10];
          }).filter(function(d,i) { return !data[i].disabled }));

        var wrap = d3.select(this).selectAll('g.d3stackedarea').data([dataCopy]);
        var gEnter = wrap.enter().append('g').attr('class', 'd3stackedarea').append('g');

        gEnter.append('g').attr('class', 'areaWrap');
        gEnter.append('g').attr('class', 'linesWrap');


        var g = wrap.select('g')
            .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');


        var linesWrap = g.select('.linesWrap')
            .datum(dataCopy.filter(function(d) { return !d.disabled }))

        d3.transition(linesWrap).call(lines);


        var area = d3.svg.area()
            .x(function(d) { return x(getX(d)) })
            .y0(function(d) { return y(d.y0) })
            .y1(function(d) { return y(d.y + d.y0) });

        var zeroArea = d3.svg.area()
            .x(function(d) { return x(getX(d)) })
            .y0(function(d) { return y(d.y0) })
            .y1(function(d) { return y(d.y0) });


        var path = g.select('.areaWrap').selectAll('path.area')
            .data(function(d) { return d });
        path.enter().append('path').attr('class', 'area');
        d3.transition(path.exit())
            .attr('d', function(d,i) { return zeroArea(d.values,i) })
            .remove();
        path
            .style('fill', function(d,i){ return color[i % 10] })
            .style('stroke', function(d,i){ return color[i % 10] });
        d3.transition(path)
            .attr('d', function(d,i) { return area(d.values,i) })

    });

    return chart;
  }

  chart.x = function(_) {
    if (!arguments.length) return getX;
    getX = d3.functor(_);
    return chart;
  };

  chart.y = function(_) {
    if (!arguments.length) return getY;
    getY = d3.functor(_);
    return chart;
  }

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
    return chart;
  };

  chart.offset = function(_) {
    if (!arguments.length) return offset;
    offset = _;
    return chart;
  };

  chart.order = function(_) {
    if (!arguments.length) return order;
    order = _;
    return chart;
  };

  //shortcut for offset + order
  chart.style = function(_) {
    if (!arguments.length) return style;
    style = _;

    switch (style) {
      case 'stack':
        offset = 'zero';
        order = 'default';
        break;
      case 'stream':
        offset = 'wiggle';
        order = 'inside-out';
        break;
      case 'expand':
        offset = 'expand';
        order = 'default';
        break;
    }

    return chart;
  };

  chart.dispatch = lines.dispatch;

  return chart;
}
