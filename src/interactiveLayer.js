/* Utility class to handle creation of an interactive layer.
This places a rectangle on top of the chart. When you mouse move over it, it sends a dispatch
containing the X-coordinate. It can also render a vertical line where the mouse is located.

*/
nv.interactiveGuideline = function() {
	var tooltip = nv.models.tooltip();
	//Public settings
	var width = null
	, height = null
	, xScale = d3.scale.linear()
	, yScale = d3.scale.linear()
	, dispatch = d3.dispatch('elementMousemove', 'elementMouseout')
	, showGuideLine = true
	;

	//Private variables
	var previousXCoordinate = null
	;

	function layer(selection) {
		selection.each(function(data) {
				var container = d3.select(this);

				var availableWidth = (width || 960), availableHeight = (height || 400);

				var wrap = container.selectAll("g.nv-wrap.nv-interactiveLineLayer").data([data]);
				var wrapEnter = wrap.enter()
								.append("g").attr("class", " nv-wrap nv-interactiveLineLayer");
								
				
				wrapEnter.append("g").attr("class","nv-interactiveGuideLine");
				wrapEnter.append("rect").attr("class", "nv-mouseMoveLayer");
				

				wrap.select(".nv-mouseMoveLayer")
					  .attr("width",availableWidth)
				      .attr("height",availableHeight)
				      .attr("opacity", 0)
				      .on("mousemove",function() {
				          var padding = Math.floor(xScale(1)) /2;
				          var mouseX = d3.mouse(this)[0];
				          var mouseY = d3.mouse(this)[1];
				          var pointIndex = Math.floor(xScale.invert(mouseX + padding));
				          var pointXLocation = xScale(pointIndex);
				          dispatch.elementMousemove({
				          		mouseX: mouseX,
				          		mouseY: mouseY,
				          		pointIndex: pointIndex,
				          		pointXLocation: pointXLocation,
				          		pointYLocation: mouseY   	//TODO: Return the proper Y coordinate, not just mouseY.
				          });

				          renderGuideLine(pointXLocation);

				      	  
				      })
				      .on("mouseout",function() {
				      	  var padding = Math.floor(xScale(1)) /2;
				          var mouseX = d3.mouse(this)[0];
				          var mouseY = d3.mouse(this)[1];
				          var pointIndex = Math.floor(xScale.invert(mouseX + padding));
				          
					      dispatch.elementMouseout({
					          		mouseX: mouseX,
					          		mouseY: mouseY,
					          		pointIndex: pointIndex
					      });

					      renderGuideLine(null);
				     
				      })
				      ;

				 function renderGuideLine(x) {
				 	if (!showGuideLine) return;
				 	var line = wrap.select(".nv-interactiveGuideLine")
				 	      .selectAll("line")
				 	      .data((x != null) ? [x] : [], String);

				 	line.enter()
				 		.append("line")
				 		.attr("class", "nv-guideline")
				 		.attr("x1", function(d) { return d;})
				 		.attr("x2", function(d) { return d;})
				 		.attr("y1", availableHeight)
				 		.attr("y2",0)
				 		;
				 	line.exit().remove();

				 }
		});
	}

	layer.dispatch = dispatch;
	layer.tooltip = tooltip;

	layer.width = function(_) {
		if (!arguments.length) return width;
		width = _;
		return layer;
	};

	layer.height = function(_) {
		if (!arguments.length) return height;
		height = _;
		return layer;
	};

	layer.xScale = function(_) {
		if (!arguments.length) return xScale;
		xScale = _;
		return layer;
	};

	layer.showGuideLine = function(_) {
		if (!arguments.length) return showGuideLine;
		showGuideLine = _;
		return layer;
	};


	return layer;
};