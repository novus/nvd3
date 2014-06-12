/**
 * Private variables
 * @type {{color: *}}
 */
var BoilerplatePrivates = {
    color: nv.utils.defaultColor()
};

/**
 * A Boilerplate
 */
function Boilerplate(options){
    options = nv.utils.extend({}, options, BoilerplatePrivates, {
        margin: {top: 1, right: 2, bottom: 3, left: 4}
        , width : 5
        , height : 6
        , chartClass: 'boilerplate'
    });

    Chart.call(this, options, []);
}

nv.utils.create(Boilerplate, Chart, BoilerplatePrivates);

/**
 * @override Chart::wrapper
 */
Boilerplate.prototype.wrapper = function(data){
    Chart.prototype.wrapper.call(this, data, []);

};

/**
 * @override Chart::draw
 */
Boilerplate.prototype.draw = function(data){

    Chart.prototype.draw.call(this, data);
};

/**
 * The boilerplate model returns a function wrapping an instance of a Boilerplate.
 */
nv.models.boilerplate = function () {
    "use strict";

    var boilerplate = new Boilerplate();

    function chart(selection) {
        boilerplate.render(selection);
        return chart;
    }

    chart.dispatch = boilerplate.dispatch;
    chart.options = nv.utils.optionsFunc.bind(chart);
    chart.xAxis = boilerplate.xAxis;
    chart.yAxis = boilerplate.yAxis;

    // d3.rebind(chart, boilerplate.something, '');

    nv.utils.rebindp(chart, boilerplate, Boilerplate.prototype,
        'margin', 'width', 'height', 'color'
    );

    return chart;
};
