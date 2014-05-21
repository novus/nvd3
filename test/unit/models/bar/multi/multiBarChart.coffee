apiTest.config.multiBarChart =
    ctor: MultiBarChart
    name: 'multiBarChart'
    parent: 'chart'
    options: [
        'margin'
        'width'
        'height'
        'color'
        'showControls'
        'showLegend'
        'rotateLabels'
        'staggerLabels'
        'state'
        'defaultState'
        'transitionDuration'
        'duration'
    ]
    overrides: [
      'tooltips'
    ]
    submodels:
        multibar: nv.models.multiBar
        legend: nv.models.legend
        xAxis: nv.models.axis
        yAxis: nv.models.axis
    inheritedInstance:
        multibar: [
            'x'
            'y'
            'xDomain'
            'yDomain'
            'xRange'
            'yRange'
            'forceX'
            'forceY'
            'clipEdge'
            'id'
            'stacked'
            'stackOffset'
            'delay'
            'barColor'
            'groupSpacing'
            'xScale'
            'yScale'
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

apiTest.run 'multiBarChart'
