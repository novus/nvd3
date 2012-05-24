
nv.models.scatter = function() {
  var margin = {top: 0, right: 0, bottom: 0, left: 0},
      width = 960,
      height = 500,
      color = d3.scale.category10().range(),
      id = Math.floor(Math.random() * 100000), //Create semi-unique ID incase user doesn't selet one
      getX = function(d) { return d.x }, // or d[0]
      getY = function(d) { return d.y }, // or d[1]
      getSize = function(d) { return d.size }, // or d[2]
      forceX = [],
      forceY = [],
      forceSize = [],
      interactive = true,
      clipEdge = false,
      clipVoronoi = true,
      xDomain, yDomain, sizeDomain;

  var x = d3.scale.linear(),
      y = d3.scale.linear(),
      z = d3.scale.sqrt(), //sqrt because point size is done by area, not radius
      dispatch = d3.dispatch('pointMouseover', 'pointMouseout'),
      x0, y0, z0,
      timeoutID;


  function chart(selection) {
    selection.each(function(data) {
      var seriesData = data.map(function(d) { 
            return d.values.map(function(d,i) {
              return { x: getX(d,i), y: getY(d,i), size: getSize(d,i) }
            })
          }),
          availableWidth = width - margin.left - margin.right,
          availableHeight = height - margin.top - margin.bottom;

      //store old scales if they exist
      x0 = x0 || x;
      y0 = y0 || y;
      z0 = z0 || z;

      //add series index to each data point for reference
      data = data.map(function(series, i) {
        series.values = series.values.map(function(point) {
          //point.label = series.label;
          //point.color = series.color;
          point.series = i;
          return point;
        });
        return series;
      });


      //TODO: figure out the best way to deal with scales with equal MIN and MAX
      x   .domain(xDomain || d3.extent(d3.merge(seriesData).map(function(d) { return d.x }).concat(forceX)))
          .range([0, availableWidth]);

      y   .domain(yDomain || d3.extent(d3.merge(seriesData).map(function(d) { return d.y }).concat(forceY)))
          .range([availableHeight, 0]);

      z   .domain(sizeDomain || d3.extent(d3.merge(seriesData).map(function(d) { return d.size }).concat(forceSize)))
          .range([2, 10]);



      var wrap = d3.select(this).selectAll('g.d3scatter').data([data]);
      var wrapEnter = wrap.enter().append('g').attr('class', 'd3scatter');
      var defsEnter = wrapEnter.append('defs');
      var gEnter = wrapEnter.append('g');

      gEnter.append('g').attr('class', 'groups');
      gEnter.append('g').attr('class', 'distribution');

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

        defsEnter.append('clipPath').attr('id', 'points-clip-' + id);
        gEnter.append('g').attr('class', 'point-paths');

        var vertices = d3.merge(data.map(function(group, groupIndex) {
            return group.values.map(function(point, pointIndex) {
              // Adding noise to make duplicates very unlikely
              // Inject series and point index for reference
              // TODO: see how much time this consumes
              return [x(getX(point,pointIndex)) * (Math.random() / 1e12 + 1)  , y(getY(point,pointIndex)) * (Math.random() / 1e12 + 1), groupIndex, pointIndex]; //temp hack to add noise untill I think of a better way so there are no duplicates
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
            .attr('clip-path', 'url(#points-clip-' + id + ')');


        //inject series and point index for reference into voronoi
        // considering adding a removeZeros option, may be useful for the stacked chart and maybe others
        var voronoi = d3.geom.voronoi(vertices).map(function(d, i) { return { 'data': d, 'series': vertices[i][2], 'point': vertices[i][3] } });


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
            wrap.select('.series-' + d.seriesIndex + ' .distX-' + d.pointIndex)
                .attr('y1', d.pos[1] - margin.top);
            wrap.select('.series-' + d.seriesIndex + ' .distY-' + d.pointIndex)
                .attr('x1', d.pos[0] - margin.left);
        });

        dispatch.on('pointMouseout.point', function(d) {
            wrap.select('.series-' + d.seriesIndex + ' circle.point-' + d.pointIndex)
                .classed('hover', false);
            wrap.select('.series-' + d.seriesIndex + ' .distX-' + d.pointIndex)
                .attr('y1', y.range()[0]);
            wrap.select('.series-' + d.seriesIndex + ' .distY-' + d.pointIndex)
                .attr('x1', x.range()[0]);
        });

      }




      var groups = wrap.select('.groups').selectAll('.group')
          .data(function(d) { return d }, function(d) { return d.key });
      groups.enter().append('g')
          .style('stroke-opacity', 1e-6)
          .style('fill-opacity', 1e-6);
      d3.transition(groups.exit())
          .style('stroke-opacity', 1e-6)
          .style('fill-opacity', 1e-6)
          .remove();
      groups
          .attr('class', function(d,i) { return 'group series-' + i })
          .classed('hover', function(d) { return d.hover && !d.disabled });
      d3.transition(groups)
          .style('fill', function(d,i) { return color[i % 10] })
          .style('stroke', function(d,i) { return color[i % 10] })
          .style('stroke-opacity', 1)
          .style('fill-opacity', .5);


      var points = groups.selectAll('circle.point')
          .data(function(d) { return d.values });
      points.enter().append('circle')
          .attr('cx', function(d,i) { return x0(getX(d,i)) })
          .attr('cy', function(d,i) { return y0(getY(d,i)) })
          .attr('r', function(d,i) { return z0(getSize(d,i)) });
      //d3.transition(points.exit())
      d3.transition(groups.exit().selectAll('circle.point'))
          .attr('cx', function(d,i) { return x(getX(d,i)) })
          .attr('cy', function(d,i) { return y(getY(d,i)) })
          .attr('r', function(d,i) { return z(getSize(d,i)) })
          .remove();
      points.attr('class', function(d,i) { return 'point point-' + i });
      d3.transition(points)
          .attr('cx', function(d,i) { return x(getX(d,i)) })
          .attr('cy', function(d,i) { return y(getY(d,i)) })
          .attr('r', function(d,i) { return z(getSize(d,i)) });


      // TODO: make axis distributions options... maybe even abstract out of this file

      var distX = groups.selectAll('line.distX')
          .data(function(d) { return d.values })
      distX.enter().append('line')
          .attr('x1', function(d,i) { return x0(getX(d,i)) })
          .attr('x2', function(d,i) { return x0(getX(d,i)) })
      //d3.transition(distX.exit())
      d3.transition(groups.exit().selectAll('line.distX'))
          .attr('x1', function(d,i) { return x(getX(d,i)) })
          .attr('x2', function(d,i) { return x(getX(d,i)) })
          .remove();
      distX
          .attr('class', function(d,i) { return 'distX distX-' + i })
          .attr('y1', y.range()[0])
          .attr('y2', y.range()[0] + 8);
      d3.transition(distX)
          .attr('x1', function(d,i) { return x(getX(d,i)) })
          .attr('x2', function(d,i) { return x(getX(d,i)) })

      var distY = groups.selectAll('line.distY')
          .data(function(d) { return d.values })
      distY.enter().append('line')
          .attr('y1', function(d,i) { return y0(getY(d,i)) })
          .attr('y2', function(d,i) { return y0(getY(d,i)) });
      //d3.transition(distY.exit())
      d3.transition(groups.exit().selectAll('line.distY'))
          .attr('y1', function(d,i) { return y(getY(d,i)) })
          .attr('y2', function(d,i) { return y(getY(d,i)) })
          .remove();
      distY
          .attr('class', function(d,i) { return 'distY distY-' + i })
          .attr('x1', x.range()[0])
          .attr('x2', x.range()[0] - 8)
      d3.transition(distY)
          .attr('y1', function(d,i) { return y(getY(d,i)) })
          .attr('y2', function(d,i) { return y(getY(d,i)) });


      clearTimeout(timeoutID);
      timeoutID = setTimeout(updateInteractiveLayer, 750);

      //store old scales for use in transitions on update, to animate from old to new positions, and sizes
      x0 = x.copy();
      y0 = y.copy();
      z0 = z.copy();

    });

    return chart;
  }


  chart.dispatch = dispatch;

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

  chart.x = function(_) {
    if (!arguments.length) return getX;
    getX = d3.functor(_);
    return chart;
  };

  chart.y = function(_) {
    if (!arguments.length) return getY;
    getY = d3.functor(_);
    return chart;
  };

  chart.size = function(_) {
    if (!arguments.length) return getSize;
    getSize = d3.functor(_);
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

  chart.sizeDomain = function(_) {
    if (!arguments.length) return sizeDomain;
    sizeDomain = _;
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

  chart.forceSize = function(_) {
    if (!arguments.length) return forceSize;
    forceSize = _;
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
