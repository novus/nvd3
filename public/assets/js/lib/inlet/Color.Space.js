/* 
	----------------------------------------------------
	Color Space : 1.3 : 2012.01.30 : http://mudcu.be
	----------------------------------------------------
*/

if (typeof(Color) === "undefined") Color = {};
if (typeof(Color.Space) === "undefined") Color.Space = {};

(function () {

var DEG_RAD = Math.PI / 180;
var RAD_DEG = 1 / DEG_RAD;

var functions = {};
var shortcuts = {
	"RGB>STRING": "RGB>HEX>STRING",
	"STRING>RGB": "STRING>HEX>RGB"
};

var root = Color.Space = function(color, route) {
	if (shortcuts[route]) { // shortcut available
		route = shortcuts[route];
	}
	var r = route.split(">");
	// check whether color is an [], if so, convert to {}
	if (typeof(color) === "object" && color[0] >= 0) { // array
		var type = route.split(">")[0];
		var tmp = {};
		for(var i = 0; i < type.length; i ++) {
			var str = type.substr(i, 1);
			tmp[str] = color[i];
		}
		color = tmp;
	}
	if (functions[route]) { // cached function available
		return functions[route](color);
	}
	var f = "color";
	for (var pos = 1, key = r[0]; pos < r.length; pos ++) {
		if (pos > 1) { // recycle previous
			key = key.substr(key.indexOf("_") + 1);
		}
		key += (pos === 0 ? "" : "_") + r[pos];
		color = root[key](color);
		f = "Color.Space."+key+"("+f+")";
	}
	
	functions[route] = eval("(function(color) { return "+f+" })");
	return color;
};

// W3C - RGB + RGBA

root.RGB_W3 = function(o) { 
	return 'rgb(' + (o.R >> 0) + ',' + (o.G >> 0) + ',' + (o.B >> 0) + ')'; 
};

root.RGBA_W3 = function(o) { 
	var alpha = typeof(o.A) === "number" ? o.A / 255 : 1;
	return 'rgba(' + (o.R >> 0) + ',' + (o.G >> 0) + ',' + (o.B >> 0) + ',' + alpha + ')'; 
};

root.W3_RGB = function(o) {
	var o = o.substr(4, o.length - 5).split(",");
	return {
		R: parseInt(o[0]),
		G: parseInt(o[1]),
		B: parseInt(o[2])
	}
};

root.W3_RGBA = function(o) {
	var o = o.substr(5, o.length - 6).split(",");
	return {
		R: parseInt(o[0]),
		G: parseInt(o[1]),
		B: parseInt(o[2]),
		A: parseFloat(o[3]) * 255
	}
};

// STRING = 'FFFFFF' | 'FFFFFFFF'

root.STRING_HEX = function (o) {
	return parseInt('0x' + o);
};

root.STRING_HEX32 = function (o) {
	if (o.length === 6) {
		return parseInt('0xFF' + o);
	} else {
		return parseInt('0x' + o);
	}
};

// HEX = 0x000000 -> 0xFFFFFF

root.HEX_STRING = function (o, maxLength) {
	if (!maxLength) maxLength = 6;
	if (!o) o = 0;
	var z = o.toString(16);
	// when string is lesser than maxLength
	var n = z.length;
	while (n < maxLength) {
		z = '0' + z;
		n++;
	}
	// when string is greater than maxLength
	var n = z.length;
	while (n > maxLength) {
		z = z.substr(1);
		n--;
	}
	return z;
};

root.HEX32_STRING = function(o) {
	return root.HEX_STRING(o, 8);
};

root.HEX_RGB = function (o) {
	return {
		R: (o >> 16),
		G: (o >> 8) & 0xFF,
		B: o & 0xFF
	};
};

// HEX32 = 0x00000000 -> 0xFFFFFFFF

root.HEX32_RGBA = function (o) {
	return {
		R: o >>> 16 & 0xFF,
		G: o >>> 8 & 0xFF,
		B: o & 0xFF,
		A: o >>> 24
	};
};

// RGBA = R: Red / G: Green / B: Blue / A: Alpha

root.RGBA_HEX32 = function (o) {
	return (o.A << 24 | o.R << 16 | o.G << 8 | o.B) >>> 0;
};

// RGB = R: Red / G: Green / B: Blue

root.RGB_HEX = function (o) {
	if (o.R < 0) o.R = 0;
	if (o.G < 0) o.G = 0;
	if (o.B < 0) o.B = 0;
	if (o.R > 255) o.R = 255;
	if (o.G > 255) o.G = 255;
	if (o.B > 255) o.B = 255;
	return o.R << 16 | o.G << 8 | o.B;
};

root.RGBA_HSVA =
root.RGB_HSV = function (o) { //- RGB from 0 to 255
	var _R = o.R / 255,
		_G = o.G / 255,
		_B = o.B / 255,
		min = Math.min(_R, _G, _B),
		max = Math.max(_R, _G, _B),
		D = max - min,
		H, 
		S,
		V = max;
	if (D === 0) { // No chroma
		H = 0;
		S = 0;
	} else { // Chromatic data
		S = D / max;
		var DR = (((max - _R) / 6) + (D / 2)) / D;
		var DG = (((max - _G) / 6) + (D / 2)) / D;
		var DB = (((max - _B) / 6) + (D / 2)) / D;
		if (_R === max) H = DB - DG;
		else if (_G === max) H = (1 / 3) + DR - DB;
		else if (_B === max) H = (2 / 3) + DG - DR;
		if (H < 0) H += 1;
		if (H > 1) H -= 1;
	}
	return {
		H: H * 360,
		S: S * 100,
		V: V * 100,
		A: o.A
	};
};

// HSV (1978) = H: Hue / S: Saturation / V: Value
// en.wikipedia.org/wiki/HSL_and_HSV

root.HSVA_RGBA = 
root.HSV_RGB = function (o) {
	var H = o.H / 360;
	var S = o.S / 100;
	var V = o.V / 100;
	var R, G, B;
	if (S === 0) {
		R = G = B = Math.round(V * 255);
	} else {
		if (H >= 1) H = 0;
		H = 6 * H;
		D = H - Math.floor(H);
		A = Math.round(255 * V * (1 - S));
		B = Math.round(255 * V * (1 - (S * D)));
		C = Math.round(255 * V * (1 - (S * (1 - D))));
		V = Math.round(255 * V);
		switch (Math.floor(H)) {
			case 0:
				R = V;
				G = C;
				B = A;
				break;
			case 1:
				R = B;
				G = V;
				B = A;
				break;
			case 2:
				R = A;
				G = V;
				B = C;
				break;
			case 3:
				R = A;
				G = B;
				B = V;
				break;
			case 4:
				R = C;
				G = A;
				B = V;
				break;
			case 5:
				R = V;
				G = A;
				B = B;
				break;
		}
	}
	return {
		R: R,
		G: G,
		B: B,
		A: o.A
	};
};

})();