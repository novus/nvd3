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
        'state'
        'defaultState'
        'average'
        'transitionDuration'
        'duration'
        'noErrorCheck'
        'x'
        'y'
    ]
    overrides: [
      'tooltips'
    ]
    submodels:
        lines: nv.models.line
        legend: nv.models.legend
        xAxis: nv.models.axis
        yAxis: nv.models.axis
        interactiveLayer: nv.interactiveGuideline
    inheritedInstance:
        lines: [
            'isArea'
            'x'
            'y'
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