(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define(['d3'], factory);
    } else {
        root.nv = factory(root.d3);
    }
}(this, function (d3) {