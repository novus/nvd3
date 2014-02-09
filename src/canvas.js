function Canvas(options){
    this.options = options || {};
    this.options.size || (this.options.size = {});
    this.options.margin || (this.options.margin = {});
    this.options.noData = options.noData || 'No Data Available.';
    (typeof this.options.showLegend !== 'undefined') || (this.options.showLegend = true);

    this.legend = nv.models.legend();

    var margin = this.margin = {
        top: options.margin.top || 20,
        right: options.margin.top || 20,
        bottom: options.margin.top || 30,
        left: options.margin.top || 40
    };

    Object.defineProperty(margin, 'leftright', {
        get: function(){ return margin.left + margin.right; }
    });
    Object.defineProperty(margin, 'topbottom', {
        get: function(){ return margin.top + margin.bottom; }
    });
};

Canvas.prototype.setRoot = function(root) {
    this.svg = d3.select(root);
    width = (this.options.size.width || parseInt(this.svg.style('width')) || 960);
    height = (this.options.size.height || parseInt(this.svg.style('height')) || 500);

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

Canvas.prototype.noData = function(data){
  if (!data || !data.length || !data.filter(function(d) { return d.values.length }).length) {
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
  } else {
    this.svg.selectAll('.nv-noData').remove();
    return false;
  }
};

Canvas.prototype.wrapChart = function(data, gs) {
    gs || (gs = []);
    var chartClass = 'nv-' + this.options.chartClass;
    var wrapClass = 'nv-' + this.options.wrapClass;

    this.wrap = this.svg.selectAll('g.nv-wrap.' + chartClass).data([data]);
    this.wrapEnter = this.wrap.enter().append('g').attr({class: 'nvd3 nv-wrap ' + chartClass })
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

function Chart(options){
    Canvas.call(this, options);
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
};

Chart.prototype.buildLegend = function(data) {
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
