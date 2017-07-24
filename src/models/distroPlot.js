nv.models.distroPlot = function() {
    "use strict";

    // IMPROVEMENTS:
    // legend click hide data not working
    // cleanup tooltip to look like candlestick example (don't need color square for everything)
    // extend y scale range to min/max data better visually
    // tips of violins need to be cut off if very long
    // transition from box to violin not great since box only has a few points, and violin has many - need to generate box with as many points as violin

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
        getNl = function(d) { return d.values.nl },
        getNu = function(d) { return d.values.nu },
        getMean = function(d) { return d.values.mean },
        getWl = function(d) { return d.values.wl[whiskerDef] },
        getWh = function(d) { return d.values.wu[whiskerDef] },
        getMin = function(d) { return d.values.min },
        getMax = function(d) { return d.values.max },
        getDev = function(d) { return d.values.dev },
        getValsObj = function(d) { return d.values.observations; },
        getValsArr = function(d) { return d.values.observations.map(function(e) { return e.y }); },
        plotType, // type of background: 'box', 'violin', 'none'/false - default: 'box' - 'none' will activate random scatter automatically
        observationType = false, // type of observations to show: 'random', 'swarm', 'line', 'centered' - default: false (don't show any observations, even if an outlier)
        whiskerDef = 'iqr', // type of whisker to render: 'iqr', 'minmax', 'stddev' - default: iqr
        hideWhiskers = false,
        notchBox = false, // bool whether to notch box
        colorGroup = false, // if specified, each x-category will be split into groups, each colored
        showMiddle = false,
        showOnlyOutliers = true, // show only outliers in box plot
        jitter = 0.7, // faction of that jitter should take up in 'random' observationType, must be in range [0,1]; see jitterX(), default 0.7
        squash = true, // whether to squash sparse distribution of color groups towards middle of x-axis position, default is true
        bandwidth = 'scott', // bandwidth for kde calculation, can be float or str, if str, must be one of scott or silverman
        resolution = 50,
        observationRadius = 3,
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
     * @param (float) fract - fraction of width that jitter should take up; e.g. 1
     *    will use entire width, 0.25 will use 25% of width
     * @returns {number}
     */
    function jitterX(width, frac) {
        if (typeof frac === 'undefined') frac = .7
        frac = d3.min([1, frac]); // max should be 1
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
    function calcBandwidth(x, type) {

        if (typeof type === 'undefined') type = 'scott';

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
     * NOTE: this will also setup the yScale and xScale.
     *
     * @param (list) dat - input data formatted as list of objects,
     *   with an object key that must exist when accessed by getX()
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
     *      observations: [{y:XX,..},..],
     *      key: XX,
     *      kdeDat: XX,
     *      nu: XX,
     *      nl: XX,
     *    }
     *  },
     *  ...
     *  ]
     * for violin plotType:
     * [{
     *    key : YY,
     *    values: {
     *      original: [{y:XX,..},..]
     *    }
     *  },
     *  ...
     *  ]
     * where YY are those keys in dat that define the
     * x-axis and which are defined by .x()
     */
    function prepData(dat) {

        // helper function to calcuate the various boxplot stats
        function calcStats(v, xGroup) {
            var q1 = d3.quantile(v, 0.25);
            var q3 = d3.quantile(v, 0.75);
            var iqr = q3 - q1;

            /* whisker definitions:
             *  - iqr: also known as Tukey boxplot, the lowest datum still within 1.5 IQR of the lower quartile, and the highest datum still within 1.5 IQR of the upper quartile
             *  - minmax: the minimum and maximum of all of the data
             *  - sttdev: one standard deviation above and below the mean of the data
             */
            var wl = {iqr: q1 - 1.5 * iqr, minmax: d3.min(v), stddev: d3.mean(v) - d3.deviation(v)};
            var wu = {iqr: q3 + 1.5 * iqr, minmax: d3.max(v), stddev: d3.mean(v) + d3.deviation(v)};
            var median = d3.median(v);
            var mean = d3.mean(v);

            var observations = d3.beeswarm()
                .data(v)
                .radius(observationRadius+1)
                .orientation('vertical')
                .side('symmetric')
                .distributeOn(function(e) { return yScale(e); })
                .arrange()

            // add group info for tooltip
            observations.map(function(e,i) { 
                e.key = xGroup; 
                e.isOutlier = (e.datum < wl.iqr || e.datum > wu.iqr) // add isOulier meta for proper class assignment
                e.isOutlierStdDev = (e.datum < wl.stddev || e.datum > wu.stddev) // add isOulier meta for proper class assignment
            })

            // calculate bandwidth if no number is provided
            if(isNaN(parseFloat(bandwidth))) { // if not is float
                if (['scott','silverman'].indexOf(bandwidth) != -1) {
                    bandwidth = calcBandwidth(v, bandwidth);
                } else {
                    bandwidth = calcBandwidth(v); // calculate with default 'scott'
                }
            }
            var kde = kernelDensityEstimator(eKernel(bandwidth), yScale.ticks(resolution));
            var kdeDat = kde(v);

            // make a new vertical for each group
            var tmpScale = d3.scale.linear()
                .domain([0, d3.max(kdeDat, function (e) { return e.y;})])
                .clamp(true);
            yVScale.push(tmpScale);

            var reformat = {
                count: v.length,
                sum: d3.sum(v),
                mean: mean,
                q1: q1,
                q2: median,
                q3: q3,
                wl: wl,
                wu: wu,
                iqr: iqr,
                min: d3.min(v),
                max: d3.max(v),
                dev: d3.deviation(v),
                observations: observations,
                key: xGroup,
                kde: kdeDat,
                nu: median + 1.57 * iqr / Math.sqrt(v.length), // upper notch
                nl: median - 1.57 * iqr / Math.sqrt(v.length), // lower notch
            };

            if (colorGroup) {reformatDatFlat.push({key: xGroup, values: reformat});}

            return reformat;
        }

        // TODO not DRY
        // couldn't find a conditional way of doing the key() grouping
        var formatted;
        if (!colorGroup) {
            formatted = d3.nest()
                .key(function(d) { return getX(d); })
                .rollup(function(v) {
                    var sortDat = v.map(function(d) {
                        return getValue(d);
                    }).sort(d3.ascending);
                    return calcStats(sortDat);
                })
                .entries(dat);
        } else {
            formatted = d3.nest()
                .key(function(d) { return getX(d); })
                .key(function(d) { return colorGroup(d); })
                .rollup(function(v) {
                    var xGroup = getX(v[0])
                    var sortDat = v.map(function(d) {
                        allColorGroups.add(colorGroup(d));
                        return getValue(d);
                    }).sort(d3.ascending);
                    return calcStats(sortDat, xGroup);
                })
                .entries(dat);
        }

        // add series index for object constancy
        formatted.forEach(function(d,i) {
            d.series = i;
        });
        return formatted;
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
     * Makes the svg polygon string for a boxplot in either a notched
     * or square version
     *
     * NOTE: this actually only draws the left half of the box, since
     * the shape is symmetric (and since this is how violins are drawn)
     * we can simply generate half the box and mirror it.
     *
     * @param boxLeft {float} - left position of box
     * @param notchLeft {float} - left position of notch
     * @param dat {obj} - box plot data that was run through prepDat, must contain
     *      data for Q1, median, Q2, notch upper and notch lower
     * @returns {string} A string in the proper format for a svg polygon
     */
    function makeNotchBox(boxLeft, notchLeft, boxCenter, dat) {

        var boxPoints;
        var y = showMiddle == 'mean' ? getMean(dat) : getQ2(dat); // if showMiddle is not specified, we still want to notch boxes on 'median'
        if (notchBox) {
            boxPoints = [
                    {x:boxCenter, y:yScale(getQ1(dat))},
                    {x:boxLeft, y:yScale(getQ1(dat))},
                    {x:boxLeft, y:yScale(getNl(dat))},
                    {x:notchLeft, y:yScale(y)},
                    {x:boxLeft, y:yScale(getNu(dat))},
                    {x:boxLeft, y:yScale(getQ3(dat))},
                    {x:boxCenter, y:yScale(getQ3(dat))},
                ];
        } else {
            boxPoints = [
                    {x:boxCenter, y:yScale(getQ1(dat))},
                    {x:boxLeft, y:yScale(getQ1(dat))},
                    {x:boxLeft, y:yScale(y)}, // repeated point so that transition between notched/regular more smooth
                    {x:boxLeft, y:yScale(y)},
                    {x:boxLeft, y:yScale(y)}, // repeated point so that transition between notched/regular more smooth
                    {x:boxLeft, y:yScale(getQ3(dat))},
                    {x:boxCenter, y:yScale(getQ3(dat))},
                ];
        }

        return boxPoints;
    }

    /**
     * Given an x-axis group, return the available color groups within it
     * provided that colorGroups is set, if not, x-axis group is returned
     */
    function getAvailableColorGroups(x) {
        if (!colorGroup) return x;
        var tmp = reformatDat.find(function(d) { return d.key == x });
        return tmp.values.map(function(d) { return d.key }).sort(d3.ascending);
    }

    /**
     * Used to squash color groups together in cases where some are missing
     *  
     * Not all color groups are guaranteed to exist in the dataset; in sparse
     * cases this will spread the color groups widely along the x-group position.
     * This function will bring these color groups back together, towards the
     * center line of the x-group position.
     *
     * @param a (str) - the color group assignment
     * @param b (str) - the x-group the color group is nested in
     *
     * @return (str) - the converted color group assignment needed to
     *                 all color groups close together.
     */
    function squashGroups(a,b) {

        if (squash) {
            var availableColorGroups = getAvailableColorGroups(b);
            var allColorGroups = colorGroupSizeScale.domain();
            var shift = Math.floor(allColorGroups.length / availableColorGroups.length);
            var sliceColorGroups = allColorGroups.slice(shift, availableColorGroups.length + shift);
            var convert = d3.scale.ordinal()
                            .domain(availableColorGroups)
                            .range(sliceColorGroups);
            return convert(a);
        } else {
            return a;
        }
    }

    // return true if point is an outlier
    function isOutlier(d) {
        return (whiskerDef == 'iqr' && d.isOutlier) || (whiskerDef == 'stddev' && d.isOutlierStdDev)
    }

    //============================================================
    // Private Variables
    //------------------------------------------------------------

    var allColorGroups = d3.set()
    var yVScale = [], reformatDat, reformatDatFlat = [];
    var renderWatch = nv.utils.renderWatch(dispatch, duration);
    var availableWidth, availableHeight;

    function chart(selection) {
        renderWatch.reset();
        selection.each(function(data) {
            availableWidth = width - margin.left - margin.right,
            availableHeight = height - margin.top - margin.bottom;

            container = d3.select(this);
            nv.utils.initSVG(container);

            // Setup y-scale for use in beeswarm layout
            yScale.domain(yDomain || d3.extent(data.map(function(d) { return getValue(d)})))
                  .range(yRange || [availableHeight, 0]);

            if (typeof reformatDat === 'undefined') reformatDat = prepData(data); // this prevents us from reformatted data all the time


            // setup xscale
            xScale.rangeBands(xRange || [0, availableWidth], 0.1)
                  .domain(xDomain || reformatDat.map(function(d) { return d.key }).sort(d3.ascending))

            // Setup containers and skeleton of chart
            var wrap = container.selectAll('g.nv-wrap').data([reformatDat]);
            var wrapEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap');
            wrap.watchTransition(renderWatch, 'nv-wrap: wrap')
                .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')'); 
            
            var areaEnter,
                distroplots = wrap.selectAll('.nv-distroplot-x-group').data(function(d) { return d }, function(e) { return e.series}); // use series for object constancy

            // rebind new data
            // we don't rebuild individual x-axis groups so that we can update transition them
            // however the data associated with each x-axis grou needs to be updated
            // so we manually update it here
            distroplots.each(function(d,i) {
                d3.select(this).selectAll('line.nv-distroplot-middle').datum(d);
            })

            areaEnter = distroplots.enter()
                .append('g')
                .attr('class', 'nv-distroplot-x-group')
                .style('stroke-opacity', 1e-6).style('fill-opacity', 1e-6)
                .style('fill', function(d,i) { return getColor(d) || color(d,i) })
                .style('stroke', function(d,i) { return getColor(d) || color(d,i) })

            distroplots.exit().remove();

            var rangeBand = function() { return colorGroup ? colorGroupSizeScale.rangeBand() : xScale.rangeBand() };
            var areaWidth = function() { return d3.min([maxBoxWidth,rangeBand() * 0.9]); };
            var areaCenter = function() { return areaWidth()/2; };
            var areaLeft  = function() { return areaCenter() - areaWidth()/2; };
            var areaRight = function() { return areaCenter() + areaWidth()/2; };
            var tickLeft  = function() { return areaCenter() - areaWidth()/5; };
            var tickRight = function() { return areaCenter() + areaWidth()/5; };

            areaEnter.attr('transform', function(d) {
                    return 'translate(' + (xScale(d.key) + (rangeBand() - areaWidth()) * 0.5) + ', 0)';
                });

            distroplots
                .watchTransition(renderWatch, 'nv-distroplot-x-group: distroplots')
                .style('stroke-opacity', 1)
                .style('fill-opacity', 0.5)
                .attr('transform', function(d) {
                    return 'translate(' + (xScale(d.key) + (rangeBand() - areaWidth()) * 0.5) + ', 0)';
                });



            if (colorGroup) {

                // setup a scale for each color group
                // so that we can position g's properly
                colorGroupSizeScale.domain(allColorGroups.values().sort(d3.ascending))
                    .rangeBands([0, xScale.rangeBand() * 0.9], 0.1)

                // setup color scale for coloring groups
                getColor = function(d) { return colorGroupColorScale(d.key) }

                var xGroup = areaEnter.style('stroke-opacity', 1e-6).style('fill-opacity', 1e-6)
                    .selectAll('g.nv-colorGroup')
                    .data(function(d) { return d.values; })

                areaEnter = xGroup.enter()
                    .append('g')
                    .attr('class','nv-colorGroup')
                    .attr('transform', function(d) { return 'translate(' + (colorGroupSizeScale(squashGroups(d.key, d.values.key)) + colorGroupSizeScale.rangeBand() * 0.05) + ',0)'; }) 
                    .style('fill', function(d,i) { return getColor(d) || color(d,i) })
                    .style('stroke', function(d,i) { return getColor(d) || color(d,i) })

                distroplots.selectAll('.nv-colorGroup')
                    .watchTransition(renderWatch, 'nv-colorGroup xGroup')
                    .attr('transform', function(d) { return 'translate(' + (colorGroupSizeScale(squashGroups(d.key, d.values.key)) + colorGroupSizeScale.rangeBand() * 0.05) + ',0)'; }) 

                distroplots = d3.selectAll('.nv-colorGroup'); // redefine distroplots as all existing distributions
            }




            // set range for violin scale
            yVScale.map(function(d) { d.range([areaWidth()/2, 0]) });

            // ----- add the SVG elements for each plot type -----

            if (!observationType && !plotType) observationType = 'random'; // activate scatter plots if not already on

            // conditionally append whisker lines
            areaEnter.each(function(d,i) {
                var box = d3.select(this);
                [getWl, getWh].forEach(function (f) {
                    var key = (f === getWl) ? 'low' : 'high';
                    box.append('line')
                      .style('opacity', function() { return !hideWhiskers ? '0' : '1' })
                      .attr('class', 'nv-distroplot-whisker nv-distroplot-' + key);
                    box.append('line')
                      .style('opacity', function() { return hideWhiskers ? '0' : '1' })
                      .attr('class', 'nv-distroplot-tick nv-distroplot-' + key);
                });
            });

            // update whisker lines and ticks
            [getWl, getWh].forEach(function (f) {
                var key = (f === getWl) ? 'low' : 'high';
                var endpoint = (f === getWl) ? getQ1 : getQ3;
                distroplots.select('line.nv-distroplot-whisker.nv-distroplot-' + key)
                  .watchTransition(renderWatch, 'nv-distroplot-x-group: distroplots')
                    .attr('x1', areaCenter())
                    .attr('y1', function(d) { return plotType=='box' ? yScale(f(d)) : yScale(getQ2(d)); })
                    .attr('x2', areaCenter())
                    .attr('y2', function(d) { return plotType=='box' ? yScale(endpoint(d)) : yScale(getQ2(d)); })
                    .style('opacity', function() { return hideWhiskers ? '0' : '1' })
                distroplots.select('line.nv-distroplot-tick.nv-distroplot-' + key)
                  .watchTransition(renderWatch, 'nv-distroplot-x-group: distroplots')
                    .attr('x1', function(d) { return plotType=='box' ? tickLeft() : areaCenter()} )
                    .attr('y1', function(d,i) { return plotType=='box' ? yScale(f(d)) : yScale(getQ2(d)); })
                    .attr('x2', function(d) { return plotType=='box' ? tickRight() : areaCenter()} )
                    .attr('y2', function(d,i) { return plotType=='box' ? yScale(f(d)) : yScale(getQ2(d)); })
                    .style('opacity', function() { return (hideWhiskers || plotType!=='box') ? '0' : '1' })
            });

            [getWl, getWh].forEach(function (f) {
                var key = (f === getWl) ? 'low' : 'high';
                areaEnter.selectAll('.nv-distroplot-' + key)
                  .on('mouseover', function(d,i,j) {
                      d3.select(this.parentNode).selectAll('line.nv-distroplot-'+key).classed('hover',true);
                      dispatch.elementMouseover({
                          value: key == 'low' ? 'Lower whisker' : 'Upper whisker',
                          series: { key: f(d).toFixed(2), color: getColor(d) || color(d,j) },
                          e: d3.event
                      });
                  })
                  .on('mouseout', function(d,i,j) {
                      d3.select(this.parentNode).selectAll('line.nv-distroplot-'+key).classed('hover',false);
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

            // setup boxes as 4 parts: left-area, left-line, right-area, right-line,
            // this way we can transition to a violin
            areaEnter.each(function(d,i) {
                var violin = d3.select(this);

                ['left','right'].forEach(function(side) {
                    ['line','area'].forEach(function(d) {
                        violin.append('path')
                            .attr('class', 'nv-distribution-' + d + ' nv-distribution-' + side)
                            .attr("transform", "rotate(90,0,0)   translate(0," + (side == 'left' ? -areaWidth() : 0) + ")" + (side == 'left' ? '' : ' scale(1,-1)')); // rotate violin
                    })

                })

                areaEnter.selectAll('.nv-distribution-line')
                    .style('fill','none')
                areaEnter.selectAll('.nv-distribution-area')
                    .style('stroke','none')
                    .style('opacity',0.7)

            });

            // transitions
            distroplots.each(function(d,i) {
                var violin = d3.select(this);
                var objData = plotType == 'box' ? makeNotchBox(areaLeft(), tickLeft(), areaCenter(), d) : d.values.kde;
                violin.selectAll('path')
                    .datum(objData)
        
                var tmpScale = yVScale[i];

                var interp = plotType=='box' ? 'linear' : 'cardinal';

                ['left','right'].forEach(function(side) {

                    // line
                    distroplots.selectAll('.nv-distribution-line.nv-distribution-' + side)
                      .watchTransition(renderWatch, 'nv-distribution-line: distroplots')
                        .attr("d", d3.svg.line()
                                .x(function(e) { return plotType=='box' ? e.y : yScale(e.x); })
                                .y(function(e) { return plotType=='box' ? e.x : tmpScale(e.y) })
                                .interpolate(interp)
                        )
                        .attr("transform", "rotate(90,0,0)   translate(0," + (side == 'left' ? -areaWidth() : 0) + ")" + (side == 'left' ? '' : ' scale(1,-1)')); // rotate violin

                    // area
                    distroplots.selectAll('.nv-distribution-area.nv-distribution-' + side)
                      .watchTransition(renderWatch, 'nv-distribution-line: distroplots')
                        .attr("d", d3.svg.area()
                                .x(function(e) { return plotType=='box' ? e.y : yScale(e.x); })
                                .y(function(e) { return plotType=='box' ? e.x : tmpScale(e.y) })
                                .y0(areaWidth()/2)
                                .interpolate(interp)
                        )
                        .attr("transform", "rotate(90,0,0)   translate(0," + (side == 'left' ? -areaWidth() : 0) + ")" + (side == 'left' ? '' : ' scale(1,-1)')); // rotate violin

                })

            })

            // tooltip events
            distroplots.selectAll('path')
                .on('mouseover', function(d,i,j) {
                    d = d3.select(this.parentNode).datum(); // grab data from parent g
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
                            { key: 'mean', value: getMean(d).toFixed(2), color: getColor(d) || color(d,j) },
                            { key: 'std. dev.', value: getDev(d).toFixed(2), color: getColor(d) || color(d,j) },
                        ],
                        data: d,
                        index: i,
                        e: d3.event
                    });
                })
                .on('mouseout', function(d,i,j) {
                    d3.select(this).classed('hover', false);
                    d = d3.select(this.parentNode).datum(); // grab data from parent g
                    dispatch.elementMouseout({
                        key: d.key,
                        value: 'Group ' + d.key + ' stats',
                        series: [
                            { key: 'max', value: getMax(d).toFixed(2), color: getColor(d) || color(d,j) },
                            { key: 'Q3', value: getQ3(d).toFixed(2), color: getColor(d) || color(d,j) },
                            { key: 'Q2', value: getQ2(d).toFixed(2), color: getColor(d) || color(d,j) },
                            { key: 'Q1', value: getQ1(d).toFixed(2), color: getColor(d) || color(d,j) },
                            { key: 'min', value: getMin(d).toFixed(2), color: getColor(d) || color(d,j) },
                            { key: 'mean', value: getMean(d).toFixed(2), color: getColor(d) || color(d,j) },
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


            // median/mean line
            areaEnter.append('line')
                .attr('class', function(d) { return 'nv-distroplot-middle'}) 


            distroplots.selectAll('line.nv-distroplot-middle')
                .watchTransition(renderWatch, 'nv-distroplot-x-group: distroplots line')
                .attr('x1', notchBox ? tickLeft : plotType == 'box' ? areaLeft : tickLeft())
                .attr('y1', function(d,i,j) { return showMiddle == 'mean' ? yScale(getMean(d)) : yScale(getQ2(d)); })
                .attr('x2', notchBox ? tickRight : plotType == 'box' ? areaRight : tickRight())
                .attr('y2', function(d,i) { return showMiddle == 'mean' ? yScale(getMean(d)) : yScale(getQ2(d)); })
                .style('opacity', showMiddle ? '1' : '0');


            // tooltip
            distroplots.selectAll('.nv-distroplot-middle')
                .on('mouseover', function(d,i,j) {
                    if (d3.select(this).style('opacity') == 0) return; // don't show tooltip for hidden lines
                    var fillColor = d3.select(this.parentNode).style('fill'); // color set by parent g fill
                    d3.select(this).classed('hover', true);
                    dispatch.elementMouseover({
                        value: showMiddle == 'mean' ? 'Mean' : 'Median',
                        series: { key: showMiddle == 'mean' ? getMean(d).toFixed(2) : getQ2(d).toFixed(2), color: fillColor },
                        e: d3.event
                    });
                })
                .on('mouseout', function(d,i,j) {
                    if (d3.select(this).style('opacity') == 0) return; // don't show tooltip for hidden lines
                    d3.select(this).classed('hover', false);
                    var fillColor = d3.select(this.parentNode).style('fill'); // color set by parent g fill
                    dispatch.elementMouseout({
                        value: showMiddle == 'mean' ? 'Mean' : 'Median',
                        series: { key: showMiddle == 'mean' ? getMean(d).toFixed(2) : getQ2(d).toFixed(2), color: fillColor },
                        e: d3.event
                    });
                })
                .on('mousemove', function(d,i) {
                    dispatch.elementMousemove({e: d3.event});
                });


            // setup observations
            // create DOMs even if not requested (and hide them), so that
            // we can do updates
            var obsWrap = distroplots.selectAll(observationType == 'lines' ? '.nv-lines' : '.nv-distroplot-observation')
                .data(function(d) { return getValsObj(d); });

            var scatter = obsWrap.enter()
                .append('circle')
                .attr('class', function(d,i,j) { return 'nv-distroplot-observation ' + (isOutlier(d) && plotType == 'box' ? 'nv-distroplot-outlier' : 'nv-distroplot-non-outlier')})
                .style({'z-index': 9000, 'opacity': 0})

            var lines = obsWrap.enter()
                .append('line')
                .attr('class', 'nv-distroplot-observation')
                .style('stroke-width', 1)
                .style({'stroke': d3.rgb(85, 85, 85), 'opacity': 0})

            obsWrap.exit().remove();

            // TODO only call when window finishes resizing, otherwise jitterX call slows things down
            // transition observations
            if (observationType == 'line') {
                distroplots.selectAll('line.nv-distroplot-observation')
                  .watchTransition(renderWatch, 'nv-distrolot-x-group: nv-distoplot-observation')
                    .attr("x1", tickLeft() + areaWidth()/4)
                    .attr("x2", tickRight() - areaWidth()/4)
                    .attr('y1', function(d) { return yScale(d.datum)})
                    .attr('y2', function(d) { return yScale(d.datum)});
            } else {
                distroplots.selectAll('circle.nv-distroplot-observation')
                  .watchTransition(renderWatch, 'nv-distroplot: nv-distroplot-observation')
                    .attr('class', function(d) { return 'nv-distroplot-observation ' + (isOutlier(d) && plotType == 'box' ? 'nv-distroplot-outlier' : 'nv-distroplot-non-outlier')})
                    .attr('cx', function(d) { return observationType == 'swarm' ? d.x + areaWidth()/2 : observationType == 'random' ? jitterX(areaWidth(), jitter) : areaWidth()/2; })
                    .attr('cy', function(d) { return observationType == 'swarm' ? d.y : yScale(d.datum); })
                    .attr('r', observationRadius);

            }

            // set opacity on outliers/non-outliers
            distroplots.selectAll('.nv-distroplot-observation') // don't select with class (.nv-distroplot-outlier) since it's not guaranteed to be set yet
              .watchTransition(renderWatch, 'nv-distroplot: nv-distroplot-observation')
                .style('opacity', function(d) { 
                    if (observationType === false) {
                        return 0;
                    } else if (plotType == 'box') {
                        if (!showOnlyOutliers || isOutlier(d)) {
                            return 1;
                        } 
                    } else if (observationType !== false) {
                        return 1;
                    }
                    return 0;
                })

        
            distroplots.selectAll((observationType=='line'?'circle':'line')+'.nv-distroplot-observation')
              .watchTransition(renderWatch, 'nv-distroplot: nv-distoplot-observation')
                .style('opacity',0)


            // tooltip events for observations
            distroplots.selectAll('.nv-distroplot-observation')
                    .on('mouseover', function(d,i,j) {
                        var pt = d3.select(this);
                        if (pt.style('opacity') == 0) return; // don't show tooltip for hidden observation
                        var fillColor = d3.select(this.parentNode).style('fill'); // color set by parent g fill
                        pt.classed('hover', true);
                        dispatch.elementMouseover({
                            value: (plotType == 'box' && isOutlier(d)) ? 'Outlier' : 'Observation',
                            series: { key: d.datum.toFixed(2), color: fillColor },
                            e: d3.event
                        });
                    })
                    .on('mouseout', function(d,i,j) {
                        var pt = d3.select(this);
                        if (pt.style('opacity') == 0) return; // don't show tooltip for hidden observation
                        var fillColor = d3.select(this.parentNode).style('fill'); // color set by parent g fill
                        pt.classed('hover', false);
                        dispatch.elementMouseout({
                            value: (plotType == 'box' && isOutlier(d)) ? 'Outlier' : 'Observation',
                            series: { key: d.datum.toFixed(2), color: fillColor },
                            e: d3.event
                        });
                    })
                    .on('mousemove', function(d,i) {
                        dispatch.elementMousemove({e: d3.event});
                    });

        });

        renderWatch.renderEnd('nv-distroplot-x-group immediate');
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
        plotType: {get: function(){return plotType;}, set: function(_){plotType=_;}}, // plotType of background: 'box', 'violin' - default: 'box'
        observationType:  {get: function(){return observationType;}, set: function(_){observationType=_;}}, // type of observations to show: 'random', 'swarm', 'line', 'point' - default: false (don't show observations)
        whiskerDef:  {get: function(){return whiskerDef;}, set: function(_){whiskerDef=_;}}, // type of whisker to render: 'iqr', 'minmax', 'stddev' - default: iqr
        notchBox:  {get: function(){return notchBox;}, set: function(_){notchBox=_;}}, // bool whether to notch box
        hideWhiskers: {get: function(){return hideWhiskers;}, set: function(_){hideWhiskers=_;}},
        colorGroup:  {get: function(){return colorGroup;}, set: function(_){colorGroup=_;}}, // data key to use to set color group of each x-category - default: don't group
        showMiddle:  {get: function(){return showMiddle;}, set: function(_){showMiddle=_;}}, // add a mean or median line to the data - default: don't show, must be one of 'mean' or 'median'
        bandwidth:  {get: function(){return bandwidth;}, set: function(_){bandwidth=_;}}, // bandwidth for kde calculation, can be float or str, if str, must be one of scott or silverman
        resolution:  {get: function(){return resolution;}, set: function(_){resolution=_;}}, // resolution for kde calculation, default 50
        xScale:  {get: function(){return xScale;}, set: function(_){xScale=_;}},
        yScale:  {get: function(){return yScale;}, set: function(_){yScale=_;}},
        showOnlyOutliers:  {get: function(){return showOnlyOutliers;}, set: function(_){showOnlyOutliers=_;}}, // show only outliers in box plot, default true
        jitter:  {get: function(){return jitter;}, set: function(_){jitter=_;}}, // faction of that jitter should take up in 'random' observationType, must be in range [0,1]; see jitterX(), default 0.7
        squash:  {get: function(){return squash;}, set: function(_){squash=_;}}, // whether to squash sparse distribution of color groups towards middle of x-axis position
        observationRadius:  {get: function(){return observationRadius;}, set: function(_){observationRadius=_;}},
        colorGroupSizeScale:  {get: function(){return colorGroupSizeScale;}, set: function(_){colorGroupSizeScale=_;}},
        colorGroupColorScale:  {get: function(){return colorGroupColorScale;}, set: function(_){colorGroupColorScale=_;}},
        xDomain: {get: function(){return xDomain;}, set: function(_){xDomain=_;}},
        yDomain: {get: function(){return yDomain;}, set: function(_){yDomain=_;}},
        xRange:  {get: function(){return xRange;}, set: function(_){xRange=_;}},
        yRange:  {get: function(){return yRange;}, set: function(_){yRange=_;}},
        recalcData: {get: function() { reformatDat = prepData(data); } },
        itemColor:    {get: function(){return getColor;}, set: function(_){getColor=_;}},
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
