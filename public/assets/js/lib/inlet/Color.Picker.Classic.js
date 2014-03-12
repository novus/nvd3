/* 
	----------------------------------------------------
	Color Picker : 1.0 : 2012/04/06 : http://mudcu.be
	----------------------------------------------------
	http://colrd.com/misc/labs/Color-Picker/Classic/index.html
	----------------------------------------------------
	Firefox 2+, Safari 3+, Opera 9+, Google Chrome, IE9+
	----------------------------------------------------
	picker = new Color.Picker({
		color: "#643263", // accepts rgba(), or #hex
		callback: function(rgba, state, type) {
			document.body.style.background = Color.Space(rgba, "RGBA>W3");
		}
	});
	picker.element.style.top = 220 + "px";
	picker.element.style.left = 270 + "px";
	picker.toggle(true);
	----------------------------------------------------
	Color.Space.js – STRING, HEX, RGB, HSV, RGBA, HSVA, W3
*/

if (typeof(Color) === "undefined") var Color = {};

(function() {

Color.Picker = function (props) {
	var that = this;
	/// loading properties
	if (typeof(props) === "undefined") props = {};
	this.callback = props.callback; // bind custom function
	///	
	if (props.color[0] === "#") { // HEX color sourced
		this.color = Color.Space(props.color.substr(1), "STRING>HEX>RGB>HSV");
		this.color.A = 255;
	} else if (props.color.substr(0, 4) === "rgba") { // RGBA color sourced
		this.color = Color.Space(props.color, "W3>RGBA>HSVA");
	}
	///
	this.eyedropLayer = props.eyedropLayer;
	this.eyedropMouseLayer = props.eyedropMouseLayer || props.eyedropLayer;
	this.container = props.container || document.body;
	this.size = props.size || 200; // size of colorpicker
	this.margin = props.margin || 10; // margins on colorpicker
	this.offset = this.margin / 2;
	this.hueWidth = props.hueWidth || 38;
	this.doAlpha = false;

	/// Creating our color picker.
	var plugin = document.createElement("div");
	plugin.id = "ColorPicker";
	var pickerWidth = this.size + this.hueWidth * (this.doAlpha ? 2 : 1) + this.margin - 6;
	var pickerHeight = this.size + this.margin * 2;
	plugin.style.height = pickerHeight + "px";
	plugin.style.width = pickerWidth + "px";
	plugin.style.display = props.display ? "block" : "none";
	/// appending to element
	this.container.appendChild(plugin);
	this.element = plugin;

	/// Current selected color as the background of this box.
	var hexBoxContainer = document.createElement("div");
	hexBoxContainer.style.backgroundImage = "url("+interlace.data+")";
	hexBoxContainer.className = "hexBox";
	hexBoxContainer.title = "Eyedropper";
	if (that.eyedropMouseLayer) {
		Event.add(hexBoxContainer, "mousedown", Event.cancel);
		Event.add(hexBoxContainer, "click", function() {
			document.body.style.cursor = "crosshair";
			var close = function(event) {
				document.body.style.cursor = "pointer";	
				///
				var coord = Event.coords(event);	
				var ctx = that.eyedropLayer.getContext("2d");
				var data = ctx.getImageData(coord.x, coord.y, 1, 1);
				var color = Color.Space(data.data, "RGBA>HSVA");
				that.update(color, "HSVA");
				///
				Event.remove(that.eyedropMouseLayer, "mousedown", close);
			};
			Event.add(that.eyedropMouseLayer, "mousedown", close);
		});
	}
	var hexBox = document.createElement("div");
	hexBoxContainer.appendChild(hexBox);
	plugin.appendChild(hexBoxContainer);

	/// Creating the HEX input element.
	var isHex = /[^a-f0-9]/gi;
	var hexInput = document.createElement("input");
	hexInput.title = "HEX Code";
	hexInput.className = "hexInput";
	hexInput.size = 6;
	hexInput.type = "text";
	//
	Event.add(hexInput, "mousedown", Event.stopPropagation);
	Event.add(hexInput, "keydown change", function(event) {
		var code = event.keyCode;
		var value = hexInput.value.replace(isHex, '').substr(0, 6);
		var hex = parseInt("0x" + value);
		if (event.type == "keydown") {
			if (code == 40) { // less
				hex = Math.max(0, hex - (event.shiftKey ? 10 : 1));
				hexInput.value = Color.Space(hex, "HEX>STRING");
			} else if (code == 38) { // more
				hex = Math.min(0xFFFFFF, hex + (event.shiftKey ? 10 : 1));
				hexInput.value = Color.Space(hex, "HEX>STRING");
			} else {
				return;
			}
		}
		if (String(hex) === "NaN") return;
		if (hex > 0xFFFFFF) hex = 0xFFFFFF;
		if (hex < 0) hex = 0;
		var update = (event.type == "change") ? "" : "hex";
		that.update(Color.Space(hex, "HEX>RGB"), "RGB");
		if (event.keyCode == 27) this.blur();
	});
	//
	plugin.appendChild(hexInput);

	/// Creating the close button.
	var hexClose = document.createElement("div");
	hexClose.title = "Close";
	hexClose.className = "hexClose";
	hexClose.innerHTML = "x";
	Event.add(hexClose, "mousedown", Event.cancel);
	Event.add(hexClose, "click", function(event) {
		that.toggle(false);
	});
	plugin.appendChild(hexClose);
	plugin.appendChild(document.createElement("br"));

	/// Creating colorpicker sliders.
	var canvas = document.createElement("canvas");
	var ctx = canvas.getContext("2d");
	canvas.style.cssText = "position: absolute; top: 32px; left: " + this.offset + "px;";
	canvas.width = this.size + this.hueWidth * 2 + this.margin + 2;
	canvas.height = this.size + this.margin;
	plugin.appendChild(canvas);
	var mouse = function (event) {
		var down = (event.type === "mousedown" || event.type === "touchstart");
		if (down) {
			Event.stop(event);
			hexInput.blur();
		}
		///
		var offset = that.margin / 2;
		var abs = { x: 0, y: 0 };
		if (window !== canvas) {
			var tmp = canvas;
			while(tmp !== null) { 
				abs.x += tmp.offsetLeft; 
				abs.y += tmp.offsetTop; 
				tmp = tmp.offsetParent; 
			};
		}
		var x0 = (event.pageX - abs.x) - offset;
		var y0 = (event.pageY - abs.y) - offset;
		var x = clamp(x0, 0, canvas.width);
		var y = clamp(y0, 0, that.size);
		if (event.target.className === "hexInput") {
			plugin.style.cursor = "text";
			return; // allow selection of HEX		
		} else if (x !== x0 || y !== y0) { // move colorpicker
			plugin.style.cursor = "move";
			plugin.title = "Move";
			if (down) dragElement({
				type: "move",
				event: event,
				element: plugin,
				callback: function (event, self) {
					plugin.style.left = self.x + "px";
					plugin.style.top = self.y + "px";
					Event.prevent(event);
				}
			});
		} else if (x <= that.size) { // saturation-value selection
			plugin.style.cursor = "crosshair";
			plugin.title = "Saturation + Value";
			if (down) dragElement({
				type: "difference",
				event: event,
				element: canvas,
				callback: function (event, self) {
					var x = clamp(self.x - that.offset, 0, that.size);
					var y = clamp(self.y - that.offset, 0, that.size);
					that.color.S = x / that.size * 100; // scale saturation
					that.color.V = 100 - (y / that.size * 100); // scale value
					that.drawSample(self.state, true);
					Event.prevent(event);
				}
			});
		} else if (x > that.size + that.margin && x <= that.size + that.hueWidth) { // hue selection
			plugin.style.cursor = "crosshair";
			plugin.title = "Hue";
			if (down) dragElement({
				type: "difference",
				event: event,
				element: canvas,
				callback: function (event, self) {
					var y = clamp(self.y - that.offset, 0, that.size);
					that.color.H = 360 - (Math.min(1, y / that.size) * 360);
					that.drawSample(self.state, true);
					Event.prevent(event);
				}
			});
		} else if (x > that.size + that.hueWidth + that.margin && x <= that.size + that.hueWidth * 2) { // alpha selection
			plugin.style.cursor = "crosshair";
			plugin.title = "Alpha";
			if (down) dragElement({
				type: "difference",
				event: event,
				element: canvas,
				callback: function (event, self) {
					var y = clamp(self.y - that.offset, 0, that.size);
					that.color.A = (1 - Math.min(1, y / that.size)) * 255;
					that.drawSample(self.state, true);
					Event.prevent(event);
				}
			});
		} else { // margin between hue/saturation-value
			plugin.style.cursor = "default";
		}
		return false; // prevent selection
	};
	Event.add(plugin, "mousemove", mouse);
	Event.add(plugin, "mousedown", mouse);

	/// helper functions

	this.update = function(color) { // accepts HEX, RGB, and HSV
		if (typeof(color) === "string") {
			that.color = Color.Space(color, "STRING>HEX>RGB>HSV");
		} else if (typeof(color.R) !== "undefined") {
			that.color = Color.Space(color, "RGB>HSV");
		} else if (typeof(color.H) !== "undefined") {
			that.color = color;
		}
		///
		if (typeof(color.A) === "undefined") {
			that.color.A = 255;
		}
		that.drawSample("update", true);
	};
	
	this.drawSample = function (state, update) {
		// clearing canvas
		ctx.clearRect(0, 0, canvas.width, canvas.height)
		that.drawSquare();
		that.drawHue();
		if (this.doAlpha) that.drawAlpha();
		// retrieving hex-code
		var rgba = Color.Space(that.color, "HSVA>RGBA");
		var hex = Color.Space(rgba, "RGB>HEX>STRING");
		// display hex string
		hexInput.value = hex.toUpperCase();
		// display background color
		hexBox.style.backgroundColor = Color.Space(rgba, "RGBA>W3");
		// arrow-selection
		var y = ((360 - that.color.H) / 362) * that.size - 2;
		ctx.drawImage(arrow, that.size + that.hueWidth + that.offset + 2, Math.round(y) + that.offset - 1);
		if (this.doAlpha) { // arrow-selection
			var y = ((255 - that.color.A) / 255) * that.size - 2;
			ctx.drawImage(arrow, that.size + that.hueWidth * 2 + that.offset + 2, Math.round(y) + that.offset - 1);
		}
		// circle-selection
		var x = that.color.S / 100 * that.size;
		var y = (1 - (that.color.V / 100)) * that.size;
		x = x - circle.width / 2;
		y = y - circle.height / 2;
		ctx.drawImage(circle, Math.round(x) + that.offset, Math.round(y) + that.offset);
		// run custom code
		if (that.callback && state && update) {
			that.callback(rgba, state);
		}
	};

	this.drawSquare = function () {
		// retrieving hex-code
		var hex = Color.Space({
			H: that.color.H,
			S: 100,
			V: 100
		}, "HSV>RGB>HEX>STRING");
		var rgb = Color.Space.HEX_RGB("0x"+hex);
		var offset = that.offset;
		var size = that.size;
		// drawing color
		ctx.fillStyle = "#" + hex;
		ctx.fillRect(offset, offset, size, size);
		// overlaying saturation
		var gradient = ctx.createLinearGradient(offset, offset, size + offset, 0);
		gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
		gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
		ctx.fillStyle = gradient;
		ctx.fillRect(offset, offset, size, size);
		// overlaying value
		var gradient = ctx.createLinearGradient(0, offset, 0, size + offset);
		gradient.addColorStop(0.0, "rgba(0, 0, 0, 0)");
		gradient.addColorStop(1.0, "rgba(0, 0, 0, 1)");
		ctx.fillStyle = gradient;
		ctx.fillRect(offset, offset, size, size);
		// drawing outer bounds
		ctx.strokeStyle = "rgba(255,255,255,0.15)";
		ctx.strokeRect(offset+0.5, offset+0.5, size-1, size-1);
	};

	this.drawHue = function () {
		// drawing hue selector
		var left = that.size + that.margin + that.offset;
		var gradient = ctx.createLinearGradient(0, 0, 0, that.size + that.offset);
		gradient.addColorStop(0, "rgba(255, 0, 0, 1)");
		gradient.addColorStop(5/6, "rgba(255, 255, 0, 1)");
		gradient.addColorStop(4/6, "rgba(0, 255, 0, 1)");
		gradient.addColorStop(3/6, "rgba(0, 255, 255, 1)");
		gradient.addColorStop(2/6, "rgba(0, 0, 255, 1)");
		gradient.addColorStop(1/6, "rgba(255, 0, 255, 1)");
		gradient.addColorStop(1, "rgba(255, 0, 0, 1)");
		ctx.fillStyle = gradient;
		ctx.fillRect(left, that.offset, that.hueWidth - 10, that.size);
		// drawing outer bounds
		ctx.strokeStyle = "rgba(255,255,255,0.2)";
		ctx.strokeRect(left + 0.5, that.offset + 0.5, that.hueWidth - 11, that.size - 1);
	};
	
	this.drawAlpha = function () {
		// drawing hue selector
		var left = that.size + that.margin + that.offset + that.hueWidth;
		ctx.fillStyle = interlace
		ctx.fillRect(left, that.offset, that.hueWidth - 10, that.size);
		///
		var rgb = Color.Space.HSV_RGB({ H: that.color.H, S: that.color.S, V: that.color.V });
		var gradient = ctx.createLinearGradient(0, 0, 0, that.size);
		rgb.A = 255;
		gradient.addColorStop(0, Color.Space.RGBA_W3(rgb));
		rgb.A = 0;
		gradient.addColorStop(1, Color.Space.RGBA_W3(rgb));
		ctx.fillStyle = gradient;
		ctx.fillRect(left, that.offset, that.hueWidth - 10, that.size);
		// drawing outer bounds
		ctx.strokeStyle = "rgba(255,255,255,0.2)";
		ctx.strokeRect(left + 0.5, that.offset + 0.5, that.hueWidth - 11, that.size - 1);
	};
	
	this.toggle = function (display) {
		if (typeof(display) !== "boolean") {
			if (plugin.style.display === "block") {
				display = false;
			} else { // display === "none"
				display = true;
			}
		}
		///
		if (display) {
			plugin.style.opacity = 1;
			plugin.style.display = "block";
		} else {
			plugin.style.opacity = 0;
			plugin.style.display = "none";
		}
		///
		if (display && props.autoclose) {
			var mousedown = function() {
				Event.remove(window, "mousedown", mousedown);
				that.toggle(false);
			};
			Event.add(window, "mousedown", mousedown);
		}
	};

	this.destory = function () {
		document.body.removeChild(plugin);
		for (var key in that) delete that[key];
	};

	// drawing color selection
	this.drawSample("create");
	//
	return this;
};

/// Creating the arrows.
var arrow = (function () { // creating arrow
	var canvas = document.createElement("canvas");
	var ctx = canvas.getContext("2d");
	var size = 16;
	var width = size / 3;
	canvas.width = size;
	canvas.height = size;
	var top = -size / 4;
	var left = 0;
	for (var n = 0; n < 20; n++) { // multiply anti-aliasing
		ctx.beginPath();
		ctx.fillStyle = "#fff";
		ctx.moveTo(left, size / 2 + top);
		ctx.lineTo(left + size / 4, size / 4 + top);
		ctx.lineTo(left + size / 4, size / 4 * 3 + top);
		ctx.fill();
	}
	ctx.translate(-width, -size);
	return canvas;
})();

/// Creating the circle indicator.
var circle = (function () { // creating circle-selection
	var canvas = document.createElement("canvas");
	canvas.width = 10;
	canvas.height = 10;
	var ctx = canvas.getContext("2d");
	ctx.lineWidth = 1;
	ctx.beginPath();
	var x = canvas.width / 2;
	var y = canvas.width / 2;
	ctx.arc(x, y, 4.5, 0, Math.PI * 2, true);
	ctx.strokeStyle = '#000';
	ctx.stroke();
	ctx.beginPath();
	ctx.arc(x, y, 3.5, 0, Math.PI * 2, true);
	ctx.strokeStyle = '#FFF';
	ctx.stroke();
	return canvas;
})();

/// Creating the interlacing background.
var interlace = (function (size, color1, color2) {
	var proto = document.createElement("canvas").getContext("2d");
	proto.canvas.width = size * 2;
	proto.canvas.height = size * 2;
	proto.fillStyle = color1; // top-left
	proto.fillRect(0, 0, size, size);
	proto.fillStyle = color2; // top-right
	proto.fillRect(size, 0, size, size);
	proto.fillStyle = color2; // bottom-left
	proto.fillRect(0, size, size, size);
	proto.fillStyle = color1; // bottom-right
	proto.fillRect(size, size, size, size);
	var pattern = proto.createPattern(proto.canvas, "repeat");
	pattern.data = proto.canvas.toDataURL();
	return pattern;
})(8, "#FFF", "#eee");

/// 
var clamp = function(n, min, max) {
	return (n < min) ? min : ((n > max) ? max : n);
};

//
var dragElement = function(props) {
	function mouseMove(e, state) {
		if (typeof(state) == "undefined") state = "move";
		var coord = XY(e);
		switch (props.type) {
			case "move": 
				props.callback(event, {
					x: coord.x + oX - eX,
					y: coord.y + oY - eY,
					state: state
				});
				break;
			case "difference": 
				props.callback(event, {
					x: coord.x - oX,
					y: coord.y - oY,
					state: state
				});
				break;
			default: // "absolute"
				props.callback(event, {
					x: coord.x,
					y: coord.y,
					state: state
				});
				break;
		}
	};
	function mouseUp(e) {
		window.removeEventListener("mousemove", mouseMove, false);
		window.removeEventListener("mouseup", mouseUp, false);
		mouseMove(e, "up");
	};
	// current element position
	var el = props.element;
	var origin = { x: 0, y: 0 };
	if (window !== el) {
		var tmp = el;
		while(tmp !== null) { 
			origin.x += tmp.offsetLeft; 
			origin.y += tmp.offsetTop; 
			tmp = tmp.offsetParent; 
		};
	}
	var oX = origin.x;
	var oY = origin.y;
	// current mouse position
	var e = props.event;
	var coord = XY(e);
	var eX = coord.x;
	var eY = coord.y;
	// events
	window.addEventListener("mousemove", mouseMove, false);
	window.addEventListener("mouseup", mouseUp, false);
	mouseMove(e, "down"); // run mouse-down
};

var Event = {
	add: function(target, type, listener) {
		if (type.indexOf(" ") !== -1) {
			type = type.split(" ");
			for (var n = 0; n < type.length; n ++) {
				Event.add(target, type[n], listener);
			}
		} else {
			if (target.addEventListener) {  
			  target.addEventListener(type, listener, false);   
			} else if (target.attachEvent)  {  
			  target.attachEvent(type, listener);  
			} 
		}
	},
	remove: function(target, type, listener) {
		if (target.removeEventListener) {  
		  target.removeEventListener(type, listener, false);   
		} else if (target.detachEvent) {  
		  target.detachEvent(type, listener);  
		} 
	},
	stop: function(event) {
		if (event.stopPropagation) {
			event.stopPropagation();
		} else { // <= IE8
			event.cancelBubble = true;
		}
	},
	prevent: function(event) {
		if (event.preventDefault) {
			event.preventDefault();
		} else { // <= IE8
			event.returnValue = false;
		}
	}
};

var XY = window.ActiveXObject ? // fix XY to work in various browsers
	function(event) {
		return {
			x: event.clientX + document.documentElement.scrollLeft,
			y: event.clientY + document.documentElement.scrollTop
		};
	} : function(event) {
		return {
			x: event.pageX,
			y: event.pageY
		};
	};

})();