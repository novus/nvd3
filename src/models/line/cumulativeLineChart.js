var CumulativeLineChartPrivates = {
    tooltips : true
    , showControls : true
    , rescaleY : true
    , tooltip : function(key, x, y) {
        return '<h3>' + key + '</h3>' +
            '<p>' +  y + ' at ' + x + '</p>'
    }
    , defaultState : null
    , average : function(d) { return d.average }
    , transitionDuration : 250
    , noErrorCheck : false  //if set to TRUE, will bypass an error check in the indexify function.
    , dxScale : null
    , index : {i: 0, x: 0}
    , xScale : null
    , yScale : null
    , duration : 250
    , useInteractiveGuideline : false
    , state: null
    , id: null
    , x: function(d){return d.x}
    , y: function(d){return d.y}
};

function CumulativeLineChart(options){
    options = nv.utils.extend({}, options, CumulativeLineChartPrivates, {
        margin: {top: 30, right: 30, bottom: 50, left: 60}
        , chartClass: 'cumulativeLine'
        , wrapClass: 'linesWrap'
    });
    Chart.call(this, options, ['']);

    this.line = this.getLine();
    this.controls = this.getLegend();

    this.controls.updateState(false);
    this.interactiveLayer = this.getInteractiveLayer();
    this.state = d3.functor( {index: 0, rescaleY: this.rescaleY()} );
    this.indexLine = null;
    this.dxScale(d3.scale.linear());
}

nv.utils.create(CumulativeLineChart, Chart, CumulativeLineChartPrivates);

CumulativeLineChart.prototype.getLine = function(){
    return nv.models.line();
};

CumulativeLineChart.prototype.getInteractiveLayer = function(){
    return nv.interactiveGuideline()
};

/**
 * override Chart::wrapper
 * @param data
 */
CumulativeLineChart.prototype.wrapper = function(data){
    Chart.prototype.wrapper.call(this, data,
        ['nv-interactive', 'nv-background', 'nv-avgLinesWrap', 'nv-controlsWrap']
    );
    this.renderWatch.models(this.line);
    if (this.showXAxis()) this.renderWatch.models(this.xAxis);
    if (this.showYAxis()) this.renderWatch.models(this.yAxis);
};

/**
 * @override Chart::draw
 */
