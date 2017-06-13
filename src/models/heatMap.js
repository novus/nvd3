// http://bl.ocks.org/tjdecke/5558084
nv.models.heatMap = function() {
    "use strict";

    //============================================================
    // Public Variables with Default Settings
    //------------------------------------------------------------

    var margin = {top: 0, right: 0, bottom: 0, left: 0}
        , width = 960
        , height = 500
        , id = Math.floor(Math.random() * 10000) //Create semi-unique ID in case user doesn't select one
        , container
        , x = d3.scale.ordinal()
        , y = d3.scale.ordinal()
        , colorScale = false // if not set by user a color brewer quantized scale (RdYlBu 11) is setup
        , getX = function(d) { return d.column }
        , getY = function(d) { return d.row }
        , getXMeta = function(d) { return d.columnMeta }
        , getYMeta = function(d) { return d.rowMeta }
        , getColor = function(d) { return d.color }
        , showValues = true
        , valueFormat = d3.format(',.1f')
        , cellAspectRatio = false
        , xDomain
        , yDomain
        , normalize = false
        , highContrastText = true
        , xRange
        , yRange
        , datX = {} // unique data row values as keys, with increment counter as value
        , datY = {} // unique data row values as keys, with increment counter as value
        , datZ = [] // all cell values as array
        , datRowMeta = new Map() // ordered obj of row labels mapped to row metadata category
        , datColumnMeta = new Map() // ordered obj of col labels mapped to col metadata category
        , datRowMetaUnique = [] // unique, ordered list of row metadata values
        , datColumnMetaUnique = [] // unique, ordered list of col metadata values
        , cellHeight
        , cellWidth
        , dispatch = d3.dispatch('chartClick', 'elementClick', 'elementDblClick', 'elementMouseover', 'elementMouseout', 'elementMousemove', 'renderEnd')
        , rectClass = 'heatMap'
        , groupRowMeta = false
        , groupColumnMeta = false
        , duration = 250
        ;

    //============================================================
    // Aux helper function for heatmap
    //------------------------------------------------------------

    // return true if row metadata specified by user
    function hasRowMeta(data) {
        return typeof getYMeta(data[0]) !== 'undefined';
    }
    // return true if col metadata specified by user
    function hasColumnMeta(data) {
        return typeof getXMeta(data[0]) !== 'undefined';
    }

    // choose high contrast text color based on background
    // shameful steal: https://github.com/alexandersimoes/d3plus/blob/master/src/color/text.coffee
    function cellTextColor(bgColor) {
        var rgbColor = d3.rgb(bgColor);
        var r = rgbColor.r;
        var g = rgbColor.g;
        var b = rgbColor.b;
        var yiq = (r * 299 + g * 587 + b * 114) / 1000;
        return yiq >= 128 ? "#404040" : "#EDEDED"; // dark text else light text
    }

    /* go through heatmap data and generate array of values
     * for each row/column or for entire dataset; for use in
     * calculating means/medians of data for normalizing
     * @param {str} axis - 'row', 'col' or null
     *
     * @returns {row/column index: [array of values for row/col]}
     * note that if axis is not specified, the return will be
     * {0: [all values in heatmap]}
     */
    function getHeatmapDat(axis) {
        var vals = {};

        data.some(function(cell, i) {
            if (typeof axis !== 'undefined' && axis !== null) { // if calculating row/column stat
                if (axis == 'row') {
                    if (!(cell.iy in vals)) vals[cell.iy] = [];
                    vals[cell.iy].push(getColor(cell));
                }
                if (axis == 'col') {
                    if (!(cell.ix in vals)) vals[cell.ix] = [];
                    vals[cell.ix].push(getColor(cell));
                }
            } else if (axis == null) { // if calculating stat over entire dataset
                vals = {0: datZ}; // previously calculated
                return true; // break
            }
        })

        return vals;
    }

    // calculate the median absolute deviation of the given array of data
    // https://en.wikipedia.org/wiki/Median_absolute_deviation
    // MAD = median(abs(Xi - median(X)))
    function mad(dat) {
        var med = d3.median(dat);
        var vals = dat.map(function(d) { return Math.abs(d - med); })
        return d3.median(vals);
    }

    /* normalize heatmap cell value by calculated metric
     * @param {obj} dat - heatmap input data formatted as array of objects
     * @param {obj} calc - return of getHeatMapDat()
     * @param {str} axis - 'row', 'col' or null
     * @param {str} agg - 'mean' or 'median' - defaults to 'median'
     * @param {bool} scale - scale by standard deviation or median absolute deviation
     */
    function normHeatmapDat(dat, calc, axis, agg, scale) {

        // calculate mean or median
        // calculate standard dev or median absolute deviation
        var stat = {};
        var dev = {};
        for (var key in calc) {
            stat[key] = agg == 'mean' ? d3.mean(calc[key]) : d3.median(calc[key]);
            if (scale) dev[key] = agg == 'mean' ? d3.deviation(calc[key]) : mad(calc[key]);
        }

        dat.forEach(function(cell, i) {
            if (axis == 'row') {
                var key = cell.iy;
            } else if (axis == 'col') {
                var key = cell.ix;
            } else if (axis == null) {  // if calculating stat over entire dataset
                var key = 0;
            }
            var normVal = getColor(cell) - stat[key];
            if (scale) {
                cell.norm = normVal / dev[key];
            } else {
                cell.norm = normVal;
            }
        })

        return dat;
    }

    // set cell color based on cell value
    // depending on whether it should be normalized or not
    function setCellColor(d) {
        var colorVal = normalize ? d.norm : getColor(d);
        return colorScale(colorVal);
    }

    // extent of heatmap data
    // will take into account normalization if specified
    function heatmapExtent() {
        if (normalize) {
            return d3.extent(data, function(d) { return d.norm; });
        } else {
            return [d3.min(datZ), d3.max(datZ)];
        }
    }

    /* Notes on normalizing data

    normalize must be one of centerX, robustCenterX, centerScaleX, robustCenterScaleX, centerAll, robustCenterAll, centerScaleAll, robustCenterScaleAll
    where X is either 'Row' or 'Column'

    - centerX: subtract row/column mean from cell
    - centerAll: subtract mean of whole data set from cell
    - centerScaleX: scale so that row/column has mean 0 and variance 1 (Z-score)
    - centerScaleAll: scale by overall normalization factor so that the whole data set has mean 0 and variance 1 (Z-score)
    - robustCenterX: subtract row/column median from cell
    - robustCenterScaleX: subtract row/column median from cell and then scale row/column by median absolute deviation
    - robustCenterAll: subtract median of whole data set from cell
    - robustCenterScaleAll: subtract overall median from cell and scale by overall median absolute deviation
    */
    function normalizeHeatmap(data) {

        if (['centerRow',
            'robustCenterRow',
            'centerScaleRow',
            'robustCenterScaleRow',
            'centerColumn',
            'robustCenterColumn',
            'centerScaleColumn',
            'robustCenterScaleColumn',
            'centerAll',
            'robustCenterAll',
            'centerScaleAll',
            'robustCenterScaleAll'].indexOf(normalize) > 0) {
            if (normalize.includes('Row')) {
                var axis = 'row';
                var calc = getHeatmapDat(axis);
                var scale = false;
                var agg = 'mean';

                if (normalize.includes('robust')) {
                    var agg = 'median';
                }
                if (normalize.includes('Scale')) {
                    var scale = true;
                }
            } else if (normalize.includes('Column')) {
                var axis = 'col';
                var calc = getHeatmapDat(axis);
                var scale = false;
                var agg = 'mean';

                if (normalize.includes('robust')) {
                    var agg = 'median';
                }
                if (normalize.includes('Scale')) {
                    var scale = true;
                }
            } else if (normalize.includes('All')) {
                var axis = null;
                var calc = getHeatmapDat()
                var scale = false;
                var agg = 'mean';

                if (normalize.includes('robust')) {
                    var agg = 'median';
                }
                if (normalize.includes('Scale')) {
                    var scale = true;
                }
            }

            normHeatmapDat(data, calc, axis, agg, scale);
        } else {
            normalize = false; // proper normalize option was not provided, disable it so heatmap still shows colors
        }

        return data;
    }


    // restructure incoming data
    // add series index to each cell (d.iz), column (d.ix) and row (d.iy) for reference
    // generate unique set of x & y values (datX & datY)
    function prepHeatmapData(data) {

        // sort data by key if needed
        if (groupRowMeta && groupColumnMeta) {
            data = data.sort(keySortMultiple(getXMeta, getYMeta));
        } else if (groupRowMeta) {
            data = data.sort(keySort(getYMeta));
        } else if (groupColumnMeta) {
            data = data.sort(keySort(getXMeta));
        }

        var ix = 0, iy = 0
        data.forEach(function(cell, i) {
            var valX = getX(cell);
            var valY = getY(cell);
            var valZ = getColor(cell);
            datZ.push(parseInt(valZ));

            if (!(valX in datX)) {
                datX[valX] = ix;
                ix ++;
            }
            if (!(valY in datY)) {
                datY[valY] = iy;
                iy ++;
            }

            // generated ordered objects of row/col metadata
            if (hasRowMeta(data) && !datRowMeta.has(valY)) {
                var metaVal = getYMeta(cell);
                datRowMeta.set(valY, metaVal);
                if (datRowMetaUnique.indexOf(metaVal) == -1) datRowMetaUnique.push(metaVal);
            }
            if (hasColumnMeta(data) && !datColumnMeta.has(valX)) {
                var metaVal = getXMeta(cell);
                datColumnMeta.set(valX, metaVal);
                if (datColumnMetaUnique.indexOf(metaVal) == -1) datColumnMetaUnique.push(metaVal);
            }

            cell.ix = datX[valX];
            cell.iy = datY[valY];
            cell.iz = i;
        });

        // normalize data is needed
        if (normalize) data  = normalizeHeatmap(data);

        return data;

    }



    // https://stackoverflow.com/a/4760279/1153897
    // TODO - sorting on a single axis, will reorder the other axis, user probably doesn't want this ...
    function keySort(getMeta) {
        return function (a,b) {
            return (getMeta(a) < getMeta(b)) ? -1 : (getMeta(a) > getMeta(b)) ? 1 : 0;
        }
    }

    function keySortMultiple() {
        /*
         * save the arguments object as it will be overwritten
         * note that arguments object is an array-like object
         * consisting of the names of the properties to sort by
         */
        var props = arguments;
        return function (obj1, obj2) {
            var i = 0, result = 0, numberOfProperties = props.length;
            /* try getting a different result from 0 (equal)
             * as long as we have extra properties to compare
             */
            while(result === 0 && i < numberOfProperties) {
                result = keySort(props[i])(obj1, obj2);
                i++;
            }
            return result;
        }
    }


    //============================================================
    // Private Variables
    //------------------------------------------------------------

    var x0, y0, colorScale0;
    var renderWatch = nv.utils.renderWatch(dispatch, duration);


    function chart(selection) {
        renderWatch.reset();
        selection.each(function(data) {

            data = prepHeatmapData(data);

            var availableWidth = width - margin.left - margin.right,
                availableHeight = height - margin.top - margin.bottom;

            // available width/height set the cell dimenions unless
            // the aspect ratio is defined - in that case the cell
            // height is adjusted and availableHeight updated
            cellWidth = availableWidth / Object.keys(datX).length;
            cellHeight = cellAspectRatio ? cellWidth / cellAspectRatio : availableHeight / Object.keys(datY).length;
            if (cellAspectRatio) availableHeight = cellHeight * Object.keys(datY).length - margin.top - margin.bottom;

            container = d3.select(this);
            nv.utils.initSVG(container);




            // Setup Scales
            x   .domain(xDomain || Object.keys(datX))
                .rangeBands(xRange || [0, availableWidth]);
            y   .domain(yDomain || Object.keys(datY))
                .rangeBands(yRange || [0, availableHeight]);
            if (!colorScale) {
                colorScale = d3.scale.quantize()
                    .domain(heatmapExtent(data))
                    .range(["#a50026","#d73027","#f46d43","#fdae61","#fee090","#ffffbf","#e0f3f8","#abd9e9","#74add1","#4575b4","#313695"]) // color brewer RdYlBu 11
            }


            //store old scales if they exist
            x0 = x0 || x;
            y0 = y0 || y;
            colorScale0 = colorScale0 || colorScale;

            // Setup containers and skeleton of chart
            var wrap = container.selectAll('g.nv-wrap.nv-heatmap').data([data]);
            var wrapEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap nv-heatmap');
            var gEnter = wrapEnter.append('g');
            var g = wrap.select('g');

            wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');


            // setup cells
            var cells = g.selectAll("g.nv-cell")
                .data(data);
            cells.exit().remove();


            var cellsEnter = cells.enter().append('g')
                .style('opacity', 1e-6) // will transition to full opacity w/ renderWatch
                .on('mouseover', function(d,i) {
                    d3.select(this).classed('hover', true);
                    dispatch.elementMouseover({
                        data: d,
                        index: i,
                        color: d3.select(this).select('rect').style("fill")
                    });
                })
                .on('mouseout', function(d,i) {
                    d3.select(this).classed('hover', false);
                    dispatch.elementMouseout({
                        data: d,
                        index: i,
                        color: d3.select(this).select('rect').style("fill")
                    });
                })
                .on('mousemove', function(d,i) {
                    dispatch.elementMousemove({
                        data: d,
                        index: i,
                        color: d3.select(this).select('rect').style("fill")
                    });
                })

            cellsEnter.append("rect") // will set x,y,width,height with renderWatch...
                .attr("rx", 4)
                .attr("ry", 4)

            cells.style('fill', function(d,i) { return setCellColor(d); })
                .attr("class", "nv-cell")
                .select("rect")
                .attr("class", rectClass)
                .watchTransition(renderWatch, 'heatMap: cells rect')
                .attr("x", function(d) { return d.ix * cellWidth; })
                .attr("y", function(d) { return d.iy * cellHeight; })
                .attr("width", cellWidth)
                .attr("height", cellHeight)

            cells.watchTransition(renderWatch, 'heatMap: cells')
                .style('opacity', 1)

            if (showValues) {
                cellsEnter.append('text')
                    .attr('text-anchor', 'middle')
                ;

                cells.select('text')
                    .text(function(d,i) { return !normalize ? valueFormat(getColor(d)) : valueFormat(d.norm) })
                    .watchTransition(renderWatch, 'heatMap: cells text')
                    .attr("x", function(d) { return d.ix * cellWidth + cellWidth / 2; })
                    .attr("y", function(d) { return d.iy * cellHeight + cellHeight / 2; })
                    .attr("dy", 4)
                    .attr("class","cell-text")
                    .style("fill", function() { return highContrastText ? cellTextColor(d3.select(this.previousSibling).style('fill')) : null; })
                ;
            } else {
                cells.selectAll('text').remove();
            }

            //store old scales for use in transitions on update
            x0 = x.copy();
            y0 = y.copy();
            colorScale0 = colorScale.copy();

        });


        renderWatch.renderEnd('heatMap immediate');
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
        showValues: {get: function(){return showValues;}, set: function(_){showValues=_;}},
        row:       {get: function(){return getX;}, set: function(_){getX=_;}}, // data attribute for horizontal axis
        column:       {get: function(){return getY;}, set: function(_){getY=_;}}, // data attribute for vertical axis
        color:       {get: function(){return getColor;}, set: function(_){getColor=_;}}, // data attribute that sets cell value and color
        xScale:  {get: function(){return x;}, set: function(_){x=_;}},
        yScale:  {get: function(){return y;}, set: function(_){y=_;}},
        colorScale:  {get: function(){return colorScale;}, set: function(_){colorScale=_;}},
        xDomain: {get: function(){return xDomain;}, set: function(_){xDomain=_;}},
        yDomain: {get: function(){return yDomain;}, set: function(_){yDomain=_;}},
        xRange:  {get: function(){return xRange;}, set: function(_){xRange=_;}},
        yRange:  {get: function(){return yRange;}, set: function(_){yRange=_;}},
        rowMeta:       {get: function(){return getYMeta;}, set: function(_){getYMeta=_;}}, // data attribute for horizontal metadata grouping legend
        columnMeta:       {get: function(){return getXMeta;}, set: function(_){getXMeta=_;}}, // data attribute for vertical metadata grouping legend
        cellAspectRatio: {get: function(){return cellAspectRatio;}, set: function(_){cellAspectRatio=_;}}, // cell width / height
        datX:  {get: function(){return datX;}, set: function(_){datX=_;}},
        datY:  {get: function(){return datY;}, set: function(_){datY=_;}},
        datRowMeta:  {get: function(){return datRowMeta;}, set: function(_){datRowMeta=_;}},
        datColumnMeta:  {get: function(){return datColumnMeta;}, set: function(_){datColumnMeta=_;}},
        datRowMetaUnique:  {get: function(){return datRowMetaUnique;}, set: function(_){datRowMetaUnique=_;}},
        datColumnMetaUnique:  {get: function(){return datColumnMetaUnique;}, set: function(_){datColumnMetaUnique=_;}},
        cellHeight:  {get: function(){return cellHeight;}, set: function(_){cellHeight=_;}},
        cellWidth:  {get: function(){return cellWidth;}, set: function(_){cellWidth=_;}},
        normalize:  {get: function(){return normalize;}, set: function(_){normalize=_;}},
        highContrastText:  {get: function(){return highContrastText;}, set: function(_){highContrastText=_;}},
        valueFormat:    {get: function(){return valueFormat;}, set: function(_){valueFormat=_;}},
        id:          {get: function(){return id;}, set: function(_){id=_;}},
        rectClass: {get: function(){return rectClass;}, set: function(_){rectClass=_;}},
        groupRowMeta: {get: function(){return groupRowMeta;}, set: function(_){groupRowMeta=_;}},
        groupColumnMeta: {get: function(){return groupColumnMeta;}, set: function(_){groupColumnMeta=_;}},


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
        }}
    });

    nv.utils.initOptions(chart);


    return chart;
};
