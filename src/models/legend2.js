nv.models.legend2 = function () {
    "use strict";
    //============================================================
    // Public Variables with Default Settings
    //------------------------------------------------------------

    var margin = {top: 0, right: 0, bottom: 5, left: 0}
        , width = 400
        , height = 20
        , getKey = function (d) {
            return d.key
        }
        , color = nv.utils.defaultColor()
        , align = true
        , rightAlign = false
        , updateState = true   //If true, legend will update data.disabled and trigger a 'stateChange' dispatch.
        , radioButtonMode = false   //If true, clicking legend items will cause it to behave like a radio button. (only one can be selected at a time)
        , title = '' // If there is only one title for all the series
        , dispatch = d3.dispatch('legendClick', 'legendDblclick', 'legendMouseover', 'legendMouseout', 'stateChange')
        ;

    //============================================================


    function chart(selection) {
        selection.each(function (data) {
            var availableWidth = width - margin.left - margin.right,
                container = d3.select(this);


            //------------------------------------------------------------
            // Setup containers and skeleton of chart
            var colors = [];
            for (var i = 0; i < data.length; i++) {
                colors.push(data[i].color);
            }

            var arc = d3.svg.arc()
                .outerRadius(5)
                .innerRadius(0);

            var pie = d3.layout.pie()
                .sort(null)
                .value(function (d) {
                    return 1
                });

            var wrap = container.selectAll('g.nv-legend').data([data]);
            var gEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-legend').append('g');
            var g = wrap.select('g');

            wrap.attr('transform', 'translate(' + margin.left + ',0)');

            //------------------------------------------------------------
            wrap.append('rect');
            var pi = wrap.selectAll(".arc")
                .data(pie(data))
                .enter().append("g")
                .attr("class", "arc");

            pi.append("path")
                .attr("d", arc)
                .style("fill", function (d, i) {
                    return colors[i];
                })
                .style('stroke', 'white')
                .style('stroke-width', '0.3');
            wrap.append('text')
                .attr('text-anchor', 'start')
                .attr('class', 'nv-legend-text')
                .attr('dy', '.32em')
                .attr('dx', '8')
                .text(title);
            var LegendText = wrap.select('text').node();
            wrap.select('rect')
                .attr('transform', 'translate(-8,-10)')
                .style('fill', '#ECECEE')
                .attr('width', (LegendText.getComputedTextLength() + 28))
                .attr('height', '20')
                .attr('rx', '10')
                .attr('ry', '10');
        });

        return chart;
    }


    //============================================================
    // Expose Public Variables
    //------------------------------------------------------------

    chart.dispatch = dispatch;
    chart.options = nv.utils.optionsFunc.bind(chart);

    chart.margin = function (_) {
        if (!arguments.length) return margin;
        margin.top = typeof _.top != 'undefined' ? _.top : margin.top;
        margin.right = typeof _.right != 'undefined' ? _.right : margin.right;
        margin.bottom = typeof _.bottom != 'undefined' ? _.bottom : margin.bottom;
        margin.left = typeof _.left != 'undefined' ? _.left : margin.left;
        return chart;
    };

    chart.width = function (_) {
        if (!arguments.length) return width;
        width = _;
        return chart;
    };

    chart.height = function (_) {
        if (!arguments.length) return height;
        height = _;
        return chart;
    };

    chart.key = function (_) {
        if (!arguments.length) return getKey;
        getKey = _;
        return chart;
    };

    chart.color = function (_) {
        if (!arguments.length) return color;
        color = nv.utils.getColor(_);
        return chart;
    };

    chart.align = function (_) {
        if (!arguments.length) return align;
        align = _;
        return chart;
    };

    chart.rightAlign = function (_) {
        if (!arguments.length) return rightAlign;
        rightAlign = _;
        return chart;
    };

    chart.updateState = function (_) {
        if (!arguments.length) return updateState;
        updateState = _;
        return chart;
    };

    chart.radioButtonMode = function (_) {
        if (!arguments.length) return radioButtonMode;
        radioButtonMode = _;
        return chart;
    };
    chart.title = function (_) {
        if (!arguments.length) return title;
        title = _;
        return chart;
    }

    //============================================================


    return chart;
}
