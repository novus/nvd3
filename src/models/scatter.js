
nv.models.scatter = function() {
  var margin = {top: 0, right: 0, bottom: 0, left: 0},
      width = 960,
      height = 500,
      color = d3.scale.category10().range(),
      id = Math.floor(Math.random() * 100000), //Create semi-unique ID incase user doesn't selet one
      x = d3.scale.linear(),
      y = d3.scale.linear(),
      z = d3.scale.sqrt(), //sqrt because point size is done by area, not radius
      getX = function(d) { return d.x }, // or d[0]
      getY = function(d) { return d.y }, // or d[1]
      getSize = function(d) { return d.size }, // or d[2]
      forceX = [],
      forceY = [],
      x0, y0, z0,
      dispatch = d3.dispatch('pointMouseover', 'pointMouseout');


  function chart(selection) {
    selection.each(function(data) {
      var seriesData = data.map(function(d) { return d.values }),
          availableWidth = width - margin.left - margin.right,
          availableHeight = height - margin.top - margin.bottom;

      x0 = x0 || x;
      y0 = y0 || y;
      z0 = z0 || z;

      //TODO: reconsider points {x: #, y: #} instead of [x,y]
      //add series data to each point for future ease of use
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
      x   .domain(d3.extent(d3.merge(seriesData).map( getX ).concat(forceX) ))
          .range([0, availableWidth]);

      y   .domain(d3.extent(d3.merge(seriesData).map( getY ).concat(forceY) ))
          .range([availableHeight, 0]);

      z   .domain(d3.extent(d3.merge(seriesData), getSize ))
          .range([2, 10]);


      var vertices = d3.merge(data.map(function(group, groupIndex) {
          return group.values.map(function(point, pointIndex) {
            //return [x(getX(point)), y(getY(point)), groupIndex, pointIndex]; //inject series and point index for reference into voronoi
            return [x(getX(point)) * (Math.random() / 1e12 + 1)  , y(getY(point)) * (Math.random() / 1e12 + 1), groupIndex, pointIndex]; //temp hack to add noise untill I think of a better way so there are no duplicates
          })
        })
      );


      var wrap = d3.select(this).selectAll('g.d3scatter').data([data]);
      var gEnter = wrap.enter().append('g').attr('class', 'd3scatter').append('g');

      gEnter.append('g').attr('class', 'groups');
      gEnter.append('g').attr('class', 'point-clips');
      gEnter.append('g').attr('class', 'point-paths');
      gEnter.append('g').attr('class', 'distribution');

      var g = wrap.select('g')
          .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');


      var voronoiClip =  gEnter.append('g').attr('class', 'voronoi-clip')
        .append('clipPath')
          .attr('id', 'voronoi-clip-path-' + id)
        .append('rect');
      wrap.select('.voronoi-clip rect')
          .attr('x', -10)
          .attr('y', -10)
          .attr('width', availableWidth + 20)
          .attr('height', availableHeight + 20);
      wrap.select('.point-paths')
          .attr('clip-path', 'url(#voronoi-clip-path-' + id + ')');


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
      var voronoi = d3.geom.voronoi(vertices).map(function(d, i) { return { 'data': d, 'series': vertices[i][2], 'point': vertices[i][3] } });


      var pointPaths = wrap.select('.point-paths').selectAll('path')
          .data(voronoi);
      pointPaths.enter().append('path')
          .attr('class', function(d,i) { return 'path-'+i; });
      pointPaths.exit().remove();
      pointPaths
          .attr('clip-path', function(d,i) { return 'url(#clip-' + id + '-' + d.series + '-' + d.point +')' })
          .attr('d', function(d) { return 'M' + d.data.join(',') + 'Z'; })
          .on('mouseover', function(d) {
            dispatch.pointMouseover({
              point: data[d.series].values[d.point],
              series: data[d.series],
              pos: [x(getX(data[d.series].values[d.point])) + margin.left, y(getY(data[d.series].values[d.point])) + margin.top],
              seriesIndex: d.series,
              pointIndex: d.point
              }
            );
          })
          .on('mouseout', function(d, i) {
            dispatch.pointMouseout({
              point: data[d.series].values[d.point],
              series: data[d.series],
              seriesIndex: d.series,
              pointIndex: d.point
            });
          });



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
          .attr('cx', function(d) { return x0(getX(d)) })
          .attr('cy', function(d) { return y0(getY(d)) })
          .attr('r', function(d) { return z0(getSize(d)) });
      //d3.transition(points.exit())
      d3.transition(groups.exit().selectAll('circle.point'))
          .attr('cx', function(d) { return x(getX(d)) })
          .attr('cy', function(d) { return y(getY(d)) })
          .attr('r', function(d) { return z(getSize(d)) })
          .remove();
      points.attr('class', function(d,i) { return 'point point-' + i });
      d3.transition(points)
          .attr('cx', function(d) { return x(getX(d)) })
          .attr('cy', function(d) { return y(getY(d)) })
          .attr('r', function(d) { return z(getSize(d)) });



      var distX = groups.selectAll('line.distX')
          .data(function(d) { return d.values })
      distX.enter().append('line')
          .attr('x1', function(d) { return x0(getX(d)) })
          .attr('x2', function(d) { return x0(getX(d)) })
      //d3.transition(distX.exit())
      d3.transition(groups.exit().selectAll('line.distX'))
          .attr('x1', function(d) { return x(getX(d)) })
          .attr('x2', function(d) { return x(getX(d)) })
          .remove();
      distX
          .attr('class', function(d,i) { return 'distX distX-' + i })
          .attr('y1', y.range()[0])
          .attr('y2', y.range()[0] + 8);
      d3.transition(distX)
          .attr('x1', function(d) { return x(getX(d)) })
          .attr('x2', function(d) { return x(getX(d)) })

      var distY = groups.selectAll('line.distY')
          .data(function(d) { return d.values })
      distY.enter().append('line')
          .attr('y1', function(d) { return y0(getY(d)) })
          .attr('y2', function(d) { return y0(getY(d)) });
      //d3.transition(distY.exit())
      d3.transition(groups.exit().selectAll('line.distY'))
          .attr('y1', function(d) { return y(getY(d)) })
          .attr('y2', function(d) { return y(getY(d)) })
          .remove();
      distY
          .attr('class', function(d,i) { return 'distY distY-' + i })
          .attr('x1', x.range()[0])
          .attr('x2', x.range()[0] - 8)
      d3.transition(distY)
          .attr('y1', function(d) { return y(getY(d)) })
          .attr('y2', function(d) { return y(getY(d)) });



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


      //store old scales for use in transitions on update
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
