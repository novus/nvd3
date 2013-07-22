/* Utility class to handle creation of an interactive layer.
This places a rectangle on top of the chart. When you mouse move over it, it sends a dispatch
containing the X-coordinate. It can also render a vertical line where the mouse is located.

dispatch.elementMousemove is the important event to latch onto.  It is fired whenever the mouse moves over
the rectangle. The dispatch is given one object which contains the mouseX/Y location.
It also has 'pointXValue', which is the conversion of mouseX to the x-axis scale.
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
	isMSIE = navigator.userAgent.indexOf("MSIE") !== -1  //Check user-agent for Microsoft Internet Explorer.
	;


	function findFirstSVGParent(Elem) {
		while(Elem.tagName.match(/^svg$/i) === null) {
			Elem = Elem.parentNode;
		}
		return Elem;
	}

	function layer(selection) {
		selection.each(function(data) {
				var container = d3.select(this);
				var offsetParent = findFirstSVGParent(this);
				
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
				      	  var d3mouse = d3.mouse(this);
				          var mouseX = d3mouse[0];
				          var mouseY = d3mouse[1];
				          
				          if (isMSIE) {
				          	 /*
								D3.js (or maybe SVG.getScreenCTM) has a nasty bug in Internet Explorer 10.
								d3.mouse() returns incorrect X,Y mouse coordinates when mouse moving
								over a rect in IE 10.
								However, d3.event.offsetX/Y also returns the mouse coordinates
								relative to the triggering <rect>. So we use offsetX/Y on IE.  
				          	 */
				          	 mouseX = d3.event.offsetX;
				          	 mouseY = d3.event.offsetY;
				          }
				          
				          var pointXValue = xScale.invert(mouseX);
				          dispatch.elementMousemove({
				          		mouseX: mouseX,
				          		mouseY: mouseY,
				          		pointXValue: pointXValue
				          });
				      	  
				      })
				      .on("mouseout",function() {
				          var d3mouse = d3.mouse(this);
				          var mouseX = d3mouse[0];
				          var mouseY = d3mouse[1];
				          
				          if (isMSIE) {
				          	/* 
				          	  On IE 9+, the pointer-events property does not work for DIV's (it does on Chrome, FireFox).
				          	  So the result is, when you mouse over this interactive layer, and then mouse over a tooltip,
				          	  the mouseout event is called, causing the tooltip to disappear. This causes very buggy behavior.
				          	  To bypass this, only on IE, we check d3.event.relatedTarget. If this is equal to anything in the tooltip,
				          	  we do NOT fire elementMouseout.

				          	*/
				          	 var rTarget = d3.event.relatedTarget;
				          	 if (rTarget) {
				          	 	while(rTarget && rTarget.id !== tooltip.id()) {
				          	 		rTarget = rTarget.parentNode;
				          	 	}
				          	 	if (rTarget && tooltip.id() === rTarget.id) {
				          	 		return;
				          	 	}
				          	 }
				          }
					      dispatch.elementMouseout({
					          		mouseX: mouseX,
					          		mouseY: mouseY
					      });

					      layer.renderGuideLine(null);
				     
				      })
				      ;

				 //Draws a vertical guideline at the given X postion.
				 layer.renderGuideLine = function(x) {
				 	if (!showGuideLine) return;
				 	var line = wrap.select(".nv-interactiveGuideLine")
				 	      .selectAll("line")
				 	      .data((x != null) ? [nv.utils.NaNtoZero(x)] : [], String);

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

/* Utility class that uses d3.bisect to find the index in a given array, where a search value can be inserted.
This is different from normal bisectLeft; this function finds the nearest index to insert the search value.

For instance, lets say your array is [1,2,3,5,10,30], and you search for 28. 
Normal d3.bisectLeft will return 4, because 28 is inserted after the number 10.  But interactiveBisect will return 5
because 28 is closer to 30 than 10.

Unit tests can be found in: interactiveBisectTest.html

Has the following known issues:
   * Will not work if the data points move backwards (ie, 10,9,8,7, etc) or if the data points are in random order.
   * Won't work if there are duplicate x coordinate values.
*/
nv.interactiveBisect = function (values, searchVal, xAccessor) {
      if (! values instanceof Array) return null;
      if (typeof xAccessor !== 'function') xAccessor = function(d,i) { return d.x;}

      var bisect = d3.bisector(xAccessor).left;
      var index = d3.max([0, bisect(values,searchVal) - 1]);
      var currentValue = xAccessor(values[index], index);
      if (typeof currentValue === 'undefined') currentValue = index;

      if (currentValue === searchVal) return index;  //found exact match

      var nextIndex = d3.min([index+1, values.length - 1]);
      var nextValue = xAccessor(values[nextIndex], nextIndex);
      if (typeof nextValue === 'undefined') nextValue = nextIndex;

      if (Math.abs(nextValue - searchVal) >= Math.abs(currentValue - searchVal))
          return index;
      else
          return nextIndex
};