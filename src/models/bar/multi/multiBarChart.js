var MultiBarChartPrivates = {
    stacked : false
    , defaultState : null
    , showControls: true
    , showXAxis : true
    , showYAxis : true
    , reduceXTicks : true
    , staggerLabels: false
    , rotateLabels: 0
    , rightAlignYAxis: false
    , color : null
    , controlsData : []
    , tooltips: true
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

    Chart.call(this, options, ['tooltipShow', 'tooltipHide', 'stateChange', 'changeState', 'renderEnd']);

    this.multibar = this.getMultiBar();

    this.xAxis = this.getAxis();
    this.yAxis = this.getAxis();
    this.legend = this.getLegend();
    this.controls = this.getLegend();

    this._duration = 250;
    this._color = nv.utils.defaultColor();

    this.state = this.getStatesManager();
    this.state.stacked = false; // DEPRECATED Maintained for backward compatibility
    this.controlWidth = function() { return this.showControls() ? 180 : 0};
    this.controlsData([
        { key: 'Grouped', disabled: this.stacked() },
        { key: 'Stacked', disabled: !this.stacked() }
    ]);

    var that = this;
    this.stateGetter = function (data) {
        return function(){
            return {
                active: data.map(function(d) { return !d.disabled }),
                stacked: that.stacked()
            }
        }
    };
    this.stateSetter = function(data) {
        return function(state) {
            if (state.stacked !== undefined)
                that.stacked(state.stacked);
            if (state.active !== undefined)
                data.forEach(function(series,i) {
                    series.disabled = !state.active[i];
                });
        }
    }

}

nv.utils.create(MultiBarChart, Chart, MultiBarChartPrivates);

MultiBarChart.prototype.getStatesManager = function(){
    return nv.utils.state()
};

MultiBarChart.prototype.getMultiBar = function(){
    return nv.models.multiBar();
};

MultiBarChart.prototype.getAxis = function(){
    return nv.models.axis();
};

MultiBarChart.prototype.getLegend = function(){
    return nv.models.legend();
};

/**
 * @override Layer::wrapper
 */
MultiBarChart.prototype.wrapper = function (data) {
    Layer.prototype.wrapper.call(this, data, ['nv-controlsWrap', 'nv-x nv-axis', 'nv-y nv-axis']);
    this.renderWatch = nv.utils.renderWatch(this.dispatch);
    this.renderWatch.reset();
    if (this.showXAxis()) this.renderWatch.models(this.xAxis);
    if (this.showYAxis()) this.renderWatch.models(this.yAxis);
    this.renderWatch.models(this.multibar);
};

/**
 * @override Layer::draw
 */
MultiBarChart.prototype.draw = function(data){

    var that = this,
        availableWidth = this.available.width,
        availableHeight = this.available.height;

    this.multibar
        .stacked(this.stacked())
        .disabled(data.map(function(series) { return series.disabled }))
        .width(availableWidth)
        .height(availableHeight)
        .margin({ top: 0, right: 0, bottom: 0, left: 0 });

    var barsWrap = this.g.select('.nv-barsWrap').datum(data.filter(function(d) { return !d.disabled }));
    d3.transition(barsWrap).call(this.multibar);

    this.xScale = this.multibar.xScale;
    this.yScale = this.multibar.yScale;

    this.controls.updateState(false); // DEPRECATED

    this.state
        .setter(this.stateSetter(data), this.update)
        .getter(this.stateGetter(data))
        .update();

    // DEPRECATED set state.disabled
    this.state.disabled = data.map(function(d) { return !!d.disabled });

    if (this.showControls()) {

        this.controls
            .width(this.controlWidth())
            .color(['#444', '#444', '#444']);
        this.g.select('.nv-controlsWrap')
            .datum(this.controlsData())
            .attr('transform', 'translate(0,' + (-this.margin().top) +')')
            .call(this.controls);
    }

    if (this.rightAlignYAxis()) {
        this.g.select(".nv-y.nv-axis")
            .attr("transform", "translate(" + availableWidth + ",0)");
    }

    if (this.showXAxis()) {
        this.xAxis
            .orient('bottom')
            .tickPadding(7)
            .highlightZero(true)
            .showMaxMin(false)
            .tickFormat(function(d) { return d })
            .scale(this.xScale())
            .ticks( availableWidth / 100 )
            .tickSize(-availableHeight, 0);

        this.g.select('.nv-x.nv-axis')
            .attr('transform', 'translate(0,' + this.yScale().range()[0] + ')');
        this.g.select('.nv-x.nv-axis').transition()
            .call(this.xAxis);

        var xTicks = this.g.select('.nv-x.nv-axis > g').selectAll('g');

        xTicks
            .selectAll('line, text')
            .style('opacity', 1);

        if (this.staggerLabels()) {
            var getTranslate = function(x,y) {
                return "translate(" + x + "," + y + ")";
            };

            var staggerUp = 5, staggerDown = 17;  //pixels to stagger by
            // Issue #140
            xTicks
                .selectAll("text")
                .attr('transform', function(d,i,j) {
                    return getTranslate(0, (j % 2 == 0 ? staggerUp : staggerDown));
                });

            var totalInBetweenTicks = d3.selectAll(".nv-x.nv-axis .nv-wrap g g text")[0].length;
            this.g.selectAll(".nv-x.nv-axis .nv-axisMaxMin text")
                .attr("transform", function(d,i) {
                    return getTranslate(0, (i === 0 || totalInBetweenTicks % 2 !== 0) ? staggerDown : staggerUp);
                });
        }

        if (this.reduceXTicks())
            xTicks
                .filter(function(d,i) { return i % Math.ceil(data[0].values.length / (availableWidth / 100)) !== 0 })
                .selectAll('text, line')
                .style('opacity', 0);

        if(this.rotateLabels())
            xTicks
                .selectAll('.tick text')
                .attr('transform', 'rotate(' + that.rotateLabels() + ' 0,0)')
                .style('text-anchor', that.rotateLabels() > 0 ? 'start' : 'end');

        this.g.select('.nv-x.nv-axis').selectAll('g.nv-axisMaxMin text')
            .style('opacity', 1);
    }

    if (this.showYAxis()) {
        this.yAxis
            .orient(this.rightAlignYAxis() ? 'right' : 'left')
            .tickFormat(d3.format(',.1f'))
            .scale(this.yScale())
            .ticks( availableHeight / 36 )
            .tickSize( -availableWidth, 0);

        this.g.select('.nv-y.nv-axis').transition()
            .call(this.yAxis);
    }

};

