describe 'NVD3', ->
    describe 'Line Chart', ->
        sampleData1 = [
            key: 'Series 1'
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
        ,
            key: 'Series 3'
            values: [
                [-1,-5]
                [0,7.2]
                [1,11]
                [2,18.5]
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
            height: 400
            width: 800
            showLegend: true
            showXAxis: true
            showYAxis: true
            rightAlignYAxis: true
            useInteractiveGuideline: true
            tooltips: true
            tooltipContent: (key,x,y)-> "<h3>#{key}</h3>"
            noData: 'No Data Available'
            duration: 0
            clipEdge: false
            isArea: (d)-> d.area
            defined: (d)-> true
            interpolate: 'linear'

        builder = null
        beforeEach ->
            builder = new ChartBuilder nv.models.lineChart()
            builder.build options, sampleData1

        afterEach ->
            builder.teardown()

        it 'api check', ->
            for opt of options
                should.exist builder.model[opt](), "#{opt} can be called"

            builder.model.update()

        it 'renders', ->
            wrap = builder.$ 'g.nvd3.nv-lineChart'
            should.exist wrap[0]

        it 'no data text', ->
            builder = new ChartBuilder nv.models.lineChart()
            builder.build options, []

            noData = builder.$ '.nv-noData'
            noData[0].textContent.should.equal 'No Data Available'

        it 'interactive tooltip', ->
            builder = new ChartBuilder nv.models.lineChart()
            builder.build options, sampleData2

            evt =
                mouseX: 243
                mouseY: 96
                pointXValue: 28.15

            builder.model.interactiveLayer.dispatch.elementMousemove evt

            getGuideline = ->
                line = builder.$ '.nv-interactiveGuideLine line'
                line[0]

            should.exist getGuideline(), 'guideline exists'

            tooltip = document.querySelector '.nvtooltip'
            should.exist tooltip, 'tooltip exists'

            builder.model.interactiveLayer.dispatch.elementMouseout()

        it 'has correct structure', ->
          cssClasses = [
            '.nv-x.nv-axis'
            '.nv-y.nv-axis'
            '.nv-linesWrap'
            '.nv-legendWrap'
            '.nv-line'
            '.nv-scatter'
            '.nv-legend'
          ]
          for cssClass in cssClasses
            do (cssClass) ->
              should.exist builder.$("g.nvd3.nv-lineChart #{cssClass}")[0]