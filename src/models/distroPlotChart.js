nv.models.distroPlotChart = function() {
    "use strict";

    //============================================================
    // Public Variables with Default Settings
    //------------------------------------------------------------

    var distroplot = nv.models.distroPlot(),
        xAxis = nv.models.axis(),
        yAxis = nv.models.axis(),
        legend = nv.models.legend();

    var margin = {top: 25, right: 10, bottom: 40, left: 60},
        width = null,
        height = null,
        color = nv.utils.getColor(),
        showXAxis = true,
        showYAxis = true,
        rightAlignYAxis = false,
        staggerLabels = false,
        showLegend = true,
        bottomAlignLegend = false,
        xLabel = false,
        yLabel = false,
        tooltip = nv.models.tooltip(),
        title = false,
        titleOffset = {top: 0, left: 0},
        x, y,
        noData = 'No Data Available.',
        dispatch = d3.dispatch('beforeUpdate', 'renderEnd'),
        duration = 250;

    xAxis
        .orient('bottom')
        .showMaxMin(false)
        .tickFormat(function(d) { return d })
    ;
    yAxis
        .orient((rightAlignYAxis) ? 'right' : 'left')
        .tickFormat(d3.format(',.1f'))
    ;

    tooltip.duration(0);


    //============================================================
    // Private Variables
    //------------------------------------------------------------

    var renderWatch = nv.utils.renderWatch(dispatch, duration);
    var plotType0, observationType0;

    function chart(selection) {
        renderWatch.reset();
        renderWatch.models(distroplot);
        if (showXAxis) renderWatch.models(xAxis);
        if (showYAxis) renderWatch.models(yAxis);

        selection.each(function(data) {
            var container = d3.select(this), that = this;
            nv.utils.initSVG(container);
            if (title && margin.top < (showLegend ? 40 : 25)) margin.top += showLegend ? 40 : 25;
            var availableWidth = (width  || parseInt(container.style('width')) || 960) - margin.left - margin.right;
            var availableHeight = (height || parseInt(container.style('height')) || 400) - margin.top - margin.bottom;

            // TODO - won't work when changing plotType since e.g. yVscale won't get calculated
            chart.update = function() {
                //console.log(observationType0, distroplot.options().observationType(), plotType0, distroplot.options().plotType())
                dispatch.beforeUpdate();
                distroplot.recalcKDE()
                container.transition().duration(duration).call(chart);
            };
            chart.resizeWindow = function() {
                console.log('window resize')
                dispatch.beforeUpdate();
                container.transition().duration(duration).call(chart);
            };
            chart.container = this;


            if (typeof d3.beeswarm !== 'function' && chart.options().observationType() == 'swarm') {
                noData = 'You must first load beeswarm.js is using a swarm observation type (see https://github.com/Kcnarf/d3-beeswarm).'
                nv.utils.noData(chart, container);
                return chart;
            } else if (!data || !data.length) {
                nv.utils.noData(chart, container);
                return chart;
            } else {
                container.selectAll('.nv-noData').remove();
            }


            // Setup Scales
            x = distroplot.xScale();
            y = distroplot.yScale().clamp(true);

            // Setup containers and skeleton of chart
            var wrap = container.selectAll('g.nv-wrap.nv-distroPlot').data([data]);
            var gEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap nv-distroPlot').append('g');
            var defsEnter = gEnter.append('defs');
            var g = wrap.select('g');

            gEnter.append('g').attr('class', 'nv-x nv-axis');
            gEnter.append('g').attr('class', 'nv-y nv-axis')
                .append('g').attr('class', 'nv-zeroLine')
                .append('line');

            gEnter.append('g').attr('class', 'nv-distroWrap');
            g.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

            if (rightAlignYAxis) {
                g.select('.nv-y.nv-axis')
                    .attr('transform', 'translate(' + availableWidth + ',0)');
            }


            // Main Chart Component(s)
            distroplot.width(availableWidth).height(availableHeight);

            var distroWrap = g.select('.nv-distroWrap')
                .datum(data)

            distroWrap.transition().call(distroplot);

            defsEnter.append('clipPath')
                .attr('id', 'nv-x-label-clip-' + distroplot.id())
                .append('rect');

            g.select('#nv-x-label-clip-' + distroplot.id() + ' rect')
                .attr('width', x.rangeBand() * (staggerLabels ? 2 : 1))
                .attr('height', 16)
                .attr('x', -x.rangeBand() / (staggerLabels ? 1 : 2 ));

            // Setup Axes
            if (showXAxis) {
                xAxis
                    .scale(x)
                    .ticks( nv.utils.calcTicksX(availableWidth/100, data) )
                    .tickSize(-availableHeight, 0);

                g.select('.nv-x.nv-axis').attr('transform', 'translate(0,' + y.range()[0] + ')');
                g.select('.nv-x.nv-axis').call(xAxis);

                var xTicks = g.select('.nv-x.nv-axis').selectAll('g');
                if (staggerLabels) {
                    xTicks
                        .selectAll('text')
                        .attr('transform', function(d,i,j) { return 'translate(0,' + (j % 2 === 0 ? '5' : '17') + ')' })
                }
            }

            if (showYAxis) {
                yAxis
                    .scale(y)
                    .ticks( Math.floor(availableHeight/36) ) // can't use nv.utils.calcTicksY with Object data
                    .tickSize( -availableWidth, 0);

                g.select('.nv-y.nv-axis').call(yAxis);
            }

            // add a title if specified
            if (title) {

                gEnter.append('g').attr('class','nv-title')

                var g_title = g.select(".nv-title").selectAll('g')
                    .data([title]);

                var titleEnter = g_title.enter()
                    .append('g')
                    .attr('transform', function(d, i) { return 'translate(' + (availableWidth / 2) + ',' + (showLegend ? -25 : -10) + ')'; }) // center title

                titleEnter.append("text")
                    .style("text-anchor", "middle")
                    .style("font-size", "150%")
                    .text(function (d) { return d; })
                    .attr('dx',titleOffset.left)
                    .attr('dy',titleOffset.top)

                g_title
                    .watchTransition(renderWatch, 'heatMap: g_title')
                    .attr('transform', function(d, i) { return 'translate(' + (availableWidth / 2) + ',' + (showLegend ? -25 : -10) + ')'; }) // center title
            }

            // setup legend
            if (distroplot.colorGroup() && showLegend) { 

                legend.width(availableWidth)
                    .color(distroplot.itemColor())

                var colorGroups = distroplot.colorGroupSizeScale().domain().map(function(d) { return {key: d}; })

                gEnter.append('g').attr('class', 'nv-legendWrap');

                g.select('.nv-legendWrap')
                    .datum(colorGroups)
                    .call(legend);

                g.select('.nv-legendWrap .nv-legend')
                    .attr('transform', 'translate(0,' + (bottomAlignLegend ? (availableHeight + legend.height() - 5) : (-legend.height() + 5)) +')')
            }

            // Zero line on chart bottom
            g.select('.nv-zeroLine line')
                .attr('x1',0)
                .attr('x2',availableWidth)
                .attr('y1', y(0))
                .attr('y2', y(0))
            ;

            // store original values so that we can update things properly
            observationType0 = distroplot.options().observationType();
            plotType0 = distroplot.options().plotType();

            //============================================================
            // Event Handling/Dispatching (in chart's scope)
            //------------------------------------------------------------
        });

        renderWatch.renderEnd('nv-distroplot chart immediate');
        return chart;
    }

    //============================================================
    // Event Handling/Dispatching (out of chart's scope)
    //------------------------------------------------------------

    distroplot.dispatch.on('elementMouseover.tooltip', function(evt) {
        tooltip.data(evt).hidden(false);
    });

    distroplot.dispatch.on('elementMouseout.tooltip', function(evt) {
        tooltip.data(evt).hidden(true);
    });

    distroplot.dispatch.on('elementMousemove.tooltip', function(evt) {
        tooltip();
    });

    //============================================================
    // Expose Public Variables
    //------------------------------------------------------------

    chart.dispatch = dispatch;
    chart.distroplot = distroplot;
    chart.xAxis = xAxis;
    chart.yAxis = yAxis;
    chart.tooltip = tooltip;
    chart.legend = legend;

    chart.options = nv.utils.optionsFunc.bind(chart);

    chart._options = Object.create({}, {
        // simple options, just get/set the necessary values
        width:      {get: function(){return width;}, set: function(_){width=_;}},
        height:     {get: function(){return height;}, set: function(_){height=_;}},
        staggerLabels: {get: function(){return staggerLabels;}, set: function(_){staggerLabels=_;}},
        showXAxis: {get: function(){return showXAxis;}, set: function(_){showXAxis=_;}},
        showYAxis: {get: function(){return showYAxis;}, set: function(_){showYAxis=_;}},
        tooltipContent:    {get: function(){return tooltip;}, set: function(_){tooltip=_;}},
        noData:    {get: function(){return noData;}, set: function(_){noData=_;}},
        showLegend:    {get: function(){return showLegend;}, set: function(_){showLegend=_;}},
        bottomAlignLegend:    {get: function(){return bottomAlignLegend;}, set: function(_){bottomAlignLegend=_;}},
        title:       {get: function(){return title;}, set: function(_){title=_;}},
        titleOffset: {get: function(){return titleOffset;}, set: function(_){titleOffset=_;}},

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
            distroplot.duration(duration);
            xAxis.duration(duration);
            yAxis.duration(duration);
        }},
        color:  {get: function(){return color;}, set: function(_){
            color = nv.utils.getColor(_);
            distroplot.color(color);
        }},
        rightAlignYAxis: {get: function(){return rightAlignYAxis;}, set: function(_){
            rightAlignYAxis = _;
            yAxis.orient( (_) ? 'right' : 'left');
        }},
        xLabel:  {get: function(){return xLabel;}, set: function(_){
            xLabel=_;
            xAxis.axisLabel(xLabel);
        }},
        yLabel:  {get: function(){return yLabel;}, set: function(_){
            yLabel=_;
            yAxis.axisLabel(yLabel);
        }},
    });


    nv.utils.inheritOptions(chart, distroplot);
    nv.utils.initOptions(chart);

    return chart;
}
