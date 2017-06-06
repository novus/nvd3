
nv.models.heatMapChart = function() {
    "use strict";

    //============================================================
    // Public Variables with Default Settings
    //------------------------------------------------------------

    var heatmap = nv.models.heatMap()
        , legend = nv.models.legend()
        , legendRowMeta = nv.models.legend()
        , legendColumnMeta = nv.models.legend()
        , tooltip = nv.models.tooltip()
        , metaTooltip = nv.models.tooltip()
        , xAxis = nv.models.axis()
        , yAxis = nv.models.axis()
        ;


    var margin = {top: 20, right: 10, bottom: 50, left: 60}
        , marginTop = null
        , width = null
        , height = null
        , color = nv.utils.getColor()
        , showLegend = true
        , showLegendColumnMeta = true
        , showLegendRowMeta = true
        , staggerLabels = false
        , wrapLabels = false
        , showXAxis = true
        , showYAxis = true
        , rightAlignYAxis = false
        , bottomAlignXAxis = false
        , rotateLabels = 0
        , title = false
        , metaXcolor = nv.utils.defaultColor()
        , metaYcolor = nv.utils.defaultColor()
        , x
        , y
        , noData = null
        //, dispatch = d3.dispatch('beforeUpdate','renderEnd')
        , dispatch = d3.dispatch('beforeUpdate', 'elementMouseover', 'elementMouseout', 'elementMousemove', 'renderEnd')
        , duration = 250
        ;

    xAxis
        .orient((bottomAlignXAxis) ? 'bottom' : 'top')
        .showMaxMin(false)
        .tickFormat(function(d) { return d })
    ;
    yAxis
        .orient((rightAlignYAxis) ? 'right' : 'left')
        .showMaxMin(false)
        .tickFormat(function(d) { return d })
    ;

    tooltip
        .duration(0)
        .headerEnabled(false)
        .valueFormatter(function(d, i) {
            return yAxis.tickFormat()(d, i);
        })
        .keyFormatter(function(d, i) {
            return xAxis.tickFormat()(d, i);
        });

    metaTooltip
        .duration(0)
        .headerEnabled(false)
        .valueFormatter(function(d, i) {
            return yAxis.tickFormat()(d, i);
        })
        .keyFormatter(function(d, i) {
            return xAxis.tickFormat()(d, i);
        });

    //============================================================
    // Private Variables
    //------------------------------------------------------------

    function hasRowMeta() {
        return Object.keys(heatmap.datRowMeta()).length > 0;
    }
    function hasColumnMeta() {
        return Object.keys(heatmap.datColumnMeta()).length > 0;
    }

    var renderWatch = nv.utils.renderWatch(dispatch, duration);

    function chart(selection) {
        renderWatch.reset();
        renderWatch.models(heatmap);
        if (showXAxis) renderWatch.models(xAxis);
        if (showYAxis) renderWatch.models(yAxis);

        selection.each(function(data) {
            var container = d3.select(this),
                that = this;
            nv.utils.initSVG(container);

            // title is assumed to be 40px tall, check that there 
            // is enough space in the margin
            if (title && margin.top < 40) margin.top += 40;

            var availableWidth = nv.utils.availableWidth(width, container, margin),
                availableHeight = nv.utils.availableHeight(height, container, margin);

            chart.update = function() {
                dispatch.beforeUpdate();
                container.transition().duration(duration).call(chart);
            };
            chart.container = this;

            // Display No Data message if there's nothing to show.
            if (!data || !data.length) {
                nv.utils.noData(chart, container);
                return chart;
            } else {
                container.selectAll('.nv-noData').remove();
            }

            // Setup Scales
            x = heatmap.xScale();
            y = heatmap.yScale();


            // Setup containers and skeleton of chart
            var wrap = container.selectAll('g.nv-wrap.nv-heatMapWithAxes').data([data]);
            var gEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap nv-heatMapWithAxes').append('g');
            var defsEnter = gEnter.append('defs');
            var g = wrap.select('g');


            gEnter.append('g').attr('class', 'nv-heatMapWrap');
            gEnter.append('g').attr('class', 'nv-legendWrap');
            gEnter.append('g').attr('class', 'nv-x nv-axis');
            gEnter.append('g').attr('class', 'nv-y nv-axis')

            g.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

            // Legend
            if (!showLegend) {
                g.select('.nv-legendWrap').selectAll('*').remove();
            } else {
                legend.width(availableWidth);

                g.select('.nv-legendWrap')
                    .datum(data)
                    .call(legend);

                if (!marginTop && legend.height() !== margin.top) {
                    margin.top = legend.height();
                }

                wrap.select('.nv-legendWrap')
                    .attr('transform', 'translate(0,' + (-margin.top) +')')
            }


            // Main Chart Component(s)
            heatmap
                .width(availableWidth)
                .height(availableHeight);

            if (title) heatmap.title(title);

            var heatMapWrap = g.select('.nv-heatMapWrap')
                .datum(data.filter(function(d) { return !d.disabled }));

            heatMapWrap.transition().call(heatmap);

            if (heatmap.cellAspectRatio()) {
                availableHeight = heatmap.cellHeight() * Object.keys(heatmap.datY()).length;
                heatmap.height(availableHeight);
            }

            console.log(availableWidth, availableHeight, margin)

            defsEnter.append('clipPath')
                .attr('id', 'nv-x-label-clip-' + heatmap.id())
                .append('rect');

            g.select('#nv-x-label-clip-' + heatmap.id() + ' rect')
                .attr('width', x.rangeBand() * (staggerLabels ? 2 : 1))
                .attr('height', 16)
                .attr('x', -x.rangeBand() / (staggerLabels ? 1 : 2 ));

            // Setup Axes
            if (showXAxis) {

                xAxis
                    .scale(x)
                    ._ticks( nv.utils.calcTicksX(availableWidth/100, data) )
                    .tickSize(-availableHeight, 0);

                g.select('.nv-x.nv-axis').call(xAxis);

                var xTicks = g.select('.nv-x.nv-axis').selectAll('g');

                xTicks
                    .selectAll('.tick text')
                    .attr('transform', function(d,i,j) {
                        var rot = rotateLabels != 0 ? rotateLabels : '0';
                        var stagger = staggerLabels ? j % 2 == 0 ? '5' : '17' : '0';
                        return 'translate(0, ' + stagger + ') rotate(' + rot + ' 0,0)';
                    })
                    .style('text-anchor', rotateLabels > 0 ? 'start' : rotateLabels < 0 ? 'end' : 'middle');

                if (wrapLabels) {
                    g.selectAll('.tick text')
                        .call(nv.utils.wrapTicks, chart.xAxis.rangeBand())
                }

                // setup metadata colors horizontal axis
                if (hasColumnMeta()) {

                    var metaXGroup = g.select('.nv-x.nv-axis .nv-wrap g').selectAll('g');

                    var metaX = metaXGroup.selectAll('rect')
                      .data(Object.values([null])); // add dummy data so we can add a single rect to each tick group


                    metaX.enter()
                        .append('rect')
                        .style('fill', function(d) { 
                            var prev = d3.select(this.previousSibling).text();
                            var metaVal = heatmap.datColumnMeta()[prev];
                            return metaXcolor(metaVal);
                        })

                    metaX.watchTransition(renderWatch, 'heatMap: metaX rect')
                        .attr('width', heatmap.cellWidth())
                        .attr('height', heatmap.cellWidth() / 3)
                        .attr('x', -heatmap.cellWidth()/2)
                        .attr('y', -17)

                }

                if (bottomAlignXAxis) {
                    g.select(".nv-x.nv-axis")
                        .attr("transform", "translate(0," + (availableHeight + (hasColumnMeta() ? 20 : 2)) + ")");
                } else {
                    g.select(".nv-x.nv-axis")
                        .attr("transform", "translate(0," + (hasColumnMeta() ? -20 : -2) + ")");
                }
            }

            if (showYAxis) {

                if (rightAlignYAxis) {
                    g.select(".nv-y.nv-axis")
                        .attr("transform", "translate(" + (availableWidth + hasRowMeta() ? 18: 0) + ",0)");
                } else { 
                    g.select(".nv-y.nv-axis")
                        .attr("transform", "translate(" + (hasRowMeta() ? -18 : 0) + ",0)");
                }

                yAxis
                    .scale(y)
                    ._ticks( nv.utils.calcTicksY(availableHeight/36, data) )
                    .tickSize( -availableWidth, 0);

                g.select('.nv-y.nv-axis').call(yAxis);

                // setup metadata colors vertical axis
                if (hasRowMeta()) {

                    var metaYGroup = g.select('.nv-y.nv-axis .nv-wrap g').selectAll('g');

                    var metaY = metaYGroup.selectAll('rect')
                      .data(Object.values([null])); // add dummy data so we can add a single rect to each tick group


                    metaY.enter()
                        .append('rect')
                        .style('fill', function(d) { 
                            var prev = d3.select(this.previousSibling).text();
                            var metaVal = heatmap.datRowMeta()[prev];
                            return metaYcolor(metaVal);
                        })

                    metaY.watchTransition(renderWatch, 'heatMap: metaY rect')
                        .attr('width', heatmap.cellHeight() / 3)
                        .attr('height', heatmap.cellHeight())
                        .attr('x', 0)
                        .attr('y', -heatmap.cellHeight()/2)
                }

            }


            // Legend for column metadata
            if (!showLegendColumnMeta) {
                g.select('.nv-legendWrap').selectAll('*').remove();
            } else {
                legendColumnMeta.width(availableWidth);

                var metaVals = d3.set(Object.values(heatmap.datColumnMeta())).values().map(function (d) { // unique list of column meta values
                    return {key: d}
                });

                g.select('.nv-legendWrap')
                    .append('g')
                    .attr('class','nv-legendMeta columnMeta')
                    .datum(metaVals)
                    .call(legendColumnMeta);

                if (!marginTop && legend.height() !== margin.top) {
                    margin.top = legend.height();
                }

                // legend title
                g.select('.columnMeta .nv-legend g')
                    .append('text')
                    .text('Column metadata')
                    .attr('transform','translate(-5,-5)')

                wrap.select('.nv-legendWrap .columnMeta')
                    .attr('transform', 'translate(0,' + (availableHeight + 50) +')')
            }

            console.log(data)

            // Legend for row metadata
            if (!showLegendRowMeta) {
                g.select('.nv-legendWrap').selectAll('*').remove();
            } else {
                legendRowMeta.width(availableWidth)
                    .rightAlign(false);

                var metaVals = d3.set(Object.values(heatmap.datRowMeta())).values().map(function (d) { // unique list of column meta values
                    return {key: d}
                });

                g.select('.nv-legendWrap')
                    .append('g')
                    .attr('class','nv-legendMeta rowMeta')
                    .datum(metaVals)
                    .call(legendRowMeta);

                if (!marginTop && legend.height() !== margin.top) {
                    margin.top = legend.height();
                }

                // legend title
                g.select('.rowMeta .nv-legend g')
                    .append('text')
                    .text('Row metadata')
                    .attr('transform','translate(-5,-5)')

                wrap.select('.nv-legendWrap .rowMeta')
                    .attr('transform', 'translate(0,' + (availableHeight + 50) +')')
            }
        });

        renderWatch.renderEnd('heatMap chart immediate');


        return chart;
    }

    //============================================================
    // Event Handling/Dispatching (out of chart's scope)
    //------------------------------------------------------------

    heatmap.dispatch.on('elementMouseover.tooltip', function(evt) {
        evt['series'] = {
            key: chart.column()(evt.data) + ' ' + chart.row()(evt.data),
            value: chart.color()(evt.data),
            color: evt.color
        };
        tooltip.data(evt).hidden(false);
    });

    heatmap.dispatch.on('elementMouseout.tooltip', function(evt) {
        tooltip.hidden(true);
    });

    heatmap.dispatch.on('elementMousemove.tooltip', function(evt) {
        tooltip();
    });

    //============================================================
    // Expose Public Variables
    //------------------------------------------------------------

    chart.dispatch = dispatch;
    chart.heatmap = heatmap;
    chart.legend = legend;
    chart.legendRowMeta = legendRowMeta;
    chart.legendColumnMeta = legendColumnMeta;
    chart.xAxis = xAxis;
    chart.yAxis = yAxis;
    chart.tooltip = tooltip;

    chart.options = nv.utils.optionsFunc.bind(chart);

    chart._options = Object.create({}, {
        // simple options, just get/set the necessary values
        width:      {get: function(){return width;}, set: function(_){width=_;}},
        height:     {get: function(){return height;}, set: function(_){height=_;}},
        showLegend: {get: function(){return showLegend;}, set: function(_){showLegend=_;}},
        showLegendRowMeta: {get: function(){return showLegendRowMeta;}, set: function(_){showLegendRowMeta=_;}},
        showLegendColumnMeta: {get: function(){return showLegendColumnMeta;}, set: function(_){showLegendColumnMeta=_;}},
        staggerLabels: {get: function(){return staggerLabels;}, set: function(_){staggerLabels=_;}},
        rotateLabels:  {get: function(){return rotateLabels;}, set: function(_){rotateLabels=_;}},
        wrapLabels:  {get: function(){return wrapLabels;}, set: function(_){wrapLabels=!!_;}},
        noData:    {get: function(){return noData;}, set: function(_){noData=_;}},
        title:    {get: function(){return title;}, set: function(_){title=_;}},

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
        duration: {get: function(){return duration;}, set: function(_){
            duration = _;
            renderWatch.reset(duration);
            heatmap.duration(duration);
            xAxis.duration(duration);
            yAxis.duration(duration);
        }},
        color:  {get: function(){return color;}, set: function(_){
            color = nv.utils.getColor(_);
            heatmap.color(color);
            legend.color(color);
            legendColumnMeta.color(metaXcolor);
            legendRowMeta.color(metaYcolor);
        }},
        rightAlignYAxis: {get: function(){return rightAlignYAxis;}, set: function(_){
            rightAlignYAxis = _;
            yAxis.orient( (_) ? 'right' : 'left');
        }},
        bottomAlignXAxis: {get: function(){return bottomAlignXAxis;}, set: function(_){
            bottomAlignXAxis = _;
            xAxis.orient( (_) ? 'bottom' : 'top');
        }},
    });

    nv.utils.inheritOptions(chart, heatmap);
    nv.utils.initOptions(chart);

    return chart;
}
