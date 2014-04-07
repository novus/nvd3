var HistoricalBarPrivates = {
    xScale : d3.scale.linear()
    , yScale : d3.scale.linear()
    , forceX : null
    , forceY : [0]
    , padData : false
    , clipEdge : true
    , xDomain : null
    , yDomain : null
    , xRange: null
    , yRange: null
    , interactive : true
    , _color: nv.utils.defaultColor()
};

/**
 * A HistoricalBar
 */
function HistoricalBar(options){
    options = nv.utils.extend({}, options, HistoricalBarPrivates, {
        margin: {top: 0, right: 0, bottom: 0, left: 0}
        , width: 960
        , height: 500
        , chartClass: 'historicalBar'
    });

    Layer.call(this, options, ['chartClick', 'elementClick', 'elementDblClick', 'elementMouseover', 'elementMouseout']);

    //Create methods to allow outside functions to highlight a specific bar.
    this.highlightPoint = function(pointIndex, isHoverOver) {
        d3.select(".nv-"+this.options.chartClass+"-" + this.id())
            .select(".nv-bars .nv-bar-0-" + pointIndex)
            .classed("hover", isHoverOver);
    };

    this.clearHighlights = function() {
        d3.select(".nv-"+this.options.chartClass+"-" + this.id())
            .select(".nv-bars .nv-bar.hover")
            .classed("hover", false);
    };
}

nv.utils.create(HistoricalBar, Layer, HistoricalBarPrivates);

HistoricalBar.prototype.attachEvents = function(){
    Layer.prototype.attachEvents.call(this);
    this.svg.on('click', function(d,i) {
        this.dispatch.chartClick({
            data: d,
            index: i,
            pos: d3.event,
            id: this.id()
        });
    }.bind(this));
};

HistoricalBar.prototype.wrapper = function(data){
    Layer.prototype.wrapper.call(this, data[0].values, ['nv-bars'])
};

