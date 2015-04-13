describe 'NVD3', ->
    describe 'Discrete Bar Chart', ->
        sampleData1 = [
            key: 'Series 1'
            values: [
                {label: 'America', value: 100}
                {label: 'Europe', value: 200}
                {label: 'Asia', value: 50}
                {label: 'Africa', value: 70}
            ]
        ]

        options =
            x: (d)-> d.label
            y: (d)-> d.value
            margin:
                top: 30
                right: 20
                bottom: 50
                left: 75
            color: nv.utils.defaultColor()
            showXAxis: true
            showYAxis: true
            rightAlignYAxis: false
            staggerLabels: true
            showValues: true
            valueFormat: (d)-> d.toFixed 2
            tooltips: true
            tooltipContent: (key,x,y)-> "<h3>#{key}</h3>"
            noData: 'No Data Available'
            duration: 0

        builder = null
        beforeEach ->
            builder = new ChartBuilder nv.models.discreteBarChart()
            builder.build options, sampleData1

        afterEach ->
            builder.teardown()

        it 'api check', ->
            for opt of options
                should.exist builder.model[opt](), "#{opt} can be called"

        it 'renders', ->
            wrap = builder.$ 'g.nvd3.nv-discreteBarWithAxes'
            should.exist wrap[0]

        it 'has correct structure', ->
          cssClasses = [
            '.nv-x.nv-axis'
            '.nv-y.nv-axis'
            '.nv-barsWrap'
            '.nv-discretebar'
          ]
          for cssClass in cssClasses
            do (cssClass) ->
              should.exist builder.$("g.nvd3.nv-discreteBarWithAxes #{cssClass}")[0]