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
        cellHeight = 20,
        cellRound = 2,
        tooltip = nv.models.tooltip(),
        colors = nv.utils.defaultColor(),

        x = function(d,i){return (i%xCellCount) * (cellWidth+cellPaddding)},
        y = function(d,i){return Math.floor( i/xCellCount ) * (cellHeight+cellPaddding) },
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
            availableHeight = Math.ceil(cellCount/xCellCount) * (cellHeight+cellPaddding) + margin.top +margin.bottom;

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
                .attr('y',function(d){return  d.y + (1-clipScale)/2*cellHeight;})
                .attr('rx',cellRound).attr('ry',cellRound)
                .attr('width',cellWidth*clipScale).attr('height',cellHeight*clipScale);

            var cellsWrap = wrap.select('.nv-cellsWrap');
            var cells = cellsWrap.selectAll('rect.nv-cell').data(function(d){return d})
            cells.enter().append('rect').attr('class','nv-cell');
            cells.exit().remove();
            cells.transition().duration( transitionDuration )
                .attr('x',function(d){return  d.x;})
                .attr('y',function(d){return  d.y;})
                .attr('rx',cellRound).attr('ry',cellRound)
                .attr('width',cellWidth).attr('height',cellHeight)
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
                    .attr('y',function(d){return d.y+cellHeight/2;})
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
                    .attr('width',cellWidth/legendScale).attr('height',cellHeight/legendScale)
                    .style('fill',function(d){return d.color});
                legendWrap.attr('transform', 'translate(' + ((cellWidth+cellPaddding)*(xCellCount-legendData.length/legendScale)-cellPaddding/legendScale) + ',' + (Math.ceil(cellCount/xCellCount)*(cellHeight+cellPaddding)+10) +')');
            }


            container.style('width',availableWidth + 'px').style('height',availableHeight+cellHeight/legendScale+10 + 'px');

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

    chart._options = Object.create({}, {
        width:      {get: function(){return width;}, set: function(_){width=_;}},
        height:     {get: function(){return height;}, set: function(_){height=_;}},
        labelFormat: {get: function(){return labelFormat;}, set: function(_){labelFormat=_;}},
        labelContent: {get: function(){return labelContent;}, set: function(_){labelContent=_;}},
        getKey:     {get: function(){return getKey;}, set: function(_){getKey=_;}},
        getColor:   {get: function(){return getColor;}, set: function(_){getColor=_;}},
        noData:    {get: function(){return noData;}, set: function(_){noData=_;}},
        transitionDuration:{get: function(){return transitionDuration;}, set: function(_){transitionDuration=_;}},
        margin: {get: function(){return margin;}, set: function(_){
            margin.top    = _.top    !== undefined ? _.top    : margin.top;
            margin.right  = _.right  !== undefined ? _.right  : margin.right;
            margin.bottom = _.bottom !== undefined ? _.bottom : margin.bottom;
            margin.left   = _.left   !== undefined ? _.left   : margin.left;
        }},
        cellPaddding:{get: function(){return cellPaddding;}, set: function(_){cellPaddding=_;}},
        cellWidth:{get: function(){return cellWidth;}, set: function(_){cellWidth=_;}},
        cellHeight:{get: function(){return cellHeight;}, set: function(_){cellHeight=_;}},
        cellRound:{get: function(){return cellRound;}, set: function(_){cellRound=_;}},
        disabled:{get: function(){return disabled;}, set: function(_){disabled=_;}},
        disableColor:{get: function(){return disableColor;}, set: function(_){disableColor=_;}},
        showLabels:{get: function(){return showLabels;}, set: function(_){showLabels=_;}},
        colors:{get: function(){return colors;}, set: function(_){
            colors=_;
            color = d3.scale.quantize().range(colors);
        }}
    });
    //============================================================
    nv.utils.initOptions(chart);

    return chart;
};