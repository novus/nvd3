var ChartPrivates = {
    noData: 'No Data Available',
    showXAxis : true,
    showYAxis : true,
    showLegend: true,
    rightAlignYAxis: false,
    reduceXTicks : false,
    tooltips: true
};

/**
 * A Chart is a composite Layer structure.
 *
 * It has legends, axes, some possible sub charts, etc.
 */
function Chart(options, dispatch){
    options = nv.utils.extend({}, options, ChartPrivates);
    options.tooltip = nv.utils.valueOrDefault(
        options.tooltip,
        function tooltip(key, y) {
            return '<h3>' + key + '</h3>' +
                   '<p>' +  y + '</p>'
          }
    );
    options.tooltips = nv.utils.valueOrDefault(options.tooltips, true);
    options.showLegend = nv.utils.valueOrDefault(options.showLegend, true);

    dispatch = nv.utils.valueOrDefault(dispatch, []);

    if (options.tooltips)
        dispatch = dispatch.concat(['tooltipShow', 'tooltipHide']);

    Layer.call(this, options, dispatch);

    this.state = nv.utils.valueOrDefault(this.state, {});

    this.legend = nv.models.legend();

    this.xAxis = this.getAxis();
    this.yAxis = this.getAxis();
}

nv.utils.create(Chart, Layer, ChartPrivates);

Chart.prototype.getStateManager = function(){
    return nv.utils.state();
};

Chart.prototype.getLegend = function(){
    return nv.models.legend();
};

Chart.prototype.getAxis = function(){
    return nv.models.axis();
};

/**
 * Apply the chart-specific wrap classes.
 */
Chart.prototype.wrapper = function(data, gs) {

    var wrapPoints = [];

    if (this.showXAxis())
        wrapPoints.push('nv-x nv-axis');
    if (this.showYAxis())
        wrapPoints.push('nv-y nv-axis');
    if (this.showLegend())
        wrapPoints.push('nv-legendWrap');

    wrapPoints = wrapPoints.concat(gs || []);

    Layer.prototype.wrapper.call(this, data, wrapPoints);

    this.axis = {
        x: this.wrap.select('.nv-x.nv-axis'),
        y: this.wrap.select('.nv-y.nv-axis')
    };

    this.buildLegend(data);
    // The legend can change the available height.
    this.wrap.attr('transform', 'translate(' + this.margin().left + ',' + this.margin().top + ')');
};

Chart.prototype.prepareLegend = function(data){
    this.state.disabled = data.map(function(d) { return !!d.disabled });

    if (!this.defaultState) {
        var key;
        this.defaultState = {};
        for (key in this.state) {
            if (this.state[key] instanceof Array)
                this.defaultState[key] = this.state[key].slice(0);
            else
                this.defaultState[key] = this.state[key];
        }
    }
};

Chart.prototype.buildLegend = function(data) {
    this.prepareLegend(data);
    if (this.showLegend()) {
        this.legend.width(this.available.width);

        this.g.select('.nv-legendWrap')
            .datum(data)
            .call(this.legend);

        this.margin.top = this.legend.height();

        this.wrap.select('.nv-legendWrap')
          .attr('transform', 'translate(0,' + (-this.margin().top) +')')
    }
};

Chart.prototype.showLegend = function(_) {
    if(!arguments.length) return this.options.showLegend;
    this.options.showLegend = _;
    return this;
};

Chart.prototype.draw = function(data){
    this.plotAxes(data);
};

