
// Code adapted from Jason Davies' "Parallel Coordinates"
// http://bl.ocks.org/jasondavies/1341281

nv.models.parallelCoordinates = function() {
    "use strict";

    //============================================================
    // Public Variables with Default Settings
    //------------------------------------------------------------

    var margin = {top: 30, right: 10, bottom: 10, left: 10}
        , width = null
        , height = null
        , x = d3.scale.ordinal()
        , y = {}
        , dimensions = []
        , color = nv.utils.defaultColor()
        , filters = []
        , active = []
        , dispatch = d3.dispatch('brush')
        ;

    //============================================================
    // Private Variables
    //------------------------------------------------------------

    function chart(selection) {
        selection.each(function(data) {
            var container = d3.select(this);
            var availableWidth = (width  || parseInt(container.style('width')) || 960)
                - margin.left - margin.right;
            var availableHeight = (height || parseInt(container.style('height')) || 400)
                - margin.top - margin.bottom;

            nv.utils.initSVG(container);

            active = data; //set all active before first brush call

            //This is a placeholder until this chart is made resizeable
            chart.update = function() { };

            // Setup Scales
            x.rangePoints([0, availableWidth], 1).domain(dimensions);

            // Extract the list of dimensions and create a scale for each.
            dimensions.forEach(function(d) {
                y[d] = d3.scale.linear()
                    .domain(d3.extent(data, function(p) { return +p[d]; }))
                    .range([availableHeight, 0]);

                y[d].brush = d3.svg.brush().y(y[d]).on('brush', brush);

                return d != 'name';
            });

            // Setup containers and skeleton of chart
            var wrap = container.selectAll('g.nv-wrap.nv-parallelCoordinates').data([data]);
            var wrapEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap nv-parallelCoordinates');
            var gEnter = wrapEnter.append('g');
            var g = wrap.select('g');

            gEnter.append('g').attr('class', 'nv-parallelCoordinatesWrap');
            wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

            var line = d3.svg.line(),
                axis = d3.svg.axis().orient('left'),
                background,
                foreground;

            // Add grey background lines for context.
            background = gEnter.append('g')
                .attr('class', 'background')
                .selectAll('path')
                .data(data)
                .enter().append('path')
                .attr('d', path)
            ;

            // Add blue foreground lines for focus.
            foreground = gEnter.append('g')
                .attr('class', 'foreground')
                .selectAll('path')
                .data(data)
                .enter().append('path')
                .attr('d', path)
                .attr('stroke', color)
            ;

            // Add a group element for each dimension.
            var dimension = g.selectAll('.dimension')
                .data(dimensions)
                .enter().append('g')
                .attr('class', 'dimension')
                .attr('transform', function(d) { return 'translate(' + x(d) + ',0)'; });

            // Add an axis and title.
            dimension.append('g')
                .attr('class', 'axis')
                .each(function(d) { d3.select(this).call(axis.scale(y[d])); })
                .append('text')
                .attr('text-anchor', 'middle')
                .attr('y', -9)
                .text(String);

            // Add and store a brush for each axis.
            dimension.append('g')
                .attr('class', 'brush')
                .each(function(d) { d3.select(this).call(y[d].brush); })
                .selectAll('rect')
                .attr('x', -8)
                .attr('width', 16);

            // Returns the path for a given data point.
            function path(d) {
                return line(dimensions.map(function(p) { return [x(p), y[p](d[p])]; }));
            }

            // Handles a brush event, toggling the display of foreground lines.
            function brush() {
                var actives = dimensions.filter(function(p) { return !y[p].brush.empty(); }),
                    extents = actives.map(function(p) { return y[p].brush.extent(); });

                filters = []; //erase current filters
                actives.forEach(function(d,i) {
                    filters[i] = {
                        dimension: d,
                        extent: extents[i]
                    }
                });

                active = []; //erase current active list
                foreground.style('display', function(d) {
                    var isActive = actives.every(function(p, i) {
                        return extents[i][0] <= d[p] && d[p] <= extents[i][1];
                    });
                    if (isActive) active.push(d);
                    return isActive ? null : 'none';
                });

                dispatch.brush({
                    filters: filters,
                    active: active
                });
            }
        });

        return chart;
    }

    //============================================================
    // Expose Public Variables
    //------------------------------------------------------------

    chart.dispatch = dispatch;
    chart.options = nv.utils.optionsFunc.bind(chart);

    chart._options = Object.create({}, {
        // simple options, just get/set the necessary values
        width:      {get: function(){return width;}, set: function(_){width=_;}},
        height:     {get: function(){return height;}, set: function(_){height=_;}},
        dimensions: {get: function(){return dimensions;}, set: function(_){dimensions=_;}},

        // options that require extra logic in the setter
        margin: {get: function(){return margin;}, set: function(_){
            margin.top    = typeof _.top    != 'undefined' ? _.top    : margin.top;
            margin.right  = typeof _.right  != 'undefined' ? _.right  : margin.right;
            margin.bottom = typeof _.bottom != 'undefined' ? _.bottom : margin.bottom;
            margin.left   = typeof _.left   != 'undefined' ? _.left   : margin.left;
        }},
        color:  {get: function(){return color;}, set: function(_){
            color = nv.utils.getColor(_);
        }}
    });

    nv.utils.initOptions(chart);
    return chart;
};
