/**
 * private variables
 */
var LegendPrivates = {
    getKey : function(d) { return d.key }
    , align : true
    , rightAlign : true
    , updateState : true   //If true, legend will update data.disabled and trigger a 'stateChange' dispatch.
    , radioButtonMode : false   //If true, clicking legend items will cause it to behave like a radio button. (only one can be selected at a time)
};

/**
 * A Legend
 */
function Legend(options){
    options = nv.utils.extend({}, options, LegendPrivates, {
        margin : {top: 5, right: 0, bottom: 5, left: 0}
        , width: 400
        , height: 20
        , chartClass: 'legend'
        , wrapClass: 'legend'
    });

    Layer.call(this, options,
        ['legendClick', 'legendDblclick', 'legendMouseover', 'legendMouseout']
    );
}

nv.utils.create(Legend, Layer, LegendPrivates);

/**
 * override Layer::wrapper, removed transform/translate
 * @param data
 */
Legend.prototype.wrapper = function(data){

    var chartClass = 'nv-' + this.options.chartClass
        , wrapClass = 'nv-' + this.options.wrapClass;

    this.wrap = this.svg.selectAll('g.nv-wrap.' + wrapClass).data([data]);
    this.wrapEnter = this.wrap.enter().append('g').attr({class: 'nvd3 nv-wrap ' + chartClass });
    this.defsEnter = this.wrapEnter.append('defs');
    this.gEnter = this.wrapEnter.append('g');
    this.g = this.wrap.select('g');
};

/**
 * @override Layer::draw
 */
Legend.prototype.draw = function(data){

    var that = this
        , series = null
        , seriesEnter = null
        , seriesWidths = []
        , seriesPerRow = 0
        , legendWidth = 0
        , columnWidths = []
        , legendText = null
        , nodeTextLength
        , xPositions = []
        , i = 0
        , k = 0
        , curX = null
        , ypos = 5
        , newxpos = 5
        , maxwidth = 0
        , xpos = null;

    series = this.g.selectAll('.nv-series')
        .data(function(d) { return d });

    seriesEnter = series.enter().append('g').attr('class', 'nv-series')
        .on('mouseover', function(d,i) {
            that.dispatch.legendMouseover(d,i);  //TODO: Make consistent with other event objects
        })
        .on('mouseout', function(d,i) {
            that.dispatch.legendMouseout(d,i);
        })
        .on('click', function(d,i) {
            if (that.updateState()) {
                // Radio button mode: set every series to disabled,
                // and enable the clicked series.
                if (that.radioButtonMode()) {
                    data.forEach(function(series) { series.disabled = true });
                    d.disabled = false;
                }
                // If every single series is disabled, turn all series' back on.
                else {
                    d.disabled = !d.disabled;
                    if (data.every(function(series) { return series.disabled}))
                        data.forEach(function(series) { series.disabled = false});
                }
                that.dispatch.stateChange({
                    disabled: data.map(function(d) { return !!d.disabled })
                });
            }
            that.dispatch.legendClick(d,i);
        })
        .on('dblclick', function(d,i) {
            if (that.updateState()) {
                // When double clicking one, all other series' are set to false,
                // and make the double clicked series enabled.
                data.forEach(function(series) {
                    series.disabled = true;
                });
                d.disabled = false;
                that.dispatch.stateChange({
                    disabled: data.map(function(d) { return !!d.disabled })
                });
            }
            that.dispatch.legendDblclick(d,i);
        });

    seriesEnter.append('circle')
        .style('stroke-width', 2)
        .attr('class','nv-legend-symbol')
        .attr('r', 5);
    seriesEnter.append('text')
        .attr('text-anchor', 'start')
        .attr('class','nv-legend-text')
        .attr('dy', '.32em')
        .attr('dx', '8');
    series.classed('disabled', function(d) { return d.disabled });
    series.exit().remove();
    series.select('circle')
        .style('fill', function(d,i) { return d.color || that.color()(d,i)})
        .style('stroke', function(d,i) { return d.color || that.color()(d, i) });
    series.select('text').text(that.getKey());

    //TODO: implement fixed-width and max-width options (max-width is especially useful with the align option)

    // NEW ALIGNING CODE, TODO: clean up
    if (this.align()) {
        series.each(function(d,i) {
            legendText = d3.select(this).select('text');
            try {
                nodeTextLength = legendText.node().getComputedTextLength();
                // If the legendText is display:none'd (nodeTextLength == 0), simulate an error so we approximate, instead
                if(nodeTextLength <= 0) throw Error();
            }
            catch(e) {
                nodeTextLength = nv.utils.calcApproxTextWidth(legendText);
            }
            seriesWidths.push(nodeTextLength + 28); // 28 is ~ the width of the circle plus some padding
        });

        while ( legendWidth < this.available.width && seriesPerRow < seriesWidths.length) {
            columnWidths[seriesPerRow] = seriesWidths[seriesPerRow];
            legendWidth += seriesWidths[seriesPerRow++];
        }
        if (seriesPerRow === 0) seriesPerRow = 1; //minimum of one series per row

        while ( legendWidth > this.available.width && seriesPerRow > 1 ) {
            columnWidths = [];
            seriesPerRow--;
            for (k = 0; k < seriesWidths.length; k++) {
                if (seriesWidths[k] > (columnWidths[k % seriesPerRow] || 0) )
                    columnWidths[k % seriesPerRow] = seriesWidths[k];
            }
            legendWidth = columnWidths.reduce(function(prev, cur) { return prev + cur });
        }

        for (i = 0, curX = 0; i < seriesPerRow; i++) {
            xPositions[i] = curX;
            curX += columnWidths[i];
        }
        series
            .attr('transform', function(d, i) {
              return 'translate(' + xPositions[i % seriesPerRow] + ',' + (5 + Math.floor(i / seriesPerRow) * 20) + ')';
            });

        //position legend as far right as possible within the total width
        if (this.rightAlign())
            this.g.attr('transform', 'translate(' + (this.available.width - this.margin().right - legendWidth) + ',' + this.margin().top + ')');
        else
            this.g.attr('transform', 'translate(0' + ',' + this.margin().top + ')');

        this.height( this.margin().top + this.margin().bottom + (Math.ceil(seriesWidths.length / seriesPerRow) * 20) );

    } else {

        series
            .attr('transform', function(d, i) {
                var length = d3.select(this).select('text').node().getComputedTextLength() + 28;
                xpos = newxpos;

                if (that.width() < that.margin().left + that.margin().right + xpos + length) {
                    newxpos = xpos = 5;
                    ypos += 20;
                }

                newxpos += length;
                if (newxpos > maxwidth) maxwidth = newxpos;

                return 'translate(' + xpos + ',' + ypos + ')';
            });

        //position legend as far right as possible within the total width
        this.g.attr('transform',
            'translate(' + (this.width() - this.margin().right - maxwidth) + ',' + this.margin().top + ')'
        );

        this.height( this.margin().top + this.margin().bottom + ypos + 15 );
    }
};

Legend.prototype.key = function(_) {
    if (!arguments.length) return this.options.getKey;
    this.options.getKey = _;
    return this;
};

nv.models.legend = function () {
    "use strict";

    var legend = new Legend(),
        api = [
            'margin',
            'width',
            'height',
            'key',
            'color',
            'align',
            'rightAlign',
            'updateState',
            'radioButtonMode'
        ];

    function chart(selection) {
        legend.render(selection);
        return chart;
    }

    chart.dispatch = legend.dispatch;

    chart.options = nv.utils.optionsFunc.bind(chart);

    nv.utils.rebindp(chart, legend, Legend.prototype, api);

    return chart;
};
