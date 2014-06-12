var BulletPrivates = {
    reverse : false
    , ranges : function(d) { return d.ranges }   // ranges (bad, satisfactory, good)
    , markers : function(d) { return d.markers }   // markers (previous, goal)
    , measures : function(d) { return d.measures }   // measures (actual, forecast)
    , rangeLabels : function(d) { return d.rangeLabels ? d.rangeLabels : [] }
    , markerLabels : function(d) { return d.markerLabels ? d.markerLabels : []  }
    , measureLabels : function(d) { return d.measureLabels ? d.measureLabels : []  }
    , forceX : [0] // List of numbers to Force into the X scale (ie. 0, or a max / min, etc.)
    , tickFormat : null
    , xScale1 : null
    , xScale0: null
    , color: nv.utils.getColor(['#1f77b4'])
    , orient : 'left' // TODO top & bottom
};

/**
 * A Bullet
 */
function Bullet(options){
    options = nv.utils.extend({}, options, BulletPrivates, {
        margin: {top: 0, right: 0, bottom: 0, left: 0}
        , width: 380
        , height: 30
        , chartClass: 'bullet'
    });

    Layer.call(this, options, []);

    this.xScale1(d3.scale.linear());
    this.xScale0( this.__chart__ || d3.scale.linear() );
}

nv.utils.create(Bullet, Layer, BulletPrivates);

/**
 * override Layer::wrapper
 * @param data
 */
Bullet.prototype.wrapper = function(data){
    Layer.prototype.wrapper.call(this, data);
    this.gEnter.append('rect').attr('class', 'nv-range nv-rangeMax');
    this.gEnter.append('rect').attr('class', 'nv-range nv-rangeAvg');
    this.gEnter.append('rect').attr('class', 'nv-range nv-rangeMin');
    this.gEnter.append('rect').attr('class', 'nv-measure');
    this.gEnter.append('path').attr('class', 'nv-markerTriangle');
};

/**
 * override Layer::draw
 * @param data
 * @param i
 */
