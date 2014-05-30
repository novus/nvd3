var BulletChartPrivates = {
    orient : 'left' // left, right, top, bottom, TODO: top & bottom
    , reverse : false
    , ranges : function(d) { return d.ranges } // ranges (bad, satisfactory, good)
    , markers : function(d) { return d.markers } // markers (previous, goal)
    , measures : function(d) { return d.measures } // measures (actual, forecast)
    , tickFormat : null
    , tooltips: true
    , showXAxis: false
    , showYAxis: false
};

/**
 * A BulletChart
 */
function BulletChart(options){
    options = nv.utils.extend({}, options, BulletChartPrivates, {
        margin: {top: 5, right: 40, bottom: 20, left: 120},
        chartClass: 'bulletChart'
        , wrapClass : 'bulletWrap'
    });

    Chart.call(this, options);

    this.bullet = this.getBullet();
    this.state = this.getStateManager();
}

nv.utils.create(BulletChart, Chart, BulletChartPrivates);

BulletChart.prototype.getBullet = function(){
    return nv.models.bullet();
};

/**
 * @override Layer::wrapper, removed building the legend
 */
BulletChart.prototype.wrapper = function (data) {
    var gs = ['nv-titles'];
    var wrapPoints = [
        'nv-legendWrap'
    ].concat(gs || []);
    Layer.prototype.wrapper.call(this, data, wrapPoints);

    // The legend can change the available height.
    this.wrap.attr('transform', 'translate(' + this.margin().left + ',' + this.margin().top + ')');
};

/**
 * override Layer::renderElement, different noData handling
 * @param element
 * @param data
 */
BulletChart.prototype.renderElement = function(element, data){
    this.setRoot(element);

    //------------------------------------------------------------
    // Display No Data message if there's nothing to show.
    // TODO: To use common noData() function from Layer
    if (!data || !this.ranges().call(this, data)) {
        var noDataText = this.svg.selectAll('.nv-noData').data([this.options.noData]);
        noDataText.enter().append('text')
            .attr('class', 'nvd3 nv-noData')
            .attr('dy', '-.7em')
            .style('text-anchor', 'middle');
        noDataText
            .attr('x', this.margin().left + this.available.width / 2)
            .attr('y', 18 + this.margin().top + this.available.height / 2)
            .text(function(d) { return d });
        return this;
    } else
        this.svg.selectAll('.nv-noData').remove();

    this.wrapper(data);
    this.draw(data);
    this.attachEvents();

    return this;
};

/**
 * @override Chart::draw
 */
BulletChart.prototype.draw = function(data, i){

    var availableWidth = this.available.width,
        availableHeight = this.available.height;

    var rangez = this.ranges().call(this, data, i).slice().sort(d3.descending),
        markerz = this.markers().call(this, data, i).slice().sort(d3.descending),
        measurez = this.measures().call(this, data, i).slice().sort(d3.descending);

    // Compute the new x-scale.
    var x1 = d3.scale.linear()
        .domain([0, Math.max(rangez[0], markerz[0], measurez[0])])  // TODO: need to allow forceX and forceY, and xDomain, yDomain
        .range(this.reverse() ? [availableWidth, 0] : [0, availableWidth]);

    // Retrieve the old x-scale, if this is an update.
    var x0 = this.__chart__ || d3.scale.linear()
        .domain([0, Infinity])
        .range(x1.range());

    // Stash the new scale.
    this.__chart__ = x1;

    //var w0 = function(d) { return Math.abs(x0(d) - x0(0)) }, // TODO: could optimize by precalculating x0(0) and x1(0)
    //    w1 = function(d) { return Math.abs(x1(d) - x1(0)) };

    var title = this.gEnter.select('.nv-titles').append('g')
        .attr('text-anchor', 'end')
        .attr('transform', 'translate(-6,' + (this.height() - this.margin().top - this.margin().bottom) / 2 + ')');
    title.append('text')
        .attr('class', 'nv-title')
        .text(function(d) { return d.title; });

    title.append('text')
        .attr('class', 'nv-subtitle')
        .attr('dy', '1em')
        .text(function(d) { return d.subtitle; });

    this.bullet
        .margin({top: 0, right: 0, bottom: 0, left: 0})
        .width(availableWidth)
        .height(availableHeight);

    var bulletWrap = this.g.select('.nv-bulletWrap');
    d3.transition(bulletWrap).call(this.bullet);

    // Compute the tick format.
    var format = this.tickFormat() || x1.tickFormat( availableWidth / 100 );

    // Update the tick groups.
    var tick = this.g.selectAll('g.nv-tick')
        .data(x1.ticks( availableWidth / 50 ), function(d) {
            return this.textContent || format(d);
        });

    // Initialize the ticks with the old scale, x0.
    var tickEnter = tick.enter().append('g')
        .attr('class', 'nv-tick')
        .attr('transform', function(d) { return 'translate(' + x0(d) + ',0)' })
        .style('opacity', this.opacityDefault());

    tickEnter.append('line')
        .attr('y1', availableHeight)
        .attr('y2', availableHeight * 7 / 6);

    tickEnter.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '1em')
        .attr('y', availableHeight * 7 / 6)
        .text(format);

    // Transition the updating ticks to the new scale, x1.
    var tickUpdate = d3.transition(tick)
        .attr('transform', function(d) { return 'translate(' + x1(d) + ',0)' })
        .style('opacity', 1);

    tickUpdate.select('line')
        .attr('y1', availableHeight)
        .attr('y2', availableHeight * 7 / 6);

    tickUpdate.select('text')
        .attr('y', availableHeight * 7 / 6);

    // Transition the exiting ticks to the new scale, x1.
    d3.transition(tick.exit())
        .attr('transform', function(d) { return 'translate(' + x1(d) + ',0)' })
        .style('opacity', this.opacityDefault())
        .remove();
};

