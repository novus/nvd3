describe 'NVD3', ->
    describe 'Axis', ->
        sampleData1 = [
            key: 'Series 1'
            values: [
                [-1,-1]
                [0,0]
                [1,1]
                [2,2]
            ]
        ]

        options =
            x: (d)-> d[0]
            y: (d)-> d[1]

        axisOptions =
            margin:
                top: 0
                right: 0
                bottom: 0
                left: 0
            width: 75
            height: 60
            axisLabel: 'Date'
            showMaxMin: true
            highlightZero: true
            scale: d3.scale.linear()
            rotateYLabel: true
            rotateLabels: 0
            staggerLabels: false
            axisLabelDistance: 12
            duration: 0

        builder = null
        beforeEach ->
            builder = new ChartBuilder nv.models.lineChart()
            builder.build options, sampleData1

        afterEach ->
            builder.teardown()

        it 'api check', ->
            axis = builder.model.xAxis

            for opt, val of axisOptions
                axis[opt](val)
                should.exist axis[opt](), "#{opt} can be called"
