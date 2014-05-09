apiTest.config.cumulativeLineChart =
    ctor: CumulativeLineChart
    name: 'cumulativeLineChart'
    parent: 'chart'
    options: [
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
    dispatch: true
    optionsFunc: true
    events: [
        'tooltipShow'
        'tooltipHide'
        'stateChange'
        'changeState'
        'renderEnd'
    ]

apiTest.run 'cumulativeLineChart'