/**
 * Private variables
 */
var LinePlusBarWithFocusChartPrivates = {
    finderHeight: 100
    , color: nv.utils.defaultColor()
    , brushExtent : []
    , tooltips : true
    , xScale: null
    , yScale: null
    , x2Scale: null
    , y1Scale: null
    , y2Scale: null
    , y3Scale: null
    , y4Scale: null
    , _x: function(d){return d.x}
    , _y: function(d){return d.y}
    , transitionDuration: 0
};

/**
 * A LinePlusBarWithFocusChart
 */
function LinePlusBarWithFocusChart(options){
    options = nv.utils.extend({}, options, LinePlusBarWithFocusChartPrivates, {
        margin: {top: 30, right: 30, bottom: 30, left: 60}
        , chartClass: 'linePlusBar'
        , margin2: {top: 0, right: 30, bottom: 20, left: 60}
    });
    Chart.call(this, options, ['brush']);

    this.line = this.getLine();
    this.line2 = this.getLine();
    this.bars = this.getHistoricalBar();
    this.bars2 = this.getHistoricalBar();

    this.x2Axis = this.getAxis();
    this.y1Axis = this.getAxis();
    this.y2Axis = this.getAxis();
    this.y3Axis = this.getAxis();
    this.y4Axis = this.getAxis();
    this.legend = this.getLegend();
    this.brush = d3.svg.brush();

    this.line
        .clipEdge(true)
    ;
    this.line2
        .interactive(false)
    ;
    this.xAxis
        .orient('bottom')
        .tickPadding(5)
    ;
    this.y1Axis
        .orient('left')
    ;
    this.y2Axis
        .orient('right')
    ;
    this.x2Axis
        .orient('bottom')
        .tickPadding(5)
    ;
    this.y3Axis
        .orient('left')
    ;
    this.y4Axis
        .orient('right')
    ;

    var that = this;
    this.showTooltip = function(e, offsetElement) {
        if (that.brushExtent())
            e.pointIndex += Math.ceil(that.brushExtent()[0]);
        var left = e.pos[0] + ( offsetElement.offsetLeft || 0 ),
            top = e.pos[1] + ( offsetElement.offsetTop || 0),
            x = that.xAxis.tickFormat()(that.line.x()(e.point, e.pointIndex)),
            y = (e.series.bar ? that.y1Axis : that.y2Axis).tickFormat()(that.line.y()(e.point, e.pointIndex)),
            content = that.tooltip()(e.series.key, x, y);

        nv.tooltip.show([left, top], content, e.value < 0 ? 'n' : 's', null, offsetElement);
    };
}

nv.utils.create(LinePlusBarWithFocusChart, Chart, LinePlusBarWithFocusChartPrivates);

LinePlusBarWithFocusChart.prototype.getLine = function(){
    return nv.models.line();
};

LinePlusBarWithFocusChart.prototype.getHistoricalBar = function(){
    return nv.models.historicalBar();
};

/**
 * override Chart::wrapper
 * @param data
 */
LinePlusBarWithFocusChart.prototype.wrapper = function (data) {
    Chart.prototype.wrapper.call(this, data, ['brush']);

    var focusEnter = this.gEnter.append('g').attr('class', 'nv-focus');
    focusEnter.append('g').attr('class', 'nv-x nv-axis');
    focusEnter.append('g').attr('class', 'nv-y1 nv-axis');
    focusEnter.append('g').attr('class', 'nv-y2 nv-axis');
    focusEnter.append('g').attr('class', 'nv-barsWrap');
    focusEnter.append('g').attr('class', 'nv-linesWrap');

    var contextEnter = this.gEnter.append('g').attr('class', 'nv-context');
    contextEnter.append('g').attr('class', 'nv-x nv-axis');
    contextEnter.append('g').attr('class', 'nv-y1 nv-axis');
    contextEnter.append('g').attr('class', 'nv-y2 nv-axis');
    contextEnter.append('g').attr('class', 'nv-barsWrap');
    contextEnter.append('g').attr('class', 'nv-linesWrap');
    contextEnter.append('g').attr('class', 'nv-brushBackground');
    contextEnter.append('g').attr('class', 'nv-x nv-brush');

};

/**
 * @override Chart::draw
 */
