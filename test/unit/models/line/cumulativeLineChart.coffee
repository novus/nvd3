should = chai.should()

apiTest = apiTest || {}

apiTest.cumulativeLineChart = (instance, overrides=[])->
    options = [
        'margin'
        'width'
        'height'
        'color'
        'rescaleY'
        'showControls'
        'useInteractiveGuideline'
        'showLegend'
        'showXAxis'
        'showYAxis'
        'rightAlignYAxis'
        'tooltips'
        'tooltipContent'
        'state'
        'defaultState'
        'noData'
        'average'
        'transitionDuration'
        'duration'
        'noErrorCheck'
    ]

    describe 'Inherited API', ->
        apiTest.chart instance

    describe 'CumulativeLineChart API', ->
        checkProperties
            instance: instance
            properties: options
            overrides: overrides
            parent: CumulativeLineChart

describe 'CumulativeLineChart Model', ->
    apiTest.cumulativeLineChart nv.models.cumulativeLineChart()

    describe 'Submodels', ->
        instance = nv.models.cumulativeLineChart()
        submodels =
            lines: nv.models.line
            legend: nv.models.legend
            xAxis: nv.models.axis
            yAxis: nv.models.axis
            interactiveLayer: nv.interactiveGuideline

        for key, model of submodels
            describe "#{key}", ->
                it 'exists', ->
                    should.exist instance[key]
                checkForDuck instance[key], model()

    describe 'Inherited instance properties', ->
        instance = nv.models.lineChart()
        lineBind = [
            'defined'
            'isArea'
            'x'
            'y'
            'xScale'
            'yScale'
            'size'
            'xDomain'
            'yDomain'
            'xRange'
            'yRange'
            'forceX'
            'forceY'
            'interactive'
            'clipEdge'
            'clipVoronoi'
            'useVoronoi'
            'id'
        ]
        describe 'from line', ->
            checkInstanceProp instance, instance.lines, lineBind

    describe 'Instance properties', ->
        events = [
            'tooltipShow'
            'tooltipHide'
            'stateChange'
            'changeState'
            'renderEnd'
        ]
        checkDispatch nv.models.cumulativeLineChart, events
        checkOptionsFunc nv.models.cumulativeLineChart



