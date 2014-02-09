Canvas = function(options){

    this.options = options || {};
    this.options.size || (this.options.size = {});
    this.options.margin || (this.options.margin = {});
    this.options.noData = options.noData || 'No Data Available.'

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
    this.available = {
        width: Math.max(width - this.margin.leftright, 0),
        height: Math.max(height - this.margin.topbottom, 0)
    };
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

Canvas.prototype.wrapChart = function(data) {
    var chartClass = 'nv-' + this.options.chartClass;
    this.wrap = this.svg.selectAll('g.nv-wrap.' + chartClass).data([data]);
    var gEnter = this.wrap.
        enter()
        .append('g')
        .attr({
            class: 'nvd3 nv-wrap ' + chartClass
        })
        .append('g');

    this.g = this.wrap.select('g');

    gEnter.append("rect").style("opacity",0);
    gEnter.append('g').attr('class', 'nv-x nv-axis');
    gEnter.append('g').attr('class', 'nv-y nv-axis');
    gEnter.append('g').attr('class', 'nv-linesWrap');
    gEnter.append('g').attr('class', 'nv-legendWrap');
    gEnter.append('g').attr('class', 'nv-interactive');

    this.g.select("rect")
    .attr({
      width: this.available.width,
      height: this.available.height
    });
};
