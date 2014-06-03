var LayerPrivates = {
    height: null,
    width: null,
    size: {},
    margin: { top: 20, right: 20, bottom: 30, left: 40 },
    opacityDefault: 1e-6,
    color: nv.utils.defaultColor(),
    duration: 0
};

/**
 * A "Layer" represents an instance of some object that will be managed
 * with nvd3, tied to a DOM node. It should have an expected height and
 * width, some margins, and a few dispatch events.
 */
function Layer(options, dispatch){
    this.options = nv.utils.extend({}, options, LayerPrivates);
    // LayerPrivates.size = {};
    this.options.id = Math.floor(Math.random() * 10000); // TODO Replace

    var margin = this.options.margin;

    Object.defineProperty(margin, 'leftright', {
        get: function(){ return margin.left + margin.right; }
    });
    Object.defineProperty(margin, 'topbottom', {
        get: function(){ return margin.top + margin.bottom; }
    });

    dispatch = nv.utils.valueOrDefault(dispatch, []);
    dispatch = dispatch.concat([
        'stateChange', 'changeState', 'renderEnd',
        'chartClick', 'elementClick', 'elementDblClick', 'elementMouseover', 'elementMouseout'
    ]);
    this.dispatch = d3.dispatch.apply(null, dispatch);
    this.renderWatch = nv.utils.renderWatch(this.dispatch, this.duration());
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
    if (!this.hasData(data))
        return;
    this.draw(data);
    this.attachEvents();
};

/**
 * Given an element, set it as the root of this chart. Configure
 * appropriate sizing info, etc.
 */
Layer.prototype.setRoot = function(root) {
    this.svg = d3.select(root);

    this.width(this.width() || parseInt(this.svg.style('width')) || 960);
    this.height(this.height() || parseInt(this.svg.style('height')) || 500);

    this.svg.attr({
        width: this.width(),
        height: this.height()
    });

    var margin = this.margin();
    var options = this.options;
    var available = this.available = {};

    Object.defineProperty(available, 'width', {
        get: function(){
            return Math.max(options.width - (margin.leftright), 0);
        }
    });
    Object.defineProperty(available, 'height', {
        get: function(){
            return Math.max(options.height - (margin.topbottom), 0);
        }
    });

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

/**
 * This should be overridden
 */
Layer.prototype.draw = function(){};

/**
 * Default events
 */
Layer.prototype.attachEvents = function(){

    var data = null;
    this.svg.call(function(selection){
        selection.each(function(d){
            data = d;
        })
    });

    this.dispatch
        .on('changeState', function(e) {
            if (typeof e.disabled !== 'undefined') {
                data.forEach(function(series,i) {
                    series.disabled = e.disabled[i];
                });
              this.state.disabled = e.disabled;
            }
        }.bind(this));
};

Layer.prototype.margin = function(_){
    if (!arguments.length) return this.options.margin;
    var om = this.options.margin;
    om.top = nv.utils.valueOrDefault(_.top, om.top);
    om.bottom = nv.utils.valueOrDefault(_.bottom, om.bottom);
    om.left = nv.utils.valueOrDefault(_.left, om.left);
    om.right = nv.utils.valueOrDefault(_.right, om.right);
    return this;
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

Layer.prototype.duration = function(_){
    if (!arguments) return this.options.duration;
    this.options.duration = _;
    return this;
};

Layer.prototype.transitionDuration = function(_) {
    nv.deprecated('transitionDuration');
    return this.duration(_);
};

Layer.prototype.color = function(_) {
    if (!arguments.length) return this.options.color;
    this.options.color = nv.utils.getColor(_);
    return this;
};
