function HistoricalBarChart(options){

    options = nv.utils.valueOrDefault(options, {
        margin: {top: 30, right: 90, bottom: 50, left: 90}
        , chartClass: 'historicalBarChart'
        , wrapClass: 'barsWrap'
    });

    Chart.call(this, options);

    this.historicalBar = nv.models.historicalBar();
    this.yAxis = nv.models.axis();
    this.xAxis = nv.models.axis();
    this.legend = nv.models.legend();

    this.color = nv.utils.defaultColor();
    this.showXAxis = true;
    this.showYAxis = true;
    this.rightAlignYAxis = false;
    this.tooltips = true;
    this.x = this.historicalBar.xScale();
    this.y = this.historicalBar.yScale();
    this.state = {};
    this.defaultState = null;
    this.dispatch = d3.dispatch('tooltipShow', 'tooltipHide', 'stateChange', 'changeState');
    this.transitionDuration = 250;
    this.options.showLegend = true;
    this.tooltip = function(key, x, y) {
        return '<h3>' + key + '</h3>' +
            '<p>' +  y + ' at ' + x + '</p>'
    }
}

HistoricalBarChart.prototype = Object.create(Chart.prototype);

HistoricalBarChart.prototype.wrapChart = function(data){
    if (this.noData(data))
        return;

    Chart.prototype.wrapChart.call(this, data);

    this.state.disabled = data.map(function(d) { return !!d.disabled });
    this.xAxis.orient('bottom').tickPadding(7);
    this.yAxis.orient( this.rightAlignYAxis ? 'right' : 'left');

    //set state.disabled
    if (!this.defaultState) {
        var key;
        this.defaultState = {};
        for (key in this.state) {
            if (this.state[key] instanceof Array)
                this.defaultState[key] = this.state[key].slice(0);
            else
                this.defaultState[key] = this.state[key];
        }
    }

    //------------------------------------------------------------

    if (this.rightAlignYAxis) {
        this.g.select(".nv-y.nv-axis")
            .attr("transform", "translate(" + this.available.width + ",0)");
    }

    //------------------------------------------------------------
    // Main Chart Component(s)

    this.historicalBar
        .width(this.available.width)
        .height(this.available.height)
        .color(
            data.map(function(d,i) { return d.color || this.color(d, i)}.bind(this))
                .filter(function(d,i) { return !data[i].disabled })
        );

    var barsWrap = this.g.select('.nv-barsWrap')
        .datum(data.filter(function(d) { return !d.disabled }))
        .transition()
        .call(this.historicalBar);

    //------------------------------------------------------------

    //------------------------------------------------------------
    // Setup Axes

    if (this.showXAxis) {
        this.xAxis.scale(this.x)
            .tickSize(-this.available.height, 0);
        this.g.select('.nv-x.nv-axis')
            .attr('transform', 'translate(0,' + this.y.range()[0] + ')')
            .transition()
            .call(this.xAxis);
    }

    if (this.showYAxis) {
        this.yAxis.scale(this.y)
            .ticks( this.available.height / 36 )
            .tickSize( -this.available.width, 0);
        this.g.select('.nv-y.nv-axis')
            .transition()
            .call(this.yAxis);
    }
    //------------------------------------------------------------

    var historicalBarWrap = this.g.select('.nv-barsWrap').datum(data);
    d3.transition(historicalBarWrap).call(this.historicalBar);
};

HistoricalBarChart.prototype.color = function(_) {
    if (!arguments.length) return this.color;
    this.color = nv.utils.getColor(_);
    this.legend.color(this.color);
    return this;
};

HistoricalBarChart.prototype.showXAxis = function(_) {
    if (!arguments.length) return this.showXAxis;
    this.showXAxis = _;
    return this;
};

HistoricalBarChart.prototype.showYAxis = function(_) {
    if (!arguments.length) return this.showYAxis;
    this.showYAxis = _;
    return this;
};

HistoricalBarChart.prototype.rightAlignYAxis = function(_) {
    if(!arguments.length) return this.rightAlignYAxis;
    this.rightAlignYAxis = _;
    this.yAxis.orient( (_) ? 'right' : 'left');
    return this;
};

HistoricalBarChart.prototype.state = function(_) {
    if (!arguments.length) return this.state;
    this.state = _;
    return this;
};

HistoricalBarChart.prototype.defaultState = function(_) {
    if (!arguments.length) return this.defaultState;
    this.defaultState = _;
    return this;
};

HistoricalBarChart.prototype.transitionDuration = function(_) {
    if (!arguments.length) return this.transitionDuration;
    this.transitionDuration = _;
    return this;
};

