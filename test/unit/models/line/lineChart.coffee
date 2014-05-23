apiTest.config.lineChart =
    ctor: LineChart
    name: 'lineChart'
    parent: 'chart'
    options: [
        'margin'
        'width'
        'height'
        'color'
        'state'
        'defaultState'
        'duration'
        'transitionDuration'
        'useInteractiveGuideline'
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
          'isArea',
          'x',
          'y',
          'size',
          'xScale',
          'yScale',
          'xDomain',
          'yDomain',
          'xRange',
          'yRange',
          'forceX',
          'forceY',
          'interactive',
          'clipEdge',
          'clipVoronoi',
          'useVoronoi',
          'id',
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
