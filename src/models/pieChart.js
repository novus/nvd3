
nv.models.pieChart = function() {
  var margin = {top: 30, right: 20, bottom: 20, left: 20},
      width = null,
      height = null,
      showLegend = true,
      color = d3.scale.category20().range(),
      tooltips = true,
      tooltip = function(key, y, e, graph) { 
        return '<h3>' + key + '</h3>' +
               '<p>' +  y + '</p>'
      };


  var pie = nv.models.pie(),
      legend = nv.models.legend().height(30),
      dispatch = d3.dispatch('tooltipShow', 'tooltipHide');


  var showTooltip = function(e, offsetElement) {
    var left = e.pos[0] + ( offsetElement.offsetLeft || 0 ),
        top = e.pos[1] + ( offsetElement.offsetTop || 0),
        y = pie.valueFormat()(pie.y()(e.point)),
        content = tooltip(pie.label()(e.point), y, e, chart);

    nv.tooltip.show([left, top], content, e.value < 0 ? 'n' : 's');
  };



  function chart(selection) {
    selection.each(function(data) {
      var container = d3.select(this),
          that = this;

      var availableWidth = (width  || parseInt(container.style('width')) || 960)
                             - margin.left - margin.right,
          availableHeight = (height || parseInt(container.style('height')) || 400)
                             - margin.top - margin.bottom;



      var wrap = container.selectAll('g.wrap.pieChart').data([data]);
      var gEnter = wrap.enter().append('g').attr('class', 'wrap nvd3 pieChart').append('g');

      gEnter.append('g').attr('class', 'pieWrap');
      gEnter.append('g').attr('class', 'legendWrap');

      var g = wrap.select('g');


      if (showLegend) {
        legend.width( availableWidth );

        wrap.select('.legendWrap')
            .datum(data)
            .call(legend);

        if ( margin.top != legend.height()) {
          margin.top = legend.height();
          availableHeight = (height || parseInt(container.style('height')) || 400)
                             - margin.top - margin.bottom;
        }

        wrap.select('.legendWrap')
            .attr('transform', 'translate(0,' + (-margin.top) +')');
      }


      pie
        .width(availableWidth)
        .height(availableHeight)
        .color(data.map(function(d,i) {
          return d.color || color[i % color.length];
        }).filter(function(d,i) { return !data[i].disabled }))



      g.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      var pieWrap = g.select('.pieWrap')
          .datum(data.filter(function(d) { return !d.disabled }))


      d3.transition(pieWrap).call(pie);


      legend.dispatch.on('legendClick', function(d,i, that) {
        d.disabled = !d.disabled;

        if (!data.filter(function(d) { return !d.disabled }).length) {
          data.map(function(d) {
            d.disabled = false;
            wrap.selectAll('.series').classed('disabled', false);
            return d;
          });
        }

        selection.transition().call(chart)
      });

      pie.dispatch.on('elementMouseover.tooltip', function(e) {
        e.pos = [e.pos[0] +  margin.left, e.pos[1] + margin.top];
        dispatch.tooltipShow(e);
      });
      if (tooltips) dispatch.on('tooltipShow', function(e) { showTooltip(e, that.parentNode) } ); // TODO: maybe merge with above?

      pie.dispatch.on('elementMouseout.tooltip', function(e) {
        dispatch.tooltipHide(e);
      });
      if (tooltips) dispatch.on('tooltipHide', nv.tooltip.cleanup);


      //TODO: decide if this makes sense to add into all the models for ease of updating (updating without needing the selection)
      chart.update = function() { selection.transition().call(chart); };
      chart.container = this; // I need a reference to the container in order to have outside code check if the chart is visible or not

    });

    return chart;
  }


  chart.dispatch = dispatch;
  chart.pie = pie; // really just makign the accessible for discretebar.dispatch, may rethink slightly

  d3.rebind(chart, pie, 'y', 'label', 'id', 'showLabels', 'donut');


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
    discretebar.color(_);
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


  return chart;
}
