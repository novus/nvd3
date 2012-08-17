
nv.models.scatter = function() {

  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var margin      = {top: 0, right: 0, bottom: 0, left: 0}
    , width       = 960
    , height      = 500
    , color       = nv.utils.defaultColor() // chooses color
    , id          = Math.floor(Math.random() * 100000) //Create semi-unique ID incase user doesn't selet one
    , x           = d3.scale.linear()
    , y           = d3.scale.linear()
    , z           = d3.scale.linear() //linear because d3.svg.shape.size is treated as area
    , getX        = function(d) { return d.x } // accessor to get the x value
    , getY        = function(d) { return d.y } // accessor to get the y value
    , getSize     = function(d) { return d.size } // accessor to get the point size
    , getShape    = function(d) { return d.shape || 'circle' } // accessor to get point shape
    , forceX      = [] // List of numbers to Force into the X scale (ie. 0, or a max / min, etc.)
    , forceY      = [] // List of numbers to Force into the Y scale
    , forceSize   = [] // List of numbers to Force into the Size scale
    , interactive = true // If true, plots a voronoi overlay for advanced point interection
    , pointActive = function(d) { return !d.notActive } // any points that return false will be filtered out
    , clipEdge    = false // if true, masks points within x and y scale
    , clipVoronoi = true // if true, masks each point with a circle... can turn off to slightly increase performance
    , clipRadius  = function() { return 25 } // function to get the radius for voronoi point clips
    , xDomain     = null // Override x domain (skips the calculation from data)
    , yDomain     = null // Override y domain
    , sizeDomain  = null // Override point size domain
    , sizeRange   = null
    , singlePoint = false
    , dispatch    = d3.dispatch('elementClick', 'elementMouseover', 'elementMouseout')
    , useVoronoi  = true
    ;

  //============================================================


  //============================================================
  // Private Variables
  //------------------------------------------------------------

  var x0, y0, z0 // used to store previous scales
    , timeoutID
    ;

  //============================================================


  function chart(selection) {
    selection.each(function(data) {
      var availableWidth = width - margin.left - margin.right,
          availableHeight = height - margin.top - margin.bottom,
          container = d3.select(this);

      //add series index to each data point for reference
      data = data.map(function(series, i) {
        series.values = series.values.map(function(point) {
          point.series = i;
          return point;
        });
        return series;
      });

      //------------------------------------------------------------
      // Setup Scales

      // remap and flatten the data for use in calculating the scales' domains
      var seriesData = (xDomain && yDomain && sizeDomain) ? [] : // if we know xDomain and yDomain and sizeDomain, no need to calculate.... if Size is constant remember to set sizeDomain to speed up performance
            d3.merge(
              data.map(function(d) {
                return d.values.map(function(d,i) {
                  return { x: getX(d,i), y: getY(d,i), size: getSize(d,i) }
                })
              })
            );

      x   .domain(xDomain || d3.extent(seriesData.map(function(d) { return d.x }).concat(forceX)))
          .range([0, availableWidth]);

      y   .domain(yDomain || d3.extent(seriesData.map(function(d) { return d.y }).concat(forceY)))
          .range([availableHeight, 0]);

      z   .domain(sizeDomain || d3.extent(seriesData.map(function(d) { return d.size }).concat(forceSize)))
          .range(sizeRange || [16, 256]);

      // If scale's domain don't have a range, slightly adjust to make one... so a chart can show a single data point
      if (x.domain()[0] === x.domain()[1] || y.domain()[0] === y.domain()[1]) singlePoint = true;
      if (x.domain()[0] === x.domain()[1])
        x.domain()[0] ?
            x.domain([x.domain()[0] - x.domain()[0] * 0.01, x.domain()[1] + x.domain()[1] * 0.01])
          : x.domain([-1,1]);

      if (y.domain()[0] === y.domain()[1])
        y.domain()[0] ?
            y.domain([y.domain()[0] + y.domain()[0] * 0.01, y.domain()[1] - y.domain()[1] * 0.01])
          : y.domain([-1,1]);


      x0 = x0 || x;
      y0 = y0 || y;
      z0 = z0 || z;

      //------------------------------------------------------------


      //------------------------------------------------------------
      // Setup containers and skeleton of chart

      var wrap = container.selectAll('g.nv-wrap.nv-scatter').data([data]);
      var wrapEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap nv-scatter nv-chart-' + id + (singlePoint ? ' nv-single-point' : ''));
      var defsEnter = wrapEnter.append('defs');
      var gEnter = wrapEnter.append('g');
      var g = wrap.select('g');

      gEnter.append('g').attr('class', 'nv-groups');
      gEnter.append('g').attr('class', 'nv-point-paths');

      wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      //------------------------------------------------------------


      defsEnter.append('clipPath')
          .attr('id', 'nv-edge-clip-' + id)
        .append('rect');

      wrap.select('#nv-edge-clip-' + id + ' rect')
          .attr('width', availableWidth)
          .attr('height', availableHeight);

      g   .attr('clip-path', clipEdge ? 'url(#nv-edge-clip-' + id + ')' : '');


      function updateInteractiveLayer() {

        if (!interactive) return false;

        var eventElements;

        var vertices = d3.merge(data.map(function(group, groupIndex) {
            return group.values
              .filter(pointActive) // remove non-interactive points
              .map(function(point, pointIndex) {
                // *Adding noise to make duplicates very unlikely
                // **Injecting series and point index for reference
                return [x(getX(point,pointIndex)) * (Math.random() / 1e12 + 1)  , y(getY(point,pointIndex)) * (Math.random() / 1e12 + 1), groupIndex, pointIndex]; //temp hack to add noise untill I think of a better way so there are no duplicates
              })
          })
        );


        if (clipVoronoi) {
          defsEnter.append('clipPath').attr('id', 'nv-points-clip-' + id);

          var pointClips = wrap.select('#nv-points-clip-' + id).selectAll('circle')
              .data(vertices);
          pointClips.enter().append('circle')
              .attr('r', clipRadius);
          pointClips.exit().remove();
          pointClips
              .attr('cx', function(d) { return d[0] })
              .attr('cy', function(d) { return d[1] });

          wrap.select('.nv-point-paths')
              .attr('clip-path', 'url(#nv-points-clip-' + id + ')');
        }


        //inject series and point index for reference into voronoi
        if (useVoronoi === true) {
          var voronoi = d3.geom.voronoi(vertices).map(function(d, i) {
              return {
                'data': d,
                'series': vertices[i][2],
                'point': vertices[i][3]
              }
            });


          var pointPaths = wrap.select('.nv-point-paths').selectAll('path')
              .data(voronoi);
          pointPaths.enter().append('path')
              .attr('class', function(d,i) { return 'nv-path-'+i; });
          pointPaths.exit().remove();
          pointPaths
              .attr('d', function(d) { return 'M' + d.data.join(',') + 'Z'; });

          eventElements = pointPaths;

        } else {
          // bring data in form needed for click handlers
          var dataWithPoints = vertices.map(function(d, i) {
              return {
                'data': d,
                'series': vertices[i][2],
                'point': vertices[i][3]
              }
            });

          // add event handlers to points instead voronoi paths
          eventElements = wrap.select('.nv-groups').selectAll('.nv-group')
            .selectAll('path.nv-point')
            .data(dataWithPoints)
            .style('pointer-events', 'auto'); // recativate events, disabled by css
        }

        eventElements
            .on('click', function(d) {
              var series = data[d.series],
                  point  = series.values[d.point];

              dispatch.elementClick({
                point: point,
                series: series,
                pos: [x(getX(point, d.point)) + margin.left, y(getY(point, d.point)) + margin.top],
                seriesIndex: d.series,
                pointIndex: d.point
              });
            })
            .on('mouseover', function(d) {
              var series = data[d.series],
                  point  = series.values[d.point];

              dispatch.elementMouseover({
                point: point,
                series: series,
                pos: [x(getX(point, d.point)) + margin.left, y(getY(point, d.point)) + margin.top],
                seriesIndex: d.series,
                pointIndex: d.point
              });
            })
            .on('mouseout', function(d, i) {
              var series = data[d.series],
                  point  = series.values[d.point];

              dispatch.elementMouseout({
                point: point,
                series: series,
                seriesIndex: d.series,
                pointIndex: d.point
              });
            });

      }



      var groups = wrap.select('.nv-groups').selectAll('.nv-group')
          .data(function(d) { return d }, function(d) { return d.key });
      groups.enter().append('g')
          .style('stroke-opacity', 1e-6)
          .style('fill-opacity', 1e-6);
      d3.transition(groups.exit())
          .style('stroke-opacity', 1e-6)
          .style('fill-opacity', 1e-6)
          .remove();
      groups
          .attr('class', function(d,i) { return 'nv-group nv-series-' + i })
          .classed('hover', function(d) { return d.hover });
      d3.transition(groups)
          .style('fill', function(d,i) { return color(d, i) })
          .style('stroke', function(d,i) { return color(d, i) })
          .style('stroke-opacity', 1)
          .style('fill-opacity', .5);


      var points = groups.selectAll('path.nv-point')
          .data(function(d) { return d.values });
      points.enter().append('path')
          .attr('transform', function(d,i) {
            return 'translate(' + x0(getX(d,i)) + ',' + y0(getY(d,i)) + ')'
          })
          .attr('d',
            d3.svg.symbol()
              .type(getShape)
              .size(function(d,i) { return z(getSize(d,i)) })
          );
      points.exit().remove();
      d3.transition(groups.exit().selectAll('path.nv-point'))
          .attr('transform', function(d,i) {
            return 'translate(' + x(getX(d,i)) + ',' + y(getY(d,i)) + ')'
          })
          .remove();
      points.attr('class', function(d,i) { return 'nv-point nv-point-' + i });
      d3.transition(points)
          .attr('transform', function(d,i) {
            return 'translate(' + x(getX(d,i)) + ',' + y(getY(d,i)) + ')'
          })
          .attr('d',
            d3.svg.symbol()
              .type(getShape)
              .size(function(d,i) { return z(getSize(d,i)) })
          );


      // Delay updating the invisible interactive layer for smoother animation
      clearTimeout(timeoutID); // stop repeat calls to updateInteractiveLayer
      timeoutID = setTimeout(updateInteractiveLayer, 1000);

      //store old scales for use in transitions on update
      x0 = x.copy();
      y0 = y.copy();
      z0 = z.copy();

    });

    return chart;
  }


  //============================================================
  // Event Handling/Dispatching (out of chart's scope)
  //------------------------------------------------------------

  dispatch.on('elementMouseover.point', function(d) {
    if (interactive)
      d3.select('.nv-chart-' + id + ' .nv-series-' + d.seriesIndex + ' .nv-point-' + d.pointIndex)
          .classed('hover', true);
  });

  dispatch.on('elementMouseout.point', function(d) {
    if (interactive)
      d3.select('.nv-chart-' + id + ' .nv-series-' + d.seriesIndex + ' .nv-point-' + d.pointIndex)
          .classed('hover', false);
  });

  //============================================================


  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  chart.dispatch = dispatch;

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

  chart.xScale = function(_) {
    if (!arguments.length) return x;
    x = _;
    return chart;
  };

  chart.yScale = function(_) {
    if (!arguments.length) return y;
    y = _;
    return chart;
  };

  chart.zScale = function(_) {
    if (!arguments.length) return z;
    z = _;
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

  chart.sizeRange = function(_) {
    if (!arguments.length) return sizeRange;
    sizeRange = _;
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

  chart.pointActive = function(_) {
    if (!arguments.length) return pointActive;
    pointActive = _;
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

  chart.useVoronoi= function(_) {
    if (!arguments.length) return useVoronoi;
    useVoronoi = _;
    if (useVoronoi === false) {
        clipVoronoi = false;
    }
    return chart;
  };

  chart.clipRadius = function(_) {
    if (!arguments.length) return clipRadius;
    clipRadius = _;
    return chart;
  };

  chart.color = function(_) {
    if (!arguments.length) return color;
    color = nv.utils.getColor(_);
    return chart;
  };

  chart.shape = function(_) {
    if (!arguments.length) return getShape;
    getShape = _;
    return chart;
  };

  chart.id = function(_) {
    if (!arguments.length) return id;
    id = _;
    return chart;
  };

  chart.singlePoint = function(_) {
    if (!arguments.length) return singlePoint;
    singlePoint = _;
    return chart;
  };

  //============================================================


  return chart;
}
