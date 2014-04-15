/**
 * Private variables
 * @type {{color: *}}
 */
var ChartNamePrivates = {
    color: nv.utils.getColor( d3.scale.category20c().range() )
};

/**
 * A ChartName
 */
function ChartName(options){
    options = nv.utils.extend({}, options, ChartNamePrivates, {
        margin: {top: 30, right: 10, bottom: 10, left: 10}
        , width : 960
        , height : 500
        , chartClass: 'chartName'
    });

    Chart.call(this, options, []);
}

nv.utils.create(ChartName, Chart, ChartNamePrivates);

/**
 * @override Chart::wrapper
 */
ChartName.prototype.wrapper = function(data){
    Chart.prototype.wrapper.call(this, data, []);

};

/**
 * @override Chart::draw
 */
ChartName.prototype.draw = function(data){

    Chart.prototype.draw.call(this, data);
};

/**
 * The chartName model returns a function wrapping an instance of a ChartName.
 */
nv.models.chartName = function () {
    "use strict";

    var chartName = new ChartName();

    function chart(selection) {
        chartName.render(selection);
        return chart;
    }

    chart.dispatch = chartName.dispatch;
    chart.options = nv.utils.optionsFunc.bind(chart);

    // d3.rebind(chart, chartName.something, '');

    nv.utils.rebindp(chart, chartName, ChartName.prototype,
        'margin', 'width', 'height', 'color'
    );

    return chart;
};
