nv.models.linechart2 = function () {
    "use strict";
    //============================================================
    // Public Variables with Default Settings
    //------------------------------------------------------------

    var lines = nv.models.line2()
        , xAxis = nv.models.axis()
        , yAxis = nv.models.axis()
        , legend = nv.models.legend2()
        , interactiveLayer = nv.interactiveGuideline2()
        ;

    var margin = {top: 30, right: 90, bottom: 50, left: 20}
        , color = nv.utils.defaultColor()
        , colors = [] //variable to save series colors
        , width = null
        , height = null
        , showLegend = true
        , showXAxis = true
        , showYAxis = true
        , rightAlignYAxis = true
        , useInteractiveGuideline = true
        , tooltips = true
        , tooltipX = function (key, x, y) {
            return '<strong>' + x + '</strong>'
        }
        , tooltipY = function (key, x, y) {
            return '<strong>' + y + '</strong>'
        }
        , tooltip = null
        , tickPadding = 10
        , unit = 'Unit'
        , legendTitle = 'Legend Title'
        , x
        , y
        , state = {}
        , defaultState = null
        , noData = 'No Data Available.'
        , dispatch = d3.dispatch('tooltipShow', 'tooltipHide', 'stateChange', 'changeState')
        , transitionDuration = 250
        ;

    xAxis
        .orient('bottom')
        .tickPadding(7)
    ;
    yAxis
        .orient((rightAlignYAxis) ? 'right' : 'left')
    ;

    //============================================================


    //============================================================
    // Private Variables
    //------------------------------------------------------------
    var showTooltip = function (toolTipData, offsetElement) {
        //TODO: make tooltip style an option between single or dual on axes (maybe on all charts with axes?)
        toolTipData.forEach(function(e,i){
            var cls = 'c-'+chart.id()+'-x-'+ e.pointIndex;
            var left = e.pos[0] + ( offsetElement.offsetLeft || 0 ),
            top = e.pos[1] + ( offsetElement.offsetTop || 0),
            leftX = e.pos[0] + ( offsetElement.offsetLeft || 0 ),
            topX = y.range()[0] + margin.top + ( offsetElement.offsetTop || 0),
            leftY = x.range()[1] + margin.left + tickPadding + ( offsetElement.offsetLeft || 0 ),
            topY = e.pos[1] + ( offsetElement.offsetTop || 0),
            xVal = xAxis.tickFormat()(lines.x()(e.point, e.pointIndex)),
            yVal = yAxis.tickFormat()(lines.y()(e.point, e.pointIndex));

            if (tooltipX != null)
                if(!d3.selectAll('.x-nvtooltip.'+cls)[0].length){
                    nv.tooltip.show([leftX, topX], tooltipX(e.series.key, xVal, yVal, e, chart), 'n', 1, offsetElement, 'x-nvtooltip '+cls, 'grey' );
                }
            if (tooltipY != null)
                nv.tooltip.show([leftY, topY], tooltipY(e.series.key, xVal, yVal, e, chart), 'w', 1, offsetElement, 'y-nvtooltip '+cls, colors[i] );
            if (tooltip != null)
                nv.tooltip.show([left, top], tooltip(e.series.key, xVal, yVal, e, chart), e.value < 0 ? 'n' : 's', null, offsetElement);

        });
    };

    function chart(selection) {
        selection.each(function (data) {
            for (var i = 0; i < data.length; i++) {
                colors.push(data[i].color);
            }
            var container = d3.select(this),
                that = this;

            var availableWidth = (width || parseInt(container.style('width')) || 960)
                    - margin.left - margin.right,
                availableHeight = (height || parseInt(container.style('height')) || 400)
                    - margin.top - margin.bottom;


            chart.update = function () {
                container.transition().duration(transitionDuration).call(chart)
            };
            chart.container = this;

            //set state.disabled
            state.disabled = data.map(function (d) {
                return !!d.disabled
            });


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
            // Display noData message if there's nothing to show.

            if (!data || !data.length || !data.filter(function (d) {
                return d.values.length
            }).length) {ft
                var noDataText = container.selectAll('.nv-noData').data([noData]);

                noDataText.enter().append('text')
                    .attr('class', 'nvd3 nv-noData')
                    .attr('dy', '-.7em')
                    .style('text-anchor', 'middle');

                noDataText
                    .attr('x', margin.left + availableWidth / 2)
                    .attr('y', margin.top + availableHeight / 2)
                    .text(function (d) {
                        return d
                    });

                return chart;
            } else {
                container.selectAll('.nv-noData').remove();
            }

            //------------------------------------------------------------


            //------------------------------------------------------------
            // Setup Scales

            x = lines.xScale();
            y = lines.yScale();

            //------------------------------------------------------------


            //------------------------------------------------------------
            // Setup containers and skeleton of chart
            if(d3.select('text.unit')[0].length){
                 d3.select('text.unit').remove();
            }
            var unitE = container.append('text')
                .attr('class','unit')
                .attr('transform','translate('+(margin.left + tickPadding)+',10)')
                .text(unit);
            var wrap = container.selectAll('g.nv-wrap.nv-lineChart').data([data]);
            var gEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap nv-lineChart').append('g');
            var g = wrap.select('g');


            gEnter.append("rect").style("opacity", 0);
            gEnter.append('g').attr('class', 'nv-x nv-axis');
            gEnter.append('g').attr('class', 'nv-y nv-axis');
            gEnter.append('g').attr('class', 'nv-linesWrap');
            gEnter.append('g').attr('class', 'nv-legendWrap');
            gEnter.append('g').attr('class', 'nv-interactive');

            g.select("rect")
                .attr("width", availableWidth)
                .attr("height", (availableHeight > 0) ? availableHeight : 0);
            //------------------------------------------------------------
            // Legend

            if (showLegend) {
                legend.width(availableWidth)
                    .title(legendTitle);

                g.select('.nv-legendWrap')
                    .datum(data)
                    .call(legend);

//                if (margin.top != legend.height()) {
//                    margin.top = legend.height();
//                    availableHeight = (height || parseInt(container.style('height')) || 400)
//                        - margin.top - margin.bottom;
//                }

                wrap.select('.nv-legendWrap')
                    .attr('transform', 'translate(0, 0)')
                    .style('pointerevenst','none');
            }

            //------------------------------------------------------------

            wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

            if (rightAlignYAxis) {
                g.select(".nv-y.nv-axis")
                    .attr("transform", "translate(" + availableWidth + ",0)");
                d3.select('text.unit').attr("transform", "translate(" + (availableWidth+margin.left+tickPadding)+ ",10)");
            }

            //------------------------------------------------------------
            // Main Chart Component(s)


            //------------------------------------------------------------
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


            lines
                .width(availableWidth)
                .height(availableHeight)
                .color(data.map(function (d, i) {
                    return d.color || color(d, i);
                }).filter(function (d, i) {
                    return !data[i].disabled
                }));


            var linesWrap = g.select('.nv-linesWrap')
                .datum(data.filter(function (d) {
                    return !d.disabled
                }));

            linesWrap.transition().call(lines);

            //------------------------------------------------------------


            //------------------------------------------------------------
            // Setup Axes

            if (showXAxis) {
                xAxis
                    .scale(x)
                    .ticks(availableWidth / 100)

                g.select('.nv-x.nv-axis')
                    .attr('transform', 'translate(0,' + y.range()[0] + ')');
                g.select('.nv-x.nv-axis')
                    .transition()
                    .call(xAxis);
            }

            if (showYAxis) {
                yAxis
                    .scale(y)
                    .ticks(availableHeight / 36)
                    .tickSize(-availableWidth, 0)
                    .tickPadding(tickPadding);

                g.select('.nv-y.nv-axis')
                    .transition()
                    .call(yAxis);
            }
            //------------------------------------------------------------


            //============================================================
            // Event Handling/Dispatching (in chart's scope)
            //------------------------------------------------------------

            legend.dispatch.on('stateChange', function (newState) {
                state = newState;
                dispatch.stateChange(state);
                chart.update();
            });
            interactiveLayer.dispatch.on('elementMousemove', function (e) {
                lines.clearHighlights();
                var singlePoint, pointIndex, pointXLocation, pointYLocation = [], allData = [],tooltipData = [];

                data
                    .filter(function (series, i) {
                        series.seriesIndex = i;
                        return !series.disabled;
                    })
                    .forEach(function (series, i) {
                        pointIndex = nv.interactiveBisect(series.values, e.pointXValue, chart.x());
                        lines.highlightPoint(i, pointIndex, true);
                        var point = series.values[pointIndex];
                        if (typeof point === 'undefined') return;
                        if (typeof singlePoint === 'undefined') singlePoint = point;
                        if (typeof pointXLocation === 'undefined') pointXLocation = chart.xScale()(chart.x()(point, pointIndex));
                        pointYLocation.push(chart.yScale()(chart.y()(point, pointIndex)));
                        allData.push({
                            key: series.key,
                            value: chart.y()(point, pointIndex),
                            color: color(series, series.seriesIndex)
                        });
                        tooltipData.push({
                            pointIndex: pointIndex,
                            pos: [pointXLocation + margin.left, pointYLocation[i] + margin.top],
                            point: point,
                            series: allData[i]
                        });
                    });
                if(!d3.selectAll('.c-'+chart.id()+'-x-'+pointIndex)[0].length){
                    dispatch.tooltipHide();
                }
                if(!d3.selectAll('.c-'+chart.id()+'-x-'+pointIndex)[0].length){
                    dispatch.tooltipShow(tooltipData);
                }
                interactiveLayer.renderGuideLine(pointXLocation, pointYLocation);

            });

            interactiveLayer.dispatch.on("elementMouseout", function (e) {
                dispatch.tooltipHide();
                lines.clearHighlights();
            });

            dispatch.on('tooltipShow', function (tooltipData) {
                if (tooltips) showTooltip(tooltipData, that.parentNode);
            });


            dispatch.on('changeState', function (e) {

                if (typeof e.disabled !== 'undefined' && data.length === e.disabled.length) {
                    data.forEach(function (series, i) {
                        series.disabled = e.disabled[i];
                    });

                    state.disabled = e.disabled;
                }

                chart.update();
            });

            //============================================================

        });

        return chart;
    }


    //============================================================
    // Event Handling/Dispatching (out of chart's scope)
    //------------------------------------------------------------

    dispatch.on('tooltipHide', function () {
        if (tooltips) nv.tooltip.cleanup();
    });

    //============================================================


    //============================================================
    // Expose Public Variables
    //------------------------------------------------------------

    // expose chart's sub-components
    chart.dispatch = dispatch;
    chart.lines = lines;
    chart.legend = legend;
    chart.xAxis = xAxis;
    chart.yAxis = yAxis;
    chart.interactiveLayer = interactiveLayer;

    d3.rebind(chart, lines, 'defined', 'isArea', 'x', 'y', 'size', 'xScale', 'yScale', 'xDomain', 'yDomain', 'xRange', 'yRange'
        , 'forceX', 'forceY', 'interactive', 'clipEdge', 'clipVoronoi', 'useVoronoi', 'id', 'interpolate');

    chart.options = nv.utils.optionsFunc.bind(chart);

    chart.margin = function (_) {
        if (!arguments.length) return margin;
        margin.top = typeof _.top != 'undefined' ? _.top : margin.top;
        margin.right = typeof _.right != 'undefined' ? _.right : margin.right;
        margin.bottom = typeof _.bottom != 'undefined' ? _.bottom : margin.bottom;
        margin.left = typeof _.left != 'undefined' ? _.left : margin.left;
        return chart;
    };

    chart.width = function (_) {
        if (!arguments.length) return width;
        width = _;
        return chart;
    };

    chart.height = function (_) {
        if (!arguments.length) return height;
        height = _;
        return chart;
    };

    chart.color = function (_) {
        if (!arguments.length) return color;
        color = nv.utils.getColor(_);
        legend.color(color);
        return chart;
    };

    chart.showLegend = function (_) {
        if (!arguments.length) return showLegend;
        showLegend = _;
        return chart;
    };

    chart.showXAxis = function (_) {
        if (!arguments.length) return showXAxis;
        showXAxis = _;
        return chart;
    };

    chart.showYAxis = function (_) {
        if (!arguments.length) return showYAxis;
        showYAxis = _;
        return chart;
    };

    chart.rightAlignYAxis = function (_) {
        if (!arguments.length) return rightAlignYAxis;
        rightAlignYAxis = _;
        yAxis.orient((_) ? 'right' : 'left');
        return chart;
    };

    chart.useInteractiveGuideline = function (_) {
        if (!arguments.length) return useInteractiveGuideline;
        useInteractiveGuideline = _;
        if (_ === true) {
            chart.interactive(false);
            chart.useVoronoi(false);
        }
        return chart;
    };

    chart.tooltips = function (_) {
        if (!arguments.length) return tooltips;
        tooltips = _;
        return chart;
    };

    chart.tooltipContent = function (_) {
        if (!arguments.length) return tooltip;
        tooltip = _;
        return chart;
    };

    chart.state = function (_) {
        if (!arguments.length) return state;
        state = _;
        return chart;
    };

    chart.defaultState = function (_) {
        if (!arguments.length) return defaultState;
        defaultState = _;
        return chart;
    };

    chart.noData = function (_) {
        if (!arguments.length) return noData;
        noData = _;
        return chart;
    };

    chart.transitionDuration = function (_) {
        if (!arguments.length) return transitionDuration;
        transitionDuration = _;
        return chart;
    };

    chart.unit = function(_){
        if (!arguments.length) return unit;
        unit = _;
        return chart;
    };

    chart.legendTitle = function(_){
        if (!arguments.length) return legendTitle;
        legendTitle = _;
        return chart;
    };

    //============================================================


    return chart;
}
