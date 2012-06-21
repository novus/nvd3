
//TODO: Finish merging this chart into the NVD3 style!
nv.models.indentedTree = function() {
  //Default Settings
  var margin = {top: 0, right: 0, bottom: 0, left: 0},
      width = 960,
      height = 500,
      color = d3.scale.category20().range(), // array of colors to be used in order
      id = Math.floor(Math.random() * 10000), //Create semi-unique ID incase user doesn't select one
      childIndent = 20,
      berHeight = 20,
      options = {columns:[{key:'key', label: 'Name', type:'text'}]},
      tableClass = null;



  function chart(selection) {
    selection.each(function(data) {
      var availableWidth = width - margin.left - margin.right,
          availableHeight = height - margin.top - margin.bottom;


      chart.update = function() { selection.transition().call(chart) };

      var i = 0,
          depth = 1;

      var tree = d3.layout.tree()
          .children(function(d) { return d.values })
          .size([height, childIndent]); //Not sure if this is needed now that the result is HTML


      if (!data[0].key) data[0].key = options.noResults || "Nothing to show";

      var nodes = tree.nodes(data[0]);


      var wrap = d3.select(this).selectAll('div').data([[nodes]]);
      var wrapEnter = wrap.enter().append('div').attr('class', 'wrap nvd3 indentedtree');
      var tableEnter = wrapEnter.append('table');
      var table = wrap.select('table').attr('width', '100%').attr('class', tableClass);


      //clear the container, start from scratch
      //d3.select("#" + container + " .indentedtree").remove();



      if (options.header) {
        var thead = tableEnter.append('thead');

        var theadRow1 = thead.append('tr');

        options.columns.forEach(function(column) {
          theadRow1
            .append('th')
              .attr('width', column.width ? column.width : 5)
              .style('text-align', column.type == 'numeric' ? 'right' : 'left')
            .append('span')
              .text(column.label);
        });
      }

      //tableEnter.append('tbody');

      var tbody = table.selectAll('tbody')
                    .data(function(d) {return d });
      tbody.enter().append('tbody');





      //compute max generations
      depth = d3.max(nodes, function(node) { return node.depth });
      tree.size([height, depth * childIndent]);


      // Update the nodes…
      var node = tbody.selectAll("tr")
          //.data(nodes, function(d) { return d.id || (d.id = ++i); })
          .data(function(d) { return d }, function(d) { return d.id || (d.id == ++i)})
          .style('display', 'table-row');

      node.exit().remove();


      if (options.click)
        node.on('click', options.click);

      node.select("img.treeicon")
          .attr("src", icon)
          .classed('folded', folded);

      var nodeEnter = node.enter().append("tr");


      options.columns.forEach(function(column, index) {

        var nodeName = nodeEnter.append("td")
            .style("padding-left", function(d) { return (index ? 0 : d.depth * childIndent + 12 + (icon(d) ? 0 : 16)) + 'px' }, 'important') //TODO: check why I did the ternary here
            .style('text-align', column.type == 'numeric' ? 'right' : 'left');


        if (index == 0) {
          nodeName.append("img")
              .classed('treeicon', true)
              .classed('folded', folded)
              .attr('src', icon)
              .style("width", '14px')
              .style("height", '14px')
              .style('padding', '0 1px')
              .style('display', function(d) { return icon(d) ? 'inline-block' : 'none'; })
              .on("click", click);
        }


        nodeName.append("span")
            .attr('class', d3.functor(column.classes) )
            .text(function(d) { return column.format ? column.format(d) :
                                        (d[column.key] || '-') });

        if  (column.showCount)
          nodeName.append("span")
              .attr('class', 'childrenCount')
              .text(function(d) {
                return ((d.values && d.values.length) || (d._values && d._values.length)) ?
                    '(' + ((d.values && d.values.length) || (d._values && d._values.length)) + ')'
                  : ''
              });


        tbody.selectAll("tr")
            //.data(nodes, function(d) { return d.id || (d.id = ++i); })
            .order()
            .classed('highlight', function(_,i) { return i % 2;}); //used to alternate background color

        if (column.click)
          nodeName.select('span').on('click', column.click);

      });



      // Toggle children on click.
      function click(d, _, unshift) {
        d3.event.stopPropagation();

        if(d3.event.shiftKey && !unshift) {
          //If you shift-click, it'll toggle fold all the children, instead of itself
          d3.event.shiftKey = false;
          d.values.forEach(function(node){
            if (node.values || node._values) {
              click(node, 0, true);
            }
          });
          return true;
        }
        if(!hasChildren(d)) {
          //download file
          //window.location.href = d.url;
          return true;
        }
        if (d.values) {
          d._values = d.values;
          d.values = null;
        } else {
          d.values = d._values;
          d._values = null;
        }
        chart.update();
      }


      function icon(d) {
        return (d._values && d._values.length) ? "images/grey-plus.png" : (d.values && d.values.length) ? "images/grey-minus.png" : "";
      }

      function folded(d) {
        return (d._values && d._values.length);
      }

      function hasChildren(d) {
        var values = d.values || d._values;

        return (values && values.length);
      }

    });

    return chart;
  }




  chart.margin = function(_) {
    if (!arguments.length) return margin;
    margin = _;
    return chart;
  };

  chart.width = function(_) {
    if (!arguments.length) return width;
    width = _;
    return chart;
  };

  chart.height = function(_) {
    if (!arguments.length) return height;
    height = _;
    return chart;
  };

  chart.color = function(_) {
    if (!arguments.length) return color;
    color = _;
    scatter.color(_);
    return chart;
  };

  chart.id = function(_) {
    if (!arguments.length) return id;
    id = _;
    return chart;
  };

  chart.options = function(_) {
    if (!arguments.length) return options;
    options = _;
    return chart;
  };

  chart.tableClass = function(_) {
    if (!arguments.length) return tableClass;
    tableClass = _;
    return chart;
  };


  return chart;
}
