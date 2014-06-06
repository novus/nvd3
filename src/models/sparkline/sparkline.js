var SparklinePrivates = {
    animate : true
    , xScale : null
    , yScale : null
    , xDomain : null
    , yDomain : null
    , xRange : null
    , yRange : null
    , color: nv.utils.getColor(['#000000'])
    , x: function(d){return d.x}
    , y: function(d){return d.y}
};

/**
 * A Sparkline
 */
function Sparkline(options){
    options = nv.utils.extend({}, options, SparklinePrivates, {
        margin: {top: 2, right: 0, bottom: 2, left: 0}
        , width : 400
        , height : 32
        , chartClass: 'sparkline'
    });

    Layer.call(this, options, []);
    this.xScale(d3.scale.linear());
    this.yScale(d3.scale.linear());
}

nv.utils.create(Sparkline, Layer, SparklinePrivates);

/**
 * @override Layer::wrapper
 */
Sparkline.prototype.wrapper = function(data){
    Layer.prototype.wrapper.call(this, data, []);
};

/**
 * @override Layer::draw
 */
Sparkline.prototype.draw = function(data){

    var that = this
        , availableWidth = this.available.width
        , availableHeight = this.available.height;

    //------------------------------------------------------------
    // Setup Scales

    this.xScale().domain(this.xDomain() || d3.extent(data, this.x() ))
        .range(this.xRange() || [0, availableWidth]);

    this.yScale().domain(this.yDomain() || d3.extent(data, this.y() ))
        .range(this.yRange() || [availableHeight, 0]);

    //------------------------------------------------------------

    var paths = this.wrap.selectAll('path')
        .data(function(d) { return [d] });
    paths.enter().append('path');
    paths.exit().remove();
    paths
        .style('stroke', function(d,i) { return d.color || that.color()(d, i) })
        .attr('d', d3.svg.line()
            .x(function(d,i) { return that.xScale()(that.x()(d,i)) })
            .y(function(d,i) { return that.yScale()(that.y()(d,i)) })
        );

    // TODO: Add CURRENT data point (Need Min, Mac, Current / Most recent)
    var points = this.wrap.selectAll('circle.nv-point')
        .data(function(data) {
            var yValues = data.map(function(d, i) { return that.y()(d,i); });
            function pointIndex(index) {
                if (index != -1) {
                    var result = data[index];
                    result.pointIndex = index;
                    return result;
                } else
                    return null;
            }
            var maxPoint = pointIndex(yValues.lastIndexOf(that.yScale().domain()[1])),
                minPoint = pointIndex(yValues.indexOf(that.yScale().domain()[0])),
                currentPoint = pointIndex(yValues.length - 1);
            return [minPoint, maxPoint, currentPoint].filter(function (d) {return d != null;});
        });
    points.enter().append('circle');
    points.exit().remove();
    points
        .attr('cx', function(d) { return that.xScale()(that.x()(d,d.pointIndex)) })
        .attr('cy', function(d) { return that.yScale()(that.y()(d,d.pointIndex)) })
        .attr('r', 2)
        .attr('class', function(d) {
            return that.x()(d, d.pointIndex) == that.xScale().domain()[1] ? 'nv-point nv-currentValue' :
                that.y()(d, d.pointIndex) == that.yScale().domain()[0] ? 'nv-point nv-minValue' : 'nv-point nv-maxValue'
        });
};

/**
 * The sparkline model returns a function wrapping an instance of a Sparkline.
 */
nv.models.sparkline = function () {
    "use strict";

    var sparkline = new Sparkline(),
        api = [
            'margin',
            'width',
            'height',
            'x',
            'y',
            'xScale',
            'yScale',
            'xDomain',
            'yDomain',
            'xRange',
            'yRange',
            'animate',
            'color'
        ];

    function chart(selection) {
        sparkline.render(selection);
        return chart;
    }

    chart.dispatch = sparkline.dispatch;

    chart.options = nv.utils.optionsFunc.bind(chart);

    nv.utils.rebindp(chart, sparkline, Sparkline.prototype, api);

    return chart;
};