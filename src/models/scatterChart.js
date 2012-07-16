
nv.models.scatterChart = function() {

  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var margin       = {top: 30, right: 20, bottom: 50, left: 60}
    , width        = null
    , height       = null
    , color        = d3.scale.category20().range()
    //x            = scatter.xScale(),
    , x            = d3.fisheye.scale(d3.scale.linear).distortion(0)
    //y            = scatter.yScale(),
    , y            = d3.fisheye.scale(d3.scale.linear).distortion(0)
    , showDistX    = false
    , showDistY    = false
    , showLegend   = true
    , showControls = true
    , fisheye      = 0
    , pauseFisheye = false
    , tooltips     = true
    , tooltipX     = function(key, x, y) { return '<strong>' + x + '</strong>' }
    , tooltipY     = function(key, x, y) { return '<strong>' + y + '</strong>' }
    , tooltip      = function(key, x, y, e, graph) {
        return '<h3>' + key + '</h3>' +
               '<p>' +  y + ' at ' + x + '</p>'
      }
    , scatter      = nv.models.scatter().xScale(x).yScale(y)
    , xAxis        = nv.models.axis().orient('bottom').tickPadding(10)
    , yAxis        = nv.models.axis().orient('left').tickPadding(10)
    , legend       = nv.models.legend().height(30)
    , controls     = nv.models.legend().height(30)
    , distX        = nv.models.distribution().axis('x')
    , distY        = nv.models.distribution().axis('y')
    , dispatch     = d3.dispatch('tooltipShow', 'tooltipHide')
    ;

  //============================================================


  //============================================================
  // Private Variables
  //------------------------------------------------------------

  var x0, y0;

  var showTooltip = function(e, offsetElement) {
    //TODO: make tooltip style an option between single or dual on axes (maybe on all charts with axes?)

    //var left = e.pos[0] + ( offsetElement.offsetLeft || 0 ),
        //top = e.pos[1] + ( offsetElement.offsetTop || 0),
    var leftX = e.pos[0] + ( offsetElement.offsetLeft || 0 ),
        topX = y.range()[0] + margin.top + ( offsetElement.offsetTop || 0),
        leftY = x.range()[0] + margin.left + ( offsetElement.offsetLeft || 0 ),
        topY = e.pos[1] + ( offsetElement.offsetTop || 0),
        xVal = xAxis.tickFormat()(scatter.x()(e.point, e.pointIndex)),
        yVal = yAxis.tickFormat()(scatter.y()(e.point, e.pointIndex)),
        contentX = tooltipX(e.series.key, xVal, yVal, e, chart),
        contentY = tooltipY(e.series.key, xVal, yVal, e, chart);
        //content = tooltip(e.series.key, xVal, yVal, e, chart);

    nv.tooltip.show([leftX, topX], contentX, 'n', 1, null, 'x-nvtooltip');
    nv.tooltip.show([leftY, topY], contentY, 'e', 1, null, 'y-nvtooltip');
    //nv.tooltip.show([left, top], content, e.value < 0 ? 'n' : 's');
  };

  var controlsData = [
    { key: 'Magnify', disabled: true }
  ];

  //============================================================


  function chart(selection) {
    selection.each(function(data) {
      var container = d3.select(this),
          that = this;

      var availableWidth = (width  || parseInt(container.style('width')) || 960)
                             - margin.left - margin.right,
          availableHeight = (height || parseInt(container.style('height')) || 400)
                             - margin.top - margin.bottom;


      //------------------------------------------------------------
      // Setup Scales

      x = scatter.xScale();
      y = scatter.yScale();

      x0 = x0 || x;
      y0 = y0 || y;

      //------------------------------------------------------------


      //------------------------------------------------------------
      // Setup containers and skeleton of chart

      var wrap = container.selectAll('g.wrap.scatterChart').data([data]);
      var wrapEnter = wrap.enter().append('g').attr('class', 'wrap nvd3 scatterChart chart-' + scatter.id());
      var gEnter = wrapEnter.append('g');
      var g = wrap.select('g')

      // background for pointer events
      gEnter.append('rect').attr('class', 'nvd3 background')

      gEnter.append('g').attr('class', 'x axis');
      gEnter.append('g').attr('class', 'y axis');
      gEnter.append('g').attr('class', 'scatterWrap');
      gEnter.append('g').attr('class', 'distWrap');
      gEnter.append('g').attr('class', 'legendWrap');
      gEnter.append('g').attr('class', 'controlsWrap');

      wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      //------------------------------------------------------------


      if (showLegend) {
        legend.width( availableWidth / 2 );

        wrap.select('.legendWrap')
            .datum(data)
            .call(legend);

        if ( margin.top != legend.height()) {
          margin.top = legend.height();
          availableHeight = (height || parseInt(container.style('height')) || 400)
                             - margin.top - margin.bottom;
        }

        wrap.select('.legendWrap')
            .attr('transform', 'translate(' + (availableWidth / 2) + ',' + (-margin.top) +')');
      }


      if (showControls) {
        controls.width(180).color(['#444']);
        g.select('.controlsWrap')
            .datum(controlsData)
            .attr('transform', 'translate(0,' + (-margin.top) +')')
            .call(controls);
      }


      g.select('.background')
          .attr('width', availableWidth)
          .attr('height', availableHeight);


      scatter
          .width(availableWidth)
          .height(availableHeight)
          .color(data.map(function(d,i) {
            return d.color || color[i % color.length];
          }).filter(function(d,i) { return !data[i].disabled }))

      wrap.select('.scatterWrap')
          .datum(data.filter(function(d) { return !d.disabled }))
          .call(scatter);


      xAxis
          .scale(x)
          .ticks( availableWidth / 100 )
          .tickSize( -availableHeight , 0);

      g.select('.x.axis')
          .attr('transform', 'translate(0,' + y.range()[0] + ')')
          .call(xAxis);


      yAxis
          .scale(y)
          .ticks( availableHeight / 36 )
          .tickSize( -availableWidth, 0);

      g.select('.y.axis')
          .call(yAxis);


      distX
          .scale(x)
          .width(availableWidth)
          .color(data.map(function(d,i) {
            return d.color || color[i % color.length];
          }).filter(function(d,i) { return !data[i].disabled }));
      gEnter.select('.distWrap').append('g')
          .attr('class', 'distributionX')
          .attr('transform', 'translate(0,' + y.range()[0] + ')');
      g.select('.distributionX')
          .datum(data.filter(function(d) { return !d.disabled }))
          .call(distX);


      distY
          .scale(y)
          .width(availableHeight)
          .color(data.map(function(d,i) {
            return d.color || color[i % color.length];
          }).filter(function(d,i) { return !data[i].disabled }));
      gEnter.select('.distWrap').append('g')
          .attr('class', 'distributionY')
          .attr('transform', 'translate(-' + distY.size() + ',0)');
      g.select('.distributionY')
          .datum(data.filter(function(d) { return !d.disabled }))
          .call(distY);


      g.select('.background').on('mousemove', updateFisheye);
      g.select('.background').on('click', function() { pauseFisheye = !pauseFisheye;});
      scatter.dispatch.on('elementClick.freezeFisheye', function() {
        pauseFisheye = !pauseFisheye;
      });


      function updateFisheye() {
        if (pauseFisheye) {
          g.select('.point-paths').style('pointer-events', 'all');
          return false;
        }

        g.select('.point-paths').style('pointer-events', 'none' );

        var mouse = d3.mouse(this);
        x.distortion(fisheye).focus(mouse[0]);
        y.distortion(fisheye).focus(mouse[1]);

        g.select('.scatterWrap')
            .datum(data.filter(function(d) { return !d.disabled }))
            .call(scatter);
        g.select('.x.axis').call(xAxis);
        g.select('.y.axis').call(yAxis);
        g.select('.distributionX')
            .datum(data.filter(function(d) { return !d.disabled }))
            .call(distX);
        g.select('.distributionY')
            .datum(data.filter(function(d) { return !d.disabled }))
            .call(distY);
      }



      //============================================================
      // Event Handling/Dispatching (in chart's scope)
      //------------------------------------------------------------

      controls.dispatch.on('legendClick', function(d,i) {
        d.disabled = !d.disabled;

        fisheye = d.disabled ? 0 : 2.5;
        g.select('.background') .style('pointer-events', d.disabled ? 'none' : 'all');
        g.select('.point-paths').style('pointer-events', d.disabled ? 'all' : 'none' );

        if (d.disabled) {
          x.distortion(fisheye).focus(0);
          y.distortion(fisheye).focus(0);

          g.select('.scatterWrap').call(scatter);
          g.select('.x.axis').call(xAxis);
          g.select('.y.axis').call(yAxis);
        } else {
          pauseFisheye = false;
        }

        chart(selection);
      });

      legend.dispatch.on('legendClick', function(d,i, that) {
        d.disabled = !d.disabled;

        if (!data.filter(function(d) { return !d.disabled }).length) {
          data.map(function(d) {
            d.disabled = false;
            wrap.selectAll('.series').classed('disabled', false);
            return d;
          });
        }

        chart(selection);
      });

      /*
      legend.dispatch.on('legendMouseover', function(d, i) {
        d.hover = true;
        chart(selection);
      });

      legend.dispatch.on('legendMouseout', function(d, i) {
        d.hover = false;
        chart(selection);
      });
      */

      scatter.dispatch.on('elementMouseover.tooltip', function(e) {
        d3.select('.chart-' + scatter.id() + ' .series-' + e.seriesIndex + ' .distx-' + e.pointIndex)
            .attr('y1', e.pos[1] - availableHeight);
        d3.select('.chart-' + scatter.id() + ' .series-' + e.seriesIndex + ' .disty-' + e.pointIndex)
            .attr('x2', e.pos[0] + distX.size());

        e.pos = [e.pos[0] + margin.left, e.pos[1] + margin.top];
        dispatch.tooltipShow(e);
      });

      dispatch.on('tooltipShow', function(e) {
        if (tooltips) showTooltip(e, that.parentNode);
      });


      //store old scales for use in transitions on update
      x0 = x.copy();
      y0 = y.copy();


      chart.update = function() { chart(selection) };
      chart.container = this;

    });

    return chart;
  }


  //============================================================
  // Event Handling/Dispatching (out of chart's scope)
  //------------------------------------------------------------

  scatter.dispatch.on('elementMouseout.tooltip', function(e) {
    dispatch.tooltipHide(e);

    d3.select('.chart-' + scatter.id() + ' .series-' + e.seriesIndex + ' .distx-' + e.pointIndex)
        .attr('y1', 0);
    d3.select('.chart-' + scatter.id() + ' .series-' + e.seriesIndex + ' .disty-' + e.pointIndex)
        .attr('x2', distY.size());
  });
  dispatch.on('tooltipHide', function() {
    if (tooltips) nv.tooltip.cleanup();
  });


  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  chart.dispatch = dispatch;
  chart.legend = legend;
  chart.controls = legend;
  chart.xAxis = xAxis;
  chart.yAxis = yAxis;
  chart.distX = distX;
  chart.distY = distY;

  d3.rebind(chart, scatter, 'id', 'interactive', 'pointActive', 'shape', 'size', 'xScale', 'yScale', 'zScale', 'xDomain', 'yDomain', 'sizeDomain', 'forceX', 'forceY', 'forceSize', 'clipVoronoi', 'clipRadius');

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
    legend.color(_);
    distX.color(_);
    distY.color(_);
    return chart;
  };

  chart.showDistX = function(_) {
    if (!arguments.length) return showDistX;
    showDistX = _;
    return chart;
  };

  chart.showDistY = function(_) {
    if (!arguments.length) return showDistY;
    showDistY = _;
    return chart;
  };

  chart.showControls = function(_) {
    if (!arguments.length) return showControls;
    showControls = _;
    return chart;
  };

  chart.showLegend = function(_) {
    if (!arguments.length) return showLegend;
    showLegend = _;
    return chart;
  };

  chart.fisheye = function(_) {
    if (!arguments.length) return fisheye;
    fisheye = _;
    return chart;
  };

  chart.tooltips = function(_) {
    if (!arguments.length) return tooltips;
    tooltips = _;
    return chart;
  };

  chart.tooltipContent = function(_) {
    if (!arguments.length) return tooltip;
    tooltip = _;
    return chart;
  };

  chart.tooltipXContent = function(_) {
    if (!arguments.length) return tooltipX;
    tooltipX = _;
    return chart;
  };

  chart.tooltipYContent = function(_) {
    if (!arguments.length) return tooltipY;
    tooltipY = _;
    return chart;
  };

  //============================================================


  return chart;
}
