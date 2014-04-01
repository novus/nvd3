var LinePrivates = {
    color : nv.utils.defaultColor() // a function that returns a color
    , isArea : function(d) { return d.area } // decides if a line is an area or just a line
    , clipEdge : false // if true, masks lines within x and y scale
    , interpolate : "linear" // controls the line interpolation
    , duration : null
    , xScale: null
    , yScale: null
    , x: function(d){return d.x;}
    , y: function(d){return d.y;}
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
    });

    this.scatter = this.getScatter()
        .size(16) // default size
        .sizeDomain([16,256]) //set to speed up calculation, needs to be unset if there is a custom size accessor
    ;
    this.defined = function(d,i) {  // allows a line to be not continuous when it is not defined
        return !isNaN(getY(d,i)) && getY(d,i) !== null
    };
    this._color = nv.utils.defaultColor();
    this._duration = 250;

    Layer.call(this, options, [ 'elementClick', 'elementMouseover', 'elementMouseout', 'renderEnd' ]);
}

nv.utils.create(Line, Layer, LinePrivates);

Line.prototype.getScatter = function(){
    return nv.models.scatter();
};

Line.prototype.wrapper = function(data){
    Layer.prototype.wrapper.call(this, data, [ 'nv-groups', 'nv-scatterWrap' ]);
};

Line.prototype.draw = function(data){
    var x0, y0 //used to store previous scales
    ;

    var that = this,
        availableWidth = this.available.width,
        availableHeight = this.available.height;

    this.xScale(this.scatter.xScale());
    this.yScale(this.scatter.yScale());

    x0 = x0 || this.xScale();
    y0 = y0 || this.yScale();

    this.scatter
        .width(availableWidth)
        .height(availableHeight);

    var scatterWrap = this.wrap.select('.nv-scatterWrap');
    scatterWrap.transition().call(this.scatter);

    this.defsEnter.append('clipPath')
        .attr('id', 'nv-edge-clip-' + this.scatter.id())
        .append('rect');

    this.wrap.select('#nv-edge-clip-' + this.scatter.id() + ' rect')
        .attr('width', availableWidth)
        .attr('height', (availableHeight > 0) ? availableHeight : 0);

    this.g.attr('clip-path', this.clipEdge() ? 'url(#nv-edge-clip-' + this.scatter.id() + ')' : '');
    scatterWrap
        .attr('clip-path', this.clipEdge() ? 'url(#nv-edge-clip-' + this.scatter.id() + ')' : '');

    var groups = this.wrap.select('.nv-groups').selectAll('.nv-group')
        .data(function(d) { return d }, function(d) { return d.key });
    groups.enter().append('g')
        .style('stroke-opacity', 1e-6)
        .style('fill-opacity', 1e-6);

    groups.exit().remove();

    groups
        .attr('class', function(d,i) { return 'nv-group nv-series-' + i })
        .classed('hover', function(d) { return d.hover })
        .style('fill', function(d,i){ return that._color(d, i) })
        .style('stroke', function(d,i){ return that._color(d, i)});

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
                .defined(that.defined())
                .x(function(d,i) { return nv.utils.NaNtoZero(x0(that.x()(d,i))) })
                .y0(function(d,i) { return nv.utils.NaNtoZero(y0(that.y()(d,i))) })
                .y1(function() { return y0( that.yScale().domain()[0] <= 0 ? that.yScale().domain()[1] >= 0 ? 0 : that.yScale().domain()[1] : that.yScale().domain()[0] ) })
                //.y1(function(d,i) { return y0(0) }) //assuming 0 is within y domain.. may need to tweak this
                .apply(this, [d.values])
        });
    groups.exit().selectAll('path.nv-area')
        .remove();

    areaPaths.watchTransition(this.renderWatch, 'line: areaPaths')
        .attr('d', function(d) {
            return d3.svg.area()
                .interpolate(that.interpolate())
                .defined(that.defined())
                .x(function(d,i) { return nv.utils.NaNtoZero(x(that.x()(d,i))) })
                .y0(function(d,i) { return nv.utils.NaNtoZero(y(that.y()(d,i))) })
                .y1(function() { return that.yScale()( that.yScale().domain()[0] <= 0 ? that.yScale().domain()[1] >= 0 ? 0 : that.yScale().domain()[1] : that.yScale().domain()[0] ) })
                //.y1(function(d,i) { return y0(0) }) //assuming 0 is within y domain.. may need to tweak this
                .apply(this, [d.values])
        });

    var linePaths = groups.selectAll('path.nv-'+this.options.chartClass)
        .data(function(d) { return [d.values] });
    linePaths.enter().append('path')
        .attr('class', 'nv-'+this.options.chartClass)
        .attr('d',
            d3.svg.line()
                .interpolate(this.interpolate())
                .defined(this.defined())
                .x(function(d,i) { return nv.utils.NaNtoZero(x0(this.x()(d,i))) })
                .y(function(d,i) { return nv.utils.NaNtoZero(y0(this.y()(d,i))) })
        );

    linePaths.watchTransition(this.renderWatch, 'line: linePaths')
        .attr('d',
            d3.svg.line()
                .interpolate(this.interpolate())
                .defined(this.defined())
                .x(function(d,i) { return nv.utils.NaNtoZero(x(this.x()(d,i))) })
                .y(function(d,i) { return nv.utils.NaNtoZero(y(this.y()(d,i))) })
        );

    //store old scales for use in transitions on update
    x0 = x.copy();
    y0 = y.copy();
};

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

Line.prototype.x = function(_) {
    if (!arguments.length) return this.x();
    this.x(_);
    this.scatter.x(_);
    return chart;
};

Line.prototype.y = function(_) {
    if (!arguments.length) return this.y();
    this.y(_);
    this.scatter.y(_);
    return this;
};

Line.prototype.color = function(_) {
    if (!arguments.length) return this._color;
    this._color = nv.utils.getColor(_);
    this.scatter.color(this._color);
    return this;
};

Line.prototype.isArea = function(_) {
    if (!arguments.length) return this.isArea();
    this.isArea(d3.functor(_));
    return this;
};

Line.prototype.transitionDuration = function(_) {
    nv.deprecated('line.transitionDuration');
    return this.duration(_);
};

Line.prototype.duration = function(_) {
    if (!arguments.length) return this._duration;
    this.duration = _;
    this.renderWatch.reset(this._duration);
    this.scatter.duration(this._duration);
    return chart;
};

/**
 * The line model returns a function wrapping an instance of a Line.
 */
nv.models.line = function () {
    "use strict";

    var line = new Line();

    function chart(selection) {
        line.render(selection);
        return chart;
    }

    d3.rebind(chart, line.scatter,
        'id', 'interactive', 'size', 'xScale', 'yScale', 'zScale', 'xDomain', 'yDomain', 'xRange', 'yRange',
        'sizeDomain', 'forceX', 'forceY', 'forceSize', 'clipVoronoi', 'useVoronoi', 'clipRadius', 'padData',
        'highlightPoint','clearHighlights'
    );

    chart.dispatch = line.dispatch;
    chart.scatter = line.scatter;
    chart.options = nv.utils.optionsFunc.bind(chart);

    nv.utils.rebindp(chart, line, Line.prototype,
        'margin', 'width', 'height', 'clipEdge', 'interpolate', 'defined', 'x', 'y', 'color', 'isArea',
        'transitionDuration', 'duration'
    );

    return chart;
};
