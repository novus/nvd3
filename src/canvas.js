function Canvas(options, dispatch){
    this.options = options || {};
    this.options.size || (this.options.size = {});
    this.options.margin || (this.options.margin = {});
    this.options.noData = options.noData || 'No Data Available.';

    var margin = this.margin = {
        top     : nv.utils.valueOrDefault(options.margin.top, 20),
        right   : nv.utils.valueOrDefault(options.margin.right, 20),
        bottom  : nv.utils.valueOrDefault(options.margin.bottom, 30),
        left    : nv.utils.valueOrDefault(options.margin.left, 40)
    };

    Object.defineProperty(margin, 'leftright', {
        get: function(){ return margin.left + margin.right; }
    });
    Object.defineProperty(margin, 'topbottom', {
        get: function(){ return margin.top + margin.bottom; }
    });

    dispatch = nv.utils.valueOrDefault(dispatch, []);
    dispatch = dispatch.concat(['stateChange', 'changeState', 'renderEnd']);
    this.dispatch = d3.dispatch.apply(null, dispatch);
    this.renderWatch = nv.utils.renderWatch(this.dispatch);
}

Canvas.prototype.render = function(selection) {
    if(arguments.length === 1) {
        this.selection = selection;
    }

    var canvas_ = this;

    this.renderWatch.reset();
    this.selection.each(function(data) {
        canvas_.setRoot(this);
        canvas_.wrapChart(data);

        canvas_.dispatch.on('changeState', function(e) {
            if (typeof e.disabled !== 'undefined') {
                data.forEach(function(series,i) {
                    series.disabled = e.disabled[i];
                });

              state.disabled = e.disabled;
            }

            canvas_.render(selection);
        });
    });

    this.renderWatch.renderEnd('' + this.name || 'canvas' + ' immediate');
};

Canvas.prototype.update = function(){
    this.render();
};

Canvas.prototype.setRoot = function(root) {
    this.svg = d3.select(root);
    var width = (this.options.size.width || parseInt(this.svg.style('width')) || 960)
        , height = (this.options.size.height || parseInt(this.svg.style('height')) || 500);

    this.svg.attr({
        width: width,
        height: height
    });

    this.size = {
        width: width,
        height: height
    };

    var margin = this.margin;
    var available = this.available = {};
    Object.defineProperty(available, 'width', {
        get: function(){ return Math.max(width - margin.leftright, 0); }
    });
    Object.defineProperty(available, 'height', {
        get: function(){ return Math.max(height - margin.topbottom, 0); }
    });
};

Canvas.prototype.hasData = function(data){
    function hasValues(d){
        return !d.values || d.values.length > 0
    }
    return data && data.length > 0 && data.filter(hasValues).length > 0
};

Canvas.prototype.noData = function(data){
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
            .attr('x', this.size.width / 2)
            .attr('y', this.size.height / 2)
            .text(function(d) { return d });

        return true;
    }
};

Canvas.prototype.wrapChart = function(data, gs) {
    gs || (gs = []);
    var chartClass = 'nv-' + this.options.chartClass;
    var wrapClass = 'nv-' + this.options.wrapClass;

    this.wrap = this.svg.selectAll('g.nv-wrap.' + chartClass).data([data]);
    this.wrapEnter = this.wrap.enter().append('g').attr({class: 'nvd3 nv-wrap ' + chartClass });
    this.defsEnter = this.wrapEnter.append('defs');
    this.gEnter = this.wrapEnter.append('g');
    this.g = this.wrap.select('g');

    // this.gEnter.append("rect").style("opacity",0);
    // this.g.select("rect")
    // .attr({
    //   width: this.available.width,
    //   height: this.available.height
    // });
    var this_ = this;
    [wrapClass].concat(gs).forEach(function(g){
        this_.gEnter.append('g').attr('class', g);
    });

    this.wrap.attr('transform', 'translate(' + this.margin.left + ',' + this.margin.top + ')');
};

Canvas.prototype.width = function(_){
    if (!arguments.length) return this.size.width;
    this.options.size.width = _;
    return this;
}

Canvas.prototype.height = function(_){
    if (!arguments.length) return this.size.height;
    this.options.size.height = _;
    return this;
};







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

    Canvas.call(this, options, dispatch);

    this.legend = nv.models.legend();
}
Chart.prototype = Object.create(Canvas.prototype);

Chart.prototype.wrapChart = function(data, gs) {
    var wrapPoints = [
        'nv-x nv-axis',
        'nv-y nv-axis',
        'nv-legendWrap'
    ].concat(gs);
    Canvas.prototype.wrapChart.call(this, data, wrapPoints);

    this.buildLegend(data);
    // The legend can change the available height.
    this.wrap.attr('transform', 'translate(' + this.margin.left + ',' + this.margin.top + ')');

    this.onDispatches();
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
}

Chart.prototype.buildLegend = function(data) {
    this.prepareLegend(data);
    if (this.options.showLegend) {
        this.legend.width(this.size.width);

        this.g.select('.nv-legendWrap')
            .datum(data)
            .call(this.legend);

        this.margin.top = this.legend.height();

        this.wrap.select('.nv-legendWrap')
          .attr('transform', 'translate(0,' + (-this.margin.top) +')')
    }
};

Chart.prototype.onDispatches = function(){
    this.legend.dispatch.on('stateChange', function(newState) {
      state = newState;
      this.dispatch.stateChange(state);
      //  TODO
      this.render();
    }.bind(this));

    this.dispatch.on('tooltipShow', function(e) {
      if (this.options.tooltips) this.showTooltip(e);
    }.bind(this));

    this.dispatch.on('tooltipHide', function() {
      if (this.options.tooltips) nv.tooltip.cleanup();
    }.bind(this));
};

Chart.prototype.showLegend = function(_) {
    if(!arguments.length) return this.options.showLegend;
    this.options.showLegend = _;
    return this;
};

Chart.prototype.tooltip = function(_) {
    if(!arguments.length) return this.options.tooltip;
    this.options.tooltip = _;
    return this;
};
