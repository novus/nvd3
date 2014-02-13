/*
Get a new SVG canvas, with margins and scales. Pass an object as `options` to
set values. Defaults:

{
	size: # Size of SVG. Available size will be smaller by the size of the margins.
		width: 960
		height: 500
		available:
			width: 900
			height: 450
	margin: # Margins for the graphic.
		top: 20
		right: 20
		bottom: 30
		left: 40
	scale: # d3.scales to scale against the canvas
		x: linear
		y: linear
	domain: # Domain of scales for the canvas.
		x: [0, 1]
		y: [0, 1]
}

@param root String selector for finding the SVG element.
@param options Object matching the defaults to override.
@return Object with defaults, overriden by the options, and an additional two properties:
	{
	svg: SVG_Element # SVG root
	defs: SVG_Defs_Element # <defs> to attach gradient and filter definitions to.
	}
*/
function Canvas (root, chart) {
    var margin, width, height, svg, scales, canvas;

    root == null && (root = 'body');
	svg = d3.select(root).attr({
		width: width,
		height: height
	});

    options = chart.options;
    options.size || (options.size = {});
    options.margin || (options.margin = {});
    options.scale || (options.scale = {});
    options.domain || (options.domain = {});

    margin = {
        top: options.margin.top || 20,
        right: options.margin.top || 20,
        bottom: options.margin.top || 30,
        left: options.margin.top || 40
    };

    margin.leftright = margin.left + margin.right;
    margin.topbottom = margin.top + margin.bottom;

    width = (options.size.width || parseInt(svg.style('width')) || 960);
    height = (options.size.height || parseInt(svg.style('height')) || 500);


	scales = {
		x: d3.scale[options.scale.x || 'linear']()
			.range([0, width])
			.domain(options.domain.x || [0, 1])
			.nice(),
		y: d3.scale[options.scale.y || 'linear']()
			.range([0, height])
			.domain(options.domain.y || [0, 1])
			.nice()
	};

	chart.size = {
		width: width,
		height: height,
		available: {
			width: width - margin.leftright,
			height: height - margin.topbottom
		},
	};
    chart.margin = margin,
	chart.scale = scales,
	chart.svg = svg,
	chart.defs = svg.select('defs');
}

function Chart (options) {
    // var chart = Canvas(root, options);
    options = options || {};
    var chart = {
        options: options,
        noData: options.noData || 'No Data Available.',
        color: options.color || nv.utils.defaultColor()
    };

    Chart.axis(chart, options);
    Chart.defaultState(chart, options);
    Chart.legend(chart, options);

    chart.tooltips = true;
    chart.tooltip = options.tooltip ||
        function (key, x, y, e, graph) {
            return '<h3>' + key + '</h3>' +
                '<p>' + y + ' at ' + x + '</p>'
        };


    chart.duration = options.duration || 250;
    chart.useInteractiveGuideline = options.useInteractiveGuideline || false;

	chart.dispatch = d3.dispatch.apply(null, options.dispatch || [])

    return chart;
}

Chart.canvas = function(chart, root){
    Canvas(root, chart)
};

Chart.axis = function (chart, options) {
    chart.axis = options.axis || {
        x: nv.models.axis(),
        y: nv.models.axis()
	};

	chart.axis.rightAlignY = chart.axis.rightAlignY || false;
	chart.axis.topAlignX = chart.axis.topAlignX || false;

    chart.axis.x
        .orient((chart.axis.topAlignX) ? 'top' : 'bottom')
        .tickPadding(7);
    chart.axis.y
        .orient((chart.axis.rightAlignY) ? 'right' : 'left');

    chart.xAxis = chart.axis.x;
    chart.yAxis = chart.axis.y;
};

Chart.axis.build = function (chart) {
    if (chart.axis.x) {
        chart.axis.x
            .scale(chart.scale.x)
            .ticks(chart.size.available.width / 100)
            .tickSize(-chart.size.available.height, 0);
        chart.g.select('.nv-x.nv-axis')
            .attr('transform',
                'translate(0,' + chart.scale.y.range()[0] + ')'
            );
        chart.g.select('.nv-x.nv-axis')
            .call(chart.axis.x);
    }
    if (chart.axis.y) {
        chart.axis.y
            .scale(chart.scale.y)
            .ticks(chart.size.available.height / 36)
            .tickSize(-chart.size.available.width, 0);
        chart.g.select('.nv-y.nv-axis')
            .call(chart.axis.y);
    }
};

