describe 'NVD3', ->
    describe 'Bullet Chart Chart', ->
        sampleData1 =
            title: 'Revenue'
            subtitle: 'US$ in thousands'
            ranges: [150,225,300]
            measures: [220]
            markers: [250]

        options =
            orient: 'left'
            margin:
                top: 30
                right: 20
                bottom: 50
                left: 75
            color: nv.utils.defaultColor()
            ranges: (d)-> d.ranges
            markers: (d)-> d.markers
            measures: (d)-> d.measures
            width: 200
            height: 55
            tickFormat: (d)-> d.toFixed 2
            tooltips: true
            tooltipContent: (key,x,y)-> "<h3>#{key}</h3>"
            noData: 'No Data Available'

        builder = null
        beforeEach ->
            builder = new ChartBuilder nv.models.bulletChart()
            builder.build options, sampleData1

        afterEach ->
            builder.teardown()

        it 'api check', ->
            for opt of options
                should.exist builder.model[opt](), "#{opt} can be called"

        it 'renders', ->
            wrap = builder.$ 'g.nvd3.nv-bulletChart'
            should.exist wrap[0]
