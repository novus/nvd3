var MultiBarHorizontalChartPrivates = {
    showLegend: true
    , showControls : true
    , showXAxis : true
    , showYAxis : true
    , stacked : false
    , tooltips : true
    , defaultState : null
    , transitionDuration : 250
    , controlsData: []
    , xScale: null
    , yScale: null
    , tooltipContent: null
    , tooltip: null
    , color: null
};

/**
 * A MultiBarHorizontalChart
 */
function MultiBarHorizontalChart(options){
    var that = this;
    options = nv.utils.extend({}, options, MultiBarHorizontalChartPrivates, {
        margin: {top: 30, right: 20, bottom: 50, left: 60}
        , chartClass: 'multiBarHorizontalChart'
        , wrapClass: 'barsWrap'
    });
    Chart.call(this, options, ['tooltipShow', 'tooltipHide', 'stateChange', 'changeState','renderEnd']);

    this.multibarHorizontal = this.getMultibarHorizontal();
    this.legend = this.getLegend();
    this.xAxis = this.getAxis();
    this.yAxis = this.getAxis();
    this.state = { stacked: this.stacked() };

    this.legend = nv.models.legend()
        .height(30);
    this.controls = nv.models.legend()
        .height(30)
        .updateState(false);
    this.controlWidth = function() {
        return that.showControls() ? 180 : 0
    };
    this.multibarHorizontal
        .stacked( this.stacked() );
    this.xAxis
        .orient('left')
        .tickPadding(5)
        .highlightZero(false)
        .showMaxMin(false)
        .tickFormat(function(d) { return d });
    this.yAxis
        .orient('bottom')
        .tickFormat(d3.format(',.1f'));

    this.state = this.getStateManager();
    this.state.stacked = false; // DEPRECATED Maintained for backward compatibility

    this.showTooltip = function(e, offsetElement) {
        var left = e.pos[0] + ( offsetElement.offsetLeft || 0 ),
            top = e.pos[1] + ( offsetElement.offsetTop || 0),
            x = that.xAxis.tickFormat()(that.multibarHorizontal.x()(e.point, e.pointIndex)),
            y = that.yAxis.tickFormat()(that.multibarHorizontal.y()(e.point, e.pointIndex)),
            content = that.tooltip()(e.series.key, x, y);
        nv.tooltip.show([left, top], content, e.value < 0 ? 'e' : 'w', null, offsetElement);
    };

    this.stateGetter = function(data) {
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
    };

}

nv.utils.create(MultiBarHorizontalChart, Chart, MultiBarHorizontalChartPrivates);

/**
 * override Chart::wrapper
 * @param data
 */
MultiBarHorizontalChart.prototype.wrapper = function(data){
    Layer.prototype.wrapper.call(this, data, ['nv-x nv-axis', 'nv-y nv-axis', 'nv-zeroLine', 'nv-controlsWrap']);
    this.state
        .setter(this.stateSetter(data), this.update)
        .getter(this.stateGetter(data))
        .update();
};

/**
 * @override Chart::draw
 */
MultiBarHorizontalChart.prototype.draw = function(data){

    var that = this,
        availableWidth = this.available.width,
        availableHeight = this.available.height;

    //set state.disabled
    this.state.disabled = data.map(function(d) { return !!d.disabled });

    if (!this.defaultState()) {
        var key;
        this.defaultState({});
        for (key in this.state) {
            if (this.state[key] instanceof Array)
                this.defaultState()[key] = this.state[key].slice(0);
            else
                this.defaultState()[key] = this.state[key];
        }
    }

    this.xScale(this.multibarHorizontal.xScale());
    this.yScale(this.multibarHorizontal.yScale());

    this.multibarHorizontal
        .margin({left: 0, top: 0, bottom: 0, right: 0})
        .disabled(data.map(function(series) { return series.disabled }))
        .width(availableWidth)
        .height(availableHeight)
        .color(
            data.map(function(d,i) { return d.color || that.color()(d, i) })
                .filter(function(d,i) { return !data[i].disabled })
        );

    this.g.select('.nv-barsWrap')
        .datum(data.filter(function(d) { return !d.disabled }))
        .transition().call(this.multibarHorizontal);

        if (this.showLegend()) {
            this.legend.width(availableWidth - this.controlWidth());
            if (this.multibarHorizontal.barColor())
                data.forEach(function(series,i) { series.color = d3.rgb('#ccc').darker(i * 1.5).toString() });
            this.g.select('.nv-legendWrap')
                .datum(data)
                .call(this.legend);
            if ( this.margin().top != this.legend.height()) {
                this.margin().top = this.legend.height();
                availableHeight = (this.height() || parseInt(Layer.svg.style('height')) || 400) - this.margin().top - this.margin().bottom;
            }
            this.g.select('.nv-legendWrap')
                .attr('transform', 'translate(' + this.controlWidth() + ',' + (-this.margin().top) +')');
        }

        if (this.showControls()) {
            this.controlsData([
                { key: 'Grouped', disabled: this.multibarHorizontal.stacked() },
                { key: 'Stacked', disabled: !this.multibarHorizontal.stacked() }
            ]);
            this.controls
                .width(this.controlWidth())
                .color(['#444', '#444', '#444']);
            this.g.select('.nv-controlsWrap')
                .datum(this.controlsData())
                .attr('transform', 'translate(0,' + (-this.margin().top) +')')
                .call(this.controls);
        }

        if (this.showXAxis()) {
            this.xAxis
                .scale(this.xScale())
                .ticks( availableHeight / 24 )
                .tickSize(-availableWidth, 0 );
            this.g.select('.nv-x.nv-axis')
                .transition()
                .call(this.xAxis);
        }

        if (this.showYAxis()) {
            this.yAxis
                .scale(this.yScale())
                .ticks( availableWidth / 100 )
                .tickSize( -availableHeight, 0 );
            this.g.select('.nv-y.nv-axis')
                .attr('transform', 'translate(0,' + availableHeight + ')')
                .transition()
                .call(this.yAxis);
        }

        // Zero line
        this.g.select(".nv-zeroLine line")
            .attr("x1", this.yScale()(0))
            .attr("x2", this.yScale()(0))
            .attr("y1", 0)
            .attr("y2", -availableHeight);
};

