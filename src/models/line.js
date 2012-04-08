//TODO: consider adding axes
//        -How to deal with time vs generic linear, vs any other scale?

nv.models.line = function() {
  //Default Settings
  var margin = {top: 0, right: 0, bottom: 0, left: 0}, //consider removing margin options from here... or make margin padding inside the chart (subtract margin from range)
      width = 960,
      height = 500,
      dotRadius = function() { return 2.5 }, //consider removing this, or making similar to scatter
      color = d3.scale.category10().range(),
      id = Math.floor(Math.random() * 10000), //Create semi-unique ID incase user doesn't select one
      getX = function(d) { return d.x },
      getY = function(d) { return d.y },
      interactive = true,
      clipVoronoi = true,
      xDomain, yDomain;

  var x = d3.scale.linear(),
      y = d3.scale.linear(),
      dispatch = d3.dispatch('pointMouseover', 'pointMouseout'),
      x0, y0;


  function chart(selection) {
    selection.each(function(data) {
      var seriesData = data.map(function(d) { return d.values }),
          availableWidth = width - margin.left - margin.right,
          availableHeight = height - margin.top - margin.bottom;

      x0 = x0 || x;
      y0 = y0 || y;


      x   .domain(xDomain || d3.extent(d3.merge(seriesData), getX ))
          .range([0, availableWidth]);

      y   .domain(yDomain || d3.extent(d3.merge(seriesData), getY ))
          .range([availableHeight, 0]);


      var wrap = d3.select(this).selectAll('g.d3line').data([data]);
      var wrapEnter = wrap.enter().append('g').attr('class', 'd3line');
      var gEnter = wrapEnter.append('g');

      gEnter.append('g').attr('class', 'lines');

      var g = wrap.select('g')
          .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');



      wrapEnter.append('defs').append('clipPath')
          .attr('id', 'chart-clip-path-' + id)
        .append('rect');
      wrap.select('#chart-clip-path-' + id + ' rect')
          .attr('width', availableWidth)
          .attr('height', availableHeight);

      gEnter
          .attr('clip-path', 'url(#chart-clip-path-' + id + ')');

      var shiftWrap = gEnter.append('g').attr('class', 'shiftWrap');



      // destroy interactive layer during transition,
      //   VERY needed because of performance issues
      g.selectAll('.point-clips *, .point-paths *').remove();


      function interactiveLayer() {
        if (!interactive) return false;

        shiftWrap.append('g').attr('class', 'point-clips');
        shiftWrap.append('g').attr('class', 'point-paths');

        var vertices = d3.merge(data.map(function(line, lineIndex) {
            return line.values.map(function(point, pointIndex) {
              //return [x(getX(point)), y(getY(point)), lineIndex, pointIndex]; //inject series and point index for reference into voronoi
              return [x(getX(point)) * (Math.random() / 1e12 + 1)  , y(getY(point)) * (Math.random() / 1e12 + 1), lineIndex, pointIndex]; //temp hack to add noise untill I think of a better way so there are no duplicates
            })
          })
        );

        // ***These clips are more than half the cause for the slowdown***
        //var pointClips = wrap.select('.point-clips').selectAll('clipPath') // **BROWSER BUG** can't reselect camel cased elements
        var pointClips = wrap.select('.point-clips').selectAll('.clip-path')
            .data(vertices);
        pointClips.enter().append('clipPath').attr('class', 'clip-path')
          .append('circle')
            .attr('r', 25);
        pointClips.exit().remove();
        pointClips
            .attr('id', function(d, i) { return 'clip-' + id + '-' + d[2] + '-' + d[3] })
            .attr('transform', function(d) { return 'translate(' + d[0] + ',' + d[1] + ')' })


        //inject series and point index for reference into voronoi
        // considering adding a removeZeros option, may be useful for the stacked chart and maybe others
        var voronoi = d3.geom.voronoi(vertices).map(function(d, i) { return { 'data': d, 'series': vertices[i][2], 'point': vertices[i][3] } });


        //TODO: Add small amount noise to prevent duplicates
        var pointPaths = wrap.select('.point-paths').selectAll('path')
            .data(voronoi);
        pointPaths.enter().append('path')
            .attr('class', function(d,i) { return 'path-'+i; })
            .style('fill-opacity', 0);
        pointPaths.exit().remove();
        pointPaths
            .attr('clip-path', function(d,i) { return clipVoronoi ? 'url(#clip-' + id + '-' + d.series + '-' + d.point +')' : '' })
            .attr('d', function(d) { return 'M' + d.data.join(',') + 'Z'; })
            .on('mouseover', function(d) {
              var series = data[d.series],
                  point  = series.values[d.point];

              dispatch.pointMouseover({
                point: point,
                series:series,
                pos: [x(getX(point)) + margin.left, y(getY(point)) + margin.top],
                seriesIndex: d.series,
                pointIndex: d.point
              });
            })
            .on('mouseout', function(d, i) {
              dispatch.pointMouseout({
                point: data[d.series].values[d.point],
                series: data[d.series],
                seriesIndex: d.series,
                pointIndex: d.point
              });
            });


        dispatch.on('pointMouseover.point', function(d) {
            wrap.select('.series-' + d.seriesIndex + ' .point-' + d.pointIndex)
                .classed('hover', true);
        });
        dispatch.on('pointMouseout.point', function(d) {
            wrap.select('.series-' + d.seriesIndex + ' circle.point-' + d.pointIndex)
                .classed('hover', false);
        });
      }



      var lines = wrap.select('.lines').selectAll('.line')
          .data(function(d) { return d }, function(d) { return d.key });
      lines.enter().append('g')
          .style('stroke-opacity', 1e-6)
          .style('fill-opacity', 1e-6);
      d3.transition(lines.exit())
          .style('stroke-opacity', 1e-6)
          .style('fill-opacity', 1e-6)
          .remove();
      lines
          .attr('class', function(d,i) { return 'line series-' + i })
          .classed('hover', function(d) { return d.hover })
          .style('fill', function(d,i){ return color[i % 10] })
          .style('stroke', function(d,i){ return color[i % 10] })
      d3.transition(lines)
          .style('stroke-opacity', 1)
          .style('fill-opacity', .5)
          //.each('end', function(d,i) { if (!i) setTimeout(interactiveLayer, 0) }); //trying to call this after transitions are over, doesn't work on resize!
          //.each('end', function(d,i) { if (!i) interactiveLayer()  }); //trying to call this after transitions are over, not sure if the timeout gains anything

      setTimeout(interactiveLayer, 1000); //seems not to work as well as above... BUT fixes broken resize

      var paths = lines.selectAll('path')
          .data(function(d, i) { return [d.values] });
      paths.enter().append('path')
          .attr('d', d3.svg.line()
            .x(function(d) { return x0(getX(d)) })
            .y(function(d) { return y0(getY(d)) })
          );
      //d3.transition(paths.exit())
      d3.transition(lines.exit().selectAll('path'))
          .attr('d', d3.svg.line()
            .x(function(d) { return x(getX(d)) })
            .y(function(d) { return y(getY(d)) })
          )
          .remove();
      d3.transition(paths)
          .attr('d', d3.svg.line()
            .x(function(d) { return x(getX(d)) })
            .y(function(d) { return y(getY(d)) })
          );


      var points = lines.selectAll('circle.point')
          .data(function(d) { return d.values });
      points.enter().append('circle')
          .attr('cx', function(d) { return x0(getX(d)) })
          .attr('cy', function(d) { return y0(getY(d)) });
      d3.transition(points.exit())
          .attr('cx', function(d) { return x(getX(d)) })
          .attr('cy', function(d) { return y(getY(d)) })
          .remove();
      d3.transition(lines.exit().selectAll('circle.point'))
          .attr('cx', function(d) { return x(getX(d)) })
          .attr('cy', function(d) { return y(getY(d)) })
          .remove();
      points.attr('class', function(d,i) { return 'point point-' + i });
      d3.transition(points)
          .attr('cx', function(d) { return x(getX(d)) })
          .attr('cy', function(d) { return y(getY(d)) })
          .attr('r', dotRadius);


      x0 = x.copy();
      y0 = y.copy();

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
    width = _;
    return chart;
  };

  chart.height = function(_) {
    if (!arguments.length) return height;
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

  chart.interactive = function(_) {
    if (!arguments.length) return interactive;
    interactive = _;
    return chart;
  };

  chart.clipVoronoi= function(_) {
    if (!arguments.length) return clipVoronoi;
    clipVoronoi = _;
    return chart;
  };

  chart.dotRadius = function(_) {
    if (!arguments.length) return dotRadius;
    dotRadius = d3.functor(_);
    return chart;
  };

  chart.color = function(_) {
    if (!arguments.length) return color;
    color = _;
    return chart;
  };

  chart.id = function(_) {
    if (!arguments.length) return id;
    id = _;
    return chart;
  };


  return chart;
}
