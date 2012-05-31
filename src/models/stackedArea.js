
nv.models.stackedArea = function() {
  //Default Settings
  var margin = {top: 0, right: 0, bottom: 0, left: 0},
      width = 960,
      height = 500,
      color = d3.scale.category20().range(), // array of colors to be used in order
      id = Math.floor(Math.random() * 100000), //Create semi-unique ID incase user doesn't selet one
      getX = function(d) { return d.x }, // accessor to get the x value from a data point
      getY = function(d) { return d.y }, // accessor to get the y value from a data point
      style = 'stack',
      offset = 'zero',
      order = 'default',
      clipEdge = false; // if true, masks lines within x and y scale

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

  var scatter= nv.models.scatter()
        .size(2.2) // default size
        .sizeDomain([2.5]), //set to speed up calculation, needs to be unset if there is a cstom size accessor
      dispatch =  d3.dispatch('tooltipShow', 'tooltipHide', 'areaClick', 'areaMouseover', 'areaMouseout');

  function chart(selection) {
    selection.each(function(data) {
        // Need to leave data alone to switch between stacked, stream, and expanded
        var dataCopy = JSON.parse(JSON.stringify(data)),
            availableWidth = width - margin.left - margin.right,
            availableHeight = height - margin.top - margin.bottom;


        //TODO: deal with negative stacked charts

        //compute the data based on offset and order (calc's y0 for every point)
        dataCopy = d3.layout.stack()
                     .offset(offset)
                     .order(order)
                     .values(function(d){ return d.values })
                     .y(getY)
                     (dataCopy);



        var wrap = d3.select(this).selectAll('g.d3stackedarea').data([dataCopy]);
        var wrapEnter = wrap.enter().append('g').attr('class', 'd3stackedarea');
        var defsEnter = wrapEnter.append('defs');
        var gEnter = wrapEnter.append('g');
        var g = wrap.select('g');

        gEnter.append('g').attr('class', 'areaWrap');


        scatter
          .width(availableWidth)
          .height(availableHeight)
          .x(getX)
          .y(function(d) { return d.y + d.y0 }) // TODO: allow for getY to be other than d.y
          .forceY([0])
          .color(data.map(function(d,i) {
            return d.color || color[i % 20];
          }).filter(function(d,i) { return !data[i].disabled }));

        gEnter.append('g').attr('class', 'scatterWrap');
        var scatterWrap= g.select('.scatterWrap')
            .datum(dataCopy.filter(function(d) { return !d.disabled }))

        d3.transition(scatterWrap).call(scatter);



        x = scatter.xScale();
        y = scatter.yScale();





        wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');


        if (clipEdge) {
          defsEnter.append('clipPath')
              .attr('id', 'edge-clip-' + id)
            .append('rect');

          wrap.select('#edge-clip-' + id + ' rect')
              .attr('width', availableWidth)
              .attr('height', availableHeight);

          gEnter
              .attr('clip-path', 'url(#edge-clip-' + id + ')');
        }




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
            .style('fill', function(d,i){ return color[i % 20] })
            .style('stroke', function(d,i){ return color[i % 20] });
        d3.transition(path)
            .attr('d', function(d,i) { return area(d.values,i) })


        //TODO: these disptach handlers don't need to be called everytime the chart
        //      is called, but 'g' is only in this scope... so need to rethink.
        scatter.dispatch.on('elementClick.area', function(e) {
          dispatch.areaClick(e);
        })
        scatter.dispatch.on('elementMouseover.area', function(e) {
          g.select('.area-' + e.seriesIndex).classed('hover', true);
        });
        scatter.dispatch.on('elementMouseout.area', function(e) {
          g.select('.area-' + e.seriesIndex).classed('hover', false);
        });

    });


    return chart;
  }


  chart.dispatch = dispatch;
  chart.scatter = scatter;

  d3.rebind(chart, scatter, 'interactive', 'size', 'xScale', 'yScale', 'zScale', 'xDomain', 'yDomain', 'sizeDomain', 'forceX', 'forceY', 'forceSize', 'clipVoronoi', 'clipRadius');

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

  chart.clipEdge = function(_) {
    if (!arguments.length) return clipEdge;
    clipEdge = _;
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



  scatter.dispatch.on('elementMouseover.tooltip', function(e) {
        e.pos = [e.pos[0] + margin.left, e.pos[1] + margin.top],
        dispatch.tooltipShow(e);
  });

  scatter.dispatch.on('elementMouseout.tooltip', function(e) {
        dispatch.tooltipHide(e);
  });


  return chart;
}
