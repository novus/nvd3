var MultiBarPrivates = {
    xScale: null
    , yScale: null
    , disabled: []
    , xDomain: null
    , yDomain: null
    , xRange: null
    , yRange: null
    , clipEdge: true
    , stacked: false
    , stackOffset: 'zero' // options include 'silhouette', 'wiggle', 'expand', 'zero', or a custom function
    , hideable: false
    , groupSpacing: 0.1
    , forceY: [0] // 0 is forced by default.. this makes sense for the majority of bar graphs... user can always do chart.forceY([]) to remove
    , xScale0: null
    , yScale0: null
    , duration: 1000
    , barColor: null
    , id: null
    , x: function(d){return d.x}
    , y: function(d){return d.y}
    , color: null
};

/**
 * A MultiBar
 */
function MultiBar(options){
    options = nv.utils.extend({}, options, MultiBarPrivates, {
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
        width: 500,
        height: 500,
        chartClass: 'multibar'
    });

    Layer.call(this, options, []);

    this.xScale(d3.scale.ordinal());
    this.yScale(d3.scale.linear());
}

nv.utils.create(MultiBar, Layer, MultiBarPrivates);

/**
 * @override Layer::wrapper
 */
MultiBar.prototype.wrapper = function(data){
    Layer.prototype.wrapper.call(this, data, ['nv-groups']);
};

/**
 * @override Layer::draw
 */
