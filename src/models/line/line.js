var LinePrivates = {
    isArea : function(d) { return d.area } // decides if a line is an area or just a line
    , clipEdge : false // if true, masks lines within x and y scale
    , interpolate : "linear" // controls the line interpolation
    , xScale: null
    , yScale: null
    , xScale0: null
    , yScale0: null
    , duration: 250
    , interactive: null
    , x: null
    , y: null
    , id: null
};

/**
 * A Line Chart
 */
function Line(options) {
    options = nv.utils.extend({}, options, LinePrivates, {
        margin: {top: 0, right: 0, bottom: 0, left: 0}
        , width: 960
        , height: 500
        , chartClass: 'line'
        , wrapClass: 'scatterWrap'
    });
    Layer.call(this, options, []);

    this.scatter = this.getScatter()
        .size(16) // default size
        .sizeDomain([16,256]) //set to speed up calculation, needs to be unset if there is a custom size accessor
    ;

    this.scatter.size();
}

nv.utils.create(Line, Layer, LinePrivates);

Line.prototype.getScatter = function(){
    return nv.models.scatter();
};

/**
 * @override Layer::wrapper
 */
Line.prototype.wrapper = function(data){
    Layer.prototype.wrapper.call(this, data, [ 'nv-groups' ]);
};

/**
 * override Layer::draw
 * @param data
 */
Line.prototype.draw = function(data){

    var that = this,
        availableWidth = this.available.width,
        availableHeight = this.available.height,
        scatterWrap = this.wrap.select('.nv-scatterWrap');

    this.scatter
        .width(availableWidth)
        .height(availableHeight);

    this.scatter.width();

    scatterWrap.transition().call(this.scatter);

    this.x(this.scatter.x());
    this.y(this.scatter.y());
    this.color(this.scatter.color());
    this.id(this.scatter.id());

    this.xScale(this.scatter.xScale());
    this.yScale(this.scatter.yScale());
    this.xScale0(this.xScale0() || this.xScale());
    this.yScale0(this.yScale0() || this.yScale());

    this.defsEnter.append('clipPath')
        .attr('id', 'nv-edge-clip-' + this.id())
        .append('rect');

    this.wrap.select('#nv-edge-clip-' + this.id() + ' rect')
        .attr('width', availableWidth)
        .attr('height', (availableHeight > 0) ? availableHeight : 0);

    this.g.attr('clip-path', this.clipEdge() ? 'url(#nv-edge-clip-' + this.id() + ')' : '');
    scatterWrap.attr('clip-path', this.clipEdge() ? 'url(#nv-edge-clip-' + this.id() + ')' : '');

    var groups = this.wrap
        .select('.nv-groups')
        .selectAll('.nv-group')
        .data(function(d) { return d }, function(d) { return d.key });

    groups.enter().append('g')
        .style('stroke-opacity', this.opacityDefault())
        .style('fill-opacity', this.opacityDefault());

    groups.exit().remove();

    groups
        .attr('class', function(d,i) { return 'nv-group nv-series-' + i })
        .classed('hover', function(d) { return d.hover })
        .style('fill', function(d,i){ return that.color()(d, i) })
        .style('stroke', function(d,i){ return that.color()(d, i)});

    groups.watchTransition(this.renderWatch, 'line: groups')
        .style('stroke-opacity', 1)
        .style('fill-opacity', .5);

    var areaPaths = groups.selectAll('path.nv-area')
        .data(function(d) { return that.isArea()(d) ? [d] : [] }); // this is done differently than lines because I need to check if series is an area
    areaPaths.enter().append('path')
        .attr('class', 'nv-area')
        .attr('d', function(d) {
            return d3.svg.area()
                .interpolate(that.interpolate())
                .defined(that.defined)
                .x(function(d,i) { return nv.utils.NaNtoZero(that.xScale0()(that.x()(d,i))) })
                .y0(function(d,i) { return nv.utils.NaNtoZero(that.yScale0()(that.y()(d,i))) })
                .y1(function() { return that.yScale0()( that.yScale().domain()[0] <= 0 ? that.yScale().domain()[1] >= 0 ? 0 : that.yScale().domain()[1] : that.yScale().domain()[0] ) })
                //.y1(function(d,i) { return yScale0(0) }) //assuming 0 is within y domain.. may need to tweak this
                .apply(that, [d.values])
        });
    groups.exit().selectAll('path.nv-area')
        .remove();

    areaPaths.watchTransition(this.renderWatch, 'line: areaPaths')
        .attr('d', function(d) {
            return d3.svg.area()
                .interpolate(that.interpolate())
                .defined(that.defined)
                .x(function(d,i) { return nv.utils.NaNtoZero(that.xScale()(that.x()(d,i))) })
                .y0(function(d,i) { return nv.utils.NaNtoZero(that.yScale()(that.y()(d,i))) })
                .y1(function() { return that.yScale()( that.yScale().domain()[0] <= 0 ? that.yScale().domain()[1] >= 0 ? 0 : that.yScale().domain()[1] : that.yScale().domain()[0] ) })
                //.y1(function(d,i) { return yScale0(0) }) //assuming 0 is within y domain.. may need to tweak this
                .apply(that, [d.values])
        });

    var linePaths = groups.selectAll('path.nv-'+this.options.chartClass)
        .data(function(d) { return [d.values] });
    linePaths.enter().append('path')
        .attr('class', ('nv-'+this.options.chartClass))
        .attr('d',
            d3.svg.line()
                .interpolate(this.interpolate())
                .defined(function(d, i){ return !isNaN(that.y()(d, i)) && (that.y()(d, i) !== null) })
                .x(function(d,i) { return nv.utils.NaNtoZero(that.xScale0()(that.x()(d,i))) })
                .y(function(d,i) { return nv.utils.NaNtoZero(that.yScale0()(that.y()(d,i))) })
        );

    linePaths.watchTransition(this.renderWatch, 'line: linePaths')
        .attr('d',
            d3.svg.line()
                .interpolate(this.interpolate())
                .defined(function(d,i){ return !isNaN(that.y()(d,i)) && (that.y()(d,i) !== null) })
                .x(function(d,i) { return nv.utils.NaNtoZero(that.xScale()(that.x()(d,i))) })
                .y(function(d,i) { return nv.utils.NaNtoZero(that.yScale()(that.y()(d,i))) })
        );

    //store old scales for use in transitions on update
    that.xScale0(this.xScale().copy());
    that.yScale0(this.yScale().copy());
};