/**
 * @override Layer::attachEvents
 */
BulletChart.prototype.attachEvents = function(){
    Layer.prototype.attachEvents.call(this);

    this.bullet.dispatch
        .on('elementMouseover.tooltip', function(e) {
            this.dispatch.tooltipShow(e);
        }.bind(this))
        .on('elementMouseout.tooltip', function() {
            this.dispatch.tooltipHide();
        }.bind(this));

    this.dispatch
        .on('tooltipHide', function() {
            if (this.tooltips()) nv.tooltip.cleanup();
        }.bind(this))
        .on('tooltipShow', function(e) {
            this.svg.call(function(selection){
                selection.each(function(data){
                    e.key = data.title;
                    if (this.tooltips()) this.showTooltip(e, this.svg[0][0]);
                }.bind(this))
            }.bind(this));
        }.bind(this));
};

BulletChart.prototype.orient = function(_) {
    if (!arguments.length) return this.options.orient;
    this.options.orient = _;
    this.reverse( this.orient() == 'right' || this.orient() == 'bottom' );
    return this;
};

BulletChart.prototype.showTooltip = function(e, offsetElement) {
    var left = e.pos[0] + ( offsetElement.offsetLeft || 0 ) + this.margin().left,
        top = e.pos[1] + ( offsetElement.offsetTop || 0) + this.margin().top,
        content = this.tooltip()(e.key, e.label, e.value);

    nv.tooltip.show([left, top], content, e.value < 0 ? 'e' : 'w', null, offsetElement);
};

/**
 * The bulletChart model returns a function wrapping an instance of a BulletChart.
 */
nv.models.bulletChart = function() {
    "use strict";

    var bulletChart = new BulletChart(),
        api = [
            'orient',
            'tooltipContent',
            'ranges',
            'markers',
            'measures',
            'width',
            'height',
            'margin',
            'tickFormat',
            'tooltips',
            'noData',
            'reduceXTicks',
            'rightAlignYAxis',
            'showXAxis',
            'showYAxis'
        ];

    function chart(selection) {
        bulletChart.render(selection);
        return chart;
    }

    chart.dispatch = bulletChart.dispatch;
    chart.legend = bulletChart.legend;
    chart.bullet = bulletChart.bullet;
    chart.xAxis = bulletChart.xAxis;
    chart.yAxis = bulletChart.yAxis;
    chart.state = bulletChart.state;

    d3.rebind(chart, bulletChart.bullet,
        'color'
    );

    chart.options = nv.utils.optionsFunc.bind(chart);

    nv.utils.rebindp(chart, bulletChart, BulletChart.prototype, api);

    return chart;
};




