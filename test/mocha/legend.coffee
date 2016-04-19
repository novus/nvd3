describe 'NVD3', ->
  describe 'Legend', ->
    sampleData1 = [
      {"values":[{"x":1,"y":2},{"x":3,"y":4},{"x":5,"y":6}],"key":"key 1"}
      {"values":[{"x":7,"y":8},{"x":9,"y":10},{"x":11,"y":12}],"key":"key 2"}
      {"values":[{"x":13,"y":14},{"x":15,"y":16},{"x":17,"y":18}],"key":"key 3"}
    ]

    sampleData2 = [
      key: 'series 1'
    ,
      key: 'series 2'
    ,
      key: 'series 3'
    ,
      key: 'series 4'
    ]
    
    sampleData3 = [
      key: 'a really lengthy series 1'
    ,
      key: 'some series 2'
    ,
      key: 'lengthy series 3'
    ,
      key: 'some other series 4'
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
      columnize: true
      alignAnchor: 'left'
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

    describe 'clicking and double clicking', ->
      it 'clicking one legend turns it off', ->
        legendItems = builder.$ '.nv-legend .nv-series'
        legendItems.length.should.equal 3

        clickFn = d3.select(legendItems[0]).on 'click'
        clickFn(sampleData1[0])
        sampleData1[0].disabled.should.equal true
        clickFn(sampleData1[1])
        sampleData1[1].disabled.should.equal true 

        clickFn(sampleData1[2])
        sampleData1[0].disabled.should.equal false
        sampleData1[1].disabled.should.equal false
        sampleData1[2].disabled.should.equal false

      it 'double clicking legend keeps only one on', ->
        legendItems = builder.$ '.nv-legend .nv-series'

        clickFn = d3.select(legendItems[0]).on 'dblclick'
        clickFn(sampleData1[0])
        sampleData1[0].disabled.should.equal false

        sampleData1[1].disabled.should.equal true
        sampleData1[2].disabled.should.equal true

      it 'updating legend data does not break double click (issue 784)', ->
        builder.updateData sampleData2

        legendItems = builder.$ '.nv-legend .nv-series'

        clickFn = d3.select(legendItems[0]).on 'dblclick'
        clickFn(sampleData2[0])
        sampleData2[0].disabled.should.equal false 

        sampleData2[1].disabled.should.equal true
        sampleData2[2].disabled.should.equal true
        sampleData2[3].disabled.should.equal true

    it 'legend padding', ->
      builder = new ChartBuilder nv.models.legend()
      builder.build {padding: 40}, sampleData1

      legendItems = builder.$ '.nv-legend .nv-series'
      xSpacing = [0, 80, 160]
      for legend,i in legendItems
        transform = legend.getAttribute 'transform'
        transform.should.equal "translate(#{xSpacing[i]},5)"
        
    it 'columnize aligns items', ->
      builder = new ChartBuilder nv.models.legend()
      builder.build {columnize: true, width: 410}, sampleData3
        
      legendItems = builder.$ '.nv-legend .nv-series'
      
      extractCoords = (str) ->
        str = str.substring 10
        { x: str.substring(0, str.indexOf(',')), y: str.substring((str.indexOf ',') + 1, str.length - 1) } 
      
      transform = []
      for legend,i in legendItems
        transform[i] = extractCoords (legendItems[i].getAttribute 'transform') 
      
      transform[0].x.should.equal transform[2].x
      transform[1].x.should.equal transform[3].x
      transform[0].y.should.equal '5'
      transform[1].y.should.equal '5'
      transform[2].y.should.equal '25'
      transform[3].y.should.equal '25'

    it 'alignAnchor left', ->
      builder = new ChartBuilder nv.models.legend()
      builder.build {columnize: false, alignAnchor: 'left', width: 540}, sampleData3
        
      legendItems = builder.$ '.nv-legend .nv-series'
      
      extractCoords = (str) ->
        str = str.substring 10
        { x: str.substring(0, str.indexOf(',')), y: str.substring((str.indexOf ',') + 1, str.length - 1) } 
      
      transform = []
      for legend,i in legendItems
        transform[i] = extractCoords (legendItems[i].getAttribute 'transform') 
      
      transform[0].x.should.equal '0'
      transform[1].x.should.not.equal '0'
      transform[2].x.should.equal '0'
      transform[3].x.should.not.equal '0'
      transform[3].x.should.not.equal transform[1].x