LinePlusBarWithFocusChart.prototype.draw = function(data){

    var that = this
        , availableWidth = this.available.width
        , availableHeight1 = this.available.height - this.finderHeight()
        , availableHeight2 = this.finderHeight() - this.options.margin2.top - this.options.margin2.bottom;

    //------------------------------------------------------------
    // Setup Scales

    var dataBars = data.filter(function(d) { return !d.disabled && d.bar });
    var dataLines = data.filter(function(d) { return !d.bar }); // removed the !d.disabled clause here to fix Issue #240

    this.xScale( this.bars.xScale() );
    this.x2Scale( this.x2Axis.scale() );

    this.yScale( this.bars.yScale() );
    this.y1Scale( this.bars.yScale() );
    this.y2Scale( this.line.yScale() );
    this.y3Scale( this.bars2.yScale() );
    this.y4Scale( this.line2.yScale() );

    var series1 = data
        .filter(function(d) { return !d.disabled && d.bar })
        .map(function(d) {
            return d.values.map(function(d,i) {
                return { x: that.x()(d,i), y: that.y()(d,i) }
            })
        });

    var series2 = data
        .filter(function(d) { return !d.disabled && !d.bar })
        .map(function(d) {
            return d.values.map(function(d,i) {
                return { x: that.x()(d,i), y: that.y()(d,i) }
            })
        });

    this.xScale().range([0, availableWidth]);

    this.x2Scale()
        .domain( d3.extent(d3.merge(series1.concat(series2)),function(d){return d.x}) )
        .range([0, availableWidth]);

    //------------------------------------------------------------


    //------------------------------------------------------------
    // Context Components

    this.bars2
        .width(availableWidth)
        .height(availableHeight2)
        .color(
            data.map(function(d,i) {return d.color || that.color()(d, i);})
                .filter(function(d,i) { return !data[i].disabled && data[i].bar })
        );

    this.line2
        .width(availableWidth)
        .height(availableHeight2)
        .color(
            data.map(function(d,i) { return d.color || that.color()(d, i) })
                .filter(function(d,i) { return !data[i].disabled && !data[i].bar })
        );

    var bars2Wrap = this.g.select('.nv-context .nv-barsWrap')
        .datum(dataBars.length ? dataBars : [{values:[]}]);

    var lines2Wrap = this.g.select('.nv-context .nv-linesWrap')
        .datum(!dataLines[0].disabled ? dataLines : [{values:[]}]);

    this.g.select('.nv-context')
        .attr('transform', 'translate(0,' + ( availableHeight1 + this.margin().bottom + this.options.margin2.top) + ')');

    bars2Wrap.transition().call(this.bars2);
    lines2Wrap.transition().call(this.line2);

    //------------------------------------------------------------

    //------------------------------------------------------------
    // Setup Brush

    this.brush
        .x(this.x2Scale())
        .on('brush', onBrush);

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

    //------------------------------------------------------------
    // Setup Secondary (Context) Axes

    this.x2Axis
        .ticks( availableWidth / 100 )
        .tickSize(-availableHeight2, 0);

    this.g.select('.nv-context .nv-x.nv-axis')
        .attr('transform', 'translate(0,' + this.y3Scale().range()[0] + ')');
    this.g.select('.nv-context .nv-x.nv-axis').transition()
        .call(this.x2Axis);

    this.y3Axis
        .scale(this.y3Scale())
        .ticks( availableHeight2 / 36 )
        .tickSize( -availableWidth, 0);

    this.g.select('.nv-context .nv-y1.nv-axis')
        .style('opacity', dataBars.length ? 1 : 0)
        .attr('transform', 'translate(0,' + this.x2Scale().range()[0] + ')');

    this.g.select('.nv-context .nv-y1.nv-axis').transition()
        .call(this.y3Axis);

    this.y4Axis
        .scale(this.y4Scale())
        .ticks( availableHeight2 / 36 )
        .tickSize(dataBars.length ? 0 : -availableWidth, 0); // Show the y2 rules only if y1 has none

    this.g.select('.nv-context .nv-y2.nv-axis')
        .style('opacity', dataLines.length ? 1 : 0)
        .attr('transform', 'translate(' + this.x2Scale().range()[1] + ',0)');

    this.g.select('.nv-context .nv-y2.nv-axis').transition()
        .call(this.y4Axis);

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
                var leftWidth = that.x2Scale()(d[0]) - that.x2Scale().range()[0],
                    rightWidth = that.x2Scale().range()[1] - that.x2Scale()(d[1]);
                d3.select(this).select('.left')
                    .attr('width',  leftWidth < 0 ? 0 : leftWidth);
                d3.select(this).select('.right')
                    .attr('x', that.x2Scale()(d[1]))
                    .attr('width', rightWidth < 0 ? 0 : rightWidth);
            });
    }

    function onBrush() {
        that.brushExtent(that.brush.empty() ? null : that.brush.extent());
        var extent = that.brush.empty() ? that.x2Scale().domain() : that.brush.extent();
        that.dispatch.brush({extent: extent, brush: that.brush});
        updateBrushBG();

        //------------------------------------------------------------
        // Prepare Main (Focus) Bars and Lines

        that.bars
            .width(availableWidth)
            .height(availableHeight1)
            .color(
                data.map(function(d,i) { return d.color || that.color()(d, i) })
                    .filter(function(d,i) { return !data[i].disabled && data[i].bar })
            );

        that.line
            .width(availableWidth)
            .height(availableHeight1)
            .color(
                data.map(function(d,i) { return d.color || that.color()(d, i) })
                    .filter(function(d,i) { return !data[i].disabled && !data[i].bar })
            );

        var focusBarsWrap = that.g.select('.nv-focus .nv-barsWrap')
            .datum(!dataBars.length ? [{values:[]}] :
                dataBars
                    .map(function(d) {
                        return {
                            key: d.key,
                            values: d.values.filter(function(d,i) {
                                return that.bars.x()(d,i) >= extent[0] && that.bars.x()(d,i) <= extent[1];
                            })
                        }
                    })
            );

        var focusLinesWrap = that.g.select('.nv-focus .nv-linesWrap')
            .datum(dataLines[0].disabled ? [{values:[]}] :
                dataLines
                    .map(function(d) {
                        return {
                            key: d.key,
                            values: d.values.filter(function(d,i) {
                                return that.line.x()(d,i) >= extent[0] && that.line.x()(d,i) <= extent[1];
                            })
                        }
                    })
            );

        //------------------------------------------------------------


        //------------------------------------------------------------
        // Update Main (Focus) X Axis

        if (dataBars.length)
            that.xScale(that.bars.xScale());
        else
            that.xScale(that.line.xScale());

        that.xAxis
            .scale(that.xScale())
            .ticks( availableWidth / 100 )
            .tickSize(-availableHeight1, 0);

        that.xScale().domain( [Math.ceil(extent[0]), Math.floor(extent[1])] );

        that.g.select('.nv-x.nv-axis').transition().duration(that.transitionDuration())
            .call(that.xAxis);
        //------------------------------------------------------------


        //------------------------------------------------------------
        // Update Main (Focus) Bars and Lines

        focusBarsWrap.transition().duration(that.transitionDuration()).call(that.bars);
        focusLinesWrap.transition().duration(that.transitionDuration()).call(that.line);

        //------------------------------------------------------------


        //------------------------------------------------------------
        // Setup and Update Main (Focus) Y Axes

        that.g.select('.nv-focus .nv-x.nv-axis')
            .attr('transform', 'translate(0,' + that.y1Scale().range()[0] + ')');

        that.y1Axis
            .scale(that.y1Scale())
            .ticks( availableHeight1 / 36 )
            .tickSize(-availableWidth, 0);

        that.g.select('.nv-focus .nv-y1.nv-axis')
            .style('opacity', dataBars.length ? 1 : 0);

        that.y2Axis
            .scale(that.y2Scale())
            .ticks( availableHeight1 / 36 )
            .tickSize(dataBars.length ? 0 : -availableWidth, 0); // Show the y2 rules only if y1 has none

        that.g.select('.nv-focus .nv-y2.nv-axis')
            .style('opacity', dataLines.length ? 1 : 0)
            .attr('transform', 'translate(' + that.xScale().range()[1] + ',0)');

        that.g.select('.nv-focus .nv-y1.nv-axis').transition().duration(that.transitionDuration())
            .call(that.y1Axis);
        that.g.select('.nv-focus .nv-y2.nv-axis').transition().duration(that.transitionDuration())
            .call(that.y2Axis);
    }

    onBrush();

    Chart.prototype.draw.call(this, data);
};