Chart.prototype.plotAxes = function(data){
    if (this.rightAlignYAxis()) {
        this.axis.y.attr("transform", "translate(" + this.available.width + ", 0)");
    }

    if (this.showXAxis()) {
        this.xAxis
            .orient('bottom')
            .tickPadding(7)
            .highlightZero(true)
            .showMaxMin(false)
            .tickFormat(function(d) { return d })
            .scale(this.xScale())
            .ticks( this.available.width / 100 )
            .tickSize(-this.available.height, 0);

        this.axis.x
            .attr('transform', 'translate(0,' + this.yScale().range()[0] + ')')
            .transition()
            .call(this.xAxis);

        var xTicks = this.g.select('.nv-x.nv-axis > g').selectAll('g');

        xTicks
            .selectAll('line, text')
            .style('opacity', 1);

        if (this.xAxis.staggerLabels()) {
            var getTranslate = function(x,y) {
                return "translate(" + x + "," + y + ")";
            };

            var staggerUp = 5, staggerDown = 17;  //pixels to stagger by
            // Issue #140
            xTicks
                .selectAll("text")
                .attr('transform', function(d,i,j) {
                    return getTranslate(0, (j % 2 == 0 ? staggerUp : staggerDown));
                });

            var totalInBetweenTicks = d3.selectAll(".nv-x.nv-axis .nv-wrap g g text")[0].length;
            this.g.selectAll(".nv-x.nv-axis .nv-axisMaxMin text")
                .attr("transform", function(d,i) {
                    return getTranslate(0, (i === 0 || totalInBetweenTicks % 2 !== 0) ? staggerDown : staggerUp);
                });
        }

        if (this.reduceXTicks())
            xTicks
                .filter(function(d,i) { return i % Math.ceil(data[0].values.length / (this.available.width / 100)) !== 0 }.bind(this))
                .selectAll('text, line')
                .style('opacity', 0);

        if(this.xAxis.rotateLabels())
            xTicks
                .selectAll('.tick text')
                .attr('transform', 'rotate(' + that.rotateLabels() + ' 0,0)')
                .style('text-anchor', that.rotateLabels() > 0 ? 'start' : 'end');

        this.axis.x.selectAll('g.nv-axisMaxMin text').style('opacity', 1);
    }

    if (this.showYAxis()) {
        this.yAxis
            .orient(this.rightAlignYAxis() ? 'right' : 'left')
            .tickFormat(d3.format(',.1f'))
            .scale(this.yScale())
            .ticks( this.available.height / 36 )
            .tickSize( -this.available.width, 0);

        this.axis.y.transition().call(this.yAxis);
    }
};

/**
 * Render a "noData" message.
 */
Chart.prototype.noData = function(data){
    if (this.svg === undefined) return;
    if ( this.hasData(data) ) {
        this.svg.selectAll('.nv-noData').remove();
        return false;
    } else {
        var noDataText = this.svg.selectAll('.nv-noData').data([this.options.noData]);

        noDataText.enter().append('text')
            .attr('class', 'nvd3 nv-noData')
            .attr('dy', '-.7em')
            .style('text-anchor', 'middle');

        noDataText
            .attr('x', this.width() / 2)
            .attr('y', this.height() / 2)
            .text(function(d) { return d });

        return true;
    }
};

Chart.prototype.attachEvents = function(){
    Layer.prototype.attachEvents.call(this);
    this.legend.dispatch.on('stateChange', function(newState) {
      this.state = newState;
      this.dispatch.stateChange(this.state);
    }.bind(this));

    this.dispatch.on('tooltipShow', function(e) {
      if (this.options.tooltips) this.showTooltip(e);
    }.bind(this));

    this.dispatch.on('tooltipHide', function() {
      if (this.options.tooltips) nv.tooltip.cleanup();
    }.bind(this));

    this.dispatch.on('stateChange', function(state){
        this.update();
    }.bind(this));
};

Chart.prototype.update = function(){
    this.svg.call(function(selection){
        this.render(selection);
    }.bind(this));
};

Chart.prototype.tooltip = function(_) {
    if(!arguments.length) return this.options.tooltip;
    this.options.tooltip = _;
    return this;
};

Chart.prototype.tooltipContent = function(_){
    this.tooltip(_);
    return this;
};

Chart.prototype.rightAlignYAxis = function(_) {
    if(!arguments.length) return this.options.rightAlignYAxis;
    this.options.rightAlignYAxis = _;
    this.yAxis.orient( (_) ? 'right' : 'left');
    return this;
};

Chart.prototype.reduceXTicks = function(_){
    if (!arguments.length) return this.options.reduceXTicks;
    this.options.reduceXTicks = _;
    return this;
};

// DEPRECATED
Chart.prototype.state = function(_) {
    nv.deprecated('Chart.state');
    if (!arguments.length) return this.options.state;
    this.options.state = _;
    return this;
};
// END DEPRECATED