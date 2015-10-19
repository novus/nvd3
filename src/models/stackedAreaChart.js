
nv.models.stackedAreaChart = function() {
    "use strict";

    //============================================================
    // Public Variables with Default Settings
    //------------------------------------------------------------

    var stacked = nv.models.stackedArea()
        , xAxis = nv.models.axis()
        , yAxis = nv.models.axis()
        , legend = nv.models.legend()
        , controls = nv.models.legend()
        , interactiveLayer = nv.interactiveGuideline()
        , tooltip = nv.models.tooltip()
        ;

    var margin = {top: 30, right: 25, bottom: 50, left: 60}
        , width = null
        , height = null
        , color = nv.utils.defaultColor()
        , showControls = true
        , showLegend = true
        , showXAxis = true
        , showYAxis = true
        , rightAlignYAxis = false
        , useInteractiveGuideline = false
        , showTotalInTooltip = true
        , totalLabel = 'TOTAL'
        , x //can be accessed via chart.xScale()
        , y //can be accessed via chart.yScale()
        , state = nv.utils.state()
        , defaultState = null
        , noData = null
        , dispatch = d3.dispatch('stateChange', 'changeState','renderEnd')
        , controlWidth = 250
        , controlOptions = ['Stacked','Stream','Expanded']
        , controlLabels = {}
        , duration = 250
        ;

    state.style = stacked.style();
    xAxis.orient('bottom').tickPadding(7);
    yAxis.orient((rightAlignYAxis) ? 'right' : 'left');

    tooltip
        .headerFormatter(function(d, i) {
            return xAxis.tickFormat()(d, i);
        })
        .valueFormatter(function(d, i) {
            return yAxis.tickFormat()(d, i);
        });

    interactiveLayer.tooltip
        .headerFormatter(function(d, i) {
            return xAxis.tickFormat()(d, i);
        })
        .valueFormatter(function(d, i) {
            return yAxis.tickFormat()(d, i);
        });

    var oldYTickFormat = null,
        oldValueFormatter = null;

    controls.updateState(false);

    //============================================================
    // Private Variables
    //------------------------------------------------------------

    var renderWatch = nv.utils.renderWatch(dispatch);
    var style = stacked.style();

    var stateGetter = function(data) {
        return function(){
            return {
                active: data.map(function(d) { return !d.disabled }),
                style: stacked.style()
            };
        }
    };

    var stateSetter = function(data) {
        return function(state) {
            if (state.style !== undefined)
                style = state.style;
            if (state.active !== undefined)
                data.forEach(function(series,i) {
                    series.disabled = !state.active[i];
                });
        }
    };

    var percentFormatter = d3.format('%');

    function chart(selection) {
        renderWatch.reset();
        renderWatch.models(stacked);
        if (showXAxis) renderWatch.models(xAxis);
        if (showYAxis) renderWatch.models(yAxis);

        selection.each(function(data) {
            var container = d3.select(this),
                that = this;
            nv.utils.initSVG(container);

            var availableWidth = nv.utils.availableWidth(width, container, margin),
                availableHeight = nv.utils.availableHeight(height, container, margin);

            chart.update = function() { container.transition().duration(duration).call(chart); };
            chart.container = this;

            state
                .setter(stateSetter(data), chart.update)
                .getter(stateGetter(data))
                .update();

            // DEPRECATED set state.disabled
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

            // Display No Data message if there's nothing to show.
            if (!data || !data.length || !data.filter(function(d) { return d.values.length }).length) {
                nv.utils.noData(chart, container)
                return chart;
            } else {
                container.selectAll('.nv-noData').remove();
            }

            // Setup Scales
            x = stacked.xScale();
            y = stacked.yScale();

            // Setup containers and skeleton of chart
            var wrap = container.selectAll('g.nv-wrap.nv-stackedAreaChart').data([data]);
            var gEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap nv-stackedAreaChart').append('g');
            var g = wrap.select('g');

            gEnter.append("rect").style("opacity",0);
            gEnter.append('g').attr('class', 'nv-x nv-axis');
            gEnter.append('g').attr('class', 'nv-y nv-axis');
            gEnter.append('g').attr('class', 'nv-stackedWrap');
            gEnter.append('g').attr('class', 'nv-legendWrap');
            gEnter.append('g').attr('class', 'nv-controlsWrap');
            gEnter.append('g').attr('class', 'nv-interactive');

            g.select("rect").attr("width",availableWidth).attr("height",availableHeight);

            // Legend
            if (showLegend) {
                var legendWidth = (showControls) ? availableWidth - controlWidth : availableWidth;

                legend.width(legendWidth);
                g.select('.nv-legendWrap').datum(data).call(legend);

                if ( margin.top != legend.height()) {
                    margin.top = legend.height();
                    availableHeight = nv.utils.availableHeight(height, container, margin);
                }

                g.select('.nv-legendWrap')
                    .attr('transform', 'translate(' + (availableWidth-legendWidth) + ',' + (-margin.top) +')');
            }

            // Controls
            if (showControls) {
                var controlsData = [
                    {
                        key: controlLabels.stacked || 'Stacked',
                        metaKey: 'Stacked',
                        disabled: stacked.style() != 'stack',
                        style: 'stack'
                    },
                    {
                        key: controlLabels.stream || 'Stream',
                        metaKey: 'Stream',
                        disabled: stacked.style() != 'stream',
                        style: 'stream'
                    },
                    {
                        key: controlLabels.expanded || 'Expanded',
                        metaKey: 'Expanded',
                        disabled: stacked.style() != 'expand',
                        style: 'expand'
                    },
                    {
                        key: controlLabels.stack_percent || 'Stack %',
                        metaKey: 'Stack_Percent',
                        disabled: stacked.style() != 'stack_percent',
                        style: 'stack_percent'
                    }
                ];

                controlWidth = (controlOptions.length/3) * 260;
                controlsData = controlsData.filter(function(d) {
                    return controlOptions.indexOf(d.metaKey) !== -1;
                });

                controls
                    .width( controlWidth )
                    .color(['#444', '#444', '#444']);

                g.select('.nv-controlsWrap')
                    .datum(controlsData)
                    .call(controls);

                if ( margin.top != Math.max(controls.height(), legend.height()) ) {
                    margin.top = Math.max(controls.height(), legend.height());
                    availableHeight = nv.utils.availableHeight(height, container, margin);
                }

                g.select('.nv-controlsWrap')
                    .attr('transform', 'translate(0,' + (-margin.top) +')');
            }

            wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

            if (rightAlignYAxis) {
                g.select(".nv-y.nv-axis")
                    .attr("transform", "translate(" + availableWidth + ",0)");
            }

            //Set up interactive layer
            if (useInteractiveGuideline) {
                interactiveLayer
                    .width(availableWidth)
                    .height(availableHeight)
                    .margin({left: margin.left, top: margin.top})
                    .svgContainer(container)
                    .xScale(x);
                wrap.select(".nv-interactive").call(interactiveLayer);
            }

            stacked
                .width(availableWidth)
                .height(availableHeight);

            var stackedWrap = g.select('.nv-stackedWrap')
                .datum(data);

            stackedWrap.transition().call(stacked);

            // Setup Axes
            if (showXAxis) {
                xAxis.scale(x)
                    ._ticks( nv.utils.calcTicksX(availableWidth/100, data) )
                    .tickSize( -availableHeight, 0);

                g.select('.nv-x.nv-axis')
                    .attr('transform', 'translate(0,' + availableHeight + ')');

                g.select('.nv-x.nv-axis')
                    .transition().duration(0)
                    .call(xAxis);
            }

            if (showYAxis) {
                var ticks;
                if (stacked.offset() === 'wiggle') {
                    ticks = 0;
                }
                else {
                    ticks = nv.utils.calcTicksY(availableHeight/36, data);
                }
                yAxis.scale(y)
                    ._ticks(ticks)
                    .tickSize(-availableWidth, 0);

                    if (stacked.style() === 'expand' || stacked.style() === 'stack_percent') {
                        var currentFormat = yAxis.tickFormat();

                        if ( !oldYTickFormat || currentFormat !== percentFormatter )
                            oldYTickFormat = currentFormat;

                        //Forces the yAxis to use percentage in 'expand' mode.
                        yAxis.tickFormat(percentFormatter);
                    }
                    else {
                        if (oldYTickFormat) {
                            yAxis.tickFormat(oldYTickFormat);
                            oldYTickFormat = null;
                        }
                    }

                g.select('.nv-y.nv-axis')
                    .transition().duration(0)
                    .call(yAxis);
            }

            //============================================================
            // Event Handling/Dispatching (in chart's scope)
            //------------------------------------------------------------

            stacked.dispatch.on('areaClick.toggle', function(e) {
                if (data.filter(function(d) { return !d.disabled }).length === 1)
                    data.forEach(function(d) {
                        d.disabled = false;
                    });
                else
                    data.forEach(function(d,i) {
                        d.disabled = (i != e.seriesIndex);
                    });

                state.disabled = data.map(function(d) { return !!d.disabled });
                dispatch.stateChange(state);

                chart.update();
            });

            legend.dispatch.on('stateChange', function(newState) {
                for (var key in newState)
                    state[key] = newState[key];
                dispatch.stateChange(state);
                chart.update();
            });

            controls.dispatch.on('legendClick', function(d,i) {
                if (!d.disabled) return;

                controlsData = controlsData.map(function(s) {
                    s.disabled = true;
                    return s;
                });
                d.disabled = false;

                stacked.style(d.style);


                state.style = stacked.style();
                dispatch.stateChange(state);

                chart.update();
            });

            interactiveLayer.dispatch.on('elementMousemove', function(e) {
                stacked.clearHighlights();
                var singlePoint, pointIndex, pointXLocation, allData = [], valueSum = 0;
                data
                    .filter(function(series, i) {
                        series.seriesIndex = i;
                        return !series.disabled;
                    })
                    .forEach(function(series,i) {
                        pointIndex = nv.interactiveBisect(series.values, e.pointXValue, chart.x());
                        var point = series.values[pointIndex];
                        var pointYValue = chart.y()(point, pointIndex);
                        if (pointYValue != null) {
                            stacked.highlightPoint(i, pointIndex, true);
                        }
                        if (typeof point === 'undefined') return;
                        if (typeof singlePoint === 'undefined') singlePoint = point;
                        if (typeof pointXLocation === 'undefined') pointXLocation = chart.xScale()(chart.x()(point,pointIndex));

                        //If we are in 'expand' mode, use the stacked percent value instead of raw value.
                        var tooltipValue = (stacked.style() == 'expand') ? point.display.y : chart.y()(point,pointIndex);
                        allData.push({
                            key: series.key,
                            value: tooltipValue,
                            color: color(series,series.seriesIndex),
                            stackedValue: point.display
                        });

                        if (showTotalInTooltip && stacked.style() != 'expand') {
                          valueSum += tooltipValue;
                        };
                    });

                allData.reverse();

                //Highlight the tooltip entry based on which stack the mouse is closest to.
                if (allData.length > 2) {
                    var yValue = chart.yScale().invert(e.mouseY);
                    var yDistMax = Infinity, indexToHighlight = null;
                    allData.forEach(function(series,i) {

                        //To handle situation where the stacked area chart is negative, we need to use absolute values
                        //when checking if the mouse Y value is within the stack area.
                        yValue = Math.abs(yValue);
                        var stackedY0 = Math.abs(series.stackedValue.y0);
                        var stackedY = Math.abs(series.stackedValue.y);
                        if ( yValue >= stackedY0 && yValue <= (stackedY + stackedY0))
                        {
                            indexToHighlight = i;
                            return;
                        }
                    });
                    if (indexToHighlight != null)
                        allData[indexToHighlight].highlight = true;
                }

                //If we are not in 'expand' mode, add a 'Total' row to the tooltip.
                if (showTotalInTooltip && stacked.style() != 'expand' && allData.length >= 2) {
                    allData.push({
                        key: totalLabel,
                        value: valueSum,
                        total: true
                    });
                }

                var xValue = chart.x()(singlePoint,pointIndex);

                var valueFormatter = interactiveLayer.tooltip.valueFormatter();
                // Keeps track of the tooltip valueFormatter if the chart changes to expanded view
                if (stacked.style() === 'expand' || stacked.style() === 'stack_percent') {
                    if ( !oldValueFormatter ) {
                        oldValueFormatter = valueFormatter;
                    }
                    //Forces the tooltip to use percentage in 'expand' mode.
                    valueFormatter = d3.format(".1%");
                }
                else {
                    if (oldValueFormatter) {
                        valueFormatter = oldValueFormatter;
                        oldValueFormatter = null;
                    }
                }

                interactiveLayer.tooltip
                    .chartContainer(that.parentNode)
                    .valueFormatter(valueFormatter)
                    .data(
                    {
                        value: xValue,
                        series: allData
                    }
                )();

                interactiveLayer.renderGuideLine(pointXLocation);

            });

            interactiveLayer.dispatch.on("elementMouseout",function(e) {
                stacked.clearHighlights();
            });

            // Update chart from a state object passed to event handler
            dispatch.on('changeState', function(e) {

                if (typeof e.disabled !== 'undefined' && data.length === e.disabled.length) {
                    data.forEach(function(series,i) {
                        series.disabled = e.disabled[i];
                    });

                    state.disabled = e.disabled;
                }

                if (typeof e.style !== 'undefined') {
                    stacked.style(e.style);
                    style = e.style;
                }

                chart.update();
            });

        });

        renderWatch.renderEnd('stacked Area chart immediate');
        return chart;
    }

    //============================================================
    // Event Handling/Dispatching (out of chart's scope)
    //------------------------------------------------------------

    stacked.dispatch.on('elementMouseover.tooltip', function(evt) {
        evt.point['x'] = stacked.x()(evt.point);
        evt.point['y'] = stacked.y()(evt.point);
        tooltip.data(evt).hidden(false);
    });

    stacked.dispatch.on('elementMouseout.tooltip', function(evt) {
        tooltip.hidden(true)
    });

    //============================================================
    // Expose Public Variables
    //------------------------------------------------------------

    // expose chart's sub-components
    chart.dispatch = dispatch;
    chart.stacked = stacked;
    chart.legend = legend;
    chart.controls = controls;
    chart.xAxis = xAxis;
    chart.yAxis = yAxis;
    chart.interactiveLayer = interactiveLayer;
    chart.tooltip = tooltip;

    chart.dispatch = dispatch;
    chart.options = nv.utils.optionsFunc.bind(chart);

    chart._options = Object.create({}, {
        // simple options, just get/set the necessary values
        width:      {get: function(){return width;}, set: function(_){width=_;}},
        height:     {get: function(){return height;}, set: function(_){height=_;}},
        showLegend: {get: function(){return showLegend;}, set: function(_){showLegend=_;}},
        showXAxis:      {get: function(){return showXAxis;}, set: function(_){showXAxis=_;}},
        showYAxis:    {get: function(){return showYAxis;}, set: function(_){showYAxis=_;}},
        defaultState:    {get: function(){return defaultState;}, set: function(_){defaultState=_;}},
        noData:    {get: function(){return noData;}, set: function(_){noData=_;}},
        showControls:    {get: function(){return showControls;}, set: function(_){showControls=_;}},
        controlLabels:    {get: function(){return controlLabels;}, set: function(_){controlLabels=_;}},
        controlOptions:    {get: function(){return controlOptions;}, set: function(_){controlOptions=_;}},
        showTotalInTooltip:      {get: function(){return showTotalInTooltip;}, set: function(_){showTotalInTooltip=_;}},
        totalLabel:      {get: function(){return totalLabel;}, set: function(_){totalLabel=_;}},

        // options that require extra logic in the setter
        margin: {get: function(){return margin;}, set: function(_){
            margin.top    = _.top    !== undefined ? _.top    : margin.top;
            margin.right  = _.right  !== undefined ? _.right  : margin.right;
            margin.bottom = _.bottom !== undefined ? _.bottom : margin.bottom;
            margin.left   = _.left   !== undefined ? _.left   : margin.left;
        }},
        duration: {get: function(){return duration;}, set: function(_){
            duration = _;
            renderWatch.reset(duration);
            stacked.duration(duration);
            xAxis.duration(duration);
            yAxis.duration(duration);
        }},
        color:  {get: function(){return color;}, set: function(_){
            color = nv.utils.getColor(_);
            legend.color(color);
            stacked.color(color);
        }},
        rightAlignYAxis: {get: function(){return rightAlignYAxis;}, set: function(_){
            rightAlignYAxis = _;
            yAxis.orient( rightAlignYAxis ? 'right' : 'left');
        }},
        useInteractiveGuideline: {get: function(){return useInteractiveGuideline;}, set: function(_){
            useInteractiveGuideline = !!_;
            chart.interactive(!_);
            chart.useVoronoi(!_);
            stacked.scatter.interactive(!_);
        }}
    });

    nv.utils.inheritOptions(chart, stacked);
    nv.utils.initOptions(chart);

    return chart;
};
