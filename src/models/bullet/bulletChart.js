
// Chart design based on the recommendations of Stephen Few. Implementation
// based on the work of Clint Ivy, Jamie Love, and Jason Davies.
// http://projects.instantcognition.com/protovis/bulletchart/
nv.models.bulletChart = function() {
  "use strict";
  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var bullet = nv.models.bullet();

  var canvas = new Canvas({
          margin: {top: 5, right: 40, bottom: 20, left: 120},
          chartClass: 'bulletChart'
      })
    , orient = 'left' // TODO top & bottom
    , reverse = false
    , ranges = function(d) { return d.ranges }
    , markers = function(d) { return d.markers }
    , measures = function(d) { return d.measures }
    , tickFormat = null
    , tooltips = true
    , tooltip = function(key, x, y) {
        return '<h3>' + x + '</h3>' +
               '<p>' + y + '</p>'
      }
    , dispatch = d3.dispatch('tooltipShow', 'tooltipHide')
    ;

  //============================================================


  //============================================================
  // Private Variables
  //------------------------------------------------------------

  var showTooltip = function(e, offsetElement) {
    var left = e.pos[0] + ( offsetElement.offsetLeft || 0 ) + margin.left,
        top = e.pos[1] + ( offsetElement.offsetTop || 0) + margin.top,
        content = tooltip(e.key, e.label, e.value);

    nv.tooltip.show([left, top], content, e.value < 0 ? 'e' : 'w', null, offsetElement);
  };

  //============================================================


  function chart(selection) {
    selection.each(function(data, i) {
        
      canvas.setRoot(this);

      var availableWidth = canvas.available.width,
          availableHeight = canvas.available.height,
          that = this;

      //------------------------------------------------------------
      // Display No Data message if there's nothing to show.
      // TODO: To use common noData() function from canvas
      if (!data || !ranges.call(this, data, i)) {
          var noDataText = canvas.svg.selectAll('.nv-noData').data([canvas.options.noData]);
          noDataText.enter().append('text')
              .attr('class', 'nvd3 nv-noData')
              .attr('dy', '-.7em')
              .style('text-anchor', 'middle');
          noDataText
              .attr('x', canvas.margin.left + availableWidth / 2)
              .attr('y', 18 + canvas.margin.top + availableHeight / 2)
              .text(function(d) { return d });
          return chart;
      } else
          canvas.svg.selectAll('.nv-noData').remove();

      //------------------------------------------------------------

      chart.update = function() { chart(selection) };

      var rangez = ranges.call(this, data, i).slice().sort(d3.descending),
          markerz = markers.call(this, data, i).slice().sort(d3.descending),
          measurez = measures.call(this, data, i).slice().sort(d3.descending);

      //------------------------------------------------------------
      // Setup containers and skeleton of chart

      canvas.wrapChart(data);
      canvas.gEnter.append('g').attr('class', 'nv-bulletWrap');
      canvas.gEnter.append('g').attr('class', 'nv-titles');

      //------------------------------------------------------------

      // Compute the new x-scale.
      var x1 = d3.scale.linear()
          .domain([0, Math.max(rangez[0], markerz[0], measurez[0])])  // TODO: need to allow forceX and forceY, and xDomain, yDomain
          .range(reverse ? [availableWidth, 0] : [0, availableWidth]);

      // Retrieve the old x-scale, if this is an update.
      var x0 = this.__chart__ || d3.scale.linear()
          .domain([0, Infinity])
          .range(x1.range());

      // Stash the new scale.
      this.__chart__ = x1;

      var w0 = function(d) { return Math.abs(x0(d) - x0(0)) }, // TODO: could optimize by precalculating x0(0) and x1(0)
          w1 = function(d) { return Math.abs(x1(d) - x1(0)) };

      var title = canvas.gEnter.select('.nv-titles').append('g')
          .attr('text-anchor', 'end')
          .attr('transform', 'translate(-6,' + (height - margin.top - margin.bottom) / 2 + ')');
      title.append('text')
          .attr('class', 'nv-title')
          .text(function(d) { return d.title; });

      title.append('text')
          .attr('class', 'nv-subtitle')
          .attr('dy', '1em')
          .text(function(d) { return d.subtitle; });

      bullet.width(availableWidth)
        .height(availableHeight);

      var bulletWrap = canvas.g.select('.nv-bulletWrap');

      d3.transition(bulletWrap).call(bullet);

      // Compute the tick format.
      var format = tickFormat || x1.tickFormat( availableWidth / 100 );

      // Update the tick groups.
      var tick = canvas.g.selectAll('g.nv-tick')
          .data(x1.ticks( availableWidth / 50 ), function(d) {
            return this.textContent || format(d);
          });

      // Initialize the ticks with the old scale, x0.
      var tickEnter = tick.enter().append('g')
          .attr('class', 'nv-tick')
          .attr('transform', function(d) { return 'translate(' + x0(d) + ',0)' })
          .style('opacity', 1e-6);

      tickEnter.append('line')
          .attr('y1', availableHeight)
          .attr('y2', availableHeight * 7 / 6);

      tickEnter.append('text')
          .attr('text-anchor', 'middle')
          .attr('dy', '1em')
          .attr('y', availableHeight * 7 / 6)
          .text(format);

      // Transition the updating ticks to the new scale, x1.
      var tickUpdate = d3.transition(tick)
          .attr('transform', function(d) { return 'translate(' + x1(d) + ',0)' })
          .style('opacity', 1);

      tickUpdate.select('line')
          .attr('y1', availableHeight)
          .attr('y2', availableHeight * 7 / 6);

      tickUpdate.select('text')
          .attr('y', availableHeight * 7 / 6);

      // Transition the exiting ticks to the new scale, x1.
      d3.transition(tick.exit())
          .attr('transform', function(d) { return 'translate(' + x1(d) + ',0)' })
          .style('opacity', 1e-6)
          .remove();

      //============================================================
      // Event Handling/Dispatching (in chart's scope)
      //------------------------------------------------------------

      dispatch.on('tooltipShow', function(e) {
        e.key = data.title;
        if (tooltips) showTooltip(e, that.parentNode);
      });

      //============================================================
    });

    d3.timer.flush();

    return chart;
  }


  //============================================================
  // Event Handling/Dispatching (out of chart's scope)
  //------------------------------------------------------------

  bullet.dispatch.on('elementMouseover.tooltip', function(e) {
    dispatch.tooltipShow(e);
  });

  bullet.dispatch.on('elementMouseout.tooltip', function(e) {
    dispatch.tooltipHide(e);
  });

  dispatch.on('tooltipHide', function() {
    if (tooltips) nv.tooltip.cleanup();
  });

  //============================================================


  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  chart.dispatch = dispatch;
  chart.bullet = bullet;

  d3.rebind(chart, bullet, 'color');

  chart.options = nv.utils.optionsFunc.bind(chart);

  // left, right, top, bottom
  chart.orient = function(_) {
    if (!arguments.length) return orient;
    orient = _;
    reverse = orient == 'right' || orient == 'bottom';
    return chart;
  };

  // ranges (bad, satisfactory, good)
  chart.ranges = function(_) {
    if (!arguments.length) return ranges;
    ranges = _;
    return chart;
  };

  // markers (previous, goal)
  chart.markers = function(_) {
    if (!arguments.length) return markers;
    markers = _;
    return chart;
  };

  // measures (actual, forecast)
  chart.measures = function(_) {
    if (!arguments.length) return measures;
    measures = _;
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

  chart.margin = function(_) {
    if (!arguments.length) return canvas.margin;
      canvas.margin.top    = nv.utils.valueOrDefault(_.top, canvas.margin.top);
      canvas.margin.right  = nv.utils.valueOrDefault(_.right, canvas.margin.right);
      canvas.margin.bottom = nv.utils.valueOrDefault(_.bottom, canvas.margin.bottom);
      canvas.margin.left   = nv.utils.valueOrDefault(_.left, canvas.margin.left);
    return chart;
  };

  chart.tickFormat = function(_) {
    if (!arguments.length) return tickFormat;
    tickFormat = _;
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

  chart.noData = function(_) {
    if (!arguments.length) return canvas.options.noData;
    canvas.options.noData = _;
    return chart;
  };

  return chart;
};


