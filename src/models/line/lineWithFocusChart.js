/**
 * Private variables
 */
var LineWithFocusChartPrivates = {
    margin2: {top: 0, right: 30, bottom: 20, left: 60}
    , color : nv.utils.defaultColor()
    , height2 : 100
    , xScale: null
    , yScale: null
    , x2Scale: null
    , y2Scale: null
    , brushExtent: []
    , tooltips: true
    , x: function(d){return d.x}
    , y: function(d){return d.y}
    , tooltip: function(key, x, y) {
        return '<h3>' + key + '</h3>' +
            '<p>' +  y + ' at ' + x + '</p>'
    }
    , transitionDuration : 250
};

/**
 * A LineWithFocusChart
 */
function LineWithFocusChart(options){
    options = nv.utils.extend({}, options, LineWithFocusChartPrivates, {
        margin: {top: 30, right: 30, bottom: 30, left: 60}
        , chartClass: 'lineWithFocusChart'
    });

    Chart.call(this, options, ['brush']);

    this.lines = this.getLine();
    this.lines2 = this.getLine();
    this.xAxis = this.getAxis();
    this.yAxis = this.getAxis();
    this.x2Axis = this.getAxis();
    this.y2Axis = this.getAxis();
    this.legend = this.getLegend();
    this.brush = d3.svg.brush();

    this.lines
        .clipEdge(true)
    ;
    this.lines2
        .interactive(false)
    ;
    this.xAxis
        .orient('bottom')
        .tickPadding(5)
    ;
    this.yAxis
        .orient('left')
    ;
    this.x2Axis
        .orient('bottom')
        .tickPadding(5)
    ;
    this.y2Axis
        .orient('left')
    ;
}

nv.utils.create(LineWithFocusChart, Chart, LineWithFocusChartPrivates);

LineWithFocusChart.prototype.getLine = function(){
    return nv.models.line();
};

/**
 * @override Chart::wrapper
 */
LineWithFocusChart.prototype.wrapper = function(data){
    Chart.prototype.wrapper.call(this, data, ['brush']);

    var focusEnter = this.gEnter.append('g').attr('class', 'nv-focus');
    focusEnter.append('g').attr('class', 'nv-y nv-axis');
    focusEnter.append('g').attr('class', 'nv-linesWrap');

    var contextEnter = this.gEnter.append('g').attr('class', 'nv-context');
    contextEnter.append('g').attr('class', 'nv-x nv-axis');
    contextEnter.append('g').attr('class', 'nv-y nv-axis');
    contextEnter.append('g').attr('class', 'nv-linesWrap');
    contextEnter.append('g').attr('class', 'nv-brushBackground');
    contextEnter.append('g').attr('class', 'nv-x nv-brush');
};

/**
 * @override Chart::draw
 */
