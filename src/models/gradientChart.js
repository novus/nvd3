nv.models.gradientChart = function() {
  "use strict";
  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var gradientChart = this
    , legend = nv.models.legend()
    ;

  var margin = {top: 10, right: 10, bottom: 10, left: 10}
    , width  = 470
    , height = 65
    , id = Math.floor(Math.random() * 10000) // Create a semi-unique ID in case the user doesn't select one
    , gradientColors = ['#c07a78', '#c68a6f', '#cc9873', '#d8b973', '#ded575', '#89c793' ]
    , bands = [10, 20, 30, 40, 50]
    , tooltips = true
    , showLegend = true
    , getLabel = function(d) { return d.key }
    , dispatch = d3.dispatch('elementMouseover', 'tooltipShow', 'elementMouseout', 'tooltipHide')
    , color = nv.utils.defaultColor(['#5787b7','#ff6600'])
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
                        .range(gradientColors);

      var x = d3.scale.linear()
                .domain([0,100])
                .range([0, availableWidth]);

      //------------------------------------------------------------


      //------------------------------------------------------------
      // Setup containers and skeleton of chart

      var wrap = container.selectAll('g.nv-wrap.nv-gradient').data([data]);
      var gEnter = wrap.enter().append('g')
                       .attr('class', 'nvd3 nv-wrap nv-gradient')
                       .append('g');
      var g = wrap.select('g');

      gEnter.append('g').attr('class','nv-gradientWrap');
      gEnter.append('g').attr('class', 'nv-legendWrap');

      //------------------------------------------------------------
      // Legend

      if (showLegend) {
        legend
          .width( availableWidth )
          .key();

        wrap.select('.nv-legendWrap')
            .datum(data)
            .call(legend);

        if ( margin.top != legend.height()) {
          margin.top = legend.height();
          availableHeight = (height || parseInt(container.style('height')) || 400)
                             - margin.top - margin.bottom;
        }

        wrap.select('.nv-legendWrap')
            .attr('transform', 'translate(0,' + (-margin.top) +')');
      }

      //------------------------------------------------------------
     
      wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')'); 

      var gradientWrap = g.select('.nv-gradientWrap')
                                   .datum([data]);

      var xAxis = nv.models.axis()
                    .scale(x)
                    .ticks(10)
                    .tickSize(-44)
                    .orient("bottom");

      gradientWrap.selectAll('rect').data(threshold.range().map(function(color) {
         var d = threshold.invertExtent(color);
        
         if(d[0] == null) d[0] = x.domain()[0];
         if(d[1] == null) d[1] = x.domain()[1];
         return d;
      })).enter().append('rect')
         .attr('height', 45)
         .attr('x', function(d) { return x(d[0]); })
         .attr('width', function(d) { return x(d[1]) - x(d[0]); })
         .style('fill', function(d) { return threshold(d[0]); });

      gradientWrap.append('g')
           .attr('transform', 'translate(0,' + (availableWidth / 10) +  ')')
           .attr('class', 'nv-gradientAxis')
           .call(xAxis);

      var circles = gradientWrap.append('g');

      circles.selectAll('circle')
           .data(data)
           .enter().append('circle')
           .attr('class', 'data-dot')
           .attr('r', 6)
           .attr('cy', function(d,i) { return 10 + (25 * i) })
           .attr('cx', function(d) { return availableWidth * (d.value/100) } )
           .style('fill',function(d,i) { return color(d.key,i) })
           .style('stroke','black')
           .style('stroke-width','2px')
           .on("mouseover", function(d,i) {
             d3.select(this).classed('hover', true);
             dispatch.elementMouseover({               
               label: d.key,
               value: d.value,
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

  chart.color = function(_) {
    if (!arguments.length) return color;
    color = nv.utils.getColor(_);
    return chart;
  };

  chart.label = function(_) {
    if(!arguments.length) return getLabel;
    getLabel = _;
    return chart;
  }

  //============================================================


  return chart;
}