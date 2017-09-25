/* 
Improvements:
- consistenly apply no-hover classes to rect isntead of to containing g, see example CSS style for .no-hover rect, rect.no-hover
- row/column order (user specified) or 'ascending' / 'descending'
- I haven't tested for transitions between changing datasets
*/

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
        , xScale = d3.scale.ordinal()
        , yScale = d3.scale.ordinal()
        , colorScale = d3.scale.quantize() // if not set by user a color brewer quantized scale (RdYlBu 11) is setup
        , getX = function(d) { return d.x }
        , getY = function(d) { return d.y }
        , getCellValue = function(d) { return d.value }
        , showCellValues = true
        , cellValueFormat = d3.format(',.0f')
        , cellAspectRatio = false // width / height of cell
        , cellRadius = 2
        , cellBorderWidth = 4 // pixels between cells
        , normalize = false
        , highContrastText = true
        , xDomain
        , yDomain
        , xMetaColorScale = nv.utils.defaultColor()
        , yMetaColorScale = nv.utils.defaultColor()
        , missingDataColor = '#bcbcbc'
        , missingDataLabel = 'NaN'
        , metaOffset = 5 // spacing between meta rects and cells
        , xRange
        , yRange
        , xMeta
        , yMeta
        , colorRange
        , dispatch = d3.dispatch('chartClick', 'elementClick', 'elementDblClick', 'elementMouseover', 'elementMouseout', 'elementMousemove', 'renderEnd')
        , duration = 250
        , xMetaHeight = function(d) { return cellHeight / 3 }
        , yMetaWidth = function(d) { return cellWidth / 3 }
        ;



    //============================================================
    // Aux helper function for heatmap
    //------------------------------------------------------------
    // choose high contrast text color based on background
    // shameful steal: https://github.com/alexandersimoes/d3plus/blob/master/src/color/text.coffee
    function cellTextColor(bgColor) {

        if (highContrastText) {
            var rgbColor = d3.rgb(bgColor);
            var r = rgbColor.r;
            var g = rgbColor.g;
            var b = rgbColor.b;
            var yiq = (r * 299 + g * 587 + b * 114) / 1000;
            return yiq >= 128 ? "#404040" : "#EDEDED"; // dark text else light text
        } else {
            return 'black';
        }
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
    function getHeatmapValues(data, axis) {
        var vals = {};

        data.some(function(cell, i) {
            if (axis == 'row') {
                if (!(getIY(cell) in vals)) vals[getIY(cell)] = [];
                vals[getIY(cell)].push(getCellValue(cell));
            } else if (axis == 'col') {
                if (!(getIX(cell) in vals)) vals[getIX(cell)] = [];
                vals[getIX(cell)].push(getCellValue(cell));
            } else if (axis == null) { // if calculating stat over entire dataset
                vals = {0: Object.keys(uniqueX).concat(Object.keys(uniqueY))}; 
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


    // set cell color based on cell value
    // depending on whether it should be normalized or not
    function cellColor(d) {
        var colorVal = normalize ? getNorm(d) : getCellValue(d);
        return !isNaN(colorVal) ? colorScale(colorVal) : missingDataColor;
    }

    // return the extent of the color data
    // will take into account normalization if specified
    function colorExtent() {
        return normalize ? d3.extent(prepedData, function(d) { return getNorm(d); }) : d3.extent(uniqueColor);
    }

    /*
     * Normalize input data
     *
     * normalize must be one of centerX, robustCenterX, centerScaleX, robustCenterScaleX, centerAll, 
     * robustCenterAll, centerScaleAll, robustCenterScaleAll where X is either 'Row' or 'Column'
     *
     * - centerX: subtract row/column mean from cell
     * - centerAll: subtract mean of whole data set from cell
     * - centerScaleX: scale so that row/column has mean 0 and variance 1 (Z-score)
     * - centerScaleAll: scale by overall normalization factor so that the whole data set has mean 0 and variance 1 (Z-score)
     * - robustCenterX: subtract row/column median from cell
     * - robustCenterScaleX: subtract row/column median from cell and then scale row/column by median absolute deviation
     * - robustCenterAll: subtract median of whole data set from cell
     * - robustCenterScaleAll: subtract overall median from cell and scale by overall median absolute deviation
     */
    function normalizeData(dat) {
        
        var normTypes = ['centerRow',
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
            'robustCenterScaleAll'];


        if(normTypes.indexOf(normalize) != -1) {

            var xVals = Object.keys(uniqueX), yVals = Object.keys(uniqueY);

            // setup normalization options
            var scale = normalize.includes('Scale') ? true: false,
                agg = normalize.includes('robust') ? 'median': 'mean',
                axis = normalize.includes('Row') ? 'row' : normalize.includes('Column') ? 'col' : null,
                vals = getHeatmapValues(dat, axis);


            // calculate mean or median
            // calculate standard dev or median absolute deviation
            var stat = {};
            var dev = {};
            for (var key in vals) {
                stat[key] = agg == 'mean' ? d3.mean(vals[key]) : d3.median(vals[key]);
                if (scale) dev[key] = agg == 'mean' ? d3.deviation(vals[key]) : mad(vals[key]);
            }


            // do the normalizing
            dat.forEach(function(cell, i) {
                if (axis == 'row') {
                    var key = getIY(cell);
                } else if (axis == 'col') {
                    var key = getIX(cell);
                } else if (axis == null) {  // if calculating stat over entire dataset
                    var key = 0;
                }

                var normVal = getCellValue(cell) - stat[key];
                if (scale) {
                    cell.cellPos.norm = normVal / dev[key];
                } else {
                    cell.cellPos.norm = normVal;
                }
            })

        } else {
            normalize = false; // proper normalize option was not provided, disable it so heatmap still shows colors
        }

        return dat;
    }

    /*
     * Process incoming data for use with heatmap including:
     * - adding a unique key indexer to each data point (idx)
     * - getting a unique list of all x & y values
     * - generating a position index (x & y) for each data point
     *
     * @param data {list} - input data organize as a list of objects
     *
     * @return - copy of input data with additional 'cellPos' key
     *           formatted as {idx: XXX, ix, XXX, iy: XXX}
     *           where idx is a global identifier; ix is an identifier
     *           within each column, and iy is an identifier within
     *           each row. 
     */
    function prepData(data) {

        // reinitialize
        uniqueX = {}, uniqueY = {}, uniqueColor = [], uniqueXMeta = [], uniqueYMeta = [], uniqueCells = [];

        // in order to allow for the flexibility of the user providing either
        // categorical or quantitative data, we're going to position the cells
        // through indices that we increment based on previously seen data
        // this way we can use ordinal() axes even if the data is quantitative
        var ix = 0, iy = 0; // use these indices to position cell in x & y direction
        var combo
        var reformatData = data.filter(function(cell, i) {
            var valX = getX(cell),
                valY = getY(cell),
                valColor = getCellValue(cell);            

            // assemble list of unique values for each dimension
            if (!(valX in uniqueX)) { 
                uniqueX[valX] = ix; 
                ix++;

                 // store and ordered list of col/row metadata values
                if (typeof xMeta === 'function') uniqueXMeta.push(xMeta(cell));
            }

            if (!(valY in uniqueY)) {
                uniqueY[valY] = iy; 
                iy++;

                 // store and ordered list of col/row metadata values
                if (typeof yMeta === 'function') uniqueYMeta.push(yMeta(cell));
            }
            if (!(valColor in uniqueColor)) uniqueColor.push(valColor)


            // TODO - best way to handle the case when input data already has the key 'cellPos'?
            if ('celPos' in cell) return false;

            // for each data point, we generate an object of data
            // needed to properly position each cell
            cell.cellPos = {
                idx: i,
                ix: uniqueX[valX],
                iy: uniqueY[valY],
            }

            // keep track of row & column combinations we've already seen
            // this prevents the same cells from being generated when
            // the user hasn't provided proper data (one value for each
            // row & column).
            // if properly formatted data is not provided, only the first
            // row & column value is used (the rest are ignored)
            combo = String(valX) + '__' + String(valY);
            if (uniqueCells.indexOf(combo) == -1) {
                uniqueCells.push(combo)
                return true
            } else {
                return false; // since we're using .filter() return false so we exclude this row & col combination
            }

        });

        //uniqueX = uniqueX.sort()
        //uniqueY = uniqueY.sort()
        //uniqueColor = uniqueColor.sort()

        // normalize data is needed
        return normalize ? normalizeData(reformatData) : reformatData;

    }

    function removeAllHoverClasses() {
        // remove all hover classes
        d3.selectAll('.cell-hover').classed('cell-hover', false);
        d3.selectAll('.no-hover').classed('no-hover', false);
        d3.selectAll('.row-hover').classed('row-hover', false);
        d3.selectAll('.column-hover').classed('column-hover', false);
    }



    //============================================================
    // Private Variables
    //------------------------------------------------------------

    var prepedData, cellHeight, cellWidth;
    var uniqueX = {}, uniqueY = {}, uniqueColor = []; // we'll store all unique values for each dimension here in format {X-val: iX}
    var uniqueXMeta = [], uniqueYMeta = [], uniqueCells = []
    var renderWatch = nv.utils.renderWatch(dispatch, duration);
    var RdYlBu = ["#a50026","#d73027","#f46d43","#fdae61","#fee090","#ffffbf","#e0f3f8","#abd9e9","#74add1","#4575b4","#313695"];

    var getCellPos = function(d) { return d.cellPos; };
    var getIX = function(d) { return getCellPos(d).ix; } // get the given cell's x index position
    var getIY = function(d) { return getCellPos(d).iy; } // get the given cell's y index position
    var getNorm = function(d) { return getCellPos(d).norm; }
    var getIdx = function(d) { return getCellPos(d).idx; }

    // return the formatted cell value if it is
    // a number, otherwise return missingDataLabel
    var cellValueLabel = function(d) {
        var val = !normalize ? cellValueFormat(getCellValue(d)) : cellValueFormat(getNorm(d));
        return !isNaN(val) ? val : missingDataLabel;
    }

    function chart(selection) {
        renderWatch.reset();
        selection.each(function(data) {

            prepedData = prepData(data);

            var availableWidth = width - margin.left - margin.right,
                availableHeight = height - margin.top - margin.bottom;

            // available width/height set the cell dimenions unless
            // the aspect ratio is defined - in that case the cell
            // height is adjusted and availableHeight updated
            cellWidth = availableWidth / Object.keys(uniqueX).length;
            cellHeight = cellAspectRatio ? cellWidth / cellAspectRatio : availableHeight / Object.keys(uniqueY).length;
            if (cellAspectRatio) availableHeight = cellHeight * Object.keys(uniqueY).length - margin.top - margin.bottom;


            container = d3.select(this);
            nv.utils.initSVG(container);

            // Setup Scales
            xScale.domain(xDomain || Object.keys(uniqueX))
                  .rangeBands(xRange || [0, availableWidth-cellBorderWidth/2]);
            yScale.domain(yDomain || Object.keys(uniqueY))
                  .rangeBands(yRange || [0, availableHeight-cellBorderWidth/2]);
            colorScale.domain(colorExtent())
                  .range(colorRange || RdYlBu);

            // Setup containers and skeleton of chart
            var wrap = container.selectAll('g.nv-heatMapWrap').data([prepedData]);
            var wrapEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-heatMapWrap');

            wrap.watchTransition(renderWatch, 'nv-wrap: heatMapWrap')
                .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

            var cellWrap = wrapEnter
                .append('g')
                .attr('class','cellWrap')
                .selectAll(".nv-cell")
                .data(function(d) { return d; }, function(e) { return getIdx(e) })

            var xMetaWrap = wrapEnter
                .append('g')
                .attr('class','xMetaWrap')
                .attr("transform", function() { return "translate(0," + (-xMetaHeight()-cellBorderWidth-metaOffset) + ")" })

            var xMetas = wrap.select('.xMetaWrap').selectAll('.x-meta')
                .data(uniqueXMeta, function(d,i) { return i; })

            var xMetaEnter = xMetas
                .enter()
                .append('rect')
                .attr('class','x-meta meta')
                .attr("width", cellWidth-cellBorderWidth)
                .attr("height", xMetaHeight())
                .attr("transform", "translate(0,0)")
                .attr("fill", function(d) { return xMetaColorScale(d); })

            var yMetaWrap = wrapEnter
                .append('g')
                .attr('class','yMetaWrap')
                .attr("transform", function(d,i) { return "translate(" + (-yMetaWidth()-cellBorderWidth-metaOffset) + ",0)" })

            var yMetas = wrap.select('.yMetaWrap').selectAll('.y-meta')
                .data(uniqueYMeta, function(d,i) { return i; })

            var yMetaEnter = yMetas
                .enter()
                .append('rect')
                .attr('class','y-meta meta')
                .attr("width", yMetaWidth())
                .attr("height", cellHeight-cellBorderWidth)
                .attr("transform", function(d,i) { return "translate(0,0)" })
                .attr("fill", function(d,i) { return yMetaColorScale(d); })
          
            // CELLS    
            var cellsEnter = cellWrap
                .enter()
                .append('g')
                .attr("class","nv-cell")
                .style('opacity', 1e-6)
                .attr("transform", function(d) { return "translate(0," + getIY(d) * cellHeight + ")" }) // enter all g's here for a sweep-right transition
                .attr('data-row', function(d) { return getIY(d) })
                .attr('data-column', function(d) { return getIX(d) });

            var cells = wrap.selectAll('.nv-cell')
            
            cellsEnter
                .append("rect") 

            cellsEnter
                .append('text')
                .attr('text-anchor', 'middle')

            // transition cell (rect) size
            cells.selectAll('rect')
                .watchTransition(renderWatch, 'heatMap: rect')
                .attr("width", cellWidth-cellBorderWidth)
                .attr("height", cellHeight-cellBorderWidth)
                .attr('rx', cellRadius)
                .attr('ry', cellRadius)
                .style('stroke', function(d,i) { return cellColor(d) })

            // transition cell (g) position, opacity and fill
            cells
                .watchTransition(renderWatch, 'heatMap: cells')
                .style({
                    'opacity': 1,
                    'fill': function(d,i) { return cellColor(d) },
                })
                .attr("transform", function(d) { return "translate(" + getIX(d) * cellWidth + "," + getIY(d) * cellHeight + ")" })

            cellWrap.exit().remove();

            var xMetaRect = wrap.selectAll('.x-meta')
            var yMetaRect = wrap.selectAll('.y-meta')
            var allMetaRect = wrap.selectAll('.meta')

            // transition meta rect size
            xMetas
                .watchTransition(renderWatch, 'heatMap: xMetaRect') 
                .attr("width", cellWidth-cellBorderWidth)
                .attr("height", xMetaHeight())
                .attr("transform", function(d,i) { return "translate(" + (i * cellWidth) + ",0)" })

            yMetas
                .watchTransition(renderWatch, 'heatMap: yMetaRect') 
                .attr("width", yMetaWidth())
                .attr("height", cellHeight-cellBorderWidth)
                .attr("transform", function(d,i) { return "translate(0," + (i * cellHeight) + ")" })


            // transition position of meta wrap g & opacity
            wrap.select('.xMetaWrap')
                .watchTransition(renderWatch, 'heatMap: xMetaWrap') 
                .attr("transform", function(d,i) { return "translate(0," + (-xMetaHeight()-cellBorderWidth-metaOffset) + ")" })
                .style("opacity", function() { return xMeta !== false ? 1 : 0 })
            wrap.select('.yMetaWrap')
                .watchTransition(renderWatch, 'heatMap: yMetaWrap') 
                .attr("transform", function(d,i) { return "translate(" + (-yMetaWidth()-cellBorderWidth-metaOffset) + ",0)" })
                .style("opacity", function() { return yMeta !== false ? 1 : 0 })

            // TOOLTIPS
            cells
                .on('mouseover', function(d,i) {

                    var idx = getIdx(d);
                    var ix = getIX(d);
                    var iy = getIY(d);


                    // set the proper classes for all cells
                    // hover row gets class .row-hover
                    // hover column gets class .column-hover
                    // hover cell gets class .cell-hover
                    // all remaining cells get class .no-hover
                    d3.selectAll('.nv-cell').each(function(e) {
                        if (idx == getIdx(e)) {
                            d3.select(this).classed('cell-hover', true);
                            d3.select(this).classed('no-hover', false);
                        } else {
                            d3.select(this).classed('no-hover', true);
                            d3.select(this).classed('cell-hover', false);
                        }
                        if (ix == getIX(e)) {
                            d3.select(this).classed('no-hover', false);
                            d3.select(this).classed('column-hover', true);
                        }
                        if (iy == getIY(e)) {
                            d3.select(this).classed('no-hover', false);
                            d3.select(this).classed('row-hover', true);
                        }
                    })
    
                    // set hover classes for column metadata
                    d3.selectAll('.x-meta').each(function(e, j) {
                        if (j == ix) {
                            d3.select(this).classed('cell-hover', true);
                            d3.select(this).classed('no-hover', false);
                        } else {
                            d3.select(this).classed('no-hover', true);
                            d3.select(this).classed('cell-hover', false);
                        }
                    });

                    // set hover class for row metadata
                    d3.selectAll('.y-meta').each(function(e, j) {
                        if (j == iy) {
                            d3.select(this).classed('cell-hover', true);
                            d3.select(this).classed('no-hover', false);
                        } else {
                            d3.select(this).classed('no-hover', true);
                            d3.select(this).classed('cell-hover', false);
                        }
                    });
                    
                    dispatch.elementMouseover({
                        value: getX(d) + ' & ' + getY(d), 
                        series: {
                                value: cellValueLabel(d), 
                                color: d3.select(this).select('rect').style("fill")
                                },
                        e: d3.event,
                    });

                })
                .on('mouseout', function(d,i) {

                    // allow tooltip to remain even when mouse is over the
                    // space between the cell;
                    // this prevents cells from "flashing" when transitioning
                    // between cells
                    var bBox = d3.select(this).select('rect').node().getBBox();
                    var coordinates = d3.mouse(this);
                    var x = coordinates[0];
                    var y = coordinates[1];

                    if (
                        x > bBox.width + cellBorderWidth || 
                        x < -cellBorderWidth ||
                        (getIX(d) + 1 == Object.keys(uniqueX).length &&  x > bBox.width) ||
                        (getIX(d) == 0 && x < 0) ||
                        y > bBox.height + cellBorderWidth ||
                        y < -cellBorderWidth ||
                        (getIY(d) + 1 == Object.keys(uniqueY).length &&  y > bBox.height) ||
                        (getIY(d) == 0 && y < 0)
                    ) {
                        // remove all hover classes
                        removeAllHoverClasses();

                        dispatch.elementMouseout({e: d3.event});
                    }
                })
                .on('mousemove', function(d,i) {
                    dispatch.elementMousemove({e: d3.event});
                })

            allMetaRect
                .on('mouseover', function(d,i) {

                    // true if hovering over a row metadata rect
                    var isColMeta = d3.select(this).attr('class').indexOf('x-meta') != -1 ? true : false;

                    // apply proper .row-hover & .column-hover
                    // classes to cells
                    d3.selectAll('.nv-cell').each(function(e) {

                        if (isColMeta && i == getIX(e)) {
                            d3.select(this).classed('column-hover', true);
                            d3.select(this).classed('no-hover', false);
                        } else if (!isColMeta && i-uniqueXMeta.length == getIY(e)) {
                            // since allMetaRect selects all the meta rects, the index for the y's will
                            // be offset by the number of x rects. TODO - write seperate tooltip sections
                            // for x meta rect & y meta rect
                            d3.select(this).classed('row-hover', true);
                            d3.select(this).classed('no-hover', false);
                        } else {
                            d3.select(this).classed('no-hover', true);
                            d3.select(this).classed('column-hover', false);
                            d3.select(this).classed('row-hover', false);
                        }
                        d3.select(this).classed('cell-hover', false);
                    })

                    // apply proper .row-hover & .column-hover
                    // classes to meta rects
                    d3.selectAll('.meta').classed('no-hover', true);
                    d3.select(this).classed('cell-hover', true);
                    d3.select(this).classed('no-hover', false);

                    dispatch.elementMouseover({
                        value: isColMeta ? 'Column meta' : 'Row meta',
                        series: { value: d, color: d3.select(this).style('fill'), }
                    });
                })
                .on('mouseout', function(d,i) {

                    // allow tooltip to remain even when mouse is over the
                    // space between the cell;
                    // this prevents cells from "flashing" when transitioning
                    // between cells
                    var bBox = d3.select(this).node().getBBox();
                    var coordinates = d3.mouse(this);
                    var x = coordinates[0];
                    var y = coordinates[1];

                    if (
                        x > bBox.width + cellBorderWidth || 
                        x < -cellBorderWidth ||
                        (i + 1 == Object.keys(uniqueX).length &&  x > bBox.width) ||
                        (i == 0 && x < 0) ||
                        y > bBox.height + cellBorderWidth ||
                        y < -cellBorderWidth ||
                        (i + 1 == Object.keys(uniqueY).length &&  y > bBox.height) ||
                        (i == 0 && y < 0)
                    ) {
                        // remove all hover classes
                        removeAllHoverClasses();

                        dispatch.elementMouseout({e: d3.event});
                    }
                })
                .on('mousemove', function(d,i) {
                    dispatch.elementMousemove({e: d3.event});
                })

            cellWrap.select('text')
                .attr("dy", 4)
                .attr("class","cell-text")

            // transition text position and fill
            cells.selectAll('text')
                .watchTransition(renderWatch, 'heatMap: cells text')
                .text(function(d,i) { return cellValueLabel(d) })
                .attr("x", function(d) { return (cellWidth-cellBorderWidth) / 2; })
                .attr("y", function(d) { return (cellHeight-cellBorderWidth) / 2; })
                .style("fill", function(d) { return cellTextColor(cellColor(d)) })
                .style('opacity', function() { return showCellValues ? 1 : 0 })


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
        showCellValues: {get: function(){return showCellValues;}, set: function(_){showCellValues=_;}},
        x:       {get: function(){return getX;}, set: function(_){getX=_;}}, // data attribute for horizontal axis
        y:       {get: function(){return getY;}, set: function(_){getY=_;}}, // data attribute for vertical axis
        cellValue:       {get: function(){return getCellValue;}, set: function(_){getCellValue=_;}}, // data attribute that sets cell value and color
        missingDataColor:  {get: function(){return missingDataColor;}, set: function(_){missingDataColor=_;}},
        missingDataLabel:  {get: function(){return missingDataLabel;}, set: function(_){missingDataLabel=_;}},
        xScale:  {get: function(){return xScale;}, set: function(_){xScale=_;}},
        yScale:  {get: function(){return yScale;}, set: function(_){yScale=_;}},
        colorScale:  {get: function(){return colorScale;}, set: function(_){colorScale=_;}}, // scale to map cell values to colors
        xDomain:  {get: function(){return xDomain;}, set: function(_){xDomain=_;}},
        yDomain:  {get: function(){return yDomain;}, set: function(_){yDomain=_;}},
        xRange:  {get: function(){return xRange;}, set: function(_){xRange=_;}},
        yRange:  {get: function(){return yRange;}, set: function(_){yRange=_;}},
        colorRange:  {get: function(){return colorRange;}, set: function(_){colorRange=_;}},
        xMeta:  {get: function(){return xMeta;}, set: function(_){xMeta=_;}},
        yMeta:  {get: function(){return yMeta;}, set: function(_){yMeta=_;}},
        xMetaColorScale:  {get: function(){return color;}, set: function(_){color = nv.utils.getColor(_);}},
        yMetaColorScale:  {get: function(){return color;}, set: function(_){color = nv.utils.getColor(_);}},
        cellAspectRatio:  {get: function(){return cellAspectRatio;}, set: function(_){cellAspectRatio=_;}}, // cell width / height
        cellRadius:  {get: function(){return cellRadius;}, set: function(_){cellRadius=_;}}, // cell width / height
        cellHeight:  {get: function(){return cellHeight;}}, // TODO - should not be exposed since we don't want user setting this
        cellWidth:   {get: function(){return cellWidth;}}, // TODO - should not be exposed since we don't want user setting this
        normalize:   {get: function(){return normalize;}, set: function(_){normalize=_;}},
        cellBorderWidth:     {get: function(){return cellBorderWidth;}, set: function(_){cellBorderWidth=_;}},
        highContrastText:    {get: function(){return highContrastText;}, set: function(_){highContrastText=_;}},
        cellValueFormat:     {get: function(){return cellValueFormat;}, set: function(_){cellValueFormat=_;}},
        id:                  {get: function(){return id;}, set: function(_){id=_;}},
        metaOffset:          {get: function(){return metaOffset;}, set: function(_){metaOffset=_;}},
        xMetaHeight:         {get: function(){return xMetaHeight;}, set: function(_){xMetaHeight=_;}},
        yMetaWidth:          {get: function(){return yMetaWidth;}, set: function(_){yMetaWidth=_;}},


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
