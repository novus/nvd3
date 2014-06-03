var SparklinePlusPrivates = {
    index : []
    , paused : false
    , xTickFormat : d3.format(',r')
    , yTickFormat : d3.format(',.2f')
    , showValue : true
    , alignValue : true
    , rightAlignValue : false
    , xScale: null
    , yScale: null
};

/**
 * A SparklinePlus
 */
function SparklinePlus(options){
    options = nv.utils.extend({}, options, SparklinePlusPrivates, {
        margin: {top: 15, right: 100, bottom: 10, left: 50}
        , chartClass: 'sparklineplus'
    });
    Chart.call(this, options);

    this.sparkline = this.getSparkline();
    this.state = this.getStateManager();
}

nv.utils.create(SparklinePlus, Chart, SparklinePlusPrivates);

SparklinePlus.prototype.getSparkline = function(){
    return nv.models.sparkline();
};

/**
 * @override Layer::wrapper
 */
SparklinePlus.prototype.wrapper = function (data) {
    var wrapPoints = [
        'nv-valueWrap', 'nv-sparklineWrap', 'nv-hoverArea' // nv-hoverArea should be after nv-sparklineWrap in the DOM
    ];
    Layer.prototype.wrapper.call(this, data, wrapPoints);

    this.wrap.attr('transform', 'translate(' + this.margin().left + ',' + this.margin().top + ')');
};

/**
 * @override Chart::draw
 */
SparklinePlus.prototype.draw = function(data){

    var that = this
        , availableWidth = this.available.width
        , availableHeight = this.available.height
        , valueWrap = null
        , value = null
        , currentValue = this.sparkline.y()(data[data.length-1], data.length-1);

    this.xScale(this.sparkline.xScale());
    this.yScale(this.sparkline.yScale());

    this.sparkline
        .width(availableWidth)
        .height(availableHeight);

    this.g.select('.nv-sparklineWrap')
        .call(this.sparkline);

    valueWrap = this.g.select('.nv-valueWrap');

    value = valueWrap.selectAll('.nv-currentValue')
        .data([currentValue]);

    value.enter().append('text').attr('class', 'nv-currentValue')
        .attr('dx', this.rightAlignValue() ? -8 : 8)
        .attr('dy', '.9em')
        .style('text-anchor', this.rightAlignValue() ? 'end' : 'start');

    value
        .attr('x', availableWidth + (this.rightAlignValue() ? this.margin().right : 0))
        .attr('y', this.alignValue() ? function(d) { return that.yScale()(d) } : 0)
        .style('fill', this.color()(data[data.length-1], data.length-1))
        .text(this.yTickFormat()(currentValue));

    this.gEnter.select('.nv-hoverArea').append('rect')
        .on('mousemove', sparklineHover)
        .on('click', function() { that.paused(!that.paused()) })
        .on('mouseout', function() { that.index([]); updateValueLine(); });

    this.g.select('.nv-hoverArea rect')
        .attr('transform', function() { return 'translate(' + -that.margin().left + ',' + -that.margin().top + ')' })
        .attr('width', availableWidth + this.margin().left + this.margin().right)
        .attr('height', availableHeight + this.margin().top);

    function updateValueLine() { //index is currently global (within the chart), may or may not keep it that way
        if (that.paused()) return;

        var hoverValue = that.g.selectAll('.nv-hoverValue').data(that.index());

        var hoverEnter = hoverValue.enter()
            .append('g').attr('class', 'nv-hoverValue')
            .style('stroke-opacity', 0)
            .style('fill-opacity', 0);

        hoverValue.exit()
            .transition().duration(250)
            .style('stroke-opacity', 0)
            .style('fill-opacity', 0)
            .remove();

        hoverValue
            .attr('transform', function(d) { return 'translate(' + that.xScale()(that.sparkline.x()(data[d],d)) + ',0)' })
            .transition().duration(250)
            .style('stroke-opacity', 1)
            .style('fill-opacity', 1);

        if (!that.index().length) return;

        hoverEnter.append('line')
            .attr('x1', 0)
            .attr('y1', -that.margin().top)
            .attr('x2', 0)
            .attr('y2', availableHeight);

        hoverEnter.append('text').attr('class', 'nv-xValue')
            .attr('x', -6)
            .attr('y', -that.margin().top)
            .attr('text-anchor', 'end')
            .attr('dy', '.9em');

        that.g.select('.nv-hoverValue .nv-xValue')
            .text(that.xTickFormat()(that.sparkline.x()(data[that.index()[0]], that.index()[0])));

        hoverEnter.append('text').attr('class', 'nv-yValue')
            .attr('x', 6)
            .attr('y', -that.margin().top)
            .attr('text-anchor', 'start')
            .attr('dy', '.9em');

        that.g.select('.nv-hoverValue .nv-yValue')
            .text(that.yTickFormat()(that.sparkline.y()(data[that.index()[0]], that.index()[0])));
    }

    function sparklineHover() {
        if (that.paused()) return;
        var pos = d3.mouse(this)[0] - that.margin().left;
        function getClosestIndex(data, x) {
            var distance = Math.abs(that.sparkline.x()(data[0], 0) - x);
            var closestIndex = 0;
            for (var i = 0; i < data.length; i++){
                if (Math.abs(that.sparkline.x()(data[i], i) - x) < distance) {
                    distance = Math.abs(that.sparkline.x()(data[i], i) - x);
                    closestIndex = i;
                }
            }
            return closestIndex;
        }
        that.index( [getClosestIndex(data, Math.round(that.xScale().invert(pos)))] );
        updateValueLine();
    }
};

/**
 * @override Chart::attachEvents
 */
SparklinePlus.prototype.attachEvents = function(){
    Chart.prototype.attachEvents.call(this);

};

/**
 * The sparklinePlus model returns a function wrapping an instance of a SparklinePlus.
 */
nv.models.sparklinePlus = function() {
    "use strict";

    var sparklinePlus = new SparklinePlus(),
        api = [
            'margin',
            'width',
            'height',
            'xTickFormat',
            'yTickFormat',
            'showValue',
            'alignValue',
            'rightAlignValue',
            'noData'
        ];

    function chart(selection) {
        sparklinePlus.render(selection);
        return chart;
    }

    chart.dispatch = sparklinePlus.dispatch;
    chart.sparkline = sparklinePlus.sparkline;
    chart.state = sparklinePlus.state;

    d3.rebind(chart, sparklinePlus.sparkline,
        'x',
        'y',
        'xScale',
        'yScale',
        'color'
    );

    chart.options = nv.utils.optionsFunc.bind(chart);

    nv.utils.rebindp(chart, sparklinePlus, SparklinePlus.prototype, api);

    return chart;
};
