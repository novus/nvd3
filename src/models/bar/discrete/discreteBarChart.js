var DiscreteBarChartPrivates = {
    defaultState : null
    , xTicksPadding: [5, 17]
    , xScale: null
    , yScale: null
    , transitionDuration : 250
    , state: null
    , staggerLabels: null
    , tooltips: true
    , x: null
    , y: null
    , id: null
};

/**
 * A DiscreteBarChart
 */
function DiscreteBarChart(options){
    options = nv.utils.extend({}, options, DiscreteBarChartPrivates, {
        margin: {top: 15, right: 10, bottom: 50, left: 60}
        , chartClass: 'discreteBarWithAxes'
        , wrapClass: 'barsWrap'
    });

    this.discreteBar = this.getDiscreteBar();
    this.state = this.getStateManager();

    Chart.call(this, options);
}

nv.utils.create(DiscreteBarChart, Chart, DiscreteBarChartPrivates);

DiscreteBarChart.prototype.getDiscreteBar = function(){
    return nv.models.discreteBar();
};

/**
 * override Chart::wrapper
 * @param data
 */
DiscreteBarChart.prototype.wrapper = function (data) {
    Chart.prototype.wrapper.call(this, data, []);
};

/**
 * @override Chart::draw
 */
DiscreteBarChart.prototype.draw = function(data){

    this.discreteBar
        .width(this.available.width)
        .height(this.available.height)
    ;
    var discreteBarWrap = this.g.select('.nv-barsWrap').datum(data);
    d3.transition(discreteBarWrap).call(this.discreteBar);

    this.xScale(this.discreteBar.xScale());
    this.yScale(this.discreteBar.yScale().clamp(true));
    this.x(this.discreteBar.x());
    this.y(this.discreteBar.y());
    this.id(this.discreteBar.id());

/*    this.gEnter.insert('g', '.nv-'+this.options.wrapClass).attr('class', 'nv-y nv-axis')
        .append('g')
        .attr('class', 'nv-zeroLine')
        .append('line');*/

    this.defsEnter.append('clipPath')
        .attr('id', 'nv-x-label-clip-' + this.id())
        .append('rect');

    this.g.select('#nv-x-label-clip-' + this.id() + ' rect')
        .attr('width', this.xScale().rangeBand() * (this.staggerLabels() ? 2 : 1))
        .attr('height', 16)
        .attr('x', -this.xScale().rangeBand() / (this.staggerLabels() ? 1 : 2 ));

    // Zero line
    this.g.select(".nv-zeroLine line")
        .attr("x1",0)
        .attr("x2", this.available.width)
        .attr("y1", this.y()(0))
        .attr("y2", this.y()(0));

    Chart.prototype.draw.call(this, data);
};

/**
 * @override Chart::attachEvents
 */
DiscreteBarChart.prototype.attachEvents = function(){
    Chart.prototype.attachEvents.call(this);

    this.discreteBar.dispatch
        .on('elementMouseout.tooltip', function(e) {
            this.dispatch.tooltipHide(e);
        }.bind(this))
        .on('elementMouseover.tooltip', function(e) {
            e.pos = [e.pos[0] +  this.margin().left, e.pos[1] + this.margin().top];
            this.showTooltip(e, this.svg[0][0].parentNode);
        }.bind(this));
};

DiscreteBarChart.prototype.showTooltip = function(e, offsetElement) {
    var left = e.pos[0] + ( offsetElement.offsetLeft || 0 ),
        top = e.pos[1] + ( offsetElement.offsetTop || 0),
        x = this.xAxis.tickFormat()(this.x()(e.point, e.pointIndex)),
        y = this.yAxis.tickFormat()(this.y()(e.point, e.pointIndex)),
        content = this.tooltip()(e.series.key, x, y);
    nv.tooltip.show([left, top], content, e.value < 0 ? 'n' : 's', null, offsetElement);
};

/**
 * The discreteBarChart model returns a function wrapping an instance of a DiscreteBarChart.
 */
nv.models.discreteBarChart = function() {
    "use strict";

    var discreteBarChart = new DiscreteBarChart(),
        api = [
            'margin',
            'width',
            'height',
            'tooltips',
            'tooltipContent',
            'showLegend',
            'showXAxis',
            'showYAxis',
            'rightAlignYAxis',
            'staggerLabels',
            'noData',
            'transitionDuration',
            'state',
            'reduceXTicks'
        ];

    function chart(selection) {
        discreteBarChart.render(selection);
        return chart;
    }

    chart.dispatch = discreteBarChart.dispatch;
    chart.legend = discreteBarChart.legend;
    chart.discreteBar = discreteBarChart.discreteBar;
    chart.xAxis = discreteBarChart.xAxis;
    chart.yAxis = discreteBarChart.yAxis;
    chart.state = discreteBarChart.state;

    d3.rebind(chart, discreteBarChart.discreteBar,
        'x',
        'y',
        'color',
        'xDomain',
        'yDomain',
        'xRange',
        'yRange',
        'forceX',
        'forceY',
        'id',
        'showValues',
        'valueFormat'
    );

    chart.options = nv.utils.optionsFunc.bind(chart);

    nv.utils.rebindp(chart, discreteBarChart, DiscreteBarChart.prototype, api);

    return chart;
};
