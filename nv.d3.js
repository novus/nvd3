
/*****
 * A no frills tooltip implementation.
 *****/

(function($) {

  var nvtooltip = window.nvtooltip = {};

  nvtooltip.show = function(pos, content, gravity, dist) {
    var container = $('<div class="nvtooltip">');

    gravity = gravity || 's';
    dist = dist || 20;

    container
      .html(content)
      .css({left: -1000, top: -1000, opacity: 0})
      .appendTo('body'); //append the container out of view so we can get measurements

    var height = container.height() + parseInt(container.css('padding-top'))  + parseInt(container.css('padding-bottom')),
        width = container.width() + parseInt(container.css('padding-left'))  + parseInt(container.css('padding-right')),
        windowWidth = $(window).width(),
        windowHeight = $(window).height(),
        scrollTop = $('body').scrollTop(),
        scrollLeft = $('body').scrollLeft(),
        left, top;


    switch (gravity) {
      case 'e':
        left = pos[0] - width - dist;
        top = pos[1] - (height / 2);
        if (left < scrollLeft) left = pos[0] + dist;
        if (top < scrollTop) top = scrollTop + 5;
        if (top + height > scrollTop + windowHeight) top = scrollTop - height - 5;
        break;
      case 'w':
        left = pos[0] + dist;
        top = pos[1] - (height / 2);
        if (left + width > windowWidth) left = pos[0] - width - dist;
        if (top < scrollTop) top = scrollTop + 5;
        if (top + height > scrollTop + windowHeight) top = scrollTop - height - 5;
        break;
      case 'n':
        left = pos[0] - (width / 2);
        top = pos[1] + dist;
        if (left < scrollLeft) left = scrollLeft + 5;
        if (left + width > windowWidth) left = windowWidth - width - 5;
        if (top + height > scrollTop + windowHeight) top = pos[1] - height - dist;
        break;
      case 's':
        left = pos[0] - (width / 2);
        top = pos[1] - height - dist;
        if (left < scrollLeft) left = scrollLeft + 5;
        if (left + width > windowWidth) left = windowWidth - width - 5;
        if (scrollTop > top) top = pos[1] + 20;
        break;
    }


    container
        .css({
          left: left,
          top: top,
          opacity: 1
        });

    return container;
  };

  nvtooltip.cleanup = function() {
    var tooltips = $('.nvtooltip');

    tooltips.css({
        'transition-delay': '0 !important',
        '-moz-transition-delay': '0 !important',
        '-webkit-transition-delay': '0 !important'
    });

    tooltips.css('opacity',0);

    setTimeout(function() {
      tooltips.remove()
    }, 500);
  };

})(jQuery);
(function(){
var nv = {
  version: '0.0.1',
  dev: true //set false when in production
};


window.nv = nv;

nv.models = {}; //stores all the possible models/components
nv.charts = {}; //stores all the ready to use charts
nv.graphs = []; //stores all the graphs currently on the page
nv.log = {}; //stores some statistics and potential error messages

nv.dispatch = d3.dispatch('render_start', 'render_end');


// ********************************************
//  Public Helper functions, not part of NV

window.log = function(obj) {
  if ((typeof(window.console) === 'object')
    && (typeof(window.console.log) === 'function'))
      console.log.apply(console, arguments);

  return obj;
};




// ********************************************
//  Public Core NV functions

nv.dispatch.on('render_start', function(e) {
  nv.log.startTime = +new Date;
});

nv.dispatch.on('render_end', function(e) {
  nv.log.endTime = +new Date;
  nv.log.totalTime = nv.log.endTime - nv.log.startTime;
  if (nv.dev) log('total', nv.log.totalTime); //used for development, to keep track of graph generation times
});


// ********************************************
//  Public Core NV functions

nv.render = function render(step) {
  step = step || 1; // number of graphs to generate in each timout loop

  render.active = true;
  nv.dispatch.render_start();

  setTimeout(function(){
    var chart;

    for (var i = 0; i < step && (graph = render.queue[i]); i++) {
      chart = graph.generate();
      if (typeof graph.callback === 'function') graph.callback(chart);
      nv.graphs.push(chart);
    }

    render.queue.splice(0, i);

    if (render.queue.length) setTimeout(arguments.callee, 0);
    else { 
      nv.render.active = false;
      nv.dispatch.render_end();
    }
  }, 0);
};
nv.render.queue = [];


nv.addGraph = function(obj) {
  if (typeof arguments[0] === 'function')
    obj = {generate: arguments[0], callback: arguments[1]};

  nv.render.queue.push(obj);

  if (!nv.render.active) nv.render();
};



nv.identity = function(d) { return d };


nv.strip = function(s) {
  return s.replace(/(\s|&)/g,'');
}





/* An ugly implementation to get month end axis dates
 * Will hopefully refactor sooner than later
 */

function daysInMonth(month,year) {
  var m = [31,28,31,30,31,30,31,31,30,31,30,31];
  if (month != 2) return m[month - 1];
  if (year%4 != 0) return m[1];
  if (year%100 == 0 && year%400 != 0) return m[1];
  return m[1] + 1;
}


function d3_time_range(floor, step, number) {
  return function(t0, t1, dt) {
    var time = floor(t0), times = [];
    if (time < t0) step(time);
    if (dt > 1) {
      while (time < t1) {
        var date = new Date(+time);
        if (!(number(date) % dt)) times.push(date);
        step(time);
      }
    } else {
      while (time < t1) times.push(new Date(+time)), step(time);
    }
    return times;
  };
}


d3.time.monthEnd = function(date) {
  return new Date(date.getFullYear(), date.getMonth(), 0);
};


d3.time.monthEnds = d3_time_range(d3.time.monthEnd, function(date) {
    date.setUTCDate(date.getUTCDate() + 1);
    date.setDate(daysInMonth(date.getMonth() + 1, date.getFullYear()));
  }, function(date) {
    return date.getMonth();
  }
);




nv.models.legend = function() {
  var margin = {top: 5, right: 0, bottom: 5, left: 10},
      width = 400,
      height = 20,
      color = d3.scale.category10().range(),
      dispatch = d3.dispatch('legendClick', 'legendMouseover', 'legendMouseout');

  function chart(selection) {
    selection.each(function(data) {

      var wrap = d3.select(this).selectAll('g.legend').data([data]);
      var gEnter = wrap.enter().append('g').attr('class', 'legend').append('g');


      var g = wrap.select('g')
          .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');


      var series = g.selectAll('.series')
          .data(function(d) { return d });
      var seriesEnter = series.enter().append('g').attr('class', 'series')
          .on('mouseover', function(d,i) {
            dispatch.legendMouseover(d,i);
          })
          .on('mouseout', function(d,i) {
            dispatch.legendMouseout(d,i);
          })
          .on('click', function(d,i) {
            dispatch.legendClick(d,i);
          });
      seriesEnter.append('circle')
          .style('fill', function(d,i) { return d.color || color[i % 20] })
          .style('stroke', function(d,i) { return d.color || color[i % 20] })
          .style('stroke-width', 2)
          .attr('r', 5);
      seriesEnter.append('text')
          .text(function(d) { return d.key })
          .attr('text-anchor', 'start')
          .attr('dy', '.32em')
          .attr('dx', '8');
      series.classed('disabled', function(d) { return d.disabled });
      series.exit().remove();


      var ypos = 5,
          newxpos = 5,
          maxwidth = 0,
          xpos;
      series
          .attr('transform', function(d, i) {
            var length = d3.select(this).select('text').node().getComputedTextLength() + 28;
            xpos = newxpos;

            if (width < margin.left + margin.right + xpos + length) {
              newxpos = xpos = 5;
              ypos += 20;
            }

            newxpos += length;
            if (newxpos > maxwidth) maxwidth = newxpos;

            return 'translate(' + xpos + ',' + ypos + ')';
          });

      //position legend as far right as possible within the total width
      g.attr('transform', 'translate(' + (width - margin.right - maxwidth) + ',' + margin.top + ')');

      //update height value if calculated larger than current
      //Asuming legend is always horizontal for now, removing if clause because this does not let legend shrink after expanding
      //TODO: allow legend to be horizontal or vertical, instead of definign height/width define one, and maybe call it maxHeight/maxWidth
      //if (height < margin.top + margin.bottom + ypos + 15)
        height = margin.top + margin.bottom + ypos + 15;

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

  chart.color = function(_) {
    if (!arguments.length) return color;
    color = _;
    return chart;
  };

  return chart;
}

nv.models.xaxis = function() {
  var domain = [0,1], //just to have something to start with, maybe I dont need this
      range = [0,1],
      axisLabelText = false;

  var scale = d3.scale.linear(),
      axis = d3.svg.axis().scale(scale).orient('bottom');

  function chart(selection) {
    selection.each(function(data) {

      scale.domain(domain)
           .range(range);

      //TODO: consider calculating height based on whether or not label is added, for reference in charts using this component

      var axisLabel = d3.select(this).selectAll('text.axislabel')
          .data([axisLabelText || null]);
      axisLabel.enter().append('text').attr('class', 'axislabel')
          .attr('text-anchor', 'middle')
          .attr('x', range[1] / 2)
          .attr('y', 25);
      axisLabel.exit().remove();
      axisLabel.text(function(d) { return d });


      //d3.select(this)
      d3.transition(d3.select(this))
          .call(axis);

      d3.select(this)
        .selectAll('line.tick')
        //.filter(function(d) { return !parseFloat(d) })
        .filter(function(d) { return !parseFloat(Math.round(d*100000)/1000000) })
          .classed('zero', true);

    });

    return chart;
  }


  chart.domain = function(_) {
    if (!arguments.length) return domain;
    domain = _;
    return chart;
  };

  chart.range = function(_) {
    if (!arguments.length) return range;
    range = _;
    return chart;
  };

  chart.scale = function(_) {
    if (!arguments.length) return scale;
    scale = _;
    axis.scale(scale);
    return chart;
  };

  chart.axisLabel = function(_) {
    if (!arguments.length) return axisLabelText;
    axisLabelText = _;
    return chart;
  }


  d3.rebind(chart, axis, 'orient', 'ticks', 'tickSubdivide', 'tickSize', 'tickPadding', 'tickFormat');

  return chart;
}

nv.models.yaxis = function() {
  var domain = [0,1], //just to have something to start with
      range = [0,1],
      axisLabelText = false;

  var y = d3.scale.linear(),
      axis = d3.svg.axis().scale(y).orient('left');

  function chart(selection) {
    selection.each(function(data) {

      y   .domain(domain)
          .range(range);


      //TODO: consider calculating width based on whether or not label is added, for reference in charts using this component

      var axisLabel = d3.select(this).selectAll('text.axislabel')
          .data([axisLabelText || null]);
      axisLabel.enter().append('text').attr('class', 'axislabel')
          .attr('transform', 'rotate(-90)')
          .attr('text-anchor', 'middle')
          .attr('y', -40); //TODO: consider calculating this based on largest tick width... OR at least expose this on chart
      axisLabel.exit().remove();
      axisLabel
          .attr('x', -range[0] / 2)
          .text(function(d) { return d });


      //d3.select(this)
      d3.transition(d3.select(this))
          .call(axis);

      d3.select(this)
        .selectAll('line.tick')
        //.filter(function(d) { return !parseFloat(d) })
        .filter(function(d) { return !parseFloat(Math.round(d*100000)/1000000) })
          .classed('zero', true);

    });

    return chart;
  }


  chart.domain = function(_) {
    if (!arguments.length) return domain;
    domain = _;
    return chart;
  };

  chart.range = function(_) {
    if (!arguments.length) return range;
    range = _;
    return chart;
  };

  chart.axisLabel = function(_) {
    if (!arguments.length) return axisLabelText;
    axisLabelText = _;
    return chart;
  }


  d3.rebind(chart, axis, 'scale', 'orient', 'ticks', 'tickSubdivide', 'tickSize', 'tickPadding', 'tickFormat');

  return chart;
}

nv.models.bar = function() {
  var margin = {top: 20, right: 10, bottom: 20, left: 60},
      width = 960,
      height = 500,
      animate = 500;

  var x = d3.scale.ordinal(),
      y = d3.scale.linear(),
      xAxis = d3.svg.axis().scale(x).orient('bottom').ticks(5),
      yAxis = d3.svg.axis().scale(y).orient('left');

  function chart(selection) {
    selection.each(function(data) {

      //x   .domain(data.map(function(d,i) { return d.label }))
      x   .domain(["One", "Two", "Three", "Four", "Five"])
          .rangeRoundBands([0, width - margin.left - margin.right], .1);

      y   .domain([0, d3.max(data, function(d) { return d.y; })])
          .range([height - margin.top - margin.bottom, 0]);

      xAxis.ticks( width / 100 );
      yAxis.ticks( height / 36 ).tickSize(-(width - margin.right - margin.left), 0);

      yAxis.tickSize(-(width - margin.right - margin.left), 0);

      var wrap = d3.select(this).selectAll('g.wrap').data([data]);
      var gEnter = wrap.enter().append('g').attr('class', 'wrap').append('g');

      gEnter.append('g').attr('class', 'x axis');
      gEnter.append('g').attr('class', 'y axis');
      gEnter.append('g').attr('class', 'bars');


      wrap.attr('width', width)
          .attr('height', height);

      var g = wrap.select('g')
          .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');


      var bars = wrap.select('.bars').selectAll('.bar')
          .data(function(d) { return d });
      bars.exit().remove();


      var barsEnter = bars.enter().append('g')
          .attr('class', 'bar')
          .on('mouseover', function(d,i){ d3.select(this).classed('hover', true) })
          .on('mouseout', function(d,i){ d3.select(this).classed('hover', false) });
      barsEnter.append('rect')
          .attr('y', function(d) { return y(0) });
      barsEnter.append('text')
          .attr('text-anchor', 'middle')
          .attr('dy', '-4px');


      bars
          .attr('transform', function(d,i) { return 'translate(' + x(d.label) + ',0)' })
      bars.selectAll('rect')
          .order()
          .attr('width', x.rangeBand )
        .transition()
          .duration(animate)
          .attr('x', 0 )
          .attr('y', function(d) { return y(d.y) })
          .attr('height', function(d) { return y.range()[0] - y(d.y) });
      bars.selectAll('text')
          .attr('x', 0 )
          .attr('y', function(d) { return y(d.y) })
          .attr('dx', x.rangeBand() / 2)
          .text(function(d) { return d.y });


      g.select('.x.axis')
          .attr('transform', 'translate(0,' + y.range()[0] + ')')
          .call(xAxis);

      g.select('.y.axis')
          .call(yAxis);
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
    if (margin.left + margin.right + 20 > _)
      width = margin.left + margin.right + 20 // Min width
    else
      width = _;
    return chart;
  };

  chart.height = function(_) {
    if (!arguments.length) return height;
    if (margin.top + margin.bottom + 20 > _)
      height = margin.top + margin.bottom + 20 // Min height
    else
      height = _;
    return chart;
  };

  chart.animate = function(_) {
    if (!arguments.length) return animate;
    animate = _;
    return chart;
  };

  chart.xaxis = {};
  // Expose the x-axis' tickFormat method.
  d3.rebind(chart.xaxis, xAxis, 'tickFormat');

  chart.yaxis = {};
  // Expose the y-axis' tickFormat method.
  d3.rebind(chart.yaxis, yAxis, 'tickFormat');

  return chart;
}
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

nv.models.lineWithFocus = function() {
  var margin  = {top: 30, right: 20, bottom: 30, left: 60},
      margin2 = {top: 0, right: 20, bottom: 20, left: 60},
      width = 960,
      height = 500,
      height1 = 400,
      height2 = 100,
      dotRadius = function() { return 2.5 },
      color = d3.scale.category10().range(),
      getX = function(d) { return d.x },
      getY = function(d) { return d.y },
      id = Math.floor(Math.random() * 10000); //Create semi-unique ID incase user doesn't select one

  var x = d3.scale.linear(),
      y = d3.scale.linear(),
      x2 = d3.scale.linear(),
      y2 = d3.scale.linear(),
      xAxis = nv.models.xaxis().scale(x),
      yAxis = nv.models.yaxis().scale(y),
      xAxis2 = nv.models.xaxis().scale(x2),
      yAxis2 = nv.models.yaxis().scale(y2),
      legend = nv.models.legend().height(30),
      focus = nv.models.line(),
      context = nv.models.line().dotRadius(.1).interactive(false),
      dispatch = d3.dispatch('tooltipShow', 'tooltipHide'),
      brush = d3.svg.brush()
            .x(x2);


  //var wrap, gEnter, g, focus, focusLines, contextWrap, focusWrap, contextLines;  //brought all variables to this scope for use within brush function... is this a bad idea?

  //var seriesData;  //Temporarily bringing this data to this scope.... may be bad idea (same with above).. may need to rethink brushing

  function chart(selection) {
    selection.each(function(data) {
      seriesData = data.filter(function(d) { return !d.disabled })
            .map(function(d) { return d.values });

      x2  .domain(d3.extent(d3.merge(seriesData), getX ))
          .range([0, width - margin.left - margin.right]);
      y2  .domain(d3.extent(d3.merge(seriesData), getY ))
          .range([height2 - margin2.top - margin2.bottom, 0]);

      x   .domain(brush.empty() ? x2.domain() : brush.extent())
          .range([0, width - margin.left - margin.right]);
      y   .domain(y2.domain())
          .range([height1 - margin.top - margin.bottom, 0]);

      brush.on('brush', onBrush);

      focus
        .width(width - margin.left - margin.right)
        .height(height1 - margin.top - margin.bottom)
        .color(data.map(function(d,i) {
          return d.color || color[i % 10];
        }).filter(function(d,i) { return !data[i].disabled }))

      context
        .width(width - margin.left - margin.right)
        .height(height2 - margin2.top - margin2.bottom)
        .color(data.map(function(d,i) {
          return d.color || color[i % 10];
        }).filter(function(d,i) { return !data[i].disabled }))


      updateFocus();


      var wrap = d3.select(this).selectAll('g.wrap').data([data]);
      var gEnter = wrap.enter().append('g').attr('class', 'wrap d3lineWithFocus').append('g');

      gEnter.append('g').attr('class', 'focus');
      gEnter.append('g').attr('class', 'context');
      gEnter.append('g').attr('class', 'legendWrap');



      var g = wrap.select('g')
          //.attr('transform', 'translate(0,0)');




      // ********** LEGEND **********

      legend.width(width/2 - margin.right);

      g.select('.legendWrap')
          .datum(data)
          .attr('transform', 'translate(' + (width/2 - margin.left) + ',0)')
          .call(legend);


      //TODO: margins should be adjusted based on what components are used: axes, axis labels, legend
      margin.top = legend.height();




      // ********** FOCUS **********

      var focusWrap = g.select('.focus')
          .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      gEnter.select('.focus').append('g').attr('class', 'x axis');
      gEnter.select('.focus').append('g').attr('class', 'y axis');
      gEnter.select('.focus').append('g').attr('class', 'focusLines');


      var focusLines = focusWrap.select('.focusLines')
          .datum(data.filter(function(d) { return !d.disabled }))

      d3.transition(focusLines).call(focus);


      xAxis
        .domain(x.domain())
        .range(x.range())
        .ticks( width / 100 )
        .tickSize(-(height1 - margin.top - margin.bottom), 0);

      focusWrap.select('.x.axis')
          .attr('transform', 'translate(0,' + y.range()[0] + ')');
      d3.transition(g.select('.x.axis'))
          .call(xAxis);

      yAxis
        .domain(y.domain())
        .range(y.range())
        .ticks( height / 36 )
        .tickSize(-(width - margin.right - margin.left), 0);

      d3.transition(g.select('.y.axis'))
          .call(yAxis);




      // ********** CONTEXT **********

      var contextWrap = g.select('.context')
          .attr('transform', 'translate(' + margin2.left + ',' + height1 + ')');

      gEnter.select('.context').append('g').attr('class', 'x2 axis');
      gEnter.select('.context').append('g').attr('class', 'y2 axis');
      gEnter.select('.context').append('g').attr('class', 'contextLines');
      gEnter.select('.context').append('g').attr('class', 'x brush')
          .attr('class', 'x brush')
          .call(brush)
        .selectAll('rect')
          .attr('y', -5)
          .attr('height', height2 + 4);

      var contextLines = contextWrap.select('.contextLines')
          .datum(data.filter(function(d) { return !d.disabled }))

      d3.transition(contextLines).call(context);


      xAxis2
        .domain(x2.domain())
        .range(x2.range())
        .ticks( width / 100 )
        .tickSize(-(height2 - margin2.top - margin2.bottom), 0);

      contextWrap.select('.x2.axis')
          .attr('transform', 'translate(0,' + y2.range()[0] + ')');
      d3.transition(contextWrap.select('.x2.axis'))
          .call(xAxis2);


      yAxis2
        .domain(y2.domain())
        .range(y2.range())
        .ticks( (height2 - margin2.top  - margin2.bottom) / 24 )
        .tickSize(-(width - margin2.right - margin2.left), 0);

      contextWrap.select('.y2.axis');

      d3.transition(contextWrap.select('.y2.axis'))
          .call(yAxis2);






      // ********** EVENT LISTENERS **********

      legend.dispatch.on('legendClick', function(d,i) {
        d.disabled = !d.disabled;

        if (!data.filter(function(d) { return !d.disabled }).length) {
          data.map(function(d) {
            d.disabled = false;
            wrap.selectAll('.series').classed('disabled', false);
            return d;
          });
        }

        selection.transition().call(chart);
      });

/*
      legend.dispatch.on('legendMouseover', function(d, i) {
        d.hover = true;
        selection.transition().call(chart)
      });
      legend.dispatch.on('legendMouseout', function(d, i) {
        d.hover = false;
        selection.transition().call(chart)
      });
*/

      focus.dispatch.on('pointMouseover.tooltip', function(e) {
        dispatch.tooltipShow({
          point: e.point,
          series: e.series,
          pos: [e.pos[0] + margin.left, e.pos[1] + margin.top],
          seriesIndex: e.seriesIndex,
          pointIndex: e.pointIndex
        });
      });
      focus.dispatch.on('pointMouseout.tooltip', function(e) {
        dispatch.tooltipHide(e);
      });





      function onBrush() {
        updateFocus();


        focusLines.call(focus)
        wrap.select('.x.axis').call(xAxis);
        wrap.select('.y.axis').call(yAxis);
      }

      function updateFocus() {
        var yDomain = brush.empty() ? y2.domain() : d3.extent(d3.merge(seriesData).filter(function(d) {
          return getX(d) >= brush.extent()[0] && getX(d) <= brush.extent()[1];
        }), getY);  //This doesn't account for the 1 point before and the 1 point after the domain.  Would fix, but likely need to change entire methodology here

        if (typeof yDomain[0] == 'undefined') yDomain = y2.domain(); //incase the brush doesn't cover a single point


        x.domain(brush.empty() ? x2.domain() : brush.extent());
        y.domain(yDomain);

        //TODO: Rethink this... performance is horrible, likely need to cut off focus data to within the range
        //      If I limit the data for focusLines would want to include 1 point before and after the extent,
        //      Need to figure out an optimized way to accomplish this.
        //      ***One concern is to try not to make the assumption that all lines are of the same length, and
        //         points with the same index have the same x value (while this is true in our test cases, may 
        //         no always be)
        
        focus.xDomain(x.domain());
        focus.yDomain(y.domain());
      }


    });

    return chart;
  }



  // ********** FUNCTIONS **********




  // ********** PUBLIC ACCESSORS **********

  chart.dispatch = dispatch;

  chart.x = function(_) {
    if (!arguments.length) return getX;
    getX = _;
    focus.x(_);
    context.x(_);
    return chart;
  };

  chart.y = function(_) {
    if (!arguments.length) return getY;
    getY = _;
    focus.y(_);
    context.y(_);
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
    height1 =  _ - height2;
    return chart;
  };

  chart.contextHeight = function(_) {
    if (!arguments.length) return height2;
    height2 = _;
    height1 = height - _;
    return chart;
  };

  chart.dotRadius = function(_) {
    if (!arguments.length) return dotRadius;
    dotRadius = d3.functor(_);
    focus.dotRadius = _;
    return chart;
  };

  chart.id = function(_) {
    if (!arguments.length) return id;
    id = _;
    return chart;
  };


  // Chart has multiple similar Axes, to prevent code duplication, probably need to link all axis functions manually like below
  chart.xTickFormat = function(_) {
    if (!arguments.length) return x.tickFormat();
    xAxis.tickFormat(_);
    xAxis2.tickFormat(_);
    return chart;
  };

  chart.yTickFormat = function(_) {
    if (!arguments.length) return y.tickFormat();
    yAxis.tickFormat(_);
    yAxis2.tickFormat(_);
    return chart;
  };



  //TODO: allow for both focus and context axes to be linked
  chart.xAxis = xAxis;
  chart.yAxis = yAxis;


  return chart;
}

nv.models.lineWithLegend = function() {
  var margin = {top: 30, right: 20, bottom: 50, left: 60},
      getWidth = function() { return 960 },
      getHeight = function() { return 500 },
      dotRadius = function() { return 2.5 },
      color = d3.scale.category10().range(),
      dispatch = d3.dispatch('tooltipShow', 'tooltipHide');

  var x = d3.scale.linear(),
      y = d3.scale.linear(),
      getX = function(d) { return d.x },
      getY = function(d) { return d.y },
      xAxis = nv.models.xaxis().scale(x),
      yAxis = nv.models.yaxis().scale(y),
      legend = nv.models.legend().height(30),
      lines = nv.models.line();


  function chart(selection) {
    selection.each(function(data) {
      var width = getWidth(),
          height = getHeight(),
          availableWidth = width - margin.left - margin.right,
          availableHeight = height - margin.top - margin.bottom;

      var series = data.filter(function(d) { return !d.disabled })
            .map(function(d) { return d.values });

      x   .domain(d3.extent(d3.merge(series), getX ))
          .range([0, availableWidth]);

      y   .domain(d3.extent(d3.merge(series), getY ))
          .range([availableHeight, 0]);

      lines
        .width(availableWidth)
        .height(availableHeight)
        .color(data.map(function(d,i) {
          return d.color || color[i % 10];
        }).filter(function(d,i) { return !data[i].disabled }))


      var wrap = d3.select(this).selectAll('g.wrap').data([data]);
      var gEnter = wrap.enter().append('g').attr('class', 'wrap d3lineWithLegend').append('g');

      gEnter.append('g').attr('class', 'x axis');
      gEnter.append('g').attr('class', 'y axis');
      gEnter.append('g').attr('class', 'linesWrap');
      gEnter.append('g').attr('class', 'legendWrap');


      legend.dispatch.on('legendClick', function(d,i) { 
        d.disabled = !d.disabled;

        if (!data.filter(function(d) { return !d.disabled }).length) {
          data.map(function(d) {
            d.disabled = false;
            wrap.selectAll('.series').classed('disabled', false);
            return d;
          });
        }

        selection.transition().call(chart);
      });

/*
      //
      legend.dispatch.on('legendMouseover', function(d, i) {
        d.hover = true;
        selection.transition().call(chart)
      });

      legend.dispatch.on('legendMouseout', function(d, i) {
        d.hover = false;
        selection.transition().call(chart)
      });
*/

      lines.dispatch.on('pointMouseover.tooltip', function(e) {
        dispatch.tooltipShow({
          point: e.point,
          series: e.series,
          pos: [e.pos[0] + margin.left, e.pos[1] + margin.top],
          seriesIndex: e.seriesIndex,
          pointIndex: e.pointIndex
        });
      });

      lines.dispatch.on('pointMouseout.tooltip', function(e) {
        dispatch.tooltipHide(e);
      });


      //TODO: margins should be adjusted based on what components are used: axes, axis labels, legend
      margin.top = legend.height();

      var g = wrap.select('g')
          .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');


      legend.width(width/2 - margin.right);

      g.select('.legendWrap')
          .datum(data)
          .attr('transform', 'translate(' + (width/2 - margin.left) + ',' + (-margin.top) +')')
          .call(legend);


      var linesWrap = g.select('.linesWrap')
          .datum(data.filter(function(d) { return !d.disabled }))


      d3.transition(linesWrap).call(lines);


      xAxis
        .domain(x.domain())
        .range(x.range())
        .ticks( width / 100 )
        .tickSize(-availableHeight, 0);

      g.select('.x.axis')
          .attr('transform', 'translate(0,' + y.range()[0] + ')');
      d3.transition(g.select('.x.axis'))
          .call(xAxis);

      yAxis
        .domain(y.domain())
        .range(y.range())
        .ticks( height / 36 )
        .tickSize(-availableWidth, 0);

      d3.transition(g.select('.y.axis'))
          .call(yAxis);

    });

    return chart;
  }

  chart.dispatch = dispatch;
  chart.legend = legend;
  chart.xAxis = xAxis;
  chart.yAxis = yAxis;

  chart.x = function(_) {
    if (!arguments.length) return getX;
    getX = _;
    lines.x(_);
    return chart;
  };

  chart.y = function(_) {
    if (!arguments.length) return getY;
    getY = _;
    lines.y(_);
    return chart;
  };

  chart.margin = function(_) {
    if (!arguments.length) return margin;
    margin = _;
    return chart;
  };

  chart.width = function(_) {
    if (!arguments.length) return getWidth;
    getWidth = d3.functor(_);
    return chart;
  };

  chart.height = function(_) {
    if (!arguments.length) return getHeight;
    getHeight = d3.functor(_);
    return chart;
  };

  chart.dotRadius = function(_) {
    if (!arguments.length) return dotRadius;
    dotRadius = d3.functor(_);
    lines.dotRadius = _;
    return chart;
  };


  return chart;
}

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

nv.models.scatterWithLegend = function() {
  var margin = {top: 30, right: 20, bottom: 50, left: 60},
      width = 960,
      height = 500,
      animate = 500,
      xAxisRender = true,
      yAxisRender = true,
      xAxisLabelText = false,
      yAxisLabelText = false,
      color = d3.scale.category10().range(),
      getX = function(d) { return d.x }, // or d[0]
      getY = function(d) { return d.y }, // or d[1]
      getSize = function(d) { return d.size }, // or d[2]
      forceX = [],
      forceY = [],
      dispatch = d3.dispatch('tooltipShow', 'tooltipHide');

  var x = d3.scale.linear(),
      y = d3.scale.linear(),
      xAxis = nv.models.xaxis().scale(x).tickPadding(10),
      yAxis = nv.models.yaxis().scale(y).tickPadding(10),
      legend = nv.models.legend().height(30),
      scatter = nv.models.scatter();


  function chart(selection) {
    selection.each(function(data) {
      var seriesData = data.filter(function(d) { return !d.disabled })
            .map(function(d) { return d.values });

      x   .domain(d3.extent(d3.merge(seriesData).map(getX).concat(forceX) ))
          .range([0, width - margin.left - margin.right]);

      y   .domain(d3.extent(d3.merge(seriesData).map(getY).concat(forceY) ))
          .range([height - margin.top - margin.bottom, 0]);

      scatter
        .width(width - margin.left - margin.right)
        .height(height - margin.top - margin.bottom)
        .color(data.map(function(d,i) {
          return d.color || color[i % 20];
        }).filter(function(d,i) { return !data[i].disabled }))

      xAxis
        .ticks( width / 100 )
        .tickSize(-(height - margin.top - margin.bottom), 0);
      yAxis
        .ticks( height / 36 )
        .tickSize(-(width - margin.right - margin.left), 0);


      var wrap = d3.select(this).selectAll('g.wrap').data([data]);
      var gEnter = wrap.enter().append('g').attr('class', 'wrap d3lineWithLegend').append('g');

      gEnter.append('g').attr('class', 'legendWrap');
      gEnter.append('g').attr('class', 'x axis');
      gEnter.append('g').attr('class', 'y axis');
      gEnter.append('g').attr('class', 'scatterWrap');


      legend.dispatch.on('legendClick', function(d,i, that) {
        d.disabled = !d.disabled;

        //d3.select(that).classed('disabled', d.disabled); //TODO: do this from the data, not manually

        if (!data.filter(function(d) { return !d.disabled }).length) {
          data.map(function(d) {
            d.disabled = false;
            wrap.selectAll('.series').classed('disabled', false);
            return d;
          });
        }

        selection.transition(animate).call(chart)
        //d3.transition(selection).call(chart);
      });

      /*
      legend.dispatch.on('legendMouseover', function(d, i) {
        d.hover = true;
        selection.transition().call(chart)
      });

      legend.dispatch.on('legendMouseout', function(d, i) {
        d.hover = false;
        selection.transition().call(chart)
      });
      */



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

      legend.width(width/2 - margin.right);

      wrap.select('.legendWrap')
          .datum(data)
          .attr('transform', 'translate(' + (width/2 - margin.left) + ',' + (-legend.height()) +')')
          .call(legend);


      //TODO: margins should be adjusted based on what components are used: axes, axis labels, legend
      margin.top = legend.height();

      var g = wrap.select('g')
          .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');


      var scatterWrap = wrap.select('.scatterWrap')
          .datum(data.filter(function(d) { return !d.disabled }));

      //log(d3.transition()[0][0].duration); //get parent's duration

      d3.transition(scatterWrap).call(scatter);



      xAxis
        .domain(x.domain())
        .range(x.range())
        .ticks( width / 100 )
        .tickSize(-(height - margin.top - margin.bottom), 0);

      g.select('.x.axis')
          .attr('transform', 'translate(0,' + y.range()[0] + ')');

      d3.transition(g.select('.x.axis'))
          .call(xAxis);


      yAxis
        .domain(y.domain())
        .range(y.range())
        .ticks( height / 36 )
        .tickSize(-(width - margin.right - margin.left), 0);

      d3.transition(g.select('.y.axis'))
          .call(yAxis);

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

  chart.forceX = function(_) {
    if (!arguments.length) return forceX;
    forceX = _;
    scatter.forceX(_);
    return chart;
  };

  chart.forceY = function(_) {
    if (!arguments.length) return forceY;
    forceY = _;
    scatter.forceY(_);
    return chart;
  };

  chart.animate = function(_) {
    if (!arguments.length) return animate;
    animate = _;
    return chart;
  };

  chart.xAxis = xAxis;
  chart.yAxis = yAxis;

  return chart;
}

nv.models.sparkline = function() {
  var margin = {top: 3, right: 3, bottom: 3, left: 3},
      width = 200,
      height = 20,
      animate = true,
      color = d3.scale.category20().range();

  var x = d3.scale.linear(),
      y = d3.scale.linear();

  function chart(selection) {
    selection.each(function(data) {


      x   .domain(d3.extent(data, function(d) { return d.x } ))
          .range([0, width - margin.left - margin.right]);

      y   .domain(d3.extent(data, function(d) { return d.y } ))
          .range([height - margin.top - margin.bottom, 0]);


      var svg = d3.select(this).selectAll('svg').data([data]);

      var gEnter = svg.enter().append('svg').append('g');
      gEnter.append('g').attr('class', 'sparkline')
          .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
          //.style('fill', function(d, i){ return d.color || color[i * 2 % 20] })
          .style('stroke', function(d, i){ return d.color || color[i * 2 % 20] });


      svg .attr('width', width)
          .attr('height', height);


      var paths = gEnter.select('.sparkline').selectAll('path')
          .data(function(d) { return [d] });
      paths.enter().append('path');
      paths.exit().remove();
      paths
          .attr('d', d3.svg.line()
            .x(function(d) { return x(d.x) })
            .y(function(d) { return y(d.y) })
          );


      var points = gEnter.select('.sparkline').selectAll('circle.point')
          .data(function(d) { return d.filter(function(p) { return y.domain().indexOf(p.y) != -1  }) });
      points.enter().append('circle').attr('class', 'point');
      points.exit().remove();
      points
          .attr('cx', function(d) { return x(d.x) })
          .attr('cy', function(d) { return y(d.y) })
          .attr('r', 2)
          .style('stroke', function(d, i){ return d.y == y.domain()[0] ? '#d62728' : '#2ca02c' })
          .style('fill', function(d, i){ return d.y == y.domain()[0] ? '#d62728' : '#2ca02c' });
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

  chart.animate = function(_) {
    if (!arguments.length) return animate;
    animate = _;
    return chart;
  };

  return chart;
}

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
        dataCopy = d3.layout.stack().offset(offset).order(order).values(function(d){ return d.values })(dataCopy);

        x   .domain(xDomain || d3.extent(d3.merge(seriesData), getX))
            .range([0, availableWidth]);

        y   .domain(yDomain || [0, d3.max(dataCopy, function(d) { return d3.max(d.values, function(d) { return d.y0 + d.y }) }) ])
            .range([availableHeight, 0]);


        lines
          //.interactive(false)
          .width(availableWidth)
          .height(availableHeight)
          .xDomain(x.domain())
          .yDomain(y.domain())
          .y(function(d) { return d.y + d.y0 })
          .color(data.map(function(d,i) {
            return d.color || color[i % 10];
          }).filter(function(d,i) { return !data[i].disabled }));

        // Select the wrapper g, if it exists.
        var wrap = d3.select(this).selectAll('g.d3stackedarea').data([dataCopy]);

        // Create the skeletal chart on first load.
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

nv.models.stackedAreaWithLegend = function() {
  var margin = {top: 30, right: 20, bottom: 50, left: 60},
      width = 960,
      height = 500,
      dotRadius = function() { return 2.5 },
      color = d3.scale.category10().range(),
      dispatch = d3.dispatch('tooltipShow', 'tooltipHide');

  var x = d3.scale.linear(),
      y = d3.scale.linear(),
      getX = function(d) { return d.x },
      getY = function(d) { return d.y },
      xAxis = nv.models.xaxis().scale(x),
      yAxis = nv.models.yaxis().scale(y),
      legend = nv.models.legend().height(30),
      controls = nv.models.legend().height(30),
      stacked = nv.models.stackedArea();

  var controlsData = [
    { key: 'Stacked' },
    { key: 'Stream', disabled: true },
    { key: 'Expanded', disabled: true }
  ];



  function chart(selection) {
    selection.each(function(data) {
      var series = data.filter(function(d) { return !d.disabled })
            //.map(function(d) { return d.values });
            .reduce(function(prev, curr, index) {  //sum up all the y's
                curr.values.forEach(function(d,i) {
                  if (!index) prev[i] = {x: d.x, y:0};
                  prev[i].y += getY(d);
                });
                return prev;
              }, []);


      x   .domain(d3.extent(d3.merge(series), getX ))
          .range([0, width - margin.left - margin.right]);

      y   .domain(stacked.offset() == 'zero' ?
            [0, d3.max(d3.merge(series), getY )] :
            [0, 1]  // 0 - 100%
          )
          .range([height - margin.top - margin.bottom, 0]);

      stacked
        .width(width - margin.left - margin.right)
        .height(height - margin.top - margin.bottom)


      var wrap = d3.select(this).selectAll('g.wrap').data([data]);
      var gEnter = wrap.enter().append('g').attr('class', 'wrap d3stackedWithLegend').append('g');

      gEnter.append('g').attr('class', 'x axis');
      gEnter.append('g').attr('class', 'y axis');
      gEnter.append('g').attr('class', 'stackedWrap');
      gEnter.append('g').attr('class', 'legendWrap');
      gEnter.append('g').attr('class', 'controlsWrap');


      legend.dispatch.on('legendClick', function(d,i) { 
        d.disabled = !d.disabled;

        if (d.disabled)
          d.values.map(function(p) { p._y = p.y; p.y = 0; return p });
        else
          d.values.map(function(p) { p.y = p._y; return p });

        if (!data.filter(function(d) { return !d.disabled }).length) {
          data.map(function(d) {
            d.disabled = false;
            d.values.map(function(p) { p.y = p._y; return p });
            //wrap.selectAll('.series').classed('disabled', false);
            return d;
          });
        }

        selection.transition().call(chart);
      });

      controls.dispatch.on('legendClick', function(d,i) { 
        if (!d.disabled) return;

        controlsData = controlsData.map(function(s) {
          s.disabled = true;
          return s;
        });
        d.disabled = false;

        switch (d.key) {
          case 'Stacked':
            stacked.style('stack');
            break;
          case 'Stream':
            stacked.style('stream');
            break;
          case 'Expanded':
            stacked.style('expand');
            break;
        }

        selection.transition().call(chart);
      });


/*
      legend.dispatch.on('legendMouseover', function(d, i) {
        d.hover = true;
        selection.transition().call(chart)
      });

      legend.dispatch.on('legendMouseout', function(d, i) {
        d.hover = false;
        selection.transition().call(chart)
      });
     */

      stacked.dispatch.on('pointMouseover.tooltip', function(e) {
        dispatch.tooltipShow({
          point: e.point,
          series: e.series,
          pos: [e.pos[0] + margin.left, e.pos[1] + margin.top],
          seriesIndex: e.seriesIndex,
          pointIndex: e.pointIndex
        });
      });

      stacked.dispatch.on('pointMouseout.tooltip', function(e) {
        dispatch.tooltipHide(e);
      });



      //TODO: margins should be adjusted based on what components are used: axes, axis labels, legend
      margin.top = legend.height();

      var g = wrap.select('g')
          .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');


      legend.width(width/2 - margin.right);
      controls
          .width(280)
          .color(['#666', '#666', '#666']);

      g.select('.legendWrap')
          .datum(data)
          .attr('transform', 'translate(' + (width/2 - margin.left) + ',' + (-margin.top) +')')
          .call(legend);


      g.select('.controlsWrap')
          .datum(controlsData)
          .attr('transform', 'translate(0,' + (-margin.top) +')')
          .call(controls);



      var stackedWrap = g.select('.stackedWrap')
          .datum(data);
          //.datum(data.filter(function(d) { return !d.disabled }))


      d3.transition(stackedWrap).call(stacked);


      xAxis
        .domain(x.domain())
        .range(x.range())
        .ticks( width / 100 )
        .tickSize(-(height - margin.top - margin.bottom), 0);

      g.select('.x.axis')
          .attr('transform', 'translate(0,' + y.range()[0] + ')');
      d3.transition(g.select('.x.axis'))
          .call(xAxis);

      yAxis
        .domain(y.domain())
        .range(y.range())
        .ticks( stacked.offset() == 'wiggle' ? 0 : height / 36 )
        .tickSize(-(width - margin.right - margin.left), 0)
        .tickFormat(stacked.offset() == 'zero' ? d3.format(',.2f') : d3.format('%')); //TODO: stacked format should be set by caller

      d3.transition(g.select('.y.axis'))
          .call(yAxis);

    });

    return chart;
  }

  chart.dispatch = dispatch;

  chart.x = function(_) {
    if (!arguments.length) return getX;
    getX = _;
    stacked.x(_);
    return chart;
  };

  chart.y = function(_) {
    if (!arguments.length) return getY;
    getY = _;
    stacked.y(_);
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

  chart.dotRadius = function(_) {
    if (!arguments.length) return dotRadius;
    dotRadius = d3.functor(_);
    stacked.dotRadius = _;
    return chart;
  };

  chart.stacked = stacked;

  // Expose the x-axis' tickFormat method.
  //chart.xAxis = {};
  //d3.rebind(chart.xAxis, xAxis, 'tickFormat');
  chart.xAxis = xAxis;

  // Expose the y-axis' tickFormat method.
  //chart.yAxis = {};
  //d3.rebind(chart.yAxis, yAxis, 'tickFormat');
  chart.yAxis = yAxis;


  return chart;
}

// This is an attempt to make an extremely easy to use chart that is ready to go,
//    basically the chart models with the extra glue... Queuing, tooltips, automatic resize, etc.
// I may make these more specific, like 'time series line with month end data points', etc.
//    or may make yet another layer of abstraction... common settings.
nv.charts.line = function() {
  var selector = null,
      data = [],
      duration = 500,
      tooltip = function(key, x, y, e, graph) { 
        return '<h3>' + key + '</h3>' +
               '<p>' +  y + ' at ' + x + '</p>'
      };


  var graph = nv.models.lineWithLegend(),
      showTooltip = function(e) {
        var offset = $(selector).offset(),
            left = e.pos[0] + offset.left,
            top = e.pos[1] + offset.top,
            formatX = graph.xAxis.tickFormat(),
            formatY = graph.yAxis.tickFormat(),
            x = formatX(graph.x()(e.point)),
            y = formatY(graph.y()(e.point)),
            content = tooltip(e.series.key, x, y, e, graph);

        nvtooltip.show([left, top], content);
      };

  //setting component defaults
  graph.xAxis.tickFormat(d3.format(',r'));
  graph.yAxis.tickFormat(d3.format(',.2f'));


  //TODO: consider a method more similar to how the models are built
  function chart() {
    if (!selector || !data.length) return chart; //do nothing if you have nothing to work with

    d3.select(selector).select('svg')
        .datum(data)
      .transition().duration(duration).call(graph); //consider using transition chaining like in the models

    return chart;
  }


  // This should always only be called once, then update should be used after, 
  //     in which case should consider the 'd3 way' and merge this with update, 
  //     but simply do this on enter... should try anoter example that way
  chart.build = function() {
    if (!selector || !data.length) return chart; //do nothing if you have nothing to work with

    nv.addGraph({
      generate: function() {
        var container = d3.select(selector),
            width = function() { return parseInt(container.style('width')) },
            height = function() { return parseInt(container.style('height')) },
            svg = container.append('svg');

        graph
            .width(width)
            .height(height);

        svg
            .attr('width', width())
            .attr('height', height())
            .datum(data)
          .transition().duration(duration).call(graph);

        return graph;
      },
      callback: function(graph) {
        graph.dispatch.on('tooltipShow', showTooltip);
        graph.dispatch.on('tooltipHide', nvtooltip.cleanup);

        //TODO: create resize queue and have nv core handle resize instead of binding all to window resize
        $(window).resize(function() {
          // now that width and height are functions, should be automatic..of course you can always override them
          d3.select(selector + ' svg')
              .attr('width', graph.width()()) //need to set SVG dimensions, chart is not aware of the SVG component
              .attr('height', graph.height()())
              .call(graph);
        });
      }
    });

    return chart;
  };


  /*
  //  moved to chart()
  chart.update = function() {
    if (!selector || !data.length) return chart; //do nothing if you have nothing to work with

    d3.select(selector).select('svg')
        .datum(data)
      .transition().duration(duration).call(graph);

    return chart;
  };
  */

  chart.data = function(_) {
    if (!arguments.length) return data;
    data = _;
    return chart;
  };

  chart.selector = function(_) {
    if (!arguments.length) return selector;
    selector = _;
    return chart;
  };

  chart.duration = function(_) {
    if (!arguments.length) return duration;
    duration = _;
    return chart;
  };

  chart.tooltip = function(_) {
    if (!arguments.length) return tooltip;
    tooltip = _;
    return chart;
  };

  chart.xTickFormat = function(_) {
    if (!arguments.length) return graph.xAxis.tickFormat();
    graph.xAxis.tickFormat(typeof _ === 'function' ? _ : d3.format(_));
    return chart;
  };

  chart.yTickFormat = function(_) {
    if (!arguments.length) return graph.yAxis.tickFormat();
    graph.yAxis.tickFormat(typeof _ === 'function' ? _ : d3.format(_));
    return chart;
  };

  chart.xAxisLabel = function(_) {
    if (!arguments.length) return graph.xAxis.axisLabel();
    graph.xAxis.axisLabel(_);
    return chart;
  };

  chart.yAxisLabel = function(_) {
    if (!arguments.length) return graph.yAxis.axisLabel();
    graph.yAxis.axisLabel(_);
    return chart;
  };

  d3.rebind(chart, graph, 'x', 'y');

  chart.graph = graph; // Give direct access for getter/setters, and dispatchers

  return chart;
};

})();
