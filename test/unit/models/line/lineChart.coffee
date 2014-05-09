should = chai.should()

apiTest = apiTest || {}

apiTest.lineChart = (instance, overrides=[])->
    options = [
        'margin'
        'width'
        'height'
        'color'
        'showDistX'
        'showDistY'
        'showControls'
        'showLegend'
        'showXAxis'
        'showYAxis'
        'rightAlignYAxis'
        'fisheye'
        'xPadding'
        'yPadding'
        'tooltips'
        'tooltipContent'
        'tooltipXContent'
        'tooltipYContent'
        'state'
        'defaultState'
        'noData'
        'duration'
        'transitionDuration'
    ]

    describe 'Inherited API', ->
        apiTest.chart(instance)

    describe 'LineChart API', ->
        checkProperties
            instance: instance
            properties: options
            overrides: overrides
            parent: LineChart

describe 'LineChart Model', ->
    apiTest.lineChart(nv.models.lineChart())

    describe 'Submodels', ->
        instance = nv.models.lineChart()
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
            'size'
            'xScale'
            'yScale'
            'xDomain'
            'yDomain'
            'xRange'
            'yRange'
            'forceX'
            'forceY'
            'interactive'
            'clipEdge'
            'clipVoronoi'
            'useVoronoi','id'
            'interpolate'
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
        checkDispatch nv.models.lineChart, events
        checkOptionsFunc nv.models.lineChart



