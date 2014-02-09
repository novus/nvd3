Canvas = function(root, options){
    var svg = svg = d3.select(root)

    options || (options = {});
    options.size || (options.size = {});
    options.margin || (options.margin = {});
    options.scale || (options.scale = {});
    options.domain || (options.domain = {});

    margin = {
        top: options.margin.top || 20,
        right: options.margin.top || 20,
        bottom: options.margin.top || 30,
        left: options.margin.top || 40
    };

    Object.defineProperty(margin, 'leftright', {
        get: function(){ return margin.left + margin.right; }
    });
    Object.defineProperty(margin, 'topbottom', {
        get: function(){ return margin.top + margin.bottom; }
    });

    width = (options.size.width || parseInt(svg.style('width')) || 960);
    height = (options.size.height || parseInt(svg.style('height')) || 500);

    svg.attr({
        width: width,
        height: height
    });

    var canvas = {
        options: options,
        margin: margin,
        size: {
            width: width,
            height: height
        },
        available: {
            width: width - margin.leftright,
            height: height - margin.topbottom
        },
        svg: svg
    }

    return canvas;
};
