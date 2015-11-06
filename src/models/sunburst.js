nv.models.sunburst = function() {
    "use strict";

    //============================================================
    // Public Variables with Default Settings
    //------------------------------------------------------------

    var margin = {top: 0, right: 0, bottom: 0, left: 0}
    , width = 600
    , height = 600
    , mode = "count"
    , modes = {count: function(d) { return 1; }, size: function(d) { return d.size }}
    , id = Math.floor(Math.random() * 10000) //Create semi-unique ID in case user doesn't select one
    , container = null
    , color = nv.utils.defaultColor()
    , showLabels = false
    , labelText = function(d){if(mode === 'count'){return d.name + ' #' + d.value}else{return d.name + ' ' + d.value}}
    , sort = function(d1, d2){return d1.name > d2.name;}
    , groupColorByParent = true
    , duration = 500
    , dispatch = d3.dispatch('chartClick', 'elementClick', 'elementDblClick', 'elementMousemove', 'elementMouseover', 'elementMouseout', 'renderEnd')
    ;

    var x = d3.scale.linear().range([0, 2 * Math.PI]);
    var y = d3.scale.sqrt();

    var partition = d3.layout.partition()
    .sort(sort)
    .value(function(d) { return 1; });

    var arc = d3.svg.arc()
    .startAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, x(d.x))); })
    .endAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, x(d.x + d.dx))); })
    .innerRadius(function(d) { return Math.max(0, y(d.y)); })
    .outerRadius(function(d) { return Math.max(0, y(d.y + d.dy)); });

    // Keep track of the current and previous node being displayed as the root.
    var node, prevNode;
    // Keep track of the root node
    var rootNode;

    //============================================================
    // chart function
    //------------------------------------------------------------

    var renderWatch = nv.utils.renderWatch(dispatch);

    //This is inserting a dummy svg element adds a text node to it, then gets
    //the bbox of the svg and returns width and height of that bbox.
    //stolen from here:
    //https://stackoverflow.com/questions/14605348/title-and-axis-label
    //
    //I'm not aware of a better solution ...
    function measureText(text){
        if(!text || text.length === 0) return {height: 0, width: 0};

        var dummyContainer = d3.select('body').append('svg');
        dummyContainer.append('text').attr({x: -1000, y: -1000}).text(text);

        var bbox = dummyContainer.node().getBBox();

        dummyContainer.remove();
        return {width: bbox.width, height: bbox.height};
    }

    function computeTextRotationToAvoidUpSideDown(d) {
        var centerAngle = computeCenterAngle(d);

        if(centerAngle > 90){
            var textLength = measureText(labelText(d)).width;
            textLength = Math.round(textLength - (textLength / 5))
            return 'rotate(180)translate(' + (textLength * -1) + ',0)';
        }
        else {
            return 'rotate(0)';
        }
    }

    function computeCenterAngle(d) {
        var startAngle = Math.max(0, Math.min(2 * Math.PI, x(d.x)));
        var endAngle = Math.max(0, Math.min(2 * Math.PI, x(d.x + d.dx)));
        var centerAngle = (((startAngle + endAngle) / 2) * (180 / Math.PI)) - 90;
        return centerAngle;
    }

    function chart(selection) {
        renderWatch.reset();

        selection.each(function(data) {

            container = d3.select(this);
            var availableWidth = nv.utils.availableWidth(width, container, margin);
            var availableHeight = nv.utils.availableHeight(height, container, margin);
            var radius = Math.min(availableWidth, availableHeight) / 2;
            var path;

            nv.utils.initSVG(container);

            // Setup containers and skeleton of chart
            var wrap = container.selectAll('.nv-wrap.nv-sunburst').data(data);
            var wrapEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap nv-sunburst nv-chart-' + id);

            var g = wrapEnter.selectAll('nv-sunburst');

            wrap.attr('transform', 'translate(' + availableWidth / 2 + ',' + availableHeight / 2 + ')');

            container.on('click', function (d, i) {
                dispatch.chartClick({
                    data: d,
                    index: i,
                    pos: d3.event,
                    id: id
                });
            });

            y.range([0, radius]);

            node = node || data;
            rootNode = data[0];
            partition.value(modes[mode] || modes["count"]);

            //reverse the drawing order so that the labels of inner
            //arcs are drawn on top of the outer arcs.
            var nodes = partition.nodes(data[0]).reverse();

            var cG =  g.data(nodes)
            .enter()
            .append("g")
            .attr("class",'arc-container')

            path = cG
            .append("path")
            .attr("d", arc)
            .style("fill", function (d) {
                if (d.color) {
                    return d.color;
                }
                else if (groupColorByParent) {
                    return color((d.children ? d : d.parent).name);
                }
                else {
                    return color(d.name);
                }
            })
            .style("stroke", "#FFF")
            .on("click", zoomClick)
            .each(stash)
            .on('mouseover', function(d,i){
                d3.select(this).classed('hover', true).style('opacity', 0.8);
                dispatch.elementMouseover({
                    data: d,
                    color: d3.select(this).style("fill")
                });
            })
            .on('mouseout', function(d,i){
                d3.select(this).classed('hover', false).style('opacity', 1);
                dispatch.elementMouseout({
                    data: d
                });
            })
            .on('mousemove', function(d,i){
                dispatch.elementMousemove({
                    data: d
                });
            })

            if(showLabels){
                var tG = cG.append('g')
                .attr("transform", function(d) {
                    if(d.depth === 0){
                        return 'rotate(0)';
                    }
                    else {
                        var centerAngle = computeCenterAngle(d);
                        return 'rotate('+ centerAngle +')translate(' + (y(d.y) + 5) + ',0)';
                    }
                });
                tG.append('text')
                .attr('transform', function(d) {
                    return computeTextRotationToAvoidUpSideDown(d)
                })
                .attr("text-anchor", function(d, i) {
                    if(d.depth === 0){
                        return 'middle';
                    }
                    else {
                        return 'left';
                    }
                })
                .text( function(d){
                    return labelText(d);
                });
            }

            function zoomClick(d) {
                // fade out all text elements
                cG.selectAll('text').transition().attr("opacity",0);

                path.transition()
                .duration(duration)
                .attrTween("d", arcTweenZoom(d))
                .each("end", function(e, i) {
                    // partially taken from here: http://bl.ocks.org/metmajer/5480307
                    // check if the animated element's data e lies within the visible angle span given in d
                    if(e.x >= d.x && e.x < (d.x + d.dx) ){
                        if(e.depth >= d.depth){
                            // get a selection of the associated text element
                            var parentNode = d3.select(this.parentNode);
                            var textWrapper = parentNode.select('g');
                            var arcText = parentNode.select('text');

                            // fade in the text element and recalculate positions
                            textWrapper.transition().duration(duration)
                            .attr("transform", function() {
                                // if center element, then show text horizontally
                                if(e.depth === d.depth){
                                    return "translate(" + (y(e.y) + 5) + ",0)";
                                }
                                // else rotate text to be centered in the arc
                                else {
                                    var centerAngle = computeCenterAngle(e);
                                    return "rotate(" + centerAngle + ")translate(" + (y(e.y) + 5) + ",0)";
                                }
                            });

                            arcText.transition().duration(duration)
                            .attr("opacity", 1)
                            .attr("transform", function(d) {
                                return computeTextRotationToAvoidUpSideDown(d);
                            });
                        }
                    }
                });
            }

            // Setup for switching data: stash the old values for transition.
            function stash(d) {
                d.x0 = d.x;
                d.dx0 = d.dx;
            }

            //FIXME THIS WAS NEVER CALLED - updates arn't working though ... I couldn't figure out
            //to do it
            //
            // When switching data: interpolate the arcs in data space.
            //   function arcTweenData(a, i) {
            //     var oi = d3.interpolate({x: a.x0, dx: a.dx0}, a);
            //
            //     function tween(t) {
            //       var b = oi(t);
            //       a.x0 = b.x;
            //       a.dx0 = b.dx;
            //       return arc(b);
            //     }
            //
            //     if (i == 0) {
            //       // If we are on the first arc, adjust the x domain to match the root node
            //       // at the current zoom level. (We only need to do this once.)
            //       var xd = d3.interpolate(x.domain(), [node.x, node.x + node.dx]);
            //       return function (t) {
            //         x.domain(xd(t));
            //         return tween(t);
            //       };
            //     } else {
            //       return tween;
            //     }
            //   }

            // When zooming: interpolate the scales.
            function arcTweenZoom(d) {
                var xd = d3.interpolate(x.domain(), [d.x, d.x + d.dx]),
                yd = d3.interpolate(y.domain(), [d.y, 1]),
                yr = d3.interpolate(y.range(), [d.y ? 20 : 0, radius]);

                return function (d, i) {
                    return i
                    ? function (t) {
                        return arc(d);
                    }
                    : function (t) {
                        x.domain(xd(t));
                        y.domain(yd(t)).range(yr(t));
                        return arc(d);
                    };
                };
            }
        });

        renderWatch.renderEnd('sunburst immediate');
        return chart;
    }

    //============================================================
    // Expose Public Variables
    //------------------------------------------------------------

    chart.dispatch = dispatch;
    chart.options = nv.utils.optionsFunc.bind(chart);

    chart._options = Object.create({}, {
        // simple options, just get/set the necessary values
        width:      {get: function(){return width;}, set: function(_){width=_;}},
        height:     {get: function(){return height;}, set: function(_){height=_;}},
        mode:       {get: function(){return mode;}, set: function(_){mode=_;}},
        id:         {get: function(){return id;}, set: function(_){id=_;}},
        duration:   {get: function(){return duration;}, set: function(_){duration=_;}},
        groupColorByParent: {get: function(){return groupColorByParent;}, set: function(_){groupColorByParent=!!_;}},
        showLabels: {get: function(){return showLabels;}, set: function(_){showLabels=!!_}},
        labelText: {get: function(){return labelText;}, set: function(_){labelText=_}},
        sort: {get: function(){return sort;}, set: function(_){sort=_}},
        // options that require extra logic in the setter
        margin: {get: function(){return margin;}, set: function(_){
            margin.top    = _.top    != undefined ? _.top    : margin.top;
            margin.right  = _.right  != undefined ? _.right  : margin.right;
            margin.bottom = _.bottom != undefined ? _.bottom : margin.bottom;
            margin.left   = _.left   != undefined ? _.left   : margin.left;
        }},
        color: {get: function(){return color;}, set: function(_){
            color=nv.utils.getColor(_);
        }}
    });

    nv.utils.initOptions(chart);
    return chart;
};
