should = chai.should()

apiTest = apiTest || {}

apiTest.scatterChart = (instance, overrides=[])->
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

    describe 'ScatterChart API', ->
        checkProperties
            instance: instance
            properties: options
            overrides: overrides
            parent: ScatterChart

describe 'Scatter Model', ->
    apiTest.scatterChart(nv.models.scatterChart())

    describe 'Inherited instance properties', ->
        instance = nv.models.scatterChart()
        scatterBind = [
            'id'
            'interactive'
            'pointActive'
            'x'
            'y'
            'shape'
            'size'
            'xScale'
            'yScale'
            'zScale'
            'xDomain'
            'yDomain'
            'xRange'
            'yRange'
            'sizeDomain'
            'sizeRange'
            'forceX'
            'forceY'
            'forceSize'
            'clipVoronoi'
            'clipRadius'
            'useVoronoi'
        ]
        describe 'from scatter', ->
            checkInstanceProp instance, instance.scatter, scatterBind

    describe 'Instance properties', ->
        events = [
            'tooltipShow'
            'tooltipHide'
            'stateChange'
            'changeState'
            'renderEnd'
        ]
        checkDispatch nv.models.scatterChart, events
        checkOptionsFunc nv.models.scatterChart



