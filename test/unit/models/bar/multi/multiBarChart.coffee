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
        'showXAxis'
        'showYAxis'
        'rightAlignYAxis'
        'rotateLabels'
        'staggerLabels'
        'tooltip'
        'tooltips'
        'tooltipContent'
        'state'
        'defaultState'
        'noData'
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
        #state: nv.utils.state
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