HistoricalBarChart.prototype.onDispatches = function(){
    Chart.prototype.onDispatches.call(this);

    this.historicalBar.dispatch.on('elementMouseover.tooltip', function(e) {
        e.pos = [e.pos[0] +  this.margin.left, e.pos[1] + this.margin.top];
        this.dispatch.tooltipShow(e);
    }.bind(this));

    this.historicalBar.dispatch.on('elementMouseout.tooltip', function(e) {
        this.dispatch.tooltipHide(e);
    }.bind(this));


    this.legend.dispatch
        .on('legendClick', function(d) {
            d.disabled = !d.disabled;
            if (!data.filter(function(d) { return !d.disabled }).length) {
                data.map(function(d) {
                    d.disabled = false;
                    that.wrap.selectAll('.nv-series').classed('disabled', false);
                    return d;
                });
            }
            this.state.disabled = data.map(function(d) { return !!d.disabled });
            this.dispatch.stateChange(this.state);
            this.svg.transition().call(this.historicalBar);
        }.bind(this))
        .on('legendDblclick', function(d) {
            //Double clicking should always enable current series, and disabled all others.
            data.forEach(function(d) { d.disabled = true });
            d.disabled = false;
            this.state.disabled = data.map(function(d) { return !!d.disabled });
            this.dispatch.stateChange(this.state);
            this.update();
        }.bind(this));

    // add parentNode, override Charts' 'tooltipShow'
    this.dispatch.on('tooltipShow', function(e) {
            if (this.tooltips) this.showTooltip(e, this.svg[0][0].parentNode);
        }.bind(this));
};

HistoricalBarChart.prototype.tooltipContent = function(_) {
    if (!arguments.length) return this.tooltip;
    this.tooltip = _;
    return this;
};

HistoricalBarChart.prototype.showTooltip = function(e, offsetElement) {
    // New addition to calculate position if SVG is scaled with viewBox, may move TODO: consider implementing everywhere else
    if (offsetElement) {
        var svg = d3.select(offsetElement).select('svg');
        var viewBox = (svg.node()) ? svg.attr('viewBox') : null;
        if (viewBox) {
            viewBox = viewBox.split(' ');
            var ratio = parseInt(svg.style('width')) / viewBox[2];
            e.pos[0] = e.pos[0] * ratio;
            e.pos[1] = e.pos[1] * ratio;
        }
    }
    var left = e.pos[0] + ( offsetElement.offsetLeft || 0 ),
        top = e.pos[1] + ( offsetElement.offsetTop || 0),
        x = this.xAxis.tickFormat()(this.historicalBar.x()(e.point, e.pointIndex)),
        y = this.yAxis.tickFormat()(this.historicalBar.y()(e.point, e.pointIndex)),
        content = this.tooltip(e.series.key, x, y);
    nv.tooltip.show([left, top], content, null, null, offsetElement);
};

nv.models.historicalBarChart = function() {
    "use strict";

    var historicalBarChart = new HistoricalBarChart();

    function chart(selection) {
        historicalBarChart.render(selection);
        return chart;
    }

    //============================================================
    // Expose Public Variables
    //------------------------------------------------------------
    chart.legend = historicalBarChart.legend;
    chart.dispatch = historicalBarChart.dispatch;
    chart.historicalBar = historicalBarChart.historicalBar;
    chart.xAxis = historicalBarChart.xAxis;
    chart.yAxis = historicalBarChart.yAxis;

    d3.rebind(chart, historicalBarChart.historicalBar, 'defined', 'isArea', 'x', 'y', 'size', 'xScale', 'yScale',
        'xDomain', 'yDomain', 'xRange', 'yRange', 'forceX', 'forceY', 'interactive', 'clipEdge', 'clipVoronoi',
        'id', 'interpolate','highlightPoint', 'clearHighlights', 'interactive');
    chart.options = nv.utils.optionsFunc.bind(chart);

    [
        'margin',
        'width',
        'height',
        'color',
        'showLegend',
        'showXAxis',
        'showYAxis',
        'rightAlignYAxis',
        'tooltips',
        'tooltipContent',
        'state',
        'defaultState',
        'noData',
        'transitionDuration'
    ]
        .forEach(function(method){
            chart[method] = function(arg1){
                var ret = null;
                switch (arguments.length) {
                    case 0:
                        ret = HistoricalBarChart.prototype[method].call(historicalBarChart);
                        break;
                    case 1:
                        ret = HistoricalBarChart.prototype[method].call(historicalBarChart, arg1);
                        break;
                    default:
                        ret = HistoricalBarChart.prototype[method].apply(historicalBarChart, arguments)
                }
                return ret === historicalBarChart ? chart : ret;
            };
        });

    return chart;
};