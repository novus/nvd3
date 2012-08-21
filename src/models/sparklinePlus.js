
nv.models.sparklinePlus = function() {

  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var sparkline = nv.models.sparkline();

  var margin = {top: 15, right: 40, bottom: 3, left: 40}
    , width = null
    , height = null
    , x
    , y
    , color = nv.utils.defaultColor()
    , xTickFormat = d3.format(',r')
    , yTickFormat = d3.format(',.2f')
    , noData = "No Data Available."
    ;

  //============================================================


  function chart(selection) {
    selection.each(function(data) {
      var container = d3.select(this);

      var availableWidth = (width  || parseInt(container.style('width')) || 960)
                             - margin.left - margin.right,
          availableHeight = (height || parseInt(container.style('height')) || 400)
                             - margin.top - margin.bottom;


      //------------------------------------------------------------
      // Display No Data message if there's nothing to show.

      if (!data || !data.length) {
        container.append('text')
          .attr('class', 'nvd3 nv-noData')
          .attr('x', availableWidth / 2)
          .attr('y', availableHeight / 2)
          .attr('dy', '-.7em')
          .style('text-anchor', 'middle')
          .text(noData);
          return chart;
      } else {
        container.select('.nv-noData').remove();
      }

      //------------------------------------------------------------



      //------------------------------------------------------------
      // Setup Scales

      x = sparkline.xScale();
      y = sparkline.yScale();

      //------------------------------------------------------------


      //------------------------------------------------------------
      // Setup containers and skeleton of chart

      var wrap = container.selectAll('g.nv-wrap.nv-sparklineplus').data([data]);
      var wrapEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap nv-sparklineplus');
      var gEnter = wrapEnter.append('g');
      var g = wrap.select('g');

      gEnter.append('g').attr('class', 'nv-sparklineWrap')

      wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')

      //------------------------------------------------------------


      //------------------------------------------------------------
      // Main Chart Component(s)

      var sparklineWrap = g.select('.nv-sparklineWrap');

      sparkline
        .width(availableWidth)
        .height(availableHeight);

      sparklineWrap
          .style('stroke', function(d, i){ return d.color || color(d, i) })
          .call(sparkline);

      //------------------------------------------------------------


      var hoverValue = gEnter.append('g').attr('class', 'nv-hoverValue');
      var hoverArea = gEnter.append('g').attr('class', 'nv-hoverArea');


      hoverValue.attr('transform', function(d) { return 'translate(' + x(d) + ',0)' });

      var hoverLine = hoverValue.append('line')
          .attr('x1', x.range()[1])
          .attr('y1', -margin.top)
          .attr('x2', x.range()[1])
          .attr('y2', availableHeight);

      var hoverX = hoverValue.append('text').attr('class', 'nv-xValue')
          .attr('text-anchor', 'end')
          .attr('dy', '.9em');

      var hoverY = hoverValue.append('text').attr('class', 'nv-yValue')
          //.attr('transform', function(d) { return 'translate(' + x(d) + ',0)' })
          .attr('text-anchor', 'start')
          .attr('dy', '.9em');


      hoverArea.append('rect')
          .attr('width', availableWidth)
          .attr('height', availableHeight)
          .on('mousemove', sparklineHover);



      function sparklineHover() {
        var pos = d3.event.offsetX - margin.left;

        hoverLine
            .attr('x1', pos)
            .attr('x2', pos);

        hoverX
            .attr('transform', function(d) { return 'translate(' + (pos - 6) + ',' + (-margin.top) + ')' })
            .text(xTickFormat(Math.round(x.invert(pos))));

        var f = function(data, x){
          var distance = Math.abs(sparkline.x()(data[0]) - x) ;
          var closestIndex = 0;
          for (var i = 0; i < data.length; i++){
            if (Math.abs(sparkline.x()(data[i]) - x) < distance) {
              distance = Math.abs(sparkline.x()(data[i]) -x);
              closestIndex = i;
            }
          }
          return closestIndex;
        }

        hoverY
            .attr('transform', function(d) { return 'translate(' + (pos + 6) + ',' + (-margin.top) + ')' })
            .text(yTickFormat(sparkline.y()(data[f(data, Math.round(x.invert(pos)))])));
      }

    });

    return chart;
  }


  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  // expose chart's sub-components
  chart.sparkline = sparkline;

  d3.rebind(chart, sparkline, 'x', 'y', 'xScale', 'yScale');

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

  chart.xTickFormat = function(_) {
    if (!arguments.length) return xTickFormat;
    xTickFormat = _;
    return chart;
  };

  chart.yTickFormat = function(_) {
    if (!arguments.length) return yTickFormat;
    yTickFormat = _;
    return chart;
  };

  chart.noData = function(_) {
    if (!arguments.length) return noData;
    noData = _;
    return chart;
  };

  //============================================================


  return chart;
}
