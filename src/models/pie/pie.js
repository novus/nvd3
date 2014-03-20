/**
 * A Pie Chart draws a percentage data set, in a circular display.
 */
function Pie(options){
    options = nv.utils.valueOrDefault(options, {
        margin: {top: 0, right: 0, bottom: 0, left: 0}
        , width: 500
        , height: 500
        , chartClass: 'pie'
        , wrapClass: 'pieWrap'
    });

    var dispatchArray = ['chartClick', 'elementClick', 'elementDblClick', 'elementMouseover', 'elementMouseout'];
    Chart.call(this, options, dispatchArray);

    this.state = {};
    this.defaultState = null;

    this.getX = function(d) { return d.x };
    this.getY = function(d) { return d.y };
    this.startAngle = false;
    this.endAngle = false;
    this.donut = false;
    this.donutRatio = 0.5;
    this.color = nv.utils.defaultColor();
    this.getDescription = function(d) { return d.description };
    this.valueFormat = d3.format(',.2f');
    this.showLabels = false;
    this.pieLabelsOutside = true;
    this.labelType = "key";
    this.labelThreshold = .02; //if slice percentage is under this, don't show label
    this.labelSunbeamLayout = false;
    this.id = undefined;
}

/**
 * Pie extends Chart
 */
Pie.prototype = Object.create(Chart.prototype);

/**
 * @override Chart::wrapChart
 */
