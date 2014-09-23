describe 'NVD3', ->
    describe 'Historical Bar Chart', ->
        sampleData1 = [
            key: 'Series 1'
            values: [
                [-1,-1]
                [0,0]
                [1,1]
                [2,2]
            ]
        ]

        options =
            x: (d,i)-> i
            y: (d)-> d[1]
            margin:
                top: 30
                right: 20
                bottom: 50
                left: 75
            width: 200
            height: 200
            color: nv.utils.defaultColor()
            showLegend: true
            showXAxis: true
            showYAxis: true
            rightAlignYAxis: false
            tooltips: true
            tooltipContent: (key,x,y)-> "<h3>#{key}</h3>"
            noData: 'No Data Available'

        builder = null
        beforeEach ->
            builder = new ChartBuilder nv.models.historicalBarChart()
            builder.build options, sampleData1

        afterEach ->
            builder.teardown()

        it 'api check', ->
            for opt of options
                should.exist builder.model[opt](), "#{opt} can be called"

        it 'renders', ->
            wrap = builder.$ 'g.nvd3.nv-historicalBarChart'
            should.exist wrap[0]

        it 'has correct structure', ->
          cssClasses = [
            '.nv-x.nv-axis'
            '.nv-y.nv-axis'
            '.nv-barsWrap'
            '.nv-bars'
            '.nv-legendWrap'
          ]
          for cssClass in cssClasses
            do (cssClass) ->
              should.exist builder.$("g.nvd3.nv-historicalBarChart #{cssClass}")[0]