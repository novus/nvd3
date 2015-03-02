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

        getTransform = (elem)-> elem[0].getAttribute 'transform'

        it 'api check', ->
            should.exist builder.model.options, 'options exposed'
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

        it 'clears chart objects for no data', ->
            builder = new ChartBuilder nv.models.lineChart()
            builder.buildover options, sampleData1, []
            
            groups = builder.$ 'g'
            groups.length.should.equal 0, 'removes chart components'


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

            tooltip = document.querySelector '.nvtooltip-pending-removal'
            should.exist tooltip, 'hidden tooltip exists after mouseout'

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

        it 'can override axis ticks', ->
            builder.model.xAxis.ticks(34)
            builder.model.yAxis.ticks(56)
            builder.model.update()
            builder.model.xAxis.ticks().should.equal 34
            builder.model.yAxis.ticks().should.equal 56

        it 'can set margin.top and legend position', ->
            builder.model.showLegend true
            builder.model.margin {top: 100}
            builder.model.update()

            wrap = builder.$ '.nv-wrap.nv-lineChart'
            getTransform(wrap).should.equal 'translate(75,130)'

            legend = builder.$ '.nv-legendWrap'
            getTransform(legend).should.equal 'translate(0,-30)'

            builder.model.update()
            wrap = builder.$ '.nv-wrap.nv-lineChart'
            getTransform(wrap).should.equal 'translate(75,130)'

        it 'do not allow margin 0 to clip legend', ->
            builder.model.showLegend true
            builder.model.margin {top: 0}
            builder.model.update()
            wrap = builder.$ '.nv-wrap.nv-lineChart'
            getTransform(wrap).should.equal 'translate(75,30)'

        it 'defaults to reasonable margin.top if no legend', ->
            builder2 = new ChartBuilder nv.models.lineChart()
            opts = 
                showLegend: false

            builder2.build opts, sampleData1

            wrap = builder2.$ '.nv-wrap.nv-lineChart'
            getTransform(wrap).should.equal 'translate(60,30)'

            builder2.teardown()

        it 'defaults to reasonable margin.top if show legend', ->
            builder2 = new ChartBuilder nv.models.lineChart()
            opts = 
                showLegend: true

            builder2.build opts, sampleData1

            wrap = builder2.$ '.nv-wrap.nv-lineChart'
            getTransform(wrap).should.equal 'translate(60,30)'

            builder2.teardown()
