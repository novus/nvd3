describe 'NVD3', ->
    describe 'Scatter Chart', ->
        sampleData1 = [
            key: 'Series 1'
            values: [
                [-1,-1]
                [0,0]
                [1,1]
                [2,2]
            ]
        ]

        svg = null
        model = null


        options =
            x: (d)-> d[0]
            y: (d)-> d[1]
            size: 4
            margin:
                top: 30
                right: 20
                bottom: 50
                left: 75
            width: 200
            height: 200
            color: nv.utils.defaultColor()
            showDistX: true
            showDistY: true
            showControls: true
            showLegend: true
            showXAxis: true
            showYAxis: true
            rightAlignYAxis: false
            fisheye: false
            xPadding: 0
            yPadding: 0
            tooltips: true
            tooltipContent: (d)-> 'hello'
            tooltipXContent: (d)-> 'x content'
            tooltipYContent: (d)-> 'y content'
            noData: 'No Data Available'
            duration: 0

        builder = null
        beforeEach ->
            builder = new ChartBuilder nv.models.scatterChart()

        afterEach ->
            builder.teardown()

        it 'api check', ->
            builder.build options, sampleData1

            for opt of options
                should.exist builder.model[opt](), "#{opt} can be called"

        it 'renders', ->
            builder.build options, sampleData1
            wrap = builder.$ 'g.nvd3.nv-scatterChart'
            should.exist wrap[0], 'scatter chart wrap exists'

