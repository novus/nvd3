var LineChartPrivates = {
    defaultState: null,
    xScale: null,
    yScale: null,
    interactive: null,
    useVoronoi: null,
    tooltips: true,
    duration: 250,
    useInteractiveGuideline: false,
    state: null
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
 * @override Layer::wrapper
 */
LineChart.prototype.wrapper = function(data){
    Chart.prototype.wrapper.call(this, data, [ 'nv-interactive' ]);
    this.renderWatch = nv.utils.renderWatch(this.dispatch, this.duration());
    this.renderWatch.models(this.line);
    if (this.showXAxis()) this.renderWatch.models(this.xAxis);
    if (this.showYAxis()) this.renderWatch.models(this.yAxis);
};

/**
 * @override Layer::attachEvents
 */
LineChart.prototype.attachEvents = function(){
    Layer.prototype.attachEvents.call(this);

    this.legend.dispatch.on('stateChange', function(newState) {
        this.state = newState;
        this.dispatch.stateChange(this.state);
        this.update();
    }.bind(this));

    this.interactiveLayer.dispatch
        .on('elementMousemove', function(e) {
            this.line.clearHighlights();
            var singlePoint, pointIndex, pointXLocation, allData = [];
            this.svg.call(function(selection){
                selection.each(function(data){
                    data.filter(function(series, i) { series.seriesIndex = i; return !series.disabled; })
                        .forEach(function(series,i) {
                            pointIndex = nv.interactiveBisect(series.values, e.pointXValue, this.x());
                            this.line.highlightPoint(i, pointIndex, true);
                            var point = series.values[pointIndex];
                            if (typeof point === 'undefined') return;
                            if (typeof singlePoint === 'undefined') singlePoint = point;
                            if (typeof pointXLocation === 'undefined') pointXLocation = this.xScale()(this.x()(point,pointIndex));
                            allData.push({
                                key: series.key,
                                value: this.y()(point, pointIndex),
                                color: this.color(series, series.seriesIndex)
                            });
                        }.bind(this));
                });
            });
            //Highlight the tooltip entry based on which point the mouse is closest to.
            if (allData.length > 2) {
                var yValue = this.yScale().invert(e.mouseY);
                var domainExtent = Math.abs(this.yScale().domain()[0] - this.yScale().domain()[1]);
                var threshold = 0.03 * domainExtent;
                var indexToHighlight = nv.nearestValueIndex(allData.map(function(d){return d.value}),yValue,threshold);
                if (indexToHighlight !== null)
                    allData[indexToHighlight].highlight = true;
            }
            var xValue = this.xAxis.tickFormat()(this.x()(singlePoint, pointIndex));
            this.interactiveLayer.tooltip
                .position({
                    left: pointXLocation + this.margin().left,
                    top: e.mouseY + this.margin().top
                })
                .chartContainer(this.svg[0][0].parentNode)
                .enabled(this.tooltips)
                .valueFormatter(function(d) {
                    return this.yAxis.tickFormat()(d);
                }.bind(this))
                .data({
                    value: xValue,
                    series: allData
                })();

            this.interactiveLayer.renderGuideLine()(pointXLocation);
        }.bind(this))
        .on("elementMouseout",function() {
            this.dispatch.tooltipHide();
            this.line.clearHighlights();
        }.bind(this));

    this.dispatch
        .on('tooltipShow', function(e) {
            if (this.tooltips())
                this.showTooltip(e, this.svg[0][0].parentNode)
        }.bind(this))
        .on('changeState', function(e) {
            if (typeof e.disabled !== 'undefined' && data.length === e.disabled.length) {
                this.svg.call(function(selection){
                    selection.each(function(data){
                        data.forEach(function(series,i) {
                            series.disabled = e.disabled[i];
                        });
                    });
                });
                this.state.disabled = e.disabled;
            }
            this.update();
        }.bind(this))
        .on('tooltipHide', function() {
            if (this.tooltips()) nv.tooltip.cleanup();
        }.bind(this));

    this.line.dispatch
        .on('elementMouseover.tooltip', function(e) {
            e.pos = [e.pos[0] +  this.margin().left, e.pos[1] + this.margin().top];
            this.dispatch.tooltipShow(e);
        }.bind(this))
        .on('elementMouseout.tooltip', function(e) {
            this.dispatch.tooltipHide(e);
        }.bind(this));
};

/**
 * @override Layer::draw
 */
LineChart.prototype.draw = function(data){

    var that = this,
        availableWidth = this.available.width,
        availableHeight = this.available.height;

    this.xScale(this.line.xScale());
    this.yScale(this.line.yScale());

    if (this.useInteractiveGuideline()) {
        this.interactiveLayer
            .width(availableWidth)
            .height(availableHeight)
            .margin({
                left: this.margin().left,
                top: this.margin().top
            })
            .svgContainer(this.svg)
            .xScale(this.xScale());
        this.wrap.select(".nv-interactive")
            .call(this.interactiveLayer);
    }

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

    Chart.prototype.draw.call(this, data);
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

    chart.dispatch = lineChart.dispatch;
    chart.lines = lineChart.line;
    chart.legend = lineChart.legend;
    chart.interactiveLayer = lineChart.interactiveLayer;
    chart.state = lineChart.state;
    chart.xAxis = lineChart.xAxis;
    chart.yAxis = lineChart.yAxis;

    d3.rebind(chart, lineChart.line,
        'margin',
        'width',
        'height',
        'interpolate',
        'isArea',
        'duration',
        'transitionDuration',
        'x',
        'y'
    );

    chart.options = nv.utils.optionsFunc.bind(chart);

    nv.utils.rebindp(chart, lineChart, LineChart.prototype, api);

    return chart;
};
