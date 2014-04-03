var LinePlusBarChartPrivates = {
    color: nv.utils.defaultColor()
    , tooltips : true
    , y1: null
    , y2: null
    , state : null
    , defaultState : null
};

/**
 * A LinePlusBarChart
 */
function LinePlusBarChart(options){
    options = nv.utils.extend({}, options, LinePlusBarChartPrivates, {
        margin : {top: 30, right: 60, bottom: 50, left: 60}
        , chartClass: 'linePlusBar'
    });

    this.lines = nv.models.line();
    this.bars = nv.models.historicalBar();
    this.y1Axis = nv.models.axis();
    this.y2Axis = nv.models.axis();

    this.bars
        .padData(true)
    ;
    this.lines
        .clipEdge(false)
        .padData(true)
    ;
/*    this.xAxis
        .orient('bottom')
        .tickPadding(7)
        .highlightZero(false)
    ;*/
    this.y1Axis
        .orient('left')
    ;
    this.y2Axis
        .orient('right')
    ;
    this.showTooltip = function(e, offsetElement) {
        var left = e.pos[0] + ( offsetElement.offsetLeft || 0 ),
            top = e.pos[1] + ( offsetElement.offsetTop || 0),
            x = this.xAxis().tickFormat()(this.lines.x()(e.point, e.pointIndex)),
            y = (e.series.bar ? this.y1Axis : this.y2Axis).tickFormat()(this.lines.y()(e.point, e.pointIndex)),
            content = this.tooltip()(e.series.key, x, y);

        nv.tooltip.show([left, top], content, e.value < 0 ? 'n' : 's', null, offsetElement);
    }.bind(this);

    Chart.call(this, options, ['tooltipShow', 'tooltipHide', 'stateChange', 'changeState']);
}

nv.utils.create(LinePlusBarChart, Chart, LinePlusBarChartPrivates);

LinePlusBarChart.prototype.wrapper = function(data){

};

LinePlusBarChart.prototype.draw = function(data){
    Layer.setRoot(this);
    if (Layer.noData(data))
        return chart;

    var that = this,
        availableWidth = Layer.available.width,
        availableHeight = Layer.available.height;

    chart.update = function() {
        Layer.svg.transition().call(chart);
    };

    //set state.disabled
    state.disabled = data.map(function(d) { return !!d.disabled });

    if (!defaultState) {
        var key;
        defaultState = {};
        for (key in state) {
            if (state[key] instanceof Array)
                defaultState[key] = state[key].slice(0);
            else
                defaultState[key] = state[key];
        }
    }

    //------------------------------------------------------------
    // Setup Scales

    var dataBars = data.filter(function(d) { return !d.disabled && d.bar });
    var dataLines = data.filter(function(d) { return !d.bar }); // removed the !d.disabled clause here to fix Issue #240

    //x = xAxis.scale();
    x = dataLines.filter(function(d) { return !d.disabled; }).length && dataLines.filter(function(d) { return !d.disabled; })[0].values.length ? lines.xScale() : bars.xScale();
    //x = dataLines.filter(function(d) { return !d.disabled; }).length ? lines.xScale() : bars.xScale(); //old code before change above
    y1 = bars.yScale();
    y2 = lines.yScale();

    //------------------------------------------------------------

    //------------------------------------------------------------
    // Setup containers and skeleton of chart

    /*      var wrap = d3.select(this).selectAll('g.nv-wrap.nv-linePlusBar').data([data]);
     var gEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap nv-linePlusBar').append('g');
     var g = wrap.select('g');*/
    Layer.wrapChart(data);

    Layer.gEnter.append('g').attr('class', 'nv-x nv-axis');
    Layer.gEnter.append('g').attr('class', 'nv-y1 nv-axis');
    Layer.gEnter.append('g').attr('class', 'nv-y2 nv-axis');
    Layer.gEnter.append('g').attr('class', 'nv-barsWrap');
    Layer.gEnter.append('g').attr('class', 'nv-linesWrap');
    Layer.gEnter.append('g').attr('class', 'nv-legendWrap');

    //------------------------------------------------------------


    //------------------------------------------------------------
    // Legend

    if (Layer.options.showLegend) {
        legend.width( availableWidth / 2 );

        Layer.g.select('.nv-legendWrap')
            .datum(data.map(function(series) {
                series.originalKey = series.originalKey === undefined ? series.key : series.originalKey;
                series.key = series.originalKey + (series.bar ? ' (left axis)' : ' (right axis)');
                return series;
            }))
            .call(legend);

        if ( Layer.margin.top != legend.height()) {
            Layer.margin.top = legend.height();
            availableHeight = (height || parseInt(Layer.svg.style('height')) || 400)
                - Layer.margin.top - Layer.margin.bottom;
        }
        Layer.g.select('.nv-legendWrap')
            .attr('transform', 'translate(' + ( availableWidth / 2 ) + ',' + (-Layer.margin.top) +')');
    }

    //------------------------------------------------------------

    Layer.wrap.attr('transform', 'translate(' + Layer.margin.left + ',' + Layer.margin.top + ')');

    //------------------------------------------------------------
    // Main Chart Component(s)

    lines
        .width(availableWidth)
        .height(availableHeight)
        .color(data.map(function(d,i) {
            return d.color || color(d, i);
        }).filter(function(d,i) { return !data[i].disabled && !data[i].bar }));

    bars
        .width(availableWidth)
        .height(availableHeight)
        .color(data.map(function(d,i) {
            return d.color || color(d, i);
        }).filter(function(d,i) { return !data[i].disabled && data[i].bar }));

    var barsWrap = Layer.g.select('.nv-barsWrap')
        .datum(dataBars.length ? dataBars : [{values:[]}]);

    var linesWrap = Layer.g.select('.nv-linesWrap')
        .datum(dataLines[0] && !dataLines[0].disabled ? dataLines : [{values:[]}] );
    //.datum(!dataLines[0].disabled ? dataLines : [{values:dataLines[0].values.map(function(d) { return [d[0], null] }) }] );

    d3.transition(barsWrap).call(bars);
    d3.transition(linesWrap).call(lines);

    //------------------------------------------------------------


    //------------------------------------------------------------
    // Setup Axes

    xAxis
        .scale(x)
        .ticks( availableWidth / 100 )
        .tickSize(-availableHeight, 0);

    Layer.g.select('.nv-x.nv-axis')
        .attr('transform', 'translate(0,' + y1.range()[0] + ')');
    d3.transition(Layer.g.select('.nv-x.nv-axis'))
        .call(xAxis);

    y1Axis
        .scale(y1)
        .ticks( availableHeight / 36 )
        .tickSize(-availableWidth, 0);

    d3.transition(Layer.g.select('.nv-y1.nv-axis'))
        .style('opacity', dataBars.length ? 1 : 0)
        .call(y1Axis);

    y2Axis
        .scale(y2)
        .ticks( availableHeight / 36 )
        .tickSize(dataBars.length ? 0 : -availableWidth, 0); // Show the y2 rules only if y1 has none

    Layer.g.select('.nv-y2.nv-axis')
        .style('opacity', dataLines.length ? 1 : 0)
        .attr('transform', 'translate(' + availableWidth + ',0)');
    //.attr('transform', 'translate(' + x.range()[1] + ',0)');

    d3.transition(Layer.g.select('.nv-y2.nv-axis'))
        .call(y2Axis);

    //------------------------------------------------------------

};

