nv.models.boxPlot = function() {
    "use strict";

    //============================================================
    // Public Variables with Default Settings
    //------------------------------------------------------------

    var margin = {top: 0, right: 0, bottom: 0, left: 0}
        , width = 960
        , height = 500
        , id = Math.floor(Math.random() * 10000) //Create semi-unique ID in case user doesn't select one
        , x = d3.scale.ordinal()
        , y = d3.scale.linear()
        , getX = function(d) { return d.x }
        , getY = function(d) { return d.y }
        , color = nv.utils.defaultColor()
        , container = null
        , xDomain
        , yDomain
        , xRange
        , yRange
        , dispatch = d3.dispatch('elementMouseover', 'elementMouseout', 'elementMousemove', 'renderEnd')
        , duration = 250
        , maxBoxWidth = null
        ;

    //============================================================
    // Private Variables
    //------------------------------------------------------------

    var x0, y0;
    var renderWatch = nv.utils.renderWatch(dispatch, duration);

    function chart(selection) {
        renderWatch.reset();
        selection.each(function(data) {
            var availableWidth = width - margin.left - margin.right,
                availableHeight = height - margin.top - margin.bottom;

            container = d3.select(this);
            nv.utils.initSVG(container);

            // Setup Scales
            x   .domain(xDomain || data.map(function(d,i) { return getX(d,i); }))
                .rangeBands(xRange || [0, availableWidth], .1);

            // if we know yDomain, no need to calculate
            var yData = []
            if (!yDomain) {
                // (y-range is based on quartiles, whiskers and outliers)

                // lower values
                var yMin = d3.min(data.map(function(d) {
                    var min_arr = [];

                    min_arr.push(d.values.Q1);
                    if (d.values.hasOwnProperty('whisker_low') && d.values.whisker_low !== null) { min_arr.push(d.values.whisker_low); }
                    if (d.values.hasOwnProperty('outliers') && d.values.outliers !== null) { min_arr = min_arr.concat(d.values.outliers); }

                    return d3.min(min_arr);
                }));

                // upper values
                var yMax = d3.max(data.map(function(d) {
                    var max_arr = [];

                    max_arr.push(d.values.Q3);
                    if (d.values.hasOwnProperty('whisker_high') && d.values.whisker_high !== null) { max_arr.push(d.values.whisker_high); }
                    if (d.values.hasOwnProperty('outliers') && d.values.outliers !== null) { max_arr = max_arr.concat(d.values.outliers); }

                    return d3.max(max_arr);
                }));

                yData = [ yMin, yMax ] ;
            }

            y.domain(yDomain || yData);
            y.range(yRange || [availableHeight, 0]);

            //store old scales if they exist
            x0 = x0 || x;
            y0 = y0 || y.copy().range([y(0),y(0)]);

            // Setup containers and skeleton of chart
            var wrap = container.selectAll('g.nv-wrap').data([data]);
            var wrapEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap');
            wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

            var boxplots = wrap.selectAll('.nv-boxplot').data(function(d) { return d });
            var boxEnter = boxplots.enter().append('g').style('stroke-opacity', 1e-6).style('fill-opacity', 1e-6);
            boxplots
                .attr('class', 'nv-boxplot')
                .attr('transform', function(d,i,j) { return 'translate(' + (x(getX(d,i)) + x.rangeBand() * .05) + ', 0)'; })
                .classed('hover', function(d) { return d.hover });
            boxplots
                .watchTransition(renderWatch, 'nv-boxplot: boxplots')
                .style('stroke-opacity', 1)
                .style('fill-opacity', .75)
                .delay(function(d,i) { return i * duration / data.length })
                .attr('transform', function(d,i) {
                    return 'translate(' + (x(getX(d,i)) + x.rangeBand() * .05) + ', 0)';
                });
            boxplots.exit().remove();

            // ----- add the SVG elements for each boxPlot -----

            // conditionally append whisker lines
            boxEnter.each(function(d,i) {
              var box = d3.select(this);

              ['low', 'high'].forEach(function(key) {
                if (d.values.hasOwnProperty('whisker_' + key) && d.values['whisker_' + key] !== null) {
                  box.append('line')
                    .style('stroke', (d.color) ? d.color : color(d,i))
                    .attr('class', 'nv-boxplot-whisker nv-boxplot-' + key);

                  box.append('line')
                    .style('stroke', (d.color) ? d.color : color(d,i))
                    .attr('class', 'nv-boxplot-tick nv-boxplot-' + key);
                }
              });
            });

            // outliers
            // TODO: support custom colors here
            var outliers = boxplots.selectAll('.nv-boxplot-outlier').data(function(d) {
                if (d.values.hasOwnProperty('outliers') && d.values.outliers !== null) { return d.values.outliers; }
                else { return []; }
            });
            outliers.enter().append('circle')
                .style('fill', function(d,i,j) { return color(d,j) }).style('stroke', function(d,i,j) { return color(d,j) })
                .on('mouseover', function(d,i,j) {
                    d3.select(this).classed('hover', true);
                    dispatch.elementMouseover({
                        series: { key: d, color: color(d,j) },
                        e: d3.event
                    });
                })
                .on('mouseout', function(d,i,j) {
                    d3.select(this).classed('hover', false);
                    dispatch.elementMouseout({
                        series: { key: d, color: color(d,j) },
                        e: d3.event
                    });
                })
                .on('mousemove', function(d,i) {
                    dispatch.elementMousemove({e: d3.event});
                });

            outliers.attr('class', 'nv-boxplot-outlier');
            outliers
              .watchTransition(renderWatch, 'nv-boxplot: nv-boxplot-outlier')
                .attr('cx', x.rangeBand() * .45)
                .attr('cy', function(d,i,j) { return y(d); })
                .attr('r', '3');
            outliers.exit().remove();

            var box_width = function() { return (maxBoxWidth === null ? x.rangeBand() * .9 : Math.min(75, x.rangeBand() * .9)); };
            var box_left  = function() { return x.rangeBand() * .45 - box_width()/2; };
            var box_right = function() { return x.rangeBand() * .45 + box_width()/2; };

            // update whisker lines and ticks
            ['low', 'high'].forEach(function(key) {
              var endpoint = (key === 'low') ? 'Q1' : 'Q3';

              boxplots.select('line.nv-boxplot-whisker.nv-boxplot-' + key)
                .watchTransition(renderWatch, 'nv-boxplot: boxplots')
                  .attr('x1', x.rangeBand() * .45 )
                  .attr('y1', function(d,i) { return y(d.values['whisker_' + key]); })
                  .attr('x2', x.rangeBand() * .45 )
                  .attr('y2', function(d,i) { return y(d.values[endpoint]); });

              boxplots.select('line.nv-boxplot-tick.nv-boxplot-' + key)
                .watchTransition(renderWatch, 'nv-boxplot: boxplots')
                  .attr('x1', box_left )
                  .attr('y1', function(d,i) { return y(d.values['whisker_' + key]); })
                  .attr('x2', box_right )
                  .attr('y2', function(d,i) { return y(d.values['whisker_' + key]); });
            });

            ['low', 'high'].forEach(function(key) {
              boxEnter.selectAll('.nv-boxplot-' + key)
                .on('mouseover', function(d,i,j) {
                    d3.select(this).classed('hover', true);
                    dispatch.elementMouseover({
                        series: { key: d.values['whisker_' + key], color: color(d,j) },
                        e: d3.event
                    });
                })
                .on('mouseout', function(d,i,j) {
                    d3.select(this).classed('hover', false);
                    dispatch.elementMouseout({
                        series: { key: d.values['whisker_' + key], color: color(d,j) },
                        e: d3.event
                    });
                })
                .on('mousemove', function(d,i) {
                    dispatch.elementMousemove({e: d3.event});
                });
            });

            // boxes
            boxEnter.append('rect')
                .attr('class', 'nv-boxplot-box')
                // tooltip events
                .on('mouseover', function(d,i) {
                    d3.select(this).classed('hover', true);
                    dispatch.elementMouseover({
                        key: d.label,
                        value: d.label,
                        series: [
                            { key: 'Q3', value: d.values.Q3, color: d.color || color(d,i) },
                            { key: 'Q2', value: d.values.Q2, color: d.color || color(d,i) },
                            { key: 'Q1', value: d.values.Q1, color: d.color || color(d,i) }
                        ],
                        data: d,
                        index: i,
                        e: d3.event
                    });
                })
                .on('mouseout', function(d,i) {
                    d3.select(this).classed('hover', false);
                    dispatch.elementMouseout({
                        key: d.label,
                        value: d.label,
                        series: [
                            { key: 'Q3', value: d.values.Q3, color: d.color || color(d,i) },
                            { key: 'Q2', value: d.values.Q2, color: d.color || color(d,i) },
                            { key: 'Q1', value: d.values.Q1, color: d.color || color(d,i) }
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
            boxplots.select('rect.nv-boxplot-box')
              .watchTransition(renderWatch, 'nv-boxplot: boxes')
                .attr('y', function(d,i) { return y(d.values.Q3); })
                .attr('width', box_width)
                .attr('x', box_left )

                .attr('height', function(d,i) { return Math.abs(y(d.values.Q3) - y(d.values.Q1)) || 1 })
                .style('fill', function(d,i) { return d.color || color(d,i) })
                .style('stroke', function(d,i) { return d.color || color(d,i) });

            // median line
            boxEnter.append('line').attr('class', 'nv-boxplot-median');

            boxplots.select('line.nv-boxplot-median')
              .watchTransition(renderWatch, 'nv-boxplot: boxplots line')
                .attr('x1', box_left)
                .attr('y1', function(d,i) { return y(d.values.Q2); })
                .attr('x2', box_right)
                .attr('y2', function(d,i) { return y(d.values.Q2); });

            //store old scales for use in transitions on update
            x0 = x.copy();
            y0 = y.copy();
        });

        renderWatch.renderEnd('nv-boxplot immediate');
        return chart;
    }

    //============================================================
    // Expose Public Variables
    //------------------------------------------------------------

    chart.dispatch = dispatch;
    chart.options = nv.utils.optionsFunc.bind(chart);

    chart._options = Object.create({}, {
        // simple options, just get/set the necessary values
        width:   {get: function(){return width;}, set: function(_){width=_;}},
        height:  {get: function(){return height;}, set: function(_){height=_;}},
        maxBoxWidth: {get: function(){return maxBoxWidth;}, set: function(_){maxBoxWidth=_;}},
        x:       {get: function(){return getX;}, set: function(_){getX=_;}},
        y:       {get: function(){return getY;}, set: function(_){getY=_;}},
        xScale:  {get: function(){return x;}, set: function(_){x=_;}},
        yScale:  {get: function(){return y;}, set: function(_){y=_;}},
        xDomain: {get: function(){return xDomain;}, set: function(_){xDomain=_;}},
        yDomain: {get: function(){return yDomain;}, set: function(_){yDomain=_;}},
        xRange:  {get: function(){return xRange;}, set: function(_){xRange=_;}},
        yRange:  {get: function(){return yRange;}, set: function(_){yRange=_;}},
        id:          {get: function(){return id;}, set: function(_){id=_;}},
        // rectClass: {get: function(){return rectClass;}, set: function(_){rectClass=_;}},

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