HistoricalBar.prototype.draw = function(data){

    var that = this
        , availableWidth = this.available.width
        , availableHeight = this.available.height;

    this.xScale()
        .domain(this.xDomain() || d3.extent(data[0].values.map(this.x()).concat(this.forceX())) );

    if (this.padData())
        this.xScale().range(this.xRange() || [availableWidth * .5 / data[0].values.length, availableWidth * (data[0].values.length - .5)  / data[0].values.length ]);
    else
        this.xScale().range(this.xRange() || [0, availableWidth]);

    this.yScale().domain(this.yDomain() || d3.extent(data[0].values.map(this.y()).concat(this.forceY()) ))
        .range(this.yRange() || [availableHeight, 0]);

    // If scale's domain don't have a range, slightly adjust to make one... so a chart can show a single data point

    if (this.xScale().domain()[0] === this.xScale().domain()[1])
        this.xScale().domain()[0] ?
            this.xScale().domain([this.xScale().domain()[0] - this.xScale().domain()[0] * 0.01, this.xScale().domain()[1] + this.xScale().domain()[1] * 0.01])
            : this.xScale().domain([-1,1]);

    if (this.yScale().domain()[0] === this.yScale().domain()[1])
        this.yScale().domain()[0] ?
            this.yScale().domain([this.yScale().domain()[0] + this.yScale().domain()[0] * 0.01, this.yScale().domain()[1] - this.yScale().domain()[1] * 0.01])
            : this.yScale().domain([-1,1]);

    this.defsEnter.append('clipPath')
        .attr('id', 'nv-chart-clip-path-' + this.id())
        .append('rect');

    this.wrap.select('#nv-chart-clip-path-' + this.id() + ' rect')
        .attr('width', availableWidth)
        .attr('height', availableHeight);

    this.g.attr('clip-path', this.clipEdge() ? 'url(#nv-chart-clip-path-' + this.id() + ')' : '');

    var bars = this.wrap.select('.nv-bars')
        .selectAll('.nv-bar')
        .data(function(d) { return d }, function(d,i) {return that.x()(d,i)});

    bars.exit().remove();

    var barsEnter = bars.enter().append('rect')
        //.attr('class', function(d,i,j) { return (getY(d,i) < 0 ? 'nv-bar negative' : 'nv-bar positive') + ' nv-bar-' + j + '-' + i })
        .attr('x', 0 )
        .attr('y', function(d) {  return nv.utils.NaNtoZero(that.yScale()(Math.max(0, that.y()(d)))) })
        .attr('height', function(d,i) { return nv.utils.NaNtoZero(Math.abs(that.yScale()(that.y()(d)) - that.yScale()(0))) })
        .attr('transform', function(d,i) { return 'translate(' + (that.xScale()(that.x()(d,i)) - availableWidth / data[0].values.length * .45) + ',0)'; })
        .on('mouseover', function(d,i) {
            if (!that.interactive()) return;
            d3.select(this).classed('hover', true);
            that.dispatch.elementMouseover({
                point: d,
                series: data[0],
                pos: [that.xScale()(that.x()(d,i)), that.yScale()(that.y()(d,i))],  // TODO: Figure out why the value appears to be shifted
                pointIndex: i,
                seriesIndex: 0,
                e: d3.event
            });
        })
        .on('mouseout', function(d,i) {
            if (!that.interactive()) return;
            d3.select(this).classed('hover', false);
            that.dispatch.elementMouseout({
                point: d,
                series: data[0],
                pointIndex: i,
                seriesIndex: 0,
                e: d3.event
            });
        })
        .on('click', function(d,i) {
            if (!that.interactive()) return;
            that.dispatch.elementClick({
                //label: d[label],
                value: that.y()(d,i),
                data: d,
                index: i,
                pos: [that.xScale()(that.x()(d,i)), that.yScale()(that.y()(d,i))],
                e: d3.event,
                id: that.id()
            });
            d3.event.stopPropagation();
        })
        .on('dblclick', function(d,i) {
            if (!that.interactive()) return;
            that.dispatch.elementDblClick({
                //label: d[label],
                value: that.y()(d,i),
                data: d,
                index: i,
                pos: [that.xScale()(that.x()(d,i)), that.yScale()(that.y()(d,i))],
                e: d3.event,
                id: that.id()
            });
            d3.event.stopPropagation();
        });

    bars
        .attr('fill', function(d, i) { return that._color()(d, i); })
        .attr('class', function(d,i,j) { return (that.y()(d,i) < 0 ? 'nv-bar negative' : 'nv-bar positive') + ' nv-bar-' + j + '-' + i })
        .transition()
        .attr('transform', function(d,i) { return 'translate(' + (that.xScale()(that.x()(d,i)) - availableWidth / data[0].values.length * .45) + ',0)'; })
        //TODO: better width calculations that don't assume always uniform data spacing;w
        .attr('width', (availableWidth / data[0].values.length) * .9 );

    bars.transition()
        .attr('y', function(d,i) {
            var rval = that.y()(d,i) < 0 ?
                that.yScale()(0) :
                that.yScale()(0) - that.yScale()(that.y()(d,i)) < 1 ?
                    that.yScale()(0) - 1 :
                    that.yScale()(that.y()(d,i));
            return nv.utils.NaNtoZero(rval);
        })
        .attr('height', function(d,i) { return nv.utils.NaNtoZero(Math.max(Math.abs(that.yScale()(that.y()(d,i)) - that.yScale()(0)),1)) });
};

HistoricalBar.prototype.color = function(_){
    if (!arguments.length) return this._color();
    this._color(nv.utils.getColor(_));
    return this;
};
/**
 * The historicalBar model returns a function wrapping an instance of a HistoricalBar.
 */
nv.models.historicalBar = function () {
    "use strict";

    var historicalBar = new HistoricalBar();

    function chart(selection) {
        historicalBar.render(selection);
        return chart;
    }

    chart.dispatch = historicalBar.dispatch;

    chart.options = nv.utils.optionsFunc.bind(chart);

    nv.utils.rebindp(chart, historicalBar, HistoricalBar.prototype,
        'x', 'y', 'width', 'height', 'margin', 'xScale', 'yScale', 'xDomain', 'yDomain', 'xRange', 'yRange',
        'forceX', 'forceY', 'padData', 'clipEdge', 'color', 'id', 'interactive'
    );

    return chart;
};
