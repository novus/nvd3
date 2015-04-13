describe 'NVD3', ->
    describe 'Stacked Area Chart', ->
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
            showControls: true
            showXAxis: true
            showYAxis: true
            rightAlignYAxis: false
            useInteractiveGuideline: true
            tooltips: true
            tooltipContent: (key,x,y)-> "<h3>#{key}</h3>"
            noData: 'No Data Available'
            duration: 0
            controlLabels:
                stacked: 'Stacked'
                stream: 'Stream'
                expanded: 'Expanded'

        builder = null
        beforeEach ->
            builder = new ChartBuilder nv.models.stackedAreaChart()
            builder.build options, sampleData1

        afterEach ->
            builder.teardown()

        it 'api check', ->
            for opt of options
                should.exist builder.model[opt](), "#{opt} can be called"

        it 'renders', ->
            wrap = builder.$ 'g.nvd3.nv-stackedAreaChart'
            should.exist wrap[0]

        it 'has correct structure', ->
          cssClasses = [
            '.nv-x.nv-axis'
            '.nv-y.nv-axis'
            '.nv-stackedWrap'
            '.nv-legendWrap'
            '.nv-controlsWrap'
            '.nv-interactive'
          ]

          for cssClass in cssClasses
            do (cssClass) ->
              should.exist builder.$("g.nvd3.nv-stackedAreaChart #{cssClass}")[0]
