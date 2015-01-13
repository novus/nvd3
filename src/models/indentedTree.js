nv.models.indentedTree = function() {

  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var margin = {top: 0, right: 0, bottom: 0, left: 0} //TODO: implement, maybe as margin on the containing div
    , width = 960
    , height = 500
    , color = nv.utils.defaultColor()
    , id = Math.floor(Math.random() * 10000)
    , header = true
    , filterZero = false
    , noData = "No Data Available."
    , childIndent = 20
    , columns = [{key:'key', label: 'Name', type:'text'}] //TODO: consider functions like chart.addColumn, chart.removeColumn, instead of a block like this
    , tableClass = null
    , iconOpen = 'icon-plus' //TODO: consider removing this and replacing with a '+' or '-' unless user defines images
    , iconClose = 'icon-minus'
    , iconAdd = 'assets/styles/images/add.png'
    , iconBlock = 'assets/styles/images/block.png'
    , dispatch = d3.dispatch('elementClick', 'elementDblclick', 'elementMouseover', 'elementMouseout')
    , getUrl = function(d) { return d.url }
    ;

  //============================================================

  var idx = 0;

  function chart(selection) {
    selection.each(function(data) {
      var i = 0,
          depth = 1,
          container = d3.select(this);

      var tree = d3.layout.tree()
          .children(function(d) { return d.values })
          .size([height, childIndent]); //Not sure if this is needed now that the result is HTML

      chart.update = function() { container.transition().duration(600).call(chart) };


      //------------------------------------------------------------
      // Display No Data message if there's nothing to show.
      if (!data[0]) data[0] = {key: noData};

      //------------------------------------------------------------


      var nodes = tree.nodes(data[0]);


      //------------------------------------------------------------
      // Setup containers and skeleton of chart

      var wrap = d3.select(this).selectAll('div').data([[nodes]]);
      var wrapEnter = wrap.enter().append('div').attr('class', 'nvd3 nv-wrap nv-indentedtree');
      var tableEnter = wrapEnter.append('table');
      var table = wrap.select('table').attr('width', '100%').attr('class', tableClass);

      //------------------------------------------------------------


      if (header) {
        var thead = tableEnter.append('thead');

        var theadRow1 = thead.append('tr');

        columns.forEach(function(column) {
          theadRow1
            .append('th')
              .attr('width', column.width ? column.width : '10%')
              .style('text-align', column.type == 'numeric' ? 'right' : 'left')
            .append('span')
              .text(column.label);
        });
      }


      var tbody = table.selectAll('tbody')
                    .data(function(d) { return d });
      tbody.enter().append('tbody');



      //compute max generations
      depth = d3.max(nodes, function(node) { return node.depth });
      tree.size([height, depth * childIndent]); //TODO: see if this is necessary at all


      // Update the nodes…
      var node = tbody.selectAll('tr')
          // .data(function(d) { return d; }, function(d) { return d.id || (d.id == ++i)});
          .data(function(d) { return d.filter(function(d) { return (filterZero && !d.children) ? filterZero(d) :  true; } )}, function(d,i) { return d.id || (d.id || ++idx)});
          //.style('display', 'table-row'); //TODO: see if this does anything

      node.exit().remove();


      node.select('i.nv-treeicon')
          .attr("class", icon)
          .classed('folded', folded)
          .classed('nv-treeicon', true);

      var nodeEnter = node.enter().append('tr');


      columns.forEach(function(column, index) {

        var nodeName = nodeEnter.append('td')
            .style('padding-left', function(d) { return (index ? 0 : d.depth * childIndent + 12 + (icon(d) ? 0 : 16)) + 'px' }, 'important') //TODO: check why I did the ternary here
            .style('text-align', column.type == 'numeric' ? 'right' : 'left');


        if (index == 0) {
          nodeName.append('i')
              .attr("class", icon)
              .classed('nv-treeicon', true)
              .classed('nv-folded', folded)
              .style('width', '14px')
              .style('height', '14px')
              .style('padding', '0 1px')
              .style('margin-right', '5px')
              .style('display', function(d) { return icon(d) ? 'inline-block' : 'none'; })
              .on('click', click);

          nodeName.append('i')
              .classed('nv-treeicon', true)
              .classed('icon-plus-sign', true)
              .style('padding', '0 1px')
              .style('margin-right', '5px')
              .style('display', function(d) { return iconAd(d) ? 'inline-block' : 'none'; })
              .on('click', addClick);

          nodeName.append('i')
              .classed('nv-treeicon', true)
              .classed('icon-ban-circle', true)
              .style('margin-right', '10px')
              .style('display', function(d) { return iconRemove(d) ? 'inline-block' : 'none'; })
              .on('click', blockClick);
        }


        nodeName.append('span')
            .attr('class', d3.functor(column.classes) )
            .text(function(d) { return column.format ? column.format(d) :
                                        (d[column.key] || '-') });

        if  (column.showCount) {
          nodeName.append('span')
              .attr('class', 'nv-childrenCount');
          node.selectAll('span.nv-childrenCount').text(function(d) {
                return ((d.values && d.values.length) || (d._values && d._values.length)) ?                                   //If this is a parent
                    '(' + ((d.values && (d.values.filter(function(d) { return filterZero ? filterZero(d) :  true; }).length)) //If children are in values check its children and filter
                    || (d._values && d._values.filter(function(d) { return filterZero ? filterZero(d) :  true; }).length)     //Otherwise, do the same, but with the other name, _values...
                    || 0) + ')'                                                                                               //This is the catch-all in case there are no children after a filter
                    : ''                                                                                                     //If this is not a parent, just give an empty string
            });
        }

        if (column.click)
          nodeName.select('span').on('click', column.click);


        if (column.addClick)
          nodeName.select('span').on('click', column.addClick);

        if (column.blockClick)
          nodeName.select('span').on('click', column.blockClick);

      });


      node
        .order()
        .on('click', function(d) {
          dispatch.elementClick({
            row: this, //TODO: decide whether or not this should be consistent with scatter/line events or should be an html link (a href)
            data: d,
            pos: [d.x, d.y]
          });
        })
        .on('dblclick', function(d) {
          dispatch.elementDblclick({
            row: this,
            data: d,
            pos: [d.x, d.y]
          });
        })
        .on('mouseover', function(d) {
          dispatch.elementMouseover({
            row: this,
            data: d,
            pos: [d.x, d.y]
          });
        })
        .on('mouseout', function(d) {
          dispatch.elementMouseout({
            row: this,
            data: d,
            pos: [d.x, d.y]
          });
        });




      // Toggle children on click.
      function click(d, _, unshift) {
        d3.event.stopPropagation();

        if(d3.event.shiftKey && !unshift) {
          //If you shift-click, it'll toggle fold all the children, instead of itself
          d3.event.shiftKey = false;
          d.values && d.values.forEach(function(node){
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

      // Toggle children on click.
      function addClick(d, _, unshift) {
        var controller = UI.__container__.lookup("controller:condition");
        var boundSend = controller.send.bind(controller);
        boundSend('addUserSegment', d.id);
      }

      function blockClick(d, _, unshift) {
        var controller = UI.__container__.lookup("controller:condition");
        var boundSend = controller.send.bind(controller);
        boundSend('blockUserSegment', d.id);
      }

      function icon(d) {
        return (d._values && d._values.length) ? iconOpen : (d.values && d.values.length) ? iconClose : '';
      }

      function iconAd(d) {
        return (d._values != undefined && d._values.length == 0) ? iconAdd : (d.size > 0) ? iconAdd : '';
      }

      function iconRemove(d) {
        return (d._values != undefined && d._values.length == 0) ? iconBlock : (d.size > 0) ? iconAdd : '';
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


  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------
  chart.options = nv.utils.optionsFunc.bind(chart);

  chart.margin = function(_) {
    if (!arguments.length) return margin;
    margin.top    = typeof _.top    != 'undefined' ? _.top    : margin.top;
    margin.right  = typeof _.right  != 'undefined' ? _.right  : margin.right;
    margin.bottom = typeof _.bottom != 'undefined' ? _.bottom : margin.bottom;
    margin.left   = typeof _.left   != 'undefined' ? _.left   : margin.left;
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
    color = nv.utils.getColor(_);
    scatter.color(color);
    return chart;
  };

  chart.id = function(_) {
    if (!arguments.length) return id;
    id = _;
    return chart;
  };

  chart.header = function(_) {
    if (!arguments.length) return header;
    header = _;
    return chart;
  };

  chart.noData = function(_) {
    if (!arguments.length) return noData;
    noData = _;
    return chart;
  };

  chart.filterZero = function(_) {
    if (!arguments.length) return filterZero;
    filterZero = _;
    return chart;
  };

  chart.columns = function(_) {
    if (!arguments.length) return columns;
    columns = _;
    return chart;
  };

  chart.tableClass = function(_) {
    if (!arguments.length) return tableClass;
    tableClass = _;
    return chart;
  };

  chart.iconOpen = function(_){
     if (!arguments.length) return iconOpen;
    iconOpen = _;
    return chart;
  }

  chart.iconAdd = function(_){
     if (!arguments.length) return iconAdd;
    iconAdd = _;
    return chart;
  }

  chart.iconBlock = function(_){
     if (!arguments.length) return iconBlock;
    iconBlock = _;
    return chart;
  }

  chart.iconClose = function(_){
     if (!arguments.length) return iconClose;
    iconClose = _;
    return chart;
  }

  chart.getUrl = function(_){
     if (!arguments.length) return getUrl;
    getUrl = _;
    return chart;
  }

  //============================================================


  return chart;
}
