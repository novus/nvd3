describe 'NVD3', ->
    describe 'Cumulative Line Chart', ->
        sampleData1 = [
            key: 'Series 1'
            values: [
                [-1,-1]
                [0,0]
                [1,1]
                [2,2]
            ]
            average: 1.3
        ]

        sampleData2 = [
            key: 'Series 1'
            values: [
                [-1,-3]
                [0,6]
                [1,12]
                [2,18]
            ]
            average: 12.3
        ,
            key: 'Series 2'
            values: [
                [-1,-4]
                [0,7]
                [1,13]
                [2,14]
            ]
        ]

        options =
            x: (d)-> d[0]
            y: (d)-> d[1]
            margin:
                top: 30
                right: 20
                bottom: 50
                left: 75
            color: nv.utils.defaultColor()
            showLegend: true
            showXAxis: true
            showYAxis: true
            rightAlignYAxis: false
            useInteractiveGuideline: true
            tooltips: true
            tooltipContent: (key,x,y)-> "<h3>#{key}</h3>"
            noData: 'No Data Available'
            average: (d)-> d.average
            duration: 0
            noErrorCheck: false

        builder = null
        beforeEach ->
            builder = new ChartBuilder nv.models.cumulativeLineChart()
            builder.build options, sampleData1

        afterEach ->
            builder.teardown()

        it 'api check', ->
            for opt of options
                should.exist builder.model[opt](), "#{opt} can be called"

        it 'renders', ->
            wrap = builder.$ 'g.nvd3.nv-cumulativeLine'
            should.exist wrap[0]
