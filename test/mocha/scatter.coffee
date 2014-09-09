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
            tooltipContent: (d)-> "<h3>#{d}</h3>"
            tooltipXContent: (d)-> 'x content'
            tooltipYContent: (d)-> 'y content'
            noData: 'No Data Available'
            duration: 0

        builder = null
        beforeEach ->
            builder = new ChartBuilder nv.models.scatterChart()
            builder.build options, sampleData1

        afterEach ->
            builder.teardown()

        it 'api check', ->
            for opt of options
                should.exist builder.model[opt](), "#{opt} can be called"

        it 'renders', ->
            wrap = builder.$ 'g.nvd3.nv-scatterChart'
            should.exist wrap[0], 'scatter chart wrap exists'

        it 'has axes', ->
            xaxis = builder.$ '.nv-x .nv-axis'
            yaxis = builder.$ '.nv-y .nv-axis'

            should.exist xaxis[0], 'xaxis exists'
            should.exist yaxis[0], 'yaxis exists'

        it 'has data points', ->
            points = builder.$ '.nv-groups .nv-series-0 circle.nv-point'
            points.should.have.length 4

            expected = [
                {x: '0', y: '120'},
                {x: '35', y: '80'},
                {x: '70', y: '40'},
                {x: '105', y: '0'}
            ]

            for point,i in points
                point.getAttribute('cx').should.equal expected[i].x
                point.getAttribute('cy').should.equal expected[i].y
                should.exist point.getAttribute('r'), 'radius exists'

        it 'has a legend', ->
            legend = builder.$ '.nv-legendWrap'
            should.exist legend, 'legend exists'

        it 'can show a tooltip', ->
            eventData =
                point:
                    series: 0
                    x: -1
                    y: 1
                pointIndex: 0
                pos: [
                    210
                    119
                ]
                series:
                    key: 'Series 1'
                seriesIndex: 0

            builder.model.scatter.dispatch.elementMouseover eventData

            tooltip = document.querySelector '.nvtooltip'
            should.exist tooltip


