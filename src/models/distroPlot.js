nv.models.distroPlot = function() {
    "use strict";

    //============================================================
    // Public Variables with Default Settings
    //------------------------------------------------------------

    var margin = {top: 0, right: 0, bottom: 0, left: 0},
        width = 960,
        height = 500,
        id = Math.floor(Math.random() * 10000), // Create semi-unique ID in case user doesn't select one
        xScale = d3.scale.ordinal(),
        yScale = d3.scale.linear(),
        colorGroupSizeScale = d3.scale.ordinal(), // help position boxes if grouping
        getX  = function(d) { return d.label }, // Default data model selectors.
        getValue  = function(d) { return d.value },
        getColor = function(d) { return d.color },
        getQ1 = function(d) { return d.values.q1 },
        getQ2 = function(d) { return d.values.q2 },
        getQ3 = function(d) { return d.values.q3 },
        getMean = function(d) { return d.values.mean },
        getWl = function(d) { return d.values.wl },
        getWh = function(d) { return d.values.wu },
        getMin = function(d) { return d.values.min },
        getMax = function(d) { return d.values.max },
        getDev = function(d) { return d.values.dev },
        getVals = function(d) { return d.values.original; },
        getOlItems  = function(d,i,j) { 
            if (!colorGroup) {
                return reformatDat[j].values.outliers.map(function(i) { return i.y; });
            } else {    
                return reformatDat[j].values.find(function(e) { return e.key == d.key; }).values.outliers.map(function(i) { return i.y }); 
            }
        },
        getOlLabel = function(d,i,j) { return d },
        getOlValue = function(d,i,j) { return observationType == 'swarm' ? d.datum : !colorGroup ? d.y : d.y },
        getOlColor = function(d,i,j) { console.log('here'); return undefined },
        plotType = 'box', // type of background: 'box', 'violin', 'none'/false - default: 'box' - 'none' will activate random scatter automatically
        observationType = false, // type of observations to show: 'random', 'swarm', 'line' - default: false (don't show observations), if type = 'none' the default is 'random'
        whiskerDef = 'iqr', // type of whisker to render: 'iqr', 'minmax', 'stddev' - default: iqr
        notchBox = false, // bool whether to notch box
        colorGroup = false, // if specified, each x-category will be split into groups, each colored
        showMiddle = false,
        bandwidth = 'scott',
        resolution = 50,
        color = nv.utils.defaultColor(),
        colorGroupColorScale = nv.utils.getColor(d3.scale.category10().range()), // used to color boxes if .colorGroup() specified
        container = null,
        xDomain, xRange,
        yDomain, yRange,
        dispatch = d3.dispatch('elementMouseover', 'elementMouseout', 'elementMousemove', 'renderEnd'),
        duration = 250,
        maxBoxWidth = null;

    //============================================================
    // Helper Functions
    //------------------------------------------------------------

    /**
     * Adds jitter to the scatter point plot
     * @param (int) width - width of container for scatter points, jitter will not
     *    extend beyond this width
     * @param (float) fact - fraction of width that jitter should take up; e.g. 1
     *    will use entire width, 0.25 will use 25% of width
     * @returns {number}
     */
    function jitterX(width, frac) {
        if (typeof frac === 'undefined') frac = .7
        return width / 2 + Math.floor(Math.random() * width * frac) - (width * frac) / 2;
    }


    /* Returns the smaller of std(X, ddof=1) or normalized IQR(X) over axis 0.
     *
     * @param (list) x - input x formatted as a single list of values
     *
     * @return float
     *
     * Source: https://github.com/statsmodels/statsmodels/blob/master/statsmodels/nonparametric/bandwidths.py#L9
     */
    function select_sigma(x) {
        var sorted = x.sort(d3.ascending); // sort our dat
        var normalize = 1.349;
        var IQR = (d3.quantile(sorted, 0.75) - d3.quantile(sorted, 0.25))/normalize; // normalized IQR
        return d3.min([d3.deviation(sorted), IQR]);
    }

    /*
    Scott's Rule of Thumb

    Parameters
    ----------
    x : array-like
        Array for which to get the bandwidth
    type : string
           The type of estimate to use, must be one of scott or silverman

    Returns
    -------
    bw : float
        The estimate of the bandwidth

    Notes
    -----
    Returns 1.059 * A * n ** (-1/5.) where ::
       A = min(std(x, ddof=1), IQR/1.349)
       IQR = np.subtract.reduce(np.percentile(x, [75,25]))

    References
    ----------
    Scott, D.W. (1992) Multivariate Density Estimation: Theory, Practice, and
        Visualization.
     */
    function calcBandwidth(x, type='scott') {

        // TODO: consider using https://github.com/jasondavies/science.js
        var A = select_sigma(x);
        var n = x.length;
        return type==='scott' ? Math.pow(1.059 * A * n, -0.2) : Math.pow(.9 * A * n, -0.2);
    }



    /*
     * Prep data for use with distroPlot by grouping data
     * by .x() option set by user and then calculating
     * count, sum, mean, q1, q2 (median), q3, lower whisker (wl)
     * upper whisker (wu), iqr, min, max, and standard dev.
     *
     * @param (list) dat - input data formatted as list of objects,
     *   with an object key that must exist when accessed by getX()
     * @param (str) plotType - 'box', 'violin'
     *
     * @return prepared data in the form for box plotType:
     * [{
     *    key : YY,
     *    values: {
     *      count: XX,
     *      sum: XX,
     *      mean: XX,
     *      q1: XX,
     *      q2: XX,
     *      q3: XX,
     *      wl: XX,
     *      wu: XX,
     *      iqr: XX,
     *      min: XX,
     *      max: XX,
     *      dev: XX,
     *      original: [XX,..]
     *      outliers: [{y:XX,..},..]
     *    }
     *  },
     *  ...
     *  ]
     * for violin plotType:
     * [{
     *    key : YY,
     *    values: {
     *      original: [XX]
     *    }
     *  },
     *  ...
     *  ]
     * where YY are those keys in dat that define the
     * x-axis and which are defined by .x()
     */
    function prepData(dat, plotType) {

        // helper function to calcuate the various boxplot stats
        function calcStats(v, xGroup) {
            if (plotType == 'box') {
                var q1 = d3.quantile(v, 0.25);
                var q3 = d3.quantile(v, 0.75);
                var iqr = q3 - q1;

                /* whisker definitions:
                 *  - iqr: also known as Tukey boxplot, the lowest datum still within 1.5 IQR of the lower quartile, and the highest datum still within 1.5 IQR of the upper quartile
                 *  - minmax: the minimum and maximum of all of the data
                 *  - sttdev: one standard deviation above and below the mean of the data
                 */
                var wl = (whiskerDef == 'iqr' || !whiskerDef) ? q1 - 1.5 * iqr : whiskerDef == 'minmax' ? d3.min(v) : whiskerDef == 'stddev' ? d3.mean(v) - d3.deviation(v) : null;
                var wu = (whiskerDef == 'iqr' || !whiskerDef) ? q3 + 1.5 * iqr : whiskerDef == 'minmax' ? d3.max(v) : whiskerDef == 'stddev' ? d3.mean(v) + d3.deviation(v) : null;
                var outliers = v.filter(function(d) { return (d < wl || d > wu); })
                var original = v.map(function(d) { 
                    return {
                        y: d,
                        isOutlier: outliers.indexOf(d) != -1,
                    };
                });
                outliers = outliers.map(function(d) { return {y:d}; }) // convert to list of objs
                return {
                    count: v.length,
                    sum: d3.sum(v),
                    mean: d3.mean(v),
                    q1: q1,
                    q2: d3.median(v),
                    q3: q3,
                    wl: wl,
                    wu: wu,
                    iqr: iqr,
                    min: d3.min(v),
                    max: d3.max(v),
                    dev: d3.deviation(v),
                    outliers: outliers,
                    original: original,
                    xGroup: xGroup,
                };
            } else {
                return {original: v};
            }
        }

        // couldn't find a conditional way of doing the key() grouping
        // TODO not DRY
        if (!colorGroup) {
            var tmp = d3.nest()
                .key(function(d) { return getX(d); })
                .rollup(function(v) {
                    var sortDat = v.map(function(d) {
                        return getValue(d);
                    }).sort(d3.ascending);
                    allValues.push.apply(allValues, sortDat);
                    return calcStats(sortDat);
                })
                .entries(dat);
        } else {
            var tmp = d3.nest()
                .key(function(d) { return getX(d); })
                .key(function(d) { return colorGroup(d); })
                .rollup(function(v) {
                    var xGroup = getX(v[0])
                    var sortDat = v.map(function(d) {
                        allColorGroups.add(colorGroup(d));
                        return getValue(d);
                    }).sort(d3.ascending);
                    allValues.push.apply(allValues, sortDat);
                    return calcStats(sortDat, xGroup);
                })
                .entries(dat);
        }

        return tmp;
    }

    // https://bl.ocks.org/mbostock/4341954
    function kernelDensityEstimator(kernel, x) {
        return function (sample) {
            return x.map(function (x) {
                return {x:x, y:d3.mean(sample, function (v) {return kernel(x - v);})};
            });
        };
    }

    // https://bl.ocks.org/mbostock/4341954
    function eKernel(scale) {
        return function (u) {
            return Math.abs(u /= scale) <= 1 ? .75 * (1 - u * u) / scale : 0;
        };
    }

    /**
     * Given an x-axis group, return the available color groups within it
     * provided that colorGroups is set, if not, x-axis group is returned
     */
    function getAvailableColorGroups(x) {
        if (!colorGroup) return x;
        var tmp = reformatDat.find(function(d) { return d.key == x });
        return tmp.values.map(function(d) { return d.key });
    }

    function squash(a,b) {
        console.log(a,getAvailableColorGroups(b), colorGroupSizeScale.domain())
    }


    //============================================================
    // Private Variables
    //------------------------------------------------------------

    var xScale0, yScale0, allColorGroups = d3.set(), allValues = [];
    var yVScale = [], reformatDat;
    var renderWatch = nv.utils.renderWatch(dispatch, duration);
    var ptRadius = 3; // TODO change size based on window size

    function chart(selection) {
        renderWatch.reset();
        selection.each(function(data) {
            var availableWidth = width - margin.left - margin.right,
                availableHeight = height - margin.top - margin.bottom;

            container = d3.select(this);
            nv.utils.initSVG(container);

            reformatDat = prepData(data, plotType);

            // Setup Scales
            xScale.domain(xDomain || reformatDat.map(function(d) { return d.key }).sort(d3.ascending))
                .rangeBands(xRange || [0, availableWidth], 0.1);
            yScale.domain(yDomain || d3.extent(allValues))
            	.range(yRange || [availableHeight, 0]);


            //store old scales if they exist
            xScale0 = xScale0 || xScale;
            yScale0 = yScale0 || yScale.copy().range([yScale(0),yScale(0)]);

            // Setup containers and skeleton of chart
            var wrap = container.selectAll('g.nv-wrap').data([reformatDat]);
            var wrapEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap');
            wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

            var distroplots = wrap.selectAll('.nv-distroplot').data(function(d) { return d });
            var areaEnter;

            if (!colorGroup) {
                areaEnter = distroplots.enter()
                    .append('g')
                    .style('stroke-opacity', 1e-6).style('fill-opacity', 1e-6)
                    .style('fill', function(d,i) { return getColor(d) || color(d,i) })
                    .style('stroke', function(d,i) { return getColor(d) || color(d,i) })

            } else {
                // setup a scale for each color group
                // so that we can position g's properly
                colorGroupSizeScale.domain(allColorGroups.values().sort(d3.ascending))
                    .rangeBands([0, xScale.rangeBand() * 0.9], 0.1)

                // setup color scale for coloring groups
                getColor = function(d) { return colorGroupColorScale(d.key) }

                var xGroup = distroplots.enter()
                    .append('g')
                    .style('stroke-opacity', 1e-6).style('fill-opacity', 1e-6)
                    .selectAll('g.nv-colorGroup')
                    .data(function(d) { return d.values; })

                xGroup.enter()
                    .append('g')
                    .attr('class','nv-colorGroup')
                    .attr('transform', function(d) { squash(d.key, d.values.xGroup); return 'translate(' + (colorGroupSizeScale(d.key) + colorGroupSizeScale.rangeBand() * 0.05) + ',0)'; }) // XXX adjust the x pos for the color groups
                    .style('fill', function(d,i) { return getColor(d) || color(d,i) })
                    .style('stroke', function(d,i) { return getColor(d) || color(d,i) })

                distroplots.selectAll('.nv-colorGroup')
                    .watchTransition(renderWatch, 'nv-colorGroup xGroup')
                    .attr('transform', function(d) { return 'translate(' + (colorGroupSizeScale(d.key) + colorGroupSizeScale.rangeBand() * 0.05) + ',0)'; });

                //areaEnter = wrapEnter.selectAll('g.nv-colorGroup');
                areaEnter = xGroup;
            }

            distroplots
                .attr('class', 'nv-distroplot')
                .attr('transform', function(d) { return 'translate(' + (xScale(d.key) + xScale.rangeBand() * 0.05) + ', 0)'; })
            distroplots
                .watchTransition(renderWatch, 'nv-distroplot: distroplots')
                .style('stroke-opacity', 1)
                .style('fill-opacity', 0.5)
                .attr('transform', function(d) {
                    return 'translate(' + (xScale(d.key) + xScale.rangeBand() * 0.05) + ', 0)';
                });

            distroplots.exit().remove();

            // TODO not DRY, can I juse use xScale for both?
            if (!colorGroup) {
                var areaWidth = function() { return (maxBoxWidth === null ? xScale.rangeBand() * 0.9 : Math.min(75, xScale.rangeBand() * 0.9)); };
                var areaLeft  = function() { return xScale.rangeBand() * 0.45 - areaWidth()/2; };
                var areaRight = function() { return xScale.rangeBand() * 0.45 + areaWidth()/2; };
                var tickLeft  = function() { return xScale.rangeBand() * 0.45 - areaWidth()/5; };
                var tickRight = function() { return xScale.rangeBand() * 0.45 + areaWidth()/5; };
            } else {
                var areaWidth = function() { return (maxBoxWidth === null ? colorGroupSizeScale.rangeBand() * 0.9 : Math.min(75, colorGroupSizeScale.rangeBand() * 0.9)); }; // TODO: when maxBoxWidth != null
                var areaLeft  = function() { return colorGroupSizeScale.rangeBand() * 0.45 - areaWidth()/2; };
                var areaRight = function() { return colorGroupSizeScale.rangeBand() * 0.45 + areaWidth()/2; };
                var tickLeft  = function() { return colorGroupSizeScale.rangeBand() * 0.45 - areaWidth()/5; };
                var tickRight = function() { return colorGroupSizeScale.rangeBand() * 0.45 + areaWidth()/5; };
            }


            // ----- add the SVG elements for each plot type -----

            if (plotType == 'none' || !plotType) {
                if (!observationType) observationType = 'random'; // activate scatter plots if not already on
            } if (plotType == 'violin') {

                areaEnter.each(function(d,i) {
                    var violin = d3.select(this);
                    var pointVals = getVals(d);
                    if (isNaN(bandwidth)) bandwidth = calcBandwidth(pointVals, bandwidth);

                    // normally KDE is calculated in a horizontal layout, we want a verital layout however
                    // so we flip the use of yScale & xScale
                    var kde = kernelDensityEstimator(eKernel(bandwidth), yScale.ticks(resolution));
                    var kdeData = kde(pointVals);

                    // make a new yScale for each group
                    var tmpScale = d3.scale.linear()
                        .domain([0, d3.max(kdeData, function (e) {return e.y;})])
                        .clamp(true);
					yVScale.push(tmpScale);

                    ['left','right'].forEach(function(side) {
						['line','area'].forEach(function(d) {
	                        violin.append('path')
	                            .datum(kdeData)
	                            .attr('class', 'nv-violin-' + d + ' nv-violin-' + side)
		                        .attr("transform", "rotate(90,0,0)   translate(0," + (side == 'left' ? -areaWidth() : 0) + ")" + (side == 'left' ? '' : ' scale(1,-1)')); // rotate violin
						})

                    })

					areaEnter.selectAll('.nv-violin-line')
						.style('fill','none')
					areaEnter.selectAll('.nv-violin-area')
						.style('stroke','none')
						.style('opacity',0.7)

                });

				distroplots.each(function(d,i) {

					var tmpScale = yVScale[i];
					tmpScale.range([areaWidth()/2, 0]);

	                ['left','right'].forEach(function(side) {
						distroplots.selectAll('.nv-violin-line.nv-violin-' + side)
						  .watchTransition(renderWatch, 'nv-violin-line: distroplots')
	                        .attr("d", d3.svg.line()
	                                .x(function(d) { return yScale(d.x); })
	                                .y(function(d) { return tmpScale(d.y); })
	                                .interpolate('cardinal')
	                        )
	                        .attr("transform", "rotate(90,0,0)   translate(0," + (side == 'left' ? -areaWidth() : 0) + ")" + (side == 'left' ? '' : ' scale(1,-1)')); // rotate violin

						distroplots.selectAll('.nv-violin-area.nv-violin-' + side)
						  .watchTransition(renderWatch, 'nv-violin-area: distroplots')
	                        .attr("d", d3.svg.area()
	                                .y1(function(d) { return tmpScale(d.y); })
	                                .x(function(d) { return yScale(d.x); })
	                                .y0(areaWidth()/2)
	                                .interpolate('cardinal')
	                        )
	                        .attr("transform", "rotate(90,0,0)   translate(0," + (side == 'left' ? -areaWidth() : 0) + ")" + (side == 'left' ? '' : ' scale(1,-1)')); // rotate violin
	                })

				})



            } else if (plotType == 'box') {
                // conditionally append whisker lines
                areaEnter.each(function(d,i) {
                    var box = d3.select(this);
                    [getWl, getWh].forEach(function (f) {
                        if (f(d) !== undefined && f(d) !== null) {
                            var key = (f === getWl) ? 'low' : 'high';
                            box.append('line')
                              .style('stroke', getColor(d) || color(d,i))
                              .attr('class', 'nv-distroplot-whisker nv-distroplot-' + key);
                            box.append('line')
                              .style('stroke', getColor(d) || color(d,i))
                              .attr('class', 'nv-distroplot-tick nv-distroplot-' + key);
                        }
                    });
                });

                // update whisker lines and ticks
                [getWl, getWh].forEach(function (f) {
                    var key = (f === getWl) ? 'low' : 'high';
                    var endpoint = (f === getWl) ? getQ1 : getQ3;
                    distroplots.selectAll('line.nv-distroplot-whisker.nv-distroplot-' + key)
                      .watchTransition(renderWatch, 'nv-distroplot: distroplots')
                        .attr('x1', 0.45 * (!colorGroup ? xScale.rangeBand() : colorGroupSizeScale.rangeBand()) )
                        .attr('y1', function(d,i) { return yScale(f(d)); })
                        .attr('x2', 0.45 * (!colorGroup ? xScale.rangeBand() : colorGroupSizeScale.rangeBand()) )
                        .attr('y2', function(d,i) { return yScale(endpoint(d)); });
                    distroplots.selectAll('line.nv-distroplot-tick.nv-distroplot-' + key)
                      .watchTransition(renderWatch, 'nv-distroplot: distroplots')
                        .attr('x1', tickLeft )
                        .attr('y1', function(d,i) { return yScale(f(d)); })
                        .attr('x2', tickRight )
                        .attr('y2', function(d,i) { return yScale(f(d)); });
                });

                [getWl, getWh].forEach(function (f) {
                    var key = (f === getWl) ? 'low' : 'high';
                    areaEnter.selectAll('.nv-distroplot-' + key)
                      .on('mouseover', function(d,i,j) {
                          d3.select(this).classed('hover', true);
                          dispatch.elementMouseover({
                              value: key == 'low' ? 'Lower whisker' : 'Upper whisker',
                              series: { key: f(d).toFixed(2), color: getColor(d) || color(d,j) },
                              e: d3.event
                          });
                      })
                      .on('mouseout', function(d,i,j) {
                          d3.select(this).classed('hover', false);
                          dispatch.elementMouseout({
                              value: key == 'low' ? 'Lower whisker' : 'Upper whisker',
                              series: { key: f(d).toFixed(2), color: getColor(d) || color(d,j) },
                              e: d3.event
                          });
                      })
                      .on('mousemove', function(d,i) {
                          dispatch.elementMousemove({e: d3.event});
                      });
                });

                // boxes
                areaEnter.append('rect')
                    .attr('class', 'nv-distroplot-box')

                // tooltip events
                areaEnter.selectAll('rect.nv-distroplot-box')
                    .on('mouseover', function(d,i,j) {
                        d3.select(this).classed('hover', true);
                        dispatch.elementMouseover({
                            key: d.key,
                            value: 'Group ' + d.key + ' stats',
                            series: [
                                { key: 'max', value: getMax(d).toFixed(2), color: getColor(d) || color(d,j) },
                                { key: 'Q3', value: getQ3(d).toFixed(2), color: getColor(d) || color(d,j) },
                                { key: 'Q2', value: getQ2(d).toFixed(2), color: getColor(d) || color(d,j) },
                                { key: 'Q1', value: getQ1(d).toFixed(2), color: getColor(d) || color(d,j) },
                                { key: 'min', value: getMin(d).toFixed(2), color: getColor(d) || color(d,j) },
                                { key: 'std. dev.', value: getDev(d).toFixed(2), color: getColor(d) || color(d,j) },
                            ],
                            data: d,
                            index: i,
                            e: d3.event
                        });
                    })
                    .on('mouseout', function(d,i,j) {
                        d3.select(this).classed('hover', false);
                        dispatch.elementMouseout({
                            key: d.key,
                            value: 'Group ' + d.key + ' stats',
                            series: [
                                { key: 'max', value: getMax(d).toFixed(2), color: getColor(d) || color(d,j) },
                                { key: 'Q3', value: getQ3(d).toFixed(2), color: getColor(d) || color(d,j) },
                                { key: 'Q2', value: getQ2(d).toFixed(2), color: getColor(d) || color(d,j) },
                                { key: 'Q1', value: getQ1(d).toFixed(2), color: getColor(d) || color(d,j) },
                                { key: 'min', value: getMin(d).toFixed(2), color: getColor(d) || color(d,j) },
                                { key: 'std. dev.', value: getDev(d).toFixed(2), color: getColor(d) || color(d,j) },
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
                distroplots.selectAll('rect.nv-distroplot-box')
                  .watchTransition(renderWatch, 'nv-distroplot: boxes')
                    .attr('y', function(d,i) { return yScale(getQ3(d)); })
                    .attr('width', areaWidth)
                    .attr('x', areaLeft )
                    .attr('rx',1)
                    .attr('ry',1)
                    .attr('height', function(d,i) { return Math.abs(yScale(getQ3(d)) - yScale(getQ1(d))) || 1 })

                // outliers
                if (!observationType) { // if observationType is specified, don't draw outliers here, otherwise we will duplicate points
                    var outliers = distroplots.selectAll('.nv-distroplot-outlier').data(function(d,i,j) {
                        return d.values.outliers || [];
                    });

                    outliers.enter().append('circle')
                        .style('z-index', 9000)

                    outliers.attr('class', 'nv-distroplot-outlier nv-distroplot-scatter');
                    outliers
                      .watchTransition(renderWatch, 'nv-distroplot: nv-distroplot-outlier')
                        .attr('cx', xScale.rangeBand() * 0.45)
                        .attr('cy', function(d,i,j) { return yScale(getOlValue(d,i,j)); })
                        .attr('r', ptRadius)
                    outliers.exit().remove();
                }

            }

            // median/mean line
            if (showMiddle) {

                if (plotType == 'box') {
                    areaEnter.append('line')
                        .attr('class', 'nv-distroplot-middle') 

                    distroplots.selectAll('line.nv-distroplot-middle')
                      .watchTransition(renderWatch, 'nv-distroplot: distroplots line')
                        .attr('x1', areaLeft)
                        .attr('y1', function(d) { return showMiddle == 'mean' ? yScale(getMean(d)) : yScale(getQ2(d)); })
                        .attr('x2', areaRight)
                        .attr('y2', function(d) { return showMiddle == 'mean' ? yScale(getMean(d)) : yScale(getQ2(d)); })
                } else {

                    var middleLine = areaEnter.selectAll('.nv-distroplot-middle')
                        .data(function(d) { return showMiddle == 'mean' ? [d3.mean(getVals(d))] : [d3.median(getVals(d))]; })

                    middleLine.enter()
                        .append('line')
                        .attr('class', 'nv-distroplot-middle')
                        .style('stroke-width', 2);

                    distroplots.selectAll('line.nv-distroplot-middle')
                      .watchTransition(renderWatch, 'nv-distroplot: distroplots line')
                        .attr('x1', areaWidth() * 0.25)
                        .attr('y1', function(d) { return yScale(d); })
                        .attr('x2', areaWidth() * 0.75)
                        .attr('y2', function(d) { return yScale(d); })
                }
            }

            // setup scatter points
            if (observationType) {

                console.log(reformatDat)

                var wrap = areaEnter.selectAll(observationType == 'lines' ? '.nv-lines' : '.nv-distroplot-scatter')
                    .data(function(d) {
                        var tmp = [];
                        if (observationType == 'swarm') {
                            tmp = d3.beeswarm()
                                .data(getVals(d).map(function(e) { return e.y }))
                                .radius(ptRadius)
                                .orientation('vertical')
                                .side('symmetric')
                                .distributeOn(function(e) { return yScale(e); })
                                .arrange()
                        } else {
                            tmp = getVals(d)
                        }
                        tmp.map(function(e,i) { 
                            e.key = d.key; 
                            if (observationType == 'swarm') e.isOutlier = d.values.original[i].isOutlier // add isOulier meta for proper class assignment
                        }) // add group info for tooltip
                        return tmp;
                    })

				if (observationType == 'line') {

	                var lines = wrap.enter()
	                    .append('line')
	                    .attr('class', 'nv-lines')
	                    .style('stroke-width', 1)
						.style('stroke', d3.rgb(85, 85, 85))

					distroplots.selectAll('.nv-lines')
					  .watchTransition(renderWatch, 'nv-distrolot: nv-lines')
						.attr("x1", tickLeft() + areaWidth()/4)
						.attr("x2", tickRight() - areaWidth()/4)
						.attr('y1', function(d) { return yScale(d.y)})
						.attr('y2', function(d) { return yScale(d.y)});

				} else { // if 'swarm' or 'random' observationType
	                var scatter = wrap.enter()
	                    .append('circle')
                        .style('z-index', 9000)
	                    .attr('class', function(d,i,j) { return d.isOutlier ? 'nv-distroplot-scatter nv-distroplot-outlier' : 'nv-distroplot-scatter'})

	                distroplots.selectAll('.nv-distroplot-scatter')
	                  .watchTransition(renderWatch, 'nv-distroplot: nv-distroplot-scatter')
	                    .attr('cx', function(d) { return observationType == 'swarm' ? d.x + areaWidth()/2 : jitterX(areaWidth()); }) // TODO only call on resize finish otherwise jitter call slows things down
	                    .attr('cy', function(d) { return observationType == 'swarm' ? d.y : yScale(d.y); })
	                    .attr('r', ptRadius);


	            }
			}

            // tooltip events for observations
            distroplots.selectAll('.nv-distroplot-scatter')
                    .on('mouseover', function(d,i,j) {
                        d3.select(this).classed('hover', true);
                        dispatch.elementMouseover({
                            value: getOlItems(d,i,j).indexOf(getOlValue(d,i,j)) == -1 ? 'Observation' : 'Outlier',
                            series: { key: getOlValue(d,i,j), color: getColor(d) || color(d,j) },
                            e: d3.event
                        });
                    })
                    .on('mouseout', function(d,i,j) {
                        d3.select(this).classed('hover', false);
                        dispatch.elementMouseout({
                            value: getOlItems(d,i,j).indexOf(getOlValue(d,i,j)) == -1 ? 'Observation' : 'Outlier',
                            series: { key: getOlValue(d,i,j), color: getColor(d) || color(d,j) },
                            e: d3.event
                        });
                    })
                    .on('mousemove', function(d,i) {
                        dispatch.elementMousemove({e: d3.event});
                    });


            wrap.exit().remove();

            //store old scales for use in transitions on update
            xScale0 = xScale.copy();
            yScale0 = yScale.copy();
        });

        renderWatch.renderEnd('nv-distroplot immediate');
        return chart;
    }

    //============================================================
    // Expose Public Variables
    //------------------------------------------------------------

    chart.dispatch = dispatch;
    chart.options = nv.utils.optionsFunc.bind(chart);

    chart._options = Object.create({}, {
        // simple options, just get/set the necessary values
        width:       {get: function(){return width;}, set: function(_){width=_;}},
        height:      {get: function(){return height;}, set: function(_){height=_;}},
        maxBoxWidth: {get: function(){return maxBoxWidth;}, set: function(_){maxBoxWidth=_;}},
        x:           {get: function(){return getX;}, set: function(_){getX=_;}},
        value:       {get: function(){return getValue;}, set: function(_){getValue=_;}},
        itemColor:    {get: function(){return getColor;}, set: function(_){getColor=_;}},
        outliers:     {get: function(){return getOlItems;}, set: function(_){getOlItems=_;}},
        outlierValue: {get: function(){return getOlValue;}, set: function(_){getOlValue=_;}},
        outlierLabel: {get: function(){return getOlLabel;}, set: function(_){getOlLabel=_;}},
        outlierColor: {get: function(){return getOlColor;}, set: function(_){getOlColor=_;}},
        plotType: {get: function(){return plotType;}, set: function(_){plotType=_;}}, // plotType of background: 'box', 'violin' - default: 'box'
        observationType:  {get: function(){return observationType;}, set: function(_){observationType=_;}}, // type of observations to show: 'random', 'swarm', 'line' - default: false (don't show observations)
        whiskerDef:  {get: function(){return whiskerDef;}, set: function(_){whiskerDef=_;}}, // type of whisker to render: 'iqr', 'minmax', 'stddev' - default: iqr
        notchBox:  {get: function(){return notchBox;}, set: function(_){notchBox=_;}}, // bool whether to notch box
        colorGroup:  {get: function(){return colorGroup;}, set: function(_){colorGroup=_;}}, // data key to use to set color group of each x-category - default: don't group TODO -> better word for this?
        showMiddle:  {get: function(){return showMiddle;}, set: function(_){showMiddle=_;}}, // add a mean or median line to the data - default: don't show, must be one of 'mean' or 'median'
        bandwidth:  {get: function(){return bandwidth;}, set: function(_){bandwidth=_;}}, // bandwidth for kde calculation, can be float or str, if str, must be one of scott or silverman
        resolution:  {get: function(){return resolution;}, set: function(_){resolution=_;}}, // resolution for kde calculation, default 50
        xScale:  {get: function(){return xScale;}, set: function(_){xScale=_;}},
        yScale:  {get: function(){return yScale;}, set: function(_){yScale=_;}},
        colorGroupSizeScale:  {get: function(){return colorGroupSizeScale;}, set: function(_){colorGroupSizeScale=_;}},
        colorGroupColorScale:  {get: function(){return colorGroupColorScale;}, set: function(_){colorGroupColorScale=_;}},
        xDomain: {get: function(){return xDomain;}, set: function(_){xDomain=_;}},
        yDomain: {get: function(){return yDomain;}, set: function(_){yDomain=_;}},
        xRange:  {get: function(){return xRange;}, set: function(_){xRange=_;}},
        yRange:  {get: function(){return yRange;}, set: function(_){yRange=_;}},
        id:          {get: function(){return id;}, set: function(_){id=_;}},

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