MultiBar.prototype.draw = function(data){

    var that = this,
        availableWidth = this.available.width
        , availableHeight = this.available.height
        , hideable = []
        , seriesData = null
        , exitTransition = null
        , barsEnter = null
        , endFn = function(d, i) { // This function defines the requirements for render complete
            return d.series === data.length - 1 && i === data[0].values.length - 1;
        }
        , onMouseEventObject = function(d,i){
            return {
                value     : that.y()(d),
                point     : d,
                series    : data[d.series],
                pos       : [that.xScale()(that.x()(d)) + (that.xScale().rangeBand() * (that.stacked() ? data.length / 2 : d.series + .5) / data.length), that.yScale()(that.y()(d) + (that.stacked() ? d.y0 : 0))],  // TODO: Figure out why the value appears to be shifted
                pointIndex: i,
                seriesIndex: d.series,
                e         : d3.event
            }
        };

    if(this.hideable() && data.length)
        hideable = [{
            values: data[0].values.map(function(d) {
                    return {
                        x: d.x,
                        y: 0,
                        series: d.series,
                        size: 0.01
                    };}
            )}];

    if (this.stacked())
        data = d3.layout.stack()
            .offset(this.stackOffset())
            .values(function(d){ return d.values })
            .y(this.y())
            (!data.length && hideable ? hideable : data);

    //add series index to each data point for reference
    data.forEach(function(series, i) {
        series.values.forEach(function(point) {
            point.series = i;
        });
    });

    //------------------------------------------------------------
    // HACK for negative value stacking
    if (this.stacked())
        data[0].values.map(function(d,i) {
            var posBase = 0, negBase = 0;
            data.map(function(d) {
                var f = d.values[i];
                f.size = Math.abs(f.y);
                if ( f.y < 0 )  {
                    f.y1 = negBase;
                    negBase = negBase - f.size;
                } else {
                    f.y1 = f.size + posBase;
                    posBase = posBase + f.size;
                }
            });
        });

    //------------------------------------------------------------
    // Setup Scales

    // remap and flatten the data for use in calculating the scales' domains
    seriesData = (this.xDomain() && this.yDomain()) ? [] : // if we know xDomain and yDomain, no need to calculate
        data.map(function(d) {
            return d.values.map(function(d) {
                return { x: that.x()(d), y: that.y()(d), y0: d.y0, y1: d.y1 }
            })
        });

    this.xScale()
        .domain(this.xDomain() || d3.merge(seriesData).map(that.x()) )
        .rangeBands( (this.xRange() || [0, availableWidth]), this.groupSpacing());

    this.yScale().domain(
            this.yDomain() || d3.extent(
                d3.merge(seriesData)
                    .map(function(d) { return that.stacked() ? that.y()(d) > 0 ? d.y1 : d.y1 + that.y()(d) : that.y()(d)} )
                    .concat(this.forceY())
            )
        )
        .range(this.yRange() || [availableHeight, 0]);

    // If scale's domain don't have a range, slightly adjust to make one... so a chart can show a single data point
    if (this.xScale().domain()[0] === this.xScale().domain()[1])
        this.xScale().domain()[0]
            ? this.xScale().domain([this.xScale().domain()[0] - this.xScale().domain()[0] * 0.01, this.xScale().domain()[1] + this.xScale().domain()[1] * 0.01])
            : this.xScale().domain([-1,1]);

    if (this.yScale().domain()[0] === this.yScale().domain()[1])
        this.yScale().domain()[0]
            ? this.yScale().domain([this.yScale().domain()[0] + this.yScale().domain()[0] * 0.01, this.yScale().domain()[1] - this.yScale().domain()[1] * 0.01])
            : this.yScale().domain([-1,1]);

    this.xScale0( this.xScale0() || this.xScale() );
    this.yScale0( this.yScale0() || this.yScale() );

    this.defsEnter.append('clipPath')
        .attr('id', 'nv-edge-clip-' + this.id())
        .append('rect');
    this.wrap.select('#nv-edge-clip-' + this.id() + ' rect')
        .attr('width', availableWidth)
        .attr('height', availableHeight);

    this.g.attr('clip-path', this.clipEdge() ? 'url(#nv-edge-clip-' + this.id() + ')' : '');

    var groups = this.wrap.select('.nv-groups').selectAll('.nv-group')
        .data(function(d) { return d }, function(d,i) { return i });
    groups.enter().append('g')
        .style('stroke-opacity', this.opacityDefault())
        .style('fill-opacity', this.opacityDefault());

    exitTransition = this.renderWatch
        .transition(
            groups.exit().selectAll('rect.nv-bar'),
            'multibarExit',
            Math.min(250, this.duration())
        )
        .attr('y', function(d) { return that.stacked() ? that.yScale0()(d.y0) : that.yScale0()(0)})
        .attr('height', 0)
        .remove();
    if (exitTransition.delay)
        exitTransition.delay(function(d,i) {
            return i * that.duration() / data[0].values.length;
        });

    groups
        .attr('class', function(d,i) { return 'nv-group nv-series-' + i })
        .classed('hover', function(d) { return d.hover })
        .style('fill', function(d,i){ return that.color()(d, i) })
        .style('stroke', function(d,i){ return that.color()(d, i)});
    groups
        .style('stroke-opacity', 1)
        .style('fill-opacity', 0.75);

    var bars = groups.selectAll('rect.nv-bar')
        .data(function(d) {
            return (hideable && !data.length) ? hideable.values : d.values
        });

    bars.exit().remove();

    barsEnter = bars.enter().append('rect')
        .attr('class', function(d) {
            return that.y()(d) < 0 ? 'nv-bar negative' : 'nv-bar positive'
        })
        .attr('x', function(d,i,j) {
            return that.stacked() ? 0 : (j * that.xScale().rangeBand() / data.length )
        })
        .attr('y', function(d) {
            return that.yScale0()(that.stacked() ? d.y0 : 0)
        })
        .attr('height', 0)
        .attr('width', this.xScale().rangeBand() / (this.stacked() ? 1 : data.length) )
        .attr('transform', function(d) { return 'translate(' + that.xScale()(that.x()(d)) + ',0)';});

    bars
        .style('fill', function(d,i,j){ return that.color()(d, j, i);})
        .style('stroke', function(d,i,j){ return that.color()(d, j, i);})
        .on('mouseover', function(d,i) { //TODO: figure out why j works above, but not here
            d3.select(this).classed('hover', true);
            that.dispatch.elementMouseover( onMouseEventObject(d,i) );
        })
        .on('mouseout', function(d,i) {
            d3.select(this).classed('hover', false);
            that.dispatch.elementMouseout( onMouseEventObject(d,i) );
        })
        .on('click', function(d,i) {
            that.dispatch.elementClick( onMouseEventObject(d,i) );
            d3.event.stopPropagation();
        })
        .on('dblclick', function(d,i) {
            that.dispatch.elementDblClick( onMouseEventObject(d,i) );
            d3.event.stopPropagation();
        });
    bars
        .attr('class', function(d) { return that.y()(d) < 0 ? 'nv-bar negative' : 'nv-bar positive'})
        .transition()
        .attr('transform', function(d) { return 'translate(' + that.xScale()(that.x()(d)) + ',0)'; });

    function _colorBar (d,i,j) {
        return d3.rgb(that.barColor()(d,i))
            .darker(
                that.disabled().map(function(d,i) { return i })
                    .filter(function(d,i){ return !that.disabled[i]})[j]
            )
            .toString()
    }

    if (this.barColor()) {
        if (!this.disabled())
            this.disabled(data.map(function() { return true }));
        bars
            .style('fill', _colorBar)
            .style('stroke', _colorBar);
    }

    var barSelection =
        bars.watchTransition(this.renderWatch, 'multibar', Math.min(250, this.duration()))
            .delay(function(d,i) { return i * that.duration() / data[0].values.length });
    if (this.stacked())
        barSelection
            .attr('y', function(d) {
                return that.y()(that.stacked() ? d.y1 : 0)
            })
            .attr('height', function(d){
                return Math.max(Math.abs(that.yScale()(d.y + (that.stacked() ? d.y0 : 0)) - that.yScale()((that.stacked() ? d.y0 : 0))),1);
            })
            .attr('x', function(d) { return that.stacked() ? 0 : (d.series * that.xScale().rangeBand() / data.length ) })
            .attr('width', this.xScale().rangeBand() / (this.stacked() ? 1 : data.length) );
    else
        barSelection
            .attr('x', function(d) { return d.series * that.xScale().rangeBand() / data.length })
            .attr('width', this.xScale().rangeBand() / data.length)
            .attr('y', function(d) {
                return that.yScale()(d) < 0 ?
                    that.yScale()(0) :
                    that.yScale()(0) - that.yScale()(that.y()(d)) < 1 ?
                        that.yScale()(0) - 1 :
                        that.yScale()(that.y()(d)) || 0;
            })
            .attr('height', function(d, i) {
                return Math.max(Math.abs(that.yScale()(that.y()(d,i)) - that.yScale()(0)),1) || 0;
            });

    //store old scales for use in transitions on update
/*
    this.xScale0( this.xScale().copy );
    this.yScale0( this.yScale().copy );
*/
};

MultiBar.prototype.delay = function(_) {
    nv.deprecated('multiBar.delay');
    return this.duration(_);
};

MultiBar.prototype.barColor = function(_) {
    if (!arguments.length) return this.options.barColor;
    this.options.barColor = nv.utils.getColor(_);
    return this;
};

/**
 * The multiBar model returns a function wrapping an instance of a MultiBar.
 */
nv.models.multiBar = function () {
    "use strict";

    var multiBar = new MultiBar(),
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
            'stackOffset',
            'clipEdge',
            'color',
            'barColor',
            'disabled',
            'id',
            'hideable',
            'groupSpacing',
            'duration',
            'delay'
        ];

    function chart(selection) {
        multiBar.render(selection);
        return chart;
    }

    chart.dispatch = multiBar.dispatch;

    chart.options = nv.utils.optionsFunc.bind(chart);

    nv.utils.rebindp(chart, multiBar, MultiBar.prototype, api);

    return chart;
};
