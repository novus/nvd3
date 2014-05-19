(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['exports', 'd3'], factory);
    } else if (typeof exports === 'object') {
        // CommonJS
        factory(exports, require('d3'));
    } else {
        // Browser globals
        root.nv = factory({}, root.d3);
    }
}(this, function (nv, d3) {
