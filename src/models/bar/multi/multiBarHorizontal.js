var MultiBarHorizontalPrivates = {
    xScale: null
    , yScale: null
    , forceY : [0] // 0 is forced by default.. this makes sense for the majority of bar graphs... user can always do chart.forceY([]) to remove
    , disabled : null// used in conjunction with barColor to communicate from multiBarHorizontalChart what series are disabled
    , stacked : false
    , showValues : false
    , showBarLabels : false
    , valuePadding : 60
    , valueFormat : d3.format(',.2f')
    , delay : 1200
    , xDomain: null
    , yDomain: null
    , xRange: null
    , yRange: null
    , duration: null
    , id: null
    , x: function(d){return d.x}
    , y: function(d){return d.y}
};

/**
 * A MultiBarHorizontal
 */
function MultiBarHorizontal(options){
    options = nv.utils.extend({}, options, MultiBarHorizontalPrivates, {
        margin: {top: 0, right: 0, bottom: 0, left: 0}
        , width: 960
        , height: 500
        , chartClass: 'multibarHorizontal'
        , wrapClass: ''
    });

    this._barColor = nv.utils.defaultColor(); // adding the ability to set the color for each rather than the whole group
    Layer.call(this, options, []);

    this.xScale(d3.scale.ordinal());
    this.yScale(d3.scale.linear());
}

nv.utils.create(MultiBarHorizontal, Layer, MultiBarHorizontalPrivates);

/**
 * @override Layer::wrapper
 */
MultiBarHorizontal.prototype.wrapper = function (data) {
    Layer.prototype.wrapper.call(this, data, ['nv-groups']);

};

/**
 * @override Layer::draw
 */
