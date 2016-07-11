
if (typeof JSON.decycle !== 'function') {
    (function(){

        /**
         * Allows stringifing DOM elements.
         *
         * This is done in hope to identify the node when dumping.
         *
         * @param {Element} node DOM Node (works best for DOM Elements).
         * @returns {String}
         */
        function stringifyNode(node) {
            var text = "";
            switch (node.nodeType) {
                case node.ELEMENT_NODE:
                    text = node.nodeName.toLowerCase();
                    if (node.id.length) {
                        text += '#' + node.id;
                    }
                    else {
                        if (node.className.length) {
                            text += '.' + node.className.replace(/ /, '.');
                        }
                        if ('textContent' in node) {
                            text += '{textContent:'
                                + (node.textContent.length < 20 ? node.textContent : node.textContent.substr(0, 20) + '...')
                                + '}'
                            ;
                        }
                    }
                    break;
                // info on values: http://www.w3.org/TR/DOM-Level-2-Core/core.html#ID-1841493061
                default:
                    text = node.nodeName;
                    if (node.nodeValue !== null) {
                        text += '{value:'
                            + (node.nodeValue.length < 20 ? node.nodeValue : node.nodeValue.substr(0, 20) + '...')
                            + '}'
                        ;
                    }
                    break;
            }
            return text;
        }

        JSON.decycle = function decycle(object, stringifyNodes) {
            'use strict';

// Make a deep copy of an object or array, assuring that there is at most
// one instance of each object or array in the resulting structure. The
// duplicate references (which might be forming cycles) are replaced with
// an object of the form
//      {$ref: PATH}
// where the PATH is a JSONPath string that locates the first occurance.
// So,
//      var a = [];
//      a[0] = a;
//      return JSON.stringify(JSON.decycle(a));
// produces the string '[{"$ref":"$"}]'.

// NOTE! If your object contains DOM Nodes you might want to use `stringifyNodes` option
// This will dump e.g. `div` with id="some-id" to string: `div#some-id`.
// You will avoid some problems, but you won't to be able to fully retro-cycle.
// To dump almost any variable use: `alert(JSON.stringify(JSON.decycle(variable, true)));`

// JSONPath is used to locate the unique object. $ indicates the top level of
// the object or array. [NUMBER] or [STRING] indicates a child member or
// property.

            var objects = [],   // Keep a reference to each unique object or array
                stringifyNodes = typeof(stringifyNodes) === 'undefined' ? false : stringifyNodes,
                paths = [];     // Keep the path to each unique object or array

            return (function derez(value, path) {

// The derez recurses through the object, producing the deep copy.

                var i,          // The loop counter
                    name,       // Property name
                    nu;         // The new object or array

// if we have a DOM Element/Node convert it to textual info.

                if (stringifyNodes && typeof value === 'object' && value !== null && 'nodeType' in value) {
                    return stringifyNode(value);
                }

// typeof null === 'object', so go on if this value is really an object but not
// one of the weird builtin objects.

                if (typeof value === 'object' && value !== null &&
                    !(value instanceof Boolean) &&
                    !(value instanceof Date)    &&
                    !(value instanceof Number)  &&
                    !(value instanceof RegExp)  &&
                    !(value instanceof String)) {

// If the value is an object or array, look to see if we have already
// encountered it. If so, return a $ref/path object. This is a hard way,
// linear search that will get slower as the number of unique objects grows.

                    for (i = 0; i < objects.length; i += 1) {
                        if (objects[i] === value) {
                            return {$ref: paths[i]};
                        }
                    }

// Otherwise, accumulate the unique value and its path.

                    objects.push(value);
                    paths.push(path);

// If it is an array, replicate the array.

                    if (Object.prototype.toString.apply(value) === '[object Array]') {
                        nu = [];
                        for (i = 0; i < value.length; i += 1) {
                            nu[i] = derez(value[i], path + '[' + i + ']');
                        }
                    } else {

// If it is an object, replicate the object.

                        nu = {};
                        for (name in value) {
                            if (Object.prototype.hasOwnProperty.call(value, name)) {
                                nu[name] = derez(value[name],
                                    path + '[' + JSON.stringify(name) + ']');
                            }
                        }
                    }
                    return nu;
                }
                return value;
            }(object, '$'));
        };
    })();
}


