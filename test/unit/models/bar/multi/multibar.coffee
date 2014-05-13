apiTest.config.multiBar =
    ctor: MultiBar
    name: 'multiBar'
    parent: 'layer'
    options: [
        'x'
        'y'
        'margin'
        'width'
        'height'
        'xScale'
        'yScale'
        'xDomain'
        'yDomain'
        'xRange'
        'yRange'
        'forceY'
        'stacked'
        'stackOffset'
        'clipEdge'
        'color'
        'barColor'
        'disabled'
        'id'
        'hideable'
        'groupSpacing'
        'duration'
        'delay'
    ]
    dispatch: true
    optionsFunc: true
    events: [
        'chartClick'
        'elementClick'
        'elementDblClick'
        'elementMouseover'
        'elementMouseout'
        'renderEnd'
    ]

apiTest.run 'multiBar'