Pie.prototype.wrapChart = function(data){
    if(this.noData(data))
        return this;

    var that = this;
    Canvas.prototype.wrapChart.call(this, data, ['nv-pieLabels']);

    var radius = Math.min(that.available.width, that.available.height) / 2,
        arcRadius = radius-(radius / 5);

    that.wrap.attr('transform', 'translate(' + that.available.width / 2 + ',' + that.available.height / 2 + ')');
    that.g.select('.nv-pieLabels').attr('transform', 'translate(' + that.available.width / 2 + ',' + that.available.height / 2 + ')');

    //------------------------------------------------------------


    this.svg.on('click', function(d,i) {
        that.dispatch.chartClick({
            data: d,
            index: i,
            pos: d3.event,
            id: that.id
        });
    });

    var arc = d3.svg.arc().outerRadius(arcRadius);

    if (that.startAngle) arc.startAngle(that.startAngle);
    if (that.endAngle) arc.endAngle(that.endAngle);
    if (that.donut) arc.innerRadius(radius * that.donutRatio);

    // Setup the Pie chart and choose the data element
    var pie = d3.layout.pie()
        .sort(null)
        .value(function(d) {
            return d.disabled ? 0 : that.getY(d)
        });

    var slices = that.wrap.selectAll('.nv-slice')
        .data(pie);

    var pieLabels = that.wrap.select('.nv-pieLabels').selectAll('.nv-label')
        .data(pie);

    slices.exit().remove();
    pieLabels.exit().remove();

    var ae = slices.enter().append('g')
        .attr('class', 'nv-slice')
        .on('mouseover', function(d,i){
            d3.select(this).classed('hover', true);
            that.dispatch.elementMouseover({
                label: that.getX(d.data),
                value: that.getY(d.data),
                point: d.data,
                pointIndex: i,
                pos: [d3.event.pageX, d3.event.pageY],
                id: that.id
            });
        })
        .on('mouseout', function(d,i){
            d3.select(this).classed('hover', false);
            that.dispatch.elementMouseout({
                label: that.getX(d.data),
                value: that.getY(d.data),
                point: d.data,
                index: i,
                id: that.id
            });
        })
        .on('click', function(d,i) {
            that.dispatch.elementClick({
                label: that.getX(d.data),
                value: that.getY(d.data),
                point: d.data,
                index: i,
                pos: d3.event,
                id: that.id
            });
            d3.event.stopPropagation();
        })
        .on('dblclick', function(d,i) {
            that.dispatch.elementDblClick({
                label: that.getX(d.data),
                value: that.getY(d.data),
                point: d.data,
                index: i,
                pos: d3.event,
                id: that.id
            });
            d3.event.stopPropagation();
        });

    slices
        .attr('fill', function(d,i) { return that.color(d, i); })
        .attr('stroke', function(d,i) { return that.color(d, i); });

    var paths = ae.append('path')
        .each(function(d) { this._current = d; });
    //.attr('d', arc);

    slices.select('path')
        .transition()
        .attr('d', arc)
        .attrTween('d', arcTween);

    if (that.showLabels) {
        // This does the normal label
        var labelsArc = d3.svg.arc().innerRadius(0);

        if (that.pieLabelsOutside){ labelsArc = arc; }

        if (that.donutLabelsOutside) { labelsArc = d3.svg.arc().outerRadius(arc.outerRadius()); }

        pieLabels.enter().append("g").classed("nv-label",true)
            .each(function(d) {
                var group = d3.select(this);
                group.attr('transform', function(d) {
                    if (that.labelSunbeamLayout) {
                        d.outerRadius = arcRadius + 10; // Set Outer Coordinate
                        d.innerRadius = arcRadius + 15; // Set Inner Coordinate
                        var rotateAngle = (d.startAngle + d.endAngle) / 2 * (180 / Math.PI);
                        if ((d.startAngle+d.endAngle)/2 < Math.PI) {
                            rotateAngle -= 90;
                        } else {
                            rotateAngle += 90;
                        }
                        return 'translate(' + labelsArc.centroid(d) + ') rotate(' + rotateAngle + ')';
                    } else {
                        d.outerRadius = radius + 10; // Set Outer Coordinate
                        d.innerRadius = radius + 15; // Set Inner Coordinate
                        return 'translate(' + labelsArc.centroid(d) + ')'
                    }
                });

                group.append('rect')
                    .style('stroke', '#fff')
                    .style('fill', '#fff')
                    .attr("rx", 3)
                    .attr("ry", 3);

                group.append('text')
                    .style('text-anchor', that.labelSunbeamLayout ? ((d.startAngle + d.endAngle) / 2 < Math.PI ? 'start' : 'end') : 'middle') //center the text on it's origin or begin/end if orthogonal aligned
                    .style('fill', '#000')

            });

        var labelLocationHash = {};
        var avgHeight = 14;
        var avgWidth = 140;
        var createHashKey = function(coordinates) {
            return Math.floor(coordinates[0]/avgWidth) * avgWidth + ',' + Math.floor(coordinates[1]/avgHeight) * avgHeight;
        };
        pieLabels.transition()
            .attr('transform', function(d) {
                if (that.labelSunbeamLayout) {
                    d.outerRadius = arcRadius + 10; // Set Outer Coordinate
                    d.innerRadius = arcRadius + 15; // Set Inner Coordinate
                    var rotateAngle = (d.startAngle + d.endAngle) / 2 * (180 / Math.PI);
                    if ((d.startAngle+d.endAngle)/2 < Math.PI) {
                        rotateAngle -= 90;
                    } else {
                        rotateAngle += 90;
                    }
                    return 'translate(' + labelsArc.centroid(d) + ') rotate(' + rotateAngle + ')';
                } else {
                    d.outerRadius = radius + 10; // Set Outer Coordinate
                    d.innerRadius = radius + 15; // Set Inner Coordinate

                    /*
                     Overlapping pie labels are not good. What this attempts to do is, prevent overlapping.
                     Each label location is hashed, and if a hash collision occurs, we assume an overlap.
                     Adjust the label's y-position to remove the overlap.
                     */
                    var center = labelsArc.centroid(d);
                    var hashKey = createHashKey(center);
                    if (labelLocationHash[hashKey]) {
                        center[1] -= avgHeight;
                    }
                    labelLocationHash[createHashKey(center)] = true;
                    return 'translate(' + center + ')'
                }
            });
        pieLabels.select(".nv-label text")
            .style('text-anchor', that.labelSunbeamLayout ? ((d.startAngle + d.endAngle) / 2 < Math.PI ? 'start' : 'end') : 'middle') //center the text on it's origin or begin/end if orthogonal aligned
            .text(function(d) {
                var percent = (d.endAngle - d.startAngle) / (2 * Math.PI);
                var labelTypes = {
                    "key" : that.getX(d.data),
                    "value": that.getY(d.data),
                    "percent": d3.format('%')(percent)
                };
                return (d.value && percent > that.labelThreshold) ? labelTypes[that.labelType] : '';
            });
    }

    // Computes the angle of an arc, converting from radians to degrees.
    function angle(d) {
        var a = (d.startAngle + d.endAngle) * 90 / Math.PI - 90;
        return a > 90 ? a - 180 : a;
    }

    function arcTween(a) {
        a.endAngle = isNaN(a.endAngle) ? 0 : a.endAngle;
        a.startAngle = isNaN(a.startAngle) ? 0 : a.startAngle;
        if (!that.donut) a.innerRadius = 0;
        var i = d3.interpolate(this._current, a);
        this._current = i(0);
        return function(t) {
            return arc(i(t));
        };
    }

    function tweenPie(b) {
        b.innerRadius = 0;
        var i = d3.interpolate({startAngle: 0, endAngle: 0}, b);
        return function(t) {
            return arc(i(t));
        };
    }

};