Chart.legend = function (chart, options) {
    chart.legend = options.legend || nv.models.legend();
}

Chart.legend.build = function (chart, data) {
	if(!chart.legend){ return; }
    chart.legend.width(chart.size.available.width);
    chart.svg.select('.nv-legendWrap')
        .datum(data)
        .call(chart.legend);
    if (chart.margin.top != chart.legend.height()) {
        chart.margin.top = chart.legend.height();
        availableHeight = (chart.size.height || parseInt(chart.svg.style('height')) || 400) - margin.top - margin.bottom;
    }
    chart.wrap.select('.nv-legendWrap')
        .attr('transform', 'translate(0,' + (-chart.margin.top) + ')')
}

Chart.defaultState = function (chart, options) {
    chart.state = options.state || {};
    chart.defaultState = options.defaultState || null;
}

Chart.defaultState.set = function(chart, data){
    chart.state.disabled = data.map(function (d) {
        return !!d.disabled
    });
    if (!chart.defaultState) {
        var key;
        chart.defaultState = {};
        for (key in chart.state) {
            if (chart.state[key] instanceof Array)
                chart.defaultState[key] = chart.state[key].slice(0);
            else
                chart.defaultState[key] = chart.state[key];
        }
    }
}

Chart.checkData = function(chart, data){
    if (!data || !data.length || !data.filter(function (d) {
        return d.values.length
    }).length) {
        var noDataText = chart.svg.selectAll('.nv-noData').data([chart.noData]);
        noDataText.enter().append('text')
            .attr('class', 'nvd3 nv-noData')
            .attr('dy', '-.7em')
            .style('text-anchor', 'middle');
        noDataText
            .attr('x', chart.margin.left + chart.size.available.width / 2)
            .attr('y', chart.margin.top + chart.size.available.height / 2)
            .text(function (d) {
                return d
            });
        return true;
    } else {
        chart.svg.selectAll('.nv-noData').remove();
        return false;
    }
}

Chart.attachCallable = function(chart, fn){
    fn.dispatch = chart.dispatch;
    fn.legend = chart.legend;
    fn.xAxis = chart.axis.x;
    fn.yAxis = chart.yAxis;

    fn.options = nv.utils.optionsFunc.bind(chart);
    fn.margin = function (_) {
        margin = chart.options.margin
        if (!arguments.length) return margin;
        margin.top = typeof _.top != 'undefined' ? _.top : margin.top;
        margin.right = typeof _.right != 'undefined' ? _.right : margin.right;
        margin.bottom = typeof _.bottom != 'undefined' ? _.bottom : margin.bottom;
        margin.left = typeof _.left != 'undefined' ? _.left : margin.left;
        return fn;
    };

    [
        'width',
        'height',
        'showLegend',
        'showXAxis',
        'showYAxis',
        'tooltips',
        'tooltipContent',
        'state',
        'defaultState',
        'noData'
    ].forEach(function(property){
        fn[property] = function (_) {
            if (!arguments.length) return chart[property];
            chart[property] = _;
            return fn;
        };
    });

    fn.x = function(){
        return chart.scales.x.apply(chart.scales.x, arguments);
    }
    fn.y = function(){
        return chart.scales.y.apply(chart.scales.y, arguments);
    }

    fn.color = function (_) {
        if (!arguments.length) return chart.color;
        chart.color = nv.utils.getColor(_);
        legend.color(chart.color);
        return fn;
    };

    fn.rightAlignYAxis = function (_) {
        if (!arguments.length) return chart.axis.rightAlignY;
        chart.axis.rightAlignY = _;
        chart.axis.y.orient((_) ? 'right' : 'left');
        return fn;
    };
    fn.useInteractiveGuideline = function (_) {
        if (!arguments.length) return chart.useInteractiveGuideline;
        chart.useInteractiveGuideline = _;
        if (_ === true) {
            // fn.interactive(false);
            // fn.useVoronoi(false);
        }
        return fn;
    };

    fn.transitionDuration = function (_) {
        nv.deprecated('linefn.transitionDuration');
        return fn.duration(_);
    };
};