Bullet.prototype.draw = function(data, i){

    var that = this
        , availableWidth = this.available.width
        , availableHeight = this.available.height
        , rangez = this.ranges().call(this, data, i).slice().sort(d3.descending)
        , markerz = this.markers().call(this, data, i).slice().sort(d3.descending)
        , measurez = this.measures().call(this, data, i).slice().sort(d3.descending)
        , rangeLabelz = this.rangeLabels().call(this, data, i).slice()
        , markerLabelz = this.markerLabels().call(this, data, i).slice()
        , measureLabelz = this.measureLabels().call(this, data, i).slice()
        , rangeMin = d3.min(rangez) //rangez[2]
        , rangeMax = d3.max(rangez) //rangez[0]
        , rangeAvg = rangez[1];

    //------------------------------------------------------------
    // Setup Scales

    // Compute the new x-scale.
    this.xScale1()
        .domain( d3.extent(d3.merge([this.forceX(), rangez])) )
        .range(this.reverse() ? [availableWidth, 0] : [0, availableWidth]);

    // Retrieve the old x-scale, if this is an update.
    this.xScale0()
        .domain([0, Infinity])
        .range(this.xScale1().range());

    // Stash the new scale.
    this.__chart__ = this.xScale1();

    var w0 = function(d) { return Math.abs(that.xScale0()(d) - that.xScale0()(0)) } // TODO: could optimize by precalculating x0(0) and x1(0)
        , w1 = function(d) { return Math.abs(that.xScale1()(d) - that.xScale1()(0))}
        , xp0 = function(d) { return d < 0 ? that.xScale0()(d) : that.xScale0()(0) }
        , xp1 = function(d) { return d < 0 ? that.xScale1()(d) : that.xScale1()(0) };

    this.g.select('rect.nv-rangeMax')
        .attr('height', availableHeight)
        .attr('width', w1(rangeMax > 0 ? rangeMax : rangeMin))
        .attr('x', xp1(rangeMax > 0 ? rangeMax : rangeMin))
        .datum(rangeMax > 0 ? rangeMax : rangeMin);

    this.g.select('rect.nv-rangeAvg')
        .attr('height', availableHeight)
        .attr('width', w1(rangeAvg))
        .attr('x', xp1(rangeAvg))
        .datum(rangeAvg);

    this.g.select('rect.nv-rangeMin')
        .attr('height', availableHeight)
        .attr('width', w1(rangeMax))
        .attr('x', xp1(rangeMax))
        .attr('width', w1(rangeMax > 0 ? rangeMin : rangeMax))
        .attr('x', xp1(rangeMax > 0 ? rangeMin : rangeMax))
        .datum(rangeMax > 0 ? rangeMin : rangeMax);

    this.g.select('rect.nv-measure')
        .style('fill', this.color())
        .attr('height', availableHeight / 3)
        .attr('y', availableHeight / 3)
        .attr('width', measurez < 0 ? this.xScale1()(0) - this.xScale1()(measurez[0]) : this.xScale1()(measurez[0]) - this.xScale1()(0))
        .attr('x', xp1(measurez))
        .on('mouseover', function() {
            that.dispatch.elementMouseover({
                value: measurez[0],
                label: measureLabelz[0] || 'Current',
                pos: [that.xScale1()(measurez[0]), availableHeight/2]
            })
        })
        .on('mouseout', function() {
            that.dispatch.elementMouseout({
                value: measurez[0],
                label: measureLabelz[0] || 'Current'
            })
        });

    var h3 =  availableHeight / 6;
    if (markerz[0]) {
        this.g.selectAll('path.nv-markerTriangle')
            .attr('transform', function() { return 'translate(' + that.xScale1()(markerz[0]) + ',' + (availableHeight / 2) + ')' })
            .attr('d', 'M0,' + h3 + 'L' + h3 + ',' + (-h3) + ' ' + (-h3) + ',' + (-h3) + 'Z')
            .on('mouseover', function() {
                that.dispatch.elementMouseover({
                    value: markerz[0],
                    label: markerLabelz[0] || 'Previous',
                    pos: [that.xScale1()(markerz[0]), availableHeight/2]
                })
            })
            .on('mouseout', function() {
                that.dispatch.elementMouseout({
                    value: markerz[0],
                    label: markerLabelz[0] || 'Previous'
                })
            });
    } else
        this.g.selectAll('path.nv-markerTriangle').remove();

    this.wrap.selectAll('.nv-range')
        .on('mouseover', function(d,i) {
            var label = rangeLabelz[i] || (!i ? "Maximum" : i == 1 ? "Mean" : "Minimum");
            that.dispatch.elementMouseover({
                value: d,
                label: label,
                pos: [that.xScale1()(d), availableHeight/2]
            })
        })
        .on('mouseout', function(d,i) {
            var label = rangeLabelz[i] || (!i ? "Maximum" : i == 1 ? "Mean" : "Minimum");
            that.dispatch.elementMouseout({
                value: d,
                label: label
            })
        })
};

Bullet.prototype.orient = function(_) {
    if (!arguments.length) return this.options.orient;
    this.options.orient = _;
    this.reverse( this.options.orient == 'right' || this.options.orient == 'bottom' );
    return this;
};

/**
 * override Layer::noData
 * @param data
 * @returns {boolean}
 */
Bullet.prototype.noData = function(data){
    return ( !data || typeof  data == 'undefined' || data == null );
};

Bullet.prototype.hasData = function(data){
    return data && data.markers.length && data.measures.length && data.ranges.length && data.subtitle && data.title;
};

/**
 * The bullet model returns a function wrapping an instance of a Bullet.
 */
nv.models.bullet = function () {
    "use strict";

    var bullet = new Bullet(),
        api = [
            'ranges',
            'markers',
            'measures',
            'forceX',
            'width',
            'height',
            'margin',
            'tickFormat',
            'orient',
            'color'
        ];

    function chart(selection) {
        bullet.render(selection);
        return chart;
    }

    chart.dispatch = bullet.dispatch;

    chart.options = nv.utils.optionsFunc.bind(chart);

    nv.utils.rebindp(chart, bullet, Bullet.prototype, api);

    return chart;
};


