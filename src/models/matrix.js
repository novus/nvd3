nv.models.matrix = function() {
    "use strict";
    //============================================================
    // Public Variables with Default Settings
    //------------------------------------------------------------

    var margin = { top: 50, right: 0, bottom: 100, left: 30 },
        width = null,
        height = null,

        xCellCount = null,
        cellCount = null,
        cellPaddding = 6,
        cellWidth = 28,
        cellRound = 2,

        tooltip = nv.models.tooltip(),

        colors = nv.utils.defaultColor(),

        x = function(d,i){return (i%xCellCount) * (cellWidth+cellPaddding)},
        y = function(d,i){return Math.floor( i/xCellCount ) * (cellWidth+cellPaddding) },
        color = d3.scale.quantize().range(colors),


        getKey = function(d,i) { return d.key } ,
        getColor = function(d,i) { return d.color } ,
        disabled = function(d,i) { return d.color === 0},

        transitionDuration = 300,

        labelContent = null,
        labelFormat = function(d){return d;},

        showLabels = false,
        showLegend = true,
        disabledColor = '#ccc',

        noData = 'no data',

        dispatch = d3.dispatch('elementMouseover','elementMouseout','elementMousemove','elementClick','stateChange', 'changeState');

    var prepareData = function(data){
        var p_data = d3.merge(
            data.map(function(d,s) {
                return d.values.map(function(d,i) {
                    return {
                        key: getKey(d,i),
                        color: getColor(d,i),
                        x: x(d,i),
                        y: y(d,i),
                        series: s
                    }
                })
            })
        );
        color.domain(d3.extent(p_data,function(d){return d.color}));
        return p_data;
    }

    function chart(selection) {
        selection.each(function(data) {
            var container = d3.select(this),
                that = this;
            nv.utils.initSVG(container);

            var availableWidth = nv.utils.availableWidth(width,container,margin),
                availableHeight = nv.utils.availableHeight(height,container,margin);

            chart.update = function() { container.transition().duration(transitionDuration).call(chart); };
            chart.container = this;


            xCellCount = Math.floor( availableWidth / (cellWidth+cellPaddding) );

            //------------------------------------------------------------
            // No data
            if (!data || !data.length || !data.filter(function(d) { return d.values.length }).length) {
                var noDataText = container.selectAll('.nv-noData').data([noData]);

                noDataText.enter().append('text')
                    .attr('class', 'nvd3 nv-noData')
                    .attr('dy', '-.7em')
                    .style('text-anchor', 'middle');

                noDataText
                    .attr('x', margin.left + availableWidth / 2)
                    .attr('y', margin.top + availableHeight / 2)
                    .text(function(d) { return d });

                return chart;
            } else {
                container.selectAll('.nv-noData').remove();
            }

            cellCount = data[0].values.length;

            availableWidth = xCellCount * (cellWidth+cellPaddding)  + margin.left + margin.right;
            availableHeight = Math.ceil(cellCount/xCellCount) * (cellWidth+cellPaddding) + margin.top +margin.bottom;

            //------------------------------------------------------------
            // Setup containers and skeleton of chart

            var prepared_data = prepareData(data);
            var wrap = container.selectAll('g.nv-wrap.nv-matrix').data([prepared_data]);
            var wrapEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap nv-matrix');
            var gEnter = wrapEnter.append('g').data(function(d){return d});
            var g = wrap.select('g');

            gEnter.append('rect').attr('class', 'nvd3 nv-background');
            gEnter.append('g').attr('class','nv-cellsWrap');
            gEnter.append('g').attr('class', 'nv-legendWrap');
            gEnter.append('defs');

            wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

            var clipScale = 0.75;
            var clipPathWrap = wrap.select('defs');
            var clipPath = clipPathWrap.selectAll('.nv-clipPath-mask').data(function(d){return d});
            clipPath.enter().append('clipPath').attr('id',function(d,i){return 'm-clipPath-'+i}).attr('class','nv-clipPath-mask').append('rect');
            clipPath.exit().remove();

            //todo: make this [d] easy to understand
            clipPath.selectAll('rect').data(function(d){return [d];})
                .attr('x',function(d){return  d.x + (1-clipScale)/2*cellWidth;})
                .attr('y',function(d){return  d.y + (1-clipScale)/2*cellWidth;})
                .attr('rx',cellRound).attr('ry',cellRound)
                .attr('width',cellWidth*clipScale).attr('height',cellWidth*clipScale);

            var cellsWrap = wrap.select('.nv-cellsWrap');
            var cells = cellsWrap.selectAll('rect.nv-cell').data(function(d){return d})
            cells.enter().append('rect').attr('class','nv-cell');
            cells.exit().remove();
            cells.transition().duration( transitionDuration )
                .attr('x',function(d){return  d.x;})
                .attr('y',function(d){return  d.y;})
                .attr('rx',cellRound).attr('ry',cellRound)
                .attr('width',cellWidth).attr('height',cellWidth)
                .style('fill',function(d,i){return disabled(d,i) ? disabledColor : color(d.color)});

            cells.on('click', function(d,i) {
                if (!data[d.series]) return 0;
                var series = data[d.series],
                    point  = series.values[i];
                var target  =  d3.select(d3.event.target);
                target.classed('selected',!target.classed('selected'));
                dispatch.elementClick({
                    point: point,
                    series: series,
                    seriesIndex: d.series,
                    pointIndex: i,
                    color: d3.select(this).style("fill")
                });
            })
                .on('mouseover', function(d,i) {
                    if (!data[d.series]) return 0;
                    var series = data[d.series],
                        point  = series.values[i];
                    d3.select(d3.event.target).classed('hover',true);
                    dispatch.elementMouseover({
                        point: point,
                        series: series,
                        seriesIndex: d.series,
                        pointIndex: i,
                        color: d3.select(this).style("fill")
                    });

                })
                .on('mousemove', function(d,i) {
                    if (!data[d.series]) return 0;
                    var series = data[d.series],
                        point  = series.values[i];
                    d3.select(d3.event.target).classed('hover',true);
                    dispatch.elementMousemove({
                        point: point,
                        series: series,
                        seriesIndex: d.series,
                        pointIndex: i,
                        color: d3.select(this).style("fill")
                    });

                })
                .on('mouseout', function(d,i) {
                    if (!data[d.series]) return 0;
                    var series = data[d.series],
                        point  = series.values[i];
                    d3.select(d3.event.target).classed('hover',false);
                    dispatch.elementMouseout({
                        point: point,
                        series: series,
                        seriesIndex: d.series,
                        pointIndex: i,
                        color: d3.select(this).style("fill")
                    });
                });

            if(showLabels){
                var magicFontSize = 7;
                var cellTexts = cellsWrap.selectAll('text').data(function(d){return d});
                cellTexts.enter().append('text');
                cellTexts.exit().remove();
                cellTexts.transition().duration(transitionDuration)
                    .text(labelContent || function( d, i ){
                        return labelFormat( d.key );
                    })
                    .style('text-anchor','middle')
                    //todo: fix clip-path position
                    .style('clip-path',function(d,i){return 'url(#m-clipPath-'+i+')';})
                    .style('textLength',cellWidth * .8)
                    .style('pointer-events','none')
                    .attr('x',function(d){return d.x+cellWidth/2;})
                    .attr('y',function(d){return d.y+cellWidth/2;})
                    .attr('dy', '.32em')
                    .style('fill',function(d,i){
                        return colors.indexOf( color(d.color) )/colors.length > 0.618 ? '#fff':'#000'
                    })
            }

            if (showLegend) {
                var legendScale = 2;
                var legendData = colors.map(function(c,i){
                    return {color:c,x:(cellWidth+cellPaddding)/legendScale*i,y:0}
                });
                var legendWrap =  wrap.select('.nv-legendWrap');
                var legend =  legendWrap.selectAll('rect').data(legendData);
                legend.enter().append('rect').attr('class','nv-legendCell');
                legend.exit().remove();
                legend.transition().duration(transitionDuration)
                    .attr('x',function(d){return  d.x;})
                    .attr('y',function(d){return  d.y;})
                    .attr('rx',cellRound/legendScale).attr('ry',cellRound/legendScale)
                    .attr('width',cellWidth/legendScale).attr('height',cellWidth/legendScale)
                    .style('fill',function(d){return d.color});
                legendWrap.attr('transform', 'translate(' + ((cellWidth+cellPaddding)*(xCellCount-legendData.length/legendScale)-cellPaddding/legendScale) + ',' + (Math.ceil(cellCount/xCellCount)*(cellWidth+cellPaddding)+10) +')');
            }


            container.style('width',availableWidth + 'px').style('height',availableHeight+cellWidth/legendScale+10 + 'px');

            dispatch.on('elementMouseover.tooltip', function(evt) {

                var dataEvt = {
                    series: {
                        key: evt.point.key,
                        value: evt.point.value,
                        color: evt.color
                    }
                };
                tooltip.data(dataEvt).hidden(false);
            });

            dispatch.on('elementMouseout.tooltip', function(evt) {
                tooltip.hidden(true);
            });

            dispatch.on('elementMousemove.tooltip', function(evt) {
                tooltip.position({top: d3.event.pageY, left: d3.event.pageX})();
            });

        });
        return chart;
    }

    //============================================================
    // Expose Public Variables
    //------------------------------------------------------------

    chart.dispatch = dispatch;

    chart.tooltip = tooltip;

    chart.options = nv.utils.optionsFunc.bind(chart);

    chart.labelFormat = function(_){
        if (!arguments.length) return labelFormat;
        labelFormat = _;
        return chart;
    };

    chart.labelContent = function(_){
        if (!arguments.length) return labelContent;
        labelContent = _;
        return chart;
    };

    chart.getKey = function(_){
        if (!arguments.length) return getKey;
        getKey = _;
        return chart;
    };

    chart.getColor = function(_){
        if (!arguments.length) return getColor;
        getColor = _;
        return chart;
    };

    chart.noData = function(_){
        if (!arguments.length) return noData;
        noData = _;
        return chart;
    };

    chart.transitionDuration = function(_){
        if (!arguments.length) return transitionDuration;
        transitionDuration = _;
        return chart;
    };

    chart.margin = function(_) {
        if (!arguments.length) return margin;
        margin.top    = typeof _.top    != 'undefined' ? _.top    : margin.top;
        margin.right  = typeof _.right  != 'undefined' ? _.right  : margin.right;
        margin.bottom = typeof _.bottom != 'undefined' ? _.bottom : margin.bottom;
        margin.left   = typeof _.left   != 'undefined' ? _.left   : margin.left;
        return chart;
    };

    chart.width = function(_) {
        if (!arguments.length) return width;
        width = _;
        return chart;
    };

    chart.height = function(_) {
        if (!arguments.length) return height;
        height = _;
        return chart;
    };

    chart.cellPaddding = function(_) {
        if (!arguments.length) return cellPaddding;
        cellPaddding = _;
        return chart;
    };

    chart.cellWidth = function(_) {
        if (!arguments.length) return cellWidth;
        cellWidth = _;
        return chart;
    };

    chart.cellRound = function(_) {
        if (!arguments.length) return cellRound;
        cellRound = _;
        return chart;
    };

    chart.disabled = function(_) {
        if (!arguments.length) return disabled;
        disabled = _;
        return chart;
    };

    chart.disableColor= function(_) {
        if (!arguments.length) return disabledColor;
        disabledColor = _;
        return chart;
    };

    chart.showLabels = function(_) {
        if (!arguments.length) return showLabels;
        showLabels = _;
        return chart;
    };

    chart.colors = function(_) {
        if (!arguments.length) return colors;
        colors = _;
        color = d3.scale.quantize().range(colors);
        return chart;
    };

    //============================================================


    return chart;
};