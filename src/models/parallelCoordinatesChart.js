nv.models.parallelCoordinatesChart = function () {
        "use strict";
        //============================================================
        // Public Variables with Default Settings
        //------------------------------------------------------------

        var parallelCoordinates = nv.models.parallelCoordinates()
        var legend = nv.models.legend()
        var tooltip = nv.models.tooltip();
        var dimensionTooltip = nv.models.tooltip();

        var margin = { top: 0, right: 0, bottom: 0, left: 0 }
        , width = null
		, height = null
        , showLegend = true
		, color = nv.utils.defaultColor()
        , state = nv.utils.state()
        , dimensionData = []
        , dimensionNames = []
        , displayBrush = true
        , defaultState = null
        , noData = null
        , dispatch = d3.dispatch('dimensionsOrder', 'brushEnd', 'stateChange', 'changeState', 'renderEnd')
        , controlWidth = function () { return showControls ? 180 : 0 }
        ;

	    //============================================================
	
		//============================================================
        // Private Variables
        //------------------------------------------------------------

        var renderWatch = nv.utils.renderWatch(dispatch);

        var stateGetter = function(data) {
            return function() {
                return {
                    active: data.map(function(d) { return !d.disabled })
                };
            }
        };

        var stateSetter = function(data) {
            return function(state) {
                if(state.active !== undefined) {
                    data.forEach(function(series, i) {
                        series.disabled = !state.active[i];
                    });
                }
            }
        };

        //============================================================
        // Chart function
        //------------------------------------------------------------

        function chart(selection) {
            renderWatch.reset();
            renderWatch.models(parallelCoordinates);

            selection.each(function(data) {
                var container = d3.select(this);
                nv.utils.initSVG(container);

                var that = this;

                var availableWidth = nv.utils.availableWidth(width, container, margin),
                    availableHeight = nv.utils.availableHeight(height, container, margin);

                chart.update = function() { container.call(chart); };
                chart.container = this;

                state.setter(stateSetter(dimensionData), chart.update)
                    .getter(stateGetter(dimensionData))
                    .update();

                //set state.disabled
                state.disabled = dimensionData.map(function (d) { return !!d.disabled });

                //Keep dimensions position in memory
                dimensionData = dimensionData.map(function (d) {d.disabled = !!d.disabled; return d});
                dimensionData.forEach(function (d, i) {
                    d.originalPosition = isNaN(d.originalPosition) ? i : d.originalPosition;
                    d.currentPosition = isNaN(d.currentPosition) ? i : d.currentPosition;
                });

                var currentDimensions = dimensionNames.map(function (d) { return d.key; });
                var newDimensions = dimensionData.map(function (d) { return d.key; });
                dimensionData.forEach(function (k, i) {
                    var idx = currentDimensions.indexOf(k.key);
                        if (idx < 0) {
                            dimensionNames.splice(i, 0, k);
                        } else {
                            var gap = dimensionNames[idx].currentPosition - dimensionNames[idx].originalPosition;
                            dimensionNames[idx].originalPosition = k.originalPosition;
                            dimensionNames[idx].currentPosition = k.originalPosition + gap;
                        }
                });
                //Remove old dimensions
                dimensionNames = dimensionNames.filter(function (d) { return newDimensions.indexOf(d.key) >= 0; });

               if (!defaultState) {
                    var key;
                    defaultState = {};
                    for(key in state) {
                        if(state[key] instanceof Array)
                            defaultState[key] = state[key].slice(0);
                        else
                            defaultState[key] = state[key];
                    }
                }

                // Display No Data message if there's nothing to show.
                if(!data || !data.length) {
                    nv.utils.noData(chart, container);
                    return chart;
                } else {
                    container.selectAll('.nv-noData').remove();
                }
                
                //------------------------------------------------------------
                // Setup containers and skeleton of chart

                var wrap = container.selectAll('g.nv-wrap.nv-parallelCoordinatesChart').data([data]);
                var gEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap nv-parallelCoordinatesChart').append('g');

                var g = wrap.select('g');
                
                gEnter.append('g').attr('class', 'nv-parallelCoordinatesWrap');
                gEnter.append('g').attr('class', 'nv-legendWrap');

                g.select("rect")
                    .attr("width", availableWidth)
                    .attr("height", (availableHeight > 0) ? availableHeight : 0);

                // Legend
                if (showLegend) {
                    legend.width(availableWidth)
                        .color(function (d) { return "rgb(188,190,192)"; });

                    g.select('.nv-legendWrap')
                        .datum(dimensionNames.sort(function (a, b) { return a.originalPosition - b.originalPosition; }))
                        .call(legend);

                    if (margin.top != legend.height()) {
                        margin.top = legend.height();
                        availableHeight = nv.utils.availableHeight(height, container, margin);
                    }
                    wrap.select('.nv-legendWrap')
                       .attr('transform', 'translate( 0 ,' + (-margin.top) + ')');
                }
                wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

                
               

                // Main Chart Component(s)
                parallelCoordinates
                    .width(availableWidth)
                    .height(availableHeight)
                    .dimensionData(dimensionNames)
                    .displayBrush(displayBrush);
		
		        var parallelCoordinatesWrap = g.select('.nv-parallelCoordinatesWrap ')
                  .datum(data);

		        parallelCoordinatesWrap.transition().call(parallelCoordinates);
		  
				//============================================================
                // Event Handling/Dispatching (in chart's scope)
                //------------------------------------------------------------
                //Display reset brush button
		        parallelCoordinates.dispatch.on('brushEnd', function (active, hasActiveBrush) {
		            if (hasActiveBrush) {
		                displayBrush = true;
		                dispatch.brushEnd(active);
		            } else {

		                displayBrush = false;
		            }
		        });

		        legend.dispatch.on('stateChange', function(newState) {
		            for(var key in newState) {
		                state[key] = newState[key];
		            }
		            dispatch.stateChange(state);
		            chart.update();
		        });

                //Update dimensions order and display reset sorting button
		        parallelCoordinates.dispatch.on('dimensionsOrder', function (e) {
		            dimensionNames.sort(function (a, b) { return a.currentPosition - b.currentPosition; });
		            var isSorted = false;
		            dimensionNames.forEach(function (d, i) {
		                d.currentPosition = i;
		                if (d.currentPosition !== d.originalPosition)
		                    isSorted = true;
		            });
		            dispatch.dimensionsOrder(dimensionNames, isSorted);
		        });

				// Update chart from a state object passed to event handler
                dispatch.on('changeState', function (e) {

                    if (typeof e.disabled !== 'undefined') {
                        dimensionNames.forEach(function (series, i) {
                            series.disabled = e.disabled[i];
                        });
                        state.disabled = e.disabled;
                    }
                    chart.update();
                });
            });

            renderWatch.renderEnd('parraleleCoordinateChart immediate');
            return chart;
        }

		//============================================================
        // Event Handling/Dispatching (out of chart's scope)
        //------------------------------------------------------------

        parallelCoordinates.dispatch.on('elementMouseover.tooltip', function (evt) {
            evt['series'] = {
                key: evt.label,
                color: evt.color
            };
            tooltip.data(evt).hidden(false);
        });

        parallelCoordinates.dispatch.on('elementMouseout.tooltip', function(evt) {
            tooltip.hidden(true)
        });

        parallelCoordinates.dispatch.on('elementMousemove.tooltip', function () {
            tooltip();
        });
		 //============================================================
        // Expose Public Variables
        //------------------------------------------------------------
		
		// expose chart's sub-components
        chart.dispatch = dispatch;
        chart.parallelCoordinates = parallelCoordinates;
        chart.legend = legend;
        chart.tooltip = tooltip;

        chart.options = nv.utils.optionsFunc.bind(chart);

        chart._options = Object.create({}, {
            // simple options, just get/set the necessary values
            width: { get: function () { return width; }, set: function (_) { width = _; } },
            height: { get: function () { return height; }, set: function (_) { height = _; } },
            showLegend: { get: function () { return showLegend; }, set: function (_) { showLegend = _; } },
            defaultState: { get: function () { return defaultState; }, set: function (_) { defaultState = _; } },
            dimensionData: { get: function () { return dimensionData; }, set: function (_) { dimensionData = _; } },
            displayBrush: { get: function () { return displayBrush; }, set: function (_) { displayBrush = _; } },
            noData: { get: function () { return noData; }, set: function (_) { noData = _; } },

            // options that require extra logic in the setter
            margin: {
                get: function () { return margin; },
                set: function (_) {
                    margin.top = _.top !== undefined ? _.top : margin.top;
                    margin.right = _.right !== undefined ? _.right : margin.right;
                    margin.bottom = _.bottom !== undefined ? _.bottom : margin.bottom;
                    margin.left = _.left !== undefined ? _.left : margin.left;
                }
            },
            color: {get: function(){return color;}, set: function(_){
                    color = nv.utils.getColor(_);
                    legend.color(color);
                    parallelCoordinates.color(color);
                }}
        });

        nv.utils.inheritOptions(chart, parallelCoordinates);
        nv.utils.initOptions(chart);

        return chart;
    };