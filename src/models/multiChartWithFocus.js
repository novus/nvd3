// Currently only works with scatter and line
nv.models.multiChartWithFocus = function() {
    "use strict";

    //============================================================
    // Public Variables with Default Settings
    //------------------------------------------------------------

    var margin = {top: 20, right: 20, bottom: 0, left: 60},
        margin2 = {top: 10, right: 20, bottom: 30, left: 70},    
        color = nv.utils.defaultColor(),
        width = null,
        height = null,
        contextHeight = 80,
        showLegend = true,
        noData = null,
        getX = function(d) { return d.x },
        getY = function(d) { return d.y},
        interpolate = 'linear',
        useVoronoi = true,
        interactiveLayer = nv.interactiveGuideline(),
        useInteractiveGuideline = true,
        legendRightAxisHint = ' (right axis)',
        brushExtent = null,
        duration = 250,
        y1min,
        y1max,
        y2min,
        y2max,
        brush,
        dataInBrushedY1 = [], //yAxis1 brushed data
        dataInBrushedY2 = []  //yAxis2 brushed data
        ;

    //============================================================
    // Private Variables
    //------------------------------------------------------------

    var x = d3.scale.linear(),
        x2 = d3.scale.linear(),
        yScale1 = d3.scale.linear(),
        yScale2 = d3.scale.linear(),
        yScale3 = d3.scale.linear(),
        yScale4 = d3.scale.linear(),

        lines1 = nv.models.line().yScale(yScale1),
        lines2 = nv.models.line().yScale(yScale2),
        lines3 = nv.models.line().yScale(yScale3),
        lines4 = nv.models.line().yScale(yScale4),

        scatters1 = nv.models.scatter().yScale(yScale1),
        scatters2 = nv.models.scatter().yScale(yScale2),
        scatters3 = nv.models.scatter().yScale(yScale3),
        scatters4 = nv.models.scatter().yScale(yScale4),

        bars1 = nv.models.multiBar().stacked(false).yScale(yScale1),
        bars2 = nv.models.multiBar().stacked(false).yScale(yScale2),

        stack1 = nv.models.stackedArea().yScale(yScale1),
        stack2 = nv.models.stackedArea().yScale(yScale2),

        xAxis = nv.models.axis().scale(x).orient('bottom').tickPadding(5),
        xAxis2 = nv.models.axis().scale(x2).orient('bottom').tickPadding(5), 
        yAxis1 = nv.models.axis().scale(yScale1).orient('left'),
        yAxis2 = nv.models.axis().scale(yScale2).orient('right'),

        // yAxis3 = nv.models.axis().scale(yScale3).orient('left'),  //TODO implement y axes for context bar
        // yAxis4 = nv.models.axis().scale(yScale4).orient('right'),  //TODO implement y axes for context bar

        legend = nv.models.legend().height(30),
        tooltip = nv.models.tooltip(),
        dispatch = d3.dispatch('brush')
        ;

    const y = nv.models.axis();  //holder for initial yaxis1 domain, which will update on brush
    const y2 = nv.models.axis(); //holder for initial yaxis2 domain, which will update on brush
    // yAxis3.domain(yAxis1.domain());  //TODO implement y axes for context bar
    // yAxis4.domain(yAxis2.domain());  //TODO implement y axes for context bar

    lines3.interactive(false);
    // lines3.pointActive(function(d) { return false; });

    lines4.interactive(false);
    // lines4.pointActive(function(d) { return false; });


    var charts = [lines1, lines2, lines3, lines4, scatters1, scatters2, scatters3, scatters4, bars1, bars2, stack1, stack2];


    function chart(selection) {
        selection.each(function(data) {
            var container = d3.select(this),
                that = this;
            nv.utils.initSVG(container);

            if (!brush) {
                brush = d3.svg.brush()
                    .x(x2)
                    .on("brush", onBrush);
            }

            chart.update = function() { 
                container.transition().call(chart); 
            };
            // chart.container = this;

            var availableWidth = nv.utils.availableWidth(width, container, margin),
                availableHeightFocus = nv.utils.availableHeight(height, container, margin) - contextHeight,
                availableHeightContext = contextHeight - margin2.top - margin2.bottom;

            var dataLines1 = data.filter(function(d) {return d.type == 'line' && d.yAxis == 1});
            var dataLines2 = data.filter(function(d) {return d.type == 'line' && d.yAxis == 2});
            var dataScatters1 = data.filter(function(d) {return d.type == 'scatter' && d.yAxis == 1});
            var dataScatters2 = data.filter(function(d) {return d.type == 'scatter' && d.yAxis == 2});
            var dataBars1 =  data.filter(function(d) {return d.type == 'bar'  && d.yAxis == 1});
            var dataBars2 =  data.filter(function(d) {return d.type == 'bar'  && d.yAxis == 2});
            var dataStack1 = data.filter(function(d) {return d.type == 'area' && d.yAxis == 1});
            var dataStack2 = data.filter(function(d) {return d.type == 'area' && d.yAxis == 2});

            if (dataScatters1.length) { scatters3.interactive(false); }
            if (dataScatters2.length) { scatters4.interactive(false); }

            // Display noData message if there's nothing to show.
            if (!data || !data.length || !data.filter(function(d) { return d.values.length }).length) {
                nv.utils.noData(chart, container);
                return chart;
            } else {
                container.selectAll('.nv-noData').remove();
            }

            var series1 = data.filter(function(d) {return !d.disabled && d.yAxis == 1})
                .map(function(d) {
                    return d.values.map(function(d,i) {
                        return { x: getX(d), y: getY(d) }
                    })
                });

            var series2 = data.filter(function(d) {return !d.disabled && d.yAxis == 2})
                .map(function(d) {
                    return d.values.map(function(d,i) {
                        return { x: getX(d), y: getY(d) }
                    })
                });
    
            x.domain(d3.extent(d3.merge(series1.concat(series2)), function(d) { return getX(d) }))
                .range([0, availableWidth]);

            x2.domain(x.domain()).range([0, availableWidth]);

            var wrap = container.selectAll('g.nv-wrap.nv-multiChart').data([data]);
            var gEnter = wrap.enter().append('g').attr('class', 'nv-wrap nvd3 nv-multiChart').append('g');
            var g = wrap.select('g');

            gEnter.append('g').attr('class', 'nv-focus');
            gEnter.append('g').attr('class', 'nv-x nv-axis');
            gEnter.append('g').attr('class', 'nv-y1 nv-axis');
            gEnter.append('g').attr('class', 'nv-y2 nv-axis');
            gEnter.append('g').attr('class', 'stack1Wrap');
            gEnter.append('g').attr('class', 'stack2Wrap');
            gEnter.append('g').attr('class', 'bars1Wrap');
            gEnter.append('g').attr('class', 'bars2Wrap');
            gEnter.append('g').attr('class', 'scatters1Wrap');
            gEnter.append('g').attr('class', 'scatters2Wrap');
            gEnter.append('g').attr('class', 'lines1Wrap');
            gEnter.append('g').attr('class', 'lines2Wrap');
            gEnter.append('g').attr('class', 'legendWrap');
            gEnter.append('g').attr('class', 'nv-interactive');

            wrap.exit();
            
            var context = wrap.enter().append('g').attr('class', 'context');

            context.append('g').attr('class', 'nv-context');
            context.append('g').attr('class', 'nv-x nv-axis');
            context.append('g').attr('class', 'lines3Wrap');
            context.append('g').attr('class', 'lines4Wrap');
            context.append('g').attr('class', 'scatters3Wrap');
            context.append('g').attr('class', 'scatters4Wrap');
            context.append('g').attr('class', 'nv-brushBackground');
            context.append('g').attr('class', 'nv-background');
            context.append('g').attr('class', 'nv-x brush')
            // context.append('g').attr('class', 'nv-y3 nv-axis nvd3-svg');  //TODO implement y axes for context bar
            // context.append('g').attr('class', 'nv-y4 nv-axis nvd3-svg');  //TODO implement y axes for context bar

            wrap.exit();

            var gContext = d3.select('svg.nvd3-svg g.context');

            gContext
                .attr('height', availableHeightContext)
                .attr('width', availableWidth)
                .attr('transform', 'translate(' + margin2.left + ',' + (availableHeightFocus + availableHeightContext + margin2.bottom + margin2.top) + ')')
            ;

            gContext.select('g.nv-x.nv-axis')
                .attr('height', availableHeightFocus)
                .attr('transform', 'translate(0,' + availableHeightContext + ')')
            ;
              
            gContext.select('g.nv-x.nv-axis')
                // .attr('transform', 'translate(0,' + )
                .call(xAxis2)
            ;

            gContext.select('g.nv-background')
                .append('rect')
                .attr('height', availableHeightContext)
                .attr('width', availableWidth)
                .style({'fill':'white', 'fill-opacity':'0'})
            ;

            gContext.select('g.nv-x.brush')
              .call(brush)
            .selectAll('rect')
              .attr('y', -10) 
              .attr('height', availableHeightContext + 7)
              .attr('stroke', 'black')
              .attr('fill', 'none')
            ;

            gContext.select('path.domain')
                .attr('fill', 'transparent')
                ;

            gContext.select('.nv-x.nv-axis')
                .attr('transform', 'translate(0,' + (y2.range()[0] + 30) + ')'); 

            var color_array = data.map(function(d,i) {
                return data[i].color || color(d, i);
            });

            if (showLegend) {
                var legendWidth = legend.align() ? availableWidth / 2 : availableWidth;
                var legendXPosition = legend.align() ? legendWidth : 0;

                legend.width(legendWidth);
                legend.color(color_array);

                g.select('.legendWrap')
                    .datum(data.map(function(series) {
                        series.originalKey = series.originalKey === undefined ? series.key : series.originalKey;
                        series.key = series.originalKey + (series.yAxis == 1 ? '' : legendRightAxisHint);
                        return series;
                    }))
                    .call(legend);

                if ( margin.top != legend.height()) {
                    margin.top = legend.height();
                    availableHeightFocus = nv.utils.availableHeight(height, container, margin) - contextHeight;  //NOTE should available height 2 be recalculated here?
                }

                g.select('.legendWrap')
                    .attr('transform', 'translate(' + legendXPosition + ',' + (-margin.top) +')');
            }
            lines1
                .width(availableWidth)
                .height(availableHeightFocus)
                .interpolate(interpolate)
                .color(color_array.filter(function(d,i) { return !data[i].disabled && data[i].yAxis == 1 && data[i].type == 'line'}));
            lines2
                .width(availableWidth)
                .height(availableHeightFocus)
                .interpolate(interpolate)
                .color(color_array.filter(function(d,i) { return !data[i].disabled && data[i].yAxis == 2 && data[i].type == 'line'}));
            lines3
                .width(availableWidth)
                .height(availableHeightContext)
                .interpolate(interpolate)
                .color(color_array.filter(function(d, i) { return !data[i].disabled && data[i].yAxis == 1 && data[i].type == 'line'}));
            lines4
                .width(availableWidth)
                .height(availableHeightContext)
                .interpolate(interpolate)
                .color(color_array.filter(function(d, i) { return !data[i].disabled && data[i].yAxis == 2 && data[i].type == 'line'}));
            scatters1
                .width(availableWidth)
                .height(availableHeightFocus)
                .color(color_array.filter(function(d,i) { return !data[i].disabled && data[i].yAxis == 1 && data[i].type == 'scatter'}));
            scatters2
                .width(availableWidth)
                .height(availableHeightFocus)
                .color(color_array.filter(function(d,i) { return !data[i].disabled && data[i].yAxis == 2 && data[i].type == 'scatter'}));
            scatters3
                .width(availableWidth)
                .height(availableHeightContext)
                .color(color_array.filter(function(d,i) { return !data[i].disabled && data[i].yAxis == 1 && data[i].type == 'scatter'}));
            scatters4
                .width(availableWidth)
                .height(availableHeightContext)
                .color(color_array.filter(function(d,i) { return !data[i].disabled && data[i].yAxis == 2 && data[i].type == 'scatter'}));
            bars1
                .width(availableWidth)
                .height(availableHeightFocus)
                .color(color_array.filter(function(d,i) { return !data[i].disabled && data[i].yAxis == 1 && data[i].type == 'bar'}));
            bars2
                .width(availableWidth)
                .height(availableHeightFocus)
                .color(color_array.filter(function(d,i) { return !data[i].disabled && data[i].yAxis == 2 && data[i].type == 'bar'}));
            stack1
                .width(availableWidth)
                .height(availableHeightFocus)
                .color(color_array.filter(function(d,i) { return !data[i].disabled && data[i].yAxis == 1 && data[i].type == 'area'}));
            stack2
                .width(availableWidth)
                .height(availableHeightFocus)
                .color(color_array.filter(function(d,i) { return !data[i].disabled && data[i].yAxis == 2 && data[i].type == 'area'}));

            g.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

            var lines1Wrap = g.select('.lines1Wrap')
                .datum(dataLines1.filter(function(d){return !d.disabled}));
            var scatters1Wrap = g.select('.scatters1Wrap')
                .datum(dataScatters1.filter(function(d){return !d.disabled}));
            var bars1Wrap = g.select('.bars1Wrap')
                .datum(dataBars1.filter(function(d){return !d.disabled}));
            var stack1Wrap = g.select('.stack1Wrap')
                .datum(dataStack1.filter(function(d){return !d.disabled}));
            var lines2Wrap = g.select('.lines2Wrap')
                .datum(dataLines2.filter(function(d){return !d.disabled}));
            var scatters2Wrap = g.select('.scatters2Wrap')
                .datum(dataScatters2.filter(function(d){return !d.disabled}));
            var bars2Wrap = g.select('.bars2Wrap')
                .datum(dataBars2.filter(function(d){return !d.disabled}));
            var stack2Wrap = g.select('.stack2Wrap')
                .datum(dataStack2.filter(function(d){return !d.disabled}));
            var lines3Wrap = d3.select('.lines3Wrap')
                .datum(dataLines1.filter(function(d){return !d.disabled}));
            var scatters3Wrap = d3.select('.scatters3Wrap')
                .datum(dataScatters1.filter(function(d){return !d.disabled}));
            var lines4Wrap = d3.select('.lines4Wrap')
                .datum(dataLines2.filter(function(d){return !d.disabled}));
            var scatters4Wrap = d3.select('.scatters4Wrap')
                .datum(dataScatters2.filter(function(d){return !d.disabled}));


            var extraValue1 = dataStack1.length ? dataStack1.map(function(a){return a.values}).reduce(function(a,b){
                return a.map(function(aVal,i){return {x: aVal.x, y: aVal.y + b[i].y}})
            }).concat([{x:0, y:0}]) : [];
            var extraValue2 = dataStack2.length ? dataStack2.map(function(a){return a.values}).reduce(function(a,b){
                return a.map(function(aVal,i){return {x: aVal.x, y: aVal.y + b[i].y}})
            }).concat([{x:0, y:0}]) : [];

            yScale1 .domain(d3.extent(d3.merge(series1).concat(extraValue1), function(d) { return d.y } ))
                .range([0, availableHeightFocus]);

            yScale2 .domain(d3.extent(d3.merge(series2).concat(extraValue2), function(d) { return d.y } ))
                .range([0, availableHeightFocus]);

            //TODO implement y axes for context bar
            // yScale3 .domain(d3.extent(d3.merge(series1).concat(extraValue1), function(d) { return d.y } ))
            //     .range([0, availableHeightFocus]);

            // yScale4  .domain(d3.extent(d3.merge(series2).concat(extraValue2), function(d) { return d.y } ))
            //     .range([0, availableHeightFocus]);

            lines1.yDomain(yScale1.domain());
            scatters1.yDomain(yScale1.domain());
            bars1.yDomain(yScale1.domain());
            stack1.yDomain(yScale1.domain());

            lines2.yDomain(yScale2.domain());
            scatters2.yDomain(yScale2.domain());
            bars2.yDomain(yScale2.domain());
            stack2.yDomain(yScale2.domain());

            lines3.yDomain(yScale1.domain());
            scatters3.yDomain(yScale1.domain());

            lines4.yDomain(yScale2.domain());
            scatters4.yDomain(yScale2.domain());

            // TODO: implement datastack3 & 4 and databars3 & 4
            if(dataStack1.length){
                d3.transition(stack1Wrap).call(stack1);
                // d3.transition(stack3Wrap).call(stack3);
            }

            if(dataStack2.length){
                d3.transition(stack2Wrap).call(stack2);
                // d3.transition(stack4Wrap).call(stack4);
            }

            if(dataBars1.length){
                d3.transition(bars1Wrap).call(bars1);
                // d3.transition(bars3Wrap).call(bars3);
            }
            if(dataBars2.length){
                d3.transition(bars2Wrap).call(bars2);
                // d3.transition(bars4Wrap).call(bars4);
        }

            if(dataLines1.length){
                d3.transition(lines1Wrap).call(lines1);
                d3.transition(lines3Wrap).call(lines3);
            }
            if(dataLines2.length){
                d3.transition(lines2Wrap).call(lines2);
                d3.transition(lines4Wrap).call(lines4);
            }

            if(dataScatters1.length){
                d3.transition(scatters1Wrap).call(scatters1);
                d3.transition(scatters3Wrap).call(scatters3);
            }
            if(dataScatters2.length){
                d3.transition(scatters2Wrap).call(scatters2);
                d3.transition(scatters4Wrap).call(scatters4);
            }

            xAxis
                ._ticks( nv.utils.calcTicksX(availableWidth/100, data) )
                .tickSize(-availableHeightFocus, 0);

            g.select('.nv-x.nv-axis')
                .attr('transform', 'translate(0,' + availableHeightFocus + ')');
            d3.transition(g.select('.nv-x.nv-axis'))
                .call(xAxis);

            yAxis1
                ._ticks( nv.utils.calcTicksY(availableHeightFocus/36, data) )
                .tickSize( -availableWidth, 0);

            d3.transition(g.select('.nv-y1.nv-axis'))
                .call(yAxis1);

            yAxis2
                ._ticks( nv.utils.calcTicksY(availableHeightFocus/36, data) )
                .tickSize( -availableWidth, 0);

            d3.transition(g.select('.nv-y2.nv-axis'))
                .call(yAxis2);

            // TODO integrate y axes option for context bar
            // yAxis3
            //     ._ticks( nv.utils.calcTicksY(availableHeightFocusContext/36, data) )
            //     .tickSize( -availableWidth, 0);
            
            // d3.transition(g.select('.nv-y3.nv-axis'))
            //     .call(yAxis3);

            // yAxis4
            //     ._ticks( nv.utils.calcTicksY(availableHeightFocusContext/36, data) )
            //     .tickSize( -availableWidth, 0);
            
            // d3.transition(g.select('.nv-y4.nv-axis'))
            //     .call(yAxis4);

            g.select('.nv-y1.nv-axis')
                .classed('nv-disabled', series1.length ? false : true)
                .attr('transform', 'translate(' + x.range()[0] + ',0)');

            g.select('.nv-y2.nv-axis')
                .classed('nv-disabled', series2.length ? false : true)
                .attr('transform', 'translate(' + x.range()[1] + ',0)');

            // TODO implement y axes for context bar
            // g.select('.nv-y3.nv-axis')
            //     .classed('nv-disabled', series1.length ? false : true)
            //     .attr('transform', 'translate(' + x.range()[0] + ',0)');

            // g.select('.nv-y4.nv-axis')
            //     .classed('nv-disabled', series2.length ? false : true)
            //     .attr('transform', 'translate(' + x.range()[1] + ',0)');

            legend.dispatch.on('stateChange', function(newState) {
                chart.update();
            });

            if(useInteractiveGuideline){
                interactiveLayer
                    .width(availableWidth)
                    .height(availableHeightFocus)
                    .margin({left:margin.left, top:margin.top})
                    .svgContainer(container)
                    .xScale(x); 
                g.select(".nv-interactive").call(interactiveLayer);
            }

            // Sets a constant value for the original yAxis1 before brush events occur
            y.domain(yAxis1.domain());  
            y2.domain(yAxis2.domain());

            //============================================================
            // Event Handling/Dispatching
            //------------------------------------------------------------

            // Taken from crossfilter (http://square.github.com/crossfilter/)
            function resizePath(d) {
                var e = +(d == 'e'),
                    x = e ? 1 : -1,
                    y = availableHeightContext / 3;
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

            function onBrush() {

                var extent = brush.empty() ? x2.domain() : brush.extent();

                var fivePctDiffOfX = Math.abs((xAxis2.domain()[1] - xAxis2.domain()[0])*.05);
                var diffOfBrush = Math.abs(extent[1] - extent[0]);

                // Checking to see if the brush is at least 5% of the total chart
                if (diffOfBrush < fivePctDiffOfX) {
                    brush.extent([0, 0]);
                    return;
                }

                y1min = undefined;
                y1max = undefined;
                y2min = undefined;
                y2max = undefined;

                // y values based off brushed x values
                data.forEach(function(d) { 
                    if (d.yAxis === 1) {
                        d.values.forEach(function(value) {
                            if (value.x >= extent[0] && value.x <= extent[1]) {
                                if (typeof y1max == 'undefined' || value.y > y1max) {
                                    y1max = value.y;
                                }
                                if (typeof y1min == 'undefined' || value.y < y1min) {
                                    y1min = value.y;
                                }
                            }
                        })
                    } else if (d.yAxis === 2) {
                        d.values.forEach(function(value) {
                            if (value.x >= extent[0] && value.x <= extent[1]) {
                                if (typeof y2max == 'undefined' || value.y > y2max) {
                                    y2max = value.y;
                                }
                                if (typeof y2min == 'undefined' || value.y < y2min) {
                                    y2min = value.y;
                                }
                            }  
                        })
                    }
                });

                // If the brush selects no data, show the entire graph
                if (brush.extent() == [0,0]) {
                    extent[0] = xAxis2.domain()[0];
                    extent[1] = xAxis2.domain()[1];
                    y1min = y.domain()[0];
                    y1max = y.domain()[1];
                    y2min = y2.domain()[0];
                    y2max = y2.domain()[1];
                }

                xAxis.domain([extent[0], extent[1]]);

                lines1.xDomain(xAxis.domain());
                lines2.xDomain(xAxis.domain());
                scatters1.xDomain(xAxis.domain());
                scatters2.xDomain(xAxis.domain());

                // Update Chart Axes
                updateXAxis();
                updateYAxis();

                lines1.xScale(xAxis.scale());
                lines2.xScale(xAxis.scale());
                scatters1.xScale(xAxis.scale());
                scatters2.xScale(xAxis.scale());

                lines1.yDomain(yAxis1.domain());
                lines2.yDomain(yAxis2.domain());
                scatters1.yDomain(yAxis1.domain());
                scatters2.yDomain(yAxis2.domain());

                scatters1.yScale(yAxis1.scale());
                scatters2.yScale(yAxis2.scale());

                lines1.clipEdge(true);
                lines2.clipEdge(true);
                scatters1.clipEdge(true);
                scatters2.clipEdge(true);

                d3.select('.lines1Wrap').transition(lines1Wrap).call(lines1);
                d3.select('.lines2Wrap').transition(lines2Wrap).call(lines2);

                d3.select('.scatters1Wrap').transition(scatters1Wrap).call(scatters1);
                d3.select('.scatters2Wrap').transition(scatters2Wrap).call(scatters2);
            }

            function updateXAxis() {
                g.select("line").attr("d", resizePath);
                g.select("scatter").attr("d", resizePath);
                g.select("g.nv-x.nv-axis.nvd3-svg").transition().duration(duration).call(xAxis);
            }

            function updateYAxis() {
                yAxis1.domain(brush.empty() ? y.domain() : [y1min, y1max]);
                yAxis2.domain(brush.empty() ? y2.domain() : [y2min, y2max]);

                g.select("line").attr("d", resizePath);
                g.select("scatter").attr("d", resizePath);
                g.select("g.nv-y1.nv-axis.nvd3-svg").transition().duration(duration).call(yAxis1);
                g.select("g.nv-y2.nv-axis.nvd3-svg").transition().duration(duration).call(yAxis2);
            }

            function mouseover_line(evt) {
                var yaxis = data[evt.seriesIndex].yAxis === 2 ? yAxis2 : yAxis1;
                evt.value = evt.point.x;
                evt.series = {
                    value: evt.point.y,
                    color: evt.point.color,
                    key: evt.series.key
                };
                tooltip
                    .duration(0)
                    .valueFormatter(function(d, i) {
                        return yaxis.tickFormat()(d, i);
                    })
                    .data(evt)
                    .hidden(false);
            }

            function mouseover_scatter(evt) {
                var yaxis = data[evt.seriesIndex].yAxis === 2 ? yAxis2 : yAxis1;
                evt.value = evt.point.x;
                evt.series = {
                    value: evt.point.y,
                    color: evt.point.color,
                    key: evt.series.key
                };
                tooltip
                    .duration(100)
                    .valueFormatter(function(d, i) {
                        return yaxis.tickFormat()(d, i);
                    })
                    .data(evt)
                    .hidden(false);
            }

            function mouseover_stack(evt) {
                var yaxis = data[evt.seriesIndex].yAxis === 2 ? yAxis2 : yAxis1;
                evt.point['x'] = stack1.x()(evt.point);
                evt.point['y'] = stack1.y()(evt.point);
                tooltip
                    .duration(0)
                    .valueFormatter(function(d, i) {
                        return yaxis.tickFormat()(d, i);
                    })
                    .data(evt)
                    .hidden(false);
            }

            function mouseover_bar(evt) {
                var yaxis = data[evt.data.series].yAxis === 2 ? yAxis2 : yAxis1;

                evt.value = bars1.x()(evt.data);
                evt['series'] = {
                    value: bars1.y()(evt.data),
                    color: evt.color,
                    key: evt.data.key
                };
                tooltip
                    .duration(0)
                    .valueFormatter(function(d, i) {
                        return yaxis.tickFormat()(d, i);
                    })
                    .data(evt)
                    .hidden(false);
            }

            function clearHighlights() {
              for(var i=0, il=charts.length; i < il; i++){
                var chart = charts[i];
                try {
                  chart.clearHighlights();
                } catch(e){}
              }
            }

            function highlightPoint(serieIndex, pointIndex, b){
              for(var i=0, il=charts.length; i < il; i++){
                var chart = charts[i];
                try {
                  chart.highlightPoint(serieIndex, pointIndex, b);
                } catch(e){}
              }
            }

            if(useInteractiveGuideline){
                interactiveLayer.dispatch.on('elementMousemove', function(e) {
                    clearHighlights();
                    var singlePoint, pointIndex, pointXLocation, allData = [];
                    data
                    .filter(function(series, i) {
                        series.seriesIndex = i;
                        return !series.disabled;
                    })
                    .forEach(function(series,i) {
                        var extent = brush.empty() ? x2.domain() : brush.extent();
                        var currentValues = series.values.filter(function(d,i) {
                            return chart.x()(d,i) >= extent[0] && chart.x()(d,i) <= extent[1];
                        });

                        pointIndex = nv.interactiveBisect(currentValues, e.pointXValue, chart.x());
                        var point = currentValues[pointIndex];
                        var pointYValue = chart.y()(point, pointIndex);
                        if (pointYValue !== null) {
                            highlightPoint(i, pointIndex, true);
                        }
                        if (point === undefined) return;
                        if (singlePoint === undefined) singlePoint = point;
                        if (pointXLocation === undefined) pointXLocation = x(chart.x()(point,pointIndex));
                        allData.push({
                            key: series.key,
                            value: pointYValue,
                            color: color(series,series.seriesIndex),
                            data: point,
                            yAxis: series.yAxis == 2 ? yAxis2 : yAxis1
                        });
                    });

                    interactiveLayer.tooltip
                    .chartContainer(chart.container)
                    .valueFormatter(function(d,i) {
                        var yAxis = allData[i].yAxis;
                        return d === null ? "N/A" : yAxis.tickFormat()(d);
                    })
                    .data({
                        value: chart.x()( singlePoint,pointIndex ),
                        index: pointIndex,
                        series: allData
                    })();

                    interactiveLayer.renderGuideLine(pointXLocation);
                });

                interactiveLayer.dispatch.on("elementMouseout",function(e) {
                    clearHighlights();
                });
            } else {
                lines1.dispatch.on('elementMouseover.tooltip', mouseover_line);
                lines2.dispatch.on('elementMouseover.tooltip', mouseover_line);
                lines1.dispatch.on('elementMouseout.tooltip', function(evt) {
                    tooltip.hidden(true)
                });
                lines2.dispatch.on('elementMouseout.tooltip', function(evt) {
                    tooltip.hidden(true)
                });

                scatters1.dispatch.on('elementMouseover.tooltip', mouseover_scatter);
                scatters2.dispatch.on('elementMouseover.tooltip', mouseover_scatter);
                scatters1.dispatch.on('elementMouseout.tooltip', function(evt) {
                    tooltip.hidden(true)
                });
                scatters2.dispatch.on('elementMouseout.tooltip', function(evt) {
                    tooltip.hidden(true)
                });

                stack1.dispatch.on('elementMouseover.tooltip', mouseover_stack);
                stack2.dispatch.on('elementMouseover.tooltip', mouseover_stack);
                stack1.dispatch.on('elementMouseout.tooltip', function(evt) {
                    tooltip.hidden(true)
                });
                stack2.dispatch.on('elementMouseout.tooltip', function(evt) {
                    tooltip.hidden(true)
                });

                bars1.dispatch.on('elementMouseover.tooltip', mouseover_bar);
                bars2.dispatch.on('elementMouseover.tooltip', mouseover_bar);

                bars1.dispatch.on('elementMouseout.tooltip', function(evt) {
                    tooltip.hidden(true);
                });
                bars2.dispatch.on('elementMouseout.tooltip', function(evt) {
                    tooltip.hidden(true);
                });
                bars1.dispatch.on('elementMousemove.tooltip', function(evt) {
                    tooltip();
                });
                bars2.dispatch.on('elementMousemove.tooltip', function(evt) {
                    tooltip();
                });
            }

        });

        return chart;
    }

    //============================================================
    // Global getters and setters
    //------------------------------------------------------------

    chart.dispatch = dispatch;
    chart.legend = legend;
    chart.lines1 = lines1;
    chart.lines2 = lines2;
    chart.lines3 = lines3;
    chart.lines4 = lines4;
    chart.scatters1 = scatters1;
    chart.scatters2 = scatters2;
    chart.scatters3 = scatters3;
    chart.scatters4 = scatters4;
    chart.bars1 = bars1;
    chart.bars2 = bars2;
    chart.stack1 = stack1;
    chart.stack2 = stack2;
    chart.xAxis = xAxis;
    chart.xAxis2 = xAxis2;
    chart.yAxis1 = yAxis1;
    chart.yAxis2 = yAxis2;
    // chart.yAxis3 = yAxis3;   //TODO implement y axes for context bar
    // chart.yAxis4 = yAxis4;   //TODO implement y axes for context bar
    chart.tooltip = tooltip;
    chart.interactiveLayer = interactiveLayer;

    chart.options = nv.utils.optionsFunc.bind(chart);

    chart._options = Object.create({}, {
        // simple options, just get/set the necessary values
        width:      {get: function(){return width;}, set: function(_){width=_;}},
        height:     {get: function(){return height;}, set: function(_){height=_;}},
        showLegend: {get: function(){return showLegend;}, set: function(_){showLegend=_;}},
        noData:    {get: function(){return noData;}, set: function(_){noData=_;}},
        interpolate:    {get: function(){return interpolate;}, set: function(_){interpolate=_;}},
        legendRightAxisHint:    {get: function(){return legendRightAxisHint;}, set: function(_){legendRightAxisHint=_;}},

        // options that require extra logic in the setter
        margin: {get: function(){return margin;}, set: function(_){
            margin.top    = _.top    !== undefined ? _.top    : margin.top;
            margin.right  = _.right  !== undefined ? _.right  : margin.right;
            margin.bottom = _.bottom !== undefined ? _.bottom : margin.bottom;
            margin.left   = _.left   !== undefined ? _.left   : margin.left;
        }},
        color:  {get: function(){return color;}, set: function(_){
            color = nv.utils.getColor(_);
        }},
        x: {get: function(){return getX;}, set: function(_){
            getX = _;
            lines1.x(_);
            lines2.x(_);
            lines3.x(_);
            lines4.x(_);
            scatters1.x(_);
            scatters2.x(_);
            scatters3.x(_);
            scatters4.x(_);
            bars1.x(_);
            bars2.x(_);
            stack1.x(_);
            stack2.x(_);
        }},
        y: {get: function(){return getY;}, set: function(_){
            getY = _;
            lines1.y(_);
            lines2.y(_);
            lines3.y(_);
            lines4.y(_);
            scatters1.y(_);
            scatters2.y(_);
            scatters3.y(_);
            scatters4.y(_);
            stack1.y(_);
            stack2.y(_);
            bars1.y(_);
            bars2.y(_);
        }},
        useVoronoi: {get: function(){return useVoronoi;}, set: function(_){
            useVoronoi=_;
            lines1.useVoronoi(_);
            lines2.useVoronoi(_);
            lines3.useVoronoi(_);
            lines4.useVoronoi(_);
            stack1.useVoronoi(_);
            stack2.useVoronoi(_);
        }},

        useInteractiveGuideline: {get: function(){return useInteractiveGuideline;}, set: function(_){
            useInteractiveGuideline = _;
            if (useInteractiveGuideline) {
                lines1.interactive(false);
                lines1.useVoronoi(false);
                lines2.interactive(false);
                lines2.useVoronoi(false);
                lines3.interactive(false);
                lines3.useVoronoi(false);
                lines4.interactive(false);
                lines4.useVoronoi(false);
                stack1.interactive(false);
                stack1.useVoronoi(false);
                stack2.interactive(false);
                stack2.useVoronoi(false);
                scatters1.interactive(false);
                scatters2.interactive(false);
                scatters3.interactive(false);
                scatters4.interactive(false);
            }
        }}
    });

    nv.utils.initOptions(chart);

    return chart;
};