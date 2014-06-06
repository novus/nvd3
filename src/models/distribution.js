/**
 * Private variables
 */
var DistributionPrivates = {
    axis : 'x' // 'x' or 'y'... horizontal or vertical
    , getData : null  // defaults d.x or d.y
    , scale : null
    , domain : null
    , scale0: null
    , color : nv.utils.defaultColor()
    , duration : 250
    , size : 8
};

/**
 * A Distribution
 */
function Distribution(options){
    options = nv.utils.extend({}, options, DistributionPrivates, {
        margin : {top: 0, right: 0, bottom: 0, left: 0}
        , width : 400 //technically width or height depending on x or y....
        , chartClass: 'distribution'
        , wrapClass: 'distribution'
    });

    Layer.call(this, options, []);
    this.scale(d3.scale.linear());

    this.getData(function(d) {
        return d[this.axis()]
    }.bind(this));
}

nv.utils.create(Distribution, Layer, DistributionPrivates);

/**
 * @override Layer::wrapper
 */
Distribution.prototype.wrapper = function(data){
    Layer.prototype.wrapper.call(this, data, []);

};

/**
 * @override Layer::draw
 */
Distribution.prototype.draw = function(data){

    var that = this
        , naxis = this.axis() == 'x' ? 'y' : 'x';

    this.scale0(this.scale0() || this.scale());

    var distWrap = this.g.selectAll('g.nv-dist')
        .data(function(d) { return d }, function(d) { return d.key });

    distWrap.enter().append('g');
    distWrap
        .attr('class', function(d,i) { return 'nv-dist nv-series-' + i })
        .style('stroke', function(d,i) { return that.color(d, i) });

    var dist = distWrap.selectAll('line.nv-dist' + this.axis())
        .data(function(d) { return d.values });

    dist.enter().append('line')
        .attr(this.axis() + '1', function(d,i) { return that.scale0()(that.getData()(d,i)) })
        .attr(this.axis() + '2', function(d,i) { return that.scale0()(that.getData()(d,i)) });

    this.renderWatch.transition(distWrap.exit().selectAll('line.nv-dist' + this.axis()), 'dist exit')
        // .transition()
        .attr(this.axis() + '1', function(d,i) { return that.scale()(that.getData()(d,i)) })
        .attr(this.axis() + '2', function(d,i) { return that.scale()(that.getData()(d,i)) })
        .style('stroke-opacity', 0)
        .remove();

    dist
        .attr('class', function(d,i) { return 'nv-dist' + that.axis() + ' nv-dist' + that.axis() + '-' + i })
        .attr(naxis + '1', 0)
        .attr(naxis + '2', this.size());

    this.renderWatch.transition(dist, 'dist')
        // .transition()
        .attr(this.axis() + '1', function(d,i) { return that.scale()(that.getData()(d,i)) })
        .attr(this.axis() + '2', function(d,i) { return that.scale()(that.getData()(d,i)) });

    this.scale0(this.scale().copy());
};

Distribution.prototype.duration = function(_) {
    if (!arguments.length) return this.options.duration;
    this.options.duration = _;
    this.renderWatch.reset(_);
    return this;
};

Distribution.prototype.size = function(_){
    if (!arguments.length) return this.options.size;
    this.options.size = _;
    return this;
};

/**
 * The distribution model returns a function wrapping an instance of a Distribution.
 */
nv.models.distribution = function () {
    "use strict";

    var distribution = new Distribution(),
        api = [
            'margin',
            'width',
            'height',
            'axis',
            'size',
            'getData',
            'scale',
            'color',
            'duration'
        ];

    function chart(selection) {
        distribution.render(selection);
        return chart;
    }

    chart.dispatch = distribution.dispatch;
    chart.options = nv.utils.optionsFunc.bind(chart);

    nv.utils.rebindp(chart, distribution, Distribution.prototype, api);

    return chart;
};
