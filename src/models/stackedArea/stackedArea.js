/************************************
 * offset:
 *   'wiggle' (stream)
 *   'zero' (stacked)
 *   'expand' (normalize to 100%)
 *   'silhouette' (simple centered)
 *
 * order:
 *   'inside-out' (stream)
 *   'default' (input order)
 ************************************/

var StackedAreaPrivates = {
    id : Math.floor(Math.random() * 100000) //Create semi-unique ID incase user doesn't selet one
    , offset : 'zero'
    , order : 'default'
    , interpolate : 'linear'  // controls the line interpolation
    , clipEdge : false // if true, masks lines within x and y scale
    , xScale: null //can be accessed via chart.xScale()
    , yScale: null //can be accessed via chart.yScale()
    , dataRaw: null
    , duration : 250
    , style : 'stack'
    , x: null
    , y: null
};


/**
 * A StackedArea
 */
function StackedArea(options){
    options = nv.utils.extend({}, options, StackedAreaPrivates, {
        margin: {top: 0, right: 0, bottom: 0, left: 0}
        , chartClass: 'stackedarea'
    });

    Layer.call(this, options,
        ['areaClick', 'areaMouseover', 'areaMouseout', 'tooltipShow', 'tooltipHide']
    );

    this.scatter = this.getScatter();
}

nv.utils.create(StackedArea, Layer, StackedAreaPrivates);

StackedArea.prototype.getScatter = function(){
    return nv.models.scatter();
};

/**
 * @override Layer::wrapper
 */
StackedArea.prototype.wrapper = function(data){
    Layer.prototype.wrapper.call(this, data, ['nv-areaWrap', 'nv-scatterWrap']);

    this.scatter
        .size(2.2) // default size
        .sizeDomain([2.2,2.2]) // all the same size by default
    ;

    this.renderWatch.models(this.scatter);
};

/**
 * @override Layer::draw
 */
StackedArea.prototype.draw = function(data){

    var that = this
        , dataFiltered = data.filter(function(series) {
            return !series.disabled;
        })
        , scatterWrap = null
        , area = null
        , zeroArea = null
        , path = null
        , mouseEventObject = function(d){
            return {
                point : d,
                series: d.key,
                pos   : [d3.event.pageX, d3.event.pageY],
                seriesIndex: d.seriesIndex
            }
        };

    this.xScale(this.scatter.xScale());
    this.yScale(this.scatter.yScale());
    this.x(this.scatter.x());
    this.y(this.scatter.y());

    this.dataRaw(data);

    // Injecting point index into each point because d3.layout.stack().out does not give index
    data.forEach(function(aseries, i) {
        aseries.seriesIndex = i;
        aseries.values = aseries.values.map(function(d, j) {
            d.index = j;
            d.seriesIndex = i;
            return d;
        });
    });

    data = d3.layout.stack()
        .order(this.order())
        .offset(this.offset())
        .values(function(d) { return d.values })  //TODO: make values customizeable in EVERY model in this fashion
        .x(this.x())
        .y(this.y())
        .out(function(d, y0, y) {
            var yHeight = (that.y()(d) === 0) ? 0 : y;
            d.display = {
                y: yHeight,
                y0: y0
            };
        })
        (dataFiltered);

    this.scatter
        .width(this.available.width)
        .height(this.available.height)
        .x(this.x())
        .y(function(d) { return d.display.y + d.display.y0 })
        .forceY([0])
        .color(data.map(function(d) {
            return d.color || that.color()(d, d.seriesIndex);
        }));

    scatterWrap = this.g.select('.nv-scatterWrap')
        .datum(data);
    scatterWrap.call(this.scatter);

    this.defsEnter.append('clipPath')
        .attr('id', 'nv-edge-clip-' + this.id())
        .append('rect');

    this.wrap.select('#nv-edge-clip-' + this.id() + ' rect')
        .attr('width', this.available.width)
        .attr('height', this.available.height);

    this.g.attr('clip-path', this.clipEdge() ? 'url(#nv-edge-clip-' + this.id() + ')' : '');

    area = d3.svg.area()
        .x(function(d)  { return that.xScale()(that.x()(d)) })
        .y0(function(d) { return that.yScale()(d.display.y0) })
        .y1(function(d) { return that.yScale()(d.display.y + d.display.y0) })
        .interpolate(this.interpolate());

    zeroArea = d3.svg.area()
        .x(function(d)  { return that.xScale()(that.x()(d)) })
        .y0(function(d) { return that.yScale()(d.display.y0) })
        .y1(function(d) { return that.yScale()(d.display.y0) });

    path = this.g.select('.nv-areaWrap').selectAll('path.nv-area')
        .data(data);

    path.enter().append('path')
        .attr('class', function(d,i) { return 'nv-area nv-area-' + i })
        .attr('d', function(d){ return zeroArea(d.values, d.seriesIndex) })
        .on('mouseover', function(d) {
            d3.select(this).classed('hover', true);
            that.dispatch.areaMouseover( mouseEventObject(d) );
        })
        .on('mouseout', function(d) {
            d3.select(this).classed('hover', false);
            that.dispatch.areaMouseout( mouseEventObject(d) );
        })
        .on('click', function(d) {
            d3.select(this).classed('hover', false);
            that.dispatch.areaClick( mouseEventObject(d) );
        });

    path.exit().remove();

    path.style('fill', function(d){ return d.color || that.color()(d, d.seriesIndex) })
        .style('stroke', function(d){ return d.color || that.color()(d, d.seriesIndex) });
    path.watchTransition(this.renderWatch,'stackedArea path')
        .attr('d', function(d,i) { return area(d.values,i) });
};

