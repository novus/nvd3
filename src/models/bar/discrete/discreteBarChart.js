function DiscreteBarChart(options){

    options = nv.utils.valueOrDefault(options, {
        margin: {top: 15, right: 10, bottom: 50, left: 60}
        , chartClass: 'discreteBarWithAxes'
        , wrapClass: 'barsWrap'
    });

    Chart.call(this, options);

    this.discreteBar = nv.models.discreteBar();
    this.yAxis = nv.models.axis();
    this.xAxis = nv.models.axis();

    this.x = undefined;
    this.y = undefined;
    this.state = {};
    this.defaultState = null;
    this.showXAxis = true;
    this.showYAxis = true;
    this.rightAlignYAxis = false;
    this.staggerLabels = false;
    this.tooltips = true;
    this.transitionDuration = 250;
}

DiscreteBarChart.prototype = Object.create(Chart.prototype);

DiscreteBarChart.prototype.wrapChart = function(data){
    if(this.noData(data))
        return;

    Chart.prototype.wrapChart.call(this, data);

    var rightAlignYAxis = this.rightAlignYAxis
        , availableWidth = this.available.width
        , availableHeight = this.available.height
        , xTicksPadding = [5, 17]
        , xTicks = availableWidth / 100
        , yTicks = availableHeight / 36
        ;

    this.xAxis
        .orient('bottom')
        .highlightZero(false)
        .showMaxMin(false)
        .tickFormat(function(d) { return d });
    this.yAxis
        .orient(rightAlignYAxis ? 'right' : 'left')
        .tickFormat(d3.format(',.1f'));

    this.discreteBar.width(availableWidth).height(availableHeight);
    this.x = this.discreteBar.xScale();
    this.y = this.discreteBar.yScale().clamp(true);

    this.gEnter.insert('g', '.nv-'+this.options.wrapClass).attr('class', 'nv-x nv-axis');
    this.gEnter.insert('g', '.nv-'+this.options.wrapClass).attr('class', 'nv-y nv-axis')
        .append('g')
        .attr('class', 'nv-zeroLine')
        .append('line');

    if (rightAlignYAxis)
        this.g.select(".nv-y.nv-axis").attr("transform", "translate(" + availableWidth + ",0)");

    //------------------------------------------------------------
    // Main Chart Component(s)

    var barsWrap = this.g.select('.nv-barsWrap')
        .datum(data.filter(function(d) { return !d.disabled }))
        .transition()
        .call( this.discreteBar.width(availableWidth).height(availableHeight) );
    //------------------------------------------------------------

    this.defsEnter.append('clipPath')
        .attr('id', 'nv-x-label-clip-' + this.discreteBar.id())
        .append('rect');

    this.g.select('#nv-x-label-clip-' + this.discreteBar.id() + ' rect')
        .attr('width', this.x.rangeBand() * (this.staggerLabels ? 2 : 1))
        .attr('height', 16)
        .attr('x', -this.x.rangeBand() / (this.staggerLabels ? 1 : 2 ));

    //------------------------------------------------------------
    // Setup Axes

    if (this.showXAxis) {
        this.xAxis
            .scale( this.x )
            .ticks( xTicks )
            .tickSize( -availableHeight, 0 );

        this.g.select('.nv-x.nv-axis')
            .attr('transform', 'translate(0,' + (this.y.range()[0] + ((this.discreteBar.showValues() && this.y.domain()[0] < 0) ? 16 : 0)) + ')')
            .transition()
            .call(this.xAxis);

        // xTicks
        if (this.staggerLabels) {
            this.g.select('.nv-x.nv-axis')
                .selectAll('g')
                .selectAll('text')
                .attr('transform', function(d,i,j) { return 'translate(0,' + (j % 2 == 0 ? xTicksPadding[0] : xTicksPadding[1]) + ')' })
        }
    }

    if (this.showYAxis) {
        this.yAxis
            .scale( this.y )
            .ticks( yTicks )
            .tickSize( -availableWidth, 0);

        this.g.select('.nv-y.nv-axis')
            .transition()
            .call(this.yAxis);
    }

    // Zero line
    this.g.select(".nv-zeroLine line")
        .attr("x1",0)
        .attr("x2", availableWidth)
        .attr("y1", this.y(0))
        .attr("y2", this.y(0));

    var discreteBarWrap = this.g.select('.nv-barsWrap').datum(data);
    d3.transition(discreteBarWrap).call(this.discreteBar);

};

DiscreteBarChart.prototype.staggerLabels = function(_){
    if (!arguments.length) return this.staggerLabels;
    this.staggerLabels = _;
    return this;
};

DiscreteBarChart.prototype.transitionDuration = function(_) {
    if (!arguments.length) return this.transitionDuration;
    this.transitionDuration = _;
    return this;
};

DiscreteBarChart.prototype.onDispatches = function(){
    Chart.prototype.onDispatches.call(this);
    this.discreteBar.dispatch.on('elementMouseout.tooltip', function(e) {
        this.dispatch.tooltipHide(e);
    }.bind(this));

    this.discreteBar.dispatch.on('elementMouseover.tooltip', function(e) {
        e.pos = [e.pos[0] +  this.margin.left, e.pos[1] + this.margin.top];
        this.dispatch.tooltipShow(e);
    }.bind(this));
};

DiscreteBarChart.prototype.showTooltip = function(e) {
    var offsetElement = this.svg[0][0].parentNode,
        left = e.pos[0] + ( offsetElement.offsetLeft || 0 ),
        top = e.pos[1] + ( offsetElement.offsetTop || 0),
        x = this.xAxis.tickFormat()(this.discreteBar.x()(e.point, e.pointIndex)),
        y = this.yAxis.tickFormat()(this.discreteBar.y()(e.point, e.pointIndex)),
        content = this.tooltip(e.series.key, x, y);
    nv.tooltip.show([left, top], content, e.value < 0 ? 'n' : 's', null, offsetElement);
};

nv.models.discreteBarChart = function() {
    "use strict";

    var discreteBarChart = new DiscreteBarChart();

    function chart(selection) {
        discreteBarChart.render(selection);
        return chart;
    }

    //============================================================
    // Expose Public Variables
    //------------------------------------------------------------
    chart.legend = discreteBarChart.legend;
    chart.dispatch = discreteBarChart.dispatch;
    chart.discreteBar = discreteBarChart.discreteBar;
    chart.xAxis = discreteBarChart.xAxis;
    chart.yAxis = discreteBarChart.yAxis;

    d3.rebind(chart, discreteBarChart.discreteBar, 'x', 'y', 'xDomain', 'yDomain', 'xRange', 'yRange', 'forceX', 'forceY', 'id', 'showValues', 'valueFormat');
    chart.options = nv.utils.optionsFunc.bind(chart);

    [
        'margin',
        'width',
        'height',
        'color',
        'tooltips',
        'tooltipContent',
        'showLegend',
        'showXAxis',
        'showYAxis',
        'rightAlignYAxis',
        'staggerLabels',
        'noData',
        'transitionDuration',
        'state'
    ]
        .forEach(function(method){
            chart[method] = function(arg1){
                var ret = null;
                switch (arguments.length) {
                    case 0:
                        ret = DiscreteBarChart.prototype[method].call(discreteBarChart);
                        break;
                    case 1:
                        ret = DiscreteBarChart.prototype[method].call(discreteBarChart, arg1);
                        break;
                    default:
                        ret = DiscreteBarChart.prototype[method].apply(discreteBarChart, arguments)
                }
                return ret === discreteBarChart ? chart : ret;
            };
        });

    return chart;
};