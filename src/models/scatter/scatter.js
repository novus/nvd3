var ScatterPrivates = {
    id           : null,
    x            : function(d){return d.x;},
    y            : function(d){return d.y;},
    xScale       : null,
    yScale       : null,
    zScale       : null,
    getSize      : function(d) { return d.size || 1}, // accessor to get the point size
    getShape     : function(d) { return d.shape || 'circle' }, // accessor to get point shape
    onlyCircles  : true, // Set to false to use shapes
    forceX       : [], // List of numbers to Force into the X scale (ie. 0, or a max / min, etc.)
    forceY       : [], // List of numbers to Force into the Y scale
    forceSize    : [], // List of numbers to Force into the Size scale
    interactive  : true, // If true, plots a voronoi overlay for advanced point intersection
    pointKey     : null,
    pointActive  : function(d) { return !d.notActive }, // any points that return false will be filtered out
    padData      : false, // If true, adds half a data points width to front and back, for lining up a line chart with a bar chart
    padDataOuter : .1, //outerPadding to imitate ordinal scale outer padding
    clipEdge     : false, // if true, masks points within x and y scale
    clipVoronoi  : true, // if true, masks each point with a circle... can turn off to slightly increase performance
    clipRadius   : function() { return 25 }, // function to get the radius for voronoi point clips
    xDomain      : null, // Override x domain (skips the calculation from data)
    yDomain      : null, // Override y domain
    xRange       : null, // Override x range
    yRange       : null, // Override y range
    sizeDomain   : null, // Override point size domain
    sizeRange    : null,
    singlePoint  : false,
    xScale0      : null,
    yScale0      : null,
    zScale0      : null, // used to store previous scales
    timeoutID    : null,
    needsUpdate  : false, // Flag for when the points are visually updating, but the interactive layer is behind, to disable tooltips
    useVoronoi   : true,
    duration     : 250
};

/**
 * A Scatter
 */
function Scatter(options){
    options = nv.utils.extend({}, options, ScatterPrivates, {
        margin: {top: 0, right: 0, bottom: 0, left: 0}
        , width: 960
        , height: 500
        , chartClass: 'scatter'
        , wrapClass: 'scatterWrap'
    });

    Layer.call(this, options, []);

    this.xScale(d3.scale.linear());
    this.yScale(d3.scale.linear());
    this.zScale(d3.scale.linear()); //linear because d3.svg.shape.size is treated as area
}

nv.utils.create(Scatter, Layer, ScatterPrivates);

/**
 * @override Layer::wrapper
 */
Scatter.prototype.wrapper = function(data){

    var gs = ['nv-groups', 'nv-point-paths'];
    var chartClass = 'nv-' + this.options.chartClass;
    var wrapClass = 'nv-' + this.options.wrapClass;

    this.wrap = this.svg.selectAll('g.nv-wrap.' + wrapClass).data([data]);
    this.wrapEnter = this.wrap.enter().append('g').attr('class', 'nvd3 nv-wrap '+chartClass+' nv-chart-' + this.id() + (this.singlePoint() ? ' nv-single-point' : ''));
    this.defsEnter = this.wrapEnter.append('defs');
    this.gEnter = this.wrapEnter.append('g');
    this.g = this.wrap.select('g');

    gs.concat([wrapClass]).forEach(function(g){
        this.gEnter.append('g').attr('class', g);
    }, this);

    this.defsEnter.append('clipPath')
        .attr('id', 'nv-edge-clip-' + this.id())
        .append('rect');

    this.wrap.select('#nv-edge-clip-' + this.id() + ' rect')
        .attr('width', this.available.width)
        .attr('height', (this.available.height > 0) ? this.available.height : 0);

    this.g.attr('clip-path', this.clipEdge() ? 'url(#nv-edge-clip-' + this.id() + ')' : '');

    this.wrap.attr('transform', 'translate(' + this.margin().left + ',' + this.margin().top + ')');
};

/**
 * @override Layer::draw
 */
