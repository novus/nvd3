nv.models.pieChart = function() {
    "use strict";

    //============================================================
    // Public Variables with Default Settings
    //------------------------------------------------------------

    var pie = nv.models.pie();
    var legend = nv.models.legend();

    var margin = {top: 30, right: 20, bottom: 20, left: 20}
        , width = null
        , height = null
        , showLegend = true
        , legendPosition = "top"
        , color = nv.utils.defaultColor()
        , tooltips = true
        , tooltipContent = function(evt) {
            return '<table>' +
                '<tbody><tr><td class="legend-color-guide">' +
                '<div style="background-color: ' + evt.color + '"></div></td>' +
                '<td class="key"> ' + pie.x()(evt.data) + '</td>' +
                '<td class="value">' + pie.y()(evt.data) + '</td>' +
                '</tr></tbody></table>';
        }
        , state = nv.utils.state()
        , defaultState = null
        , noData = null
        , duration = 250
        , dispatch = d3.dispatch('tooltipShow', 'tooltipHide', 'stateChange', 'changeState','renderEnd')
        ;

    //============================================================
    // Private Variables
    //------------------------------------------------------------

    var renderWatch = nv.utils.renderWatch(dispatch);

    var tooltip = d3.select('body')
        .append('div')
        .style('display', 'none')
        .classed('nvtooltip', true)
        .classed('follow', true);

    var stateGetter = function(data) {
        return function(){
            return {
                active: data.map(function(d) { return !d.disabled })
            };
        }
    };

    var stateSetter = function(data) {
        return function(state) {
            if (state.active !== undefined) {
                data.forEach(function (series, i) {
                    series.disabled = !state.active[i];
                });
            }
        }
    };

    //============================================================
    // Chart function
    //------------------------------------------------------------

    function chart(selection) {
        renderWatch.reset();
        renderWatch.models(pie);

        selection.each(function(data) {
            var container = d3.select(this);
            nv.utils.initSVG(container);

            var that = this;
            var availableWidth = nv.utils.availableWidth(width, container, margin),
                availableHeight = nv.utils.availableHeight(height, container, margin);

            chart.update = function() { container.transition().call(chart); };
            chart.container = this;

            state.setter(stateSetter(data), chart.update)
                .getter(stateGetter(data))
                .update();

            //set state.disabled
            state.disabled = data.map(function(d) { return !!d.disabled });

            if (!defaultState) {
                var key;
                defaultState = {};
                for (key in state) {
                    if (state[key] instanceof Array)
                        defaultState[key] = state[key].slice(0);
                    else
                        defaultState[key] = state[key];
                }
            }

            // Display No Data message if there's nothing to show.
            if (!data || !data.length) {
                nv.utils.noData(chart, container);
                return chart;
            } else {
                container.selectAll('.nv-noData').remove();
            }

            // Setup containers and skeleton of chart
            var wrap = container.selectAll('g.nv-wrap.nv-pieChart').data([data]);
            var gEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap nv-pieChart').append('g');
            var g = wrap.select('g');

            gEnter.append('g').attr('class', 'nv-pieWrap');
            gEnter.append('g').attr('class', 'nv-legendWrap');

            // Legend
            if (showLegend) {
                if (legendPosition === "top") {
                    legend.width( availableWidth ).key(pie.x());

                    wrap.select('.nv-legendWrap')
                        .datum(data)
                        .call(legend);

                    if ( margin.top != legend.height()) {
                        margin.top = legend.height();
                        availableHeight = nv.utils.availableHeight(height, container, margin);
                    }

                    wrap.select('.nv-legendWrap')
                        .attr('transform', 'translate(0,' + (-margin.top) +')');
                } else if (legendPosition === "right") {
                    legend.height(availableHeight).width(availableWidth - availableHeight).key(pie.x());

                    wrap.select('.nv-legendWrap')
                        .datum(data)
                        .call(legend);

                    if ( margin.right != legend.width()) {
                        margin.right = legend.width();
                        availableWidth = nv.utils.availableWidth(width, container, margin);
                    }

                    wrap.select('.nv-legendWrap')
                        .attr('transform', 'translate(' + (margin.left + availableHeight) +',0)');
                }
            }
            wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

            // Main Chart Component(s)
            pie.width(availableWidth).height(availableHeight);
            var pieWrap = g.select('.nv-pieWrap').datum([data]);
            d3.transition(pieWrap).call(pie);

            //============================================================
            // Event Handling/Dispatching (in chart's scope)
            //------------------------------------------------------------

            legend.dispatch.on('stateChange', function(newState) {
                for (var key in newState) {
                    state[key] = newState[key];
                }
                dispatch.stateChange(state);
                chart.update();
            });

            // Update chart from a state object passed to event handler
            dispatch.on('changeState', function(e) {
                if (typeof e.disabled !== 'undefined') {
                    data.forEach(function(series,i) {
                        series.disabled = e.disabled[i];
                    });
                    state.disabled = e.disabled;
                }
                chart.update();
            });
        });

        renderWatch.renderEnd('pieChart immediate');
        return chart;
    }

    //============================================================
    // Event Handling/Dispatching (out of chart's scope)
    //------------------------------------------------------------

    pie.dispatch.on('elementMouseover.tooltip', function(evt) {
        tooltip.html(tooltipContent(evt))
            .style('display', 'inline-block');
    });

    pie.dispatch.on('elementMouseout.tooltip', function(evt) {
        tooltip.style('display', 'none');
    });

    pie.dispatch.on('elementMousemove.tooltip', function(evt) {
        tooltip.style('top', (event.pageY-15)+"px").style("left",(event.pageX+10)+"px");
    });

    pie.dispatch.on('elementClick.tooltip', function(evt) {
        tooltip.html(tooltipContent(evt))
            .style('display', 'inline-block');
    });

    //============================================================
    // Expose Public Variables
    //------------------------------------------------------------

    // expose chart's sub-components
    chart.legend = legend;
    chart.dispatch = dispatch;
    chart.pie = pie;
    chart.options = nv.utils.optionsFunc.bind(chart);

    // use Object get/set functionality to map between vars and chart functions
    chart._options = Object.create({}, {
        // simple options, just get/set the necessary values
        noData:         {get: function(){return noData;},         set: function(_){noData=_;}},
        tooltipContent: {get: function(){return tooltipContent;}, set: function(_){tooltipContent=_;}},
        tooltips:       {get: function(){return tooltips;},       set: function(_){tooltips=_;}},
        showLegend:     {get: function(){return showLegend;},     set: function(_){showLegend=_;}},
        legendPosition: {get: function(){return legendPosition;}, set: function(_){legendPosition=_;}},
        defaultState:   {get: function(){return defaultState;},   set: function(_){defaultState=_;}},
        // options that require extra logic in the setter
        color: {get: function(){return color;}, set: function(_){
            color = _;
            legend.color(color);
            pie.color(color);
        }},
        duration: {get: function(){return duration;}, set: function(_){
            duration = _;
            renderWatch.reset(duration);
        }},
        margin: {get: function(){return margin;}, set: function(_){
            margin.top    = _.top    !== undefined ? _.top    : margin.top;
            margin.right  = _.right  !== undefined ? _.right  : margin.right;
            margin.bottom = _.bottom !== undefined ? _.bottom : margin.bottom;
            margin.left   = _.left   !== undefined ? _.left   : margin.left;
        }}
    });
    nv.utils.inheritOptions(chart, pie);
    nv.utils.initOptions(chart);
    return chart;
};
