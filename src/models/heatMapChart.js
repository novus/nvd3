
nv.models.heatMapChart = function() {
    "use strict";

    //============================================================
    // Public Variables with Default Settings
    //------------------------------------------------------------

    var heatmap = nv.models.heatMap()
        , legend = nv.models.legend()
        , tooltip = nv.models.tooltip()
        , xAxis = nv.models.axis()
        , yAxis = nv.models.axis()
        ;

    var margin = {top: 15, right: 10, bottom: 50, left: 60}
        , marginTop = null
        , width = null
        , height = null
        , color = nv.utils.getColor()
        , showLegend = true
        , staggerLabels = false
        , wrapLabels = false
        , showXAxis = true
        , showYAxis = true
        , rightAlignYAxis = false
        , rotateLabels = 0
        , cellWidth = false
        , cellHeight = false
        , x
        , y
        , noData = null
        , dispatch = d3.dispatch('beforeUpdate','renderEnd')
        , duration = 250
        ;

    xAxis
        .orient('bottom')
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

    //============================================================
    // Private Variables
    //------------------------------------------------------------

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

            /*
                I need to make an updated availableWidth/Height function that can take into account
                the user defined cellWidth/cellHeight OR! maybe I setup a cellAspectRatio instead!!
            */



            // need to know number of cells in x & y direction if cellWidth or cellHeight are specified
            // not sure of best way to get at this so I'm doing this hacky thing ...
            var getX = heatmap.x();
            var getY = heatmap.y();
            var numCellX = d3.set(data.map(function(d) { return getX(d); })).size();
            var numCellY = d3.set(data.map(function(d) { return getY(d); })).size();

            //var availableWidth = cellWidth ? cellWidth * numCellX : nv.utils.availableWidth(width, container, margin),
            //    availableHeight = cellHeight ? cellHeight * numCellY : nv.utils.availableHeight(height, container, margin);

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

            if (rightAlignYAxis) {
                g.select(".nv-y.nv-axis")
                    .attr("transform", "translate(" + availableWidth + ",0)");
            }

            // Main Chart Component(s)
            heatmap
                .width(availableWidth)
                .height(availableHeight);

            var heatMapWrap = g.select('.nv-heatMapWrap')
                .datum(data.filter(function(d) { return !d.disabled }));

            heatMapWrap.transition().call(heatmap);

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

                g.select('.nv-x.nv-axis')
                    .attr('transform', 'translate(0,' + availableHeight + ')');
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
            }

            if (showYAxis) {
                yAxis
                    .scale(y)
                    ._ticks( nv.utils.calcTicksY(availableHeight/36, data) )
                    .tickSize( -availableWidth, 0);

                g.select('.nv-y.nv-axis').call(yAxis);
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
            key: chart.x()(evt.data) + ' ' + chart.y()(evt.data),
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
    chart.xAxis = xAxis;
    chart.yAxis = yAxis;
    chart.tooltip = tooltip;

    chart.options = nv.utils.optionsFunc.bind(chart);

    chart._options = Object.create({}, {
        // simple options, just get/set the necessary values
        width:      {get: function(){return width;}, set: function(_){width=_;}},
        height:     {get: function(){return height;}, set: function(_){height=_;}},
        cellWidth:      {get: function(){return cellWidth;}, set: function(_){cellWidth=_;}},
        cellHeight:     {get: function(){return cellHeight;}, set: function(_){cellHeight=_;}},
        showLegend: {get: function(){return showLegend;}, set: function(_){showLegend=_;}},
        staggerLabels: {get: function(){return staggerLabels;}, set: function(_){staggerLabels=_;}},
        rotateLabels:  {get: function(){return rotateLabels;}, set: function(_){rotateLabels=_;}},
        wrapLabels:  {get: function(){return wrapLabels;}, set: function(_){wrapLabels=!!_;}},
        noData:    {get: function(){return noData;}, set: function(_){noData=_;}},

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
        }},
        rightAlignYAxis: {get: function(){return rightAlignYAxis;}, set: function(_){
            rightAlignYAxis = _;
            yAxis.orient( (_) ? 'right' : 'left');
        }}
    });

    nv.utils.inheritOptions(chart, heatmap);
    nv.utils.initOptions(chart);

    return chart;
}