/**
 * @override Chart::attachEvents
 */
LinePlusBarWithFocusChart.prototype.attachEvents = function(){
    Chart.prototype.attachEvents.call(this);
    this.line.dispatch
        .on('elementMouseover.tooltip', function(e) {
            e.pos = [e.pos[0] +  this.margin().left, e.pos[1] + this.margin().top];
            this.dispatch.tooltipShow(e);
        }.bind(this))
        .on('elementMouseout.tooltip', function(e) {
            this.dispatch.tooltipHide(e);
        }.bind(this));

    this.bars.dispatch
        .on('elementMouseover.tooltip', function(e) {
            e.pos = [e.pos[0] + this.margin().left, e.pos[1] + this.margin().top];
            this.dispatch.tooltipShow(e);
        }.bind(this))
        .on('elementMouseout.tooltip', function(e) {
            this.dispatch.tooltipHide(e);
        }.bind(this));

    this.legend.dispatch.on('stateChange', function() {
        this.update();
    }.bind(this));

    this.dispatch.on('tooltipShow', function(e) {
        if (this.tooltips()) this.showTooltip(e, this.svg[0][0].parentNode);
    }.bind(this));

};

LinePlusBarWithFocusChart.prototype.x = function(_) {
    if (!arguments.length) return this._x();
    this._x(_);
    this.line.x(_);
    this.bars.x(_);
    return this;
};

