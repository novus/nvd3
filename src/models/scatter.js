
nv.models.scatter = function() {
    "use strict";

    //============================================================
    // Public Variables with Default Settings
    //------------------------------------------------------------

    var margin       = {top: 0, right: 0, bottom: 0, left: 0}
        , width        = null
        , height       = null
        , color        = nv.utils.defaultColor() // chooses color
        , id           = Math.floor(Math.random() * 100000) //Create semi-unique ID incase user doesn't select one
        , container    = null
        , x            = d3.scale.linear()
        , y            = d3.scale.linear()
        , z            = d3.scale.linear() //linear because d3.svg.shape.size is treated as area
        , getX         = function(d) { return d.x } // accessor to get the x value
        , getY         = function(d) { return d.y } // accessor to get the y value
        , getSize      = function(d) { return d.size || 1} // accessor to get the point size
        , getShape     = function(d) { return d.shape || 'circle' } // accessor to get point shape
        , forceX       = [] // List of numbers to Force into the X scale (ie. 0, or a max / min, etc.)
        , forceY       = [] // List of numbers to Force into the Y scale
        , forceSize    = [] // List of numbers to Force into the Size scale
        , interactive  = true // If true, plots a voronoi overlay for advanced point intersection
        , pointActive  = function(d) { return !d.notActive } // any points that return false will be filtered out
        , padData      = false // If true, adds half a data points width to front and back, for lining up a line chart with a bar chart
        , padDataOuter = .1 //outerPadding to imitate ordinal scale outer padding
        , clipEdge     = false // if true, masks points within x and y scale
        , clipVoronoi  = true // if true, masks each point with a circle... can turn off to slightly increase performance
        , showVoronoi  = false // display the voronoi areas
        , clipRadius   = function() { return 25 } // function to get the radius for voronoi point clips
        , xDomain      = null // Override x domain (skips the calculation from data)
        , yDomain      = null // Override y domain
        , xRange       = null // Override x range
        , yRange       = null // Override y range
        , sizeDomain   = null // Override point size domain
        , sizeRange    = null
        , singlePoint  = false
        , dispatch     = d3.dispatch('elementClick', 'elementDblClick', 'elementMouseover', 'elementMouseout', 'renderEnd')
        , useVoronoi   = true
        , duration     = 250
        , interactiveUpdateDelay = 300
        , showLabels    = false 
        ;


    //============================================================
    // Private Variables
    //------------------------------------------------------------

    var x0, y0, z0 // used to store previous scales
        , timeoutID
        , needsUpdate = false // Flag for when the points are visually updating, but the interactive layer is behind, to disable tooltips
        , renderWatch = nv.utils.renderWatch(dispatch, duration)
        , _sizeRange_def = [16, 256]
        , _caches
        ;

    function getCache(d) {
        var cache, i;
        cache = _caches = _caches || {};
        i = d[0].series;
        cache = cache[i] = cache[i] || {};
        i = d[1];
        cache = cache[i] = cache[i] || {};
        return cache;
    }

    function getDiffs(d) {
        var i, key,
            point = d[0],
            cache = getCache(d),
            diffs = false;
        for (i = 1; i < arguments.length; i ++) {
            key = arguments[i];
            if (cache[key] !== point[key] || !cache.hasOwnProperty(key)) {
                cache[key] = point[key];
                diffs = true;
            }
        }
        return diffs;
    }

    function chart(selection) {
        renderWatch.reset();
        selection.each(function(data) {
            container = d3.select(this);
            var availableWidth = nv.utils.availableWidth(width, container, margin),
                availableHeight = nv.utils.availableHeight(height, container, margin);

            nv.utils.initSVG(container);

            //add series index to each data point for reference
            data.forEach(function(series, i) {
                series.values.forEach(function(point) {
                    point.series = i;
                });
            });

            // Setup Scales
            var logScale = chart.yScale().name === d3.scale.log().name ? true : false; 
            // remap and flatten the data for use in calculating the scales' domains
            var seriesData = (xDomain && yDomain && sizeDomain) ? [] : // if we know xDomain and yDomain and sizeDomain, no need to calculate.... if Size is constant remember to set sizeDomain to speed up performance
                d3.merge(
                    data.map(function(d) {
                        return d.values.map(function(d,i) {
                            return { x: getX(d,i), y: getY(d,i), size: getSize(d,i) }
                        })
                    })
                );

            x   .domain(xDomain || d3.extent(seriesData.map(function(d) { return d.x; }).concat(forceX)))

            if (padData && data[0])
                x.range(xRange || [(availableWidth * padDataOuter +  availableWidth) / (2 *data[0].values.length), availableWidth - availableWidth * (1 + padDataOuter) / (2 * data[0].values.length)  ]);
            //x.range([availableWidth * .5 / data[0].values.length, availableWidth * (data[0].values.length - .5)  / data[0].values.length ]);
            else
                x.range(xRange || [0, availableWidth]);

             if (logScale) {
                    var min = d3.min(seriesData.map(function(d) { if (d.y !== 0) return d.y; }));
                    y.clamp(true)
                        .domain(yDomain || d3.extent(seriesData.map(function(d) {
                            if (d.y !== 0) return d.y;
                            else return min * 0.1;
                        }).concat(forceY)))
                        .range(yRange || [availableHeight, 0]);
                } else {
                        y.domain(yDomain || d3.extent(seriesData.map(function (d) { return d.y;}).concat(forceY)))
                        .range(yRange || [availableHeight, 0]);
                }

            z   .domain(sizeDomain || d3.extent(seriesData.map(function(d) { return d.size }).concat(forceSize)))
                .range(sizeRange || _sizeRange_def);

            // If scale's domain don't have a range, slightly adjust to make one... so a chart can show a single data point
            singlePoint = x.domain()[0] === x.domain()[1] || y.domain()[0] === y.domain()[1];

            if (x.domain()[0] === x.domain()[1])
                x.domain()[0] ?
                    x.domain([x.domain()[0] - x.domain()[0] * 0.01, x.domain()[1] + x.domain()[1] * 0.01])
                    : x.domain([-1,1]);

            if (y.domain()[0] === y.domain()[1])
                y.domain()[0] ?
                    y.domain([y.domain()[0] - y.domain()[0] * 0.01, y.domain()[1] + y.domain()[1] * 0.01])
                    : y.domain([-1,1]);

            if ( isNaN(x.domain()[0])) {
                x.domain([-1,1]);
            }

            if ( isNaN(y.domain()[0])) {
                y.domain([-1,1]);
            }

            x0 = x0 || x;
            y0 = y0 || y;
            z0 = z0 || z;

            var scaleDiff = x(1) !== x0(1) || y(1) !== y0(1) || z(1) !== z0(1);

            // Setup containers and skeleton of chart
            var wrap = container.selectAll('g.nv-wrap.nv-scatter').data([data]);
            var wrapEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap nv-scatter nv-chart-' + id);
            var defsEnter = wrapEnter.append('defs');
            var gEnter = wrapEnter.append('g');
            var g = wrap.select('g');

            wrap.classed('nv-single-point', singlePoint);
            gEnter.append('g').attr('class', 'nv-groups');
            gEnter.append('g').attr('class', 'nv-point-paths');
            wrapEnter.append('g').attr('class', 'nv-point-clips');

            wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

            defsEnter.append('clipPath')
                .attr('id', 'nv-edge-clip-' + id)
                .append('rect');

            wrap.select('#nv-edge-clip-' + id + ' rect')
                .attr('width', availableWidth)
                .attr('height', (availableHeight > 0) ? availableHeight : 0);

            g.attr('clip-path', clipEdge ? 'url(#nv-edge-clip-' + id + ')' : '');

            function updateInteractiveLayer() {
                // Always clear needs-update flag regardless of whether or not
                // we will actually do anything (avoids needless invocations).
                needsUpdate = false;

                if (!interactive) return false;

                // inject series and point index for reference into voronoi
                if (useVoronoi === true) {
                    var vertices = d3.merge(data.map(function(group, groupIndex) {
                            return group.values
                                .map(function(point, pointIndex) {
                                    // *Adding noise to make duplicates very unlikely
                                    // *Injecting series and point index for reference
                                    /* *Adding a 'jitter' to the points, because there's an issue in d3.geom.voronoi.
                                     */
                                    var pX = getX(point,pointIndex);
                                    var pY = getY(point,pointIndex);

                                    return [nv.utils.NaNtoZero(x(pX))+ Math.random() * 1e-4,
                                            nv.utils.NaNtoZero(y(pY))+ Math.random() * 1e-4,
                                        groupIndex,
                                        pointIndex, point]; //temp hack to add noise until I think of a better way so there are no duplicates
                                })
                                .filter(function(pointArray, pointIndex) {
                                    return pointActive(pointArray[4], pointIndex); // Issue #237.. move filter to after map, so pointIndex is correct!
                                })
                        })
                    );

                    if (vertices.length == 0) return false;  // No active points, we're done
                    if (vertices.length < 3) {
                        // Issue #283 - Adding 2 dummy points to the voronoi b/c voronoi requires min 3 points to work
                        vertices.push([x.range()[0] - 20, y.range()[0] - 20, null, null]);
                        vertices.push([x.range()[1] + 20, y.range()[1] + 20, null, null]);
                        vertices.push([x.range()[0] - 20, y.range()[0] + 20, null, null]);
                        vertices.push([x.range()[1] + 20, y.range()[1] - 20, null, null]);
                    }

                    // keep voronoi sections from going more than 10 outside of graph
                    // to avoid overlap with other things like legend etc
                    var bounds = d3.geom.polygon([
                        [-10,-10],
                        [-10,height + 10],
                        [width + 10,height + 10],
                        [width + 10,-10]
                    ]);

                    var voronoi = d3.geom.voronoi(vertices).map(function(d, i) {
                        return {
                            'data': bounds.clip(d),
                            'series': vertices[i][2],
                            'point': vertices[i][3]
                        }
                    });

                    // nuke all voronoi paths on reload and recreate them
                    wrap.select('.nv-point-paths').selectAll('path').remove();
                    var pointPaths = wrap.select('.nv-point-paths').selectAll('path').data(voronoi);
                    var vPointPaths = pointPaths
                        .enter().append("svg:path")
                        .attr("d", function(d) {
                            if (!d || !d.data || d.data.length === 0)
                                return 'M 0 0';
                            else
                                return "M" + d.data.join(",") + "Z";
                        })
                        .attr("id", function(d,i) {
                            return "nv-path-"+i; })
                        .attr("clip-path", function(d,i) { return "url(#nv-clip-"+id+"-"+i+")"; })
                        ;

                    // good for debugging point hover issues
                    if (showVoronoi) {
                        vPointPaths.style("fill", d3.rgb(230, 230, 230))
                            .style('fill-opacity', 0.4)
                            .style('stroke-opacity', 1)
                            .style("stroke", d3.rgb(200,200,200));
                    }

                    if (clipVoronoi) {
                        // voronoi sections are already set to clip,
                        // just create the circles with the IDs they expect
                        wrap.select('.nv-point-clips').selectAll('*').remove(); // must do * since it has sub-dom
                        var pointClips = wrap.select('.nv-point-clips').selectAll('clipPath').data(vertices);
                        var vPointClips = pointClips
                            .enter().append("svg:clipPath")
                            .attr("id", function(d, i) { return "nv-clip-"+id+"-"+i;})
                            .append("svg:circle")
                            .attr('cx', function(d) { return d[0]; })
                            .attr('cy', function(d) { return d[1]; })
                            .attr('r', clipRadius);
                    }

                    var mouseEventCallback = function(d, mDispatch) {
                        if (needsUpdate) return 0;
                        var series = data[d.series];
                        if (series === undefined) return;
                        var point  = series.values[d.point];
                        point['color'] = color(series, d.series);

                        // standardize attributes for tooltip.
                        point['x'] = getX(point);
                        point['y'] = getY(point);

                        // can't just get box of event node since it's actually a voronoi polygon
                        var box = container.node().getBoundingClientRect();
                        var scrollTop  = window.pageYOffset || document.documentElement.scrollTop;
                        var scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

                        var pos = {
                            left: x(getX(point, d.point)) + box.left + scrollLeft + margin.left + 10,
                            top: y(getY(point, d.point)) + box.top + scrollTop + margin.top + 10
                        };

                        mDispatch({
                            point: point,
                            series: series,
                            pos: pos,
                            relativePos: [x(getX(point, d.point)) + margin.left, y(getY(point, d.point)) + margin.top],
                            seriesIndex: d.series,
                            pointIndex: d.point
                        });
                    };

                    pointPaths
                        .on('click', function(d) {
                            mouseEventCallback(d, dispatch.elementClick);
                        })
                        .on('dblclick', function(d) {
                            mouseEventCallback(d, dispatch.elementDblClick);
                        })
                        .on('mouseover', function(d) {
                            mouseEventCallback(d, dispatch.elementMouseover);
                        })
                        .on('mouseout', function(d, i) {
                            mouseEventCallback(d, dispatch.elementMouseout);
                        });

                } else {
                    // add event handlers to points instead voronoi paths
                    wrap.select('.nv-groups').selectAll('.nv-group')
                        .selectAll('.nv-point')
                        //.data(dataWithPoints)
                        //.style('pointer-events', 'auto') // recativate events, disabled by css
                        .on('click', function(d,i) {
                            //nv.log('test', d, i);
                            if (needsUpdate || !data[d.series]) return 0; //check if this is a dummy point
                            var series = data[d.series],
                                point  = series.values[i];

                            dispatch.elementClick({
                                point: point,
                                series: series,
                                pos: [x(getX(point, i)) + margin.left, y(getY(point, i)) + margin.top], //TODO: make this pos base on the page
                                relativePos: [x(getX(point, i)) + margin.left, y(getY(point, i)) + margin.top],
                                seriesIndex: d.series,
                                pointIndex: i
                            });
                        })
                        .on('dblclick', function(d,i) {
                            if (needsUpdate || !data[d.series]) return 0; //check if this is a dummy point
                            var series = data[d.series],
                                point  = series.values[i];

                            dispatch.elementDblClick({
                                point: point,
                                series: series,
                                pos: [x(getX(point, i)) + margin.left, y(getY(point, i)) + margin.top],//TODO: make this pos base on the page
                                relativePos: [x(getX(point, i)) + margin.left, y(getY(point, i)) + margin.top],
                                seriesIndex: d.series,
                                pointIndex: i
                            });
                        })
                        .on('mouseover', function(d,i) {
                            if (needsUpdate || !data[d.series]) return 0; //check if this is a dummy point
                            var series = data[d.series],
                                point  = series.values[i];

                            dispatch.elementMouseover({
                                point: point,
                                series: series,
                                pos: [x(getX(point, i)) + margin.left, y(getY(point, i)) + margin.top],//TODO: make this pos base on the page
                                relativePos: [x(getX(point, i)) + margin.left, y(getY(point, i)) + margin.top],
                                seriesIndex: d.series,
                                pointIndex: i,
                                color: color(d, i)
                            });
                        })
                        .on('mouseout', function(d,i) {
                            if (needsUpdate || !data[d.series]) return 0; //check if this is a dummy point
                            var series = data[d.series],
                                point  = series.values[i];

                            dispatch.elementMouseout({
                                point: point,
                                series: series,
                                pos: [x(getX(point, i)) + margin.left, y(getY(point, i)) + margin.top],//TODO: make this pos base on the page
                                relativePos: [x(getX(point, i)) + margin.left, y(getY(point, i)) + margin.top],
                                seriesIndex: d.series,
                                pointIndex: i,
                                color: color(d, i)
                            });
                        });
                }
            }

            needsUpdate = true;
            var groups = wrap.select('.nv-groups').selectAll('.nv-group')
                .data(function(d) { return d }, function(d) { return d.key });
            groups.enter().append('g')
                .style('stroke-opacity', 1e-6)
                .style('fill-opacity', 1e-6);
            groups.exit()
                .remove();
            groups
                .attr('class', function(d,i) {
                    return (d.classed || '') + ' nv-group nv-series-' + i;
                })
                .classed('nv-noninteractive', !interactive)
                .classed('hover', function(d) { return d.hover });
            groups.watchTransition(renderWatch, 'scatter: groups')
                .style('fill', function(d,i) { return color(d, i) })
                .style('stroke', function(d,i) { return color(d, i) })
                .style('stroke-opacity', 1)
                .style('fill-opacity', .5);

            // create the points, maintaining their IDs from the original data set
            var points = groups.selectAll('path.nv-point')
                .data(function(d) {
                    return d.values.map(
                        function (point, pointIndex) {
                            return [point, pointIndex]
                        }).filter(
                            function(pointArray, pointIndex) {
                                return pointActive(pointArray[0], pointIndex)
                            })
                    });
            points.enter().append('path')
                .attr('class', function (d) {
                    return 'nv-point nv-point-' + d[1];
                })
                .style('fill', function (d) { return d.color })
                .style('stroke', function (d) { return d.color })
                .attr('transform', function(d) {
                    return 'translate(' + nv.utils.NaNtoZero(x0(getX(d[0],d[1]))) + ',' + nv.utils.NaNtoZero(y0(getY(d[0],d[1]))) + ')'
                })
                .attr('d',
                    nv.utils.symbol()
                    .type(function(d) { return getShape(d[0]); })
                    .size(function(d) { return z(getSize(d[0],d[1])) })
            );
            points.exit().remove();
            groups.exit().selectAll('path.nv-point')
                .watchTransition(renderWatch, 'scatter exit')
                .attr('transform', function(d) {
                    return 'translate(' + nv.utils.NaNtoZero(x(getX(d[0],d[1]))) + ',' + nv.utils.NaNtoZero(y(getY(d[0],d[1]))) + ')'
                })
                .remove();
            points.filter(function (d) { return scaleDiff || getDiffs(d, 'x', 'y'); })
                .watchTransition(renderWatch, 'scatter points')
                .attr('transform', function(d) {
                    //nv.log(d, getX(d[0],d[1]), x(getX(d[0],d[1])));
                    return 'translate(' + nv.utils.NaNtoZero(x(getX(d[0],d[1]))) + ',' + nv.utils.NaNtoZero(y(getY(d[0],d[1]))) + ')'
                });
            points.filter(function (d) { return scaleDiff || getDiffs(d, 'shape', 'size'); })
                .watchTransition(renderWatch, 'scatter points')
                .attr('d',
                    nv.utils.symbol()
                    .type(function(d) { return getShape(d[0]); })
                    .size(function(d) { return z(getSize(d[0],d[1])) })
            );
            
            // add label a label to scatter chart 
            if(showLabels)
            {      
                var titles =  groups.selectAll('.nv-label')
                    .data(function(d) {
                        return d.values.map(
                            function (point, pointIndex) {
                                return [point, pointIndex]
                            }).filter(
                                function(pointArray, pointIndex) {
                                    return pointActive(pointArray[0], pointIndex)
                                })
                        });

                titles.enter().append('text')
                    .style('fill', function (d,i) { 
                        return d.color })
                    .style('stroke-opacity', 0)
                    .style('fill-opacity', 1)
                    .attr('transform', function(d) {
                        var dx = nv.utils.NaNtoZero(x0(getX(d[0],d[1]))) + Math.sqrt(z(getSize(d[0],d[1]))/Math.PI) + 2;
                        return 'translate(' + dx + ',' + nv.utils.NaNtoZero(y0(getY(d[0],d[1]))) + ')';
                    })
                    .text(function(d,i){
                        return d[0].label;});

                titles.exit().remove();
                groups.exit().selectAll('path.nv-label')
                    .watchTransition(renderWatch, 'scatter exit')
                    .attr('transform', function(d) {
                        var dx = nv.utils.NaNtoZero(x(getX(d[0],d[1])))+ Math.sqrt(z(getSize(d[0],d[1]))/Math.PI)+2;
                        return 'translate(' + dx + ',' + nv.utils.NaNtoZero(y(getY(d[0],d[1]))) + ')';
                    })
                    .remove();
               titles.each(function(d) {
                  d3.select(this)
                    .classed('nv-label', true)
                    .classed('nv-label-' + d[1], false)
                    .classed('hover',false);
                });
                titles.watchTransition(renderWatch, 'scatter labels')
                    .attr('transform', function(d) {
                        var dx = nv.utils.NaNtoZero(x(getX(d[0],d[1])))+ Math.sqrt(z(getSize(d[0],d[1]))/Math.PI)+2;
                        return 'translate(' + dx + ',' + nv.utils.NaNtoZero(y(getY(d[0],d[1]))) + ')'
                    });
            }

            // Delay updating the invisible interactive layer for smoother animation
            if( interactiveUpdateDelay )
            {
                clearTimeout(timeoutID); // stop repeat calls to updateInteractiveLayer
                timeoutID = setTimeout(updateInteractiveLayer, interactiveUpdateDelay );
            }
            else
            {
                updateInteractiveLayer();
            }

            //store old scales for use in transitions on update
            x0 = x.copy();
            y0 = y.copy();
            z0 = z.copy();

        });
        renderWatch.renderEnd('scatter immediate');
        return chart;
    }

    //============================================================
    // Expose Public Variables
    //------------------------------------------------------------

    chart.dispatch = dispatch;
    chart.options = nv.utils.optionsFunc.bind(chart);

    // utility function calls provided by this chart
    chart._calls = new function() {
        this.clearHighlights = function () {
            nv.dom.write(function() {
                container.selectAll(".nv-point.hover").classed("hover", false);
            });
            return null;
        };
        this.highlightPoint = function (seriesIndex, pointIndex, isHoverOver) {
            nv.dom.write(function() {
                container.select('.nv-groups')
                  .selectAll(".nv-series-" + seriesIndex)
                  .selectAll(".nv-point-" + pointIndex)
                  .classed("hover", isHoverOver);
            });
        };
    };

    // trigger calls from events too
    dispatch.on('elementMouseover.point', function(d) {
        if (interactive) chart._calls.highlightPoint(d.seriesIndex,d.pointIndex,true);
    });

    dispatch.on('elementMouseout.point', function(d) {
        if (interactive) chart._calls.highlightPoint(d.seriesIndex,d.pointIndex,false);
    });

    chart._options = Object.create({}, {
        // simple options, just get/set the necessary values
        width:        {get: function(){return width;}, set: function(_){width=_;}},
        height:       {get: function(){return height;}, set: function(_){height=_;}},
        xScale:       {get: function(){return x;}, set: function(_){x=_;}},
        yScale:       {get: function(){return y;}, set: function(_){y=_;}},
        pointScale:   {get: function(){return z;}, set: function(_){z=_;}},
        xDomain:      {get: function(){return xDomain;}, set: function(_){xDomain=_;}},
        yDomain:      {get: function(){return yDomain;}, set: function(_){yDomain=_;}},
        pointDomain:  {get: function(){return sizeDomain;}, set: function(_){sizeDomain=_;}},
        xRange:       {get: function(){return xRange;}, set: function(_){xRange=_;}},
        yRange:       {get: function(){return yRange;}, set: function(_){yRange=_;}},
        pointRange:   {get: function(){return sizeRange;}, set: function(_){sizeRange=_;}},
        forceX:       {get: function(){return forceX;}, set: function(_){forceX=_;}},
        forceY:       {get: function(){return forceY;}, set: function(_){forceY=_;}},
        forcePoint:   {get: function(){return forceSize;}, set: function(_){forceSize=_;}},
        interactive:  {get: function(){return interactive;}, set: function(_){interactive=_;}},
        pointActive:  {get: function(){return pointActive;}, set: function(_){pointActive=_;}},
        padDataOuter: {get: function(){return padDataOuter;}, set: function(_){padDataOuter=_;}},
        padData:      {get: function(){return padData;}, set: function(_){padData=_;}},
        clipEdge:     {get: function(){return clipEdge;}, set: function(_){clipEdge=_;}},
        clipVoronoi:  {get: function(){return clipVoronoi;}, set: function(_){clipVoronoi=_;}},
        clipRadius:   {get: function(){return clipRadius;}, set: function(_){clipRadius=_;}},
        showVoronoi:   {get: function(){return showVoronoi;}, set: function(_){showVoronoi=_;}},
        id:           {get: function(){return id;}, set: function(_){id=_;}},
        interactiveUpdateDelay: {get:function(){return interactiveUpdateDelay;}, set: function(_){interactiveUpdateDelay=_;}},
        showLabels: {get: function(){return showLabels;}, set: function(_){ showLabels = _;}},

        // simple functor options
        x:     {get: function(){return getX;}, set: function(_){getX = d3.functor(_);}},
        y:     {get: function(){return getY;}, set: function(_){getY = d3.functor(_);}},
        pointSize: {get: function(){return getSize;}, set: function(_){getSize = d3.functor(_);}},
        pointShape: {get: function(){return getShape;}, set: function(_){getShape = d3.functor(_);}},

        // options that require extra logic in the setter
        margin: {get: function(){return margin;}, set: function(_){
            margin.top    = _.top    !== undefined ? _.top    : margin.top;
            margin.right  = _.right  !== undefined ? _.right  : margin.right;
            margin.bottom = _.bottom !== undefined ? _.bottom : margin.bottom;
            margin.left   = _.left   !== undefined ? _.left   : margin.left;
        }},
        duration: {get: function(){return duration;}, set: function(_){
            duration = _;
            renderWatch.reset(duration);
        }},
        color: {get: function(){return color;}, set: function(_){
            color = nv.utils.getColor(_);
        }},
        useVoronoi: {get: function(){return useVoronoi;}, set: function(_){
            useVoronoi = _;
            if (useVoronoi === false) {
                clipVoronoi = false;
            }
        }}
    });

    nv.utils.initOptions(chart);
    return chart;
};
