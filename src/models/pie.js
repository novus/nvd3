nv.models.pie = function() {
    "use strict";

    //============================================================
    // Public Variables with Default Settings
    //------------------------------------------------------------

    var margin = {top: 0, right: 0, bottom: 0, left: 0}
        , width = 500
        , height = 500
        , getX = function(d) { return d.x }
        , getY = function(d) { return d.y }
        , id = Math.floor(Math.random() * 10000) //Create semi-unique ID in case user doesn't select one
        , color = nv.utils.defaultColor()
        , valueFormat = d3.format(',.2f')
        , showLabels = true
        , labelsOutside = false
        , labelType = "key"
        , labelThreshold = .02 //if slice percentage is under this, don't show label
        , donut = false
        , title = false
        , growOnHover = true
        , titleOffset = 0
        , labelSunbeamLayout = false
        , startAngle = false
        , padAngle = false
        , endAngle = false
        , cornerRadius = 0
        , donutRatio = 0.5
        , dispatch = d3.dispatch('chartClick', 'elementClick', 'elementDblClick', 'elementMouseover', 'elementMouseout', 'elementMousemove', 'renderEnd')
        ;


    //============================================================
    // chart function
    //------------------------------------------------------------

    var renderWatch = nv.utils.renderWatch(dispatch);

    function chart(selection) {
        renderWatch.reset();
        selection.each(function(data) {
            var availableWidth = width - margin.left - margin.right
                ,availableHeight = height - margin.top - margin.bottom
                ,radius = Math.min(availableWidth, availableHeight) / 2
                ,arcRadius = radius-(radius / 5)
                ,container = d3.select(this)
                ;
            nv.utils.initSVG(container);

            // Setup containers and skeleton of chart
            var wrap = container.selectAll('.nv-wrap.nv-pie').data(data);
            var wrapEnter = wrap.enter().append('g').attr('class','nvd3 nv-wrap nv-pie nv-chart-' + id);
            var gEnter = wrapEnter.append('g');
            var g = wrap.select('g');
            var g_pie = gEnter.append('g').attr('class', 'nv-pie');
            gEnter.append('g').attr('class', 'nv-pieLabels');

            wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
            g.select('.nv-pie').attr('transform', 'translate(' + availableWidth / 2 + ',' + availableHeight / 2 + ')');
            g.select('.nv-pieLabels').attr('transform', 'translate(' + availableWidth / 2 + ',' + availableHeight / 2 + ')');

            //
            container.on('click', function(d,i) {
                dispatch.chartClick({
                    data: d,
                    index: i,
                    pos: d3.event,
                    id: id
                });
            });


            var arc = d3.svg.arc().outerRadius(arcRadius);
            var arcOver = d3.svg.arc().outerRadius(arcRadius + 5);

            if (startAngle !== false) {
                arc.startAngle(startAngle);
                arcOver.startAngle(startAngle);
            }
            if (endAngle !== false) {
                arc.endAngle(endAngle);
                arcOver.endAngle(endAngle);
            }
            if (donut) {
                arc.innerRadius(radius * donutRatio);
                arcOver.innerRadius(radius * donutRatio);
            }

            // Setup the Pie chart and choose the data element
            var pie = d3.layout.pie()
                .sort(null)
                .value(function(d) { return d.disabled ? 0 : getY(d) });

            // padAngle added in d3 3.5
            if (pie.padAngle && padAngle) {
                pie.padAngle(padAngle);
            }

            if (arc.cornerRadius && cornerRadius) {
                arc.cornerRadius(cornerRadius);
                arcOver.cornerRadius(cornerRadius);
            }

            // if title is specified and donut, put it in the middle
            if (donut && title) {
                g_pie.append("text").attr('class', 'nv-pie-title');

                wrap.select('.nv-pie-title')
                    .style("text-anchor", "middle")
                    .text(function (d) {
                        return title;
                    })
                    .style("font-size", Math.min(availableWidth, availableHeight) / 6 + "px")
                    .attr("dy", "0.35em") // trick to vertically center text
                    .attr('transform', function(d, i) {
                        return 'translate(0, '+ titleOffset + ')';
                    });
            }

            var slices = wrap.select('.nv-pie').selectAll('.nv-slice').data(pie);
            var pieLabels = wrap.select('.nv-pieLabels').selectAll('.nv-label').data(pie);

            slices.exit().remove();
            pieLabels.exit().remove();

            var ae = slices.enter().append('g');
            ae.attr('class', 'nv-slice');
            ae.on('mouseover', function(d, i) {
                d3.select(this).classed('hover', true);
                if (growOnHover) {
                    d3.select(this).select("path").transition()
                        .duration(70)
                        .attr("d", arcOver);
                }
                dispatch.elementMouseover({
                    data: d.data,
                    index: i,
                    color: d3.select(this).style("fill")
                });
            });
            ae.on('mouseout', function(d, i) {
                d3.select(this).classed('hover', false);
                if (growOnHover) {
                    d3.select(this).select("path").transition()
                        .duration(50)
                        .attr("d", arc);
                }
                dispatch.elementMouseout({data: d.data, index: i});
            });
            ae.on('mousemove', function(d, i) {
                dispatch.elementMousemove({data: d.data, index: i});
            });
            ae.on('click', function(d, i) {
                dispatch.elementClick({
                    data: d.data,
                    index: i,
                    color: d3.select(this).style("fill")
                });
            });
            ae.on('dblclick', function(d, i) {
                dispatch.elementDblClick({
                    data: d.data,
                    index: i,
                    color: d3.select(this).style("fill")
                });
            });

            slices.attr('fill', function(d,i) { return color(d, i); });
            slices.attr('stroke', function(d,i) { return color(d, i); });

            var paths = ae.append('path').each(function(d) {
                this._current = d;
            });

            slices.select('path')
                .transition()
                .attr('d', arc)
                .attrTween('d', arcTween);

            if (showLabels) {
                // This does the normal label
                var labelsArc = d3.svg.arc().innerRadius(0);

                if (labelsOutside){
                    if (donut) {
                        labelsArc = d3.svg.arc().outerRadius(arc.outerRadius());
                        if (startAngle !== false) labelsArc.startAngle(startAngle);
                        if (endAngle !== false) labelsArc.endAngle(endAngle);
                    } else {
                        labelsArc = arc;
                    }
                }

                pieLabels.enter().append("g").classed("nv-label",true).each(function(d,i) {
                    var group = d3.select(this);

                    group.attr('transform', function(d) {
                        if (labelSunbeamLayout) {
                            d.outerRadius = arcRadius + 10; // Set Outer Coordinate
                            d.innerRadius = arcRadius + 15; // Set Inner Coordinate
                            var rotateAngle = (d.startAngle + d.endAngle) / 2 * (180 / Math.PI);
                            if ((d.startAngle+d.endAngle)/2 < Math.PI) {
                                rotateAngle -= 90;
                            } else {
                                rotateAngle += 90;
                            }
                            return 'translate(' + labelsArc.centroid(d) + ') rotate(' + rotateAngle + ')';
                        } else {
                            d.outerRadius = radius + 10; // Set Outer Coordinate
                            d.innerRadius = radius + 15; // Set Inner Coordinate
                            return 'translate(' + labelsArc.centroid(d) + ')'
                        }
                    });

                    group.append('rect')
                        .style('stroke', '#fff')
                        .style('fill', '#fff')
                        .attr("rx", 3)
                        .attr("ry", 3);

                    group.append('text')
                        .style('text-anchor', labelSunbeamLayout ? ((d.startAngle + d.endAngle) / 2 < Math.PI ? 'start' : 'end') : 'middle') //center the text on it's origin or begin/end if orthogonal aligned
                        .style('fill', '#000')
                });

                var labelLocationHash = {};
                var avgHeight = 14;
                var avgWidth = 140;
                var createHashKey = function(coordinates) {
                    return Math.floor(coordinates[0]/avgWidth) * avgWidth + ',' + Math.floor(coordinates[1]/avgHeight) * avgHeight;
                };

                pieLabels.watchTransition(renderWatch,'pie labels').attr('transform', function(d) {
                    if (labelSunbeamLayout) {
                        d.outerRadius = arcRadius + 10; // Set Outer Coordinate
                        d.innerRadius = arcRadius + 15; // Set Inner Coordinate
                        var rotateAngle = (d.startAngle + d.endAngle) / 2 * (180 / Math.PI);
                        if ((d.startAngle+d.endAngle)/2 < Math.PI) {
                            rotateAngle -= 90;
                        } else {
                            rotateAngle += 90;
                        }
                        return 'translate(' + labelsArc.centroid(d) + ') rotate(' + rotateAngle + ')';
                    } else {
                        d.outerRadius = radius + 10; // Set Outer Coordinate
                        d.innerRadius = radius + 15; // Set Inner Coordinate

                        /*
                         Overlapping pie labels are not good. What this attempts to do is, prevent overlapping.
                         Each label location is hashed, and if a hash collision occurs, we assume an overlap.
                         Adjust the label's y-position to remove the overlap.
                         */
                        var center = labelsArc.centroid(d);
                        if(d.value){
                            var hashKey = createHashKey(center);
                            if (labelLocationHash[hashKey]) {
                                center[1] -= avgHeight;
                            }
                            labelLocationHash[createHashKey(center)] = true;
                        }
                        return 'translate(' + center + ')'
                    }
                });

                pieLabels.select(".nv-label text")
                    .style('text-anchor', function(d,i) {
                        //center the text on it's origin or begin/end if orthogonal aligned
                        return labelSunbeamLayout ? ((d.startAngle + d.endAngle) / 2 < Math.PI ? 'start' : 'end') : 'middle';
                    })
                    .text(function(d, i) {
                        var percent = (d.endAngle - d.startAngle) / (2 * Math.PI);
                        var label = '';
                        if (!d.value || percent < labelThreshold) return '';

                        switch (labelType) {
                            case 'key':
                                label = getX(d.data);
                                break;
                            case 'value':
                                label = valueFormat(getY(d.data));
                                break;
                            case 'percent':
                                label = valueFormat(percent);
                                break;
                        }
                        return label;
                    })
                ;
            }


            // Computes the angle of an arc, converting from radians to degrees.
            function angle(d) {
                var a = (d.startAngle + d.endAngle) * 90 / Math.PI - 90;
                return a > 90 ? a - 180 : a;
            }

            function arcTween(a) {
                a.endAngle = isNaN(a.endAngle) ? 0 : a.endAngle;
                a.startAngle = isNaN(a.startAngle) ? 0 : a.startAngle;
                if (!donut) a.innerRadius = 0;
                var i = d3.interpolate(this._current, a);
                this._current = i(0);
                return function(t) {
                    return arc(i(t));
                };
            }
        });

        renderWatch.renderEnd('pie immediate');
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
        showLabels: {get: function(){return showLabels;}, set: function(_){showLabels=_;}},
        title:      {get: function(){return title;}, set: function(_){title=_;}},
        titleOffset:    {get: function(){return titleOffset;}, set: function(_){titleOffset=_;}},
        labelThreshold: {get: function(){return labelThreshold;}, set: function(_){labelThreshold=_;}},
        valueFormat:    {get: function(){return valueFormat;}, set: function(_){valueFormat=_;}},
        x:          {get: function(){return getX;}, set: function(_){getX=_;}},
        id:         {get: function(){return id;}, set: function(_){id=_;}},
        endAngle:   {get: function(){return endAngle;}, set: function(_){endAngle=_;}},
        startAngle: {get: function(){return startAngle;}, set: function(_){startAngle=_;}},
        padAngle:   {get: function(){return padAngle;}, set: function(_){padAngle=_;}},
        cornerRadius: {get: function(){return cornerRadius;}, set: function(_){cornerRadius=_;}},
        donutRatio:   {get: function(){return donutRatio;}, set: function(_){donutRatio=_;}},
        labelsOutside: {get: function(){return labelsOutside;}, set: function(_){labelsOutside=_;}},
        labelSunbeamLayout: {get: function(){return labelSunbeamLayout;}, set: function(_){labelSunbeamLayout=_;}},
        donut:              {get: function(){return donut;}, set: function(_){donut=_;}},
        growOnHover:        {get: function(){return growOnHover;}, set: function(_){growOnHover=_;}},

        // depreciated after 1.7.1
        pieLabelsOutside: {get: function(){return labelsOutside;}, set: function(_){
            labelsOutside=_;
            nv.deprecated('pieLabelsOutside', 'use labelsOutside instead');
        }},
        // depreciated after 1.7.1
        donutLabelsOutside: {get: function(){return labelsOutside;}, set: function(_){
            labelsOutside=_;
            nv.deprecated('donutLabelsOutside', 'use labelsOutside instead');
        }},
        // deprecated after 1.7.1
        labelFormat: {get: function(){ return valueFormat;}, set: function(_) {
            valueFormat=_;
            nv.deprecated('labelFormat','use valueFormat instead');
        }},

        // options that require extra logic in the setter
        margin: {get: function(){return margin;}, set: function(_){
            margin.top    = typeof _.top    != 'undefined' ? _.top    : margin.top;
            margin.right  = typeof _.right  != 'undefined' ? _.right  : margin.right;
            margin.bottom = typeof _.bottom != 'undefined' ? _.bottom : margin.bottom;
            margin.left   = typeof _.left   != 'undefined' ? _.left   : margin.left;
        }},
        y: {get: function(){return getY;}, set: function(_){
            getY=d3.functor(_);
        }},
        color: {get: function(){return color;}, set: function(_){
            color=nv.utils.getColor(_);
        }},
        labelType:          {get: function(){return labelType;}, set: function(_){
            labelType= _ || 'key';
        }}
    });

    nv.utils.initOptions(chart);
    return chart;
};