LinePlusBarWithFocusChart.prototype.y = function(_) {
    if (!arguments.length) return this._y();
    this._y(_);
    this.line.y(_);
    this.bars.y(_);
    return this;
};

LinePlusBarWithFocusChart.prototype.color = function(_) {
    if (!arguments.length) return this.options.color;
    this.options.color = nv.utils.getColor(_);
    this.legend.color( this.color() );
    return this;
};

/**
 * The linePlusBarWithFocusChart model returns a function wrapping an instance of a LinePlusBarWithFocusChart.
 */
nv.models.linePlusBarWithFocusChart = function() {
    "use strict";

    var linePlusBarWithFocusChart = new LinePlusBarWithFocusChart(),
        api = [
            'x',
            'y',
            'margin',
            'width',
            'height',
            'color',
            'showLegend',
            'tooltips',
            'tooltipContent',
            'noData',
            'brushExtent',
            'finderHeight',
            'yScale',
            'reduceXTicks',
            'rightAlignYAxis',
            'showXAxis',
            'showYAxis'
        ];

    function chart(selection) {
        linePlusBarWithFocusChart.render(selection);
        return chart;
    }

    chart.dispatch = linePlusBarWithFocusChart.dispatch;
    chart.legend = linePlusBarWithFocusChart.legend;
    chart.lines = linePlusBarWithFocusChart.line;
    chart.lines2 = linePlusBarWithFocusChart.line2;
    chart.bars = linePlusBarWithFocusChart.bars;
    chart.bars2 = linePlusBarWithFocusChart.bars2;
    chart.xAxis = linePlusBarWithFocusChart.xAxis;
    chart.x2Axis = linePlusBarWithFocusChart.x2Axis;
    chart.y1Axis = linePlusBarWithFocusChart.y1Axis;
    chart.y2Axis = linePlusBarWithFocusChart.y2Axis;
    chart.y3Axis = linePlusBarWithFocusChart.y3Axis;
    chart.y4Axis = linePlusBarWithFocusChart.y4Axis;

    //d3.rebind(chart, linePlusBarWithFocusChart.historicalBar, '');

    d3.rebind(chart, linePlusBarWithFocusChart.line,
        'defined',
        'size',
        'clipVoronoi',
        'interpolate'
    );
    //TODO: consider rebinding x, y and some other stuff, and simply do something like bars.x(lines.x()), etc.
    //d3.rebind(chart, lines, 'x', 'y', 'size', 'xDomain', 'yDomain', 'xRange', 'yRange', 'forceX', 'forceY', 'interactive', 'clipEdge', 'clipVoronoi', 'id');

    chart.options = nv.utils.optionsFunc.bind(chart);

    nv.utils.rebindp(chart, linePlusBarWithFocusChart, LinePlusBarWithFocusChart.prototype, api);

    return chart;
};
