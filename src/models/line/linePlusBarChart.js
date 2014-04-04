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

    this.line = nv.models.line();
    this.bar = nv.models.historicalBar();
    this.y1Axis = nv.models.axis();
    this.y2Axis = nv.models.axis();

    this.bar
        .padData(true)
    ;
    this.line
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
            x = this.xAxis().tickFormat()(this.line.x()(e.point, e.pointIndex)),
            y = (e.series.bar ? this.y1Axis : this.y2Axis).tickFormat()(this.line.y()(e.point, e.pointIndex)),
            content = this.tooltip()(e.series.key, x, y);

        nv.tooltip.show([left, top], content, e.value < 0 ? 'n' : 's', null, offsetElement);
    }.bind(this);

    Chart.call(this, options, ['tooltipShow', 'tooltipHide', 'stateChange', 'changeState']);
}

nv.utils.create(LinePlusBarChart, Chart, LinePlusBarChartPrivates);

LinePlusBarChart.prototype.wrapper = function(data){
    Chart.prototype.wrapper.call(this, data,
        ['nv-x nv-axis', 'nv-y1 nv-axis', 'nv-y2 nv-axis', 'nv-barsWrap', 'nv-linesWrap', 'nv-legendWrap']
    );
};

LinePlusBarChart.prototype.draw = function(data){

    var that = this,
        availableWidth = Layer.available.width,
        availableHeight = Layer.available.height;

    //------------------------------------------------------------
    // Setup Scales

    var dataBars = data.filter(function(d) { return !d.disabled && d.bar });
    var dataLines = data.filter(function(d) { return !d.bar }); // removed the !d.disabled clause here to fix Issue #240

    this.xScale(
        dataLines.filter(function(d) { return !d.disabled; }).length && dataLines.filter(function(d) { return !d.disabled; })[0].values.length
            ? this.line.xScale()
            : this.bar.xScale()
    );
    this.yScale1 = this.bar.yScale();
    this.yScale2 = this.line.yScale();


/*    if (Layer.options.showLegend) {
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
    }*/

    //------------------------------------------------------------
    // Main Chart Component(s)

    this.line
        .margin({top: 0, right: 0 , bottom: 0, left: 0})
        .width(availableWidth)
        .height(availableHeight)
        .color(data.map(function(d,i) {
            return d.color || that.color(d);
        }).filter(function(d,i) { return !data[i].disabled && !data[i].bar }));

    this.bar
        .width(availableWidth)
        .height(availableHeight)
        .color(data.map(function(d,i) {
            return d.color || that.color(d);
        }).filter(function(d,i) { return !data[i].disabled && data[i].bar }));

    var barsWrap = this.g.select('.nv-barsWrap')
        .datum(dataBars.length ? dataBars : [{values:[]}]);

    var linesWrap = this.g.select('.nv-linesWrap')
        .datum(dataLines[0] && !dataLines[0].disabled ? dataLines : [{values:[]}] );
    //.datum(!dataLines[0].disabled ? dataLines : [{values:dataLines[0].values.map(function(d) { return [d[0], null] }) }] );

    d3.transition(barsWrap).call(this.bar);
    d3.transition(linesWrap).call(this.line);

    this.xAxis()
        .scale(this.xScale())
        .ticks( availableWidth / 100 )
        .tickSize(-availableHeight, 0);

    this.g.select('.nv-x.nv-axis')
        .attr('transform', 'translate(0,' + this.yScale1.range()[0] + ')');
    d3.transition(this.g.select('.nv-x.nv-axis'))
        .call(this.xAxis());

    this.y1Axis()
        .scale(this.yScale1)
        .ticks( availableHeight / 36 )
        .tickSize(-availableWidth, 0);

    d3.transition(this.g.select('.nv-y1.nv-axis'))
        .style('opacity', dataBars.length ? 1 : 0)
        .call(this.y1Axis());

    this.y2Axis()
        .scale(this.yScale2)
        .ticks( availableHeight / 36 )
        .tickSize(dataBars.length ? 0 : -availableWidth, 0); // Show the y2 rules only if y1 has none

    this.g.select('.nv-y2.nv-axis')
        .style('opacity', dataLines.length ? 1 : 0)
        .attr('transform', 'translate(' + availableWidth + ',0)');
    //.attr('transform', 'translate(' + x.range()[1] + ',0)');

    d3.transition(this.g.select('.nv-y2.nv-axis'))
        .call(this.y2Axis());

};

LinePlusBarChart.prototype.attachEvents = function(){

    this.dispatch
        .on('tooltipShow', function(e) {
            if (this.tooltips) this.showTooltip(e, this.svg[0][0].parentNode);
        }.bind(this))
        // Update chart from a state object passed to event handler
        .on('changeState', function(e) {
            if (typeof e.disabled !== 'undefined') {
                data.forEach(function(series,i) {
                    series.disabled = e.disabled[i];
                });
                this.state.disabled = e.disabled;
            }
            this.update();
        }.bind(this))
        .on('tooltipHide', function() {
            if (this.tooltips) nv.tooltip.cleanup();
        }.bind(this));

    this.legend.dispatch.on('stateChange', function(newState) {
        this.state = newState;
        this.dispatch.stateChange(this.state);
        this.update();
    }.bind(this));

    this.line
        .dispatch.on('elementMouseover.tooltip', function(e) {
            e.pos = [e.pos[0] +  this.margin().left, e.pos[1] + this.margin().top];
            this.dispatch.tooltipShow(e);
        }.bind(this))
        .on('elementMouseout.tooltip', function(e) {
            this.dispatch.tooltipHide(e);
        }.bind(this));

    this.bar
        .dispatch.on('elementMouseover.tooltip', function(e) {
            e.pos = [e.pos[0] + this.margin().left, e.pos[1] + this.margin().top];
            this.dispatch.tooltipShow(e);
        }.bind(this))
        .on('elementMouseout.tooltip', function(e) {
            this.dispatch.tooltipHide(e);
        }.bind(this));

};

LinePlusBarChart.prototype.x = function(_) {
    if (!arguments.length) return this.getX;
    this.getX = _;
    this.line.x(_);
    this.bar.x(_);
    return this;
};

LinePlusBarChart.prototype.y = function(_) {
    if (!arguments.length) return this.getY;
    this.getY = _;
    this.line.y(_);
    this.bar.y(_);
    return this;
};

LinePlusBarChart.prototype.color = function(_) {
    if (!arguments.length) return this.color;
    this.color = nv.utils.getColor(_);
    this.legend.color(this.color);
    return this;
};

LinePlusBarChart.prototype.tooltipContent = function(_) {
    if (!arguments.length) return this.tooltip();
    this.tooltip(_);
    return this;
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
    chart.line = linePlusBarChart.line;
    chart.bar = linePlusBarChart.bar;
    chart.y1Axis = linePlusBarChart.y1Axis;
    chart.y2Axis = linePlusBarChart.y2Axis;

    d3.rebind(chart, linePlusBarChart.line, 'defined', 'size', 'clipVoronoi', 'interpolate');

    chart.options = nv.utils.optionsFunc.bind(chart);

    nv.utils.rebindp(chart, linePlusBarChart, LinePlusBarChart.prototype,
        'x', 'y', 'margin', 'width', 'height', 'color', 'showLegend', 'tooltips', 'tooltipContent', 'state',
        'defaultState', 'noData'
    );

  return chart;
};
