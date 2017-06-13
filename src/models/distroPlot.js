nv.models.distroPlot = function() {
    "use strict";

    //============================================================
    // Public Variables with Default Settings
    //------------------------------------------------------------

    var margin = {top: 0, right: 0, bottom: 0, left: 0},
        width = 960,
        height = 500,
        id = Math.floor(Math.random() * 10000), // Create semi-unique ID in case user doesn't select one
        xScale = d3.scale.ordinal(),
        yScale = d3.scale.linear(),
        getX  = function(d) { return d.label }, // Default data model selectors.
        getValue  = function(d) { return d.value },
        getColor = function(d) { return d.color },
        getQ1 = function(d) { return d.values.q1 },
        getQ2 = function(d) { return d.values.q2 },
        getQ3 = function(d) { return d.values.q3 },
        getWl = function(d) { return d.values.wl },
        getWh = function(d) { return d.values.wu },
        getOlItems  = function(d) { return d.values.outliers },
        getOlValue = function(d, i, j) { return d },
        getOlLabel = function(d, i, j) { return d },
        getOlColor = function(d, i, j) { return undefined },
        title = false,
        titleOffset = {top: 0, left: 0},
        color = nv.utils.defaultColor(),
        container = null,
        xDomain, xRange,
        yDomain, yRange,
        dispatch = d3.dispatch('elementMouseover', 'elementMouseout', 'elementMousemove', 'renderEnd'),
        duration = 250,
        maxBoxWidth = null;

    //============================================================
    // Helper Functions
    //------------------------------------------------------------

    /*
     * Prep data for use with distroPlot by grouping data
     * by .x() option set by user and then calculating
     * count, sum, mean, q1, q2 (median), q3, lower whisker (wl)
     * upper whisker (wu), iqr, min, max, and standard dev.
     *
     * @param (list) dat - input data formatted as list of objects,
     *   with an object key that must exist when accessed by getX()
     *
     * @return prepared data in the form:
     * [{
     *    key : YY,
     *    values: {
     *      count: XX, 
     *      sum: XX,
     *      mean: XX,
     *      q1: XX,
     *      q2: XX,
     *      q3: XX,
     *      wl: XX,
     *      wu: XX,
     *      iqr: XX,
     *      min: XX,
     *      max: XX,
     *      dev: XX,
     *    }
     *  },
     *  ...
     *  ]
     * where YY are those keys in dat that define the
     * x-axis and which are defined by .x()
     */
    function prepData(dat) {

        var tmp = d3.nest()
            .key(function(d) { return getX(d); })
            .rollup(function(v) { 
                var sortDat = v.map(function(d) { return getValue(d); }).sort(d3.ascending); // this prevents us from needlessly going through the data multiple times
                var q1 = d3.quantile(sortDat, 0.25);
                var q3 = d3.quantile(sortDat, 0.75);
                var iqr = q3 - q1;
                var wl = q1 - 1.5 * iqr; // TODO: different ways of defining whisker position e.g. standard dev
                var wu = q3 + 1.5 * iqr;
                var outliers = sortDat.filter(function(d) { return (d < wl || d > wu); })
                return {
                    count: sortDat.length,
                    sum: d3.sum(sortDat),
                    mean: d3.mean(sortDat),
                    q1: q1,
                    q2: d3.median(sortDat),
                    q3: q3,
                    wl: q1 - 1.5 * iqr,
                    wu: q3 + 1.5 * iqr,
                    iqr: iqr,
                    min: d3.min(sortDat),
                    max: d3.max(sortDat),
                    dev: d3.deviation(sortDat),
                    outliers: outliers,
                }; 
            })
            .entries(dat);

        return tmp;
    }

    //============================================================
    // Private Variables
    //------------------------------------------------------------

    var xScale0, yScale0;
    var renderWatch = nv.utils.renderWatch(dispatch, duration);

    function chart(selection) {
        renderWatch.reset();
        selection.each(function(data) {
            var availableWidth = width - margin.left - margin.right,
                availableHeight = height - margin.top - margin.bottom;

            container = d3.select(this);
            nv.utils.initSVG(container);

            data = prepData(data);
            var mins = data.map(function(d) { return d.values.min }); // list of all box min values
            var maxs = data.map(function(d) { return d.values.max }); // list of all box max values

            // Setup Scales
            xScale.domain(xDomain || data.map(function(d) { return d.key }).sort(d3.ascending))
                .rangeBands(xRange || [0, availableWidth], 0.1);
            yScale.domain(yDomain || d3.extent(mins.concat(maxs)));
            yScale.range(yRange || [availableHeight, 0]);

            //store old scales if they exist
            xScale0 = xScale0 || xScale;
            yScale0 = yScale0 || yScale.copy().range([yScale(0),yScale(0)]);

            // Setup containers and skeleton of chart
            var wrap = container.selectAll('g.nv-wrap').data([data]);
            var wrapEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap');
            wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

            var distroplots = wrap.selectAll('.nv-distroplot').data(function(d) { return d; });
            var boxEnter = distroplots.enter().append('g').style('stroke-opacity', 1e-6).style('fill-opacity', 1e-6);
            distroplots
                .attr('class', 'nv-distroplot')
                .attr('transform', function(d) { return 'translate(' + (xScale(d.key) + xScale.rangeBand() * 0.05) + ', 0)'; })
                .classed('hover', function(d) { return d.hover }); // XXX?
            distroplots
                .watchTransition(renderWatch, 'nv-distroplot: distroplots')
                .style('stroke-opacity', 1)
                .style('fill-opacity', 0.75)
                .delay(function(d,i) { return i * duration / data.length })
                .attr('transform', function(d) {
                    return 'translate(' + (xScale(d.key) + xScale.rangeBand() * 0.05) + ', 0)';
                });
            distroplots.exit().remove();


            // add a title if specified
            if (title) {
                var g_title = wrapEnter.append('g').attr('class', 'nv-title');

                var g_title = g.select(".nv-title").selectAll('g')
                    .data([title]);

                var titleEnter = g_title.enter()
                    .append('g')
                    .attr('transform', function(d, i) { return 'translate(' + (availableWidth / 2) + ',0'; }) // center title

                titleEnter.append("text")
                    .style("text-anchor", "middle")
                    .style("font-size", "150%")
                    .text(function (d) { return d; })
                    .attr('dx',titleOffset.left)
                    .attr('dy',titleOffset.top)

                g_title
                    .watchTransition(renderWatch, 'heatMap: g_title')
                    .attr('transform', function(d, i) { return 'translate(' + (availableWidth / 2) + ',0'; }) // center title
            }

            // ----- add the SVG elements for each boxPlot -----

            // conditionally append whisker lines
            boxEnter.each(function(d,i) {
                var box = d3.select(this);
                [getWl, getWh].forEach(function (f) {
                    if (f(d) !== undefined && f(d) !== null) {
                        var key = (f === getWl) ? 'low' : 'high';
                        box.append('line')
                          .style('stroke', getColor(d) || color(d,i))
                          .attr('class', 'nv-distroplot-whisker nv-distroplot-' + key);
                        box.append('line')
                          .style('stroke', getColor(d) || color(d,i))
                          .attr('class', 'nv-distroplot-tick nv-distroplot-' + key);
                    }
                });
            });

            var box_width = function() { return (maxBoxWidth === null ? xScale.rangeBand() * 0.9 : Math.min(75, xScale.rangeBand() * 0.9)); };
            var box_left  = function() { return xScale.rangeBand() * 0.45 - box_width()/2; };
            var box_right = function() { return xScale.rangeBand() * 0.45 + box_width()/2; };

            // update whisker lines and ticks
            [getWl, getWh].forEach(function (f) {
                var key = (f === getWl) ? 'low' : 'high';
                var endpoint = (f === getWl) ? getQ1 : getQ3;
                distroplots.select('line.nv-distroplot-whisker.nv-distroplot-' + key)
                  .watchTransition(renderWatch, 'nv-distroplot: distroplots')
                    .attr('x1', xScale.rangeBand() * 0.45 )
                    .attr('y1', function(d,i) { return yScale(f(d)); })
                    .attr('x2', xScale.rangeBand() * 0.45 )
                    .attr('y2', function(d,i) { return yScale(endpoint(d)); });
                distroplots.select('line.nv-distroplot-tick.nv-distroplot-' + key)
                  .watchTransition(renderWatch, 'nv-distroplot: distroplots')
                    .attr('x1', box_left )
                    .attr('y1', function(d,i) { return yScale(f(d)); })
                    .attr('x2', box_right )
                    .attr('y2', function(d,i) { return yScale(f(d)); });
            });

            [getWl, getWh].forEach(function (f) {
                var key = (f === getWl) ? 'low' : 'high';
                boxEnter.selectAll('.nv-distroplot-' + key)
                  .on('mouseover', function(d,i,j) {
                      d3.select(this).classed('hover', true);
                      dispatch.elementMouseover({
                          series: { key: f(d), color: getColor(d) || color(d,j) },
                          e: d3.event
                      });
                  })
                  .on('mouseout', function(d,i,j) {
                      d3.select(this).classed('hover', false);
                      dispatch.elementMouseout({
                          series: { key: f(d), color: getColor(d) || color(d,j) },
                          e: d3.event
                      });
                  })
                  .on('mousemove', function(d,i) {
                      dispatch.elementMousemove({e: d3.event});
                  });
            });

            // boxes
            boxEnter.append('rect')
                .attr('class', 'nv-distroplot-box')
                // tooltip events
                .on('mouseover', function(d,i) {
                    d3.select(this).classed('hover', true);
                    dispatch.elementMouseover({
                        key: d.key,
                        value: d.key,
                        series: [
                            { key: 'Q3', value: getQ3(d).toFixed(2), color: getColor(d) || color(d,i) },
                            { key: 'Q2', value: getQ2(d).toFixed(2), color: getColor(d) || color(d,i) },
                            { key: 'Q1', value: getQ1(d).toFixed(2), color: getColor(d) || color(d,i) }
                        ],
                        data: d,
                        index: i,
                        e: d3.event
                    });
                })
                .on('mouseout', function(d,i) {
                    d3.select(this).classed('hover', false);
                    dispatch.elementMouseout({
                        key: d.key,
                        value: d.key,
                        series: [
                            { key: 'Q3', value: getQ3(d).toFixed(2), color: getColor(d) || color(d,i) },
                            { key: 'Q2', value: getQ2(d).toFixed(2), color: getColor(d) || color(d,i) },
                            { key: 'Q1', value: getQ1(d).toFixed(2), color: getColor(d) || color(d,i) }
                        ],
                        data: d,
                        index: i,
                        e: d3.event
                    });
                })
                .on('mousemove', function(d,i) {
                    dispatch.elementMousemove({e: d3.event});
                });

            // box transitions
            distroplots.select('rect.nv-distroplot-box')
              .watchTransition(renderWatch, 'nv-distroplot: boxes')
                .attr('y', function(d,i) { return yScale(getQ3(d)); })
                .attr('width', box_width)
                .attr('x', box_left )
                .attr('height', function(d,i) { return Math.abs(yScale(getQ3(d)) - yScale(getQ1(d))) || 1 })
                .style('fill', function(d,i) { return getColor(d) || color(d,i) })
                .style('stroke', function(d,i) { return getColor(d) || color(d,i) });

            // median line
            boxEnter.append('line').attr('class', 'nv-distroplot-median');

            distroplots.select('line.nv-distroplot-median')
              .watchTransition(renderWatch, 'nv-distroplot: distroplots line')
                .attr('x1', box_left)
                .attr('y1', function(d,i) { return yScale(getQ2(d)); })
                .attr('x2', box_right)
                .attr('y2', function(d,i) { return yScale(getQ2(d)); });

            // outliers
            var outliers = distroplots.selectAll('.nv-distroplot-outlier').data(function(d) {
                return getOlItems(d) || [];
            });
            outliers.enter().append('circle')
                .style('fill', function(d,i,j) { return getOlColor(d,i,j) || color(d,j) })
                .style('stroke', function(d,i,j) { return getOlColor(d,i,j) || color(d,j) })
                .style('z-index', 9000)
                .on('mouseover', function(d,i,j) {
                    d3.select(this).classed('hover', true);
                    dispatch.elementMouseover({
                        series: { key: getOlLabel(d,i,j), color: getOlColor(d,i,j) || color(d,j) },
                        e: d3.event
                    });
                })
                .on('mouseout', function(d,i,j) {
                    d3.select(this).classed('hover', false);
                    dispatch.elementMouseout({
                        series: { key: getOlLabel(d,i,j), color: getOlColor(d,i,j) || color(d,j) },
                        e: d3.event
                    });
                })
                .on('mousemove', function(d,i) {
                    dispatch.elementMousemove({e: d3.event});
                });
            outliers.attr('class', 'nv-distroplot-outlier');
            outliers
              .watchTransition(renderWatch, 'nv-distroplot: nv-distroplot-outlier')
                .attr('cx', xScale.rangeBand() * 0.45)
                .attr('cy', function(d,i,j) { return yScale(getOlValue(d,i,j)); })
                .attr('r', '3');
            outliers.exit().remove();

            //store old scales for use in transitions on update
            xScale0 = xScale.copy();
            yScale0 = yScale.copy();
        });

        renderWatch.renderEnd('nv-distroplot immediate');
        return chart;
    }

    //============================================================
    // Expose Public Variables
    //------------------------------------------------------------

    chart.dispatch = dispatch;
    chart.options = nv.utils.optionsFunc.bind(chart);

    chart._options = Object.create({}, {
        // simple options, just get/set the necessary values
        width:       {get: function(){return width;}, set: function(_){width=_;}},
        height:      {get: function(){return height;}, set: function(_){height=_;}},
        maxBoxWidth: {get: function(){return maxBoxWidth;}, set: function(_){maxBoxWidth=_;}},
        x:           {get: function(){return getX;}, set: function(_){getX=_;}},
        value:       {get: function(){return getValue;}, set: function(_){getValue=_;}},
        itemColor:    {get: function(){return getColor;}, set: function(_){getColor=_;}},
        outliers:     {get: function(){return getOlItems;}, set: function(_){getOlItems=_;}},
        outlierValue: {get: function(){return getOlValue;}, set: function(_){getOlValue=_;}},
        outlierLabel: {get: function(){return getOlLabel;}, set: function(_){getOlLabel=_;}},
        outlierColor: {get: function(){return getOlColor;}, set: function(_){getOlColor=_;}},
        xScale:  {get: function(){return xScale;}, set: function(_){xScale=_;}},
        yScale:  {get: function(){return yScale;}, set: function(_){yScale=_;}},
        xDomain: {get: function(){return xDomain;}, set: function(_){xDomain=_;}},
        yDomain: {get: function(){return yDomain;}, set: function(_){yDomain=_;}},
        xRange:  {get: function(){return xRange;}, set: function(_){xRange=_;}},
        yRange:  {get: function(){return yRange;}, set: function(_){yRange=_;}},
        title:       {get: function(){return title;}, set: function(_){title=_;}},
        titleOffset: {get: function(){return titleOffset;}, set: function(_){titleOffset=_;}},
        id:          {get: function(){return id;}, set: function(_){id=_;}},

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
        duration: {get: function(){return duration;}, set: function(_){
            duration = _;
            renderWatch.reset(duration);
        }}
    });

    nv.utils.initOptions(chart);

    return chart;
};
