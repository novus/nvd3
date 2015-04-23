// Code adapted from Jason Davies' "Parallel Coordinates"
// http://bl.ocks.org/jasondavies/1341281
nv.models.parallelCoordinates = function() {
    "use strict";

    //============================================================
    // Public Variables with Default Settings
    //------------------------------------------------------------

    var margin = {top: 30, right: 0, bottom: 10, left: 0}
        , width = null
        , height = null
        , x = d3.scale.ordinal()
        , y = {}
        , dimensionNames = []
        , dimensionFormats = []
        , color = nv.utils.defaultColor()
        , filters = []
        , active = []
        , dragging = []
        , lineTension = 1
        , dispatch = d3.dispatch('brush', 'elementMouseover', 'elementMouseout')
        ;

    //============================================================
    // Private Variables
    //------------------------------------------------------------

    function chart(selection) {
        selection.each(function(data) {
            var container = d3.select(this);
            var availableWidth = nv.utils.availableWidth(width, container, margin),
                availableHeight = nv.utils.availableHeight(height, container, margin);

            nv.utils.initSVG(container);

            active = data; //set all active before first brush call

            // Setup Scales
            x.rangePoints([0, availableWidth], 1).domain(dimensionNames);

            //Set as true if all values on an axis are missing.
            var onlyNanValues = {};
            // Extract the list of dimensions and create a scale for each.
            dimensionNames.forEach(function(d) {
                var extent = d3.extent(data, function(p) { return +p[d]; });
                onlyNanValues[d] = false;
                //If there is no values to display on an axis, set the extent to 0
                if (extent[0] === undefined) {
                    onlyNanValues[d] = true;
                    extent[0] = 0;
                    extent[1] = 0;
                }
                //Scale axis if there is only one value
                if (extent[0] === extent[1]) {
                    extent[0] = extent[0] - 1;
                    extent[1] = extent[1] + 1;
                }
                //Use 90% of (availableHeight - 12) for the axis range, 12 reprensenting the space necessary to display "undefined values" text.
                //The remaining 10% are used to display the missingValue line.
                y[d] = d3.scale.linear()
                    .domain(extent)
                    .range([(availableHeight - 12) * 0.9, 0]);

                y[d].brush = d3.svg.brush().y(y[d]).on('brush', brush);

                return d != 'name';
            });

            // Setup containers and skeleton of chart
            var wrap = container.selectAll('g.nv-wrap.nv-parallelCoordinates').data([data]);
            var wrapEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap nv-parallelCoordinates');
            var gEnter = wrapEnter.append('g');
            var g = wrap.select('g');

            gEnter.append('g').attr('class', 'nv-parallelCoordinates background');
            gEnter.append('g').attr('class', 'nv-parallelCoordinates foreground');
            gEnter.append('g').attr('class', 'nv-parallelCoordinates missingValuesline');

            wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

            var line = d3.svg.line().interpolate('cardinal').tension(lineTension),
                axis = d3.svg.axis().orient('left'),
                axisDrag = d3.behavior.drag()
                        .on('dragstart', dragStart)
                        .on('drag', dragMove)
                        .on('dragend', dragEnd);

            //Add missing value line at the bottom of the chart
            var missingValuesline, missingValueslineText;
            var step = x.range()[1] - x.range()[0];
            var axisWithMissingValues = [];
            var lineData = [0 + step / 2, availableHeight - 12, availableWidth - step / 2, availableHeight - 12];
            missingValuesline = wrap.select('.missingValuesline').selectAll('line').data([lineData]);
            missingValuesline.enter().append('line');
            missingValuesline.exit().remove();
            missingValuesline.attr("x1", function(d) { return d[0]; })
                    .attr("y1", function(d) { return d[1]; })
                    .attr("x2", function(d) { return d[2]; })
                    .attr("y2", function(d) { return d[3]; });

            //Add the text "undefined values" under the missing value line
            missingValueslineText = wrap.select('.missingValuesline').selectAll('text').data(["undefined values"]);
            missingValueslineText.append('text').data(["undefined values"]);
            missingValueslineText.enter().append('text');
            missingValueslineText.exit().remove();
            missingValueslineText.attr("y", availableHeight)
                    //To have the text right align with the missingValues line, substract 92 representing the text size.
                    .attr("x", availableWidth - 92 - step / 2)
                    .text(function(d) { return d; });

            // Add grey background lines for context.
            var background = wrap.select('.background').selectAll('path').data(data);
            background.enter().append('path');
            background.exit().remove();
            background.attr('d', path);

            // Add blue foreground lines for focus.
            var foreground = wrap.select('.foreground').selectAll('path').data(data);
            foreground.enter().append('path')
            foreground.exit().remove();
            foreground.attr('d', path).attr('stroke', color);
            foreground.on("mouseover", function (d, i) {
                d3.select(this).classed('hover', true);
                dispatch.elementMouseover({
                    label: d.name,
                    data: d.data,
                    index: i,
                    pos: [d3.mouse(this.parentNode)[0], d3.mouse(this.parentNode)[1]]
                });

            });
            foreground.on("mouseout", function (d, i) {
                d3.select(this).classed('hover', false);
                dispatch.elementMouseout({
                    label: d.name,
                    data: d.data,
                    index: i
                });
            });

            // Add a group element for each dimension.
            var dimensions = g.selectAll('.dimension').data(dimensionNames);
            var dimensionsEnter = dimensions.enter().append('g').attr('class', 'nv-parallelCoordinates dimension');
            dimensionsEnter.append('g').attr('class', 'nv-parallelCoordinates nv-axis');
            dimensionsEnter.append('g').attr('class', 'nv-parallelCoordinates-brush');
            dimensionsEnter.append('text').attr('class', 'nv-parallelCoordinates nv-label');

            dimensions.attr('transform', function(d) { return 'translate(' + x(d) + ',0)'; });
            dimensions.exit().remove();

            // Add an axis and title.
            dimensions.select('.nv-label')
                .style("cursor", "move")
                .attr('dy', '-1em')
                .attr('text-anchor', 'middle')
                .text(String)
                .on("mouseover", function(d, i) {
                    dispatch.elementMouseover({
                        dim: d,
                        pos: [d3.mouse(this.parentNode.parentNode)[0], d3.mouse(this.parentNode.parentNode)[1]]
                    });
                })
                .on("mouseout", function(d, i) {
                    dispatch.elementMouseout({
                        dim: d
                    });
                })
                .call(axisDrag);

            dimensions.select('.nv-axis')
                .each(function (d, i) {
                    d3.select(this).call(axis.scale(y[d]).tickFormat(d3.format(dimensionFormats[i])));
                });

                dimensions.select('.nv-parallelCoordinates-brush')
                .each(function (d) {
                    d3.select(this).call(y[d].brush);
                })
                .selectAll('rect')
                .attr('x', -8)
                .attr('width', 16);

            // Returns the path for a given data point.
            function path(d) {
                return line(dimensionNames.map(function (p) {
                    //If value if missing, put the value on the missing value line
                    if(isNaN(d[p]) || isNaN(parseFloat(d[p]))) {
                        var domain = y[p].domain();
                        var range = y[p].range();
                        var min = domain[0] - (domain[1] - domain[0]) / 9;

                        //If it's not already the case, allow brush to select undefined values
                        if(axisWithMissingValues.indexOf(p) < 0) {

                            var newscale = d3.scale.linear().domain([min, domain[1]]).range([availableHeight - 12, range[1]]);
                            y[p].brush.y(newscale);
                            axisWithMissingValues.push(p);
                        }

                        return [x(p), y[p](min)];
                    }

                    //If parallelCoordinate contain missing values show the missing values line otherwise, hide it.
                    if(axisWithMissingValues.length > 0) {
                        missingValuesline.style("display", "inline");
                        missingValueslineText.style("display", "inline");
                    } else {
                        missingValuesline.style("display", "none");
                        missingValueslineText.style("display", "none");
                    }

                     return [x(p), y[p](d[p])];
                }));
            }

            // Handles a brush event, toggling the display of foreground lines.
            function brush() {
                var actives = dimensionNames.filter(function(p) { return !y[p].brush.empty(); }),
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
                        if(isNaN(d[p]) && extents[i][0] == y[p].brush.y().domain()[0]) return true;
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

            function dragStart(d, i) {
                dragging[d] = this.parentNode.__origin__ = x(d);
                background.attr("visibility", "hidden");

            }

            function dragMove(d, i) {
                dragging[d] = Math.min(availableWidth, Math.max(0, this.parentNode.__origin__ += d3.event.x));
                foreground.attr("d", path);
                dimensionNames.sort(function (a, b) { return position(a) - position(b); });
                x.domain(dimensionNames);
                dimensions.attr("transform", function(d) { return "translate(" + position(d) + ")"; });
            }

            function dragEnd(d, i) {
                delete this.parentNode.__origin__;
                delete dragging[d];
                d3.select(this.parentNode).attr("transform", "translate(" + x(d) + ")");
                foreground
                  .attr("d", path);
                background
                  .attr("d", path)
                  .attr("visibility", null);

            }

            function position(d) {
                var v = dragging[d];
                return v == null ? x(d) : v;
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
        width:         {get: function(){return width;},           set: function(_){width= _;}},
        height:        {get: function(){return height;},          set: function(_){height= _;}},
        dimensionNames: {get: function() { return dimensionNames;}, set: function(_){dimensionNames= _;}},
        dimensionFormats : {get: function(){return dimensionFormats;}, set: function (_){dimensionFormats=_;}},
        lineTension:   {get: function(){return lineTension;},     set: function(_){lineTension = _;}},

        // deprecated options
        dimensions: {get: function (){return dimensionNames;}, set: function(_){
            // deprecated after 1.8.1
            nv.deprecated('dimensions', 'use dimensionNames instead');
            dimensionNames = _;
        }},

        // options that require extra logic in the setter
        margin: {get: function(){return margin;}, set: function(_){
            margin.top    =  _.top    !== undefined ? _.top    : margin.top;
            margin.right  =  _.right  !== undefined ? _.right  : margin.right;
            margin.bottom =  _.bottom !== undefined ? _.bottom : margin.bottom;
            margin.left   =  _.left   !== undefined ? _.left   : margin.left;
        }},
        color:  {get: function(){return color;}, set: function(_){
            color = nv.utils.getColor(_);
        }}
    });

    nv.utils.initOptions(chart);
    return chart;
};
