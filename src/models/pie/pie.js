PiePrivates = {
    startAngle: 0.0,
    endAngle: 2 * Math.PI,
    pieLabelsOutside: true,
    labelType: "key",
    labelThreshold: 0.02, //if slice percentage is under this, don't show label
    labelSunbeamLayout: false,
    valueFormat: d3.format(',.2f')
}
/**
 * A Pie Chart draws a percentage data set, in a circular display.
 */
function Pie(options) {
    options = nv.utils.extend({}, options, PiePrivates, {
        margin: {
            top: 0,
            right: 0,
            bottom: 0,
            left: 0
        },
        width: 500,
        height: 500,
        chartClass: 'pie',
        wrapClass: 'pieWrap'
    });

    var dispatchArray = [
        'chartClick',
        'elementClick',
        'elementDblClick',
        'elementMouseover',
        'elementMouseout'
    ];
    Chart.call(this, options, dispatchArray);
}
nv.utils.create(Pie, Layer, PiePrivates);

Pie.prototype.radius = function(){
    return Math.min(this.available.width, this.available.height) / 2;
}

Pie.prototype.arcRadius = function(){
    return this.radius() - (this.radius() / 5);
}

/**
 * @override Chart::wrap
 */
Pie.prototype.wrap = function (data) {
    var available = this.available, dispatch = this.dispatch;
    Layer.prototype.wrap.call(this, data, ['nv-pieLabels']);

    this.wrap.attr('transform', 'translate(' + available.width / 2 + ',' + available.height / 2 + ')');
    this.g.select('.nv-pieLabels').attr('transform', 'translate(' + available.width / 2 + ',' + available.height / 2 + ')');

    var id = this.id;
    this.svg.on('click', function (d, i) {
        this.dispatch.chartClick({
            data: d,
            index: i,
            pos: d3.event,
            id: id
        });
    });

    var arc = this.getArc();

    // Setup the Pie chart and choose the data element
    var pieLayout = d3.layout.pie()
        .sort(null)
        .value(function (d) {
            return d.disabled ? 0 : this.y()(d)
        }.bind(this));

    var slices = this.wrap.selectAll('.nv-slice')
        .data(pieLayout);

    slices.exit().remove();

    var ae = this.ae = slices.enter().append('g');

    slices
        .attr('fill', function (d, i) {
            return this.color()(d, i);
        }.bind(this))
        .attr('stroke', function (d, i) {
            return this.color()(d, i);
        }.bind(this));

    var paths = ae.append('path')
        .each(function (d) {
            this._current = d;
        }.bind(this));

    slices.select('path')
        .transition()
        .attr('d', arc)
        // .attrTween('d', arcTween);

    if (this.showLabels) {
        this.doLabels(data, arc, pieLayout);
    }

    // Computes the angle of an arc, converting from radians to degrees.
    function angle(d) {
        var a = (d.startAngle + d.endAngle) * 90 / Math.PI - 90;
        return a > 90 ? a - 180 : a;
    }

    var self = this;
    function arcTween(a) {
        a.endAngle = isNaN(a.endAngle) ? 0 : a.endAngle;
        a.startAngle = isNaN(a.startAngle) ? 0 : a.startAngle;
        a.innerRadius = nv.utils.valueOrDefault(a.innerRadius, 0);
        var i = d3.interpolate(self._current, a);
        self._current = i(0);
        return function (t) {
            return arc(i(t));
        };
    }
};

