describe 'NVD3', ->
    describe 'Scatter Chart', ->
        sampleData1 = [
            key: 'Series 1'
            slope: 0.5
            intercept: 0.2
            values: [
                [-1,-1]
                [0,0]
                [1,1]
                [2,2]
            ]
        ]

        sampleData2 = [
            key: 'Series 1'
            values: [
                [-1,-3]
                [0,6]
                [1,12]
                [2,18]
            ]
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
            width: 200
            height: 200
            color: nv.utils.defaultColor()
            showDistX: true
            showDistY: true
            showLegend: true
            showXAxis: true
            showYAxis: true
            rightAlignYAxis: false
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
                should.exist builder.model[opt], "#{opt} exists"
                should.exist builder.model[opt](), "#{opt} can be called"

        it 'renders', ->
            wrap = builder.$ 'g.nvd3.nv-scatterChart'
            should.exist wrap[0]

        it 'has correct structure', ->
          cssClasses = [
            '.nv-background'
            '.nv-x.nv-axis'
            '.nv-y.nv-axis'
            '.nv-scatterWrap'
            '.nv-distWrap'
            '.nv-legendWrap'
          ]

          for cssClass in cssClasses
            do (cssClass) ->
              should.exist builder.$("g.nvd3.nv-scatterChart #{cssClass}")[0]

        it 'has data points', ->
            points = builder.$ '.nv-groups .nv-series-0 .nv-point'
            points.should.have.length 4

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

        it 'shows no data message', ->
            builder.teardown()
            builder.build options, []

            noData = builder.$ 'text.nv-noData'
            should.exist noData[0]
            noData[0].textContent.should.equal 'No Data Available'

        it 'can update with new data', ->
            d3.select(builder.svg).datum(sampleData2)
            builder.model.update()

            points1 = builder.$ '.nv-groups .nv-series-0 .nv-point'
            points1.should.have.length 4

            points2 = builder.$ '.nv-groups .nv-series-1 .nv-point'
            points2.should.have.length 4

        it 'scatterPlusLineChart', ->
            builder.teardown()
            sampleData3 = [
                key: 'Series 1'
                values: [
                    [-1,-3]
                    [0,6]
                    [1,12]
                    [2,18]
                ]
                slope: 0.1
                inercept: 5
            ]

            builder.build options, sampleData3

            wrap = builder.$ 'g.nvd3.nv-scatterChart'
            should.exist wrap[0]

            lines = builder.$ 'g.nvd3 .nv-regressionLinesWrap .nv-regLines'
            should.exist lines[0], 'regression lines exist'
