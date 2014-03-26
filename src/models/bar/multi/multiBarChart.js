var MultiBarChartPrivates = {
    renderWatch : nv.utils.renderWatch(this.dispatch)
    , stacked : false
    , stateGetter : function(data) {
        return function(){
            return {
                active: data.map(function(d) { return !d.disabled }),
                stacked: stacked
            }
        }
    }
    , stateSetter : function(data) {
        return function(state) {
            if (state.stacked !== undefined)
                stacked = state.stacked;
            if (state.active !== undefined)
                data.forEach(function(series,i) {
                    series.disabled = !state.active[i];
                });
        }
    }
};

/**
 * A MultiBarChart
 */
function MultiBarChart(options){
    options = nv.utils.extend({}, options, {
        margin: {top: 30, right: 20, bottom: 50, left: 60}
        , chartClass: 'multiBarWithLegend'
        , wrapClass: 'multiBarWithLegendWrap'
    });

    var dispatchArray = ['tooltipShow', 'tooltipHide', 'stateChange', 'changeState', 'renderEnd'];
    Chart.call(this, options, dispatchArray);
    this.multibar = this.getMultiBar();
    this.multibar.stacked(false);

    this.xAxis = this.getAxis();
    this.yAxis = this.getAxis();
    this.legend = this.getLegend();
    this.controls = this.getLegend();
    this.showControls = true;
    this.showXAxis = true;
    this.showYAxis = true;
    this.rightAlignYAxis = false;
    this.reduceXTicks = true; // if false a tick will show for every data point
    this.staggerLabels = false;
    this.rotateLabels = 0;
    this.tooltips = true;
    this.tooltip = function(key, x, y) {
        return '<h3>' + key + '</h3>' +
            '<p>' +  y + ' on ' + x + '</p>'
    };
    this.state = nv.utils.state();
    this.defaultState = null;
    this.dispatch = d3.dispatch('tooltipShow', 'tooltipHide', 'stateChange', 'changeState', 'renderEnd');
    this.controlWidth = function() { return this.showControls ? 180 : 0}.bind(this);
    this.duration_ = 250;
    this.state.stacked = false; // DEPRECATED Maintained for backward compatibility

    this.xAxis
        .orient('bottom')
        .tickPadding(7)
        .highlightZero(true)
        .showMaxMin(false)
        .tickFormat(function(d) { return d });
    this.yAxis
        .orient((this.rightAlignYAxis) ? 'right' : 'left')
        .tickFormat(d3.format(',.1f'));
    this.controls.updateState(false); // DEPRECATED
}

nv.utils.create(MultiBarChart, Chart, MultiBarChartPrivates);

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
 * @override Layer::draw
 */
