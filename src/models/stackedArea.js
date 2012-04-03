
nv.models.stackedArea = function() {
  var margin = {top: 0, right: 0, bottom: 0, left: 0},
      width = 960,
      height = 500,
      color = d3.scale.category10().range(),
      style = 'stack',
      offset = 'zero',
      order = 'default';

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


  function chart(selection) {
    selection.each(function(data) {

        // Need to leave data alone to switch between stacked, stream, and expanded
        var dataCopy = JSON.parse(JSON.stringify(data));

        //log(dataCopy);
        dataCopy = dataCopy.map(function(series) { return series.values })

        //compute the data based on offset and order (calc's y0 for every point)
        //dataCopy =  d3.layout.stack().offset(offset).order(order).values(function(d){ return d.values })(dataCopy);
        dataCopy =  d3.layout.stack().offset(offset).order(order)(dataCopy);

        var mx = dataCopy[0].length - 1, // assumes that all layers have same # of samples & that there is at least one layer
            my = d3.max(dataCopy, function(d) {
                return d3.max(d, function(d) {
                    return d.y0 + d.y;
                });
            });

        // Select the wrapper g, if it exists.
        var wrap = d3.select(this).selectAll('g.d3stream').data([dataCopy]);

        // Create the skeletal chart on first load.
        var gEnter = wrap.enter().append('g').attr('class', 'd3stream').append('g');


        var g = wrap.select('g')
            .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');


        // Update the stacked graph
        var availableWidth = width - margin.left - margin.right,
            availableHeight = height - margin.top - margin.bottom;

        var area = d3.svg.area()
            .x(function(d) { return d.x * availableWidth / mx; })
            .y0(function(d) { return availableHeight - d.y0 * availableHeight / my; })
            .y1(function(d) { return availableHeight - (d.y + d.y0) * availableHeight / my; });

        var zeroArea = d3.svg.area()
            .x(function(d) { return d.x * availableWidth / mx; })
            .y0(function(d) { return availableHeight - d.y0 * availableHeight / my; })
            .y1(function(d) { return availableHeight - d.y0 * availableHeight / my; })

        var path = g.selectAll('path')
          .data(function(d) { return d });
          //.data(dataCopy);
        path.enter().append('path');
        d3.transition(path.exit())
            .attr('d', zeroArea)
            .remove();
        path
            .style('fill-opacity', .75)
            .style('stroke-opacity', .75)
            .style('fill', function(d,i){ return color[i % 10] })
            .style('stroke', function(d,i){ return color[i % 10] });
        d3.transition(path)
            .attr('d', area);

    });

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


  return chart;
}
