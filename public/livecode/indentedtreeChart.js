nv.addGraph(function() {
  var chart = nv.models.indentedTree()
                .tableClass('table table-striped') //for bootstrap styling
                .columns([
                  {
                    key: 'key',
                    label: 'Name',
                    showCount: true,
                    width: '75%',
                    type: 'text',
                    classes: function(d) { return d.url ? 'clickable name' : 'name' },
                    click: function(d) {
                       if (d.url) window.location.href = d.url;
                    }
                  },
                  {
                    key: 'type',
                    label: 'Type',
                    width: '25%',
                    type: 'text'
                  }
                ]);


  d3.select('#chart')
      .datum(data)
    .call(chart);

  return chart;
});
