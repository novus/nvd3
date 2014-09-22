describe 'NVD3', ->
  describe 'Legend', ->

    sampleData1 = [
      {"values":[{"x":1,"y":2},{"x":3,"y":4},{"x":5,"y":6}],"key":"key 1"}
      {"values":[{"x":7,"y":8},{"x":9,"y":10},{"x":11,"y":12}],"key":"key 2"}
      {"values":[{"x":13,"y":14},{"x":15,"y":16},{"x":17,"y":18}],"key":"key 3"}
    ]

    legendOptions =
      margin:
        top: 0
        right: 0
        bottom: 0
        left: 0
      width: 100
      height: 100
      key: (d) -> d.key
      color: nv.utils.defaultColor()
      align: true
      rightAlign: false
      updateState: true
      radioButtonMode: false

    builder = null
    beforeEach ->
      builder = new ChartBuilder nv.models.legend()
      builder.build legendOptions, sampleData1

      legend = builder.model
      for opt, val of legendOptions
        legend[opt](val)

    afterEach ->
      builder.teardown()

    it 'api check', ->
      legend = builder.model
      for opt, val of legendOptions
        should.exist legend[opt](), "#{opt} can be called"

    it 'exists', ->
      legend = builder.$('.nvd3.nv-legend')
      should.exist legend[0], '.nvd3.nv-legend'

    describe 'appends items correctly', ->
      for item, i in sampleData1
        do (item, i) ->
          key = item.key
          it "'#{key}' text, position and structure", ->

            nvSeries = builder.$(".nvd3.nv-legend .nv-series")[i]
            transformCalculated = "translate(0,#{i*20+5})"
            transform = nvSeries.getAttribute 'transform'
            transform.should.be.equal transformCalculated

            nvLegendSymbol = nvSeries.querySelector('.nv-legend-symbol')
            nvLegendText = nvSeries.querySelector('.nv-legend-text')

            should.exist nvLegendSymbol
            should.exist nvLegendText
            nvLegendText.textContent.should.be.equal key