Scatter.prototype.draw = function(data){
    var that = this
        , availableWidth = this.available.width
        , availableHeight = this.available.height;

    //add series index to each data point for reference
    data.forEach(function(series, i) {
        series.values.forEach(function(point) {
            point.series = i;
        });
    });

    //------------------------------------------------------------
    // Setup Scales

    // remap and flatten the data for use in calculating the scales' domains
    var seriesData = (this.xDomain() && this.yDomain() && this.sizeDomain()) ? [] : // if we know xDomain and yDomain and sizeDomain, no need to calculate.... if Size is constant remember to set sizeDomain to speed up performance
        d3.merge(
            data.map(function(d) {
                return d.values.map(function(d,i) {
                    return { x: that.x()(d,i), y: that.y()(d,i), size: that.getSize()(d,i) }
                })
            })
        );

    this.xScale().domain(this.xDomain() || d3.extent(seriesData.map(function(d) { return d.x; }).concat(this.forceX())));

    if (this.padData() && data[0])
        this.xScale().range(
            this.xRange() || [(availableWidth * this.padDataOuter() +  availableWidth) / (2 *data[0].values.length), availableWidth - availableWidth * (1 + this.padDataOuter()) / (2 * data[0].values.length)  ]
        );
    //x.range([availableWidth * .5 / data[0].values.length, availableWidth * (data[0].values.length - .5)  / data[0].values.length ]);
    else
        this.xScale().range(this.xRange() || [0, availableWidth]);

    this.yScale().domain(this.yDomain() || d3.extent(seriesData.map(function(d) { return d.y }).concat(this.forceY())))
        .range(this.yRange() || [availableHeight, 0]);

    this.zScale().domain(this.sizeDomain() || d3.extent(seriesData.map(function(d) { return d.size }).concat(this.forceSize())))
        .range(this.sizeRange() || [16, 256]);

    // If scale's domain don't have a range, slightly adjust to make one... so a chart can show a single data point
    if (this.xScale().domain()[0] === this.xScale().domain()[1] || this.yScale().domain()[0] === this.yScale().domain()[1]) this.singlePoint(true);
    if (this.xScale().domain()[0] === this.xScale().domain()[1])
        this.xScale().domain()[0] ?
            this.xScale().domain([this.xScale().domain()[0] - this.xScale().domain()[0] * 0.01, this.xScale().domain()[1] + this.xScale().domain()[1] * 0.01])
            : this.xScale().domain([-1,1]);

    if (this.yScale().domain()[0] === this.yScale().domain()[1])
        this.yScale().domain()[0] ?
            this.yScale().domain([this.yScale().domain()[0] - this.yScale().domain()[0] * 0.01, this.yScale().domain()[1] + this.yScale().domain()[1] * 0.01])
            : this.yScale().domain([-1,1]);

    if ( isNaN(this.xScale().domain()[0])) {
        this.xScale().domain([-1,1]);
    }

    if ( isNaN(this.yScale().domain()[0])) {
        this.yScale().domain([-1,1]);
    }


    this.xScale0(this.xScale0() || this.xScale());
    this.yScale0(this.yScale0() || this.yScale());
    this.zScale0(this.zScale0() || this.zScale());

    function updateInteractiveLayer() {
        if (!that.interactive()) return false;

        var vertices = d3.merge(data.map(function(group, groupIndex) {
            return group.values
                .map(function(point, pointIndex) {
                    // *Injecting series and point index for reference
                    var pX = that.x()(point,pointIndex);
                    var pY = that.y()(point,pointIndex);

                    return [that.xScale()(pX),
                            that.yScale()(pY),
                            groupIndex,
                            pointIndex, point];
                })
                .filter(function(pointArray, pointIndex) {
                    return that.pointActive()(pointArray[4], pointIndex); // Issue #237.. move filter to after map, so pointIndex is correct!
                })
            })
        );

        //inject series and point index for reference into voronoi
        if (that.useVoronoi() === true) {

            if (that.clipVoronoi()) {
                var pointClipsEnter = that.wrap.select('defs').selectAll('.nv-point-clips')
                    .data([that.id()])
                    .enter();

                pointClipsEnter.append('clipPath')
                    .attr('class', 'nv-point-clips')
                    .attr('id', 'nv-points-clip-' + that.id());

                var pointClips = that.wrap.select('#nv-points-clip-' + that.id()).selectAll('circle')
                    .data(vertices);
                pointClips.enter().append('circle')
                    .attr('r', that.clipRadius());
                pointClips.exit().remove();
                pointClips
                    .attr('cx', function(d) { return d[0] })
                    .attr('cy', function(d) { return d[1] });

                that.wrap.select('.nv-point-paths')
                    .attr('clip-path', 'url(#nv-points-clip-' + that.id() + ')');
            }

            if(vertices.length) {
                // Issue #283 - Adding 2 dummy points to the voronoi b/c voronoi requires min 3 points to work
                vertices.push([that.xScale().range()[0] - 20, that.yScale().range()[0] - 20, null, null]);
                vertices.push([that.xScale().range()[1] + 20, that.yScale().range()[1] + 20, null, null]);
                vertices.push([that.xScale().range()[0] - 20, that.yScale().range()[0] + 20, null, null]);
                vertices.push([that.xScale().range()[1] + 20, that.yScale().range()[1] - 20, null, null]);
            }

            var bounds = d3.geom.polygon([
                [-10, -10],
                [-10, that.height() + 10],
                [that.width() + 10, that.height() + 10],
                [that.width() + 10, -10]
            ]);

	    // delete duplicates from vertices - essential assumption for d3.geom.voronoi
	    var epsilon = 1e-6; // d3 uses 1e-6 to determine equivalence.
	    vertices = vertices.sort(function(a,b){return ((a[0] - b[0]) || (a[1] - b[1]))});
	    for (var i = 0; i < vertices.length - 1; ) {
		if ((Math.abs(vertices[i][0] - vertices[i+1][0]) < epsilon) &&
		    (Math.abs(vertices[i][1] - vertices[i+1][1]) < epsilon)) {
		    vertices.splice(i+1, 1);
		} else {
		    i++;
		}
	    }

            var voronoi = d3.geom.voronoi(vertices).map(function(d, i) {
                return {
                    'data': bounds.clip(d),
                    'series': vertices[i][2],
                    'point': vertices[i][3]
                }
            });


            var pointPaths = that.wrap.select('.nv-point-paths').selectAll('path')
                .data(voronoi);
            pointPaths.enter().append('path')
                .attr('class', function(d,i) { return 'nv-path-'+i; });
            pointPaths.exit().remove();
            pointPaths
                .attr('d', function(d) {
                    if (d.data.length === 0)
                        return 'M 0 0';
                    else
                        return 'M' + d.data.join('L') + 'Z';
                });

            var mouseEventCallback = function(d, mDispatch) {
                if (that.needsUpdate()) return 0;
                var series = data[d.series];
                if (typeof series === 'undefined') return;

                var point  = series.values[d.point];

                mDispatch({
                    point: point,
                    series: series,
                    pos: [that.xScale()(that.x()(point, d.point)) + that.margin().left, that.yScale()(that.y()(point, d.point)) + that.margin().top],
                    seriesIndex: d.series,
                    pointIndex: d.point
                });
            };

            pointPaths
                .on('click', function(d) {
                    mouseEventCallback(d, that.dispatch.elementClick);
                })
                .on('mouseover', function(d) {
                    mouseEventCallback(d, that.dispatch.elementMouseover);
                })
                .on('mouseout', function(d, i) {
                    mouseEventCallback(d, that.dispatch.elementMouseout);
                });


        } else {
            /*
             // bring data in form needed for click handlers
             var dataWithPoints = vertices.map(function(d, i) {
             return {
             'data': d,
             'series': vertices[i][2],
             'point': vertices[i][3]
             }
             });
             */

            // add event handlers to points instead voronoi paths
            that.wrap.select('.nv-groups').selectAll('.nv-group')
                .selectAll('.nv-point')
                //.data(dataWithPoints)
                //.style('pointer-events', 'auto') // recativate events, disabled by css
                .on('click', function(d,i) {
                    //nv.log('test', d, i);
                    if (that.needsUpdate() || !data[d.series]) return 0; //check if this is a dummy point
                    var series = data[d.series],
                        point  = series.values[i];

                    that.dispatch.elementClick({
                        point: point,
                        series: series,
                        pos: [that.xScale()(that.x()(point, i)) + that.margin().left, that.yScale()(that.y()(point, i)) + that.margin().top],
                        seriesIndex: d.series,
                        pointIndex: i
                    });
                })
                .on('mouseover', function(d,i) {
                    if (that.needsUpdate() || !data[d.series]) return 0; //check if this is a dummy point
                    var series = data[d.series],
                        point  = series.values[i];

                    that.dispatch.elementMouseover({
                        point: point,
                        series: series,
                        pos: [that.xScale()(that.x()(point, i)) + that.margin().left, that.yScale()(that.y()(point, i)) + that.margin().top],
                        seriesIndex: d.series,
                        pointIndex: i
                    });
                })
                .on('mouseout', function(d,i) {
                    if (that.needsUpdate() || !data[d.series]) return 0; //check if this is a dummy point
                    var series = data[d.series],
                        point  = series.values[i];

                    that.dispatch.elementMouseout({
                        point: point,
                        series: series,
                        seriesIndex: d.series,
                        pointIndex: i
                    });
                });
        }

        that.needsUpdate(false);
    }

    this.needsUpdate(true);
    var groups = this.wrap.select('.nv-groups').selectAll('.nv-group')
        .data(function(d) { return d }, function(d) { return d.key });
    groups.enter().append('g')
        .style('stroke-opacity', 1e-6)
        .style('fill-opacity', 1e-6);
    groups.exit()
        .remove();
    groups
        .attr('class', function(d,i) { return 'nv-group nv-series-' + i })
        .classed('hover', function(d) { return d.hover });
    groups.watchTransition(this.renderWatch, 'scatter: groups')
        .style('fill', function(d,i) { return that.color()(d, i) })
        .style('stroke', function(d,i) { return that.color()(d, i) })
        .style('stroke-opacity', 1)
        .style('fill-opacity', .5);

    if (this.onlyCircles()) {
        var points = groups.selectAll('circle.nv-point')
            .data(function(d) { return d.values }, this.pointKey());
        points.enter().append('circle')
            .style('fill', function (d,i) { return d.color })
            .style('stroke', function (d,i) { return d.color })
            .attr('cx', function(d,i) { return nv.utils.NaNtoZero(that.xScale0()(that.x()(d,i))) })
            .attr('cy', function(d,i) { return nv.utils.NaNtoZero(that.yScale0()(that.y()(d,i))) })
            .attr('r', function(d,i) { return Math.sqrt(that.zScale()(that.getSize()(d,i))/Math.PI) });
        points.exit().remove();
        groups.exit().selectAll('path.nv-point')
            .watchTransition(this.renderWatch, 'scatter exit')
            .attr('cx', function(d,i) { return nv.utils.NaNtoZero(that.xScale()(that.x()(d,i))) })
            .attr('cy', function(d,i) { return nv.utils.NaNtoZero(that.yScale()(that.y()(d,i))) })
            .remove();
        points.each(function(d,i) {
            d3.select(this)
                .classed('nv-point', true)
                .classed('nv-point-' + i, true)
                .classed('hover',false)
            ;
        });
        points
            .watchTransition(this.renderWatch, 'scatter points')
            .attr('cx', function(d,i) { return nv.utils.NaNtoZero(that.xScale()(that.x()(d,i))) })
            .attr('cy', function(d,i) { return nv.utils.NaNtoZero(that.yScale()(that.y()(d,i))) })
            .attr('r', function(d,i) { return Math.sqrt(that.zScale()(that.getSize()(d,i))/Math.PI) });

    } else {

        var points = groups.selectAll('path.nv-point')
            .data(function(d) { return d.values });
        points.enter().append('path')
            .style('fill', function (d,i) { return d.color })
            .style('stroke', function (d,i) { return d.color })
            .attr('transform', function(d,i) {
                return 'translate(' + that.xScale0()(that.x()(d,i)) + ',' + that.yScale0()(that.y()(d,i)) + ')'
            })
            .attr('d',
                d3.svg.symbol()
                    .type(that.getShape())
                    .size(function(d,i) { return that.zScale()(that.getSize()(d,i)) })
            );
        points.exit().remove();
        groups.exit().selectAll('path.nv-point')
            .watchTransition(that.renderWatch, 'scatter exit')
            .attr('transform', function(d,i) {
                return 'translate(' + that.xScale()(that.x()(d,i)) + ',' + that.yScale()(that.y()(d,i)) + ')'
            })
            .remove();
        points.each(function(d,i) {
            d3.select(this)
                .classed('nv-point', true)
                .classed('nv-point-' + i, true)
                .classed('hover',false)
            ;
        });
        points
            .watchTransition(this.renderWatch, 'scatter points')
            .attr('transform', function(d,i) {
                //nv.log(d,i,getX(d,i), x(getX(d,i)));
                return 'translate(' + that.xScale()(that.x()(d,i)) + ',' + that.yScale()(that.y()(d,i)) + ')'
            })
            .attr('d',
                d3.svg.symbol()
                    .type(this.getShape())
                    .size(function(d,i) { return that.zScale()(that.getSize()(d,i)) })
            );
    }

    // Delay updating the invisible interactive layer for smoother animation
    clearTimeout(this.timeoutID()); // stop repeat calls to updateInteractiveLayer
    this.timeoutID( setTimeout(updateInteractiveLayer, 300) );
    //updateInteractiveLayer();

    //store old scales for use in transitions on update
    this.xScale0(this.xScale().copy());
    this.yScale0(this.yScale().copy());
    this.zScale0(this.zScale().copy());
};