/**
 * @override Layer::attachEvents
 */
Line.prototype.attachEvents = function(){
    Layer.prototype.attachEvents.call(this);

    // Pass through scatter dispatch events,
    // required for renderWatch to dispatch properly
    this.scatter.dispatch
        .on('elementClick', function(){
            this.dispatch.elementClick.apply(this, arguments);
        }.bind(this))
        .on('elementMouseover', function(){
            this.dispatch.elementMouseover.apply(this, arguments);
        }.bind(this))
        .on('elementMouseout', function(){
            this.dispatch.elementMouseout.apply(this, arguments);
        }.bind(this))
};

Line.prototype.duration = function(_) {
    if (!arguments.length) return this.options.duration;
    this.options.duration = _;
    this.scatter.duration(_);
    this.renderWatch.reset(_);
    return this;
};

// allows a line to be not continuous when it is not defined
Line.prototype.defined = function(d, i) {
    return !isNaN(this.y()(d,i)) && (this.y()(d,i) !== null)
};

/**
 * The line model returns a function wrapping an instance of a Line.
 */
nv.models.line = function () {
    "use strict";

    var line = new Line(),
        api = [
            'margin',
            'width',
            'height',
            'interpolate',
            'isArea',
            'duration',
            'transitionDuration'
        ];

    function chart(selection) {
        line.render(selection);
        return chart;
    }

    d3.rebind(chart, line.scatter,
        'x',
        'y',
        'xScale',
        'yScale',
        'zScale',
        'xDomain',
        'yDomain',
        'xRange',
        'yRange',
        'id',
        'interactive',
        'size',
        'sizeDomain',
        'forceX',
        'forceY',
        'forceSize',
        'clipVoronoi',
        'useVoronoi',
        'clipRadius',
        'padData',
        'highlightPoint',
        'clearHighlights',
        'clipEdge',
        'color'
    );

    chart.dispatch = line.dispatch;
    chart.scatter = line.scatter;

    chart.options = nv.utils.optionsFunc.bind(chart);

    chart.xScale();

    nv.utils.rebindp(chart, line, Line.prototype, api);

    return chart;
};
