var PieLabels = {
    Normal: {
        rotateAngle: function(){
            return 0;
        },
        textAnchor: function(){
            return 'middle';
        }
    },
    Sunbeam: {
        rotateAngle: function(d){
            var rotateAngle = (d.startAngle + d.endAngle) / 2 * (180 / Math.PI);
            if ((d.startAngle+d.endAngle)/2 < Math.PI) {
                rotateAngle -= 90;
            } else {
                rotateAngle += 90;
            }
            return rotateAngle;
        },
        textAnchor: function(d){
            return ((d.startAngle + d.endAngle) / 2 < Math.PI ? 'start' : 'end')
        }
    }
};

var PiePrivates = {
    startAngle: 0
    , endAngle: 0
    , pieLabelsOutside: true
    , showLabels: false
    , labelType: "key"
    , labelThreshold: 0.02 //if slice percentage is under this, don't show label
    , labelLayout: PieLabels.Normal
    , labelFormat: d3.format('%')
    , valueFormat: d3.format(',.2f')
    , id: null
    , x: function(d){return d.x}
    , y: function(d){return d.y}
    , description: function(){}
};

/**
 * A Pie Chart draws a percentage data set, in a circular display.
 */
function Pie(options) {
    options = nv.utils.extend({}, options, PiePrivates, {
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
        width: 500,
        height: 500,
        chartClass: 'pie',
        wrapClass: 'pieWrap'
    });

    Layer.call(this, options, []);
}
nv.utils.create(Pie, Layer, PiePrivates);

Pie.prototype.radius = function(){
    return Math.min(this.available.width, this.available.height) / 2;
};

Pie.prototype.arcRadius = function(){
    return this.radius() - (this.radius() / 5);
};

/**
 * @override Layer::wrapper
 */
Pie.prototype.wrapper = function (data) {
    Layer.prototype.wrapper.call(this, data, ['nv-pieLabels']);

    this.wrap.attr('transform', 'translate(' + this.arcRadius() + ',' + this.arcRadius() + ')');
};

/**
 * @override Layer::draw
 */
Pie.prototype.draw = function(data){

    var arc = null
        , arcTween = null
        , pieLayout = null
        , slices = null;

    arc = this.getArc();

    arcTween = function(a) {
        a.endAngle = isNaN(a.endAngle) ? 0 : a.endAngle;
        a.startAngle = isNaN(a.startAngle) ? 0 : a.startAngle;
        a.innerRadius = nv.utils.valueOrDefault(a.innerRadius, 0);
        var i = d3.interpolate(this._current, a);
        this._current = i(0);
        return function (t) {
            return arc(i(t));
        };
    }.bind(this);

    // Setup the Pie chart and choose the data element
    pieLayout = d3.layout.pie()
        .sort(null)
        .value(function (d) {
            return d.disabled ? 0 : this.y()(d)
        }.bind(this));

    slices = this.g.selectAll('.nv-slice').data(pieLayout);

    slices.exit().remove();

    this.paths = slices.enter().append('path');
    this.paths
        .each(function (d) {
            if (isNaN(d.startAngle)) d.startAngle = 0;
            if (isNaN(d.endAngle)) d.endAngle = 0;
            this._current = d;
        }.bind(this))
        .attr({
            fill: function (d, i) { return this.color()(d, i); }.bind(this),
            stroke: function (d, i) { return this.color()(d, i); }.bind(this)
        })
        .transition()
        .attr('d', arc)
        .attrTween('d', arcTween)
        ;

    if (this.showLabels()) {
        this.doLabels(data, arc, pieLayout);
    }
};

