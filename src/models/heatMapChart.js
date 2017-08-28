/* Heatmap Chart Type

A heatmap is a graphical representation of data where the individual values
contained in a matrix are represented as colors within cells. Furthermore,
metadata can be associated with each of the matrix rows or columns. By grouping
these rows/columns together by a given metadata value, data trends can be spotted.

Format for input data should be:
var data = [
    {day: 'mo', hour: '1a', value: 16, timeperiod: 'early morning', weekperiod: 'week', category: 1},
    {day: 'mo', hour: '2a', value: 20, timeperiod: 'early morning', weekperiod: 'week', category: 2},
    {day: 'mo', hour: '3a', value: 0, timeperiod: 'early morning', weekperiod: 'week', category: 1},
    ...
]
where the keys 'day' and 'hour' specify the row/column of the heatmap, 'value' specifies the  cell
value and the keys 'timeperiod', 'weekperiod' and 'week' are extra metadata that can be associated
with rows/columns.


Options for chart:
- row (function) [required]: accessor in data that defines rows for heatmap
- column (function) [required]: accessor in data that defines columns for heatmap
- color (function) [required]: accessor in data that defines colors for heatmap
- rowMeta (function): accessor in data that associates heatmap rows with supplied metadata
-columnMeta (function): accessor in data that associates heatmap columns with supplied metadata
- width (int): width of plot
- height (int): height of plot, note that specifying cellAspectRatio will override height
- cellAspectRatio (float): ratio of cell width divided by cell height; if specfied, this value is used to calculate the cell height and will override the option height. by default this value is not used and the cell size is calculated to fit the height/width of the DOM
- colorScale (d3.scale): scale used to define cell colors. if not defined color brewer quantized scale (RdYlBu 11) is used
- showValues (bool): whether to show cell values within the cell as text - default: true
- valueFormat (d3.format): formatter for shown cell value - default: d3.format(',.1f')
- normalize (str): type of normalization to apply to data, must be one of: 'centerRow','robustCenterRow','centerScaleRow','robustCenterScaleRow','centerColumn','robustCenterColumn','centerScaleColumn','robustCenterScaleColumn','centerAll','robustCenterAll','centerScaleAll','robustCenterScaleAll' - default: don't normalize
- highContrastText (bool): if specified, cell value font color will automatically be picked based on the background cell value in order to increase visible contrast - default: true
- groupRowMeta (bool): whether to group rows by specified metadata, see rowMeta option - default: false
- groupColumnMeta (bool): whether to group columns by specified metadata, see columnMeta option - default: false
- showLegend (bool): whether to show the cell color legend - default: true
- showRowMetaLegend (bool): whether to show the row metadata legend, only applicable if option rowMeta is used - default: true
- showColumnMetaLegend (bool): whether to show the column metadata legend, only applicable if option columnMeta is used - default: true
- staggerLabels (bool): whether to stagger the row labels - default: false
- showXAxis (bool): whether to show the column axis labels - default: true
- showYAxis (bool): whether to show the row axis labels- default: true
- rightAlignYAxis (bool): whether to align the row axis on the right - default: false
- bottomAlignXAxis (bool): whether to align the column axis on the bottom - default: false
- rotateLabels (int): degrees to rotate column labels by - default: 0
- title (str): title for chart
- titleOffset (obj): top & left pixel offset for chart - default: {top: -5, left: 0}
- margin (obj): specified chart margins, important for adjusting enough space for legends, axis labels and title - default: {top: 20, right: 10, bottom: 50, left: 60}
*/
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
        , xAxis = nv.models.axis()
        , yAxis = nv.models.axis()
        ;


    var margin = {top: 20, right: 10, bottom: 50, left: 60}
        , marginTop = null
        , width = null
        , height = null
        , color = nv.utils.getColor()
        , showLegend = true
        , showColumnMetaLegend = true
        , showRowMetaLegend = true
        , staggerLabels = false
        , showXAxis = true
        , showYAxis = true
        , rightAlignYAxis = false
        , bottomAlignXAxis = false
        , rotateLabels = 0
        , title = false
        , titleOffset = {top: -5, left: 0}
        , metaXcolor = nv.utils.getColor()
        , metaYcolor = nv.utils.getColor()
        , x
        , y
        , noData = null
        , dispatch = d3.dispatch('beforeUpdate','renderEnd')
        //, dispatch = d3.dispatch('beforeUpdate', 'elementMouseover', 'elementMouseout', 'elementMousemove', 'renderEnd')
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
            return d.toFixed(2);
        })
        .keyFormatter(function(d, i) {
            return xAxis.tickFormat()(d, i);
        });


    //============================================================
    // Private Variables
    //------------------------------------------------------------

    // https://bl.ocks.org/mbostock/4573883
    // get max/min range for all the quantized cell values
    // returns an array where each element is [start,stop]
    // of color bin
    function quantize_legend_values() {

        var e = heatmap.colorScale();

        return e.range().map(function(color) {
          var d = e.invertExtent(color);
          if (d[0] == null) d[0] = e.domain()[0];
          if (d[1] == null) d[1] = e.domain()[1];
          return d;
        })

    }

    // return true if row metadata specified by user
    function hasRowMeta() {
        return heatmap.datRowMeta().size > 0;
    }
    // return true if col metadata specified by user
    function hasColumnMeta() {
        return heatmap.datColumnMeta().size > 0;
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

            var top0 = margin.top; // store original top margin in case we start adjusting it later

            // check that we have enough top margin space for the title
            // and any rendered legends
            // we compare to the original top margin to account for
            // space for each element (since we will adjust top.maring
            // on each check)
            if (title && top0 < 40) margin.top += 40; // check for title space
            if (!bottomAlignXAxis && top0 < 35) margin.top += 35; // check for metadata axis space


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
            gEnter.append('g').attr('class', 'nv-legendWrapColumn');
            gEnter.append('g').attr('class', 'nv-legendWrapRow');
            gEnter.append('g').attr('class', 'nv-x nv-axis');
            gEnter.append('g').attr('class', 'nv-y nv-axis')
            gEnter.append('g').attr('class', 'nv-title')

            g.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');


            // Main Chart Component(s)
            heatmap
                .width(availableWidth)
                .height(availableHeight);



            var heatMapWrap = g.select('.nv-heatMapWrap')
                .datum(data.filter(function(d) { return !d.disabled }));

            heatMapWrap.transition().call(heatmap);

            if (heatmap.cellAspectRatio()) {
                availableHeight = heatmap.cellHeight() * Object.keys(heatmap.datY()).length;
                heatmap.height(availableHeight);
            }


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

                // setup metadata colors horizontal axis
                if (hasColumnMeta()) {

                    var metaXGroup = g.select('.nv-x.nv-axis .nv-wrap g').selectAll('g');

                    var metaX = metaXGroup.selectAll('rect')
                      .data(Object.values([null])); // add dummy data so we can add a single rect to each tick group


                    metaX.enter()
                        .append('rect')
                        .style('fill', function(d) {
                            var prev = d3.select(this.previousSibling).text();
                            var metaVal = heatmap.datColumnMeta().get(prev);
                            return metaXcolor(metaVal);
                        })

                    metaX.watchTransition(renderWatch, 'heatMap: metaX rect')
                        .attr('width', heatmap.cellWidth())
                        .attr('height', heatmap.cellWidth() / 3)
                        .attr('x', -heatmap.cellWidth()/2)
                        .attr('y', bottomAlignXAxis ? -heatmap.cellWidth()/3 : 0)

                    // axis text doesn't rotate properly if align to the top
                    if (!bottomAlignXAxis && rotateLabels != 0) {
                        g.selectAll('g.tick.zero text')
                            .style('text-anchor', rotateLabels > 0 ? 'end' : 'start')
                    }
                }

                if (bottomAlignXAxis) {
                    g.select(".nv-x.nv-axis")
                        .attr("transform", "translate(0," + (availableHeight + (hasColumnMeta() ? heatmap.cellWidth()/2 : 0)) + ")");
                } else {
                    g.select(".nv-x.nv-axis")
                        .attr("transform", "translate(0," + (hasColumnMeta() ? -heatmap.cellWidth()/2 : 0) + ")");
                }
            }

            if (showYAxis) {

                if (rightAlignYAxis) {
                    g.select(".nv-y.nv-axis")
                        .attr("transform", "translate(" + (availableWidth + (hasRowMeta() ? heatmap.cellHeight()/2: 0)) + ",0)");
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
                        .style('fill', function(d, i) {
                            var prev = d3.select(this.previousSibling).text();
                            var metaVal = heatmap.datRowMeta().get(prev);
                            return metaYcolor(metaVal);
                        })

                    metaY.watchTransition(renderWatch, 'heatMap: metaY rect')
                        .attr('width', heatmap.cellHeight() / 3)
                        .attr('height', heatmap.cellHeight())
                        .attr('x', rightAlignYAxis ? -heatmap.cellHeight()/3 : 0)
                        .attr('y', -heatmap.cellHeight()/2)
                }

            }


            // Legend for column metadata
            if (!showColumnMetaLegend || !hasColumnMeta()) {
                g.select('.columnMeta').selectAll('*').remove();
            } else {
                legendColumnMeta.width(availableWidth);

                var metaVals = heatmap.datColumnMetaUnique().map(function (d) {
                    return {key: d};
                })

                g.select('.nv-legendWrapColumn')
                    .datum(metaVals)
                    .call(legendColumnMeta);

                // legend title
                gEnter.select('.nv-legendWrapColumn .nv-legend g')
                    .append('text')
                    .text('Column metadata')
                    .attr('transform','translate(-5,-8)')

                g.select('.nv-legendWrapColumn')
                    .attr('transform', 'translate(0,' + (availableHeight + (!bottomAlignXAxis ? 20 : 50)) +')')
            }

            // Legend for row metadata
            if (!showRowMetaLegend || !hasRowMeta()) {
                g.select('.rowMeta').selectAll('*').remove();
            } else {
                legendRowMeta.width(availableWidth)
                    .rightAlign(false)

                var metaVals = heatmap.datRowMetaUnique().map(function (d) {
                    return {key: d};
                })

                g.select('.nv-legendWrapRow')
                    .datum(metaVals)
                    .call(legendRowMeta);


                // legend title
                gEnter.select('.nv-legendWrapRow .nv-legend g')
                    .append('text')
                    .text('Row metadata')
                    .attr('transform','translate(-5,-8)')

                g.select('.nv-legendWrapRow')
                    .attr('transform', 'translate(5,' + (availableHeight + (!bottomAlignXAxis ? 20 : 50)) +')')
            }

            // Legend
            if (!showLegend) {
                g.select('.nv-legendWrap').selectAll('*').remove();
            } else {
                legend.width(availableWidth);

                 var legendVal = quantize_legend_values().map(function(d) {
                    return {key: d[0].toFixed(1) + " - " + d[1].toFixed(1)};
                })

                g.select('.nv-legendWrap')
                    .datum(legendVal)
                    .call(legend);

                g.select('.nv-legendWrap .nv-legend')
                    .attr('transform', 'translate(0,' + (-legend.height() + ((!bottomAlignXAxis && hasColumnMeta()) ? -15-heatmap.cellWidth()/3 : -5)) +')')
            }

            // add a title if specified
            if (title) {
                var g_title = g.select(".nv-title").selectAll('g')
                    .data([title]);

                // adjust dy position of title based on the various
                // legends and axes that can be present at the top
                if (hasColumnMeta() && !bottomAlignXAxis) titleOffset.top -= 30;

                var titleEnter = g_title.enter()
                    .append('g')
                    .attr('transform', function(d, i) { return 'translate(' + (availableWidth / 2) + ',' + (-20 -(showLegend ? d3.select("g.nv-legend").node().getBBox().height : 0)) + ')'; }) // center title

                titleEnter.append("text")
                    .style("text-anchor", "middle")
                    .style("font-size", "150%")
                    .text(function (d) { return d; })
                    .attr('dx',titleOffset.left)
                    .attr('dy',titleOffset.top)

                g_title
                    .watchTransition(renderWatch, 'heatMap: g_title')
                    .attr('transform', function(d, i) { return 'translate(' + (availableWidth / 2) + ',' + (-20 -(showLegend ? d3.select("g.nv-legend").node().getBBox().height : 0)) + ')'; }) // center title
            }

        });

        // axis don't have a flag for disabling the zero line, so we do it manually
        d3.selectAll('.zero line')
            .style('stroke-opacity', 0)


        renderWatch.renderEnd('heatMap chart immediate');

        return chart;
    }

    //============================================================
    // Event Handling/Dispatching (out of chart's scope)
    //------------------------------------------------------------

    heatmap.dispatch.on('elementMouseover.tooltip', function(evt) {
        evt['series'] = {
            key: chart.column()(evt.data) + ' ' + chart.row()(evt.data),
            value: !chart.normalize() ? chart.color()(evt.data) : evt.data.norm,
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
        showRowMetaLegend: {get: function(){return showRowMetaLegend;}, set: function(_){showRowMetaLegend=_;}},
        showColumnMetaLegend: {get: function(){return showColumnMetaLegend;}, set: function(_){showColumnMetaLegend=_;}},
        staggerLabels: {get: function(){return staggerLabels;}, set: function(_){staggerLabels=_;}},
        rotateLabels:  {get: function(){return rotateLabels;}, set: function(_){rotateLabels=_;}},
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
            legend.color(nv.utils.getColor(["#a50026","#d73027","#f46d43","#fdae61","#fee090","#ffffbf","#e0f3f8","#abd9e9","#74add1","#4575b4","#313695"]));
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
