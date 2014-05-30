var MultiBarChartPrivates = {
    stacked : false
    , defaultState : null
    , showControls: true
    , color: nv.utils.defaultColor()
    , xScale: null
    , yScale: null
    , tooltips: true
    , duration: 250
    , rotateLabels: false
    , staggerLabels: false
    , controlsData: []
};

/**
 * A MultiBarChart
 */
function MultiBarChart(options){
    options = nv.utils.extend({}, options, MultiBarChartPrivates, {
        margin: {top: 30, right: 20, bottom: 50, left: 60}
        , chartClass: 'multiBarWithLegend'
        , wrapClass: 'barsWrap'
    });

    Chart.call(this, options);

    this.multibar = this.getMultiBar();
    this.controls = this.getLegend();

    this.state = this.getStateManager();
    this.state.stacked = false; // DEPRECATED Maintained for backward compatibility

    this.stateGetter = function(data) {
        return function(){
            return {
                active: data.map(function(d) { return !d.disabled }),
                stacked: this.stacked()
            }
        }.bind(this);
    }.bind(this);
    this.stateSetter = function(data) {
        return function(state) {
            if (state.stacked !== undefined)
                this.stacked(state.stacked);
            if (state.active !== undefined)
                data.forEach(function(series,i) {
                    series.disabled = !state.active[i];
                });
        }.bind(this);
    }.bind(this);

    this.controls.updateState(false); // DEPRECATED
}

nv.utils.create(MultiBarChart, Chart, MultiBarChartPrivates);

MultiBarChart.prototype.getMultiBar = function(){
    return nv.models.multiBar();
};

/**
 * @override Chart::wrapper
 */
MultiBarChart.prototype.wrapper = function (data) {
    Chart.prototype.wrapper.call(this, data, ['nv-controlsWrap']);
    this.renderWatch.reset();
    if (this.showXAxis()) this.renderWatch.models(this.xAxis);
    if (this.showYAxis()) this.renderWatch.models(this.yAxis);
    this.renderWatch.models(this.multibar);
};

/**
 * @override Chart::draw
 */
MultiBarChart.prototype.draw = function(data){

    this.multibar
        .stacked(this.stacked())
        .disabled(data.map(function(series) { return series.disabled }))
        .width(this.available.width)
        .height(this.available.height);

    this.xScale( this.multibar.xScale() );
    this.yScale( this.multibar.yScale() );

    var barsWrap = this.g.select('.nv-barsWrap').datum(data.filter(function(d) { return !d.disabled }));
    d3.transition(barsWrap).call(this.multibar);

    this.state
        .setter(this.stateSetter(data), this.update)
        .getter(this.stateGetter(data))
        .update();
    this.state.disabled = data.map(function(d) { return !!d.disabled }); // DEPRECATED set state.disabled

    if (this.showControls()) {
        this.controlsData([
            { key: 'Grouped', disabled: this.stacked() },
            { key: 'Stacked', disabled: !this.stacked() }
        ]);
        this.controls
            .width( this.showControls() ? 180 : 0 )
            .color(['#444', '#444', '#444']);
        this.g.select('.nv-controlsWrap')
            .datum(this.controlsData())
            .attr('transform', 'translate(0,' + (-this.margin().top) +')')
            .call(this.controls);
    }

    Chart.prototype.draw.call(this, data);
};

/**
 * @override Chart::attachEvents
 */
