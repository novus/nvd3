
nv.models.stackedArea = function() {
  "use strict";
  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var canvas = new Canvas({
          margin: {top: 0, right: 0, bottom: 0, left: 0}
          , chartClass: 'stackedarea'
          , wrapClass: 'areaWrap'
      })
    , color = nv.utils.defaultColor() // a function that computes the color
    , id = Math.floor(Math.random() * 100000) //Create semi-unique ID incase user doesn't selet one
    , getX = function(d) { return d.x } // accessor to get the x value from a data point
    , getY = function(d) { return d.y } // accessor to get the y value from a data point
    , style = 'stack'
    , offset = 'zero'
    , order = 'default'
    , interpolate = 'linear'  // controls the line interpolation
    , clipEdge = false // if true, masks lines within x and y scale
    , x //can be accessed via chart.xScale()
    , y //can be accessed via chart.yScale()
    , scatter = nv.models.scatter()
    , duration = 250
    , dispatch =  d3.dispatch('tooltipShow', 'tooltipHide', 'areaClick', 'areaMouseover', 'areaMouseout', 'renderEnd')
    ;

  scatter
    .size(2.2) // default size
    .sizeDomain([2.2,2.2]) // all the same size by default
    ;

  var renderWatch = nv.utils.renderWatch(dispatch, duration);

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

  //============================================================

  function chart(selection) {

    renderWatch.reset();
    renderWatch.models(scatter);

    selection.each(function(data) {

      canvas.setRoot(this);

      var availableWidth = canvas.available.width,
          availableHeight = canvas.available.height;

      //------------------------------------------------------------
      // Setup Scales

      x = scatter.xScale();
      y = scatter.yScale();

      //------------------------------------------------------------

      var dataRaw = data;
      // Injecting point index into each point because d3.layout.stack().out does not give index
      data.forEach(function(aseries, i) {
        aseries.seriesIndex = i;
        aseries.values = aseries.values.map(function(d, j) {
          d.index = j;
          d.seriesIndex = i;
          return d;
        });
      });

      var dataFiltered = data.filter(function(series) {
            return !series.disabled;
      });

      data = d3.layout.stack()
               .order(order)
               .offset(offset)
               .values(function(d) { return d.values })  //TODO: make values customizeable in EVERY model in this fashion
               .x(getX)
               .y(getY)
               .out(function(d, y0, y) {
                    var yHeight = (getY(d) === 0) ? 0 : y;
                    d.display = {
                      y: yHeight,
                     y0: y0
                    };
                })
              (dataFiltered);


      //------------------------------------------------------------
      // Setup containers and skeleton of chart

      canvas.wrapChart(data);
      canvas.gEnter.append('g').attr('class', 'nv-scatterWrap');

      //------------------------------------------------------------

      scatter
        .width(availableWidth)
        .height(availableHeight)
        .x(getX)
        .y(function(d) { return d.display.y + d.display.y0 })
        .forceY([0])
        .color(data.map(function(d) {
          return d.color || color(d, d.seriesIndex);
        }));

      var scatterWrap = canvas.g.select('.nv-scatterWrap')
        .datum(data);

      scatterWrap.call(scatter);

      canvas.defsEnter.append('clipPath')
        .attr('id', 'nv-edge-clip-' + id)
        .append('rect');

      canvas.wrap.select('#nv-edge-clip-' + id + ' rect')
        .attr('width', availableWidth)
        .attr('height', availableHeight);

      canvas.g.attr('clip-path', clipEdge ? 'url(#nv-edge-clip-' + id + ')' : '');

      var area = d3.svg.area()
        .x(function(d)  { return x(getX(d)) })
        .y0(function(d) { return y(d.display.y0) })
        .y1(function(d) { return y(d.display.y + d.display.y0) })
        .interpolate(interpolate);

      var zeroArea = d3.svg.area()
          .x(function(d)  { return x(getX(d)) })
          .y0(function(d) { return y(d.display.y0) })
          .y1(function(d) { return y(d.display.y0) });

      var path = canvas.g.select('.nv-areaWrap').selectAll('path.nv-area')
          .data(function(d) { return d });

      var _mouseEventObject = function(d){
        return {
          point : d,
          series: d.key,
          pos   : [d3.event.pageX, d3.event.pageY],
          seriesIndex: d.seriesIndex
        }
      };
      path.enter().append('path')
          .attr('class', function(d,i) { return 'nv-area nv-area-' + i })
          .attr('d', function(d){ return zeroArea(d.values, d.seriesIndex) })
          .on('mouseover', function(d) {
            d3.select(this).classed('hover', true);
            dispatch.areaMouseover( _mouseEventObject(d) );
          })
          .on('mouseout', function(d) {
            d3.select(this).classed('hover', false);
            dispatch.areaMouseout( _mouseEventObject(d) );
          })
          .on('click', function(d) {
            d3.select(this).classed('hover', false);
            dispatch.areaClick( _mouseEventObject(d) );
          });

      path.exit().remove();

      path.style('fill', function(d){ return d.color || color(d, d.seriesIndex) })
          .style('stroke', function(d){ return d.color || color(d, d.seriesIndex) });
      path.watchTransition(renderWatch,'stackedArea path')
          .attr('d', function(d,i) { return area(d.values,i) });

      //============================================================
      // Event Handling/Dispatching (in chart's scope)
      //------------------------------------------------------------

      var _mouseEventSelector = function(e){
          return '.nv-chart-' + id + ' .nv-area-' + e.seriesIndex
      };
      scatter.dispatch
        .on('elementMouseover.area', function(e) {
          canvas.g.select( _mouseEventSelector(e) )
            .classed('hover', true);
        })
        .on('elementMouseout.area', function(e) {
          canvas.g.select( _mouseEventSelector(e) )
            .classed('hover', false);
        });

      //============================================================
      //Special offset functions
      chart.d3_stackedOffset_stackPercent = function(stackData) {
          var n = stackData.length,    //How many series
          m = stackData[0].length,     //how many points per series
          k = 1 / n,
          y0 = [],
          i, j, o;

          for (j = 0; j < m; ++j) { //Looping through all points
            for (i = 0, o = 0; i < dataRaw.length; i++)  //looping through series'
                o += getY(dataRaw[i].values[j])   //total value of all points at a certian point in time.

            if (o) for (i = 0; i < n; i++)
               stackData[i][j][1] /= o;
            else
              for (i = 0; i < n; i++)
               stackData[i][j][1] = k;
          }
          for (j = 0; j < m; ++j) y0[j] = 0;
          return y0;
      };

    });

    renderWatch.renderEnd('stackedArea immediate');
    return chart;
  }

  //============================================================
  // Event Handling/Dispatching (out of chart's scope)
  //------------------------------------------------------------

  scatter.dispatch
    .on('elementClick.area', function(e) {
        dispatch.areaClick(e);
    })
    .on('elementMouseover.tooltip', function(e) {
      e.pos = [e.pos[0] + canvas.margin.left, e.pos[1] + canvas.margin.top];
      dispatch.tooltipShow(e);
    })
    .on('elementMouseout.tooltip', function(e) {
      dispatch.tooltipHide(e);
    });

  //============================================================

  //============================================================
  // Global getters and setters
  //------------------------------------------------------------

  chart.dispatch = dispatch;
  chart.scatter = scatter;

  d3.rebind(chart, scatter, 'interactive', 'size', 'xScale', 'yScale', 'zScale', 'xDomain', 'yDomain', 'xRange', 'yRange',
    'sizeDomain', 'forceX', 'forceY', 'forceSize', 'clipVoronoi', 'useVoronoi','clipRadius','highlightPoint','clearHighlights');

  chart.options = nv.utils.optionsFunc.bind(chart);

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

  chart.margin = function(_) {
    if (!arguments.length) return canvas.margin;
      canvas.margin.top    = nv.utils.valueOrDefault(_.top, canvas.margin.top);
      canvas.margin.right  = nv.utils.valueOrDefault(_.right, canvas.margin.right);
      canvas.margin.bottom = nv.utils.valueOrDefault(_.bottom, canvas.margin.bottom);
      canvas.margin.left   = nv.utils.valueOrDefault(_.left, canvas.margin.left);
    return chart;
  };

  chart.width = function(_) {
    if (!arguments.length) return canvas.options.size.width;
    canvas.options.size.width = _;
    return chart;
  };

  chart.height = function(_) {
    if (!arguments.length) return canvas.options.size.height;
    canvas.options.size.height = _;
    return chart;
  };

  chart.clipEdge = function(_) {
    if (!arguments.length) return clipEdge;
    clipEdge = _;
    return chart;
  };

  chart.color = function(_) {
    if (!arguments.length) return color;
    color = nv.utils.getColor(_);
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
        chart.offset('zero');
        chart.order('default');
        break;
      case 'stream':
        chart.offset('wiggle');
        chart.order('inside-out');
        break;
      case 'stream-center':
          chart.offset('silhouette');
          chart.order('inside-out');
          break;
      case 'expand':
        chart.offset('expand');
        chart.order('default');
        break;
      case 'stack_percent':
        chart.offset(chart.d3_stackedOffset_stackPercent);
        chart.order('default');
        break;
    }

    return chart;
  };

  chart.interpolate = function(_) {
    if (!arguments.length) return interpolate;
    interpolate = _;
    return chart;
  };

  chart.duration = function(_) {
    if (!arguments.length) return duration;
    duration = _;
    renderWatch.reset(duration);
    scatter.duration(duration);
    return chart;
  };

  return chart;
};
