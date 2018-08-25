
nv.models.scatterFocusChart = function() {
    "use strict";

    //============================================================
    // Public Variables with Default Settings
    //------------------------------------------------------------

    var scatter      = nv.models.scatter()
        , xAxis        = nv.models.axis()
        , yAxis        = nv.models.axis()
        , legend       = nv.models.legend()
        , distX        = nv.models.distribution()
        , distY        = nv.models.distribution()
        , tooltip      = nv.models.tooltip()
        , focus = nv.models.focusScatter()
        ;

    var margin       = {top: 30, right: 20, bottom: 50, left: 75}
        , marginTop = null
        , width        = null
        , height       = null
        , container    = null
        , color        = nv.utils.defaultColor()
        , x            = scatter.xScale()
        , y            = scatter.yScale()
        , showDistX    = false
        , showDistY    = false
        , showLegend   = true
        , showXAxis    = true
        , showYAxis    = true
        , rightAlignYAxis = false
        , focusEnable = true // make it true if default
        , state = nv.utils.state()
        , defaultState = null
        , dispatch = d3.dispatch('stateChange', 'changeState', 'renderEnd')
        , noData       = null
        , duration = 250
        , showLabels    = false
        ;

    scatter.xScale(x).yScale(y);
    xAxis.orient('bottom').tickPadding(10);
    yAxis
        .orient((rightAlignYAxis) ? 'right' : 'left')
        .tickPadding(10)
    ;
    distX.axis('x');
    distY.axis('y');
    tooltip
        .headerFormatter(function(d, i) {
            return xAxis.tickFormat()(d, i);
        })
        .valueFormatter(function(d, i) {
            return yAxis.tickFormat()(d, i);
        });

    //============================================================
    // Private Variables
    //------------------------------------------------------------

    var x0, y0
        , renderWatch = nv.utils.renderWatch(dispatch, duration);

    var stateGetter = function(data) {
        return function(){
            return {
                active: data.map(function(d) { return !d.disabled })
            };
        }
    };

    var stateSetter = function(data) {
        return function(state) {
            if (state.active !== undefined)
                data.forEach(function(series,i) {
                    series.disabled = !state.active[i];
                });
        }
    };

    function chart(selection) {
        renderWatch.reset();
        renderWatch.models(scatter);
        if (showXAxis) renderWatch.models(xAxis);
        if (showYAxis) renderWatch.models(yAxis);
        if (showDistX) renderWatch.models(distX);
        if (showDistY) renderWatch.models(distY);

        selection.each(function(data) {
            var that = this;

            container = d3.select(this);
            nv.utils.initSVG(container);

            var availableWidth = nv.utils.availableWidth(width, container, margin),
                availableHeight = nv.utils.availableHeight(height, container, margin) - (focusEnable ? focus.height() : 0);

            chart.update = function() {
                if (duration === 0)
                    container.call(chart);
                else
                    container.transition().duration(duration).call(chart);
            };
            chart.container = this;

            state
                .setter(stateSetter(data), chart.update)
                .getter(stateGetter(data))
                .update();

            // DEPRECATED set state.disableddisabled
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

            // Display noData message if there's nothing to show.
            if (!data || !data.length || !data.filter(function(d) { return d.values.length }).length) {
                nv.utils.noData(chart, container);
                renderWatch.renderEnd('scatter immediate');
                return chart;
            } else {
                container.selectAll('.nv-noData').remove();
            }

            /* Update `main' graph on brush update. */
            focus.dispatch.on("onBrush", function(extent) {
                onBrush(extent);
            });

            // Setup Scales
            x = scatter.xScale();
            y = scatter.yScale();

            // Setup containers and skeleton of chart
            var wrap = container.selectAll('g.nv-wrap.nv-scatterChart').data([data]);
            var wrapEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap nv-scatterChart nv-chart-' + scatter.id());
            var gEnter = wrapEnter.append('g');
            var g = wrap.select('g');

            gEnter.append('g').attr('class', 'nv-legendWrap');
            //add main chart wrap
            var focusEnter = gEnter.append('g').attr('class', 'nv-focus');

            // background for pointer events
            focusEnter.append('g').attr('class', 'nv-background').append('rect').style("pointer-events","none");

            focusEnter.append('g').attr('class', 'nv-x nv-axis');
            focusEnter.append('g').attr('class', 'nv-y nv-axis');
            focusEnter.append('g').attr('class', 'nv-scatterWrap');
            focusEnter.append('g').attr('class', 'nv-regressionLinesWrap');
            focusEnter.append('g').attr('class', 'nv-distWrap');

            // add focus wrap
            gEnter.append('g').attr('class', 'nv-focusWrap');

            //if right aligned axis
            if (rightAlignYAxis) {
                g.select(".nv-y.nv-axis")
                    .attr("transform", "translate(" + availableWidth + ",0)");
            }

            // Legend
            if (!showLegend) {
                g.select('.nv-legendWrap').selectAll('*').remove();
            } else {
                var legendWidth = availableWidth;
                legend.width(legendWidth);

                wrap.select('.nv-legendWrap')
                    .datum(data)
                    .call(legend);

                if (!marginTop && legend.height() !== margin.top) {
                    margin.top = legend.height();
                    availableHeight = nv.utils.availableHeight(height, container, margin);
                }

                wrap.select('.nv-legendWrap')
                    .attr('transform', 'translate(0' + ',' + (-margin.top) +')');
            }

            wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

            // set main chart background height and width
            g.select('.nv-focus .nv-background rect')
                .attr('width', availableWidth)
                .attr('height', availableHeight);

            // Main Chart Component(s)
            scatter
                .width(availableWidth)
                .height(availableHeight)
                .color(data.map(function(d,i) {
                    d.color = d.color || color(d, i);
                    return d.color;
                }).filter(function(d,i) { return !data[i].disabled }))
                .showLabels(showLabels);

            var scatterWrap = wrap.select('.nv-scatterWrap')
                .datum(data.filter(function(d) { return !d.disabled }))
                .call(scatter);


            wrap.select('.nv-regressionLinesWrap')
                .attr('clip-path', 'url(#nv-edge-clip-' + scatter.id() + ')');

            var regWrap = wrap.select('.nv-regressionLinesWrap').selectAll('.nv-regLines')
                .data(function (d) {
                    return d;
                });

            regWrap.enter().append('g').attr('class', 'nv-regLines');

            var regLine = regWrap.selectAll('.nv-regLine')
                .data(function (d) {
                    return [d]
                });

            regLine.enter()
                .append('line').attr('class', 'nv-regLine')
                .style('stroke-opacity', 0);

            // don't add lines unless we have slope and intercept to use
            regLine.filter(function(d) {
                return d.intercept && d.slope;
            })
                .watchTransition(renderWatch, 'scatterFocusChart: regline')
                .attr('x1', x.range()[0])
                .attr('x2', x.range()[1])
                .attr('y1', function (d, i) {
                    return y(x.domain()[0] * d.slope + d.intercept)
                })
                .attr('y2', function (d, i) {
                    return y(x.domain()[1] * d.slope + d.intercept)
                })
                .style('stroke', function (d, i, j) {
                    return color(d, j)
                })
                .style('stroke-opacity', function (d, i) {
                    return (d.disabled || typeof d.slope === 'undefined' || typeof d.intercept === 'undefined') ? 0 : 1
                });

            // Setup Axes
            if (showXAxis) {
                xAxis
                    .scale(x)
                    ._ticks( nv.utils.calcTicksX(availableWidth/100, data) )
                    .tickSize( -availableHeight , 0);

            }

            if (showYAxis) {
                yAxis
                    .scale(y)
                    ._ticks( nv.utils.calcTicksY(availableHeight/36, data) )
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
                    // don't add lines unless we have slope and intercept to use
                    regLine.filter(function(d) {
                        return d.intercept && d.slope;
                    })
                        .watchTransition(renderWatch, 'scatterFocusChart: regline')
                        .attr('x1', x.range()[0])
                        .attr('x2', x.range()[1])
                        .attr('y1', function (d, i) {
                            return y(x.domain()[0] * d.slope + d.intercept)
                        })
                        .attr('y2', function (d, i) {
                            return y(x.domain()[1] * d.slope + d.intercept)
                        })
                        .style('stroke', function (d, i, j) {
                            return color(d, j)
                        })
                        .style('stroke-opacity', function (d, i) {
                            return (d.disabled || typeof d.slope === 'undefined' || typeof d.intercept === 'undefined') ? 0 : 1
                        });
                }
            }

            g.select('.nv-focus .nv-x.nv-axis')
                .attr('transform', 'translate(0,' + availableHeight + ')');

            //============================================================
            // Update Focus
            //============================================================
            if (!focusEnable && focus.brush.extent() === null) {
                scatterWrap.transition().call(scatter);
                updateXAxis();
                updateYAxis();
            } else {
                focus.width(availableWidth);
                // set tick format for focus chart
                focus.xAxis.tickFormat(xAxis.tickFormat());
                focus.yAxis.tickFormat(yAxis.tickFormat());
                // show or hide focus based on enable by default it enable
                g.select('.nv-focusWrap')
                    .style('display', focusEnable ? 'initial' : 'none')
                    .attr('transform', 'translate(0,' + ( availableHeight + margin.bottom + focus.margin().top) + ')')
                    .call(focus);

                var extent = focus.brush.empty() ? focus.xDomain() : focus.brush.extent();

                if (extent !== null) {
                    onBrush(extent);
                }
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

            // Update chart from a state object passed to event handler
            dispatch.on('changeState', function(e) {
                if (typeof e.disabled !== 'undefined') {
                    data.forEach(function(series,i) {
                        series.disabled = e.disabled[i];
                    });
                    state.disabled = e.disabled;
                }
                chart.update();
            });

            // on mouseout tooltip hide tooltip and remove line to dist
            scatter.dispatch.on('elementMouseout.tooltip', function(evt) {
                tooltip.hidden(true);
                // remove if line exist
                d3.select('#manual_line').remove();
            });

            scatter.dispatch.on('elementMouseover.tooltip', function(evt) {
                // select all related series for the pointed point
                var v = container.select('.nv-series-' + evt.seriesIndex);
                // remove if already exist
                d3.select('#manual_line').remove();
                // add line with specific id so that we can remove it later on mouseout event
                var l1 = v.append('g');
                l1.attr('id','manual_line');

                //append two line from point to distX and distY line
                l1.append('line')
                    .attr({
                        x1: 0,
                        y1: evt.relativePos[1],
                        x2: evt.relativePos[0],
                        y2: evt.relativePos[1]
                    })
                    .style("stroke", evt.series.color);

                l1.append('line')
                    .attr({
                        x1: evt.relativePos[0],
                        y1: evt.relativePos[1],
                        x2: evt.relativePos[0],
                        y2: availableHeight
                    })
                    .style("stroke", evt.series.color);

                tooltip.data(evt).hidden(false);
            });

            //store old scales for use in transitions on update
            x0 = x.copy();
            y0 = y.copy();

            //============================================================
            // Functions
            //------------------------------------------------------------
            function onBrush(extent) {
                // Update Main (Focus)
                var focusScatterWrap = g.select('.nv-focus .nv-scatterWrap')
                    .datum(
                        data.filter(function(d) { return !d.disabled; })
                            .map(function(d) {
                                return {
                                    key: d.key,
                                    values: d.values.filter(function(d,i) {
                                        return scatter.x()(d,i) >= extent[0] && scatter.x()(d,i) <= extent[1];
                                    })
                                };
                            })
                    );

                focusScatterWrap.transition().duration(duration).call(scatter);

                // Update Main (Focus) Axes
                updateXAxis();
                updateYAxis();

                // update distX and distY with new data based on focus brush selection
                wrap.select('.nv-focus .nv-distWrap').selectAll('g').remove();

                distX
                    .getData(scatter.x())
                    .scale(x)
                    .color(data.filter(function(d) { return !d.disabled; })
                        .map(function(d,i) {
                            return d.color || color(d, i);
                        })
                    );

                wrap.select('.nv-focus .nv-distWrap').append('g')
                    .attr('class', 'nv-distributionX');

                g.select('.nv-focus .nv-distributionX')
                    .attr('transform', 'translate(0,' + y.range()[0] + ')')
                    .datum(data.filter(function(d) { return !d.disabled; })
                        .map(function(d) {
                            return {
                                key: d.key,
                                values: d.values.filter(function(d,i) {
                                    return scatter.x()(d,i) >= extent[0] && scatter.x()(d,i) <= extent[1];
                                })
                            };
                        }))
                    .call(distX)
                    .style('opacity', function() { return showDistX ? '1' : '1e-6'; })
                    .watchTransition(renderWatch, 'scatterFocusChart')
                    .style('opacity', function() { return showDistX ? '1' : '1e-6'; });

                distY
                    .getData(scatter.y())
                    .scale(y)
                    .color(data.filter(function(d) { return !d.disabled; })
                        .map(function(d,i) {
                            return d.color || color(d, i);
                        })
                    );

                wrap.select('.nv-focus .nv-distWrap').append('g')
                    .attr('class', 'nv-distributionY');

                g.select('.nv-focus .nv-distributionY')
                    .attr('transform', 'translate(' + (rightAlignYAxis ? availableWidth : -distY.size() ) + ',0)')
                    .datum(data.filter(function(d) { return !d.disabled; })
                        .map(function(d) {
                            return {
                                key: d.key,
                                values: d.values.filter(function(d,i) {
                                    return scatter.x()(d,i) >= extent[0] && scatter.x()(d,i) <= extent[1];
                                })
                            };
                        }))
                    .call(distY)
                    .style('opacity', function() { return showDistY ? '1' : '1e-6'; })
                    .watchTransition(renderWatch, 'scatterFocusChart')
                    .style('opacity', function() { return showDistY ? '1' : '1e-6'; });
            }
        });

        renderWatch.renderEnd('scatter with line immediate');
        return chart;
    }

    //============================================================
    // Expose Public Variables
    //------------------------------------------------------------

    // expose chart's sub-components
    chart.dispatch = dispatch;
    chart.scatter = scatter;
    chart.legend = legend;
    chart.focus = focus;
    chart.xAxis = xAxis;
    chart.x2Axis = focus.xAxis;
    chart.yAxis = yAxis;
    chart.y2Axis = focus.yAxis;
    chart.distX = distX;
    chart.distY = distY;
    chart.tooltip = tooltip;

    chart.options = nv.utils.optionsFunc.bind(chart);
    chart._options = Object.create({}, {
        // simple options, just get/set the necessary values
        width:      {get: function(){return width;}, set: function(_){width=_;}},
        height:     {get: function(){return height;}, set: function(_){height=_;}},
        container:  {get: function(){return container;}, set: function(_){container=_;}},
        showDistX:  {get: function(){return showDistX;}, set: function(_){showDistX=_;}},
        showDistY:  {get: function(){return showDistY;}, set: function(_){showDistY=_;}},
        showLegend: {get: function(){return showLegend;}, set: function(_){showLegend=_;}},
        showXAxis:  {get: function(){return showXAxis;}, set: function(_){showXAxis=_;}},
        showYAxis:  {get: function(){return showYAxis;}, set: function(_){showYAxis=_;}},
        defaultState:     {get: function(){return defaultState;}, set: function(_){defaultState=_;}},
        noData:     {get: function(){return noData;}, set: function(_){noData=_;}},
        duration:   {get: function(){return duration;}, set: function(_){duration=_;}},
        showLabels: {get: function(){return showLabels;}, set: function(_){showLabels=_;}},
        focusEnable:    {get: function(){return focusEnable;}, set: function(_){focusEnable=_;}},
        focusHeight:     {get: function(){return focus.height();}, set: function(_){focus.height(_);}},
        focusShowAxisX:    {get: function(){return focus.showXAxis();}, set: function(_){focus.showXAxis(_);}},
        focusShowAxisY:    {get: function(){return focus.showYAxis();}, set: function(_){focus.showYAxis(_);}},
        brushExtent: {get: function(){return focus.brushExtent();}, set: function(_){focus.brushExtent(_);}},

        focusMargin: {get: function(){return focus.margin}, set: function(_){
                if (_.top !== undefined) {
                    margin.top = _.top;
                    marginTop = _.top;
                }
                focus.margin.right  = _.right  !== undefined ? _.right  : focus.margin.right;
                focus.margin.bottom = _.bottom !== undefined ? _.bottom : focus.margin.bottom;
                focus.margin.left   = _.left   !== undefined ? _.left   : focus.margin.left;
            }},

        // options that require extra logic in the setter
        margin: {get: function(){return margin;}, set: function(_){
            if (_.top !== undefined) {
                margin.top = _.top;
                marginTop = _.top;
            }
            margin.right  = _.right  !== undefined ? _.right  : margin.right;
            margin.bottom = _.bottom !== undefined ? _.bottom : margin.bottom;
            margin.left   = _.left   !== undefined ? _.left   : margin.left;
        }},
        rightAlignYAxis: {get: function(){return rightAlignYAxis;}, set: function(_){
            rightAlignYAxis = _;
            yAxis.orient( (_) ? 'right' : 'left');
        }},
        x: {get: function(){return scatter.x();}, set: function(_){
                scatter.x(_);
                focus.x(_);
            }},
        y: {get: function(){return scatter.y();}, set: function(_){
                scatter.y(_);
                focus.y(_);
            }},
        color: {get: function(){return color;}, set: function(_){
            color = nv.utils.getColor(_);
            legend.color(color);
            distX.color(color);
            distY.color(color);
        }}
    });

    nv.utils.inheritOptions(chart, scatter);
    nv.utils.initOptions(chart);
    return chart;
};
