nv.models.linePlusBarChart = function() {
    "use strict";

    //============================================================
    // Public Variables with Default Settings
    //------------------------------------------------------------

    var lines = nv.models.line()
        , lines2 = nv.models.line()
        , bars = nv.models.historicalBar()
        , bars2 = nv.models.historicalBar()
        , xAxis = nv.models.axis()
        , x2Axis = nv.models.axis()
        , y1Axis = nv.models.axis()
        , y2Axis = nv.models.axis()
        , y3Axis = nv.models.axis()
        , y4Axis = nv.models.axis()
        , legend = nv.models.legend()
        , brush = d3.svg.brush()
        ;

    var margin = {top: 30, right: 30, bottom: 30, left: 60}
        , margin2 = {top: 0, right: 30, bottom: 20, left: 60}
        , width = null
        , height = null
        , getX = function(d) { return d.x }
        , getY = function(d) { return d.y }
        , color = nv.utils.defaultColor()
        , showLegend = true
        , focusEnable = true
        , focusShowAxisY = false
        , focusShowAxisX = true
        , focusHeight = 50
        , extent
        , brushExtent = null
        , tooltips = true
        , tooltip = function(key, x, y, e, graph) {
            return '<h3>' + key + '</h3>' +
                '<p>' +  y + ' at ' + x + '</p>';
        }
        , x
        , x2
        , y1
        , y2
        , y3
        , y4
        , noData = "No Data Available."
        , dispatch = d3.dispatch('tooltipShow', 'tooltipHide', 'brush', 'stateChange', 'changeState')
        , transitionDuration = 0
        , state = nv.utils.state()
        , defaultState = null
        , legendLeftAxisHint = ' (left axis)'
        , legendRightAxisHint = ' (right axis)'
        ;

    lines
        .clipEdge(true)
    ;
    lines2
        .interactive(false)
    ;
    xAxis
        .orient('bottom')
        .tickPadding(5)
    ;
    y1Axis
        .orient('left')
    ;
    y2Axis
        .orient('right')
    ;
    x2Axis
        .orient('bottom')
        .tickPadding(5)
    ;
    y3Axis
        .orient('left')
    ;
    y4Axis
        .orient('right')
    ;

    //============================================================
    // Private Variables
    //------------------------------------------------------------

    var showTooltip = function(e, offsetElement) {
        if (extent) {
            e.pointIndex += Math.ceil(extent[0]);
        }
        var left = e.pos[0] + ( offsetElement.offsetLeft || 0 ),
            top = e.pos[1] + ( offsetElement.offsetTop || 0),
            x = xAxis.tickFormat()(lines.x()(e.point, e.pointIndex)),
            y = (e.series.bar ? y1Axis : y2Axis).tickFormat()(lines.y()(e.point, e.pointIndex)),
            content = tooltip(e.series.key, x, y, e, chart);

        nv.tooltip.show([left, top], content, e.value < 0 ? 'n' : 's', null, offsetElement);
    };

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
        selection.each(function(data) {
            var container = d3.select(this),
                that = this;
            nv.utils.initSVG(container);
            var availableWidth = (width  || parseInt(container.style('width')) || 960)
                    - margin.left - margin.right,
                availableHeight1 = (height || parseInt(container.style('height')) || 400)
                    - margin.top - margin.bottom - (focusEnable ? focusHeight : 0) ,
                availableHeight2 = focusHeight - margin2.top - margin2.bottom;

            chart.update = function() { container.transition().duration(transitionDuration).call(chart); };
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

            // Display No Data message if there's nothing to show.
            if (!data || !data.length || !data.filter(function(d) { return d.values.length }).length) {
                var noDataText = container.selectAll('.nv-noData').data([noData]);

                noDataText.enter().append('text')
                    .attr('class', 'nvd3 nv-noData')
                    .attr('dy', '-.7em')
                    .style('text-anchor', 'middle');

                noDataText
                    .attr('x', margin.left + availableWidth / 2)
                    .attr('y', margin.top + availableHeight1 / 2)
                    .text(function(d) { return d });

                return chart;
            } else {
                container.selectAll('.nv-noData').remove();
            }

            // Setup Scales
            var dataBars = data.filter(function(d) { return !d.disabled && d.bar });
            var dataLines = data.filter(function(d) { return !d.bar }); // removed the !d.disabled clause here to fix Issue #240

            x = bars.xScale();
            x2 = x2Axis.scale();
            y1 = bars.yScale();
            y2 = lines.yScale();
            y3 = bars2.yScale();
            y4 = lines2.yScale();

            var series1 = data
                .filter(function(d) { return !d.disabled && d.bar })
                .map(function(d) {
                    return d.values.map(function(d,i) {
                        return { x: getX(d,i), y: getY(d,i) }
                    })
                });

            var series2 = data
                .filter(function(d) { return !d.disabled && !d.bar })
                .map(function(d) {
                    return d.values.map(function(d,i) {
                        return { x: getX(d,i), y: getY(d,i) }
                    })
                });

            x.range([0, availableWidth]);

            x2  .domain(d3.extent(d3.merge(series1.concat(series2)), function(d) { return d.x } ))
                .range([0, availableWidth]);

            // Setup containers and skeleton of chart
            var wrap = container.selectAll('g.nv-wrap.nv-linePlusBar').data([data]);
            var gEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap nv-linePlusBar').append('g');
            var g = wrap.select('g');

            gEnter.append('g').attr('class', 'nv-legendWrap');

            // this is the main chart
            var focusEnter = gEnter.append('g').attr('class', 'nv-focus');
            focusEnter.append('g').attr('class', 'nv-x nv-axis');
            focusEnter.append('g').attr('class', 'nv-y1 nv-axis');
            focusEnter.append('g').attr('class', 'nv-y2 nv-axis');
            focusEnter.append('g').attr('class', 'nv-barsWrap');
            focusEnter.append('g').attr('class', 'nv-linesWrap');

            // context chart is where you can focus in
            var contextEnter = gEnter.append('g').attr('class', 'nv-context');
            contextEnter.append('g').attr('class', 'nv-x nv-axis');
            contextEnter.append('g').attr('class', 'nv-y1 nv-axis');
            contextEnter.append('g').attr('class', 'nv-y2 nv-axis');
            contextEnter.append('g').attr('class', 'nv-barsWrap');
            contextEnter.append('g').attr('class', 'nv-linesWrap');
            contextEnter.append('g').attr('class', 'nv-brushBackground');
            contextEnter.append('g').attr('class', 'nv-x nv-brush');

            //============================================================
            // Legend
            //------------------------------------------------------------

            if (showLegend) {
                legend.width( availableWidth / 2 );

                g.select('.nv-legendWrap')
                    .datum(data.map(function(series) {
                        series.originalKey = series.originalKey === undefined ? series.key : series.originalKey;
                        series.key = series.originalKey + (series.bar ? legendLeftAxisHint : legendRightAxisHint);
                        return series;
                    }))
                    .call(legend);

                if ( margin.top != legend.height()) {
                    margin.top = legend.height();
                    availableHeight1 = (height || parseInt(container.style('height')) || 400)
                        - margin.top - margin.bottom - focusHeight;
                }

                g.select('.nv-legendWrap')
                    .attr('transform', 'translate(' + ( availableWidth / 2 ) + ',' + (-margin.top) +')');
            }

            wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

            //============================================================
            // Context chart (focus chart) components
            //------------------------------------------------------------

            // hide or show the focus context chart
            g.select('.nv-context').style('display', focusEnable ? 'initial' : 'none');

            bars2
                .width(availableWidth)
                .height(availableHeight2)
                .color(data.map(function (d, i) {
                    return d.color || color(d, i);
                }).filter(function (d, i) {
                    return !data[i].disabled && data[i].bar
                }));
            lines2
                .width(availableWidth)
                .height(availableHeight2)
                .color(data.map(function (d, i) {
                    return d.color || color(d, i);
                }).filter(function (d, i) {
                    return !data[i].disabled && !data[i].bar
                }));

            var bars2Wrap = g.select('.nv-context .nv-barsWrap')
                .datum(dataBars.length ? dataBars : [
                    {values: []}
                ]);
            var lines2Wrap = g.select('.nv-context .nv-linesWrap')
                .datum(!dataLines[0].disabled ? dataLines : [
                    {values: []}
                ]);

            g.select('.nv-context')
                .attr('transform', 'translate(0,' + ( availableHeight1 + margin.bottom + margin2.top) + ')');

            bars2Wrap.transition().call(bars2);
            lines2Wrap.transition().call(lines2);

            // context (focus chart) axis controls
            if (focusShowAxisX) {
                x2Axis
                    .ticks(nv.utils.calcTicksX(availableWidth / 100, data))
                    .tickSize(-availableHeight2, 0);
                g.select('.nv-context .nv-x.nv-axis')
                    .attr('transform', 'translate(0,' + y3.range()[0] + ')');
                g.select('.nv-context .nv-x.nv-axis').transition()
                    .call(x2Axis);
            }

            if (focusShowAxisY) {
                y3Axis
                    .scale(y3)
                    .ticks( availableHeight2 / 36 )
                    .tickSize( -availableWidth, 0);
                y4Axis
                    .scale(y4)
                    .ticks( availableHeight2 / 36 )
                    .tickSize(dataBars.length ? 0 : -availableWidth, 0); // Show the y2 rules only if y1 has none

                g.select('.nv-context .nv-y3.nv-axis')
                    .style('opacity', dataBars.length ? 1 : 0)
                    .attr('transform', 'translate(0,' + x2.range()[0] + ')');
                g.select('.nv-context .nv-y2.nv-axis')
                    .style('opacity', dataLines.length ? 1 : 0)
                    .attr('transform', 'translate(' + x2.range()[1] + ',0)');

                g.select('.nv-context .nv-y1.nv-axis').transition()
                    .call(y3Axis);
                g.select('.nv-context .nv-y2.nv-axis').transition()
                    .call(y4Axis);
            }

            // Setup Brush
            brush.x(x2).on('brush', onBrush);

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
                //.attr('y', -5)
                .attr('height', availableHeight2);
            gBrush.selectAll('.resize').append('path').attr('d', resizePath);

            //============================================================
            // Event Handling/Dispatching (in chart's scope)
            //------------------------------------------------------------

            legend.dispatch.on('stateChange', function(newState) {
                for (var key in newState)
                    state[key] = newState[key];
                dispatch.stateChange(state);
                chart.update();
            });

            dispatch.on('tooltipShow', function(e) {
                if (tooltips) showTooltip(e, that.parentNode);
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
                if (!brush.empty()) brush.extent(brushExtent);
                brushBG
                    .data([brush.empty() ? x2.domain() : brushExtent])
                    .each(function(d,i) {
                        var leftWidth = x2(d[0]) - x2.range()[0],
                            rightWidth = x2.range()[1] - x2(d[1]);
                        d3.select(this).select('.left')
                            .attr('width',  leftWidth < 0 ? 0 : leftWidth);

                        d3.select(this).select('.right')
                            .attr('x', x2(d[1]))
                            .attr('width', rightWidth < 0 ? 0 : rightWidth);
                    });
            }

            function onBrush() {
                brushExtent = brush.empty() ? null : brush.extent();
                extent = brush.empty() ? x2.domain() : brush.extent();
                dispatch.brush({extent: extent, brush: brush});
                updateBrushBG();

                // Prepare Main (Focus) Bars and Lines
                bars
                    .width(availableWidth)
                    .height(availableHeight1)
                    .color(data.map(function(d,i) {
                        return d.color || color(d, i);
                    }).filter(function(d,i) { return !data[i].disabled && data[i].bar }));

                lines
                    .width(availableWidth)
                    .height(availableHeight1)
                    .color(data.map(function(d,i) {
                        return d.color || color(d, i);
                    }).filter(function(d,i) { return !data[i].disabled && !data[i].bar }));

                var focusBarsWrap = g.select('.nv-focus .nv-barsWrap')
                    .datum(!dataBars.length ? [{values:[]}] :
                        dataBars
                            .map(function(d,i) {
                                return {
                                    key: d.key,
                                    values: d.values.filter(function(d,i) {
                                        return bars.x()(d,i) >= extent[0] && bars.x()(d,i) <= extent[1];
                                    })
                                }
                            })
                );

                var focusLinesWrap = g.select('.nv-focus .nv-linesWrap')
                    .datum(dataLines[0].disabled ? [{values:[]}] :
                        dataLines
                            .map(function(d,i) {
                                return {
                                    key: d.key,
                                    values: d.values.filter(function(d,i) {
                                        return lines.x()(d,i) >= extent[0] && lines.x()(d,i) <= extent[1];
                                    })
                                }
                            })
                );

                // Update Main (Focus) X Axis
                if (dataBars.length) {
                    x = bars.xScale();
                } else {
                    x = lines.xScale();
                }

                xAxis
                    .scale(x)
                    .ticks( nv.utils.calcTicksX(availableWidth/100, data) )
                    .tickSize(-availableHeight1, 0);

                xAxis.domain([Math.ceil(extent[0]), Math.floor(extent[1])]);

                g.select('.nv-x.nv-axis').transition().duration(transitionDuration)
                    .call(xAxis);

                // Update Main (Focus) Bars and Lines
                focusBarsWrap.transition().duration(transitionDuration).call(bars);
                focusLinesWrap.transition().duration(transitionDuration).call(lines);

                // Setup and Update Main (Focus) Y Axes
                g.select('.nv-focus .nv-x.nv-axis')
                    .attr('transform', 'translate(0,' + y1.range()[0] + ')');

                y1Axis
                    .scale(y1)
                    .ticks( nv.utils.calcTicksY(availableHeight1/36, data) )
                    .tickSize(-availableWidth, 0);
                y2Axis
                    .scale(y2)
                    .ticks( nv.utils.calcTicksY(availableHeight1/36, data) )
                    .tickSize(dataBars.length ? 0 : -availableWidth, 0); // Show the y2 rules only if y1 has none

                g.select('.nv-focus .nv-y1.nv-axis')
                    .style('opacity', dataBars.length ? 1 : 0);
                g.select('.nv-focus .nv-y2.nv-axis')
                    .style('opacity', dataLines.length && !dataLines[0].disabled ? 1 : 0)
                    .attr('transform', 'translate(' + x.range()[1] + ',0)');

                g.select('.nv-focus .nv-y1.nv-axis').transition().duration(transitionDuration)
                    .call(y1Axis);
                g.select('.nv-focus .nv-y2.nv-axis').transition().duration(transitionDuration)
                    .call(y2Axis);
            }

            onBrush();

        });

        return chart;
    }

    //============================================================
    // Event Handling/Dispatching (out of chart's scope)
    //------------------------------------------------------------

    lines.dispatch.on('elementMouseover.tooltip', function(e) {
        e.pos = [e.pos[0] +  margin.left, e.pos[1] + margin.top];
        dispatch.tooltipShow(e);
    });

    lines.dispatch.on('elementMouseout.tooltip', function(e) {
        dispatch.tooltipHide(e);
    });

    bars.dispatch.on('elementMouseover.tooltip', function(e) {
        e.pos = [e.pos[0] +  margin.left, e.pos[1] + margin.top];
        dispatch.tooltipShow(e);
    });

    bars.dispatch.on('elementMouseout.tooltip', function(e) {
        dispatch.tooltipHide(e);
    });

    dispatch.on('tooltipHide', function() {
        if (tooltips) nv.tooltip.cleanup();
    });

    //============================================================


    //============================================================
    // Expose Public Variables
    //------------------------------------------------------------

    // expose chart's sub-components
    chart.dispatch = dispatch;
    chart.legend = legend;
    chart.lines = lines;
    chart.lines2 = lines2;
    chart.bars = bars;
    chart.bars2 = bars2;
    chart.xAxis = xAxis;
    chart.x2Axis = x2Axis;
    chart.y1Axis = y1Axis;
    chart.y2Axis = y2Axis;
    chart.y3Axis = y3Axis;
    chart.y4Axis = y4Axis;

    chart.options = nv.utils.optionsFunc.bind(chart);

    chart._options = Object.create({}, {
        // simple options, just get/set the necessary values
        width:      {get: function(){return width;}, set: function(_){width=_;}},
        height:     {get: function(){return height;}, set: function(_){height=_;}},
        showLegend: {get: function(){return showLegend;}, set: function(_){showLegend=_;}},
        tooltips:    {get: function(){return tooltips;}, set: function(_){tooltips=_;}},
        tooltipContent:    {get: function(){return tooltip;}, set: function(_){tooltip=_;}},
        brushExtent:    {get: function(){return brushExtent;}, set: function(_){brushExtent=_;}},
        noData:    {get: function(){return noData;}, set: function(_){noData=_;}},
        focusEnable:    {get: function(){return focusEnable;}, set: function(_){focusEnable=_;}},
        focusHeight:    {get: function(){return focusHeight;}, set: function(_){focusHeight=_;}},
        focusShowAxisX:    {get: function(){return focusShowAxisX;}, set: function(_){focusShowAxisX=_;}},
        focusShowAxisY:    {get: function(){return focusShowAxisY;}, set: function(_){focusShowAxisY=_;}},
        legendLeftAxisHint:    {get: function(){return legendLeftAxisHint;}, set: function(_){legendLeftAxisHint=_;}},
        legendRightAxisHint:    {get: function(){return legendRightAxisHint;}, set: function(_){legendRightAxisHint=_;}},

        // options that require extra logic in the setter
        margin: {get: function(){return margin;}, set: function(_){
            margin.top    = _.top    !== undefined ? _.top    : margin.top;
            margin.right  = _.right  !== undefined ? _.right  : margin.right;
            margin.bottom = _.bottom !== undefined ? _.bottom : margin.bottom;
            margin.left   = _.left   !== undefined ? _.left   : margin.left;
        }},
        duration: {get: function(){return transitionDuration;}, set: function(_){
            transitionDuration = _;
        }},
        color:  {get: function(){return color;}, set: function(_){
            color = nv.utils.getColor(_);
            legend.color(color);
        }},
        x: {get: function(){return getX;}, set: function(_){
            getX = _;
            lines.x(_);
            lines2.x(_);
            bars.x(_);
            bars2.x(_);
        }},
        y: {get: function(){return getY;}, set: function(_){
            getY = _;
            lines.y(_);
            lines2.y(_);
            bars.y(_);
            bars2.y(_);
        }}
    });

    nv.utils.inheritOptions(chart, lines);
    nv.utils.initOptions(chart);

    return chart;
};