CumulativeLineChart.prototype.draw = function(data){

    this.id(this.line.id());
    this.x(this.line.x());
    this.y(this.line.y());

    this.svg.classed('nv-chart-' + this.id(), true);

    this.xScale( this.line.xScale() );

    this.line.yScale();
    this.yScale( this.line.yScale() );

    var that = this
        , availableWidth = this.available.width
        , availableHeight = this.available.height
        , indexDrag = d3.behavior.drag()
            .on('dragstart', dragStart)
            .on('drag', dragMove)
            .on('dragend', dragEnd);

    if (!this.rescaleY()) {
        var seriesDomains = data
            .filter(function(series) { return !series.disabled })
            .map(function(series) {
                var initialDomain = d3.extent(series.values, that.line.y());

                //account for series being disabled when losing 95% or more
                if (initialDomain[0] < -.95)
                    initialDomain[0] = -.95;

                return [
                    (initialDomain[0] - initialDomain[1]) / (1 + initialDomain[1]),
                    (initialDomain[1] - initialDomain[0]) / (1 + initialDomain[0])
                ];
            });
        var completeDomain = [
            d3.min(seriesDomains, function(d) { return d[0] }),
            d3.max(seriesDomains, function(d) { return d[1] })
        ];
        this.line.yDomain(completeDomain);
    } else
        this.line.yDomain(null);

    this.dxScale()
        .domain([0, data[0].values.length - 1]) //Assumes all series have same length
        .range([0, availableWidth])
        .clamp(true);

    var data = this.indexify(this.index().i, data);

    if (this.showControls()) {
        var controlsData = [
            { key: 'Re-scale y-axis', disabled: !this.rescaleY() }
        ];

        this.controls
            .width(140)
            .color(['#444', '#444', '#444'])
            .rightAlign(false)
            .margin({top: 5, right: 0, bottom: 5, left: 20})
        ;

        this.g.select('.nv-controlsWrap')
            .datum(controlsData)
            .attr('transform', 'translate(0,' + (-this.margin().top) +')')
            .call(this.controls);
    }

    // Show error if series goes below 100%
    var tempDisabled = data.filter(function(d) { return d.tempDisabled });

    this.wrap.select('.tempDisabled').remove(); //clean-up and prevent duplicates
    if (tempDisabled.length) {
        this.wrap.append('text').attr('class', 'tempDisabled')
            .attr('x', availableWidth / 2)
            .attr('y', '-.71em')
            .style('text-anchor', 'end')
            .text(tempDisabled.map(function(d) { return d.key }).join(', ') + ' values cannot be calculated for this time period.');
    }

    // Set up interactive layer
    if (this.useInteractiveGuideline()) {
        this.interactiveLayer
            .width(availableWidth)
            .height(availableHeight)
            .margin({left:this.margin().left, top:this.margin().top})
            .svgContainer(this.svg)
            .xScale(this.xScale());
        this.wrap.select(".nv-interactive")
            .call(this.interactiveLayer);
        this.wrap.select(".nv-interactiveLineLayer")
            .attr("transform", "translate(0,0)");
    }

    this.gEnter.select('.nv-background')
        .append('rect');

    this.g.select('.nv-background rect')
        .attr('width', availableWidth)
        .attr('height', availableHeight);

    this.line
        //.x(function(d) { return d.x })
        .y(function(d) { return d.display.y })
        .width(availableWidth)
        .height(availableHeight)
        .color(
            data
                .map(function(d,i){ return d.color || that.color()(d, i)})
                .filter(function(d,i) { return !data[i].disabled && !data[i].tempDisabled; })
        );

    var linesWrap = this.g.select('.nv-linesWrap')
        .style("pointer-events", (this.useInteractiveGuideline()) ? "none" : "all")
        .datum(
            data.filter(function(d) { return !d.disabled && !d.tempDisabled })
        );

    linesWrap.call(this.line);

    //Store a series index number in the data array.
    data.forEach(function(d,i) {
        d.seriesIndex = i;
    });

    var avgLineData = data.filter(function(d) {
        return !d.disabled && !!that.average()(d);
    });

    var avgLines = this.g.select(".nv-avgLinesWrap")
        .style("pointer-events","none")
        .selectAll("line")
        .data(avgLineData, function(d) { return d.key; });

    var getAvgLineY = function(d) {
        //If average lines go off the svg element, clamp them to the svg bounds.
        var yVal = that.yScale()(that.average()(d));
        if (yVal < 0) return 0;
        if (yVal > availableHeight) return availableHeight;
        return yVal;
    };

    avgLines.enter()
        .append('line')
        .style('stroke-width',2)
        .style('stroke-dasharray', '10,10')
        .style('stroke',function (d) {
            return that.line.color()(d,d.seriesIndex);
        })
        .attr('x1',0)
        .attr('x2',availableWidth)
        .attr('y1', getAvgLineY)
        .attr('y2', getAvgLineY);

    avgLines
        .style('stroke-opacity',function(d){
            //If average lines go offscreen, make them transparent
            var yVal = that.yScale()(that.average()(d));
            if (yVal < 0 || yVal > availableHeight) return 0;
            return 1;
        })
        .attr('x1',0)
        .attr('x2',availableWidth)
        .attr('y1', getAvgLineY)
        .attr('y2', getAvgLineY);

    avgLines.exit().remove();

    this.indexLine = linesWrap.selectAll('.nv-indexLine')
        .data([that.index()]);
    this.indexLine.enter().append('rect').attr('class', 'nv-indexLine')
        .attr('width', 3)
        .attr('x', -2)
        .attr('fill', 'red')
        .attr('fill-opacity', .5)
        .style("pointer-events","all")
        .call(indexDrag);

    this.indexLine
        .attr('transform', function(d) { return 'translate(' + that.dxScale()(d.i) + ',0)' })
        .attr('height', availableHeight);

    this.plotAxes(data);

    function dragStart() {
        that.svg.style('cursor', 'ew-resize');
    }

    function dragMove() {
        that.index().x = d3.event.x;
        that.index().i = Math.round(that.dxScale().invert( that.index().x ));
        that.updateZero();
    }

    function dragEnd() {
        that.svg.style('cursor', 'auto');
        // update state and send stateChange with new index
        that.state().index = that.index().i;
        that.dispatch.stateChange(that.state());
    }
};

CumulativeLineChart.prototype.plotAxes = function(data){

    if (this.rightAlignYAxis()) {
        this.wrap.select('.nv-y.nv-axis')
            .attr("transform", "translate(" + this.available.width + ", 0)");
    }

    if (this.showXAxis()) {

        this.xAxis
            //Suggest how many ticks based on the chart width and D3 should listen (70 is the optimal number for MM/DD/YY dates)
            .ticks( Math.min(data[0].values.length, this.available.width/70) )
            .orient('bottom')
            .tickPadding(7)
            .highlightZero(true)
            .showMaxMin(false)
            .scale(this.xScale())
            .tickSize(-this.available.height, 0);

        this.wrap.select('.nv-x.nv-axis')
            .style("pointer-events","none")
            .attr('transform', 'translate(0,' + this.yScale().range()[0] + ')')
            .transition()
            .call(this.xAxis);
    }

    if (this.showYAxis()) {

        this.yAxis
            .orient(this.rightAlignYAxis() ? 'right' : 'left')
            .tickFormat(d3.format(',.1f'))
            .scale(this.yScale())
            .ticks( this.available.height / 36 )
            .tickSize( -this.available.width, 0);

        this.wrap.select('.nv-y.nv-axis')
            .transition().call(this.yAxis);
    }
};

