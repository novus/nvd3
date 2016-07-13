nv.models.sankeyChart = function() {
    "use strict";


    //============================================================
    // Public Variables with Default Settings
    //------------------------------------------------------------

    var margin = {top: 5, right: 0, bottom: 5, left: 0}
        , sankey = nv.models.sankey()
        , width = 600
        , height = 400
        // TODO add fn for setting these:
        , nodeWidth = 36
        , nodePadding =  40
        , units =  'units'
        ;
    //============================================================


    //============================================================
    // Private Variables
    //------------------------------------------------------------

    var formatNumber = d3.format(',.0f');    // zero decimal places
    var format = function(d) {
        return formatNumber(d) + ' ' + units;
    };
    var color = d3.scale.category20();
    var linkTitle = function(d){
        return d.source.name + ' → ' + d.target.name + '\n' + format(d.value);
    };
    var nodeFillColor = function(d){
        return d.color = color(d.name.replace(/ .*/, ''));
    };
    var nodeStrokeColor = function(d){
        return d3.rgb(d.color).darker(2);
    };
    var nodeTitle = function(d){
        return d.name + '\n' + format(d.value);
    };


    //============================================================

    function chart(selection) {
        selection.each(function(data) {
            // TODO apply chart for each "selection" element

            // var availableWidth = width - margin.left - margin.right;
            // var container = d3.select(this);
            // nv.utils.initSVG(container);

            // append the svg canvas to the page
            var svg = d3.select('#sankey-chart').append('svg')
                .attr('width', width)
                .attr('height', height)
                .append('g');

            // Set the sankey diagram properties
            sankey
                .nodeWidth(nodeWidth)
                .nodePadding(nodePadding)
                .size([width, height]);



            var path = sankey.link();

            // TODO data from outside
            // TODO error handling if data is invalid

            sankey
                .nodes(data.nodes)
                .links(data.links)
                .layout(2);

            // add in the links
            var link = svg.append('g').selectAll('.link')
                .data(data.links)
                .enter().append('path')
                .attr('class', 'link')
                .attr('d', path)
                .style('stroke-width', function(d) { return Math.max(1, d.dy); })
            .sort(function(a,b) { return b.dy - a.dy; });

            // add the link titles
            link.append('title')
                .text(linkTitle);

            // add in the nodes
            var node = svg.append('g').selectAll('.node')
                .data(data.nodes)
                .enter().append('g')
                .attr('class', 'node')
                .attr('transform', function(d) { return 'translate(' + d.x + ',' + d.y + ')'; })
                .call(
                    d3.behavior
                        .drag()
                        .origin(function(d) { return d; })
                        .on('dragstart', function() {
                            this.parentNode.appendChild(this);
                        })
                        .on('drag', dragmove)
                );

            // add the rectangles for the nodes
            node.append('rect')
                .attr('height', function(d) { return d.dy; })
                .attr('width', sankey.nodeWidth())
                .style('fill', nodeFillColor)
                .style('stroke', nodeStrokeColor)
                .append('title')
                .text(nodeTitle);

            // add in the title for the nodes
            node.append('text')
                .attr('x', -6)
                .attr('y', function(d) { return d.dy / 2; })
                .attr('dy', '.35em')
                .attr('text-anchor', 'end')
                .attr('transform', null)
                .text(function(d) { return d.name; })
                .filter(function(d) { return d.x < width / 2; })
                .attr('x', 6 + sankey.nodeWidth())
                .attr('text-anchor', 'start');

            // the function for moving the nodes
            function dragmove(d) {
                d3.select(this).attr('transform',
                'translate(' + d.x + ',' + (
                    d.y = Math.max(0, Math.min(height - d.dy, d3.event.y))
                ) + ')');
                sankey.relayout();
                link.attr('d', path);
            }
        });

        return chart;
    }

    //============================================================
    // Expose Public Variables
    //------------------------------------------------------------

    chart.options = nv.utils.optionsFunc.bind(chart);

    chart._options = Object.create({}, {
        // simple options, just get/set the necessary values
        units:           {get: function(){return units;},     set: function(_){units=_;}},
        width:           {get: function(){return width;},     set: function(_){width=_;}},
        height:          {get: function(){return height;},    set: function(_){height=_;}},
        format:          {get: function(){return format;},    set: function(_){format=_;}},
        linkTitle:       {get: function(){return linkTitle;}, set: function(_){linkTitle=_;}},

        // options that require extra logic in the setter
        margin: {get: function(){return margin;}, set: function(_){
            margin.top    = _.top    !== undefined ? _.top    : margin.top;
            margin.right  = _.right  !== undefined ? _.right  : margin.right;
            margin.bottom = _.bottom !== undefined ? _.bottom : margin.bottom;
            margin.left   = _.left   !== undefined ? _.left   : margin.left;
        }},
        nodeStyle: {get: function(){return {};}, set: function(_){
            nodeFillColor   = _.fillColor   !== undefined ? _.fillColor   : nodeFillColor;
            nodeStrokeColor = _.strokeColor !== undefined ? _.strokeColor : nodeStrokeColor;
            nodeTitle       = _.title       !== undefined ? _.title       : nodeTitle;
        }}

    });

    nv.utils.initOptions(chart);

    return chart;
};