/**
 *
 * @override Chart::attachEvents
 */
MultiBarHorizontalChart.prototype.attachEvents = function(){
    Chart.prototype.attachEvents.call(this);

    this.legend.dispatch.on('stateChange', function(newState) {
        this.state = newState;
        this.dispatch.stateChange( this.state );
        this.update();
    }.bind(this));

    this.controls.dispatch.on('legendClick', function(d) {
        if (!d.disabled) return;
        this.controlsData(
            this.controlsData().map(function(s) { s.disabled = true; return s })
        );
        d.disabled = false;
        switch (d.key) {
            case 'Grouped':
                this.multibarHorizontal.stacked(false);
                break;
            case 'Stacked':
                this.multibarHorizontal.stacked(true);
                break;
        }
        // DEPRECATED
        this.state.stacked = this.multibarHorizontal.stacked();
        this.dispatch.stateChange(this.state);
        // END DEPRECATED

        this.update();
    }.bind(this));

    this.dispatch
        // DEPRECATED
        // Update chart from a state object passed to event handler
        .on('changeState', function(e) {
            if (typeof e.disabled !== 'undefined') {
                data.forEach(function(series,i) { series.disabled = e.disabled[i] });
                this.state.disabled = e.disabled;
            }
            if (typeof e.stacked !== 'undefined') {
                this.multibarHorizontal.stacked(e.stacked);
                this.state.stacked = e.stacked;
            }
            this.update();
        }.bind(this))
        // END DEPRECATED
        .on('tooltipShow', function(e) {
            if (this.tooltips())
                this.showTooltip(e, this.svg[0][0].parentNode);
        }.bind(this))
        .on('tooltipHide', function() {
            if (this.tooltips())
                nv.tooltip.cleanup();
        }.bind(this));

    this.multibarHorizontal.dispatch
        .on('elementMouseover.tooltip', function(e) {
            e.pos = [e.pos[0] +  this.margin().left, e.pos[1] + this.margin().top];
            this.dispatch.tooltipShow(e);
        }.bind(this))
        .on('elementMouseout.tooltip', function(e) {
            this.dispatch.tooltipHide(e);
        }.bind(this));
};

MultiBarHorizontalChart.prototype.getMultibarHorizontal = function(){
    return nv.models.multiBarHorizontal();
};

MultiBarHorizontalChart.prototype.color = function(_) {
    if (!arguments.length) return this.options.color;
    this.options.color = nv.utils.getColor(_);
    this.legend.color(this.color());
    this.multiBarHorizontal.color(this.color());
    return this;
};

MultiBarHorizontalChart.prototype.tooltipContent = function(_){
    if (!arguments.length) return this.tooltip();
    this.tooltip(_);
    return this;
};

/**
 * The multiBarHorizontalChart model returns a function wrapping an instance of a MultiBarHorizontalChart.
 */
nv.models.multiBarHorizontalChart = function() {
    "use strict";

    var multiBarHorizontalChart = new MultiBarHorizontalChart();

    function chart(selection) {
        multiBarHorizontalChart.render(selection);
        return chart;
    }

    chart.dispatch = multiBarHorizontalChart.dispatch;
    chart.multibarHorizontal = multiBarHorizontalChart.multibarHorizontal;
    chart.legend = multiBarHorizontalChart.legend;
    chart.xAxis = multiBarHorizontalChart.xAxis;
    chart.yAxis = multiBarHorizontalChart.yAxis;

    // DO NOT DELETE. This is currently overridden below
    // until deprecated portions are removed.
    chart.state = multiBarHorizontalChart.state;

    chart.options = nv.utils.optionsFunc.bind(chart);

    d3.rebind(chart, multiBarHorizontalChart.multibarHorizontal,
        'x', 'y', 'xDomain', 'yDomain', 'xRange', 'yRange', 'forceX', 'forceY', 'clipEdge', 'id', 'delay',
        'showValues','showBarLabels', 'valueFormat', 'stacked', 'barColor'
    );

    chart.options = nv.utils.optionsFunc.bind(chart);

    nv.utils.rebindp(chart, multiBarHorizontalChart, MultiBarHorizontalChart.prototype,
        'tooltip', 'color', 'margin', 'width', 'height', 'showControls', 'showLegend', 'showXAxis', 'showYAxis',
        'tooltips', 'tooltipContent', 'state', 'defaultState', 'noData', 'transitionDuration'
    );

    return chart;
};
