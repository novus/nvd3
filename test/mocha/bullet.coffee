describe 'NVD3', ->
    describe 'Bullet Chart Chart', ->
        sampleData1 =
            title: 'Revenue'
            subtitle: 'US$ in thousands'
            ranges: [10,20,30]
            measures: [40]
            markers: [50]

        options =
            orient: 'left'
            margin:
                top: 60
                right: 70
                bottom: 80
                left: 90
            color: nv.utils.defaultColor()
            ranges: (d)-> d.ranges
            markers: (d)-> d.markers
            measures: (d)-> d.measures
            width: 100
            height: 110
            tickFormat: (d)-> d.toFixed 2
            tooltips: true
            tooltipContent: (key,x,y)-> "<h3>#{key}</h3>"
            noData: 'No Data Available'

        builder = null
        beforeEach ->
            builder = new ChartBuilder nv.models.bulletChart()
            builder.build options, sampleData1

        afterEach ->
            builder.teardown()

        it 'api check', ->
            for opt of options
                should.exist builder.model[opt](), "#{opt} can be called"

        it 'renders', ->
            wrap = builder.$ 'g.nvd3.nv-bulletChart'
            should.exist wrap[0]

        it 'has correct g.nvd3.nv-bulletChart position', ->
          chart = builder.$ 'g.nvd3.nv-bulletChart'
          dump chart[0]
          chart[0].getAttribute('transform').should.be.equal 'translate(90,60)'

        it "has correct structure", ->
          cssClasses = [
              '.nv-bulletWrap'
              '.nv-bullet'
              '.nv-rangeMax'
              '.nv-rangeAvg'
              '.nv-rangeMin'
              '.nv-measure'
              '.nv-markerTriangle'
              '.nv-titles'
              '.nv-title'
              '.nv-subtitle'
            ]
          for cssClass in cssClasses
            do (cssClass) ->
              should.exist builder.$(cssClass)[0]