/**
 * @override Layer::attachEvents
 */
Scatter.prototype.attachEvents = function(){
    Layer.prototype.attachEvents.call(this);

    this.dispatch
        .on('elementMouseover.point', function(d) {
            if (this.interactive()) this.highlightPoint(d.seriesIndex,d.pointIndex,true);
        }.bind(this))
        .on('elementMouseout.point', function(d) {
            if (this.interactive()) this.highlightPoint(d.seriesIndex,d.pointIndex,false);
        }.bind(this));
};

Scatter.prototype.clearHighlights = function() {
    //Remove the 'hover' class from all highlighted points.
    d3.selectAll(".nv-chart-" + this.id() + " .nv-point.hover").classed("hover",false);
};

Scatter.prototype.highlightPoint = function(seriesIndex,pointIndex,isHoverOver) {
    d3.select(".nv-chart-" + this.id() + " .nv-series-" + seriesIndex + " .nv-point-" + pointIndex)
        .classed("hover", isHoverOver);
};

Scatter.prototype.useVoronoi= function(_) {
    if (!arguments.length) return this.options.useVoronoi;
    this.options.useVoronoi = _;
    if (this.useVoronoi() === false) {
        this.clipVoronoi(false);
    }
    return this;
};

Scatter.prototype.color = function(_) {
    if (!arguments.length) return this.options.color;
    this.options.color = nv.utils.getColor(_);
    return this;
};

