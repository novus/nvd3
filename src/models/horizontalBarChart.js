
nv.models.horizontalBarChart = function(){
  "use strict";

  /* public variables */

  // Chart Components ( Take care of drawing order )
  var horizontalBar = nv.models.horizontalBar(),
    xAxis = nv.models.axis(),
    yAxis = nv.models.axis(),
    legend = nv.models.legend().height(30)
    ;

  var margin = {top: 15, right: 20, bottom: 50, left: 60},
    width = null,
    height = null,
    color = nv.utils.getColor(),
    showXAxis = true,
    showYAxis = true,
    showLegend = true,
    rightAlignYAxis = false,
    tooltips = true,
    tooltip = function(point, x, y, e, graph){
      return '<h3>' + y + '</h3>' +
          '<p>' + x + '</p>';
    },
    x,
    y,
    noData = "No Data Available",
    dispatch = d3.dispatch('tooltipShow', 'tooltipHide', 'beforeUpdate'),
    transitionDuration = 250,
    state = {},
    changed = true
    ;

  xAxis
    .orient('bottom')
    .tickFormat(d3.format(',.f'))
    ;
  yAxis
    .orient((rightAlignYAxis) ? 'right' : 'left')
    .highlightZero(false)
    .showMaxMin(false)
    .tickFormat(function(d) { return d })
    ;

  /* private variables */
  var showTooltip = function(e, offsetElement) {
    var left = e.pos[0] + margin.left,
        top = e.pos[1] + margin.top,
        x = xAxis.tickFormat()(horizontalBar.x()(e.point, e.pointIndex)),
        y = yAxis.tickFormat()(horizontalBar.y()(e.point, e.pointIndex)),
        content = tooltip(e.point, x, y, e, chart);
    nv.tooltip.show([left , top], content, 'none', null, offsetElement);
  };
  /* ----------------  */

  function chart(selection) {
    selection.each(function(data) {
      var container = d3.select(this),
        that = this;

      var availableWidth = (width  || parseInt(container.style('width')) || 960)- margin.left - margin.right,
          availableHeight = (height || parseInt(container.style('height')) || 400)- margin.top - margin.bottom;

      chart.update = function() {
        dispatch.beforeUpdate();
        container.transition().duration(transitionDuration).call(chart);
      };

      // set state
      if( !state.disabled || !state.disabled.length) {
        state.disabled = data[0].values.map(function(d) { 
          return !!d.disabled;
        });
      }

      // set disabled 
      for (var index = 0; index < data[0].values.length; index++) {
        data[0].values[index].disabled = state.disabled[index];
      }

      chart.container = this;

      /* no data exists */
      var enoughLength = data.filter(function(d) { 
        return d.values.length 
      }).length;

      if( !data || !data.length || !enoughLength ) {
        var noDataText = container.selectAll('.nv-noData').data([noData]);

        noDataText.enter().append('text')
          .attr('class', 'nvd3 nv-noData')
          .attr('dy', '-.7em')
          .style('text-anchor', 'middle');

        noDataText
          .attr('x', margin.left + availableWidth / 2)
          .attr('y', margin.top + availableHeight / 2)
          .text(function(d) { return d });

        return chart;
      } else {
        container.selectAll('.nv-noData').remove();
      }

      // setup scales
      x = horizontalBar.xScale().clamp(true);
      y= horizontalBar.yScale();

      //Setup containers and skeleton of chart
      var wrap = container.selectAll('g.nv-wrap.nv-horizontalBarWithAxes').data([data]);
      var gEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap nv-horizontalBarWithAxes').append('g');
      var defsEnter = gEnter.append('defs');
      var g = wrap.select('g');
      
      gEnter.append('g').attr('class', 'nv-x nv-axis');
      gEnter.append('g').attr('class', 'nv-y nv-axis')
        .append('g').attr('class', 'nv-zeroLine')
        .append('line');

      gEnter.append('g').attr('class', 'nv-barsWrap');
      gEnter.append('g').attr('class', 'nv-legendWrap');

      g.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      if (rightAlignYAxis) {
        g.select(".nv-y.nv-axis")
          .attr("transform", "translate(" + availableWidth + ",0)");
      }

      /* Drawing each components */

      // Legend
      if(showLegend) {
        legend.width(availableWidth)
          .key(function(d) {
            return d.label;
          });

        // styling legend ....

        // calling legend
        g.select('.nv-legendWrap')
         .datum(data[0].values)
         .call(legend);

        if( margin.top != legend.height()) {
          margin.top = legend.height();
          availableHeight = (height || parseInt(container.style('height')) || 400) - margin.top - margin.bottom;

        }

        g.select('.nv-legendWrap')
         .attr('transform', 'translate(0 ,' + (-margin.top) + ')');
      }

      wrap.attr('transform', 'translate(0 ,' + margin.top + ')');
      // Main Chart Components
      horizontalBar
        .width(availableWidth)
        .height(availableHeight)
        .color(data[0].values
        .map(function(d,i) {
              return d.color || color(d, i);
          })  
          .filter(function(d,i) { 
            return !data[0].values[i].disabled 
          })
        );


      /* disabled data */
      var barData = {} ;
      barData.key = data[0].key; 
      barData.values = data[0].values.filter(function(d) {
        return !d.disabled;
      });

      var barsWrap = g.select('.nv-barsWrap')
        .datum([barData]);

      barsWrap.transition().call(horizontalBar);

      /* ----------------- */

      defsEnter.append('clipPath')
        .attr('id', 'nv-x-label-clip-' + horizontalBar.id())
        .append('rect')
        ;
      // g.select('#nv-x-label-clip-' + horizontalBar.id() + ' rect')
      // .attr('width')
      // .attr('height')
      // .attr('x');

      // setup axis

      if(showXAxis) {
        xAxis
         .scale(x)
         .ticks( availableWidth / 100 )
         .tickSize(-availableHeight, 0)
         ;

        g.select('.nv-x.nv-axis')
         .attr('transform', 'translate(0,' + availableHeight + ')');

        g.select('.nv-x.nv-axis')
         .transition()
         .call(xAxis);

        var xTicks = g.select('.nv-x.nv-axis').selectAll('g');

        // customize xTicks following ...
      }

      if(showYAxis) {
        yAxis
          .scale(y)
          .ticks( availableHeight / 36 )
          .tickSize( -availableWidth, 0);

         g.select('.nv-y.nv-axis')
          .transition()
          .call(yAxis);

        var yTicks = g.select('.nv-y.nv-axis').selectAll('g');

        // customize yTicks following ...
      }

      // solution : dymnamically calc the margins of left & right
      setTimeout(function() {
        if(changed){
          var lastText = (horizontalBar.showValues()) 
                ? g.select('.nv-barsWrap').selectAll('text') 
                : g.select('.nv-x.nv-axis').selectAll('g').selectAll('text'),
              right = lastText[lastText.length-1][0].getComputedTextLength();
          
          margin.right = (margin.right < right + 30) ? right+30 : margin.right;

          var leftLabels = g.select('.nv-y.nv-axis').selectAll('g').select('text')[0],
            maxLeftLength = 0;

          for (var i = 0; i < leftLabels.length; i++) {
            var current = 0;
            if( !leftLabels[i] ) {
              continue;
            }
            
            current = leftLabels[i].getComputedTextLength();

            if(maxLeftLength < current)
              maxLeftLength = current; 
          }

          margin.left = (maxLeftLength > 45) ? maxLeftLength + 15 : margin.left;

          changed = false;
          chart.update();
        }
      },300);

      /* Event Handling / Dispatching */
      legend.dispatch.on('stateChange', function(newState) {
        // update chart using state instead of new dataset
        changed = true;
        state = newState;
        chart.update();
      });

      dispatch.on('tooltipShow', function(e) {
        if (tooltips) {
          showTooltip(e, that.parentNode);
        }
      });

    });

    return chart;
  }

  /* Event Handling / Dispatching ( out of chart scope ) */
  horizontalBar.dispatch.on('elementMouseover.tooltip', function(e) {
  
    e.pos = [e.pos[0] +  margin.left, e.pos[1] + margin.top];
    dispatch.tooltipShow(e);
  
  });

  horizontalBar.dispatch.on('elementMouseout.tooltip', function(e) {
  
    dispatch.tooltipHide(e);
  
  });

  dispatch.on('tooltipHide', function() {
    if (tooltips) {
      nv.tooltip.cleanup();
    }

  });

  /* Expose chart's sub-components  */
  chart.dispatch = dispatch;
  chart.horizontalBar = horizontalBar;
  chart.xAxis = xAxis;
  chart.yAxis = yAxis;
  chart.legend = legend;

  d3.rebind(chart, horizontalBar, 'x', 'y', 'xDomain', 'yDomain', 'xRange', 'yRange', 'forceX', 'forceY', 'id', 'showValues', 'valueFormat');

  chart.options = nv.utils.optionsFunc.bind(chart);
  
  chart.margin = function(_) {
    if (!arguments.length) 
      return margin;
    margin.top    = typeof _.top    != 'undefined' ? _.top    : margin.top;
    margin.right  = typeof _.right  != 'undefined' ? _.right  : margin.right;
    margin.bottom = typeof _.bottom != 'undefined' ? _.bottom : margin.bottom;
    margin.left   = typeof _.left   != 'undefined' ? _.left   : margin.left;
    return chart;
  };

  chart.width = function(_) {
    if (!arguments.length) 
      return width;
    width = _;
    return chart;
  };

  chart.height = function(_) {
    if (!arguments.length) 
      return height;
    height = _;
    return chart;
  };

  chart.color = function(_) {
    if (!arguments.length) 
      return color;
    color = nv.utils.getColor(_);
    legend.color(color);
    horizontalBar.color(color);
    return chart;
  };

  chart.showXAxis = function(_) {
    if (!arguments.length) 
      return showXAxis;
    showXAxis = _;
    return chart;
  };

  chart.showYAxis = function(_) {
    if (!arguments.length) 
      return showYAxis;
    showYAxis = _;
    return chart;
  };

  chart.showLegend = function(_) {
    if (!arguments.length) {
      return showLegend;  
    }
    showLegend = _;
    return chart;
  };

  chart.rightAlignYAxis = function(_) {
    if(!arguments.length) 
      return rightAlignYAxis;
    rightAlignYAxis = _;
    yAxis.orient( (_) ? 'right' : 'left');
    return chart;
  };

  chart.tooltips = function(_) {
    if (!arguments.length) 
      return tooltips;
    tooltips = _;
    return chart;
  };

  chart.tooltipContent = function(_) {
    if (!arguments.length) 
      return tooltip;
    tooltip = _;
    return chart;
  };

    chart.noData = function(_) {
      if (!arguments.length) 
        return noData;
    noData = _;
    return chart;
  };

  chart.transitionDuration = function(_) {
      if (!arguments.length) 
        return transitionDuration;
      transitionDuration = _;
      return chart;
  };

  chart.xAxis = function(_) {
      if (!arguments.length) 
        return xAxis;
      xAxis = _;
      return chart;
  };

  chart.yAxis = function(_) {
      if (!arguments.length) 
        return yAxis;
      yAxis = _;
      return chart;
  };


  return chart;
}