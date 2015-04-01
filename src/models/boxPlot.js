nv.models.boxPlot = function() {
    "use strict";

    //============================================================
    // Public Variables with Default Settings
    //------------------------------------------------------------

    var margin = {top: 0, right: 0, bottom: 0, left: 0}
        , width = 960
        , height = 500
        , id = Math.floor(Math.random() * 10000) //Create semi-unique ID in case user doesn't select one
        , x = d3.scale.ordinal()
        , y = d3.scale.linear()
        , getX = function(d) { return d.x }
        , getY = function(d) { return d.y }
        , color = nv.utils.defaultColor()
        , showValues = false
        , valueFormat = d3.format(',.2f')
        , xDomain
        , yDomain
        , xRange
        , yRange
        , dispatch = d3.dispatch('elementMouseover', 'elementMouseout', 'renderEnd')
        , duration = 250
        ;

    //============================================================
    // Private Variables
    //------------------------------------------------------------

    var x0, y0;
    var renderWatch = nv.utils.renderWatch(dispatch, duration);

    function chart(selection) {
        renderWatch.reset();
        selection.each(function(data) {
            var availableWidth = width - margin.left - margin.right,
                availableHeight = height - margin.top - margin.bottom,
                container = d3.select(this);
            nv.utils.initSVG(container);
                        
            // Setup Scales            
            x   .domain(xDomain || data.map(function(d,i) { return getX(d,i); }))
                .rangeBands(xRange || [0, availableWidth], .1);                
                        
            // if we know yDomain, no need to calculate
            var yData = []
            if (!yDomain) {
                // (y-range is based on quartiles, whiskers and outliers)
                
                // lower values
                var yMin = d3.min(data.map(function(d) {
                    var min_arr = [];

                    min_arr.push(d.values.whisker_low);
                    min_arr.push(d.values.Q1);
                    min_arr = min_arr.concat(d.values.outliers);

                    return d3.min(min_arr);
                }));
                
                // upper values
                var yMax = d3.max(data.map(function(d) {
                    var max_arr = [];

                    max_arr.push(d.values.whisker_high);
                    max_arr.push(d.values.Q3);
                    max_arr = max_arr.concat(d.values.outliers);

                    return d3.max(max_arr);
                }));
                
                yData = [ yMin, yMax ] ;
            }
                        
            y   .domain(yDomain || yData);
            
            // If showValues, pad the Y axis range to account for label height
            if (showValues) y.range(yRange || [availableHeight - (y.domain()[0] < 0 ? 12 : 0), y.domain()[1] > 0 ? 12 : 0]);
            else y.range(yRange || [availableHeight, 0]);

            //store old scales if they exist
            x0 = x0 || x;
            y0 = y0 || y.copy().range([y(0),y(0)]);

            // Setup containers and skeleton of chart
            var wrap = container.selectAll('g.nv-wrap').data([data]);
            var wrapEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap');
            wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
            
            var boxplots = wrap.selectAll('.nv-boxplot').data(function(d) { return d });
            var boxEnter = boxplots.enter().append('g').style('stroke-opacity', 1e-6).style('fill-opacity', 1e-6);
            boxplots
                .attr('class', 'nv-boxplot')
                .attr('transform', function(d,i,j) { return 'translate(' + (x(getX(d,i)) + x.rangeBand() * .05) + ', 0)'; })
                .classed('hover', function(d) { return d.hover });
            boxplots
                .watchTransition(renderWatch, 'nv-box: boxplots')
                .style('stroke-opacity', 1)
                .style('fill-opacity', .75)
                .delay(function(d,i) { return i * duration / data.length })
                .attr('transform', function(d,i) {                            
                    return 'translate(' + (x(getX(d,i)) + x.rangeBand() * .05) + ', 0)';
                });
            boxplots.exit().remove();
            
            // ----- add the SVG elements for each boxPlot -----
            
            // outliers
            var outliers = boxplots.selectAll('.nv-boxplot-outlier').data(function(d) { return d.values.outliers });
            outliers.enter().append('circle').style('fill', function(d,i,j) { return color(d,j) }).style('stroke', function(d,i,j) { return color(d,j) });
            outliers.attr('class', 'nv-boxplot-outlier');     
            outliers
              .watchTransition(renderWatch, 'nv-box: nv-boxplot-outlier')
                .attr('cx', x.rangeBand() * .45)
                .attr('cy', function(d,i,j) { return y(d); })
                .attr('r', '3');
            outliers.exit().remove();                
            
            var box_width = function() { return Math.min(75, x.rangeBand() * .9); }
            var box_left  = function() { return x.rangeBand() * .45 - box_width()/2; }
            var box_right = function() { return x.rangeBand() * .45 + box_width()/2; }
            
            // whiskers 
            // (lower)
            boxEnter.append('line')
                .style('stroke', function(d,i) { return d.color || color(d,i) })
                .attr('class', 'nv-box-lwhisker');
            
            boxplots.select('line.nv-box-lwhisker')
              .watchTransition(renderWatch, 'nv-box: boxplots')
                .attr('x1', x.rangeBand() * .45 )
                .attr('y1', function(d,i) { return y(d.values.whisker_low); })
                .attr('x2', x.rangeBand() * .45 )
                .attr('y2', function(d,i) { return y(d.values.Q1); });
            
            // (upper)
            boxEnter.append('line')
                .style('stroke', function(d,i) { return d.color || color(d,i) })
                .attr('class', 'nv-box-hwhisker');

            boxplots.select('line.nv-box-hwhisker')
              .watchTransition(renderWatch, 'nv-boxplot: boxplots')
                .attr('x1', x.rangeBand() * .45 )
                .attr('y1', function(d,i) { return y(d.values.whisker_high); })
                .attr('x2', x.rangeBand() * .45 )
                .attr('y2', function(d,i) { return y(d.values.Q3); });
            
            // whisker ticks 
            // (lower)
            boxEnter.append('line')
              .style('stroke', function(d,i) { return d.color || color(d,i) })
              .attr('class', 'nv-box-ltick');
            
            boxplots.select('line.nv-box-ltick')
              .watchTransition(renderWatch, 'nv-boxplot: boxplots')
                .attr('x1', box_left )
                .attr('y1', function(d,i) { return y(d.values.whisker_low); })
                .attr('x2', box_right )
                .attr('y2', function(d,i) { return y(d.values.whisker_low); });            

            // (upper)
            boxEnter.append('line')
              .style('stroke', function(d,i) { return d.color || color(d,i) })
              .attr('class', 'nv-box-htick');
            
            boxplots.select('line.nv-box-htick')
              .watchTransition(renderWatch, 'nv-boxplot: boxplots line')
                .attr('x1', box_left)
                .attr('y1', function(d,i) { return y(d.values.whisker_high); })
                .attr('x2', box_right)
                .attr('y2', function(d,i) { return y(d.values.whisker_high); });
            
            // median line
            boxEnter.append('line').attr('class', 'nv-box-median');

            boxplots.select('line.nv-box-median')
              .watchTransition(renderWatch, 'nv-boxplot: boxplots line')
                .attr('x1', box_left)
                .attr('y1', function(d,i) { return y(d.values.Q2); })
                .attr('x2', box_right)
                .attr('y2', function(d,i) { return y(d.values.Q2); })
                .style('stroke', function(d,i) { return d.color || color(d,i) });
                
            // boxes
            boxEnter.append('rect')
                .attr('class', 'nv-box')                
                // (tooltip events)
                .on('mouseover', function(d,i) {
                    d3.select(this).classed('hover', true);
                    dispatch.elementMouseover({
                        data: d,
                        index: i,
                        point: d,
                        pos: [x(getX(d,i)) + x.rangeBand() * .5, y(getY(d,i))],
                        e: d3.event
                    });
                })
                .on('mouseout', function(d,i) {
                    d3.select(this).classed('hover', false);
                    dispatch.elementMouseout({
                        data: d,
                        point: d,
                        pointIndex: i,
                        e: d3.event
                    });
                });

            // box transitions
            boxplots.select('rect.nv-box')
              .watchTransition(renderWatch, 'nv-boxplot: boxes')
                .attr('y', function(d,i) { return y(d.values.Q3); })
                .attr('width', box_width)
                .attr('x', box_left )
                
                .attr('height', function(d,i) { return Math.abs(y(d.values.Q3) - y(d.values.Q1)) || 1 })
                .style('fill', function(d,i) { return d.color || color(d,i) })
                .style('stroke', function(d,i) { return d.color || color(d,i) });
            
            //store old scales for use in transitions on update
            x0 = x.copy();
            y0 = y.copy();
        });

        renderWatch.renderEnd('nv-boxplot immediate');
        return chart;
    }

    //============================================================
    // Expose Public Variables
    //------------------------------------------------------------

    chart.dispatch = dispatch;
    chart.options = nv.utils.optionsFunc.bind(chart);

    chart._options = Object.create({}, {
        // simple options, just get/set the necessary values
        width:   {get: function(){return width;}, set: function(_){width=_;}},
        height:  {get: function(){return height;}, set: function(_){height=_;}},
        showValues: {get: function(){return showValues;}, set: function(_){showValues=_;}},
        x:       {get: function(){return getX;}, set: function(_){getX=_;}},
        y:       {get: function(){return getY;}, set: function(_){getY=_;}},
        xScale:  {get: function(){return x;}, set: function(_){x=_;}},
        yScale:  {get: function(){return y;}, set: function(_){y=_;}},
        xDomain: {get: function(){return xDomain;}, set: function(_){xDomain=_;}},
        yDomain: {get: function(){return yDomain;}, set: function(_){yDomain=_;}},
        xRange:  {get: function(){return xRange;}, set: function(_){xRange=_;}},
        yRange:  {get: function(){return yRange;}, set: function(_){yRange=_;}},
        valueFormat:    {get: function(){return valueFormat;}, set: function(_){valueFormat=_;}},
        id:          {get: function(){return id;}, set: function(_){id=_;}},
        // rectClass: {get: function(){return rectClass;}, set: function(_){rectClass=_;}},

        // options that require extra logic in the setter
        margin: {get: function(){return margin;}, set: function(_){
            margin.top    = _.top    !== undefined ? _.top    : margin.top;
            margin.right  = _.right  !== undefined ? _.right  : margin.right;
            margin.bottom = _.bottom !== undefined ? _.bottom : margin.bottom;
            margin.left   = _.left   !== undefined ? _.left   : margin.left;
        }},
        color:  {get: function(){return color;}, set: function(_){
            color = nv.utils.getColor(_);
        }},
        duration: {get: function(){return duration;}, set: function(_){
            duration = _;
            renderWatch.reset(duration);
        }}
    });

    nv.utils.initOptions(chart);

    return chart;
};