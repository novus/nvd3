var Inlet = (function() {
    function inlet(ed) {
        var editor = ed;
        var slider;
        var picker;
        
        var wrapper = editor.getWrapperElement();
        $(wrapper).on("mousedown", onClick);

        //make the slider
        var slider_node = document.createElement("div");
        slider_node.className = "inlet_slider";
        wrapper.parentNode.appendChild(slider_node);
        slider = $(slider_node);
        slider.slider({
            slide: function(event, ui) { 
                //set the cursor to desired location
                var cursor = editor.getCursor();
                var token = editor.getTokenAt(cursor);
                //console.log("SLIDING", ui.value+"", token.start, token.end)
                var start = {"line":cursor.line, "ch":token.start};
                var end = {"line":cursor.line, "ch":token.end};
                editor.replaceRange(String(ui.value), start, end);
            }
        });

        //make the colorpicker
        picker = new Color.Picker({
            color: "#643263",// accepts rgba(), or #hex
            display: false,
            size: 150,
            callback: function(rgba, state, type) {
                var newcolor = Color.Space(rgba, "RGB>STRING");
                //set the cursor to desired location
                var cursor = editor.getCursor();
                var token = editor.getTokenAt(cursor);
                //console.log("SLIDING", ui.value+"", token.start, token.end)
                var start = {"line":cursor.line, "ch":token.start};
                var end = {"line":cursor.line, "ch":token.end};
                editor.replaceRange('"#' + newcolor.toUpperCase() + '"', start, end);
            }
        });

        //Handle clicks
        //inlet.onClick = function(ev) {
        function onClick(ev) {
            //This is where we figure out if we want to show the slider or not

            //TODO: add check for modifier key (for now we just turn on click functionality
            //no matter what
            var cursor = editor.getCursor(true);
            var token = editor.getTokenAt(cursor);
            cursorOffset = editor.cursorCoords(true, "page");
            if(token.className === "number") {
                //parse the number out
                var value = parseFloat(token.string);
                var sliderRange;
                //console.log("token", token, value);

                // this comes from water project:
                // set the slider params based on the token's numeric value
                if (value === 0) { 
                    sliderRange = [-100, 100];
                } else {
                    sliderRange = [-value * 3, value * 5];
                }

                var slider_min = _.min(sliderRange);
                var slider_max = _.max(sliderRange);
                slider.slider('option', 'min', slider_min);
                slider.slider('option', 'max', slider_max);

                // slider range needs to be evenly divisible by the step
                if ((slider_max - slider_min) > 20) {
                    slider.slider('option', 'step', 1);
                } else {
                    slider.slider('option', 'step', (slider_max - slider_min)/200);
                }
                slider.slider('option', 'value', value);

                //setup slider position
                // position slider centered above the cursor
                //TODO: take in y_offset as a parameter
                var y_offset = 15;
                var sliderTop = cursorOffset.y - y_offset;
                var sliderLeft = cursorOffset.x - slider.width()/2;

                slider.offset({top: sliderTop - 10, left: sliderLeft});

                slider.css('visibility', 'visible');
                picker.element.style.display = "none";

            //else if #use regex to check for color
            } else {
                var match = token.string.match(/["']#?(([a-fA-F0-9]){3}){1,2}["']/);
                if(match) {
                    //turn on color picker
                    //console.log(token.string, match)
                    var color = match[0];
                    color = color.slice(2, color.length-1);
                    picker.update(color);

                    //TODO: make positioning of color picker configurable
                    var top = cursorOffset.y - 210 + "px";
                    var left = cursorOffset.x - 75 + "px";
                    $("#ColorPicker").css('position', "absolute");
                    $("#ColorPicker").css('top', top);
                    $("#ColorPicker").css('left', left);
                    //$('#ColorPicker').offset({top: 10, left: 100})
                    //@picker.element.style.top = cursorOffset.top + "px"
                    //@picker.element.style.left = cursorOffset.left + "px"
                    //@picker.element.style.display = ""
                    picker.toggle(true);
                } else {
                    //@picker.element.style.display = "none"
                    picker.toggle(false);
                }
                slider.css('visibility', 'hidden');
            }
        }
    }
    return inlet;
})();
