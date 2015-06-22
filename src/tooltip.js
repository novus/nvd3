/* Tooltip rendering model for nvd3 charts.
 window.nv.models.tooltip is the updated,new way to render tooltips.

 window.nv.tooltip.show is the old tooltip code.
 window.nv.tooltip.* also has various helper methods.
 */
(function() {
    "use strict";

    /* Model which can be instantiated to handle tooltip rendering.
     Example usage:
     var tip = nv.models.tooltip().gravity('w').distance(23)
     .data(myDataObject);

     tip();    //just invoke the returned function to render tooltip.
     */
    nv.models.tooltip = function() {

        /*
        Tooltip data. If data is given in the proper format, a consistent tooltip is generated.
        Example Format of data:
        {
            key: "Date",
            value: "August 2009",
            series: [
                {key: "Series 1", value: "Value 1", color: "#000"},
                {key: "Series 2", value: "Value 2", color: "#00f"}
            ]
        }
        */
        var data = null;
        var gravity = 'w'   //Can be 'n','s','e','w'. Determines how tooltip is positioned.
            ,   distance = 25   //Distance to offset tooltip from the mouse location.
            ,   snapDistance = 0   //Tolerance allowed before tooltip is moved from its current position (creates 'snapping' effect)
            ,   fixedTop = null //If not null, this fixes the top position of the tooltip.
            ,   classes = null  //Attaches additional CSS classes to the tooltip DIV that is created.
            ,   chartContainer = null   //Parent dom element of the SVG that holds the chart.
            ,   hidden = true  // start off hidden, toggle with hide/show functions below
            ,   hideDelay = 400  // delay before the tooltip hides after calling hide()
            ,   tooltip = null // d3 select of tooltipElem below
            ,   tooltipElem = null  //actual DOM element representing the tooltip.
            ,   position = {left: null, top: null}   //Relative position of the tooltip inside chartContainer.
            ,   offset = {left: 0, top: 0}   //Offset of tooltip against the pointer
            ,   enabled = true  //True -> tooltips are rendered. False -> don't render tooltips.
            ,   duration = 100 // duration for tooltip movement
            ,   headerEnabled = true
        ;

        // set to true by interactive layer to adjust tooltip positions
        // eventually we should probably fix interactive layer to get the position better.
        // for now this is needed if you want to set chartContainer for normal tooltips, else it "fixes" it to broken
        var isInteractiveLayer = false;

        //Generates a unique id when you create a new tooltip() object
        var id = "nvtooltip-" + Math.floor(Math.random() * 100000);

        //CSS class to specify whether element should not have mouse events.
        var  nvPointerEventsClass = "nv-pointer-events-none";

        //Format function for the tooltip values column
        var valueFormatter = function(d,i) {
            return d;
        };

        //Format function for the tooltip header value.
        var headerFormatter = function(d) {
            return d;
        };

        var keyFormatter = function(d, i) {
            return d;
        };

        //By default, the tooltip model renders a beautiful table inside a DIV.
        //You can override this function if a custom tooltip is desired.
        var contentGenerator = function(d) {
            if (d === null) {
                return '';
            }

            var table = d3.select(document.createElement("table"));
            if (headerEnabled) {
                var theadEnter = table.selectAll("thead")
                    .data([d])
                    .enter().append("thead");

                theadEnter.append("tr")
                    .append("td")
                    .attr("colspan", 3)
                    .append("strong")
                    .classed("x-value", true)
                    .html(headerFormatter(d.value));
            }

            var tbodyEnter = table.selectAll("tbody")
                .data([d])
                .enter().append("tbody");

            var trowEnter = tbodyEnter.selectAll("tr")
                    .data(function(p) { return p.series})
                    .enter()
                    .append("tr")
                    .classed("highlight", function(p) { return p.highlight});

            trowEnter.append("td")
                .classed("legend-color-guide",true)
                .append("div")
                .style("background-color", function(p) { return p.color});

            trowEnter.append("td")
                .classed("key",true)
                .html(function(p, i) {return keyFormatter(p.key, i)});

            trowEnter.append("td")
                .classed("value",true)
                .html(function(p, i) { return valueFormatter(p.value, i) });


            trowEnter.selectAll("td").each(function(p) {
                if (p.highlight) {
                    var opacityScale = d3.scale.linear().domain([0,1]).range(["#fff",p.color]);
                    var opacity = 0.6;
                    d3.select(this)
                        .style("border-bottom-color", opacityScale(opacity))
                        .style("border-top-color", opacityScale(opacity))
                    ;
                }
            });

            var html = table.node().outerHTML;
            if (d.footer !== undefined)
                html += "<div class='footer'>" + d.footer + "</div>";
            return html;

        };

        var dataSeriesExists = function(d) {
            if (d && d.series) {
                if (d.series instanceof Array) {
                    return !!d.series.length;
                }
                // if object, it's okay just convert to array of the object
                if (d.series instanceof Object) {
                    d.series = [d.series];
                    return true;
                }
            }
            return false;
        };

        var calcTooltipPosition = function(pos) {
            if (!tooltipElem) return;

            nv.dom.read(function() {
                var height = parseInt(tooltipElem.offsetHeight, 10),
                    width = parseInt(tooltipElem.offsetWidth, 10),
                    windowWidth = nv.utils.windowSize().width,
                    windowHeight = nv.utils.windowSize().height,
                    scrollTop = window.pageYOffset,
                    scrollLeft = window.pageXOffset,
                    left, top;

                windowHeight = window.innerWidth >= document.body.scrollWidth ? windowHeight : windowHeight - 16;
                windowWidth = window.innerHeight >= document.body.scrollHeight ? windowWidth : windowWidth - 16;


                //Helper functions to find the total offsets of a given DOM element.
                //Looks up the entire ancestry of an element, up to the first relatively positioned element.
                var tooltipTop = function ( Elem ) {
                    var offsetTop = top;
                    do {
                        if( !isNaN( Elem.offsetTop ) ) {
                            offsetTop += (Elem.offsetTop);
                        }
                        Elem = Elem.offsetParent;
                    } while( Elem );
                    return offsetTop;
                };
                var tooltipLeft = function ( Elem ) {
                    var offsetLeft = left;
                    do {
                        if( !isNaN( Elem.offsetLeft ) ) {
                            offsetLeft += (Elem.offsetLeft);
                        }
                        Elem = Elem.offsetParent;
                    } while( Elem );
                    return offsetLeft;
                };

                // calculate position based on gravity
                var tLeft, tTop;
                switch (gravity) {
                    case 'e':
                        left = pos[0] - width - distance;
                        top = pos[1] - (height / 2);
                        tLeft = tooltipLeft(tooltipElem);
                        tTop = tooltipTop(tooltipElem);
                        if (tLeft < scrollLeft) left = pos[0] + distance > scrollLeft ? pos[0] + distance : scrollLeft - tLeft + left;
                        if (tTop < scrollTop) top = scrollTop - tTop + top;
                        if (tTop + height > scrollTop + windowHeight) top = scrollTop + windowHeight - tTop + top - height;
                        break;
                    case 'w':
                        left = pos[0] + distance;
                        top = pos[1] - (height / 2);
                        tLeft = tooltipLeft(tooltipElem);
                        tTop = tooltipTop(tooltipElem);
                        if (tLeft + width > windowWidth) left = pos[0] - width - distance;
                        if (tTop < scrollTop) top = scrollTop + 5;
                        if (tTop + height > scrollTop + windowHeight) top = scrollTop + windowHeight - tTop + top - height;
                        break;
                    case 'n':
                        left = pos[0] - (width / 2) - 5;
                        top = pos[1] + distance;
                        tLeft = tooltipLeft(tooltipElem);
                        tTop = tooltipTop(tooltipElem);
                        if (tLeft < scrollLeft) left = scrollLeft + 5;
                        if (tLeft + width > windowWidth) left = left - width/2 + 5;
                        if (tTop + height > scrollTop + windowHeight) top = scrollTop + windowHeight - tTop + top - height;
                        break;
                    case 's':
                        left = pos[0] - (width / 2);
                        top = pos[1] - height - distance;
                        tLeft = tooltipLeft(tooltipElem);
                        tTop = tooltipTop(tooltipElem);
                        if (tLeft < scrollLeft) left = scrollLeft + 5;
                        if (tLeft + width > windowWidth) left = left - width/2 + 5;
                        if (scrollTop > tTop) top = scrollTop;
                        break;
                    case 'none':
                        left = pos[0];
                        top = pos[1] - distance;
                        tLeft = tooltipLeft(tooltipElem);
                        tTop = tooltipTop(tooltipElem);
                        break;
                }
                
                // adjust tooltip offsets
                left -= offset.left;
                top -= offset.top;

                // using tooltip.style('transform') returns values un-usable for tween
                var box = tooltipElem.getBoundingClientRect();
                var scrollTop  = window.pageYOffset || document.documentElement.scrollTop;
                var scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
                var old_translate = 'translate(' + (box.left + scrollLeft) + 'px, ' + (box.top + scrollTop) + 'px)';
                var new_translate = 'translate(' + left + 'px, ' + top + 'px)';
                var translateInterpolator = d3.interpolateString(old_translate, new_translate);

                var is_hidden = tooltip.style('opacity') < 0.1;

                // delay hiding a bit to avoid flickering
                if (hidden) {
                    tooltip
                        .transition()
                        .delay(hideDelay)
                        .duration(0)
                        .style('opacity', 0);
                } else {
                    tooltip
                        .interrupt() // cancel running transitions
                        .transition()
                        .duration(is_hidden ? 0 : duration)
                        // using tween since some versions of d3 can't auto-tween a translate on a div
                        .styleTween('transform', function (d) {
                            return translateInterpolator;
                        }, 'important')
                        // Safari has its own `-webkit-transform` and does not support `transform` 
                        // transform tooltip without transition only in Safari
                        .style('-webkit-transform', new_translate)
                        .style('-ms-transform', new_translate)
                        .style('opacity', 1);
                }



            });
        };

        //In situations where the chart is in a 'viewBox', re-position the tooltip based on how far chart is zoomed.
        function convertViewBoxRatio() {
            if (chartContainer) {
                var svg = d3.select(chartContainer);
                if (svg.node().tagName !== "svg") {
                    svg = svg.select("svg");
                }
                var viewBox = (svg.node()) ? svg.attr('viewBox') : null;
                if (viewBox) {
                    viewBox = viewBox.split(' ');
                    var ratio = parseInt(svg.style('width'), 10) / viewBox[2];

                    position.left = position.left * ratio;
                    position.top  = position.top * ratio;
                }
            }
        }

        //Creates new tooltip container, or uses existing one on DOM.
        function initTooltip() {
            if (!tooltip) {
                var body;
                if (chartContainer) {
                    body = chartContainer;
                } else {
                    body = document.body;
                }
                //Create new tooltip div if it doesn't exist on DOM.
                tooltip = d3.select(body).append("div")
                    .attr("class", "nvtooltip " + (classes ? classes : "xy-tooltip"))
                    .attr("id", id);
                tooltip.style("top", 0).style("left", 0);
                tooltip.style('opacity', 0);
                tooltip.selectAll("div, table, td, tr").classed(nvPointerEventsClass, true);
                tooltip.classed(nvPointerEventsClass, true);
                tooltipElem = tooltip.node();
            }
        }

        //Draw the tooltip onto the DOM.
        function nvtooltip() {
            if (!enabled) return;
            if (!dataSeriesExists(data)) return;

            convertViewBoxRatio();

            var left = position.left;
            var top = (fixedTop !== null) ? fixedTop : position.top;

            nv.dom.write(function () {
                initTooltip();
                // generate data and set it into tooltip
                // Bonus - If you override contentGenerator and return falsey you can use something like
                //         React or Knockout to bind the data for your tooltip
                var newContent = contentGenerator(data);
                if (newContent) {
                    tooltipElem.innerHTML = newContent;
                }

                if (chartContainer && isInteractiveLayer) {
                    nv.dom.read(function() {
                        var svgComp = chartContainer.getElementsByTagName("svg")[0];
                        var svgOffset = {left:0,top:0};
                        if (svgComp) {
                            var svgBound = svgComp.getBoundingClientRect();
                            var chartBound = chartContainer.getBoundingClientRect();
                            var svgBoundTop = svgBound.top;

                            //Defensive code. Sometimes, svgBoundTop can be a really negative
                            //  number, like -134254. That's a bug.
                            //  If such a number is found, use zero instead. FireFox bug only
                            if (svgBoundTop < 0) {
                                var containerBound = chartContainer.getBoundingClientRect();
                                svgBoundTop = (Math.abs(svgBoundTop) > containerBound.height) ? 0 : svgBoundTop;
                            }
                            svgOffset.top = Math.abs(svgBoundTop - chartBound.top);
                            svgOffset.left = Math.abs(svgBound.left - chartBound.left);
                        }
                        //If the parent container is an overflow <div> with scrollbars, subtract the scroll offsets.
                        //You need to also add any offset between the <svg> element and its containing <div>
                        //Finally, add any offset of the containing <div> on the whole page.
                        left += chartContainer.offsetLeft + svgOffset.left - 2*chartContainer.scrollLeft;
                        top += chartContainer.offsetTop + svgOffset.top - 2*chartContainer.scrollTop;

                        if (snapDistance && snapDistance > 0) {
                            top = Math.floor(top/snapDistance) * snapDistance;
                        }
                        calcTooltipPosition([left,top]);
                    });
                } else {
                    calcTooltipPosition([left,top]);
                }
            });

            return nvtooltip;
        }

        nvtooltip.nvPointerEventsClass = nvPointerEventsClass;
        nvtooltip.options = nv.utils.optionsFunc.bind(nvtooltip);

        nvtooltip._options = Object.create({}, {
            // simple read/write options
            duration: {get: function(){return duration;}, set: function(_){duration=_;}},
            gravity: {get: function(){return gravity;}, set: function(_){gravity=_;}},
            distance: {get: function(){return distance;}, set: function(_){distance=_;}},
            snapDistance: {get: function(){return snapDistance;}, set: function(_){snapDistance=_;}},
            classes: {get: function(){return classes;}, set: function(_){classes=_;}},
            chartContainer: {get: function(){return chartContainer;}, set: function(_){chartContainer=_;}},
            fixedTop: {get: function(){return fixedTop;}, set: function(_){fixedTop=_;}},
            enabled: {get: function(){return enabled;}, set: function(_){enabled=_;}},
            hideDelay: {get: function(){return hideDelay;}, set: function(_){hideDelay=_;}},
            contentGenerator: {get: function(){return contentGenerator;}, set: function(_){contentGenerator=_;}},
            valueFormatter: {get: function(){return valueFormatter;}, set: function(_){valueFormatter=_;}},
            headerFormatter: {get: function(){return headerFormatter;}, set: function(_){headerFormatter=_;}},
            keyFormatter: {get: function(){return keyFormatter;}, set: function(_){keyFormatter=_;}},
            headerEnabled:   {get: function(){return headerEnabled;}, set: function(_){headerEnabled=_;}},

            // internal use only, set by interactive layer to adjust position.
            _isInteractiveLayer: {get: function(){return isInteractiveLayer;}, set: function(_){isInteractiveLayer=!!_;}},

            // options with extra logic
            position: {get: function(){return position;}, set: function(_){
                position.left = _.left !== undefined ? _.left : position.left;
                position.top  = _.top  !== undefined ? _.top  : position.top;
            }},
            offset: {get: function(){return offset;}, set: function(_){
                offset.left = _.left !== undefined ? _.left : offset.left;
                offset.top  = _.top  !== undefined ? _.top  : offset.top;
            }},
            hidden: {get: function(){return hidden;}, set: function(_){
                if (hidden != _) {
                    hidden = !!_;
                    nvtooltip();
                }
            }},
            data: {get: function(){return data;}, set: function(_){
                // if showing a single data point, adjust data format with that
                if (_.point) {
                    _.value = _.point.x;
                    _.series = _.series || {};
                    _.series.value = _.point.y;
                    _.series.color = _.point.color || _.series.color;
                }
                data = _;
            }},

            // read only properties
            tooltipElem: {get: function(){return tooltipElem;}, set: function(_){}},
            id: {get: function(){return id;}, set: function(_){}}
        });

        nv.utils.initOptions(nvtooltip);
        return nvtooltip;
    };

})();