/**
 * Set the underlying color, on both the chart, and the composites.
 */
Pie.prototype.color = function(_){
    if (!arguments.length) return this.color;
    this.color = nv.utils.getColor(_);
    return this;
};

Pie.prototype.x = function(_) {
    if (!arguments.length) return this.getX;
    this.getX = _;
    return this;
};

Pie.prototype.y = function(_) {
    if (!arguments.length) return this.getY;
    this.getY = _;
    return this;
};

Pie.prototype.startAngle = function(_) {
    if (!arguments.length) return this.startAngle;
    this.startAngle = _;
    return this;
};

Pie.prototype.endAngle = function(_) {
    if (!arguments.length) return this.endAngle;
    this.endAngle = _;
    return this;
};

Pie.prototype.donut = function(_) {
    if (!arguments.length) return this.donut;
    this.donut = _;
    return this;
};

Pie.prototype.labelType = function(_) {
    if (!arguments.length) return this.labelType;
    this.labelType = _;
    this.labelType = this.labelType || "key";
    return this;
};

Pie.prototype.description = function(_) {
    if (!arguments.length) return this.getDescription;
    this.getDescription = _;
    return this;
};

Pie.prototype.valueFormat = function(_) {
    if (!arguments.length) return this.valueFormat;
    this.valueFormat = _;
    return this;
};

Pie.prototype.showLabels = function(_) {
    if (!arguments.length) return this.showLabels;
    this.showLabels = _;
    return this;
};

Pie.prototype.labelSunbeamLayout = function(_) {
    if (!arguments.length) return this.labelSunbeamLayout;
    this.labelSunbeamLayout = _;
    return this;
};

Pie.prototype.donutLabelsOutside = function(_) {
    if (!arguments.length) return this.donutLabelsOutside;
    this.donutLabelsOutside = _;
    return this;
};

Pie.prototype.pieLabelsOutside = function(_) {
    if (!arguments.length) return this.pieLabelsOutside;
    this.pieLabelsOutside = _;
    return this;
};

Pie.prototype.donutRatio = function(_) {
    if (!arguments.length) return this.donutRatio;
    this.donutRatio = _;
    return this;
};

Pie.prototype.id = function(_) {
    if (!arguments.length) return this.id;
    this.id = _;
    return this;
};

Pie.prototype.labelThreshold = function(_) {
    if (!arguments.length) return this.labelThreshold;
    this.labelThreshold = _;
    return this;
};

/**
 * The Pie model returns a function wrapping an instance of a Pie.
 */
nv.models.pie = function() {
    "use strict";

    var pie = new Pie();

    function chart(selection) {
        pie.render(selection);
        return chart;
    }

    chart.dispatch = pie.dispatch;
    chart.options = nv.utils.optionsFunc.bind(chart);

    [
        'margin',
        'width',
        'height',
        'x',
        'y',
        'description',
        'showLabels',
        'labelSunbeamLayout',
        'donutLabelsOutside',
        'pieLabelsOutside',
        'labelType',
        'donut',
        'donutRatio',
        'startAngle',
        'endAngle',
        'id',
        'color',
        'labelThreshold',
        'valueFormat'
    ]
        .forEach(function(method){
            chart[method] = function(arg1){
                var ret = null;
                // Minor perf win for the 0, 1 arg versions
                // http://jsperf.com/test-call-vs-apply/34
                switch (arguments.length) {
                    case 0:
                        ret = Pie.prototype[method].call(pie); break;
                    case 1:
                        ret = Pie.prototype[method].call(pie, arg1); break;
                    default:
                        ret = Pie.prototype[method].apply(pie, arguments)
                }
                return ret === pie ? chart : ret;
            };
        });

    return chart;
};
