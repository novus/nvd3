/**
 * A Chart is a composite Layer structure.
 *
 * It has legends, axes, some possible sub charts, etc.
 */
function Chart(options, dispatch){
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
    if (options.tooltips) {
        dispatch = dispatch.concat(['tooltipShow', 'tooltipHide']);
    }

    Layer.call(this, options, dispatch);

    this.legend = nv.models.legend();
    this.state = nv.utils.valueOrDefault(this.state, {});
}
nv.utils.create(Chart, Layer);

/**
 * Apply the chart-specific wrap classes.
 */
Chart.prototype.wrapper = function(data, gs) {
    var wrapPoints = [
        'nv-x nv-axis',
        'nv-y nv-axis',
        'nv-legendWrap'
    ].concat(gs || []);
    Layer.prototype.wrapper.call(this, data, wrapPoints);

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
    if (this.options.showLegend) {
        this.legend.width(this.size().width);

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

Chart.prototype.attachEvents = function(){
    Layer.prototype.attachEvents.call(this);
    this.legend.dispatch.on('stateChange', function(newState) {
      state = newState;
      this.dispatch.stateChange(state);
    }.bind(this));

    this.dispatch.on('tooltipShow', function(e) {
      if (this.options.tooltips) this.showTooltip(e);
    }.bind(this));

    this.dispatch.on('tooltipHide', function() {
      if (this.options.tooltips) nv.tooltip.cleanup();
    }.bind(this));

    this.dispatch.on('stateChange', function(state){
        this.update();
    }.bind(this))
};

Chart.prototype.tooltip = function(_) {
    if(!arguments.length) return this.options.tooltip;
    this.options.tooltip = _;
    return this;
};
