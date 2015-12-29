nv.models.lineChart = function() {
    "use strict";

    //============================================================
    // Public Variables with Default Settings
    //------------------------------------------------------------

    var lines = nv.models.line()
        , xAxis = nv.models.axis()
        , yAxis = nv.models.axis()
        , legend = nv.models.legend()
        , interactiveLayer = nv.interactiveGuideline()
        , tooltip = nv.models.tooltip()
        , lines2 = nv.models.line()
        , x2Axis = nv.models.axis()
        , y2Axis = nv.models.axis()
        , brush = d3.svg.brush()
        ;

    var margin = {top: 30, right: 20, bottom: 50, left: 60}
        , margin2 = {top: 0, right: 20, bottom: 20, left: 60}
        , color = nv.utils.defaultColor()
        , width = null
        , height = null
        , showLegend = true
        , showXAxis = true
        , showYAxis = true
        , rightAlignYAxis = false
        , useInteractiveGuideline = false
        , x
        , y
        , x2
        , y2
        , focusEnable = false
        , focusShowAxisY = false
        , focusShowAxisX = true
        , focusHeight = 50
        , brushExtent = null
        , state = nv.utils.state()
        , defaultState = null
        , noData = null
        , dispatch = d3.dispatch('tooltipShow', 'tooltipHide', 'brush', 'stateChange', 'changeState', 'renderEnd')
        , duration = 250
        ;

    // set options on sub-objects for this chart
    xAxis.orient('bottom').tickPadding(7);
    yAxis.orient(rightAlignYAxis ? 'right' : 'left');

    lines.clipEdge(true).duration(0);
    lines2.interactive(false);
    // We don't want any points emitted for the focus chart's scatter graph.
    lines2.pointActive(function(d) { return false; });

    x2Axis.orient('bottom').tickPadding(5);
    y2Axis.orient(rightAlignYAxis ? 'right' : 'left');

    tooltip.valueFormatter(function(d, i) {
        return yAxis.tickFormat()(d, i);
    }).headerFormatter(function(d, i) {
        return xAxis.tickFormat()(d, i);
    });
    
    interactiveLayer.tooltip.valueFormatter(function(d, i) {
        return yAxis.tickFormat()(d, i);
    }).headerFormatter(function(d, i) {
        return xAxis.tickFormat()(d, i);
    });


    //============================================================
    // Private Variables
    //------------------------------------------------------------

    var renderWatch = nv.utils.renderWatch(dispatch, duration);

    var stateGetter = function(data) {
        return function(){
            return {
                active: data.map(function(d) { return !d.disabled; })
            };
        };
    };

    var stateSetter = function(data) {
        return function(state) {
            if (state.active !== undefined)
                data.forEach(function(series,i) {
                    series.disabled = !state.active[i];
                });
        };
    };

    function chart(selection) {
        renderWatch.reset();
        renderWatch.models(lines);
        renderWatch.models(lines2);
        if (showXAxis) renderWatch.models(xAxis);
        if (showYAxis) renderWatch.models(yAxis);

        if (focusShowAxisX) renderWatch.models(x2Axis);
        if (focusShowAxisY) renderWatch.models(y2Axis);
        selection.each(function(data) {
            var container = d3.select(this);
            nv.utils.initSVG(container);
            var availableWidth = nv.utils.availableWidth(width, container, margin),
                availableHeight1 = nv.utils.availableHeight(height, container, margin) - (focusEnable ? focusHeight : 0),
                availableHeight2 = focusHeight - margin2.top - margin2.bottom;

            chart.update = function() { 
                if( duration === 0 ) {
                    container.call( chart );
                } else {
                    container.transition().duration(duration).call(chart);
                }
            };
            chart.container = this;

            state
                .setter(stateSetter(data), chart.update)
                .getter(stateGetter(data))
                .update();

            // DEPRECATED set state.disabled
            state.disabled = data.map(function(d) { return !!d.disabled; });

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

            // Display noData message if there's nothing to show.
            if (!data || !data.length || !data.filter(function(d) { return d.values.length; }).length) {
                nv.utils.noData(chart, container);
                return chart;
            } else {
                container.selectAll('.nv-noData').remove();
            }


            // Setup Scales
            x = lines.xScale();
            y = lines.yScale();
            x2 = lines2.xScale();
            y2 = lines2.yScale();

            // Setup containers and skeleton of chart
            var wrap = container.selectAll('g.nv-wrap.nv-lineChart').data([data]);
            var gEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap nv-lineChart').append('g');
            var g = wrap.select('g');

            gEnter.append('g').attr('class', 'nv-legendWrap');

            var focusEnter = gEnter.append('g').attr('class', 'nv-focus');
            focusEnter.append('g').attr('class', 'nv-background').append('rect');
            focusEnter.append('g').attr('class', 'nv-x nv-axis');
            focusEnter.append('g').attr('class', 'nv-y nv-axis');
            focusEnter.append('g').attr('class', 'nv-linesWrap');
            focusEnter.append('g').attr('class', 'nv-interactive');

            var contextEnter = gEnter.append('g').attr('class', 'nv-context');
            contextEnter.append('g').attr('class', 'nv-background').append('rect');
            contextEnter.append('g').attr('class', 'nv-x nv-axis');
            contextEnter.append('g').attr('class', 'nv-y nv-axis');
            contextEnter.append('g').attr('class', 'nv-linesWrap');
            contextEnter.append('g').attr('class', 'nv-brushBackground');
            contextEnter.append('g').attr('class', 'nv-x nv-brush');

            // Legend
            if (showLegend) {
                legend.width(availableWidth);

                g.select('.nv-legendWrap')
                    .datum(data)
                    .call(legend);

                if ( margin.top != legend.height()) {
                    margin.top = legend.height();
                    availableHeight1 = nv.utils.availableHeight(height, container, margin) - (focusEnable ? focusHeight : 0);
                }

                wrap.select('.nv-legendWrap')
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
                    .height(availableHeight1)
                    .margin({left:margin.left, top:margin.top})
                    .svgContainer(container)
                    .xScale(x);
                wrap.select(".nv-interactive").call(interactiveLayer);
            }

            g.select('.nv-focus .nv-background rect')
                .attr('width', availableWidth)
                .attr('height', availableHeight1);
                
            lines
                .width(availableWidth)
                .height(availableHeight1)
                .color(data.map(function(d,i) {
                    return d.color || color(d, i);

                }).filter(function(d,i) { return !data[i].disabled; }));

            var linesWrap = g.select('.nv-linesWrap')
                .datum(data.filter(function(d) { return !d.disabled; }));


            // Setup Main (Focus) Axes
            if (showXAxis) {
                xAxis
                    .scale(x)
                    ._ticks(nv.utils.calcTicksX(availableWidth/100, data) )
                    .tickSize(-availableHeight1, 0);

            }

            if (showYAxis) {
                yAxis
                    .scale(y)
                    ._ticks( nv.utils.calcTicksY(availableHeight1/36, data) )
                    .tickSize( -availableWidth, 0);
            }

            //============================================================
            // Update Axes
            //============================================================
            function updateXAxis() {
              if(showXAxis) {
                g.select('.nv-focus .nv-x.nv-axis')
                  .transition()
                  .duration(duration)
                  .call(xAxis)
                ;
              }
            }

            function updateYAxis() {
              if(showYAxis) {
                g.select('.nv-focus .nv-y.nv-axis')
                  .transition()
                  .duration(duration)
                  .call(yAxis)
                ;
              }
            }
            
            g.select('.nv-focus .nv-x.nv-axis')
                .attr('transform', 'translate(0,' + availableHeight1 + ')');

            if( !focusEnable )
            {
                linesWrap.call(lines);
                updateXAxis();
                updateYAxis();
            }
            else
            {
                lines2
                    .defined(lines.defined())
                    .width(availableWidth)
                    .height(availableHeight2)
                    .color(data.map(function(d,i) {
                        return d.color || color(d, i);
                    }).filter(function(d,i) { return !data[i].disabled; }));
    
                g.select('.nv-context')
                    .attr('transform', 'translate(0,' + ( availableHeight1 + margin.bottom + margin2.top) + ')')
                    .style('display', focusEnable ? 'initial' : 'none')
                ;
    
                var contextLinesWrap = g.select('.nv-context .nv-linesWrap')
                    .datum(data.filter(function(d) { return !d.disabled; }))
                    ;
                    
                d3.transition(contextLinesWrap).call(lines2);
                
            
                // Setup Brush
                brush
                    .x(x2)
                    .on('brush', function() {
                        onBrush();
                    });
    
                if (brushExtent) brush.extent(brushExtent);
    
                var brushBG = g.select('.nv-brushBackground').selectAll('g')
                    .data([brushExtent || brush.extent()]);
        
                var brushBGenter = brushBG.enter()
                    .append('g');
    
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
    
                var gBrush = g.select('.nv-x.nv-brush')
                    .call(brush);
                gBrush.selectAll('rect')
                    .attr('height', availableHeight2);
                gBrush.selectAll('.resize').append('path').attr('d', resizePath);
    
                onBrush();
    
                g.select('.nv-context .nv-background rect')
                    .attr('width', availableWidth)
                    .attr('height', availableHeight2);
    
                // Setup Secondary (Context) Axes
                if (focusShowAxisX) {
                  x2Axis
                      .scale(x2)
                      ._ticks( nv.utils.calcTicksX(availableWidth/100, data) )
                      .tickSize(-availableHeight2, 0);
      
                  g.select('.nv-context .nv-x.nv-axis')
                      .attr('transform', 'translate(0,' + y2.range()[0] + ')');
                  d3.transition(g.select('.nv-context .nv-x.nv-axis'))
                      .call(x2Axis);
                }
    
                if (focusShowAxisY) {
                  y2Axis
                      .scale(y2)
                      ._ticks( nv.utils.calcTicksY(availableHeight2/36, data) )
                      .tickSize( -availableWidth, 0);
      
                  d3.transition(g.select('.nv-context .nv-y.nv-axis'))
                      .call(y2Axis);
                }
                
                g.select('.nv-context .nv-x.nv-axis')
                    .attr('transform', 'translate(0,' + y2.range()[0] + ')');
            }

            //============================================================
            // Event Handling/Dispatching (in chart's scope)
            //------------------------------------------------------------

            legend.dispatch.on('stateChange', function(newState) {
                for (var key in newState)
                    state[key] = newState[key];
                dispatch.stateChange(state);
                chart.update();
            });

            interactiveLayer.dispatch.on('elementMousemove', function(e) {
                lines.clearHighlights();
                var singlePoint, pointIndex, pointXLocation, allData = [];
                data
                    .filter(function(series, i) {
                        series.seriesIndex = i;
                        return !series.disabled && !series.disableTooltip;
                    })
                    .forEach(function(series,i) {
                        var extent = focusEnable ? (brush.empty() ? x2.domain() : brush.extent()) : x.domain();
                        var currentValues = series.values.filter(function(d,i) {
                            return lines.x()(d,i) >= extent[0] && lines.x()(d,i) <= extent[1];
                        });

                        pointIndex = nv.interactiveBisect(currentValues, e.pointXValue, lines.x());
                        var point = currentValues[pointIndex];
                        var pointYValue = chart.y()(point, pointIndex);
                        if (pointYValue !== null) {
                            lines.highlightPoint(series.seriesIndex, pointIndex, true);
                        }
                        if (point === undefined) return;
                        if (singlePoint === undefined) singlePoint = point;
                        if (pointXLocation === undefined) pointXLocation = chart.xScale()(chart.x()(point,pointIndex));
                        allData.push({
                            key: series.key,
                            value: pointYValue,
                            color: color(series,series.seriesIndex),
                            data: point
                        });
                    });
                //Highlight the tooltip entry based on which point the mouse is closest to.
                if (allData.length > 2) {
                    var yValue = chart.yScale().invert(e.mouseY);
                    var domainExtent = Math.abs(chart.yScale().domain()[0] - chart.yScale().domain()[1]);
                    var threshold = 0.03 * domainExtent;
                    var indexToHighlight = nv.nearestValueIndex(allData.map(function(d){return d.value;}),yValue,threshold);
                    if (indexToHighlight !== null)
                        allData[indexToHighlight].highlight = true;
                }

                interactiveLayer.tooltip
                    .chartContainer(chart.container.parentNode)
                    .valueFormatter(function(d,i) {
                        return d === null ? "N/A" : yAxis.tickFormat()(d);
                    })
                    .data({
                        value: chart.x()( singlePoint,pointIndex ),
                        index: pointIndex,
                        series: allData
                    })();

                interactiveLayer.renderGuideLine(pointXLocation);

            });

            interactiveLayer.dispatch.on('elementClick', function(e) {
                var pointXLocation, allData = [];

                data.filter(function(series, i) {
                    series.seriesIndex = i;
                    return !series.disabled;
                }).forEach(function(series) {
                    var pointIndex = nv.interactiveBisect(series.values, e.pointXValue, chart.x());
                    var point = series.values[pointIndex];
                    if (typeof point === 'undefined') return;
                    if (typeof pointXLocation === 'undefined') pointXLocation = chart.xScale()(chart.x()(point,pointIndex));
                    var yPos = chart.yScale()(chart.y()(point,pointIndex));
                    allData.push({
                        point: point,
                        pointIndex: pointIndex,
                        pos: [pointXLocation, yPos],
                        seriesIndex: series.seriesIndex,
                        series: series
                    });
                });

                lines.dispatch.elementClick(allData);
            });

            interactiveLayer.dispatch.on("elementMouseout",function(e) {
                lines.clearHighlights();
            });

            dispatch.on('changeState', function(e) {
                if (typeof e.disabled !== 'undefined' && data.length === e.disabled.length) {
                    data.forEach(function(series,i) {
                        series.disabled = e.disabled[i];
                    });

                    state.disabled = e.disabled;
                }

                chart.update();
            });

            //============================================================
            // Functions
            //------------------------------------------------------------
    
            // Taken from crossfilter (http://square.github.com/crossfilter/)
            function resizePath(d) {
                var e = +(d == 'e'),
                    x = e ? 1 : -1,
                    y = availableHeight2 / 3;
                return 'M' + (0.5 * x) + ',' + y
                    + 'A6,6 0 0 ' + e + ' ' + (6.5 * x) + ',' + (y + 6)
                    + 'V' + (2 * y - 6)
                    + 'A6,6 0 0 ' + e + ' ' + (0.5 * x) + ',' + (2 * y)
                    + 'Z'
                    + 'M' + (2.5 * x) + ',' + (y + 8)
                    + 'V' + (2 * y - 8)
                    + 'M' + (4.5 * x) + ',' + (y + 8)
                    + 'V' + (2 * y - 8);
            }
    
    
            function updateBrushBG() {
                if (!brush.empty()) brush.extent(brushExtent);
                brushBG
                    .data([brush.empty() ? x2.domain() : brushExtent])
                    .each(function(d,i) {
                        var leftWidth = x2(d[0]) - x.range()[0],
                            rightWidth = availableWidth - x2(d[1]);
                        d3.select(this).select('.left')
                            .attr('width',  leftWidth < 0 ? 0 : leftWidth);
    
                        d3.select(this).select('.right')
                            .attr('x', x2(d[1]))
                            .attr('width', rightWidth < 0 ? 0 : rightWidth);
                    });
            }
    
    
            function onBrush() {
                brushExtent = brush.empty() ? null : brush.extent();
                var extent = brush.empty() ? x2.domain() : brush.extent();
    
                //The brush extent cannot be less than one.  If it is, don't update the line chart.
                if (Math.abs(extent[0] - extent[1]) <= 1) {
                    return;
                }
    
                dispatch.brush({extent: extent, brush: brush});
    
    
                updateBrushBG();
    
                // Update Main (Focus)
                var focusLinesWrap = g.select('.nv-focus .nv-linesWrap')
                    .datum(
                    data
                        .filter(function(d) { return !d.disabled; })
                        .map(function(d,i) {
                            return {
                                key: d.key,
                                area: d.area,
                                classed: d.classed,
                                values: d.values.filter(function(d,i) {
                                    return lines.x()(d,i) >= extent[0] && lines.x()(d,i) <= extent[1];
                                }),
                                disableTooltip: d.disableTooltip
                            };
                        })
                );
                focusLinesWrap.transition().duration(duration).call(lines);
    
    
                // Update Main (Focus) Axes
                updateXAxis();
                updateYAxis();
            }


        });

        renderWatch.renderEnd('lineChart immediate');
        return chart;
    }


    //============================================================
    // Event Handling/Dispatching (out of chart's scope)
    //------------------------------------------------------------

    lines.dispatch.on('elementMouseover.tooltip', function(evt) {
        if(!evt.series.disableTooltip){
            tooltip.data(evt).hidden(false);
        }
    });

    lines.dispatch.on('elementMouseout.tooltip', function(evt) {
        tooltip.hidden(true);
    });

    //============================================================
    // Expose Public Variables
    //------------------------------------------------------------

    // expose chart's sub-components
    chart.dispatch = dispatch;
    chart.lines = lines;
    chart.lines2 = lines2;
    chart.legend = legend;
    chart.xAxis = xAxis;
    chart.x2Axis = x2Axis;
    chart.yAxis = yAxis;
    chart.y2Axis = y2Axis;
    chart.interactiveLayer = interactiveLayer;
    chart.tooltip = tooltip;
    chart.state = state;
    chart.dispatch = dispatch;
    chart.options = nv.utils.optionsFunc.bind(chart);

    chart._options = Object.create({}, {
        // simple options, just get/set the necessary values
        width:      {get: function(){return width;}, set: function(_){width=_;}},
        height:     {get: function(){return height;}, set: function(_){height=_;}},
        showLegend: {get: function(){return showLegend;}, set: function(_){showLegend=_;}},
        showXAxis:      {get: function(){return showXAxis;}, set: function(_){showXAxis=_;}},
        showYAxis:    {get: function(){return showYAxis;}, set: function(_){showYAxis=_;}},
        focusEnable:    {get: function(){return focusEnable;}, set: function(_){focusEnable=_;}},
        focusHeight:     {get: function(){return height2;}, set: function(_){focusHeight=_;}},
        focusShowAxisX:    {get: function(){return focusShowAxisX;}, set: function(_){focusShowAxisX=_;}},
        focusShowAxisY:    {get: function(){return focusShowAxisY;}, set: function(_){focusShowAxisY=_;}},
        brushExtent: {get: function(){return brushExtent;}, set: function(_){brushExtent=_;}},
        defaultState:    {get: function(){return defaultState;}, set: function(_){defaultState=_;}},
        noData:    {get: function(){return noData;}, set: function(_){noData=_;}},

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
            lines.duration(duration);
            xAxis.duration(duration);
            x2Axis.duration(duration);
            yAxis.duration(duration);
            y2Axis.duration(duration);
        }},
        focusMargin: {get: function(){return margin2;}, set: function(_){
            margin2.top    = _.top    !== undefined ? _.top    : margin2.top;
            margin2.right  = _.right  !== undefined ? _.right  : margin2.right;
            margin2.bottom = _.bottom !== undefined ? _.bottom : margin2.bottom;
            margin2.left   = _.left   !== undefined ? _.left   : margin2.left;
        }},
        color:  {get: function(){return color;}, set: function(_){
            color = nv.utils.getColor(_);
            legend.color(color);
            lines.color(color);
        }},
        interpolate: {get: function(){return lines.interpolate();}, set: function(_){
            lines.interpolate(_);
            lines2.interpolate(_);
        }},
        xTickFormat: {get: function(){return xAxis.tickFormat();}, set: function(_){
            xAxis.tickFormat(_);
            x2Axis.tickFormat(_);
        }},
        yTickFormat: {get: function(){return yAxis.tickFormat();}, set: function(_){
            yAxis.tickFormat(_);
            y2Axis.tickFormat(_);
        }},
        x: {get: function(){return lines.x();}, set: function(_){
            lines.x(_);
            lines2.x(_);
        }},
        y: {get: function(){return lines.y();}, set: function(_){
            lines.y(_);
            lines2.y(_);
        }},
        rightAlignYAxis: {get: function(){return rightAlignYAxis;}, set: function(_){
            rightAlignYAxis = _;
            yAxis.orient( rightAlignYAxis ? 'right' : 'left');
        }},
        useInteractiveGuideline: {get: function(){return useInteractiveGuideline;}, set: function(_){
            useInteractiveGuideline = _;
            if (useInteractiveGuideline) {
                lines.interactive(false);
                lines.useVoronoi(false);
            }
        }}
    });

    nv.utils.inheritOptions(chart, lines);
    nv.utils.initOptions(chart);

    return chart;
};

nv.models.lineWithFocusChart = function() {
  return nv.models.lineChart()
    .margin({ bottom: 30 }) 
    .focusEnable( true );
};
