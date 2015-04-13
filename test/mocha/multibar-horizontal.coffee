describe 'NVD3', ->
    describe 'MultiBar Horizontal Chart', ->
        sampleData1 = [
            key: 'Series 1'
            values: [
                {label: 'America', value: 100}
                {label: 'Europe', value: 200}
                {label: 'Asia', value: 50}
                {label: 'Africa', value: 70}
            ]
        ,
            key: 'Series 2'
            values: [
                {label: 'America', value: 110}
                {label: 'Europe', value: 230}
                {label: 'Asia', value: 51}
                {label: 'Africa', value: 78}
            ]
        ,
            key: 'Series 3'
            values: [
                {label: 'America', value: 230}
                {label: 'Europe', value: 280}
                {label: 'Asia', value: 31}
                {label: 'Africa', value: 13}
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
            width: 200
            height: 200
            color: nv.utils.defaultColor()
            stacked: false
            showControls: true
            showLegend: true
            showXAxis: true
            showYAxis: true
            tooltips: true
            tooltipContent: (key,x,y)-> "<h3>#{key}</h3>"
            noData: 'No Data Available'
            duration: 0

        builder = null
        beforeEach ->
            builder = new ChartBuilder nv.models.multiBarHorizontalChart()
            builder.build options, sampleData1

        afterEach ->
            builder.teardown()

        it 'api check', ->
            for opt of options
                should.exist builder.model[opt](), "#{opt} can be called"

        it 'renders', ->
            wrap = builder.$ 'g.nvd3.nv-multiBarHorizontalChart'
            should.exist wrap[0]

        it 'has correct structure', ->
          cssClasses = [
            '.nv-x.nv-axis'
            '.nv-y.nv-axis'
            '.nv-barsWrap'
            '.nv-multibarHorizontal'
            '.nv-legendWrap'
            '.nv-controlsWrap'
          ]
          for cssClass in cssClasses
            do (cssClass) ->
              should.exist builder.$("g.nvd3.nv-multiBarHorizontalChart #{cssClass}")[0]

        it 'renders bars', ->
          bars = builder.$('g.nvd3.nv-multiBarHorizontalChart .nv-multibarHorizontal .nv-bar')
          bars.should.have.length 12
