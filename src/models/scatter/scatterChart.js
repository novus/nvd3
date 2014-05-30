var ScatterChartPrivates = {
    xScale         : null
    , yScale       : null
    , xPadding     : 0
    , yPadding     : 0
    , showDistX    : false
    , showDistY    : false
    , showControls : !!d3.fisheye
    , fisheye      : 0
    , pauseFisheye : false
    , tooltips     : true
    , tooltipX     : function(key, x) { return '<strong>' + x + '</strong>' }
    , tooltipY     : function(key, x, y) { return '<strong>' + y + '</strong>' }
    , tooltip      : null
    , defaultState : null
    , transitionDuration : 250
    , controlsData : [ { key: 'Magnify', disabled: true } ]
    , xScale0: null
    , yScale0: null
    , duration : 250
    , state: null
};

/**
 * A ScatterChart
 */
function ScatterChart(options){
    options = nv.utils.extend({}, options, ScatterChartPrivates, {
        margin: {top: 30, right: 20, bottom: 50, left: 75}
        , chartClass: 'scatterChart'
        , wrapClass: 'scatterWrap'
    });
    Chart.call(this, options);

    this.scatter = this.getScatter();
    this.distX = this.getDistribution();
    this.distY = this.getDistribution();
    this.controls = this.getLegend();
    this.state = this.getStateManager();

    this.xScale( d3.fisheye ? d3.fisheye.scale(d3.scale.linear).distortion(0) : this.scatter.xScale() );
    this.yScale( d3.fisheye ? d3.fisheye.scale(d3.scale.linear).distortion(0) : this.scatter.yScale() );

    this.scatter
        .xScale(this.xScale())
        .yScale(this.yScale())
    ;
    this.distX
        .axis('x')
    ;
    this.distY
        .axis('y')
    ;

    this.controls.updateState(false);
}

nv.utils.create(ScatterChart, Chart, ScatterChartPrivates);

ScatterChart.prototype.getScatter = function(){
    return nv.models.scatter();
};

ScatterChart.prototype.getDistribution = function(){
    return nv.models.distribution();
};

/**
 * @override Chart::wrapper
 */
ScatterChart.prototype.wrapper = function (data) {
    Chart.prototype.wrapper.call(this, data, ['nv-distWrap', 'nv-controlsWrap']);

    this.renderWatch.models(this.scatter);
    if (this.showXAxis()) this.renderWatch.models(this.xAxis);
    if (this.showYAxis()) this.renderWatch.models(this.yAxis);
    if (this.showDistX()) this.renderWatch.models(this.distX);
    if (this.showDistY()) this.renderWatch.models(this.distY);
};

/**
 * @override Chart::draw
 */
