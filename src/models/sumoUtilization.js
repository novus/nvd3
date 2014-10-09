nv.models.sumoUtilization = function() {
  "use strict";
  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var margin = {top: 10, right: 10, bottom: 10, left: 10}
    , width  = 470
    , height = 65
    , id = Math.floor(Math.random() * 10000) // Create a semi-unique ID in case the user doesn't select one
    , colors = ['#c07a78', '#c68a6f', '#cc9873', '#d8b973', '#ded575', '#89c793' ]
    , bands = [10, 20, 30, 40, 50]
    ;

  //============================================================


  //============================================================
  // Private Variables
  //------------------------------------------------------------


  //============================================================

  function chart(selection) {
    selection.each(function(data) {
      var availableWidth = width - margin.left - margin.right,
          availableHeight = height - margin.top - margin.bottom,
          container = d3.select(this);
      
      //------------------------------------------------------------
      // Setup Scales


      //------------------------------------------------------------


      //------------------------------------------------------------
      // Setup containers and skeleton of chart

      var wrap = container.selectAll('g.nv-wrap.nv-sumoutilization').data([data]);
      var wrapEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap nv-sumoutilization');
      var gEnter = wrapEnter.append('g');

      wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')'); 

      var threshold = d3.scale.threshold()
                        .domain(bands)
                        .range(colors);

      var x = d3.scale.linear()
                .domain([0,100])
                .range([0, availableWidth]);

      var xAxis = nv.models.axis()
                    .scale(x)
                    .ticks(10)
                    .tickSize(-44)                          
                    .orient("bottom");

      gEnter.selectAll('rect').data(threshold.range().map(function(color) {
         var d = threshold.invertExtent(color);
        
         if(d[0] == null) d[0] = x.domain()[0];
         if(d[1] == null) d[1] = x.domain()[1];
         return d;
      })).enter().append('rect')
         .attr('height', availableHeight)
         .attr('x', function(d) { return x(d[0]); })
         .attr('width', function(d) { return x(d[1]) - x(d[0]); })
         .style('fill', function(d) { return threshold(d[0]); })
         .style('border-top', '1px #000 top');

      gEnter.append('g')
           .attr('transform', 'translate(0,' + (availableWidth / 10) +  ')')                 
           .call(xAxis);

      gEnter.select('.tick').append('g')
            .append('line')
            .attr('x1',0)
            .attr('x2', availableWidth+1)
            .attr('y1',-45)
            .attr('y2',-45);

      gEnter.selectAll('.cpu')
           .data(data)
           .enter().append('circle')
           .attr('class', 'cpu')
           .attr('r', 6)
           .attr('cy', 35)
           .attr('cx', availableWidth * (data[0]/100))
           .style('fill','#ff6600')
           .style('stroke','black')
           .style('stroke-width','2px');

      gEnter.selectAll('.mem')
           .data(data)
           .enter().append('circle')
           .attr('class', 'cpu')
           .attr('r', 6)
           .attr('cy', 10)
           .attr('cx', availableWidth * (data[1]/100))
           .style('fill','#5787b7')
           .style('stroke','black')
           .style('stroke-width','2px');           
      
      //------------------------------------------------------------

    });

    return chart;
  }

  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------




  //============================================================


  return chart;
}