
nv.models.pie = function() {
  var margin = {top: 20, right: 10, bottom: 20, left: 60},
      width = 500,
      height = 500,
      animate = 2000,
      radius = Math.min(width, height) / 2,
      label ='label',
      field ='y',
      id = Math.floor(Math.random() * 10000), //Create semi-unique ID in case user doesn't select one
      color = d3.scale.category20(),
      hasLabel = false;


  var  dispatch = d3.dispatch('chartClick', 'elementClick', 'tooltipShow', 'tooltipHide');

  function chart(selection) {
    selection.each(function(data) {

      var parent = d3.select(this)
          .on("click", function(d,i) {
              dispatch.chartClick({
                  data: d,
                  index: i,
                  pos: d3.event,
                  id: id
              });
          });

      var wrap = parent.selectAll('g.wrap').data([data]);
      var gEnter = wrap.enter().append('g').attr('class', 'wrap').attr('id','wrap-'+id);

        wrap.attr('width', width)
            .attr('height', height)
            .attr("transform", "translate(" + radius + "," + radius + ")");

        gEnter.append('g').attr('class', 'pie');

        var arc = d3.svg.arc()
          .outerRadius((radius-(radius / 5)));

        // Setup the Pie chart and choose the data element
      var pie = d3.layout.pie()
         .value(function (d) { return d[field]; });

      var slices = wrap.select('.pie').selectAll(".slice")
            .data(pie);

          slices.exit().remove();


     var ae = slices.enter().append("svg:g")
              .attr("class", "slice")
              .on('mouseover', function(d,i){
                        d3.select(this).classed('hover', true);
                        dispatch.tooltipShow({
                            label: d.data[label],
                            value: d.data[field],
                            data: d.data,
                            index: i,
                            pos: [d3.event.pageX, d3.event.pageY],
                            id: id
                        });

              })
              .on('mouseout', function(d,i){
                        d3.select(this).classed('hover', false);
                        dispatch.tooltipHide({
                            label: d.data[label],
                            value: d.data[field],
                            data: d.data,
                            index: i,
                            id: id
                        });
              })
              .on('click', function(d,i) {
                    dispatch.elementClick({
                        label: d.data[label],
                        value: d.data[field],
                        data: d.data,
                        index: i,
                        pos: d3.event,
                        id: id
                    });
                    d3.event.stopPropagation();
              });



      var paths = ae.append("svg:path")
            .attr("fill", function(d, i) { return color(i); })
            .attr('d', arc);

        if (hasLabel) {
          // This does the normal label
          ae.append("text")
             .attr("transform", function(d) {
                d.outerRadius = radius + 10; // Set Outer Coordinate
                d.innerRadius = radius + 15; // Set Inner Coordinate
                return "translate(" + arc.centroid(d) + ")";
            })
            .attr("text-anchor", "middle") //center the text on it's origin
            .style("font", "bold 12px Arial")
            .text(function(d, i) {  return d.data[label] + ': ' + d.data[field];  });
        }


        // Computes the angle of an arc, converting from radians to degrees.
        function angle(d) {
            var a = (d.startAngle + d.endAngle) * 90 / Math.PI - 90;
            return a > 90 ? a - 180 : a;
        }

        // Animation
         paths.transition()
            .ease("bounce")
            .duration(animate)
            .attrTween("d", tweenPie);




        function tweenPie(b) {
            b.innerRadius = 0;
            var i = d3.interpolate({startAngle: 0, endAngle: 0}, b);
            return function(t) {
                return arc(i(t));
            };
        }


    });

    return chart;
  }

  chart.margin = function(_) {
    if (!arguments.length) return margin;
    margin = _;
    return chart;
  };

  chart.width = function(_) {
    if (!arguments.length) return width;
    if (margin.left + margin.right + 20 > _) {
      width = margin.left + margin.right + 20; // Min width
    } else {
      width = _;
    }
    radius = Math.min(width, height) / 2;
    return chart;
  };

  chart.height = function(_) {
    if (!arguments.length) return height;
    if (margin.top + margin.bottom + 20 > _) {
      height = margin.top + margin.bottom + 20; // Min height
    } else {
      height = _;
    }
    radius = Math.min(width, height) / 2;
    return chart;
  };

  chart.animate = function(_) {
    if (!arguments.length) return animate;
    animate = _;
    return chart;
  };

  chart.labelField = function(_) {
    if (!arguments.length) return (label);
      label = _;
      return chart;
  };

  chart.dataField = function(_) {
    if (!arguments.length) return (field);
    field = _;
    return chart;
  };

  chart.id = function(_) {
        if (!arguments.length) return id;
        id = _;
        return chart;
  };

  chart.dispatch = dispatch;



    return chart;
}