MultiBarChart.prototype.draw = function(data){
    this.multibar
        .width(this.available.width)
        .height(this.available.height);

    this.renderWatch.reset();
    this.renderWatch.models(this.multibar);
    if (this.showXAxis) this.renderWatch.models(this.xAxis);
    if (this.showYAxis) this.renderWatch.models(this.yAxis);

    var that = this,
        availableWidth = this.available.width,
        availableHeight = this.available.height;

    this.update = function() {
        if (this.duration_ === 0)
            this.svg.call(this);
        else
            this.svg.transition()
                .duration(this.duration_)
                .call(this);
    };

    this.state
        .setter(this.stateSetter(data), this.update)
        .getter(this.stateGetter(data))
        .update();

    // DEPRECATED set state.disabled
    this.state.disabled = data.map(function(d) { return !!d.disabled });

    //------------------------------------------------------------
    // Setup containers and skeleton of chart

    //this.wrapChart(data);

    this.gEnter.append('g').attr('class', 'nv-x nv-axis');
    this.gEnter.append('g').attr('class', 'nv-y nv-axis');
    this.gEnter.append('g').attr('class', 'nv-barsWrap');
    this.gEnter.append('g').attr('class', 'nv-legendWrap');
    this.gEnter.append('g').attr('class', 'nv-controlsWrap');

    //------------------------------------------------------------


    //------------------------------------------------------------
    // Controls

    if (this.showControls) {
        var controlsData = [
            { key: 'Grouped', disabled: this.stacked() },
            { key: 'Stacked', disabled: !this.stacked() }
        ];

        this.controls
            .width(this.controlWidth())
            .color(['#444', '#444', '#444']);
        this.g.select('.nv-controlsWrap')
            .datum(controlsData)
            .attr('transform', 'translate(0,' + (-this.margin.top) +')')
            .call(this.controls);
    }

    //------------------------------------------------------------


    this.wrap.attr('transform', 'translate(' + this.margin.left + ',' + this.margin.top + ')');

    if (this.rightAlignYAxis) {
        this.g.select(".nv-y.nv-axis")
            .attr("transform", "translate(" + availableWidth + ",0)");
    }

    //------------------------------------------------------------
    // Main Chart Component(s)

    this.multibar
        .stacked(this.stacked())
        .disabled(data.map(function(series) { return series.disabled }))
        .width(availableWidth)
        .height(availableHeight)
        .color(
            data.map(function(d,i) { return d.color || this.color()(d, i)}.bind(this))
                .filter(function(d,i) { return !data[i].disabled })
        );


    var barsWrap = this.g.select('.nv-barsWrap')
        .datum(data.filter(function(d) { return !d.disabled }));

    //barsWrap.call(this.multibar);

    //------------------------------------------------------------


    //------------------------------------------------------------
    // Setup Axes

    if (this.showXAxis) {
        this.xAxis
            .scale(this.x)
            .ticks( availableWidth / 100 )
            .tickSize(-availableHeight, 0);

        this.g.select('.nv-x.nv-axis')
            .attr('transform', 'translate(0,' + this.y.range()[0] + ')');
        this.g.select('.nv-x.nv-axis').transition()
            .call(this.xAxis);

        var xTicks = this.g.select('.nv-x.nv-axis > g').selectAll('g');

        xTicks
            .selectAll('line, text')
            .style('opacity', 1);

        if (this.staggerLabels) {
            var getTranslate = function(x,y) {
                return "translate(" + x + "," + y + ")";
            };

            var staggerUp = 5, staggerDown = 17;  //pixels to stagger by
            // Issue #140
            xTicks
                .selectAll("text")
                .attr('transform', function(d,i,j) {
                    return  getTranslate(0, (j % 2 == 0 ? staggerUp : staggerDown));
                });

            var totalInBetweenTicks = d3.selectAll(".nv-x.nv-axis .nv-wrap g g text")[0].length;
            this.g.selectAll(".nv-x.nv-axis .nv-axisMaxMin text")
                .attr("transform", function(d,i) {
                    return getTranslate(0, (i === 0 || totalInBetweenTicks % 2 !== 0) ? staggerDown : staggerUp);
                });
        }

        if (this.reduceXTicks)
            xTicks
                .filter(function(d,i) {
                    return i % Math.ceil(data[0].values.length / (availableWidth / 100)) !== 0;
                })
                .selectAll('text, line')
                .style('opacity', 0);

        if(this.rotateLabels)
            xTicks
                .selectAll('.tick text')
                .attr('transform', 'rotate(' + this.rotateLabels + ' 0,0)')
                .style('text-anchor', this.rotateLabels > 0 ? 'start' : 'end');

        this.g.select('.nv-x.nv-axis').selectAll('g.nv-axisMaxMin text')
            .style('opacity', 1);
    }

    if (this.showYAxis) {
        this.yAxis
            .scale(this.y)
            .ticks( availableHeight / 36 )
            .tickSize( -availableWidth, 0);

        this.g.select('.nv-y.nv-axis').transition()
            .call(this.yAxis);
    }


    //------------------------------------------------------------

    this.renderWatch.renderEnd('multibarchart immediate');

    var multiBarChartWrap = this.g.select('.nv-multiBarWithLegendWrap').datum(data);
    d3.transition(multiBarChartWrap).call(this.multibar);
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
        this.controlsData = this.controlsData.map(function(s) {
            s.disabled = true;
            return s;
        });
        d.disabled = false;

        switch (d.key) {
            case 'Grouped':
                this.stacked = false;
                this.multibar.stacked(false);
                break;
            case 'Stacked':
                this.stacked = true;
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
        if (this.tooltips) this.showTooltip(e, this.parentNode)
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
            this.stacked = e.stacked;
        }
        this.update();
    }.bind(this));
    // END DEPRECATED
};