Scatter.prototype.duration = function(_) {
    if (!arguments.length) return this.options.duration;
    this.options.duration = _;
    this.renderWatch.reset(_);
    return this;
};

Scatter.prototype.size = function(_) {
    if (!arguments.length) return this.options.getSize;
    this.options.getSize = d3.functor(_);
    return this;
};

Scatter.prototype.shape = function(_) {
    if (!arguments.length) return this.options.getShape;
    this.options.getShape = _;
    return this;
};

/**
 * The scatter model returns a function wrapping an instance of a Scatter.
 */
nv.models.scatter = function () {
    "use strict";

    var scatter = new Scatter(),
        api = [
            'clearHighlights',
            'highlightPoint',
            'x',
            'y',
            'size',
            'margin',
            'width',
            'height',
            'xScale',
            'yScale',
            'zScale',
            'xDomain',
            'yDomain',
            'sizeDomain',
            'xRange',
            'yRange',
            'sizeRange',
            'forceX',
            'forceY',
            'forceSize',
            'interactive',
            'pointKey',
            'pointActive',
            'padData',
            'padDataOuter',
            'clipEdge',
            'clipVoronoi',
            'useVoronoi',
            'clipRadius',
            'color',
            'shape',
            'onlyCircles',
            'id',
            'singlePoint',
            'duration'
        ];

    function chart(selection) {
        scatter.render(selection);
        return chart;
    }

    chart.dispatch = scatter.dispatch;

    chart.options = nv.utils.optionsFunc.bind(chart);

    nv.utils.rebindp(chart, scatter, Scatter.prototype, api);

    return chart;
};
