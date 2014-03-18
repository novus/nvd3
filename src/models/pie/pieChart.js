function PieChart(options){
    options = nv.utils.valueOrDefault(options, {
        margin: {top: 30, right: 20, bottom: 20, left: 20},
    });

    options.chartClass = 'pieChart';
    options.wrapClass = 'pieWrap';

    Chart.call(this, options);
    this.pie = nv.models.pie();

    this.state = {};
    this.defaultState = null;
}

PieChart.prototype = Object.create(Chart.prototype);
PieChart.prototype.wrapChart = function(data){
    if(this.noData(data)){ return; }

    Chart.prototype.wrapChart.call(this, data);

    this.pie
      .width(this.available.width)
      .height(this.available.height);

    var pieWrap = this.g.select('.nv-pieWrap').datum(data);
    d3.transition(pieWrap).call(this.pie);
}

PieChart.prototype.onDispatches = function(){
    Chart.prototype.onDispatches.call(this);

    this.pie.dispatch.on('elementMouseout.tooltip', function(e) {
      this.dispatch.tooltipHide(e);
    }.bind(this));

    this.pie.dispatch.on('elementMouseover.tooltip', function(e) {
      e.pos = [e.pos[0] +  this.margin.left, e.pos[1] + this.margin.top];
      this.dispatch.tooltipShow(e);
    }.bind(this));
}

PieChart.prototype.color = function(_){
    if (!arguments.length) return this.color;
    this.color = nv.utils.getColor(_);
    this.legend.color(this.color);
    this.pie.color(this.color);
    return this;
};

PieChart.prototype.showTooltip = function(e, offsetElement) {
    var tooltipLabel = this.pie.description()(e.point) || this.pie.x()(e.point)
    var left = e.pos[0] + ( (offsetElement && offsetElement.offsetLeft) || 0 ),
        top = e.pos[1] + ( (offsetElement && offsetElement.offsetTop) || 0),
        y = this.pie.valueFormat()(this.pie.y()(e.point)),
        content = this.tooltip()(tooltipLabel, y);

    nv.tooltip.show([left, top], content, e.value < 0 ? 'n' : 's', null, offsetElement);
};

nv.models.pieChart = function() {
  "use strict";

  var pieChart = new PieChart();

  function chart(selection) {
    pieChart.render(selection);
    return chart;
  }

  // d3.select('#pies').data(set).call(nv.models.pieChart().setter(val))

  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------
  chart.legend = pieChart.legend;
  chart.dispatch = pieChart.dispatch;
  chart.pie = pieChart.pie;

  d3.rebind(chart, pieChart.pie, 'valueFormat', 'values', 'x', 'y', 'description', 'id', 'showLabels', 'donutLabelsOutside', 'pieLabelsOutside', 'labelType', 'donut', 'donutRatio', 'labelThreshold');
  chart.options = nv.utils.optionsFunc.bind(chart);

  [
    'margin',
    'width',
    'height',
    'color',
    'tooltips',
    'tooltipContent',
    'showLegend',
    'duration',
    'noData',
    'state',
    'showLegend'
  ].forEach(function(method){
    chart[method] = function(arg1){
      var ret = null;
      switch (arguments.length) {
        case 0:
           ret = PieChart.prototype[method].call(pieChart); break;
        case 1:
          ret = PieChart.prototype[method].call(pieChart, arg1); break;
        default:
          ret = PieChart.prototype[method].apply(pieChart, arguments)
      }
      return ret === pieChart ? chart : ret;
    };
  });

  return chart;
};