/**
 * Set the underlying color, on both the chart, and the composites.
 */
MultiBarChart.prototype.color = function(_) {
    if (!arguments.length) return this.color;
    this.color = nv.utils.getColor(_);
    this.legend.color(this.color);
    this.multibar.color(this.color);
    return this;
};

MultiBarChart.prototype.showTooltip = function(e, offsetElement) {
    var left = e.pos[0] + ( offsetElement.offsetLeft || 0 ),
        top = e.pos[1] + ( offsetElement.offsetTop || 0),
        x = this.xAxis.tickFormat()(this.multibar.x()(e.point, e.pointIndex)),
        y = this.yAxis.tickFormat()(this.multibar.y()(e.point, e.pointIndex)),
        content = this.tooltip(e.series.key, x, y);

    nv.tooltip.show([left, top], content, e.value < 0 ? 'n' : 's', null, offsetElement);
};

MultiBarChart.prototype.showControls = function(_) {
    if (!arguments.length) return this.showControls;
    this.showControls = _;
    return this;
};

MultiBarChart.prototype.showLegend = function(_) {
    if (!arguments.length) return this.options.showLegend;
    this.options.showLegend = _;
    return this;
};

MultiBarChart.prototype.showXAxis = function(_) {
    if (!arguments.length) return this.showXAxis;
    this.showXAxis = _;
    return this;
};

MultiBarChart.prototype.showYAxis = function(_) {
    if (!arguments.length) return this.showYAxis;
    this.showYAxis = _;
    return this;
};

MultiBarChart.prototype.rightAlignYAxis = function(_) {
    if(!arguments.length) return this.rightAlignYAxis;
    this.rightAlignYAxis = _;
    this.yAxis.orient( (_) ? 'right' : 'left');
    return this;
};

MultiBarChart.prototype.reduceXTicks= function(_) {
    if (!arguments.length) return this.reduceXTicks;
    this.reduceXTicks = _;
    return this;
};

MultiBarChart.prototype.rotateLabels = function(_) {
    if (!arguments.length) return this.rotateLabels;
    this.rotateLabels = _;
    return this;
};

MultiBarChart.prototype.staggerLabels = function(_) {
    if (!arguments.length) return this.staggerLabels;
    this.staggerLabels = _;
    return this;
};

MultiBarChart.prototype.tooltip = function(_) {
    if (!arguments.length) return this.tooltip;
    this.tooltip = _;
    return this;
};

MultiBarChart.prototype.tooltips = function(_) {
    if (!arguments.length) return this.tooltips;
    this.tooltips = _;
    return this;
};

MultiBarChart.prototype.tooltipContent = function(_) {
    if (!arguments.length) return this.tooltip;
    this.tooltip = _;
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

MultiBarChart.prototype.defaultState = function(_) {
    if (!arguments.length) return this.defaultState;
    this.defaultState = _;
    return this;
};

MultiBarChart.prototype.transitionDuration = function(_) {
    nv.deprecated('multiBarChart.transitionDuration');
    return this.duration(_);
};

MultiBarChart.prototype.duration = function(_) {
    if (!arguments.length) return this.duration_;
    this.duration_ = _;
    this.multibar.duration(this.duration_);
    this.xAxis.duration(this.duration_);
    this.yAxis.duration(this.duration_);
    this.renderWatch.reset(this.duration_);
    return this;
};

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
        'tooltip', 'tooltips', 'tooltipContent', 'defaultState', 'noData', 'transitionDuration', 'duration',
        'state'/*deprecated*/);

    return chart;
};