/**
 * @override Chart::attachEvents
 */
CumulativeLineChart.prototype.attachEvents = function(){

    var that = this,
        data = null;

    this.svg.call(function(selection){
        selection.each(function(d){
            data = d;
        })
    });

    this.line.dispatch
        .on('elementMouseover.tooltip', function(e) {
            e.pos = [e.pos[0] +  this.margin().left, e.pos[1] + that.margin().top];
            that.dispatch.tooltipShow(e);
        })
        .on('elementMouseout.tooltip', function(e) {
            that.dispatch.tooltipHide(e);
        })
        .on('elementClick', function(e) {
            that.index().i = e.pointIndex;
            that.index().x = that.dxScale()(that.index().i);
            // update state and send stateChange with new index
            that.state().index = that.index().i;
            that.dispatch.stateChange(that.state());
            that.updateZero();
        });

    this.controls.dispatch.on('legendClick', function(d) {
        d.disabled = !d.disabled;
        that.rescaleY(!d.disabled);
        that.state().rescaleY = that.rescaleY();
        that.dispatch.stateChange(that.state());
        that.update();
    });

    this.legend.dispatch.on('stateChange', function(newState) {
        that.state().disabled = newState.disabled;
        that.dispatch.stateChange(that.state());
        that.update();
    });

    this.interactiveLayer.dispatch
        .on('elementMousemove', function(e) {
            that.line.clearHighlights();
            var singlePoint, pointIndex, pointXLocation, allData = [];
            data
                .filter(function(series, i) { series.seriesIndex = i; return !series.disabled; })
                .forEach(function(series,i) {
                    pointIndex = nv.interactiveBisect(series.values, e.pointXValue, that.x());
                    that.line.highlightPoint(i, pointIndex, true);

                    var point = series.values[pointIndex];
                    if (typeof point === 'undefined') return;
                    if (typeof singlePoint === 'undefined') singlePoint = point;
                    if (typeof pointXLocation === 'undefined') pointXLocation = that.xScale()(that.x()(point,pointIndex));

                    allData.push({
                        key: series.key,
                        value: that.y()(point, pointIndex),
                        color: that.color()(series,series.seriesIndex)
                    });
                });

            //Highlight the tooltip entry based on which point the mouse is closest to.
            if (allData.length > 2) {
                var yValue = that.yScale().invert(e.mouseY);
                var domainExtent = Math.abs(that.yScale().domain()[0] - that.yScale().domain()[1]);
                var threshold = 0.03 * domainExtent;
                var indexToHighlight = nv.nearestValueIndex(allData.map(function(d){return d.value}),yValue,threshold);
                if (indexToHighlight !== null)
                    allData[indexToHighlight].highlight = true;
            }

            var xValue = that.xAxis.tickFormat()(that.x()(singlePoint,pointIndex), pointIndex);
            that.interactiveLayer.tooltip
                .position({left: pointXLocation + that.margin().left, top: e.mouseY + that.margin().top})
                .chartContainer(that.parentNode)
                .enabled(that.tooltips())
                .valueFormatter(function(d) {
                    return that.yAxis.tickFormat()(d);
                })
                .data({ value: xValue, series: allData })
                ();

            that.interactiveLayer.renderGuideLine()(pointXLocation);
        })
        .on("elementMouseout",function() {
            that.dispatch.tooltipHide();
            that.line.clearHighlights();
        });

    this.dispatch
        .on('tooltipHide', function() {
            if (that.tooltips()) nv.tooltip.cleanup();
        })
        .on('tooltipShow', function(e) {
            if (that.tooltips())
                that.showTooltip()(e, that.svg[0][0]);
        })
        .on('changeState', function(e) { // Update chart from a state object passed to event handler
            if (typeof e.disabled !== 'undefined') {
                that.svg.call(function(selection){
                    selection.each(function(data){
                        data.forEach(function(series,i) { series.disabled = e.disabled[i] });
                        that.state().disabled = e.disabled;
                    });
                });
            }
            if (typeof e.index !== 'undefined') {
                that.index().i = e.index;
                that.index().x = that.dxScale()(that.index().i);
                that.state().index = e.index;
                that.indexLine.data([that.index()]);
            }
            if (typeof e.rescaleY !== 'undefined')
                that.rescaleY( e.rescaleY );
            that.update();
        });

    this.g.select('.nv-background rect')
        .on('click', function() {
            that.index().x = d3.mouse(this)[0];
            that.index().i = Math.round(that.dxScale().invert(that.index().x));
            // update state and send stateChange with new index
            that.state().index = that.index().i;
            that.dispatch.stateChange(that.state());
            that.updateZero();
        });
};