MultiBarHorizontal.prototype.draw = function(data){
    var that = this
        , x0 //used to store previous scales
        , y0 //used to store previous scales
    ;

    var availableWidth = this.available.width,
        availableHeight = this.available.height;

    if (this.stacked())
        data = d3.layout.stack()
            .offset('zero')
            .values(function(d){ return d.values })
            .y(this.y())
            (data);

    //add series index to each data point for reference
    data.forEach(function(series, i) {
        series.values.forEach(function(point) { point.series = i });
    });

    //------------------------------------------------------------
    // HACK for negative value stacking
    if (this.stacked())
        data[0].values.map(function(d,i) {
            var posBase = 0, negBase = 0;
            data.map(function(d) {
                var f = d.values[i];
                f.size = Math.abs(f.y);
                if ( f.y<0 ) {
                    f.y1 = negBase - f.size;
                    negBase = negBase - f.size;
                } else {
                    f.y1 = posBase;
                    posBase = posBase + f.size;
                }
            });
        });

    //------------------------------------------------------------
    // Setup Scales

    // remap and flatten the data for use in calculating the scales' domains
    var seriesData = (this.xDomain() && this.yDomain()) ? [] : // if we know xDomain and yDomain, no need to calculate
        data.map(function(d) {
            return d.values.map(function(d,i) {
                return { x: that.x()(d,i), y: that.y()(d,i), y0: d.y0, y1: d.y1 }
            })
        });

    this.xScale().domain(this.xDomain() || d3.merge(seriesData).map(function(d) { return d.x }))
        .rangeBands(this.xRange() || [0, availableHeight], .1);

    //y   .domain(yDomain || d3.extent(d3.merge(seriesData).map(function(d) { return d.y + (stacked ? d.y0 : 0) }).concat(forceY)))
    this.yScale().domain(this.yDomain() || d3.extent(d3.merge(seriesData).map(function(d) { return that.stacked() ? (d.y > 0 ? d.y1 + d.y : d.y1 ) : d.y }).concat(that.forceY())));

    if (this.showValues() && !this.stacked())
        this.yScale().range(this.yRange() || [(this.yScale().domain()[0] < 0 ? this.valuePadding() : 0), availableWidth - (this.yScale().domain()[1] > 0 ? this.valuePadding() : 0) ]);
    else
        this.yScale().range(this.yRange() || [0, availableWidth]);

    x0 = x0 || this.xScale();
    y0 = y0 || d3.scale.linear().domain(this.yScale().domain()).range([this.yScale()(0),this.yScale()(0)]);

    //------------------------------------------------------------

    var groups = this.wrap.select('.nv-groups').selectAll('.nv-group')
        .data(function(d) { return d }, function(d,i) { return i });
    groups.enter().append('g')
        .style('stroke-opacity', 1e-6)
        .style('fill-opacity', 1e-6);
    groups.exit().transition()
        .style('stroke-opacity', 1e-6)
        .style('fill-opacity', 1e-6)
        .remove();
    groups
        .attr('class', function(d,i) { return 'nv-group nv-series-' + i })
        .classed('hover', function(d) { return d.hover })
        .style('fill', function(d){
            return that.color()(d)
        })
        .style('stroke', function(d){ return that.color()(d) });
    groups.transition()
        .style('stroke-opacity', 1)
        .style('fill-opacity', .75);

    var bars = groups.selectAll('g.nv-bar')
        .data(function(d) { return d.values });

    bars.exit().remove();

    var barsEnter = bars
        .enter().append('g')
        .attr('transform', function(d,i,j) {
            return 'translate(' + y0(that.stacked() ? d.y0 : 0) + ',' + (that.stacked() ? 0 : (j * that.xScale().rangeBand() / data.length ) + that.xScale()(that.x()(d,i))) + ')'
        });
    barsEnter.append('rect')
        .attr('width', 0)
        .attr('height', this.xScale().rangeBand() / (that.stacked() ? 1 : data.length) );

    bars
        .on('mouseover', function(d,i) { //TODO: figure out why j works above, but not here
            d3.select(this).classed('hover', true);
            that.dispatch.elementMouseover({
                value: that.y()(d,i),
                point: d,
                series: data[d.series],
                pos: [ that.yScale()(that.y()(d,i) + (that.stacked() ? d.y0 : 0)), that.xScale()(that.x()(d,i)) + (that.xScale().rangeBand() * (that.stacked() ? data.length / 2 : d.series + .5) / data.length) ],
                pointIndex: i,
                seriesIndex: d.series,
                e: d3.event
            });
        })
        .on('mouseout', function(d,i) {
            d3.select(this).classed('hover', false);
            that.dispatch.elementMouseout({
                value: that.y()(d,i),
                point: d,
                series: data[d.series],
                pointIndex: i,
                seriesIndex: d.series,
                e: d3.event
            });
        })
        .on('click', function(d,i) {
            that.dispatch.elementClick({
                value: that.y()(d,i),
                point: d,
                series: data[d.series],
                pos: [that.xScale()(that.x()(d,i)) + (that.xScale().rangeBand() * (that.stacked() ? data.length / 2 : d.series + .5) / data.length), that.yScale()(that.y()(d,i) + (that.stacked() ? d.y0 : 0))],  // TODO: Figure out why the value appears to be shifted
                pointIndex: i,
                seriesIndex: d.series,
                e: d3.event
            });
            d3.event.stopPropagation();
        })
        .on('dblclick', function(d,i) {
            that.dispatch.elementDblClick({
                value: that.y()(d,i),
                point: d,
                series: data[d.series],
                pos: [that.xScale()(that.x()(d,i)) + (that.xScale().rangeBand() * (that.stacked() ? data.length / 2 : d.series + .5) / data.length), that.yScale()(that.y()(d,i) + (that.stacked() ? d.y0 : 0))],  // TODO: Figure out why the value appears to be shifted
                pointIndex: i,
                seriesIndex: d.series,
                e: d3.event
            });
            d3.event.stopPropagation();
        });

    barsEnter.append('text');

    if (this.showValues() && !this.stacked()) {
        bars.select('text')
            .attr('text-anchor', function(d,i) { return that.y()(d,i) < 0 ? 'end' : 'start' })
            .attr('y', this.xScale().rangeBand() / (data.length * 2))
            .attr('dy', '.32em')
            .text(function(d,i) { return that.valueFormat()(that.y()(d,i)) });
        bars.transition()
            .select('text')
            .attr('x', function(d,i) { return that.y()(d,i) < 0 ? -4 : that.yScale()(that.y()(d,i)) - that.yScale()(0) + 4 })
    } else
        bars.selectAll('text').text('');

    if (this.showBarLabels() && !this.stacked()) {
        barsEnter.append('text').classed('nv-bar-label',true);
        bars.select('text.nv-bar-label')
            .attr('text-anchor', function(d,i) { return that.y()(d,i) < 0 ? 'start' : 'end' })
            .attr('y', this.xScale().rangeBand() / (data.length * 2))
            .attr('dy', '.32em')
            .text(function(d,i) { return that.x()(d,i) });
        bars.transition()
            .select('text.nv-bar-label')
            .attr('x', function(d,i) { return that.y(d,i) < 0 ? that.yScale()(0) - that.yScale()(that.y(d,i)) + 4 : -4 });
    }
    else
        bars.selectAll('text.nv-bar-label').text('');

    bars.attr('class', function(d,i) { return that.y()(d,i) < 0 ? 'nv-bar negative' : 'nv-bar positive'});

    if (this._barColor) {
        if (!this.disabled())
            this.disabled(data.map(function() { return true }));
        var _colorBars = function(d,i,j) {
            return d3
                .rgb(that._barColor(d,i))
                .darker(that.disabled().map(function(d,i) { return i }).filter(function(d,i){ return !that.disabled()[i] })[j] )
                .toString()
        };
        bars.style('fill', _colorBars)
            .style('stroke', _colorBars);
    }

    if (this.stacked())
        bars.transition()
            .attr('transform', function(d,i) { return 'translate(' + that.yScale()(d.y1) + ',' + that.xScale()(that.x()(d,i)) + ')' })
            .select('rect')
            .attr('width', function(d,i) { return Math.abs(that.yScale()(that.y()(d,i) + d.y0) - that.yScale()(d.y0)) })
            .attr('height', this.xScale().rangeBand() );
    else
        bars.transition()
            .attr('transform', function(d,i) {
                //TODO: stacked must be all positive or all negative, not both?
                return 'translate(' +
                    (that.y()(d,i) < 0 ? that.yScale()(that.y()(d,i)) : that.yScale()(0))
                    + ',' +
                    (d.series * that.xScale().rangeBand() / data.length
                        +
                        that.xScale()(that.x()(d,i)) )
                    + ')'
            })
            .select('rect')
            .attr('height', this.xScale().rangeBand() / data.length )
            .attr('width', function(d,i) { return Math.max(Math.abs(that.yScale()(that.y()(d,i)) - that.yScale()(0)),1) });

    //store old scales for use in transitions on update
    x0 = this.xScale().copy();
    y0 = this.yScale().copy();

};

MultiBarHorizontal.prototype.barColor = function(_) {
    if (!arguments.length) return this._barColor;
    this._barColor = nv.utils.getColor(_);
    return this;
};

nv.models.multiBarHorizontal = function() {
    "use strict";

    var multiBarHorizontal = new MultiBarHorizontal(),
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
            'stacked',
            'color',
            'barColor',
            'disabled',
            'id',
            'delay',
            'showValues',
            'showBarLabels',
            'valueFormat',
            'valuePadding'
        ];

    function chart(selection) {
        multiBarHorizontal.render(selection);
        return chart;
    }

    chart.dispatch = multiBarHorizontal.dispatch;
    chart.options = nv.utils.optionsFunc.bind(chart);

    nv.utils.rebindp(chart, multiBarHorizontal, MultiBarHorizontal.prototype, api);

    return chart;
};