if (typeof JSON.retrocycle !== 'function') {
    JSON.retrocycle = function retrocycle($) {
        'use strict';

// Restore an object that was reduced by decycle. Members whose values are
// objects of the form
//      {$ref: PATH}
// are replaced with references to the value found by the PATH. This will
// restore cycles. The object will be mutated.

// The eval function is used to locate the values described by a PATH. The
// root object is kept in a $ variable. A regular expression is used to
// assure that the PATH is extremely well formed. The regexp contains nested
// * quantifiers. That has been known to have extremely bad performance
// problems on some browsers for very long strings. A PATH is expected to be
// reasonably short. A PATH is allowed to belong to a very restricted subset of
// Goessner's JSONPath.

// So,
//      var s = '[{"$ref":"$"}]';
//      return JSON.retrocycle(JSON.parse(s));
// produces an array containing a single element which is the array itself.

        var px =
            /^\$(?:\[(?:\d+|\"(?:[^\\\"\u0000-\u001f]|\\([\\\"\/bfnrt]|u[0-9a-zA-Z]{4}))*\")\])*$/;

        (function rez(value) {

// The rez function walks recursively through the object looking for $ref
// properties. When it finds one that has a value that is a path, then it
// replaces the $ref object with a reference to the value that is found by
// the path.

            var i, item, name, path;

            if (value && typeof value === 'object') {
                if (Object.prototype.toString.apply(value) === '[object Array]') {
                    for (i = 0; i < value.length; i += 1) {
                        item = value[i];
                        if (item && typeof item === 'object') {
                            path = item.$ref;
                            if (typeof path === 'string' && px.test(path)) {
                                value[i] = eval(path);
                            } else {
                                rez(item);
                            }
                        }
                    }
                } else {
                    for (name in value) {
                        if (typeof value[name] === 'object') {
                            item = value[name];
                            if (item) {
                                path = item.$ref;
                                if (typeof path === 'string' && px.test(path)) {
                                    value[name] = eval(path);
                                } else {
                                    rez(item);
                                }
                            }
                        }
                    }
                }
            }
        }($));
        return $;
    };
}





nv.models.sankey = function() {
    "use strict";

    //============================================================
    // Public Variables with Default Settings
    //------------------------------------------------------------

    var sankey = {},
        nodeWidth = 24,
        nodePadding = 8,
        size = [1, 1],
        nodes = [],
        links = [],
        sinksRight = true;

    sankey.nodeWidth = function(_) {
        if (!arguments.length) return nodeWidth;
        nodeWidth = +_;
        return sankey;
    };

    sankey.nodePadding = function(_) {
        if (!arguments.length) return nodePadding;
        nodePadding = +_;
        return sankey;
    };

    sankey.nodes = function(_) {
        if (!arguments.length) return nodes;
        nodes = _;
        console.log('sankey.nodes', JSON.stringify(JSON.decycle(nodes)));
        return sankey;
    };

    sankey.links = function(_) {
        if (!arguments.length) return links;
        links = _;
        return sankey;
    };

    sankey.size = function(_) {
        if (!arguments.length) return size;
        size = _;
        return sankey;
    };

    sankey.sinksRight = function (_) {
        if (!arguments.length) return sinksRight;
        sinksRight = _;
        return sankey;
    };

    sankey.layout = function(iterations) {
        console.log('layout', JSON.stringify(JSON.decycle(nodes)));
        computeNodeLinks();
        computeNodeValues();
        computeNodeBreadths();
        computeNodeDepths(iterations);
        console.log('layout sankey', sankey);
        return sankey;
    };

    sankey.relayout = function() {
        computeLinkDepths();
        return sankey;
    };

    // SVG path data generator, to be used as "d" attribute on "path" element selection.
    sankey.link = function() {
        var curvature = .5;

        function link(d) {
            console.log('d', JSON.stringify(JSON.decycle(d, true)));
            var x0 = d.source.x + d.source.dx,
                x1 = d.target.x,
                xi = d3.interpolateNumber(x0, x1),
                x2 = xi(curvature),
                x3 = xi(1 - curvature),
                y0 = d.source.y + d.sy + d.dy / 2,
                y1 = d.target.y + d.ty + d.dy / 2;
            return "M" + x0 + "," + y0
                + "C" + x2 + "," + y0
                + " " + x3 + "," + y1
                + " " + x1 + "," + y1;
        }

        link.curvature = function(_) {
            if (!arguments.length) return curvature;
            curvature = +_;
            return link;
        };

        return link;
    };

    // Populate the sourceLinks and targetLinks for each node.
    // Also, if the source and target are not objects, assume they are indices.
    function computeNodeLinks() {
        // console.log('computeNodeLinks', JSON.stringify(JSON.decycle(nodes)));
        nodes.forEach(function(node) {
            // Links that have this node as source.
            node.sourceLinks = [];
            // Links that have this node as target.
            node.targetLinks = [];
        });
        links.forEach(function(link) {
            var source = link.source,
                target = link.target;
            if (typeof source === "number") source = link.source = nodes[link.source];
            if (typeof target === "number") target = link.target = nodes[link.target];
            source.sourceLinks.push(link);
            target.targetLinks.push(link);
        });
    }

    // Compute the value (size) of each node by summing the associated links.
    function computeNodeValues() {
        nodes.forEach(function(node) {
            node.value = Math.max(
                d3.sum(node.sourceLinks, value),
                d3.sum(node.targetLinks, value)
            );
        });
    }

    // Iteratively assign the breadth (x-position) for each node.
    // Nodes are assigned the maximum breadth of incoming neighbors plus one;
    // nodes with no incoming links are assigned breadth zero, while
    // nodes with no outgoing links are assigned the maximum breadth.
    function computeNodeBreadths() {
        // console.log('computeNodeBreadths', JSON.stringify(JSON.decycle(nodes)));
        var remainingNodes = nodes,
            nextNodes,
            x = 0;

        // Work from left to right.
        // Keep updating the breath (x-position) of nodes that are target of recently updated nodes.
        // console.log('remainingNodes.length, nodes.length', remainingNodes.length, nodes.length);
        while (remainingNodes.length && x < nodes.length) {
            nextNodes = [];
            remainingNodes.forEach(function(node) {
                node.x = x;
                node.dx = nodeWidth;
                node.sourceLinks.forEach(function(link) {
                    if (nextNodes.indexOf(link.target) < 0) {
                        nextNodes.push(link.target);
                    }
                });
            });
            remainingNodes = nextNodes;
            ++x;
            // console.log('x', x);
        }

        // Optionally move pure sinks always to the right.
        if (sinksRight) {
            moveSinksRight(x);
        }

        scaleNodeBreadths((size[0] - nodeWidth) / (x - 1));
    }

    function moveSourcesRight() {
        nodes.forEach(function(node) {
            if (!node.targetLinks.length) {
                node.x = d3.min(node.sourceLinks, function(d) { return d.target.x; }) - 1;
            }
        });
    }

    function moveSinksRight(x) {
        nodes.forEach(function(node) {
            if (!node.sourceLinks.length) {
                node.x = x - 1;
            }
        });
    }

    function scaleNodeBreadths(kx) {
        nodes.forEach(function(node) {
            node.x *= kx;
        });
    }

    // Compute the depth (y-position) for each node.
    function computeNodeDepths(iterations) {
        // Group nodes by breath.
        var nodesByBreadth = d3.nest()
            .key(function(d) { return d.x; })
            .sortKeys(d3.ascending)
            .entries(nodes)
            .map(function(d) { return d.values; });

        //
        initializeNodeDepth();
        resolveCollisions();
        computeLinkDepths();
        for (var alpha = 1; iterations > 0; --iterations) {
            relaxRightToLeft(alpha *= .99);
            resolveCollisions();
            computeLinkDepths();
            relaxLeftToRight(alpha);
            resolveCollisions();
            computeLinkDepths();
        }

        function initializeNodeDepth() {
            // Calculate vertical scaling factor.
            var ky = d3.min(nodesByBreadth, function(nodes) {
                return (size[1] - (nodes.length - 1) * nodePadding) / d3.sum(nodes, value);
            });

            nodesByBreadth.forEach(function(nodes) {
                nodes.forEach(function(node, i) {
                    node.y = i;
                    node.dy = node.value * ky;
                });
            });

            links.forEach(function(link) {
                link.dy = link.value * ky;
            });
        }

        function relaxLeftToRight(alpha) {
            nodesByBreadth.forEach(function(nodes, breadth) {
                nodes.forEach(function(node) {
                    if (node.targetLinks.length) {
                        // Value-weighted average of the y-position of source node centers linked to this node.
                        var y = d3.sum(node.targetLinks, weightedSource) / d3.sum(node.targetLinks, value);
                        node.y += (y - center(node)) * alpha;
                    }
                });
            });

            function weightedSource(link) {
                return (link.source.y + link.sy + link.dy / 2) * link.value;
            }
        }

        function relaxRightToLeft(alpha) {
            nodesByBreadth.slice().reverse().forEach(function(nodes) {
                nodes.forEach(function(node) {
                    if (node.sourceLinks.length) {
                        // Value-weighted average of the y-positions of target nodes linked to this node.
                        var y = d3.sum(node.sourceLinks, weightedTarget) / d3.sum(node.sourceLinks, value);
                        node.y += (y - center(node)) * alpha;
                    }
                });
            });

            function weightedTarget(link) {
                return (link.target.y + link.ty + link.dy / 2) * link.value;
            }
        }

        function resolveCollisions() {
            nodesByBreadth.forEach(function(nodes) {
                var node,
                    dy,
                    y0 = 0,
                    n = nodes.length,
                    i;

                // Push any overlapping nodes down.
                nodes.sort(ascendingDepth);
                for (i = 0; i < n; ++i) {
                    node = nodes[i];
                    dy = y0 - node.y;
                    if (dy > 0) node.y += dy;
                    y0 = node.y + node.dy + nodePadding;
                }

                // If the bottommost node goes outside the bounds, push it back up.
                dy = y0 - nodePadding - size[1];
                if (dy > 0) {
                    y0 = node.y -= dy;

                    // Push any overlapping nodes back up.
                    for (i = n - 2; i >= 0; --i) {
                        node = nodes[i];
                        dy = node.y + node.dy + nodePadding - y0;
                        if (dy > 0) node.y -= dy;
                        y0 = node.y;
                    }
                }
            });
        }

        function ascendingDepth(a, b) {
            return a.y - b.y;
        }
    }

    // Compute y-offset of the source endpoint (sy) and target endpoints (ty) of links,
    // relative to the source/target node's y-position.
    function computeLinkDepths() {
        nodes.forEach(function(node) {
            node.sourceLinks.sort(ascendingTargetDepth);
            node.targetLinks.sort(ascendingSourceDepth);
        });
        nodes.forEach(function(node) {
            var sy = 0, ty = 0;
            node.sourceLinks.forEach(function(link) {
                link.sy = sy;
                sy += link.dy;
            });
            node.targetLinks.forEach(function(link) {
                link.ty = ty;
                ty += link.dy;
            });
        });

        function ascendingSourceDepth(a, b) {
            return a.source.y - b.source.y;
        }

        function ascendingTargetDepth(a, b) {
            return a.target.y - b.target.y;
        }
    }

    // Y-position of the middle of a node.
    function center(node) {
        // return node.y + node.dy / 2;
        return node.dy;
    }

    // Value property accessor.
    function value(x) {
        return x.value;
    }

    return sankey;
};
