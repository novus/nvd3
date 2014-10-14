nv.models.sumoUtilization = function() {
  "use strict";
  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var sumoUtilization = this;

  var margin = {top: 10, right: 10, bottom: 10, left: 10}
    , width  = 470
    , height = 65
    , id = Math.floor(Math.random() * 10000) // Create a semi-unique ID in case the user doesn't select one
    , colors = ['#c07a78', '#c68a6f', '#cc9873', '#d8b973', '#ded575', '#89c793' ]
    , bands = [10, 20, 30, 40, 50]
    , tooltips = true
    , dispatch = d3.dispatch('elementMouseover', 'tooltipShow', 'elementMouseout', 'tooltipHide')
    ;

  //============================================================

  var tip = nv.models.tooltip().gravity('n').distance(10);

  //============================================================
  // Private Variables
  //------------------------------------------------------------

  var showTooltip = function(e, offsetElement) {
    var tipContent = '<h3>' + e.label + '</h3><p>' + e.value + '</p>';
    
    e.pos.left += ( offsetElement && offsetElement.offsetLeft || 0 ) + margin.left;
    e.pos.top += ( offsetElement && offsetElement.offsetTop || 0) + margin.top;

     tip.chartContainer(e.owningSVG.parentElement)
          .content(tipContent)
          .position(e.pos)
          .call(tip);
  };


  //============================================================

  function chart(selection) {
    selection.each(function(data) {
      var availableWidth = width - margin.left - margin.right,
          availableHeight = height - margin.top - margin.bottom,
          container = d3.select(this);
      
      //------------------------------------------------------------
      // Setup Scales

      var threshold = d3.scale.threshold()
                        .domain(bands)
                        .range(colors);

      var x = d3.scale.linear()
                .domain([0,100])
                .range([0, availableWidth]);

      //------------------------------------------------------------


      //------------------------------------------------------------
      // Setup containers and skeleton of chart

      var wrap = container.selectAll('g.nv-wrap.nv-sumoutilization').data([data]);
      var wrapEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap nv-sumoutilization');
      var gEnter = wrapEnter.append('g');

      wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')'); 

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

      //var dots = wrap.select()

      gEnter.selectAll('.cpu')
           .data(data)
           .enter().append('circle')
           .attr('class', 'cpu')
           .attr('r', 6)
           .attr('cy', 35)
           .attr('cx', availableWidth * (data[0]/100))
           .style('fill','#ff6600')
           .style('stroke','black')
           .style('stroke-width','2px')
           .on("mouseover", function(d,i) {
             d3.select(this).classed('hover', true);
             dispatch.elementMouseover({               
               label: 'CPU',
               value: d,
               point: d.data,
               pointIndex: i,
               pos: {left: d3.event.pageX, top: d3.event.pageY},
               id: id,
               owningSVG: this.ownerSVGElement
             });
             d3.event.stopPropagation();
           })
           .on('mouseout', function(d,i){
             d3.select(this).classed('hover', false);
             dispatch.elementMouseout({
               label: 'CPU',
               value: d,
               point: d.data,
               pointIndex: i,
               pos: {left: d3.event.pageX, top: d3.event.pageY},
               owningSVG: this.ownerSVGElement
             });
           });

      gEnter.selectAll('.mem')
           .data(data)
           .enter().append('circle')
           .attr('class', 'mem')
           .attr('r', 6)
           .attr('cy', 10)
           .attr('cx', availableWidth * (data[1]/100))
           .style('fill','#5787b7')
           .style('stroke','black')
           .style('stroke-width','2px')
           .on("mouseover", function(d,i) {
             d3.select(this).classed('hover', true);
             dispatch.elementMouseover({               
               label: 'Memory',
               value: d,
               point: d.data,
               pointIndex: i,
               pos: {left: d3.event.pageX, top: d3.event.pageY},
               id: id,
               owningSVG: this.ownerSVGElement
             });
             d3.event.stopPropagation();
           })
           .on('mouseout', function(d,i){
             d3.select(this).classed('hover', false);
             dispatch.elementMouseout({
               label: 'Memory',
               value: d,
               point: d.data,
               pointIndex: i,
               pos: {left: d3.event.pageX, top: d3.event.pageY},
               owningSVG: this.ownerSVGElement
             });
           });

      //------------------------------------------------------------

      //============================================================
      // Event Handling/Dispatching (in chart's scope)
      //------------------------------------------------------------

      dispatch.on('elementMouseover.tooltip', function(e) {
        dispatch.tooltipShow(e);
      });

      dispatch.on('tooltipShow', function(e) {
        if(tooltips) showTooltip(e);
      });

      dispatch.on('elementMouseout.tooltip', function(e) {
        dispatch.tooltipHide(e);
      })

      dispatch.on('tooltipHide', function() {
        if(tooltips) nv.tooltip.cleanup();
      });

      //============================================================      
      

    });

    return chart;
  }

  //============================================================
  // Event Handling/Dispatching (out of chart's scope)
  //------------------------------------------------------------
  


  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------


  chart.tooltips = function(_) {
    if (!arguments.length) return tooltip;
    tooltip = _;
    return chart;
  }

  chart.x = function(_) {
     if (!arguments.length) return getX;
     getX = _;
     return chart;
  }


  //============================================================


  return chart;
}