ScatterChart.prototype.draw = function(data){

    var that = this;

    this.xScale0(this.xScale0() || this.xScale());
    this.yScale0(this.yScale0() || this.yScale());

    //------------------------------------------------------------
    // Main Chart Component(s)

    this.scatter
        .margin({top: 0, right: 0, bottom: 0, left: 0})
        .width(this.available.width)
        .height(this.available.height)
        .color(data.map(function(d,i) {
            return d.color || that.color()(d, i);
        }).filter(function(d,i) { return !data[i].disabled }));

    if (this.xPadding() !== 0)
        this.scatter.xDomain(null);

    if (this.yPadding() !== 0)
        this.scatter.yDomain(null);

    this.wrap.select('.nv-scatterWrap')
        .datum(data.filter(function(d) { return !d.disabled }))
        .call(this.scatter);

    //Adjust for x and y padding
    if (this.xPadding() !== 0) {
        var xRange = this.xScale().domain()[1] - this.xScale().domain()[0];
        this.scatter.xDomain([this.xScale().domain()[0] - (this.xPadding() * xRange), this.xScale().domain()[1] + (this.xPadding() * xRange)]);
    }

    if (this.yPadding() !== 0) {
        var yRange = this.yScale().domain()[1] - this.yScale().domain()[0];
        this.scatter.yDomain([this.yScale().domain()[0] - (this.yPadding() * yRange), this.yScale().domain()[1] + (this.yPadding() * yRange)]);
    }

    //Only need to update the scatter again if x/yPadding changed the domain.
    if (this.yPadding() !== 0 || this.xPadding() !== 0) {
        this.wrap.select('.nv-scatterWrap')
            .datum(data.filter(function(d) { return !d.disabled }))
            .call(this.scatter);
    }

    //------------------------------------------------------------

    if (this.showDistX()) {
        this.distX
            .margin({top: 0, right: 0, bottom: 0, left: 0})
            .getData(this.scatter.x())
            .scale(this.xScale())
            .width(this.available.width)
            .color(data.map(function(d,i) {
                return d.color || that.color()(d, i);
            }).filter(function(d,i) { return !data[i].disabled }));
        this.gEnter.select('.nv-distWrap').append('g')
            .attr('class', 'nv-distributionX');
        this.g.select('.nv-distributionX')
            .attr('transform', 'translate(0,' + this.yScale().range()[0] + ')')
            .datum(data.filter(function(d) { return !d.disabled }))
            .call(this.distX);
    }

    if (this.showDistY()) {
        this.distY
            .margin({top: 0, right: 0, bottom: 0, left: 0})
            .getData(this.scatter.y())
            .scale(this.yScale())
            .width(this.available.height)
            .color(data.map(function(d,i) {
                return d.color || that.color()(d, i);
            }).filter(function(d,i) { return !data[i].disabled }));
        this.gEnter.select('.nv-distWrap').append('g')
            .attr('class', 'nv-distributionY');
        this.g.select('.nv-distributionY')
            .attr('transform',
                'translate(' + (this.rightAlignYAxis() ? this.available.width : -this.distY.size() ) + ',0)')
            .datum(data.filter(function(d) { return !d.disabled }))
            .call(this.distY);
    }

    //------------------------------------------------------------

    if (d3.fisheye) {
        this.g.select('.nv-background')
            .attr('width', this.available.width)
            .attr('height', this.available.height);

        this.g.select('.nv-background').on('mousemove', updateFisheye);
        this.g.select('.nv-background').on('click', function() { that.pauseFisheye(!that.pauseFisheye());});
        this.scatter.dispatch.on('elementClick.freezeFisheye', function() { that.pauseFisheye(!that.pauseFisheye()) });
    }

    function updateFisheye() {
        if (that.pauseFisheye()) {
            that.g.select('.nv-point-paths').style('pointer-events', 'all');
            return false;
        }

        that.g.select('.nv-point-paths').style('pointer-events', 'none' );

        var mouse = d3.mouse(this);
        that.xScale().distortion(that.fisheye()).focus(mouse[0]);
        that.yScale().distortion(that.fisheye()).focus(mouse[1]);

        that.g.select('.nv-scatterWrap')
            .call(that.scatter);

        if (that.showXAxis())
            that.g.select('.nv-x.nv-axis').call(that.xAxis);

        if (that.showYAxis())
            that.g.select('.nv-y.nv-axis').call(that.yAxis);

        that.g.select('.nv-distributionX')
            .datum(data.filter(function(d) { return !d.disabled }))
            .call(that.distX);
        that.g.select('.nv-distributionY')
            .datum(data.filter(function(d) { return !d.disabled }))
            .call(that.distY);
    }

    //store old scales for use in transitions on update
    this.xScale0(this.xScale().copy());
    this.yScale0(this.yScale().copy());

    Chart.prototype.draw.call(this, data);
};

/**
 * @override Chart::attachEvents
 */
ScatterChart.prototype.attachEvents = function(){
    Chart.prototype.attachEvents.call(this);

    var that = this;

    this.scatter.dispatch.on('elementMouseout.tooltip', function(e) {
        this.dispatch.tooltipHide(e);
        d3.select('.nv-chart-' + this.scatter.id() + ' .nv-series-' + e.seriesIndex + ' .nv-distx-' + e.pointIndex)
            .attr('y1', 0);
        d3.select('.nv-chart-' + this.scatter.id() + ' .nv-series-' + e.seriesIndex + ' .nv-disty-' + e.pointIndex)
            .attr('x2', this.distY.size());
    }.bind(this));

    this.dispatch.on('tooltipHide', function() {
        if (this.tooltips()) nv.tooltip.cleanup();
    }.bind(this));

    this.controls.dispatch.on('legendClick', function(d) {
        d.disabled = !d.disabled;

        that.fisheye(d.disabled ? 0 : 2.5);
        that.g.select('.nv-background') .style('pointer-events', d.disabled ? 'none' : 'all');
        that.g.select('.nv-point-paths').style('pointer-events', d.disabled ? 'all' : 'none' );

        if (d.disabled) {
            that.xScale().distortion(that.fisheye()).focus(0);
            that.yScale().distortion(that.fisheye()).focus(0);
            that.g.select('.nv-scatterWrap').call(that.scatter);
            that.g.select('.nv-x.nv-axis').call(that.xAxis);
            that.g.select('.nv-y.nv-axis').call(that.yAxis);
        } else
            that.pauseFisheye(false);

        that.update();
    });

    that.legend.dispatch.on('stateChange', function(newState) {
        that.state.disabled = newState.disabled;
        that.dispatch.stateChange(that.state);
        that.update();
    });

    that.scatter.dispatch.on('elementMouseover.tooltip', function(e) {
        d3.select('.nv-chart-' + that.scatter.id() + ' .nv-series-' + e.seriesIndex + ' .nv-distx-' + e.pointIndex)
            .attr('y1', function() { return e.pos[1] - that.available().height;});
        d3.select('.nv-chart-' + that.scatter.id() + ' .nv-series-' + e.seriesIndex + ' .nv-disty-' + e.pointIndex)
            .attr('x2', e.pos[0] + that.distX.size());

        e.pos = [e.pos[0] + that.margin().left, e.pos[1] + that.margin().top];
        that.dispatch.tooltipShow(e);
    });

    this.dispatch.on('tooltipShow', function(e) {
        if (that.tooltips())
            that.showTooltip(e, that.svg[0][0]);
    });

    // Update chart from a state object passed to event handler
    that.dispatch.on('changeState', function(e) {
        if (typeof e.disabled !== 'undefined') {
            that.svg.call(function(selection){
                selection.each(function(data){
                    data.forEach(function(series,i) {
                        series.disabled = e.disabled[i];
                    });
                    that.state.disabled = e.disabled;
                })
            });
        }
        that.update();
    });
};

