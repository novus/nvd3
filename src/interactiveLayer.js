/* Utility class to handle creation of an interactive layer.
 This places a rectangle on top of the chart. When you mouse move over it, it sends a dispatch
 containing the X-coordinate. It can also render a vertical line where the mouse is located.

 dispatch.elementMousemove is the important event to latch onto.  It is fired whenever the mouse moves over
 the rectangle. The dispatch is given one object which contains the mouseX/Y location.
 It also has 'pointXValue', which is the conversion of mouseX to the x-axis scale.
 */

var InteractiveGuidelinePrivates = {
    xScale: null
    , yScale: null
    , svgContainer: null
    , renderGuideLine: null
    , showGuideLine: true
    , isMSIE: navigator.userAgent.indexOf("MSIE") !== -1  //Check user-agent for Microsoft Internet Explorer.

//Must pass in the bounding chart's <svg> container.
//The mousemove event is attached to this container.
};

/**
 * A InteractiveGuideline
 */
function InteractiveGuideline(options){
    options = nv.utils.extend({}, options, InteractiveGuidelinePrivates, {
        margin: {top: 0, left: 0, right: 0, bottom: 0}
        , width: null
        , height: null
        //Please pass in the bounding chart's top and left margins
        //This is important for calculating the correct mouseX/Y positions.
        , chartClass: 'interactiveLineLayer'
    });

    Layer.call(this, options, ['elementMousemove']);

    this.tooltip = nv.models.tooltip();
    this.renderWatch = nv.utils.renderWatch(this.dispatch, this.duration());

    //Draws a vertical guideline at the given X postion.
    this.renderGuideLine(function(x) {
        if (!this.showGuideLine()) return;
        var line = this.wrap.select(".nv-interactiveGuideLine")
            .selectAll("line")
            .data((x != null) ? [nv.utils.NaNtoZero(x)] : [], String);

        line.enter()
            .append("line")
            .attr("class", "nv-guideline")
            .attr("x1", function(d) { return d;})
            .attr("x2", function(d) { return d;})
            .attr("y1", this.height())
            .attr("y2",0)
        ;
        line.exit().remove();
    }.bind(this));
}

nv.utils.create(InteractiveGuideline, Layer, InteractiveGuidelinePrivates);

/**
 * @override Layer::wrapper
 */
InteractiveGuideline.prototype.wrapper = function(data){
    Layer.prototype.wrapper.call(this, data, ['nv-interactiveGuideLine']);
};

/**
 * @override Layer::draw
 */
InteractiveGuideline.prototype.draw = function(data){

    if (!this.svgContainer()) {
        return;
    }

    var that = this;

    function mouseHandler() {
        var d3mouse = d3.mouse(this)
            , mouseX = d3mouse[0]
            , mouseY = d3mouse[1]
            , subtractMargin = true
            , mouseOutAnyReason = false;
        if (that.isMSIE()) {
            /*
             D3.js (or maybe SVG.getScreenCTM) has a nasty bug in Internet Explorer 10.
             d3.mouse() returns incorrect X,Y mouse coordinates when mouse moving
             over a rect in IE 10.
             However, d3.event.offsetX/Y also returns the mouse coordinates
             relative to the triggering <rect>. So we use offsetX/Y on IE.
             */
            mouseX = d3.event.offsetX;
            mouseY = d3.event.offsetY;

            /*
             On IE, if you attach a mouse event listener to the <svg> container,
             it will actually trigger it for all the child elements (like <path>, <circle>, etc).
             When this happens on IE, the offsetX/Y is set to where ever the child element
             is located.
             As a result, we do NOT need to subtract margins to figure out the mouse X/Y
             position under this scenario. Removing the line below *will* cause
             the interactive layer to not work right on IE.
             */
            if(d3.event.target.tagName !== "svg")
                subtractMargin = false;

            if (d3.event.target.className.baseVal.match("nv-legend"))
                mouseOutAnyReason = true;

        }

        if(subtractMargin) {
            mouseX -= that.margin().left;
            mouseY -= that.margin().top;
        }

        /* If mouseX/Y is outside of the chart's bounds,
         trigger a mouseOut event.
         */
        if (mouseX < 0 || mouseY < 0
            || mouseX > that.width()
            || mouseY > that.height()
            || (d3.event.relatedTarget && d3.event.relatedTarget.ownerSVGElement === undefined)
            || mouseOutAnyReason
            )
        {
            if (that.isMSIE()) {
                if (d3.event.relatedTarget
                    && d3.event.relatedTarget.ownerSVGElement === undefined
                    && d3.event.relatedTarget.className.match(that.tooltip.nvPointerEventsClass)) {
                    return;
                }
            }
            that.dispatch.elementMouseout({
                mouseX: mouseX,
                mouseY: mouseY
            });
            that.renderGuideLine()(null); //hide the guideline
            return;
        }

        var pointXValue = that.xScale().invert(mouseX);
        that.dispatch.elementMousemove({
            mouseX: mouseX,
            mouseY: mouseY,
            pointXValue: pointXValue
        });

        //If user double clicks the layer, fire a elementDblclick dispatch.
        if (d3.event.type === "dblclick") {
            that.dispatch.elementDblclick({
                mouseX: mouseX,
                mouseY: mouseY,
                pointXValue: pointXValue
            });
        }
    }

    that.svgContainer()
        .on("mousemove",mouseHandler, true)
        .on("mouseout" ,mouseHandler, true)
        .on("dblclick" ,mouseHandler)
    ;
};

/**
 * The interactiveGuideline model returns a function wrapping an instance of a InteractiveGuideline.
 */
nv.interactiveGuideline = function () {
    "use strict";

    var interactiveGuideline = new InteractiveGuideline(),
        api = [
            'margin',
            'width',
            'height',
            'xScale',
            'yScale',
            'showGuideLine',
            'svgContainer',
            'renderGuideLine'
        ];

    function chart(selection) {
        interactiveGuideline.render(selection);
        return chart;
    }

    chart.dispatch = interactiveGuideline.dispatch;
    chart.tooltip = interactiveGuideline.tooltip;

    chart.options = nv.utils.optionsFunc.bind(chart);

    nv.utils.rebindp(chart, interactiveGuideline, InteractiveGuideline.prototype, api);

    return chart;
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
    "use strict";
    if (! values instanceof Array) return null;
    if (typeof xAccessor !== 'function')
        xAccessor = function(d) { return d.x };

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

/*
 Returns the index in the array "values" that is closest to searchVal.
 Only returns an index if searchVal is within some "threshold".
 Otherwise, returns null.
 */
nv.nearestValueIndex = function (values, searchVal, threshold) {
    "use strict";
    var yDistMax = Infinity, indexToHighlight = null;
    values.forEach(function(d,i) {
        var delta = Math.abs(searchVal - d);
        if ( delta <= yDistMax && delta < threshold) {
            yDistMax = delta;
            indexToHighlight = i;
        }
    });
    return indexToHighlight;
};