LineWithFocusChart.prototype.draw = function(data){

    var that = this
        , availableWidth = this.available.width
        , availableHeight1 = (this.options.size.height || parseInt(this.svg.style('height')) || 400) - this.margin().top - this.margin().bottom - this.height2()
        , availableHeight2 = this.height2() - this.margin2().top - this.margin2().bottom;

    this.xScale( this.lines.xScale() );
    this.yScale( this.lines.yScale() );
    this.x2Scale( this.lines2.xScale() );
    this.y2Scale( this.lines2.yScale() );

    //------------------------------------------------------------
    // Context Component(s)

    this.lines2
        //.defined(this.defined())
        .width(availableWidth)
        .height(availableHeight2)
        .color(
        data.map(function(d,i) { return d.color || that.color()(d, i) })
            .filter(function(d,i) { return !data[i].disabled })
    );

    this.g.select('.nv-context')
        .attr('transform', 'translate(0,' + ( availableHeight1 + this.margin().bottom + this.margin2().top) + ')');

    var contextLinesWrap = this.g.select('.nv-context .nv-linesWrap')
        .datum(data.filter(function(d) { return !d.disabled }));

    d3.transition(contextLinesWrap).call(this.lines2);

    //------------------------------------------------------------
    // Setup Brush

    this.brush
        .x(this.x2Scale())
        .on('brush', function() {
            //When brushing, turn off transitions because chart needs to change immediately.
            var oldTransition = that.transitionDuration();
            that.transitionDuration(0);
            onBrush();
            that.transitionDuration(oldTransition);
        });

    if (this.brushExtent()) this.brush.extent(this.brushExtent());

    var brushBG = this.g.select('.nv-brushBackground').selectAll('g')
        .data([this.brushExtent() || this.brush.extent()]);

    var brushBGenter = brushBG.enter().append('g');

    brushBGenter.append('rect')
        .attr('class', 'left')
        .attr('x', 0)
        .attr('y', 0)
        .attr('height', availableHeight2);

    brushBGenter.append('rect')
        .attr('class', 'right')
        .attr('x', 0)
        .attr('y', 0)
        .attr('height', availableHeight2);

    var gBrush = this.g.select('.nv-x.nv-brush')
        .call(this.brush);
    gBrush.selectAll('rect')
        //.attr('y', -5)
        .attr('height', availableHeight2);
    gBrush.selectAll('.resize').append('path').attr('d', resizePath);

    //------------------------------------------------------------
    // Setup Secondary (Context) Axes

    this.x2Axis
        //.scale(this.x2Scale())
        .ticks( availableWidth / 100 )
        .tickSize(-availableHeight2, 0);

    this.g.select('.nv-context .nv-x.nv-axis')
        .attr('transform', 'translate(0,' + this.y2Scale().range()[0] + ')');
    d3.transition(this.g.select('.nv-context .nv-x.nv-axis'))
        .call(this.x2Axis);

    this.y2Axis
        .scale(this.y2Scale())
        .ticks( availableHeight2 / 36 )
        .tickSize( -availableWidth, 0);

    d3.transition(this.g.select('.nv-context .nv-y.nv-axis'))
        .call(this.y2Axis);

    this.g.select('.nv-context .nv-x.nv-axis')
        .attr('transform', 'translate(0,' + this.y2Scale().range()[0] + ')');

    //------------------------------------------------------------

    this.g.select('.nv-focus .nv-x.nv-axis')
        .attr('transform', 'translate(0,' + availableHeight1 + ')');

    //------------------------------------------------------------

    //============================================================
    // Functions
    //------------------------------------------------------------

    // Taken from crossfilter (http://square.github.com/crossfilter/)
    function resizePath(d) {
        var e = +(d == 'e'),
            x = e ? 1 : -1,
            y = availableHeight2 / 3;
        return 'M' + (.5 * x) + ',' + y
            + 'A6,6 0 0 ' + e + ' ' + (6.5 * x) + ',' + (y + 6)
            + 'V' + (2 * y - 6)
            + 'A6,6 0 0 ' + e + ' ' + (.5 * x) + ',' + (2 * y)
            + 'Z'
            + 'M' + (2.5 * x) + ',' + (y + 8)
            + 'V' + (2 * y - 8)
            + 'M' + (4.5 * x) + ',' + (y + 8)
            + 'V' + (2 * y - 8);
    }

    function updateBrushBG() {
        if (!that.brush.empty()) that.brush.extent(that.brushExtent());
        brushBG
            .data([that.brush.empty() ? that.x2Scale().domain() : that.brushExtent()])
            .each(function(d) {
                var leftWidth = that.x2Scale()(d[0]) - that.xScale().range()[0],
                    rightWidth = that.xScale().range()[1] - that.x2Scale()(d[1]);
                d3.select(this).select('.left')
                    .attr('width',  leftWidth < 0 ? 0 : leftWidth);
                d3.select(this).select('.right')
                    .attr('x', that.x2Scale()(d[1]))
                    .attr('width', rightWidth < 0 ? 0 : rightWidth);
            });
    }

    function onBrush() {
        that.brushExtent(that.brush.empty() ? null : that.brush.extent());
        var extent = that.brush.empty() ? that.x2Scale().domain() : that.brush.extent(),
            focusLinesWrap = null;
        that.dispatch.brush({extent: extent, brush: that.brush});
        updateBrushBG();

        //The brush extent cannot be less than one.  If it is, don't update the line chart.
/*        if (Math.abs(extent[0] - extent[1]) <= 1)
            return;*/

        //------------------------------------------------------------
        // Setup Main (Focus) Axes

        that.xAxis
            .scale(that.xScale())
            .ticks( availableWidth / 100 )
            .tickSize(-availableHeight1, 0);

        that.yAxis
            .scale(that.yScale())
            .ticks( availableHeight1 / 36 )
            .tickSize( -availableWidth, 0);

        that.lines
            .width(availableWidth)
            .height(availableHeight1)
            .color(
            data.map(function(d,i) { return d.color || that.color()(d, i) })
                .filter(function(d,i) { return !data[i].disabled })
        );

        focusLinesWrap = that.g.select('.nv-focus .nv-linesWrap').datum(
            data.filter(function(d) { return !d.disabled })
                .map(function(d) {
                    return {
                        key: d.key,
                        area: d.area,
                        values: d.values.filter(function(d,i) {
                            return that.lines.x()(d,i) >= extent[0] && that.lines.x()(d,i) <= extent[1];
                        })
                    }
                })
        );

        // Update Main (Focus) Axes
        that.g.select('.nv-focus .nv-x.nv-axis').transition().duration(that.transitionDuration()).call(that.xAxis);
        that.g.select('.nv-focus .nv-y.nv-axis').transition().duration(that.transitionDuration()).call(that.yAxis);

        focusLinesWrap.transition().duration(that.transitionDuration()).call(that.lines);

    }

    onBrush();

    Chart.prototype.draw.call(this, data);
};

