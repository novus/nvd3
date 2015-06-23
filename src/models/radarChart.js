/**
 * Created by Administrator on 2015/6/18.
 */
nv.models.radarChart = function(){
    "use strict";

    var legend = nv.models.legend();
    var tooltip = nv.models.tooltip();

    var width = 600,
        height = 600,
        showLabel = true,
        showAxis = true,
        showPoint = true,
        factor = 1,
        levels = 6,
        maxValue = 0.6,
        radians = 2 * Math.PI,
        factorLegend = 0.85,
        opacityArea = 0.5,
        toRight = 5,
        series = 0,
        color = nv.utils.getColor(d3.scale.category10()),
        margin = {top: 40, right: 70, bottom: 40, left: 70};

    function chart(selection){

        selection.each(function(data) {
            var container = d3.select(this);
            nv.utils.initSVG(container);

            chart.update = function() { container.transition().call(chart); };
            chart.container = this;

            maxValue = d3.max(data.map(function(o){
                return d3.max(o.values,function(i){
                    return i.value;
                })
            }));

            var allAxis = (data[0].values.map(function(i, j){return i.axis}));
            var total = allAxis.length;
            var circle_radius = 5;
            var radius = factor*Math.min(width/2, height/2);
            var Format = d3.format('.2f');

            tooltip.contentGenerator(function (obj){
                return '<h3>' + obj.series[0].key + '</h3><p>' + Format(obj.series[0].value) + '</p>';
            });

            var availableWidth = nv.utils.availableWidth(width,container,margin),
                availableHeight = nv.utils.availableHeight(height,container,margin);

            container.attr("width", availableWidth)
                .attr("height", availableHeight);

            data.forEach(function(series){
                series.values.forEach(function(j,i){
                    j.x = availableWidth/2*(1-(parseFloat(Math.max(j.value, 0))/maxValue)*factor*Math.sin(i*radians/total));
                    j.y = availableHeight/2*(1-(parseFloat(Math.max(j.value, 0))/maxValue)*factor*Math.cos(i*radians/total));
                });
            });

            var wrap = container.selectAll('g.nv-wrap.nv-radarChart').data([data]);
            var gEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap nv-radarChart')
                .append('g').attr("transform", "translate(" + margin.left + "," + margin.top + ")");
            var g = wrap.select('g');

            gEnter.append('g').attr('class', 'nv-levelsWrap');

            var levelsWrap = wrap.select('.nv-levelsWrap');

            levelsWrap.append('g').attr('class','levels_line');
            levelsWrap.append('g').attr('class','levels_text');
            levelsWrap.append('g').attr('class','levels_axis');
            levelsWrap.append('g').attr('class','levels_polygon');
            levelsWrap.append('g').attr('class','levels_circle');

            for(var j=0; j<levels-1; j++){
                var levelFactor = factor*radius*((j+1)/levels);
                var lineGroup = levelsWrap.select(".levels_line").append('g').attr('class','lines_Group_'+j);
                lineGroup.selectAll("line")
                    .data(allAxis)
                    .enter()
                    .append("svg:line")
                    .attr("x1", function(d, i){return levelFactor*(1-factor*Math.sin(i*radians/total));})
                    .attr("y1", function(d, i){return levelFactor*(1-factor*Math.cos(i*radians/total));})
                    .attr("x2", function(d, i){return levelFactor*(1-factor*Math.sin((i+1)*radians/total));})
                    .attr("y2", function(d, i){return levelFactor*(1-factor*Math.cos((i+1)*radians/total));})
                    .attr("class", "line")
                    .style("stroke", "grey")
                    .style("stroke-opacity", "0.75")
                    .style("stroke-width", "0.3px")
                    .attr("transform", "translate(" + (availableWidth/2-levelFactor) + ", " + (availableHeight/2-levelFactor) + ")");
            }

            //文字label====================================================================================================================//
            if(showLabel){
                var textArray = [];
                //Text indicating at what % each level is
                for(var j=0; j<levels; j++){
                    var levelFactor = factor*radius*((j+1)/levels);

                    textArray.push({
                        x : levelFactor*(1-factor*Math.sin(0)),
                        y : levelFactor*(1-factor*Math.cos(0)),
                        levelFactor : levelFactor,
                        text : Format((j+1)*maxValue/levels)
                    });
                }

                levelsWrap.select(".levels_text").selectAll("text")
                    .data(textArray) //dummy data
                    .enter()
                    .append("svg:text")
                    .attr("x", function(d){
                        return d.x;
                    })
                    .attr("y", function(d){
                        return d.y;
                    })
                    .attr("class", "legend")
                    .style("font-family", "sans-serif")
                    .style("font-size", "10px")
                    .attr("transform",  function(d){
                        return "translate(" + (availableWidth/2- d.levelFactor + toRight) + ", " + (availableHeight/2- d.levelFactor) + ")"
                    })
                    .attr("fill", "#737373")
                    .text(function(d){
                        return d.text;
                    });
            }
            //=============================================================================================================================//

            //Axis=========================================================================================================================//
            if(showAxis){
                var axis = levelsWrap.select('.levels_axis').selectAll(".axis")
                    .data(allAxis)
                    .enter()
                    .append("g")
                    .attr("class", "axis");

                axis.append("line")
                    .attr("x1", availableWidth/2)
                    .attr("y1", availableHeight/2)
                    .attr("x2", function(d, i){return availableWidth/2*(1-factor*Math.sin(i*radians/total));})
                    .attr("y2", function(d, i){return availableHeight/2*(1-factor*Math.cos(i*radians/total));})
                    .attr("class", "line")
                    .style("stroke", "grey")
                    .style("stroke-width", "1px");

                axis.append("text")
                    .attr("class", "legend")
                    .text(function(d){return d})
                    .style("font-family", "sans-serif")
                    .style("font-size", "11px")
                    .attr("text-anchor", "middle")
                    .attr("dy", "1.5em")
                    .attr("transform", function(d, i){return "translate(0, -10)"})
                    .attr("x", function(d, i){return availableWidth/2*(1-factorLegend*Math.sin(i*radians/total))-60*Math.sin(i*radians/total);})
                    .attr("y", function(d, i){return availableHeight/2*(1-Math.cos(i*radians/total))-20*Math.cos(i*radians/total);});
            }
            //===============================================================================================================================//

            //多边形区域
            data.forEach(function(y, x){
                var dataValues = [];
                levelsWrap.selectAll(".nodes")
                    .data(y.values, function(j, i){
                        dataValues.push([
                            availableWidth/2*(1-(parseFloat(Math.max(j.value, 0))/maxValue)*factor*Math.sin(i*radians/total)),
                            availableHeight/2*(1-(parseFloat(Math.max(j.value, 0))/maxValue)*factor*Math.cos(i*radians/total))
                        ]);
                    });
                dataValues.push(dataValues[0]);
                levelsWrap.select('.levels_polygon').selectAll(".nodes")
                    .data([dataValues])
                    .enter()
                    .append("polygon")
                    .attr("class", "radar-chart-serie"+series)
                    .style("stroke-width", "2px")
                    .style("stroke", color(series))
                    .attr("points",function(d) {
                        var str="";
                        for(var pti=0;pti<d.length;pti++){
                            str=str+d[pti][0]+","+d[pti][1]+" ";
                        }
                        return str;
                    })
                    .style("fill", function(j, i){return color(series)})
                    .style("fill-opacity", opacityArea)
                    .on('mouseover', function (d){
                        var z = "polygon."+d3.select(this).attr("class");
                        levelsWrap.selectAll("polygon")
                            .transition(200)
                            .style("fill-opacity", 0.1);
                        levelsWrap.selectAll(z)
                            .transition(200)
                            .style("fill-opacity", .7);
                    })
                    .on('mouseout', function(){
                        levelsWrap.selectAll("polygon")
                            .transition(200)
                            .style("fill-opacity", opacityArea);
                    });
                series++;
            });

            series = 0;
            if(showPoint){
                data.forEach(function(y, x){
                    levelsWrap.select('.levels_circle').selectAll(".nodes")
                        .data(y.values).enter()
                        .append("svg:circle")
                        .attr("class", "radar-chart-serie"+series)
                        .attr('r', circle_radius)
                        .attr("alt", function(j){return Math.max(j.value, 0)})
                        .attr("cx", function(j, i){
                            return j.x;
                        })
                        .attr("cy", function(j, i){
                            return j.y;
                        })
                        .attr("data-id", function(j){return j.axis})
                        .style("fill", color(series)).style("fill-opacity", .9)
                        .on('mouseover', function (d){
                            d3.select(d3.event.target).classed('hover',true);
                            tooltip.data({
                                series : {
                                    key : d.axis,
                                    value : d.value
                                }
                            }).hidden(false);
                        })
                        .on('mousemove',function(){
                            tooltip.position({top: d3.event.pageY, left: d3.event.pageX})();
                        })
                        .on('mouseout', function(){
                            tooltip.hidden(true);
                        });

                    series++;
                });
            }
        });

        return chart;
    }

    chart.tooltip = tooltip;

    return chart;
};