Pie.prototype.doLabels = function(data, arc, pieLayout){
    // This does the normal label
    var labelsArc = d3.svg.arc().innerRadius(0);

    var pieLabels = this.wrap.select('.nv-pieLabels')
        .selectAll('.nv-label')
        .data(pieLayout);
    pieLabels.exit().remove();


    if (this.pieLabelsOutside) {
        labelsArc = arc;
    }

    // if (this.donutLabelsOutside) {
    //     labelsArc = d3.svg.arc()
    //         .outerRadius(arc.outerRadius());
    // }

    var pieSelf = this;
    pieLabels.enter()
        .append("g")
        .classed("nv-label", true)
        .each(function (d) {
            var group = d3.select(this);
            group.attr('transform', function (d) {
                if (this.labelSunbeamLayout) {
                    d.outerRadius = pieSelf.arcRadius() + 10; // Set Outer Coordinate
                    d.innerRadius = pieSelf.arcRadius() + 15; // Set Inner Coordinate
                    var rotateAngle = (d.startAngle + d.endAngle) /
                        2 * (180 / Math.PI);
                    if ((d.startAngle + d.endAngle) / 2 < Math.PI) {
                        rotateAngle -= 90;
                    } else {
                        rotateAngle += 90;
                    }
                    return 'translate(' + labelsArc.centroid(d) +
                        ') rotate(' + rotateAngle + ')';
                } else {
                    d.outerRadius = pieSelf.radius() + 10; // Set Outer Coordinate
                    d.innerRadius = pieSelf.radius() + 15; // Set Inner Coordinate
                    return 'translate(' + labelsArc.centroid(d) +
                        ')'
                }
            });

            group.append('rect')
                .style('stroke', '#fff')
                .style('fill', '#fff')
                .attr("rx", 3)
                .attr("ry", 3);

            group.append('text')
                .style('text-anchor', this.labelSunbeamLayout ? ((d.startAngle +
                        d.endAngle) / 2 < Math.PI ? 'start' : 'end') :
                    'middle') //center the text on it's origin or begin/end if orthogonal aligned
            .style('fill', '#000')

        });

    var labelLocationHash = {};
    var avgHeight = 14;
    var avgWidth = 140;
    var createHashKey = function (coordinates) {
        return Math.floor(coordinates[0] / avgWidth) * avgWidth + ',' +
            Math.floor(coordinates[1] / avgHeight) * avgHeight;
    };
    pieLabels.transition()
        .attr('transform', function (d) {
            if (this.labelSunbeamLayout) {
                d.outerRadius = pieSelf.arcRadius() + 10; // Set Outer Coordinate
                d.innerRadius = pieSelf.arcRadius() + 15; // Set Inner Coordinate
                var rotateAngle = (d.startAngle + d.endAngle) / 2 * (
                    180 / Math.PI);
                if ((d.startAngle + d.endAngle) / 2 < Math.PI) {
                    rotateAngle -= 90;
                } else {
                    rotateAngle += 90;
                }
                return 'translate(' + labelsArc.centroid(d) +
                    ') rotate(' + rotateAngle + ')';
            } else {
                d.outerRadius = pieSelf.radius() + 10; // Set Outer Coordinate
                d.innerRadius = pieSelf.radius() + 15; // Set Inner Coordinate

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
        }.bind(this));
    pieLabels.select(".nv-label text")
    .style('text-anchor', function(d){
        this.labelSunbeamLayout ?
            ((d.startAngle + d.endAngle) / 2 < Math.PI ? 'start' : 'end') :
            'middle' //center the text on it's origin or begin/end if orthogonal aligned
    }.bind(this))
    .text(function (d) {
        var percent = (d.endAngle - d.startAngle) / (2 * Math.PI);
        var labelTypes = {
            "key": this.x()(d.data),
            "value": this.y()(d.data),
            "percent": d3.format('%')(percent)
        };
        return (d.value && percent > this.labelThreshold) ? labelTypes[
            this.labelType] : '';
    }.bind(this));
}

Pie.prototype.mouseData = function(d, i){
    return {
        label: this.x()(d.data),
        value: this.y()(d.data),
        point: d.data,
        pointIndex: i,
        pos: [d3.event.pageX, d3.event.pageY],
        id: this.id()
    }
}

Pie.prototype.attachEvents = function(){
    var self_ = this;
    this.ae.attr('class', 'nv-slice')
        .on('mouseover', function (d, i) {
            d3.select(this).classed('hover', true);
            self_.dispatch.elementMouseover(self_.mouseData(d, i));
        })
        .on('mouseout', function (d, i) {
            d3.select(this).classed('hover', false);
            self_.dispatch.elementMouseout(self_.mouseData(d, i));
        })
        .on('click', function (d, i) {
            this.dispatch.elementClick(this.mouseData(d, i));
            d3.event.stopPropagation();
        }.bind(this))
        .on('dblclick', function (d, i) {
            this.dispatch.elementDblClick(this.mouseData(d, i));
            d3.event.stopPropagation();
        }.bind(this));
}

Pie.prototype.getArc = function(){
    var arc = d3.svg.arc().outerRadius(this.arcRadius());
    if (this.startAngle()) arc.startAngle(this.startAngle());
    if (this.endAngle()) arc.endAngle(this.endAngle());

    return arc;
}

/**
 * The Pie model returns a function wrapping an instance of a Pie.
 */
nv.models.pie = function () {
    "use strict";

    var pie = new Pie();

    function chart(selection) {
        pie.render(selection);
        return chart;
    }

    chart.dispatch = pie.dispatch;
    chart.options = nv.utils.optionsFunc.bind(chart);
    nv.utils.rebindp(chart, pie, Pie.prototype, 'margin', 'width', 'height', 'x', 'y', 'description', 'showLabels', 'labelSunbeamLayout', 'donutLabelsOutside', 'pieLabelsOutside', 'labelType', 'donut', 'donutRatio', 'startAngle', 'endAngle', 'id', 'color', 'labelThreshold', 'valueFormat');

    return chart;
};
