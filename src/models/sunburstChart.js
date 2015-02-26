nv.models.sunburstChart = function() {
    "use strict";

    //============================================================
    // Public Variables with Default Settings
    //------------------------------------------------------------

    var sunburst = nv.models.sunburst();

    var margin = {top: 30, right: 20, bottom: 20, left: 20}
        , width = null
        , height = null
        , color = nv.utils.defaultColor()
        , tooltips = true
        , id = Math.round(Math.random() * 100000)
        , tooltipContent = function(evt) {
            return '<table>' +
                '<tbody><tr><td class="legend-color-guide">' +
                '<div style="background-color: ' + evt.color + '"></div></td>' +
                '<td class="key"> ' + evt.data.name + '</td>' +
                '<td class="value">' + (evt.data.size || '') + '</td>' +
                '</tr></tbody></table>';
        }
        , defaultState = null
        , noData = null
        , duration = 250
        , dispatch = d3.dispatch('tooltipShow', 'tooltipHide', 'stateChange', 'changeState','renderEnd')
        ;

    //============================================================
    // Private Variables
    //------------------------------------------------------------

    var tooltip = d3.select('body')
        .append('div')
        .style('display', 'none')
        .classed('nvtooltip', true)
        .classed('follow', true);

    var renderWatch = nv.utils.renderWatch(dispatch);

    //============================================================
    // Chart function
    //------------------------------------------------------------

    function chart(selection) {
        renderWatch.reset();
        renderWatch.models(sunburst);

        selection.each(function(data) {
            var container = d3.select(this);
            nv.utils.initSVG(container);

            var that = this;
            var availableWidth = nv.utils.availableWidth(width, container, margin),
                availableHeight = nv.utils.availableHeight(height, container, margin);

            chart.update = function() {
                if (duration === 0)
                    container.call(chart);
                else
                    container.transition().duration(duration).call(chart)
            };
            chart.container = this;

            // Display No Data message if there's nothing to show.
            if (!data || !data.length) {
                nv.utils.noData(chart, container);
                return chart;
            } else {
                container.selectAll('.nv-noData').remove();
            }

            // Setup containers and skeleton of chart
            var wrap = container.selectAll('g.nv-wrap.nv-sunburstChart').data(data);
            var gEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap nv-sunburstChart').append('g');
            var g = wrap.select('g');

            gEnter.append('g').attr('class', 'nv-sunburstWrap');

            wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

            // Main Chart Component(s)
            sunburst.width(availableWidth).height(availableHeight);
            var sunWrap = g.select('.nv-sunburstWrap').datum(data);
            d3.transition(sunWrap).call(sunburst);

            //============================================================
            // Event Handling/Dispatching (in chart's scope)
            //------------------------------------------------------------

            dispatch.on('tooltipShow', function(e) {
                if (tooltips) showTooltip(e, that.parentNode);
            });

            dispatch.on('tooltipHide', function() {
                if (tooltips) nv.tooltip.cleanup();
            });
        });

        renderWatch.renderEnd('sunburstChart immediate');
        return chart;
    }

    //============================================================
    // Event Handling/Dispatching (out of chart's scope)
    //------------------------------------------------------------

    sunburst.dispatch.on('elementMouseover.tooltip', function(evt) {
        tooltip.html(tooltipContent(evt))
            .style('display', 'inline-block');
    });

    sunburst.dispatch.on('elementMouseout.tooltip', function(evt) {
        tooltip.style('display', 'none');
    });

    sunburst.dispatch.on('elementMousemove.tooltip', function(evt) {
        tooltip.style('top', (event.pageY-15)+"px").style("left",(event.pageX+10)+"px");
    });

    //============================================================
    // Expose Public Variables
    //------------------------------------------------------------

    // expose chart's sub-components
    chart.dispatch = dispatch;
    chart.sunburst = sunburst;
    chart.options = nv.utils.optionsFunc.bind(chart);

    // use Object get/set functionality to map between vars and chart functions
    chart._options = Object.create({}, {
        // simple options, just get/set the necessary values
        noData:         {get: function(){return noData;},         set: function(_){noData=_;}},
        tooltipContent: {get: function(){return tooltipContent;},        set: function(_){tooltipContent=_;}},
        tooltips:       {get: function(){return tooltips;},       set: function(_){tooltips=_;}},
        defaultState:   {get: function(){return defaultState;},   set: function(_){defaultState=_;}},
        // options that require extra logic in the setter
        color: {get: function(){return color;}, set: function(_){
            color = _;
            sunburst.color(color);
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
    nv.utils.inheritOptions(chart, sunburst);
    nv.utils.initOptions(chart);
    return chart;
};
