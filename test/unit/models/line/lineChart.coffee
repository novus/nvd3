should = chai.should()

apiTest.config.lineChart =
    ctor: LineChart
    name: 'lineChart'
    parent: 'chart'
    options: [
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
    submodels:
        lines: nv.models.line
        legend: nv.models.legend
        xAxis: nv.models.axis
        yAxis: nv.models.axis
        interactiveLayer: nv.interactiveGuideline
    inheritedInstance:
        lines: [
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
            'useVoronoi'
            'id'
            'interpolate'
        ]
    dispatch: true
    optionsFunc: true
    events: [
        'tooltipShow'
        'tooltipHide'
        'stateChange'
        'changeState'
        'renderEnd'
    ]

apiTest.run 'lineChart'
