var DonutPrivates = {
    donutRatio: 0.5,
    donutLabelsOutside: false
};

function Donut(options) {
    options = nv.utils.extend({}, options, DonutPrivates);
    Pie.call(this, options);
}

nv.utils.create(Donut, Pie, DonutPrivates);

Donut.prototype.getArc = function() {
    var arc = Pie.prototype.getArc.call(this);
    arc.innerRadius(this.radius() * this.donutRatio());
    return arc;
};

nv.models.donut = function(){

    var donut = new Donut(),
        api = [
            'margin',
            'width',
            'height',
            'x',
            'y',
            'description',
            'showLabels',
            'labelSunbeamLayout',
            'donutLabelsOutside',
            'pieLabelsOutside',
            'labelType',
            'donutRatio',
            'startAngle',
            'endAngle',
            'id',
            'color',
            'labelThreshold',
            'valueFormat'
        ];

    function chart(selection){
        donut.render(selection);
        return chart;
    }

    chart.dispatch = donut.dispatch;
    nv.utils.rebindp(chart, donut, Donut.prototype, api);

    chart.options = nv.utils.optionsFunc.bind(chart);

    return chart;
};


function DonutChart(options){
    PieChart.call(this, options);
}
nv.utils.create(DonutChart, PieChart, {});

DonutChart.prototype.getPie = function(){
    return nv.models.donut();
};

nv.models.donutChart = function(){
    var donutChart = new DonutChart();

    function chart(selection){
        donutChart.render(selection);
        return chart;
    }

    chart.legend = donutChart.legend;
    chart.dispatch = donutChart.dispatch;
    chart.pie = donutChart.pie;

    d3.rebind(chart, donutChart.pie, 'valueFormat', 'x', 'y', 'description', 'id', 'showLabels', 'donutLabelsOutside', 'pieLabelsOutside', 'labelType', 'donut', 'donutRatio', 'labelThreshold');

    nv.utils.rebindp(chart, donutChart, DonutChart.prototype, 'margin', 'width', 'height', 'color', 'tooltips', 'tooltipContent', 'showLegend', 'duration', 'noData', 'state', 'showLegend');

    chart.options = nv.utils.optionsFunc.bind(chart);

    return chart;
};
