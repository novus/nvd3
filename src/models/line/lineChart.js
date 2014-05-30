var LineChartPrivates = {
    defaultState: null
    , xScale: null
    , yScale: null
    , useVoronoi: null
    , tooltips: true
    , duration: 250
    , useInteractiveGuideline: false
    , state: null
    , x: function(d){return d.x}
    , y: function(d){return d.y}
    , id: null
    , isArea: null
    , size: null
    , xDomain: null
    , yDomain: null
    , xRange: null
    , yRange: null
    , forceX: null
    , forceY: null
    , clipEdge: null
    , clipVoronoi: null
    , interpolate: null
    , interactive: null
    , tooltip: function(key, x, y) {
        return '<h3>' + key + '</h3>' +
        '<p>' +  y + ' at ' + x + '</p>'
    }
};

/**
 * A Pie Chart draws a percentage data set, in a circular display.
 */
function LineChart(options){
    options = nv.utils.extend({}, options, LineChartPrivates, {
        margin: { top: 30, right: 20, bottom: 50, left: 60 },
        chartClass: 'lineChart',
        wrapClass: 'linesWrap'
    });
    Chart.call(this, options);

    this.line = this.getLine();
    this.interactiveLayer = this.getInteractiveLayer();
    this.state = this.getStateManager();
}

nv.utils.create(LineChart, Chart, LineChartPrivates);

LineChart.prototype.getLine = function(){
    return nv.models.line();
};

LineChart.prototype.getInteractiveLayer = function(){
    return nv.interactiveGuideline();
};

/**
 * @override Chart::wrapper
 */
LineChart.prototype.wrapper = function(data){
    Chart.prototype.wrapper.call(this, data, [ 'nv-interactive' ]);
    this.renderWatch.models(this.line);
    if (this.showXAxis()) this.renderWatch.models(this.xAxis);
    if (this.showYAxis()) this.renderWatch.models(this.yAxis);
};

/**
 * @override Chart::draw
 */
LineChart.prototype.draw = function(data){

    var that = this,
        availableWidth = this.available.width,
        availableHeight = this.available.height;

    this.xScale(this.line.xScale());
    this.yScale(this.line.yScale());
    this.x(this.line.x());
    this.y(this.line.y());
    this.id(this.line.id());

    this.line
        .width(availableWidth)
        .height(availableHeight)
        .color(
        data
            .map( function(d,i){return d.color || that.color()(d, i)} )
            .filter( function(d,i) { return !data[i].disabled } )
    );

    var linesWrap = this.g.select('.nv-linesWrap')
        .datum(data.filter(function(d) { return !d.disabled }))
        .transition()
        .call(this.line);

    if (this.useInteractiveGuideline()) {
        this.interactiveLayer
            .width(availableWidth)
            .height(availableHeight)
            .margin({ left: this.margin().left, top: this.margin().top })
            .svgContainer(this.svg)
            .xScale(this.xScale());
        this.wrap.select(".nv-interactive")
            .call(this.interactiveLayer);
        this.wrap.select(".nv-interactiveLineLayer")
            .attr("transform", "translate(0,0)");
    }

    Chart.prototype.draw.call(this, data);
};

/**
 * @override Chart::attachEvents
 */