LineWithFocusChart.prototype.showTooltip = function(e, offsetElement) {
    var left = e.pos[0] + ( offsetElement.offsetLeft || 0 ),
        top = e.pos[1] + ( offsetElement.offsetTop || 0),
        x = this.xAxis.tickFormat()(this.x()(e.point, e.pointIndex)),
        y = this.yAxis.tickFormat()(this.y()(e.point, e.pointIndex)),
        content = this.tooltip()(e.series.key, x, y);

    nv.tooltip.show([left, top], content, null, null, offsetElement);
};

LineWithFocusChart.prototype.defined = function(d, i) {
    return !isNaN(this.y()(d,i)) && (this.y()(d,i) !== null)
};

LineWithFocusChart.prototype.attachEvents = function(){
    Chart.prototype.attachEvents.call(this);

    this.lines.dispatch
        .on('elementMouseover.tooltip', function(e) {
            e.pos = [e.pos[0] +  this.margin().left, e.pos[1] + this.margin().top];
            this.dispatch.tooltipShow(e);
        }.bind(this))
        .on('elementMouseout.tooltip', function(e) {
            this.dispatch.tooltipHide(e);
        }.bind(this));

    this.dispatch
        .on('tooltipHide', function() {
            if (this.tooltips()) nv.tooltip.cleanup();
        }.bind(this))
        .on('tooltipShow', function(e) {
            if (this.tooltips()) this.showTooltip(e, this.svg[0][0].parentNode);
        }.bind(this));

    this.legend.dispatch.on('stateChange', function() {
        this.update();
    }.bind(this));
};

LineWithFocusChart.prototype.x = function(_) {
    if (!arguments.length) return this.lines.x();
    this.lines.x(_);
    this.lines2.x(_);
    return this;
};

LineWithFocusChart.prototype.y = function(_) {
    if (!arguments.length) return this.lines.y();
    this.lines.y(_);
    this.lines2.y(_);
    return this;
};

LineWithFocusChart.prototype.margin2 = function(_) {
    if (!arguments.length) return this.options.margin2;
    var om = this.options.margin2;
    om.top = nv.utils.valueOrDefault(_.top, om.top);
    om.bottom = nv.utils.valueOrDefault(_.bottom, om.bottom);
    om.left = nv.utils.valueOrDefault(_.left, om.left);
    om.right = nv.utils.valueOrDefault(_.right, om.right);
    return this;
};

LineWithFocusChart.prototype.interpolate = function(_) {
    if (!arguments.length) return this.lines.interpolate();
    this.lines.interpolate(_);
    this.lines2.interpolate(_);
    return this;
};

// Chart has multiple similar Axes, to prevent code duplication, probably need to link all axis functions manually like below
LineWithFocusChart.prototype.xTickFormat = function(_) {
    if (!arguments.length) return this.xAxis.tickFormat();
    this.xAxis.tickFormat(_);
    this.x2Axis.tickFormat(_);
    return this;
};

LineWithFocusChart.prototype.yTickFormat = function(_) {
    if (!arguments.length) return this.yAxis.tickFormat();
    this.yAxis.tickFormat(_);
    this.y2Axis.tickFormat(_);
    return this;
};

/**
 * The lineWithFocusChart model returns a function wrapping an instance of a LineWithFocusChart.
 */
nv.models.lineWithFocusChart = function () {
    "use strict";

    var lineWithFocusChart = new LineWithFocusChart(),
        api = [
            'margin',
            'width',
            'height',
            'height2',
            'color',
            'showLegend',
            'tooltips',
            'noData',
            'tooltipContent',
            'brushExtent',
            'transitionDuration',
            'duration',
            'x',
            'y',
            'margin',
            'margin2',
            'interpolate',
            'xTickFormat',
            'yTickFormat',
            'reduceXTicks',
            'rightAlignYAxis',
            'showXAxis',
            'showYAxis'
        ];

    function chart(selection) {
        lineWithFocusChart.render(selection);
        return chart;
    }

    chart.dispatch = lineWithFocusChart.dispatch;
    chart.legend = lineWithFocusChart.legend;
    chart.lines = lineWithFocusChart.lines;
    chart.lines2 = lineWithFocusChart.lines2;
    chart.xAxis = lineWithFocusChart.xAxis;
    chart.yAxis = lineWithFocusChart.yAxis;
    chart.x2Axis = lineWithFocusChart.x2Axis;
    chart.y2Axis = lineWithFocusChart.y2Axis;
    chart.options = nv.utils.optionsFunc.bind(chart);

    d3.rebind(chart, lineWithFocusChart.lines,
        'isArea',
        'size',
        'xDomain',
        'yDomain',
        'xRange',
        'yRange',
        'forceX',
        'forceY',
        'interactive',
        'clipEdge',
        'clipVoronoi',
        'id'
    );

    nv.utils.rebindp(chart, lineWithFocusChart, LineWithFocusChart.prototype, api);

    return chart;
};

