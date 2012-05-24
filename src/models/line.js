//TODO: consider adding axes
//        -How to deal with time vs generic linear, vs any other scale?

nv.models.line = function() {
  //Default Settings
  var margin = {top: 0, right: 0, bottom: 0, left: 0}, 
      width = 960,
      height = 500,
      dotRadius = function() { return 2.5 }, //consider removing this, or making similar to scatter
      color = d3.scale.category10().range(),
      id = Math.floor(Math.random() * 10000), //Create semi-unique ID incase user doesn't select one
      getX = function(d) { return d.x },
      getY = function(d) { return d.y },
      forceX = [],
      forceY = [],
      interactive = true,
      clipEdge = false,
      clipVoronoi = true,
      xDomain, yDomain;

  var x = d3.scale.linear(),
      y = d3.scale.linear(),
      dispatch = d3.dispatch('pointMouseover', 'pointMouseout'),
      x0, y0,
      timeoutID;




  function chart(selection) {
    selection.each(function(data) {
      var seriesData = data.map(function(d) { 
            return d.values.map(function(d,i) {
              return { x: getX(d,i), y: getY(d,i) }
            })
          }),
          availableWidth = width - margin.left - margin.right,
          availableHeight = height - margin.top - margin.bottom;

      //store old scales if they exist
      x0 = x0 || x;
      y0 = y0 || y;


      x   .domain(xDomain || d3.extent(d3.merge(seriesData).map(function(d) { return d.x }).concat(forceX)))
          .range([0, availableWidth]);

      y   .domain(yDomain || d3.extent(d3.merge(seriesData).map(function(d) { return d.y }).concat(forceY)))
          .range([availableHeight, 0]);


      var wrap = d3.select(this).selectAll('g.d3line').data([data]);
      var wrapEnter = wrap.enter().append('g').attr('class', 'd3line');
      var defsEnter = wrapEnter.append('defs');
      var gEnter = wrapEnter.append('g');

      gEnter.append('g').attr('class', 'lines');

      wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');


      defsEnter.append('clipPath')
          .attr('id', 'edge-clip-' + id)
        .append('rect');
      wrap.select('#edge-clip-' + id + ' rect')
          .attr('width', availableWidth)
          .attr('height', availableHeight);

      gEnter
          .attr('clip-path', clipEdge ? 'url(#edge-clip-' + id + ')' : null);



      function updateInteractiveLayer() {

        if (!interactive) {
          wrap.select('#points-clip-' + id).remove();
          wrap.select('.point-paths').remove();
          return false;
        }

        gEnter.append('g').attr('class', 'point-paths');
        defsEnter.append('clipPath').attr('id', 'points-clip-' + id);


        var vertices = d3.merge(data.map(function(line, lineIndex) {
            return line.values.map(function(point, pointIndex) {
              // Adding noise to make duplicates very unlikely
              // Inject series and point index for reference
              // TODO: see how much time this consumes
              return [x(getX(point, pointIndex)) * (Math.random() / 1e12 + 1)  , y(getY(point, pointIndex)) * (Math.random() / 1e12 + 1), lineIndex, pointIndex]; 
            })
          })
        );

        var pointClips = wrap.select('#points-clip-' + id).selectAll('circle')
            .data(vertices);
        pointClips.enter().append('circle')
            .attr('r', 25);
        pointClips.exit().remove();
        pointClips
            .attr('cx', function(d) { return d[0] })
            .attr('cy', function(d) { return d[1] });

        wrap.select('.point-paths')
            .attr('clip-path', clipVoronoi ? 'url(#points-clip-' + id + ')' : null);


        //inject series and point index for reference into voronoi
        // considering adding a removeZeros option, may be useful for the stacked chart and maybe others
        var voronoi = d3.geom.voronoi(vertices).map(function(d,i) { return { 'data': d, 'series': vertices[i][2], 'point': vertices[i][3] } });


        var pointPaths = wrap.select('.point-paths').selectAll('path')
            .data(voronoi);
        pointPaths.enter().append('path')
            .attr('class', function(d,i) { return 'path-'+i; });
        pointPaths.exit().remove();
        pointPaths
            .attr('d', function(d) { return 'M' + d.data.join(',') + 'Z'; })
            .on('mouseover', function(d) {
              var series = data[d.series],
                  point  = series.values[d.point];

              dispatch.pointMouseover({
                point: point,
                series:series,
                pos: [x(getX(point, d.point)) + margin.left, y(getY(point, d.point)) + margin.top],
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
            wrap.select('.series-' + d.seriesIndex + ' .point-' + d.pointIndex)
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

      //setTimeout(interactiveLayer, 1000); //seems not to work as well as above... BUT fixes broken resize

      var paths = lines.selectAll('path')
          .data(function(d, i) { return [d.values] });
      paths.enter().append('path')
          .attr('d', d3.svg.line()
            .x(function(d,i) { return x0(getX(d,i)) })
            .y(function(d,i) { return y0(getY(d,i)) })
          );
      d3.transition(lines.exit().selectAll('path'))
          .attr('d', d3.svg.line()
            .x(function(d,i) { return x(getX(d,i)) })
            .y(function(d,i) { return y(getY(d,i)) })
          )
          .remove(); // redundant? line is already being removed
      d3.transition(paths)
          .attr('d', d3.svg.line()
            .x(function(d,i) { return x(getX(d,i)) })
            .y(function(d,i) { return y(getY(d,i)) })
          );


      var points = lines.selectAll('circle.point')
          .data(function(d) { return d.values });
      points.enter().append('circle')
          .attr('cx', function(d,i) { return x0(getX(d,i)) })
          .attr('cy', function(d,i) { return y0(getY(d,i)) });
          /*
      // I think this is redundant with below, but originally put this here for a reason
      d3.transition(points.exit())
          .attr('cx', function(d,i) { return x(getX(d,i)) })
          .attr('cy', function(d,i) { return y(getY(d,i)) })
          .remove();
         */
      d3.transition(lines.exit().selectAll('circle.point'))
          .attr('cx', function(d,i) { return x(getX(d,i)) })
          .attr('cy', function(d,i) { return y(getY(d,i)) })
          .remove();
      d3.transition(points)
          .attr('class', function(d,i) { return 'point point-' + i })
          .attr('cx', function(d,i) { return x(getX(d,i)) })
          .attr('cy', function(d,i) { return y(getY(d,i)) })
          .attr('r', dotRadius);


      clearTimeout(timeoutID);
      timeoutID = setTimeout(updateInteractiveLayer, 750);

      //store old scales for use in transitions on update, to animate from old to new positions
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

  chart.forceX = function(_) {
    if (!arguments.length) return forceX;
    forceX = _;
    return chart;
  };

  chart.forceY = function(_) {
    if (!arguments.length) return forceY;
    forceY = _;
    return chart;
  };

  chart.interactive = function(_) {
    if (!arguments.length) return interactive;
    interactive = _;
    return chart;
  };

  chart.clipEdge = function(_) {
    if (!arguments.length) return clipEdge;
    clipEdge = _;
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
