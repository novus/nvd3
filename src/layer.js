LayerPrivates = {
    size: {},
    margin: {
        top: 20,
        right: 20,
        bottom: 30,
        left: 40
    },
    noData: 'No Data Available',
    showLabels: true,
    x: function(d){return d.x;},
    y: function(d){return d.y;},
    color: nv.utils.defaultColor(),
    description: function(d) { return d.description },
    id: 0
};

/**
 * A "Layer" represents an instance of some object that will be managed
 * with nvd3, tied to a DOM node. It should have an expected height and
 * width, some margins, and a few dispatch events.
 */
function Layer(options, dispatch){
    this.options = nv.utils.extend({}, options, LayerPrivates);
    this.options.id = Math.floor(Math.random() * 10000); // TODO Replace

    var margin = this.options.margin;

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
nv.utils.create(Layer, Object, LayerPrivates);

/**
 * Given a selection, iterate every element and build the chart with the
 * current configuration in that element.
 */
Layer.prototype.render = function(selection) {
    var Layer_ = this;
    this.renderWatch.reset();

    selection.each(function(data) {
        // d3_selection_each iterates over the items in
        // the selection, passing it as the `this` context.
        // use setRoot in renderElement to re-invert the object.
        Layer_.renderElement(this, data);
    });

    this.renderWatch.renderEnd('' + this.name || 'Layer immediate');
};

/**
 * Render a single element.
 */
Layer.prototype.renderElement = function(element, data){
    this.setRoot(element);
    this.wrapper(data);
    if(this.noData(data)){
        return;
    }
    this.draw(data);
    this.attachEvents();
};

/**
 * Call the render function, using the last selection.
 */
Layer.prototype.update = function(){
    this.wrap.remove();
    this.svg.call(function(selection){
        this.render(selection);
    }.bind(this));
};

/**
 * Given an element, set it as the root of this chart. Configure
 * appropriate sizing info, etc.
 */
Layer.prototype.setRoot = function(root) {
    this.svg = d3.select(root);
    this.options.size = {
        width: (this.size().width || parseInt(this.svg.style('width')) || 960),
        height: (this.size().height || parseInt(this.svg.style('height')) || 500)
    }

    this.svg.attr(this.options.size);

    var margin = this.margin();
    var size = this.options.size;
    var available = this.available = {};
    Object.defineProperty(available, 'width', {
        get: function(){
            return Math.max(size.width - (margin.leftright), 0);
        }
    });
    Object.defineProperty(available, 'height', {
        get: function(){
            return Math.max(size.height - (margin.topbottom), 0);
        }
    });
};

/**
 * Utility to check if data is available.
 */
Layer.prototype.hasData = function(data){
    function hasValues(d){
        return !d.values || d.values.length > 0
    }
    return data && data.length > 0 && data.filter(hasValues).length > 0
};

/**
 * Render a "noData" message.
 */
Layer.prototype.noData = function(data){
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
            .attr('x', this.size().width / 2)
            .attr('y', this.size().height / 2)
            .text(function(d) { return d });

        return true;
    }
};

/**
 * Create several wrap layers to work with in the chart.
 */
Layer.prototype.wrapper = function(data, gs) {
    gs || (gs = []);
    var chartClass = 'nv-' + this.options.chartClass;
    var wrapClass = 'nv-' + this.options.wrapClass;

    this.wrap = this.svg.selectAll('g.nv-wrap.' + wrapClass).data([data]);
    this.wrapEnter = this.wrap.enter().append('g').attr({class: 'nvd3 nv-wrap ' + chartClass });
    this.defsEnter = this.wrapEnter.append('defs');
    this.gEnter = this.wrapEnter.append('g');
    this.g = this.wrap.select('g');

    gs.concat([wrapClass]).forEach(function(g){
        this.gEnter.append('g').attr('class', g);
    }, this);

    this.wrap.attr('transform', 'translate(' + this.margin().left + ',' + this.margin().top + ')');
};

Layer.prototype.draw = function(){};

Layer.prototype.attachEvents = function(){
    this.dispatch.on('changeState', function(e) {
        if (typeof e.disabled !== 'undefined') {
            data.forEach(function(series,i) {
                series.disabled = e.disabled[i];
            });

          state.disabled = e.disabled;
        }

        this.update();
    }.bind(this));
};

Layer.prototype.width = function(_){
    if (!arguments.length) return this.size().width;
    this.options.size.width = _;
    return this;
};

Layer.prototype.height = function(_){
    if (!arguments.length) return this.size().height;
    this.options.size.height = _;
    return this;
};

Layer.prototype.margin = function(_){
    if (!arguments.length) return this.options.margin;
    var om = this.options.margin;
    om.top = nv.utils.valueOrDefault(_.bottom, om.top);
    om.bottom = nv.utils.valueOrDefault(_.bottom, om.bottom);
    om.left = nv.utils.valueOrDefault(_.left, om.left);
    om.right = nv.utils.valueOrDefault(_.right, om.right);
    return this;
}