MultiBarChart.prototype.attachEvents = function(){
    Chart.prototype.attachEvents.call(this);

    this.multibar.dispatch
        .on('elementMouseover.tooltip', function(e) {
            e.pos = [e.pos[0] +  this.margin().left, e.pos[1] + this.margin().top];
            this.dispatch.tooltipShow(e);
        }.bind(this))
        .on('elementMouseout.tooltip', function(e) {
            this.dispatch.tooltipHide(e);
        }.bind(this));

    this.legend.dispatch.on('legendClick', function() {
        this.update();
    }.bind(this));

    this.controls.dispatch.on('legendClick', function(d) {
        if (!d.disabled) return;
        this.controlsData(
            this.controlsData().map(function(s) { s.disabled = true; return s; })
        );
        d.disabled = false;

        switch (d.key) {
            case 'Grouped':
                this.stacked(false);
                this.multibar.stacked(false);
                break;
            case 'Stacked':
                this.stacked(true);
                this.multibar.stacked(true);
                break;
        }

        // DEPRECATED
        this.state.stacked = this.multibar.stacked();
        this.dispatch.stateChange(this.state);
        // END DEPRECATED

        this.update();
    }.bind(this));

    this.dispatch
        .on('tooltipShow', function(e) {
            if (this.tooltips()) this.showTooltip(e, this.svg[0][0].parentNode)
        }.bind(this))
        // DEPRECATED
        // Update chart from a state object passed to event handler
        .on('changeState', function(e) {
            if (typeof e.disabled !== 'undefined') {
                this.data.forEach(function(series,i) {
                    series.disabled = e.disabled[i];
                });
                this.state.disabled = e.disabled;
            }
            if (typeof e.stacked !== 'undefined') {
                this.multibar.stacked(e.stacked);
                this.state.stacked = e.stacked;
                this.stacked(e.stacked);
            }
            this.update();
        }.bind(this));
        // END DEPRECATED
};

/**
 * Set the underlying color, on both the chart, and the composites.
 */
MultiBarChart.prototype.color = function(_){
    if (!arguments.length) return this.options.color;
    this.options.color = nv.utils.getColor(_);
    this.legend.color( this.color() );
    this.multibar.color( this.color() );
    return this;
};

MultiBarChart.prototype.showTooltip = function(e, offsetElement) {
    var left = e.pos[0] + ( offsetElement.offsetLeft || 0 ),
        top = e.pos[1] + ( offsetElement.offsetTop || 0),
        x = this.xAxis.tickFormat()(this.multibar.x()(e.point, e.pointIndex)),
        y = this.yAxis.tickFormat()(this.multibar.y()(e.point, e.pointIndex)),
        content = this.tooltip()(e.series.key, x, y);

    nv.tooltip.show([left, top], content, e.value < 0 ? 'n' : 's', null, offsetElement);
};

MultiBarChart.prototype.duration = function(_) {
    if (!arguments.length) return this.options.duration;
    this.options.duration = _;
    this.multibar.duration(_);
    this.xAxis.duration(_);
    this.yAxis.duration(_);
    this.renderWatch.reset(_);
    return this;
};

/**
 * The multiBarChart model returns a function wrapping an instance of a MultiBarChart.
 */
nv.models.multiBarChart = function() {
    "use strict";

    var multiBarChart = new MultiBarChart(),
        api = [
            'margin',
            'width',
            'height',
            'color',
            'showControls',
            'showLegend',
            'showXAxis',
            'showYAxis',
            'rightAlignYAxis',
            'rotateLabels',
            'staggerLabels',
            'tooltip',
            'tooltips',
            'tooltipContent',
            'state',
            'defaultState',
            'noData',
            'duration',
            'transitionDuration',
            'reduceXTicks'
        ];

    function chart(selection) {
        multiBarChart.render(selection);
        return chart;
    }

    chart.dispatch = multiBarChart.dispatch;
    chart.multibar = multiBarChart.multibar;
    chart.legend = multiBarChart.legend;
    chart.xAxis = multiBarChart.xAxis;
    chart.yAxis = multiBarChart.yAxis;
    chart.state = multiBarChart.state;

    d3.rebind(chart, multiBarChart.multibar,
        'x',
        'y',
        'xDomain',
        'yDomain',
        'xRange',
        'yRange',
        'forceX',
        'forceY',
        'clipEdge',
        'id',
        'stacked',
        'stackOffset',
        'delay',
        'barColor',
        'groupSpacing',
        'xScale',
        'yScale'
    );

    chart.options = nv.utils.optionsFunc.bind(chart);

    nv.utils.rebindp(chart, multiBarChart, MultiBarChart.prototype, api);

    return chart;
};