LineChart.prototype.attachEvents = function(){
    Chart.prototype.attachEvents.call(this);

    var that = this,
        data = null;

    that.svg.call(function(selection){
        selection.each(function(d){
            data = d;
        });
    });

    this.legend.dispatch.on('stateChange', function(newState) {
        that.state = newState;
        that.dispatch.stateChange(that.state);
        that.update();
    });

    this.interactiveLayer.dispatch
        .on('elementMousemove', function(e) {
            that.line.clearHighlights();
            var singlePoint,
                pointIndex,
                pointXLocation,
                allData = [],
                xValue = null;

            data.filter(function(series, i) { series.seriesIndex = i; return !series.disabled; })
                .forEach(function(series,i) {
                    pointIndex = nv.interactiveBisect(series.values, e.pointXValue, that.x());
                    that.line.highlightPoint(i, pointIndex, true);
                    var point = series.values[pointIndex];
                    if (typeof point === 'undefined') return;
                    if (typeof singlePoint === 'undefined') singlePoint = point;
                    if (typeof pointXLocation === 'undefined') pointXLocation = that.xScale()(that.x()(point, pointIndex));
                    allData.push({
                        key: series.key,
                        value: that.y()(point, pointIndex),
                        color: that.color()(series, series.seriesIndex)
                    });
                });
            //Highlight the tooltip entry based on which point the mouse is closest to.
            if (allData.length > 2) {
                var yValue = that.yScale().invert(e.mouseY);
                var domainExtent = Math.abs(that.yScale().domain()[0] - that.yScale().domain()[1]);
                var threshold = 0.03 * domainExtent;
                var indexToHighlight = nv.nearestValueIndex(allData.map(function(d){return d.value}),yValue,threshold);
                if (indexToHighlight !== null)
                    allData[indexToHighlight].highlight = true;
            }
            xValue = that.xAxis.tickFormat()(that.x()(singlePoint, pointIndex));
            that.interactiveLayer.tooltip
                .position({
                    left: pointXLocation + that.margin().left,
                    top: e.mouseY + that.margin().top
                })
                .chartContainer(that.svg[0][0].parentNode)
                .enabled(that.tooltips())
                .valueFormatter(function(d) {
                    return that.yAxis.tickFormat()(d);
                })
                .data({
                    value: xValue,
                    series: allData
                })();

            that.interactiveLayer.renderGuideLine()(pointXLocation);
        })
        .on("elementMouseout",function() {
            that.dispatch.tooltipHide();
            that.line.clearHighlights();
        });

    this.dispatch
        .on('tooltipShow', function(e) {
            if (that.tooltips())
                that.showTooltip(e, that.svg[0][0].parentNode)
        })
        .on('changeState', function(e) {
            if (typeof e.disabled !== 'undefined' && data.length === e.disabled.length) {
                that.svg.call(function(selection){
                    selection.each(function(data){
                        data.forEach(function(series,i) {
                            series.disabled = e.disabled[i];
                        });
                    });
                });
                that.state.disabled = e.disabled;
            }
            that.update();
        })
        .on('tooltipHide', function() {
            if (that.tooltips()) nv.tooltip.cleanup();
        });

    this.line.dispatch
        .on('elementMouseover.tooltip', function(e) {
            e.pos = [e.pos[0] +  that.margin().left, e.pos[1] + that.margin().top];
            that.dispatch.tooltipShow(e);
        })
        .on('elementMouseout.tooltip', function(e) {
            that.dispatch.tooltipHide(e);
        });
};

LineChart.prototype.duration = function(_) {
    if (!arguments.length) return this.options.duration;
    this.options.duration = _;
    this.renderWatch.reset(_);
    this.line.duration(_);
    this.xAxis.duration(_);
    this.yAxis.duration(_);
    return this;
};

LineChart.prototype.color = function(_) {
    if (!arguments.length) return this.options.color;
    this.options.color = nv.utils.getColor(_);
    this.legend.color( this.color() );
    this.line.color( this.color() );
    return this;
};

LineChart.prototype.useInteractiveGuideline = function(_) {
    if(!arguments.length) return this.options.useInteractiveGuideline;
    this.options.useInteractiveGuideline = _;
    if (_ === true) {
        this.interactive(false);
        this.useVoronoi(false);
    }
    return this;
};

LineChart.prototype.interactive = function(_){
    if(!arguments.length) return this.options.interactive;
    this.options.interactive = _;
    this.line.interactive(_);
    return this;
};

LineChart.prototype.useVoronoi = function(_){
    if(!arguments.length) return this.options.useVoronoi;
    this.options.useVoronoi = _;
    this.line.useVoronoi(_);
    return this;
};

LineChart.prototype.showTooltip = function(e, offsetElement) {
    var left = e.pos[0] + ( offsetElement.offsetLeft || 0 ),
        top = e.pos[1] + ( offsetElement.offsetTop || 0),
        x = this.xAxis.tickFormat()(this.line.x()(e.point, e.pointIndex)),
        y = this.yAxis.tickFormat()(this.line.y()(e.point, e.pointIndex)),
        content = this.tooltip()(e.series.key, x, y);
    nv.tooltip.show([left, top], content, null, null, offsetElement);
};

/**
 * The lineChart model returns a function wrapping an instance of a LineChart.
 */
nv.models.lineChart = function() {
    "use strict";

    var lineChart = new LineChart(),
        api = [
            'margin',
            'width',
            'height',
            'color',
            'showXAxis',
            'showYAxis',
            'tooltips',
            'tooltipContent',
            'state',
            'defaultState',
            'noData',
            'duration',
            'transitionDuration',
            'useInteractiveGuideline',
            'reduceXTicks',
            'rightAlignYAxis'
        ];

    function chart(selection) {
        lineChart.render(selection);
        return chart;
    }

    d3.rebind(chart, lineChart.line,
        'isArea',
        'x',
        'y',
        'size',
        'xScale',
        'yScale',
        'xDomain',
        'yDomain',
        'xRange',
        'yRange',
        'forceX',
        'forceY',
        'interactive',
        'clipEdge',
        'clipVoronoi',
        'useVoronoi',
        'id',
        'interpolate'
    );

    chart.dispatch = lineChart.dispatch;
    chart.lines = lineChart.line;
    chart.legend = lineChart.legend;
    chart.interactiveLayer = lineChart.interactiveLayer;
    chart.state = lineChart.state;
    chart.xAxis = lineChart.xAxis;
    chart.yAxis = lineChart.yAxis;

    chart.options = nv.utils.optionsFunc.bind(chart);

    nv.utils.rebindp(chart, lineChart, LineChart.prototype, api);

    return chart;
};
