var DiscreteBarPrivates = {
    xScale : null
    , yScale : null
    , xScale0: null
    , yScale0: null
    , forceY : [0] // 0 is forced by default.. this makes sense for the majority of bar graphs... user can always do chart.forceY([]) to remove
    , showValues : false
    , valueFormat : null
    , xDomain : null
    , yDomain : null
    , xRange : null
    , yRange : null
    , rectClass : 'discreteBar'
    , id: null
    , x: null
    , y: null
};

/**
 * A DiscreteBar
 */
function DiscreteBar(options){
    options = nv.utils.extend({}, options, DiscreteBarPrivates, {
        margin : {top: 0, right: 0, bottom: 0, left: 0}
        , width : 960
        , height: 500
        , chartClass: 'discretebar'
    });

    Layer.call(this, options, []);

    this.xScale(d3.scale.ordinal());
    this.yScale(d3.scale.linear());
    this.valueFormat(d3.format(',.2f'));
}

nv.utils.create(DiscreteBar, Layer, DiscreteBarPrivates);

/**
 * @override Layer::wrapper
 */
DiscreteBar.prototype.wrapper = function(data){
    Layer.prototype.wrapper.call(this, data, ['nv-groups']);
};

/**
 * @override Layer::draw
 */
DiscreteBar.prototype.draw = function(data){
    var dataLength = data.length,
        barClass = 'nv-bar';

    var that = this
        , availableWidth = this.available.width
        , availableHeight = this.available.height;

    //add series index to each data point for reference
    data.forEach(function(series, i) {
        series.values.forEach(function(point) {
            point.series = i;
        });
    });

    //------------------------------------------------------------
    // Setup Scales

    // remap and flatten the data for use in calculating the scales' domains
    var seriesData = (this.xDomain() && this.yDomain()) ? [] : // if we know xDomain and yDomain, no need to calculate
        data.map(function(d) {
            return d.values.map(function(d,i) {
                return { x: that.x()(d,i), y: that.y()(d,i), y0: d.y0 }
            })
        });

    this.xScale().domain(this.xDomain() || d3.merge(seriesData).map(function(d) { return d.x }))
        .rangeBands(this.xRange() || [0, availableWidth], .1);

    this.yScale().domain(this.yDomain() || d3.extent(d3.merge(seriesData).map(function(d) { return d.y }).concat(this.forceY())));

    // If showValues, pad the Y axis range to account for label height
    if (this.showValues())
        this.yScale().range(this.yRange() || [availableHeight - (this.yScale().domain()[0] < 0 ? 12 : 0), this.yScale().domain()[1] > 0 ? 12 : 0]);
    else
        this.yScale().range(this.yRange() || [availableHeight, 0]);

    //store old scales if they exist
    this.xScale0(this.xScale0() || this.xScale());
    this.yScale0(this.yScale0() || this.yScale().copy().range([this.yScale()(0),this.yScale()(0)]));

    //------------------------------------------------------------

    //TODO: by definition, the discrete bar should not have multiple groups, will modify/remove later
    var groups = this.wrap.select('.nv-groups').selectAll('.nv-group')
        .data(function(d) { return d }, function(d) { return d.key });
    groups.enter().append('g')
        .style('stroke-opacity', this.opacityDefault())
        .style('fill-opacity', this.opacityDefault());
    groups.exit()
        .transition()
        .style('stroke-opacity', this.opacityDefault())
        .style('fill-opacity', this.opacityDefault())
        .remove();
    groups
        .attr('class', function(d,i) { return 'nv-group nv-series-' + i })
        .classed('hover', function(d) { return d.hover });
    groups
        .transition()
        .style('stroke-opacity', 1)
        .style('fill-opacity', .75);

    var bars = groups.selectAll('g.'+barClass)
        .data(function(d) { return d.values });

    bars.exit().remove();

    function _mouseEventObject(d,i){
        return {
            value: that.y()(d,i),
            point: d,
            series: data[d.series],
            pos: [ // TODO: Figure out why the value appears to be shifted
                that.xScale()(that.x()(d,i)) + (that.xScale().rangeBand() * (d.series + .5) / dataLength),
                that.yScale()(that.y()(d,i))
            ],
            pointIndex: i,
            seriesIndex: d.series,
            e: d3.event
        }
    }
    var barsEnter = bars.enter().append('g')
        .attr('transform', function(d, i) {
            return 'translate(' + (that.xScale()(that.x()(d,i)) + that.xScale().rangeBand() * .05 ) + ', ' + that.yScale()(0) + ')'
        })
        .on('mouseover', function(d, i) { //TODO: figure out why j works above, but not here
            d3.select(this).classed('hover', true);
            that.dispatch.elementMouseover( _mouseEventObject(d, i) );
        })
        .on('mouseout', function(d, i) {
            d3.select(this).classed('hover', false);
            that.dispatch.elementMouseout( _mouseEventObject(d, i) );
        })
        .on('click', function(d, i) {
            that.dispatch.elementClick( _mouseEventObject(d, i) );
            d3.event.stopPropagation();
        })
        .on('dblclick', function(d, i) {
            that.dispatch.elementDblClick( _mouseEventObject(d, i) );
            d3.event.stopPropagation();
        });

    barsEnter.append('rect')
        .attr('height', 0)
        .attr('width', this.xScale().rangeBand() * .9 / dataLength );

    if (this.showValues()) {
        barsEnter.append('text')
            .attr('text-anchor', 'middle');

        bars.select('text')
            .text(function(d,i) { return that.valueFormat()(that.y()(d,i)) })
            .transition()
            .attr('x', this.xScale().rangeBand() * .9 / 2)
            .attr('y', function(d,i) { return that.y()(d,i) < 0 ? that.yScale()(that.y()(d,i)) - that.yScale()(0) + 12 : -4 });
    } else
        bars.selectAll('text').remove();

    bars.attr('class', function(d,i) { return barClass + ' ' + (that.y()(d,i) < 0 ? 'negative' : 'positive') })
        .style('fill', function(d,i) { return d.color || that.color()(d,i) })
        .style('stroke', function(d,i) { return d.color || that.color()(d,i) })
        .select('rect')
        .attr('class', this.rectClass())
        .transition()
        .attr('width', this.xScale().rangeBand() * .9 / dataLength);
    bars.transition()
        //.delay(function(d,i) { return i * 1200 / data[0].values.length })
        .attr('transform', function(d,i) {
            var left = that.xScale()(that.x()(d,i)) + that.xScale().rangeBand() * .05,
                top = that.y()(d,i) < 0 ?
                    that.yScale()(0) :
                    that.yScale()(0) - that.yScale()(that.y()(d,i)) < 1 ?
                        that.yScale()(0) - 1 : //make 1 px positive bars show up above y=0
                        that.yScale()(that.y()(d,i));
            return 'translate(' + left + ', ' + top + ')'
        })
        .select('rect')
        .attr('height', function(d,i) {
            return  Math.max(Math.abs(that.yScale()(that.y()(d,i)) - that.yScale()((that.yDomain() && that.yDomain()[0]) || 0)) || 1)
        });

    //store old scales for use in transitions on update
    that.xScale0(that.xScale().copy());
    that.yScale0(that.yScale().copy());

};

/**
 * The discreteBar model returns a function wrapping an instance of a DiscreteBar.
 */
nv.models.discreteBar = function () {
    "use strict";

    var discreteBar = new DiscreteBar(),
        api = [
            'x',
            'y',
            'margin',
            'width',
            'height',
            'xScale',
            'yScale',
            'xDomain',
            'yDomain',
            'xRange',
            'yRange',
            'forceY',
            'id',
            'showValues',
            'valueFormat',
            'rectClass',
            'color'
        ];

    function chart(selection) {
        discreteBar.render(selection);
        return chart;
    }

    chart.dispatch = discreteBar.dispatch;

    chart.options = nv.utils.optionsFunc.bind(chart);

    nv.utils.rebindp(chart, discreteBar, DiscreteBar.prototype, api);

    return chart;
};