Pie.prototype.doLabels = function(data, arc, pieLayout){

    var pieLabels = null
        , labelsArc = null
        , pieSelf = this
        , labelLocationHash = {}
        , avgHeight = 14
        , avgWidth = 140
        , createHashKey = function (coordinates) {
            return Math.floor(coordinates[0] / avgWidth) * avgWidth + ',' +
                Math.floor(coordinates[1] / avgHeight) * avgHeight;
        };

    pieLabels = this.wrap.select('.nv-pieLabels')
        .selectAll('.nv-label')
        .data(pieLayout);
    pieLabels.exit().remove();

    // This does the normal label, or just use the arc if outside.
    labelsArc = this.pieLabelsOutside() ? arc : d3.svg.arc().innerRadius(0);

    pieLabels
        .enter().append("g")
        .classed("nv-label", true)
        .each(function(d) {
            var group = d3.select(this);
            group.attr('transform', function(d) {
                d.startAngle = isNaN(d.startAngle) ? 0 : d.startAngle;
                d.endAngle = isNaN(d.endAngle) ? 0 : d.endAngle;
                d.outerRadius = this.arcRadius() + 10; // Set Outer Coordinate
                d.innerRadius = this.arcRadius() + 15; // Set Inner Coordinate
                return 'translate(' + labelsArc.centroid(d) + ') ' +
                    'rotate(' + this.labelLayout().rotateAngle(d) + ')';
            }.bind(pieSelf));

            group.append('rect')
                .style('stroke', '#fff')
                .style('fill', '#fff')
                .attr("rx", 3)
                .attr("ry", 3);

            group.append('text')
                .style('text-anchor', pieSelf.labelLayout().textAnchor)
                .style('fill', '#000')
        });

    pieLabels.transition()
        .attr('transform', function(d) {
            d.outerRadius = this.arcRadius() + 10; // Set Outer Coordinate
            d.innerRadius = this.arcRadius() + 15; // Set Inner Coordinate

            /*
             Overlapping pie labels are not good. What this attempts to do is, prevent overlapping.
             Each label location is hashed, and if a hash collision occurs, we assume an overlap.
             Adjust the label's y-position to remove the overlap.
             */
            var center = labelsArc.centroid(d);
            if (d.value) {
                var hashKey = createHashKey(center);
                if (labelLocationHash[hashKey]) {
                    center[1] -= avgHeight;
                }
                labelLocationHash[createHashKey(center)] = true;
            }

            return 'translate(' + center + ') ' +
                'rotate(' + this.labelLayout().rotateAngle(d) + ')';
        }.bind(this));

    pieLabels.select(".nv-label text")
        .style('text-anchor', this.labelLayout().textAnchor)
        .text(function(d) {
            var percent = (d.endAngle - d.startAngle) / (2 * Math.PI);
            var labelTypes = {
                "key"    : this.x()(d.data),
                "value"  : this.y()(d.data),
                "percent": this.labelFormat()(percent)
            };
            return (d.value && percent > this.labelThreshold()) ? labelTypes[this.labelType()] : '';
        }.bind(this));
};

Pie.prototype.mouseData = function(d, i){
    return {
        label: this.x()(d.data),
        value: this.y()(d.data),
        point: d.data,
        pointIndex: i,
        pos: [d3.event.pageX, d3.event.pageY],
        id: this.id()
    }
};

/**
 * @override Layer::attachEvents
 */
Pie.prototype.attachEvents = function(){
    Layer.prototype.attachEvents.call(this);

    this.svg.on('click', function (d, i) {
        this.dispatch.chartClick({
            data: d,
            index: i,
            pos: d3.event,
            id: this.id()
        });
    }.bind(this));

    var self_ = this;
    this.paths.attr('class', 'nv-slice')
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
};

Pie.prototype.getArc = function(){
    var arc = d3.svg.arc().outerRadius(this.arcRadius());
    if (this.startAngle()) arc.startAngle(this.startAngle());
    if (this.endAngle()) arc.endAngle(this.endAngle());
    return arc;
};

Pie.prototype.labelSunbeamLayout = function(_){
    if(!arguments.length) return this.labelLayout() === PieLabels.Sunbeam;
    this.labelLayout(_ ? PieLabels.Sunbeam : PieLabels.Normal);
    return this;
};

/**
 * The Pie model returns a function wrapping an instance of a Pie.
 */
nv.models.pie = function () {
    "use strict";

    var pie = new Pie(),
        api = [
            'margin',
            'width',
            'height',
            'x',
            'y',
            'description',
            'showLabels',
            'labelSunbeamLayout',
            'pieLabelsOutside',
            'labelType',
            'startAngle',
            'endAngle',
            'id',
            'color',
            'labelThreshold',
            'valueFormat'
        ];

    function chart(selection) {
        pie.render(selection);
        return chart;
    }

    chart.dispatch = pie.dispatch;
    chart.options = nv.utils.optionsFunc.bind(chart);

    // This is really shitty
    nv.utils.rebindp(chart, pie, Pie.prototype, api);

    return chart;
};