/**
 * Set up listeners for dispatches fired on the underlying
 * multiBar graph.
 *
 * @override Layer::attachEvents
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
            this.controlsData().map(function(s) {
                s.disabled = true;
                return s;
            })
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

    this.dispatch.on('tooltipShow', function(e) {
        if (this.tooltips()) this.showTooltip(e, this.svg[0][0].parentNode)
    }.bind(this));

    // DEPRECATED
    // Update chart from a state object passed to event handler
    this.dispatch.on('changeState', function(e) {
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
    if (!arguments.length) return this._color;
    this._color = nv.utils.getColor(_);
    this.legend.color(this._color);
    this.multibar.color(this._color);
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

MultiBarChart.prototype.transitionDuration = function(_) {
    nv.deprecated('multiBarChart.transitionDuration');
    return this.duration(_);
};

MultiBarChart.prototype.duration = function(_) {
    if (!arguments.length) return this._duration;
    this._duration = _;
    this.multibar.duration(this._duration);
    this.xAxis.duration(this._duration);
    this.yAxis.duration(this._duration);
    this.renderWatch.reset(this._duration);
    return this;
};

// DEPRECATED
MultiBarChart.prototype.state = function(_) {
    nv.deprecated('multiBarChart.state');
    if (!arguments.length) return this.state;
    this.state = _;
    return this;
};
/*for (var key in state) {
 chart.state[key] = state[key];
 }*/
// END DEPRECATED

/**
 * The multiBarChart model returns a function wrapping an instance of a MultiBarChart.
 */
nv.models.multiBarChart = function() {
    "use strict";

    var multiBarChart = new MultiBarChart();

    function chart(selection) {
        multiBarChart.render(selection);
        return chart;
    }

    chart.dispatch = multiBarChart.dispatch;
    chart.multibar = multiBarChart.multibar;
    chart.legend = multiBarChart.legend;
    chart.xAxis = multiBarChart.xAxis;
    chart.yAxis = multiBarChart.yAxis;

    // DO NOT DELETE. This is currently overridden below
    // until deprecated portions are removed.
    chart.state = multiBarChart.state;

    d3.rebind(chart, multiBarChart.multibar, 'x', 'y', 'xDomain', 'yDomain', 'xRange', 'yRange', 'forceX', 'forceY',
        'clipEdge', 'id', 'stacked', 'stackOffset', 'delay', 'barColor','groupSpacing');

    chart.options = nv.utils.optionsFunc.bind(chart);

    nv.utils.rebindp(chart, multiBarChart, MultiBarChart.prototype, 'margin', 'width', 'height', 'color', 'showControls',
        'showLegend', 'showXAxis', 'showYAxis', 'rightAlignYAxis', 'reduceXTicks', 'rotateLabels', 'staggerLabels',
        'tooltip', 'tooltips', 'defaultState', 'noData', 'transitionDuration', 'duration',
        'state'/*deprecated*/);

    return chart;
};