ScatterChart.prototype.showTooltip = function(e, offsetElement) {
    //TODO: make tooltip style an option between single or dual on axes (maybe on all charts with axes?)

    var left = e.pos[0] + ( offsetElement.offsetLeft || 0 ),
        top = e.pos[1] + ( offsetElement.offsetTop || 0),
        leftX = e.pos[0] + ( offsetElement.offsetLeft || 0 ),
        topX = this.yScale().range()[0] + this.margin().top + ( offsetElement.offsetTop || 0),
        leftY = this.xScale().range()[0] + this.margin().left + ( offsetElement.offsetLeft || 0 ),
        topY = e.pos[1] + ( offsetElement.offsetTop || 0),
        xVal = this.xAxis.tickFormat()(this.scatter.x()(e.point, e.pointIndex)),
        yVal = this.yAxis.tickFormat()(this.scatter.y()(e.point, e.pointIndex));

    if( this.tooltipX() != null )
        nv.tooltip.show([leftX, topX], this.tooltipX()(e.series.key, xVal, yVal, e, this), 'n', 1, offsetElement, 'x-nvtooltip');
    if( this.tooltipY() != null )
        nv.tooltip.show([leftY, topY], this.tooltipY()(e.series.key, xVal, yVal, e, this), 'e', 1, offsetElement, 'y-nvtooltip');
    if( this.tooltip() != null )
        nv.tooltip.show([left, top], this.tooltip()(e.series.key, xVal, yVal, e, this), e.value < 0 ? 'n' : 's', null, offsetElement);
};

ScatterChart.prototype.color = function(_) {
    if (!arguments.length) return this.options.color;
    this.options.color = nv.utils.getColor(_);
    this.legend.color(this.color());
    this.distX.color(this.color());
    this.distY.color(this.color());
    return this;
};

ScatterChart.prototype.duration = function(_) {
    if (!arguments.length) return this.options.duration;
    this.options.duration = _;
    this.renderWatch.reset(_);
    this.scatter.duration(_);
    this.xAxis.duration(_);
    this.yAxis.duration(_);
    this.distX.duration(_);
    this.distY.duration(_);
    return this;
};

/**
 * The scatterChart model returns a function wrapping an instance of a ScatterChart.
 */
nv.models.scatterChart = function() {
    "use strict";

    var scatterChart = new ScatterChart(),
        api = [
            'margin',
            'width',
            'height',
            'color',
            'showDistX',
            'showDistY',
            'showControls',
            'showLegend',
            'showXAxis',
            'showYAxis',
            'fisheye',
            'xPadding',
            'yPadding',
            'tooltips',
            'tooltipContent',
            'state',
            'defaultState',
            'noData',
            'duration',
            'transitionDuration',
            'tooltipX',
            'tooltipY',
            'reduceXTicks',
            'rightAlignYAxis'
        ];

    function chart(selection) {
        scatterChart.render(selection);
        return chart;
    }

    chart.dispatch = scatterChart.dispatch;
    chart.scatter = scatterChart.scatter;
    chart.legend = scatterChart.legend;
    chart.controls = scatterChart.controls;
    chart.distX = scatterChart.distX;
    chart.distY = scatterChart.distY;
    chart.xAxis = scatterChart.xAxis;
    chart.yAxis = scatterChart.yAxis;

    d3.rebind(chart, scatterChart.scatter,
        'id',
        'interactive',
        'pointActive',
        'x',
        'y',
        'shape',
        'size',
        'xScale',
        'yScale',
        'zScale',
        'xDomain',
        'yDomain',
        'xRange',
        'yRange',
        'sizeDomain',
        'sizeRange',
        'forceX',
        'forceY',
        'forceSize',
        'clipVoronoi',
        'clipRadius',
        'useVoronoi'
    );

    chart.options = nv.utils.optionsFunc.bind(chart);

    nv.utils.rebindp(chart, scatterChart, ScatterChart.prototype, api);

    return chart;
};
