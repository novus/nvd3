describe 'NVD3', ->
    describe 'Parallel Coordinates', ->
        sampleData1 = [
            {
                id: 15,
                year: 73,
                weight: 25.5
            },
            {
                id: 25,
                year: 62,
                weight: 23.2
            },
            {
                id: 17,
                year: 72,
                weight: 25.5
            },
            {
                id: 12,
                year: 72,
                weight: 20.3
            },
            {
                id: 12,
                year: 71,
                weight: 19.5
            }
        ];

        sampleData2 = [
            {
                id: 24,
                year: 53,
                weight: 0.5
            }
        ]

        sampleData3 = [
            {
                id: "Tudor",
                year: 73,
                weight: 25.5
            },
            {
                id: "Tudor",
                year: 62,
                weight: 23.2
            },
            {
                id: "Windsor",
                year: 72,
                weight: 25.5
            },
            {
                id: "Plantagenet",
                year: 72,
                weight: 20.3
            },
            {
                id: "Plantagenet",
                year: 71,
                weight: 19.5
            },
            {
                id: "Plantagenet",
                year: 76,
                weight: 29.8
            }
        ];

        options =
            margin:
                top: 30
                right: 0
                bottom: 10
                left: 0
            width: 200
            height: 200
            dimensionNames: ['id', 'year', 'weight']
            dimensionFormats: ['', '', '']
            lineTension: 0.85
            color: nv.utils.defaultColor()
            enumerateNonNumericDimensions: false

        builder = null
        beforeEach ->
            builder = new ChartBuilder nv.models.parallelCoordinates()
            builder.build options, sampleData1

        afterEach ->
            builder.teardown()

        it 'api check', ->
            should.exist builder.model.options, 'options exposed'
            for opt of options
                should.exist builder.model[opt], "#{opt} exists"
                should.exist builder.model[opt](), "#{opt} can be called"

        it 'renders', ->
            wrap = builder.$ 'g.nvd3.nv-parallelCoordinates'
            should.exist wrap[0]

        it 'clears chart objects for no data', ->
            builder = new ChartBuilder nv.models.parallelCoordinates()
            builder.buildover options, sampleData1, []

            groups = builder.$ 'path.domain'
            groups.length.should.equal 3, 'only vertical axes paths remain'

        it 'has correct structure', ->
          cssClasses = [
            '.background'
            '.foreground'
            '.missingValuesline'
            '.dimension'
            '.nv-axis'
            '.nv-label'
          ]

          for cssClass in cssClasses
            do (cssClass) ->
              should.exist builder.$("g.nv-parallelCoordinates #{cssClass}")[0], "class: " + cssClass

        it 'has path (foreground and background) for each data entry', ->
            points = builder.$ 'path'
            points.should.have.length sampleData1.length * 2 + 3

        it 'has the correct number of axes', ->
            axes = builder.$ 'path.domain'
            axes.should.have.length 3

        it 'has a label for each axis', ->
            labels = builder.$ 'text.nv-parallelCoordinates.nv-label'
            labels.should.have.length 3

        it 'can update with new data', ->
            builder.updateData(sampleData2)

            expAxes = 3
            axesLabels = builder.$ '.nv-parallelCoordinates.nv-label'
            axesLabels.should.have.length expAxes, 'expected num vertical axes labels'

            axes = builder.$ 'path.domain'
            axes.should.have.length expAxes, 'expected num vertical axes'

            paths = builder.$ 'path'
            paths.should.have.length sampleData2.length * 2 + expAxes, 'expected num paths'

        it 'treats non-numeric dimensions as undefined by default', ->
            builder.teardown()
            builder.build options, sampleData3

            expAxes = 2
            axesLabels = builder.$ '.nv-parallelCoordinates.nv-label'
            axesLabels.should.have.length expAxes + 1, 'expected num vertical axes labels'

            axes = builder.$ 'path.domain'
            axes.should.have.length expAxes, 'expected num vertical axes'

            paths = builder.$ 'path'
            paths.should.have.length sampleData3.length * 2 + expAxes, 'expected num paths'

        it 'can enumerate non-numeric dimensions', ->
            newOptions =
                width: 200
                height: 200
                dimensionNames: ['id', 'year', 'weight']
                dimensionFormats: ['', '', '']
                enumerateNonNumericDimensions: true
            builder.teardown()
            builder.build newOptions, sampleData3

            expAxes = 3
            axesLabels = builder.$ '.nv-parallelCoordinates.nv-label'
            axesLabels.should.have.length expAxes, 'expected num vertical axes labels'

            axes = builder.$ 'path.domain'
            axes.should.have.length expAxes, 'expected num vertical axes'

            paths = builder.$ 'path'
            paths.should.have.length sampleData3.length * 2 + expAxes, 'expected num paths'

            # Grab the first axis and check that it has the correct number of ticks:
            # one for each unique value (for that dimension) in the dataset
            axis = builder.svg.querySelector('g.nv-parallelCoordinates.nv-axis')
            ticks = axis.querySelectorAll('g.tick')
            ticks.should.have.length 3, 'expected ticks on first vertical axis'