/* Normalize the data according to an index point. */
CumulativeLineChart.prototype.indexify = function(idx, data) {
    return data.map(function(line) {
        if (!line.values) return line;
        var indexValue = line.values[idx];
        if (indexValue == null) return line;
        var v = this.line.y()(indexValue, idx);
        //TODO: implement check below, and disable series if series loses 100% or more cause divide by 0 issue
        if (v < -.95 && !this.noErrorCheck()) {
            //if a series loses more than 100%, calculations fail.. anything close can cause major distortion (but is mathematically correct till it hits 100)
            line.tempDisabled = true;
            return line;
        }
        line.tempDisabled = false;
        line.values = line.values.map(function(point, pointIndex) {
            point.display = {'y': (this.line.y()(point, pointIndex) - v) / (1 + v) };
            return point;
        }.bind(this));
        return line;
    }.bind(this))
};

CumulativeLineChart.prototype.updateZero = function() {
    this.indexLine.data([this.index()]);
    //When dragging the index line, turn off line transitions.
    // Then turn them back on when done dragging.
    var oldDuration = this.duration();
    this.duration(0);
    this.update();
    this.duration(oldDuration);
};

CumulativeLineChart.prototype.showTooltip = function(e, offsetElement) {
    var left = e.pos[0] + ( offsetElement.offsetLeft || 0 ),
        top = e.pos[1] + ( offsetElement.offsetTop || 0),
        x = this.xAxis.tickFormat()(this.line.x()(e.point, e.pointIndex)),
        y = this.yAxis.tickFormat()(this.line.y()(e.point, e.pointIndex)),
        content = this.tooltip()(e.series.key, x, y);

    nv.tooltip.show([left, top], content, null, null, offsetElement);
};

CumulativeLineChart.prototype.color = function(_) {
    if (!arguments.length) return this.options.color;
    this.options.color = nv.utils.getColor(_) ;
    this.legend.color( this.options.color );
    return this;
};

CumulativeLineChart.prototype.useInteractiveGuideline = function(_) {
    if(!arguments.length) return this.options.useInteractiveGuideline;
    this.options.useInteractiveGuideline = _;
    if (_ === true) {
        this.line.interactive(false);
        this.line.useVoronoi(false);
    }
    return this;
};

CumulativeLineChart.prototype.duration = function(_) {
    if(!arguments.length) return this.options.duration;
    this.options.duration = _;
    this.line.duration(_);
    this.xAxis.duration(_);
    this.yAxis.duration(_);
    this.renderWatch.reset(_);
    return this;
};

CumulativeLineChart.prototype.x = function(_){
    if (!arguments.length) return this.options.x;
    this.options.x = _;
    this.line.x(_);
    return this;
};

CumulativeLineChart.prototype.y = function(_){
    if (!arguments.length) return this.options.y;
    this.options.y = _;
    this.line.y(_);
    return this;
};

nv.models.cumulativeLineChart = function(){
    "use strict";

    var cumulativeLineChart = new CumulativeLineChart(),
        api = [
            'margin',
            'width',
            'height',
            'color',
            'rescaleY',
            'showControls',
            'useInteractiveGuideline',
            'showLegend',
            'showXAxis',
            'showYAxis',
            'tooltips',
            'tooltipContent',
            'state',
            'defaultState',
            'noData',
            'average',
            'duration',
            'transitionDuration',
            'noErrorCheck',
            'reduceXTicks',
            'rightAlignYAxis',
            'x',
            'y'
        ];

    function chart(selection){
        cumulativeLineChart.render(selection);
        return chart;
    }

    chart.dispatch = cumulativeLineChart.dispatch;
    chart.lines = cumulativeLineChart.line;
    chart.legend = cumulativeLineChart.legend;
    chart.interactiveLayer = cumulativeLineChart.interactiveLayer;
    chart.xAxis = cumulativeLineChart.xAxis;
    chart.yAxis = cumulativeLineChart.yAxis;

    d3.rebind(chart, cumulativeLineChart.line,
        'isArea',
        'x',
        'y',
        'xDomain',
        'yDomain',
        'xRange',
        'yRange',
        'forceX',
        'forceY',
        'interactive',
        'clipEdge',
        'clipVoronoi',
        'useVoronoi',
        'id'
    );

    chart.options = nv.utils.optionsFunc.bind(chart);

    nv.utils.rebindp(chart, cumulativeLineChart, CumulativeLineChart.prototype, api);

    return chart;
};

