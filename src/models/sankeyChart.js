nv.models.sankeyChart = function() {
    "use strict";


    //============================================================
    // Public Variables with Default Settings
    //------------------------------------------------------------

    var margin = {top: 5, right: 0, bottom: 5, left: 0}
        , sankey = nv.models.sankey() // TODO sankey.js => sankey
        , width = 600
        , height = 400
        , nodeWidth = 36
        , nodePadding =  40
        , units =  'units'
        , dispatch = d3.dispatch('legendClick', 'legendDblclick', 'legendMouseover', 'legendMouseout', 'stateChange')
        ;

    function chart(selection) {
        selection.each(function(data) {
            var availableWidth = width - margin.left - margin.right;
            var container = d3.select(this);
            // nv.utils.initSVG(container);

            var formatNumber = d3.format(',.0f');    // zero decimal places
            var format = function(d) { return formatNumber(d) + ' ' + units; };
            var color = d3.scale.category20();


            // append the svg canvas to the page
            var svg = d3.select('#sankey-chart').append('svg')
                .attr('width', 800)
                .attr('height', 600)
                .append('g');

            console.log('svg', svg);

// TODO margin

            // Set the sankey diagram properties
            // TODO sankey line 9 -> sankey.js
            // var sankey = d3.sankey()
            //     .nodeWidth(nodeWidth)
            //     .nodePadding(nodePadding)
            //     .size([width, height]);

            console.log('sankey.link', sankey.link);

            var path = sankey.link();
            console.log('path');

            // load the data
            var data = {
                "nodes":[
                    {"node":0,"name":"node0"},
                    {"node":1,"name":"node1"},
                    {"node":2,"name":"node2"},
                    {"node":3,"name":"node3"},
                    {"node":4,"name":"node4"}
                ],
                "links":[
                    {"source":0,"target":2,"value":2},
                    {"source":1,"target":2,"value":2},
                    {"source":1,"target":3,"value":2},
                    {"source":0,"target":4,"value":2},
                    {"source":2,"target":3,"value":2},
                    {"source":2,"target":4,"value":2},
                    {"source":3,"target":4,"value":4}
                ]};
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
                .text(function(d) {
                return d.source.name + ' → ' +
                    d.target.name + '\n' + format(d.value); });

            // add in the nodes
            var node = svg.append('g').selectAll('.node')
                .data(data.nodes)
                .enter().append('g')
                .attr('class', 'node')
                .attr('transform', function(d) {
                return 'translate(' + d.x + ',' + d.y + ')'; })
            .call(d3.behavior.drag()
                .origin(function(d) { return d; })
            .on('dragstart', function() {
                this.parentNode.appendChild(this); })
            .on('drag', dragmove));

            // add the rectangles for the nodes
            node.append('rect')
                .attr('height', function(d) { return 50; })
            .attr('width', sankey.nodeWidth())
                .style('fill', function(d) {
                return d.color = color(d.name.replace(/ .*/, '')); })
            .style('stroke', function(d) {
                return d3.rgb(d.color).darker(2); })
            .append('title')
                .text(function(d) {
                return d.name + '\n' + format(d.value); });

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
//
            ///////////////////////////////////////////////////////////////



//             var series = g.selectAll('.nv-series')
//                 .data(function(d) {
//                     return d;
//                 });
            //
            //
            // series
            //     .on('mouseover', function(d,i) {
            //         dispatch.legendMouseover(d,i);
            //     })
            //     .on('mouseout', function(d,i) {
            //         dispatch.legendMouseout(d,i);
            //     })
            //     .on('click', function(d,i) {
            //
            //     })
            //     .on('dblclick', function(d,i) {
            //
            //     });
            //
            // series.exit().remove();


        });


        return chart;
    }

    //============================================================
    // Expose Public Variables
    //------------------------------------------------------------

    chart.dispatch = dispatch;
    chart.options = nv.utils.optionsFunc.bind(chart);

    chart._options = Object.create({}, {
        // simple options, just get/set the necessary values
        units:          {get: function(){return units;}, set: function(_){units=_;}},
        width:          {get: function(){return width;}, set: function(_){width=_;}},
        height:         {get: function(){return height;}, set: function(_){height=_;}},

        // options that require extra logic in the setter
        margin: {get: function(){return margin;}, set: function(_){
            margin.top    = _.top    !== undefined ? _.top    : margin.top;
            margin.right  = _.right  !== undefined ? _.right  : margin.right;
            margin.bottom = _.bottom !== undefined ? _.bottom : margin.bottom;
            margin.left   = _.left   !== undefined ? _.left   : margin.left;
        }}
    });

    nv.utils.initOptions(chart);

    return chart;
};
