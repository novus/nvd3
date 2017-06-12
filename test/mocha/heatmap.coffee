describe 'NVD3', ->
    describe 'Heatmap Plot', ->
        sampleData1 = [
            {day: 'Mo', hour: '1a', value: 16, timeperiod: 'Early morning', weekperiod: 'Week', category: 1},
            {day: 'Mo', hour: '2a', value: 20, timeperiod: 'Early morning', weekperiod: 'Week', category: 2},
            {day: 'Mo', hour: '3a', value: 0, timeperiod: 'Early morning', weekperiod: 'Week', category: 1},
            {day: 'Mo', hour: '4a', value: 0, timeperiod: 'Early morning', weekperiod: 'Week', category: 2},
            {day: 'Mo', hour: '5a', value: 0, timeperiod: 'Morning', weekperiod: 'Week', category: 1},
            {day: 'Mo', hour: '6a', value: 2, timeperiod: 'Morning', weekperiod: 'Week', category: 3},
            {day: 'Mo', hour: '7a', value: 0, timeperiod: 'Morning', weekperiod: 'Week', category: 1},
            {day: 'Mo', hour: '8a', value: 9, timeperiod: 'Morning', weekperiod: 'Week', category: 1},
            {day: 'Mo', hour: '9a', value: 25, timeperiod: 'Late morning', weekperiod: 'Week', category: 2},
            {day: 'Mo', hour: '10a', value: 49, timeperiod: 'Late morning', weekperiod: 'Week', category: 1},
            {day: 'Mo', hour: '11a', value: 57, timeperiod: 'Late morning', weekperiod: 'Week', category: 1},
            {day: 'Mo', hour: '12a', value: 61, timeperiod: 'Late morning', weekperiod: 'Week', category: 1},
            {day: 'Mo', hour: '1p', value: 37, timeperiod: 'Afternoon', weekperiod: 'Week', category: 3},
            {day: 'Mo', hour: '2p', value: 66, timeperiod: 'Afternoon', weekperiod: 'Week', category: 3},
            {day: 'Mo', hour: '3p', value: 70, timeperiod: 'Afternoon', weekperiod: 'Week', category: 2},
            {day: 'Mo', hour: '4p', value: 55, timeperiod: 'Late afternoon', weekperiod: 'Week', category: 3},
            {day: 'Mo', hour: '5p', value: 51, timeperiod: 'Late afternoon', weekperiod: 'Week', category: 1},
            {day: 'Mo', hour: '6p', value: 55, timeperiod: 'Late afternoon', weekperiod: 'Week', category: 1},
            {day: 'Mo', hour: '7p', value: 17, timeperiod: 'Evening', weekperiod: 'Week', category: 3},
            {day: 'Mo', hour: '8p', value: 20, timeperiod: 'Evening', weekperiod: 'Week', category: 3},
            {day: 'Mo', hour: '9p', value: 9, timeperiod: 'Evening', weekperiod: 'Week', category: 1},
            {day: 'Mo', hour: '10p', value: 4, timeperiod: 'Late evening', weekperiod: 'Week', category: 2},
            {day: 'Mo', hour: '11p', value: 0, timeperiod: 'Late evening', weekperiod: 'Week', category: 1},
            {day: 'Mo', hour: '12p', value: 12, timeperiod: 'Late evening', weekperiod: 'Week', category: 3},
            {day: 'Tu', hour: '1a', value: 6, timeperiod: 'Early morning', weekperiod: 'Week', category: 1},
            {day: 'Tu', hour: '2a', value: 2, timeperiod: 'Early morning', weekperiod: 'Week', category: 2},
            {day: 'Tu', hour: '3a', value: 0, timeperiod: 'Early morning', weekperiod: 'Week', category: 1},
            {day: 'Tu', hour: '4a', value: 0, timeperiod: 'Early morning', weekperiod: 'Week', category: 2},
            {day: 'Tu', hour: '5a', value: 0, timeperiod: 'Morning', weekperiod: 'Week', category: 1},
            {day: 'Tu', hour: '6a', value: 2, timeperiod: 'Morning', weekperiod: 'Week', category: 3},
            {day: 'Tu', hour: '7a', value: 4, timeperiod: 'Morning', weekperiod: 'Week', category: 1},
            {day: 'Tu', hour: '8a', value: 11, timeperiod: 'Morning', weekperiod: 'Week', category: 1},
            {day: 'Tu', hour: '9a', value: 28, timeperiod: 'Late morning', weekperiod: 'Week', category: 2},
            {day: 'Tu', hour: '10a', value: 49, timeperiod: 'Late morning', weekperiod: 'Week', category: 1},
            {day: 'Tu', hour: '11a', value: 51, timeperiod: 'Late morning', weekperiod: 'Week', category: 1},
            {day: 'Tu', hour: '12a', value: 47, timeperiod: 'Late morning', weekperiod: 'Week', category: 1},
            {day: 'Tu', hour: '1p', value: 38, timeperiod: 'Afternoon', weekperiod: 'Week', category: 3},
            {day: 'Tu', hour: '2p', value: 65, timeperiod: 'Afternoon', weekperiod: 'Week', category: 3},
            {day: 'Tu', hour: '3p', value: 60, timeperiod: 'Afternoon', weekperiod: 'Week', category: 2},
            {day: 'Tu', hour: '4p', value: 50, timeperiod: 'Late afternoon', weekperiod: 'Week', category: 3},
            {day: 'Tu', hour: '5p', value: 65, timeperiod: 'Late afternoon', weekperiod: 'Week', category: 1},
            {day: 'Tu', hour: '6p', value: 50, timeperiod: 'Late afternoon', weekperiod: 'Week', category: 1},
            {day: 'Tu', hour: '7p', value: 22, timeperiod: 'Evening', weekperiod: 'Week', category: 3},
            {day: 'Tu', hour: '8p', value: 11, timeperiod: 'Evening', weekperiod: 'Week', category: 3},
            {day: 'Tu', hour: '9p', value: 12, timeperiod: 'Evening', weekperiod: 'Week', category: 1},
            {day: 'Tu', hour: '10p', value: 9, timeperiod: 'Late evening', weekperiod: 'Week', category: 2},
            {day: 'Tu', hour: '11p', value: 0, timeperiod: 'Late evening', weekperiod: 'Week', category: 1},
            {day: 'Tu', hour: '12p', value: 13, timeperiod: 'Late evening', weekperiod: 'Week', category: 3},
            {day: 'We', hour: '1a', value: 5, timeperiod: 'Early morning', weekperiod: 'Week', category: 1},
            {day: 'We', hour: '2a', value: 8, timeperiod: 'Early morning', weekperiod: 'Week', category: 2},
            {day: 'We', hour: '3a', value: 8, timeperiod: 'Early morning', weekperiod: 'Week', category: 1},
            {day: 'We', hour: '4a', value: 0, timeperiod: 'Early morning', weekperiod: 'Week', category: 2},
            {day: 'We', hour: '5a', value: 0, timeperiod: 'Morning', weekperiod: 'Week', category: 1},
            {day: 'We', hour: '6a', value: 2, timeperiod: 'Morning', weekperiod: 'Week', category: 3},
            {day: 'We', hour: '7a', value: 5, timeperiod: 'Morning', weekperiod: 'Week', category: 1},
            {day: 'We', hour: '8a', value: 12, timeperiod: 'Morning', weekperiod: 'Week', category: 1},
            {day: 'We', hour: '9a', value: 34, timeperiod: 'Late morning', weekperiod: 'Week', category: 2},
            {day: 'We', hour: '10a', value: 43, timeperiod: 'Late morning', weekperiod: 'Week', category: 1},
            {day: 'We', hour: '11a', value: 54, timeperiod: 'Late morning', weekperiod: 'Week', category: 1},
            {day: 'We', hour: '12a', value: 44, timeperiod: 'Late morning', weekperiod: 'Week', category: 1},
            {day: 'We', hour: '1p', value: 40, timeperiod: 'Afternoon', weekperiod: 'Week', category: 3},
            {day: 'We', hour: '2p', value: 48, timeperiod: 'Afternoon', weekperiod: 'Week', category: 3},
            {day: 'We', hour: '3p', value: 54, timeperiod: 'Afternoon', weekperiod: 'Week', category: 2},
            {day: 'We', hour: '4p', value: 59, timeperiod: 'Late afternoon', weekperiod: 'Week', category: 3},
            {day: 'We', hour: '5p', value: 60, timeperiod: 'Late afternoon', weekperiod: 'Week', category: 1},
            {day: 'We', hour: '6p', value: 51, timeperiod: 'Late afternoon', weekperiod: 'Week', category: 1},
            {day: 'We', hour: '7p', value: 21, timeperiod: 'Evening', weekperiod: 'Week', category: 3},
            {day: 'We', hour: '8p', value: 16, timeperiod: 'Evening', weekperiod: 'Week', category: 3},
            {day: 'We', hour: '9p', value: 9, timeperiod: 'Evening', weekperiod: 'Week', category: 1},
            {day: 'We', hour: '10p', value: 5, timeperiod: 'Late evening', weekperiod: 'Week', category: 2},
            {day: 'We', hour: '11p', value: 4, timeperiod: 'Late evening', weekperiod: 'Week', category: 1},
            {day: 'We', hour: '12p', value: 7, timeperiod: 'Late evening', weekperiod: 'Week', category: 3},
            {day: 'Th', hour: '1a', value: 0, timeperiod: 'Early morning', weekperiod: 'Week', category: 1},
            {day: 'Th', hour: '2a', value: 0, timeperiod: 'Early morning', weekperiod: 'Week', category: 2},
            {day: 'Th', hour: '3a', value: 0, timeperiod: 'Early morning', weekperiod: 'Week', category: 1},
            {day: 'Th', hour: '4a', value: 0, timeperiod: 'Early morning', weekperiod: 'Week', category: 2},
            {day: 'Th', hour: '5a', value: 0, timeperiod: 'Morning', weekperiod: 'Week', category: 1},
            {day: 'Th', hour: '6a', value: 2, timeperiod: 'Morning', weekperiod: 'Week', category: 3},
            {day: 'Th', hour: '7a', value: 4, timeperiod: 'Morning', weekperiod: 'Week', category: 1},
            {day: 'Th', hour: '8a', value: 13, timeperiod: 'Morning', weekperiod: 'Week', category: 1},
            {day: 'Th', hour: '9a', value: 26, timeperiod: 'Late morning', weekperiod: 'Week', category: 2},
            {day: 'Th', hour: '10a', value: 58, timeperiod: 'Late morning', weekperiod: 'Week', category: 1},
            {day: 'Th', hour: '11a', value: 61, timeperiod: 'Late morning', weekperiod: 'Week', category: 1},
            {day: 'Th', hour: '12a', value: 59, timeperiod: 'Late morning', weekperiod: 'Week', category: 1},
            {day: 'Th', hour: '1p', value: 53, timeperiod: 'Afternoon', weekperiod: 'Week', category: 3},
            {day: 'Th', hour: '2p', value: 54, timeperiod: 'Afternoon', weekperiod: 'Week', category: 3},
            {day: 'Th', hour: '3p', value: 64, timeperiod: 'Afternoon', weekperiod: 'Week', category: 2},
            {day: 'Th', hour: '4p', value: 55, timeperiod: 'Late afternoon', weekperiod: 'Week', category: 3},
            {day: 'Th', hour: '5p', value: 52, timeperiod: 'Late afternoon', weekperiod: 'Week', category: 1},
            {day: 'Th', hour: '6p', value: 53, timeperiod: 'Late afternoon', weekperiod: 'Week', category: 1},
            {day: 'Th', hour: '7p', value: 18, timeperiod: 'Evening', weekperiod: 'Week', category: 3},
            {day: 'Th', hour: '8p', value: 3, timeperiod: 'Evening', weekperiod: 'Week', category: 3},
            {day: 'Th', hour: '9p', value: 9, timeperiod: 'Evening', weekperiod: 'Week', category: 1},
            {day: 'Th', hour: '10p', value: 12, timeperiod: 'Late evening', weekperiod: 'Week', category: 2},
            {day: 'Th', hour: '11p', value: 2, timeperiod: 'Late evening', weekperiod: 'Week', category: 1},
            {day: 'Th', hour: '12p', value: 8, timeperiod: 'Late evening', weekperiod: 'Week', category: 3},
            {day: 'Fr', hour: '1a', value: 2, timeperiod: 'Early morning', weekperiod: 'Week', category: 1},
            {day: 'Fr', hour: '2a', value: 0, timeperiod: 'Early morning', weekperiod: 'Week', category: 2},
            {day: 'Fr', hour: '3a', value: 8, timeperiod: 'Early morning', weekperiod: 'Week', category: 1},
            {day: 'Fr', hour: '4a', value: 2, timeperiod: 'Early morning', weekperiod: 'Week', category: 2},
            {day: 'Fr', hour: '5a', value: 0, timeperiod: 'Morning', weekperiod: 'Week', category: 1},
            {day: 'Fr', hour: '6a', value: 2, timeperiod: 'Morning', weekperiod: 'Week', category: 3},
            {day: 'Fr', hour: '7a', value: 4, timeperiod: 'Morning', weekperiod: 'Week', category: 1},
            {day: 'Fr', hour: '8a', value: 14, timeperiod: 'Morning', weekperiod: 'Week', category: 1},
            {day: 'Fr', hour: '9a', value: 31, timeperiod: 'Late morning', weekperiod: 'Week', category: 2},
            {day: 'Fr', hour: '10a', value: 48, timeperiod: 'Late morning', weekperiod: 'Week', category: 1},
            {day: 'Fr', hour: '11a', value: 46, timeperiod: 'Late morning', weekperiod: 'Week', category: 1},
            {day: 'Fr', hour: '12a', value: 50, timeperiod: 'Late morning', weekperiod: 'Week', category: 1},
            {day: 'Fr', hour: '1p', value: 66, timeperiod: 'Afternoon', weekperiod: 'Week', category: 3},
            {day: 'Fr', hour: '2p', value: 54, timeperiod: 'Afternoon', weekperiod: 'Week', category: 3},
            {day: 'Fr', hour: '3p', value: 56, timeperiod: 'Afternoon', weekperiod: 'Week', category: 2},
            {day: 'Fr', hour: '4p', value: 67, timeperiod: 'Late afternoon', weekperiod: 'Week', category: 3},
            {day: 'Fr', hour: '5p', value: 54, timeperiod: 'Late afternoon', weekperiod: 'Week', category: 1},
            {day: 'Fr', hour: '6p', value: 23, timeperiod: 'Late afternoon', weekperiod: 'Week', category: 1},
            {day: 'Fr', hour: '7p', value: 14, timeperiod: 'Evening', weekperiod: 'Week', category: 3},
            {day: 'Fr', hour: '8p', value: 6, timeperiod: 'Evening', weekperiod: 'Week', category: 3},
            {day: 'Fr', hour: '9p', value: 8, timeperiod: 'Evening', weekperiod: 'Week', category: 1},
            {day: 'Fr', hour: '10p', value: 7, timeperiod: 'Late evening', weekperiod: 'Week', category: 2},
            {day: 'Fr', hour: '11p', value: 0, timeperiod: 'Late evening', weekperiod: 'Week', category: 1},
            {day: 'Fr', hour: '12p', value: 8, timeperiod: 'Late evening', weekperiod: 'Week', category: 3},
            {day: 'Sa', hour: '1a', value: 2, timeperiod: 'Early morning', weekperiod: 'Weekend', category: 1},
            {day: 'Sa', hour: '2a', value: 0, timeperiod: 'Early morning', weekperiod: 'Weekend', category: 2},
            {day: 'Sa', hour: '3a', value: 2, timeperiod: 'Early morning', weekperiod: 'Weekend', category: 1},
            {day: 'Sa', hour: '4a', value: 0, timeperiod: 'Early morning', weekperiod: 'Weekend', category: 2},
            {day: 'Sa', hour: '5a', value: 0, timeperiod: 'Morning', weekperiod: 'Weekend', category: 1},
            {day: 'Sa', hour: '6a', value: 0, timeperiod: 'Morning', weekperiod: 'Weekend', category: 3},
            {day: 'Sa', hour: '7a', value: 4, timeperiod: 'Morning', weekperiod: 'Weekend', category: 1},
            {day: 'Sa', hour: '8a', value: 8, timeperiod: 'Morning', weekperiod: 'Weekend', category: 1},
            {day: 'Sa', hour: '9a', value: 8, timeperiod: 'Late morning', weekperiod: 'Weekend', category: 2},
            {day: 'Sa', hour: '10a', value: 6, timeperiod: 'Late morning', weekperiod: 'Weekend', category: 1},
            {day: 'Sa', hour: '11a', value: 14, timeperiod: 'Late morning', weekperiod: 'Weekend', category: 1},
            {day: 'Sa', hour: '12a', value: 12, timeperiod: 'Late morning', weekperiod: 'Weekend', category: 1},
            {day: 'Sa', hour: '1p', value: 9, timeperiod: 'Afternoon', weekperiod: 'Weekend', category: 3},
            {day: 'Sa', hour: '2p', value: 14, timeperiod: 'Afternoon', weekperiod: 'Weekend', category: 3},
            {day: 'Sa', hour: '3p', value: 0, timeperiod: 'Afternoon', weekperiod: 'Weekend', category: 2},
            {day: 'Sa', hour: '4p', value: 4, timeperiod: 'Late afternoon', weekperiod: 'Weekend', category: 3},
            {day: 'Sa', hour: '5p', value: 7, timeperiod: 'Late afternoon', weekperiod: 'Weekend', category: 1},
            {day: 'Sa', hour: '6p', value: 6, timeperiod: 'Late afternoon', weekperiod: 'Weekend', category: 1},
            {day: 'Sa', hour: '7p', value: 0, timeperiod: 'Evening', weekperiod: 'Weekend', category: 3},
            {day: 'Sa', hour: '8p', value: 0, timeperiod: 'Evening', weekperiod: 'Weekend', category: 3},
            {day: 'Sa', hour: '9p', value: 0, timeperiod: 'Evening', weekperiod: 'Weekend', category: 1},
            {day: 'Sa', hour: '10p', value: 0, timeperiod: 'Late evening', weekperiod: 'Weekend', category: 2},
            {day: 'Sa', hour: '11p', value: 0, timeperiod: 'Late evening', weekperiod: 'Weekend', category: 1},
            {day: 'Sa', hour: '12p', value: 0, timeperiod: 'Late evening', weekperiod: 'Weekend', category: 3},
            {day: 'Su', hour: '1a', value: 7, timeperiod: 'Early morning', weekperiod: 'Weekend', category: 1},
            {day: 'Su', hour: '2a', value: 6, timeperiod: 'Early morning', weekperiod: 'Weekend', category: 2},
            {day: 'Su', hour: '3a', value: 0, timeperiod: 'Early morning', weekperiod: 'Weekend', category: 1},
            {day: 'Su', hour: '4a', value: 0, timeperiod: 'Early morning', weekperiod: 'Weekend', category: 2},
            {day: 'Su', hour: '5a', value: 0, timeperiod: 'Morning', weekperiod: 'Weekend', category: 1},
            {day: 'Su', hour: '6a', value: 0, timeperiod: 'Morning', weekperiod: 'Weekend', category: 3},
            {day: 'Su', hour: '7a', value: 0, timeperiod: 'Morning', weekperiod: 'Weekend', category: 1},
            {day: 'Su', hour: '8a', value: 0, timeperiod: 'Morning', weekperiod: 'Weekend', category: 1},
            {day: 'Su', hour: '9a', value: 0, timeperiod: 'Late morning', weekperiod: 'Weekend', category: 2},
            {day: 'Su', hour: '10a', value: 0, timeperiod: 'Late morning', weekperiod: 'Weekend', category: 1},
            {day: 'Su', hour: '11a', value: 2, timeperiod: 'Late morning', weekperiod: 'Weekend', category: 1},
            {day: 'Su', hour: '12a', value: 2, timeperiod: 'Late morning', weekperiod: 'Weekend', category: 1},
            {day: 'Su', hour: '1p', value: 5, timeperiod: 'Afternoon', weekperiod: 'Weekend', category: 3},
            {day: 'Su', hour: '2p', value: 6, timeperiod: 'Afternoon', weekperiod: 'Weekend', category: 3},
            {day: 'Su', hour: '3p', value: 0, timeperiod: 'Afternoon', weekperiod: 'Weekend', category: 2},
            {day: 'Su', hour: '4p', value: 4, timeperiod: 'Late afternoon', weekperiod: 'Weekend', category: 3},
            {day: 'Su', hour: '5p', value: 0, timeperiod: 'Late afternoon', weekperiod: 'Weekend', category: 1},
            {day: 'Su', hour: '6p', value: 2, timeperiod: 'Late afternoon', weekperiod: 'Weekend', category: 1},
            {day: 'Su', hour: '7p', value: 10, timeperiod: 'Evening', weekperiod: 'Weekend', category: 3},
            {day: 'Su', hour: '8p', value: 7, timeperiod: 'Evening', weekperiod: 'Weekend', category: 3},
            {day: 'Su', hour: '9p', value: 0, timeperiod: 'Evening', weekperiod: 'Weekend', category: 1},
            {day: 'Su', hour: '10p', value: 19, timeperiod: 'Late evening', weekperiod: 'Weekend', category: 2},
            {day: 'Su', hour: '11p', value: 9, timeperiod: 'Late evening', weekperiod: 'Weekend', category: 1},
            {day: 'Su', hour: '12p', value: 4, timeperiod: 'Late evening', weekperiod: 'Weekend', category: 3}
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

        it 'has all cells', ->
            cells = builder.$ '.heatMap'
            cells.should.have.length 168, 'cells exist'

        it 'has proper cell dimensions', ->
            cells = builder.$ '.heatMap'
            parseInt( builder.$(".nv-cell rect")[0].getAttribute('height') ).should.be.equal parseInt( builder.$(".nv-cell rect")[0].getAttribute('width') )
