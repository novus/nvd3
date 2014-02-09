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
        width: width - this.margin.leftright,
        height: height - this.margin.topbottom
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