/**
 * @override Layer::attachEvents
 */
StackedArea.prototype.attachEvents = function(){
    Layer.prototype.attachEvents.call(this);

    var _mouseEventSelector = function(e){
        return '.nv-chart-' + this.id() + ' .nv-area-' + e.seriesIndex
    }.bind(this);

    this.dispatch.on('tooltipShow', function(e) {
        if (this.options.tooltips) this.showTooltip(e);
    }.bind(this));

    this.dispatch.on('tooltipHide', function() {
        if (this.options.tooltips) nv.tooltip.cleanup();
    }.bind(this));

    this.scatter.dispatch
        .on('elementMouseover.area', function(e) {
            this.g.select( _mouseEventSelector(e) )
                .classed('hover', true);
        }.bind(this))
        .on('elementMouseout.area', function(e) {
            this.g.select( _mouseEventSelector(e) )
                .classed('hover', false);
        }.bind(this))
        .on('elementClick.area', function(e) {
            this.dispatch.areaClick(e);
        }.bind(this))
/*        .on('elementMouseover.tooltip', function(e) {
            e.pos = [e.pos[0] + this.margin().left, e.pos[1] + this.margin().top];
            this.dispatch.tooltipShow(e);
        }.bind(this))
        .on('elementMouseout.tooltip', function(e) {
            this.dispatch.tooltipHide(e);
        }.bind(this))*/;
};

StackedArea.prototype.style = function(_) { //shortcut for offset + order
    if (!arguments.length) return this.options.style;
    this.options.style = _;

    switch (_) {
        case 'stack':
            this.offset('zero');
            this.order('default');
            break;
        case 'stream':
            this.offset('wiggle');
            this.order('inside-out');
            break;
        case 'stream-center':
            this.offset('silhouette');
            this.order('inside-out');
            break;
        case 'expand':
            this.offset('expand');
            this.order('default');
            break;
        case 'stack_percent':
            this.offset(this.d3_stackedOffset_stackPercent);
            this.order('default');
            break;
    }

    return this;
};

StackedArea.prototype.duration = function(_) {
    if (!arguments.length) return this.options.duration;
    this.options.duration = _;
    this.renderWatch.reset(_);
    this.scatter.duration(_);
    return this;
};

//============================================================
//Special offset functions
StackedArea.prototype.d3_stackedOffset_stackPercent = function(stackData) {
    var n = stackData.length,    //How many series
        m = stackData[0].length,     //how many points per series
        k = 1 / n,
        y0 = [],
        i, j, o;

    for (j = 0; j < m; ++j) { //Looping through all points
        for (i = 0, o = 0; i < this.dataRaw().length; i++)  //looping through series'
            o += this.y()(this.dataRaw()[i].values[j])   //total value of all points at a certian point in time.

        if (o) for (i = 0; i < n; i++)
            stackData[i][j][1] /= o;
        else
            for (i = 0; i < n; i++)
                stackData[i][j][1] = k;
    }
    for (j = 0; j < m; ++j) y0[j] = 0;
    return y0;
};

/**
 * The stackedArea model returns a function wrapping an instance of a StackedArea.
 */
nv.models.stackedArea = function () {
    "use strict";

    var stackedArea = new StackedArea(),
        api = [
            'margin',
            'width',
            'height',
            'clipEdge',
            'offset',
            'order',
            'color',
            'style',
            'interpolate'
        ];

    function chart(selection) {
        stackedArea.render(selection);
        return chart;
    }

    chart.dispatch = stackedArea.dispatch;
    chart.scatter = stackedArea.scatter;

    d3.rebind(chart, stackedArea.scatter,
        'x',
        'y',
        'interactive',
        'size',
        'xScale',
        'yScale',
        'zScale',
        'xDomain',
        'yDomain',
        'xRange',
        'yRange',
        'sizeDomain',
        'forceX',
        'forceY',
        'forceSize',
        'clipVoronoi',
        'useVoronoi',
        'clipRadius',
        'highlightPoint',
        'clearHighlights'
    );

    chart.options = nv.utils.optionsFunc.bind(chart);

    nv.utils.rebindp(chart, stackedArea, StackedArea.prototype, api);

    return chart;
};
