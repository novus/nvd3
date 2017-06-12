describe 'NVD3', ->
    describe 'Heatmap Plot', ->
        sampleData1 = [
            {day: 'Mo', hour: '1a', value: 16, timeperiod: 'Early morning', weekperiod: 'Week', category: 1},
            {day: 'Mo', hour: '2a', value: 20, timeperiod: 'Early morning', weekperiod: 'Week', category: 2},
            {day: 'Tu', hour: '1a', value: 6, timeperiod: 'Early morning', weekperiod: 'Week', category: 1},
            {day: 'Tu', hour: '2a', value: 2, timeperiod: 'Early morning', weekperiod: 'Week', category: 3},
        ]

        options =
            row: (d)-> d.hour
            column: (d)-> d.hour
            color: (d)-> d.value
            rowMeta: (d)-> d.weekperiod
            columnMeta: (d)-> d.category
            margin:
                top: 30
                right: 60
                bottom: 80
                left: 10
            height: 450
            noData: 'No Data Available'
            duration: 0
            cellAspectRatio: 1
            rightAlignYAxis: true
            normalize: false
            showValues: false
            highContrastText: true
            groupRowMeta: true
            showRowMetaLegend: true
            groupColumnMeta: true
            showColumnMetaLegend: true

        builder = null
        beforeEach ->
            builder = new ChartBuilder nv.models.heatMapChart()
            builder.build options, sampleData1

        afterEach ->
            builder.teardown()

        it 'api check', ->
            should.exist builder.model.options, 'options exposed'
            for opt of options
                should.exist builder.model[opt](), "#{opt} can be called"

            builder.model.update()

        it 'renders', ->
            wrap = builder.$ 'g.nvd3.nv-heatMapWithAxes'
            should.exist wrap[0]

        it 'no data text', ->
            builder = new ChartBuilder nv.models.heatMapChart()
            builder.build options, []

            noData = builder.$ '.nv-noData'
            noData[0].textContent.should.equal 'No Data Available'

        it 'has correct structure', ->
          cssClasses = [
            '.nv-x.nv-axis'
            '.nv-y.nv-axis'
            '.nv-heatMapWrap'
            '.nv-wrap'
            '.nv-legendWrap'
            '.nv-legendWrapColumn'
            '.nv-legendWrapRow'
            '.nv-heatmap'
            '.nv-cell'
            '.nv-legend'
            '.nv-title'
          ]
          for cssClass in cssClasses
            do (cssClass) ->
              should.exist builder.$("g.nvd3.nv-heatMapWithAxes #{cssClass}")[0]