LinePlusBarChart.prototype.attachEvents = function(){
    legend.dispatch.on('stateChange', function(newState) {
        state = newState;
        dispatch.stateChange(state);
        chart.update();
    });

    dispatch
        .on('tooltipShow', function(e) {
            if (tooltips) showTooltip(e, that.parentNode);
        })
        // Update chart from a state object passed to event handler
        .on('changeState', function(e) {
            if (typeof e.disabled !== 'undefined') {
                data.forEach(function(series,i) {
                    series.disabled = e.disabled[i];
                });
                state.disabled = e.disabled;
            }
            chart.update();
        });

    lines
        .dispatch.on('elementMouseover.tooltip', function(e) {
            e.pos = [e.pos[0] +  Layer.margin.left, e.pos[1] + Layer.margin.top];
            dispatch.tooltipShow(e);
        })
        .on('elementMouseout.tooltip', function(e) {
            dispatch.tooltipHide(e);
        });

    bars
        .dispatch.on('elementMouseover.tooltip', function(e) {
            e.pos = [e.pos[0] +  Layer.margin.left, e.pos[1] + Layer.margin.top];
            dispatch.tooltipShow(e);
        })
        .on('elementMouseout.tooltip', function(e) {
            dispatch.tooltipHide(e);
        });

    dispatch.on('tooltipHide', function() {
        if (tooltips) nv.tooltip.cleanup();
    });
};

LinePlusBarChart.prototype.x = function(_) {
    if (!arguments.length) return getX;
    getX = _;
    lines.x(_);
    bars.x(_);
    return chart;
};

LinePlusBarChart.prototype.y = function(_) {
    if (!arguments.length) return getY;
    getY = _;
    lines.y(_);
    bars.y(_);
    return chart;
};

chart.color = function(_) {
    if (!arguments.length) return color;
    color = nv.utils.getColor(_);
    legend.color(color);
    return chart;
};

chart.tooltipContent = function(_) {
    if (!arguments.length) return tooltip;
    tooltip = _;
    return chart;
};

nv.models.linePlusBarChart = function() {
  "use strict";

    var linePlusBarChart = new LinePlusBarChart();

    function chart(selection) {
        linePlusBarChart.render(selection);
        return chart;
    }
    chart.dispatch = linePlusBarChart.dispatch;
    chart.legend = linePlusBarChart.legend;
    chart.lines = linePlusBarChart.lines;
    chart.bars = linePlusBarChart.bars;
    chart.y1Axis = linePlusBarChart.y1Axis;
    chart.y2Axis = linePlusBarChart.y2Axis;

    d3.rebind(chart, linePlusBarChart.lines, 'defined', 'size', 'clipVoronoi', 'interpolate');

    chart.options = nv.utils.optionsFunc.bind(chart);

    nv.utils.rebindp(chart, linePlusBarChart, LinePlusBarChart.prototype,
        'x', 'y', 'margin', 'width', 'height', 'color', 'showLegend', 'tooltips', 'tooltipContent', 'state',
        'defaultState', 'noData'
    );

  return chart;
};
