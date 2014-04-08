// Chart design based on the recommendations of Stephen Few. Implementation
// based on the work of Clint Ivy, Jamie Love, and Jason Davies.
// http://projects.instantcognition.com/protovis/bulletchart/

nv.models.bullet = function() {
  "use strict";
  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var Layer = new Layer({
          margin: {top: 0, right: 0, bottom: 0, left: 0}
          , width: 380
          , height: 30
          , chartClass: 'bullet'
      })
    , orient = 'left' // TODO top & bottom
    , reverse = false
    , ranges = function(d) { return d.ranges }
    , markers = function(d) { return d.markers }
    , measures = function(d) { return d.measures }
    , rangeLabels = function(d) { return d.rangeLabels ? d.rangeLabels : [] }
    , markerLabels = function(d) { return d.markerLabels ? d.markerLabels : []  }
    , measureLabels = function(d) { return d.measureLabels ? d.measureLabels : []  }
    , forceX = [0] // List of numbers to Force into the X scale (ie. 0, or a max / min, etc.)
    , tickFormat = null
    , color = nv.utils.getColor(['#1f77b4'])
    , dispatch = d3.dispatch('elementMouseover', 'elementMouseout')
    ;

  //============================================================


  function chart(selection) {
    selection.each(function(data, i) {

      Layer.setRoot(this);

      // return if no data, TODO: to use common noData() function from Layer
      if ( !data || typeof  data == 'undefined' || data == null )
        return chart;

      var availableWidth = Layer.available.width,
          availableHeight = Layer.available.height;

      var rangez = ranges.call(this, data, i).slice().sort(d3.descending),
          markerz = markers.call(this, data, i).slice().sort(d3.descending),
          measurez = measures.call(this, data, i).slice().sort(d3.descending),
          rangeLabelz = rangeLabels.call(this, data, i).slice(),
          markerLabelz = markerLabels.call(this, data, i).slice(),
          measureLabelz = measureLabels.call(this, data, i).slice();

      //------------------------------------------------------------
      // Setup Scales

      // Compute the new x-scale.
      var x1 = d3.scale.linear()
          .domain( d3.extent(d3.merge([forceX, rangez])) )
          .range(reverse ? [availableWidth, 0] : [0, availableWidth]);

      // Retrieve the old x-scale, if this is an update.
      var x0 = this.__chart__ || d3.scale.linear()
          .domain([0, Infinity])
          .range(x1.range());

      // Stash the new scale.
      this.__chart__ = x1;

      var rangeMin = d3.min(rangez), //rangez[2]
          rangeMax = d3.max(rangez), //rangez[0]
          rangeAvg = rangez[1];

      //------------------------------------------------------------
      // Setup containers and skeleton of chart

      Layer.wrapChart(data);
      Layer.gEnter.append('rect').attr('class', 'nv-range nv-rangeMax');
      Layer.gEnter.append('rect').attr('class', 'nv-range nv-rangeAvg');
      Layer.gEnter.append('rect').attr('class', 'nv-range nv-rangeMin');
      Layer.gEnter.append('rect').attr('class', 'nv-measure');
      Layer.gEnter.append('path').attr('class', 'nv-markerTriangle');

      //------------------------------------------------------------

      var w0 = function(d) { return Math.abs(x0(d) - x0(0)) }, // TODO: could optimize by precalculating x0(0) and x1(0)
          w1 = function(d) { return Math.abs(x1(d) - x1(0)) };
      var xp0 = function(d) { return d < 0 ? x0(d) : x0(0) },
          xp1 = function(d) { return d < 0 ? x1(d) : x1(0) };

      Layer.g.select('rect.nv-rangeMax')
        .attr('height', availableHeight)
        .attr('width', w1(rangeMax > 0 ? rangeMax : rangeMin))
        .attr('x', xp1(rangeMax > 0 ? rangeMax : rangeMin))
        .datum(rangeMax > 0 ? rangeMax : rangeMin);

      Layer.g.select('rect.nv-rangeAvg')
        .attr('height', availableHeight)
        .attr('width', w1(rangeAvg))
        .attr('x', xp1(rangeAvg))
        .datum(rangeAvg);

      Layer.g.select('rect.nv-rangeMin')
        .attr('height', availableHeight)
        .attr('width', w1(rangeMax))
        .attr('x', xp1(rangeMax))
        .attr('width', w1(rangeMax > 0 ? rangeMin : rangeMax))
        .attr('x', xp1(rangeMax > 0 ? rangeMin : rangeMax))
        .datum(rangeMax > 0 ? rangeMin : rangeMax);

      Layer.g.select('rect.nv-measure')
        .style('fill', color)
        .attr('height', availableHeight / 3)
        .attr('y', availableHeight / 3)
        .attr('width', measurez < 0 ? x1(0) - x1(measurez[0]) : x1(measurez[0]) - x1(0))
        .attr('x', xp1(measurez))
        .on('mouseover', function() {
            dispatch.elementMouseover({
              value: measurez[0],
              label: measureLabelz[0] || 'Current',
              pos: [x1(measurez[0]), availableHeight/2]
            })
        })
        .on('mouseout', function() {
            dispatch.elementMouseout({
              value: measurez[0],
              label: measureLabelz[0] || 'Current'
            })
        });

      var h3 =  availableHeight / 6;
      if (markerz[0]) {
        Layer.g.selectAll('path.nv-markerTriangle')
            .attr('transform', function() { return 'translate(' + x1(markerz[0]) + ',' + (availableHeight / 2) + ')' })
            .attr('d', 'M0,' + h3 + 'L' + h3 + ',' + (-h3) + ' ' + (-h3) + ',' + (-h3) + 'Z')
            .on('mouseover', function() {
              dispatch.elementMouseover({
                value: markerz[0],
                label: markerLabelz[0] || 'Previous',
                pos: [x1(markerz[0]), availableHeight/2]
              })
            })
            .on('mouseout', function() {
              dispatch.elementMouseout({
                value: markerz[0],
                label: markerLabelz[0] || 'Previous'
              })
            });
      } else
        Layer.g.selectAll('path.nv-markerTriangle').remove();

      Layer.wrap.selectAll('.nv-range')
        .on('mouseover', function(d,i) {
          var label = rangeLabelz[i] || (!i ? "Maximum" : i == 1 ? "Mean" : "Minimum");
          dispatch.elementMouseover({
            value: d,
            label: label,
            pos: [x1(d), availableHeight/2]
          })
        })
        .on('mouseout', function(d,i) {
          var label = rangeLabelz[i] || (!i ? "Maximum" : i == 1 ? "Mean" : "Minimum");
          dispatch.elementMouseout({
            value: d,
            label: label
          })
        })
    });

    return chart;
  }

  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  chart.dispatch = dispatch;

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

  chart.forceX = function(_) {
    if (!arguments.length) return forceX;
    forceX = _;
    return chart;
  };

  chart.width = function(_) {
    if (!arguments.length) return Layer.options.size.width;
    Layer.options.size.width = _;
    return chart;
  };

  chart.height = function(_) {
    if (!arguments.length) return Layer.options.size.height;
    Layer.options.size.height = _;
    return chart;
  };

  chart.margin = function(_) {
    if (!arguments.length) return Layer.margin;
      Layer.margin.top    = nv.utils.valueOrDefault(_.top, Layer.margin.top);
      Layer.margin.right  = nv.utils.valueOrDefault(_.right, Layer.margin.right);
      Layer.margin.bottom = nv.utils.valueOrDefault(_.bottom, Layer.margin.bottom);
      Layer.margin.left   = nv.utils.valueOrDefault(_.left, Layer.margin.left);
    return chart;
  };

  chart.tickFormat = function(_) {
    if (!arguments.length) return tickFormat;
    tickFormat = _;
    return chart;
  };

  chart.color = function(_) {
    if (!arguments.length) return color;
    color = nv.utils.getColor(_);
    return chart;
  };

  return chart;
};


