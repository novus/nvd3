
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
      xDomain, yDomain,
      dispatch =  d3.dispatch('tooltipShow', 'tooltipHide', 'areaClick', 'areaMouseover', 'areaMouseout' );

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

  var scatter= nv.models.scatter().size(2),
      x = d3.scale.linear(),
      y = d3.scale.linear();

  function chart(selection) {
    selection.each(function(data) {
        // Need to leave data alone to switch between stacked, stream, and expanded
        var dataCopy = JSON.parse(JSON.stringify(data)),
            seriesData = dataCopy.map(function(d) { 
              return d.values.map(function(d,i) {
                return { x: getX(d,i), y: getY(d,i) }
              })
            }),
            availableWidth = width - margin.left - margin.right,
            availableHeight = height - margin.top - margin.bottom;


        //compute the data based on offset and order (calc's y0 for every point)
        dataCopy = d3.layout.stack()
                     .offset(offset)
                     .order(order)
                     .values(function(d){ return d.values })
                     .y(getY)
                     (dataCopy);


        x   .domain(xDomain || d3.extent(d3.merge(seriesData), function(d) { return d.x } ))
            .range([0, availableWidth]);

        y   .domain(yDomain || [0, d3.max(dataCopy, function(d) {   //TODO; if dataCopy not fed {x, y} (custom getX or getY), this will probably cause an error
              return d3.max(d.values, function(d) { return d.y0 + d.y })
            }) ])
            .range([availableHeight, 0]);


        scatter
          .width(availableWidth)
          .height(availableHeight)
          .xDomain(x.domain())
          .yDomain(y.domain())
          .x(getX)
          .y(function(d) { return d.y + d.y0 }) // TODO: allow for getY to be other than d.y
          .color(data.map(function(d,i) {
            return d.color || color[i % 10];
          }).filter(function(d,i) { return !data[i].disabled }));

        var wrap = d3.select(this).selectAll('g.d3stackedarea').data([dataCopy]);
        var gEnter = wrap.enter().append('g').attr('class', 'd3stackedarea').append('g');

        gEnter.append('g').attr('class', 'areaWrap');
        gEnter.append('g').attr('class', 'scatterWrap');


        var g = wrap.select('g')
            .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');


        var scatterWrap= g.select('.scatterWrap')
            .datum(dataCopy.filter(function(d) { return !d.disabled }))

        d3.transition(scatterWrap).call(scatter);


        var area = d3.svg.area()
            .x(function(d,i) { return x(getX(d,i)) })
            .y0(function(d) { return y(d.y0) })
            .y1(function(d) { return y(d.y + d.y0) });

        var zeroArea = d3.svg.area()
            .x(function(d,i) { return x(getX(d,i)) })
            .y0(function(d) { return y(d.y0) })
            .y1(function(d) { return y(d.y0) });


        var path = g.select('.areaWrap').selectAll('path.area')
            .data(function(d) { return d });
        path.enter().append('path').attr('class', function(d,i) { return 'area area-' + i })
            .on('mouseover', function(d,i) {
              d3.select(this).classed('hover', true);
              dispatch.areaMouseover({
                point: d,
                series: d.key,
                //pos: [x(getX(point, d.point)) + margin.left, y(getY(point, d.point)) + margin.top],
                pos: [d3.event.pageX, d3.event.pageY],
                seriesIndex: i
                //pointIndex: d.point
              });
            })
            .on('mouseout', function(d,i) {
              d3.select(this).classed('hover', false);
              dispatch.areaMouseout({
                point: d,
                series: d.key,
                //pos: [x(getX(point, d.point)) + margin.left, y(getY(point, d.point)) + margin.top],
                pos: [d3.event.pageX, d3.event.pageY],
                seriesIndex: i
                //pointIndex: d.point
              });
            })
            .on('click', function(d,i) {
              d3.select(this).classed('hover', false);
              dispatch.areaClick({
                point: d,
                series: d.key,
                //pos: [x(getX(point, d.point)) + margin.left, y(getY(point, d.point)) + margin.top],
                pos: [d3.event.pageX, d3.event.pageY],
                seriesIndex: i
                //pointIndex: d.point
              });
            })
        d3.transition(path.exit())
            .attr('d', function(d,i) { return zeroArea(d.values,i) })
            .remove();
        path
            .style('fill', function(d,i){ return color[i % 10] })
            .style('stroke', function(d,i){ return color[i % 10] });
        d3.transition(path)
            .attr('d', function(d,i) { return area(d.values,i) })


        scatter.dispatch.on('pointClick.area', function(e) {
          dispatch.areaClick(e);
        })
        scatter.dispatch.on('pointMouseover.area', function(e) {
          g.select('.area-' + e.seriesIndex).classed('hover', true);
        });
        scatter.dispatch.on('pointMouseout.area', function(e) {
          g.select('.area-' + e.seriesIndex).classed('hover', false);
        });

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

  chart.dispatch = dispatch;
  chart.scatter = scatter;


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


  return chart;
}
