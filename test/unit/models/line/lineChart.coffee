apiTest.config.lineChart =
    ctor: LineChart
    name: 'lineChart'
    parent: 'chart'
    options: [
        'margin'
        'width'
        'height'
        'color'
        'showXAxis'
        'showYAxis'
        'tooltips'
        'tooltipContent'
        'state'
        'defaultState'
        'noData'
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
          'margin'
          'width'
          'height'
          'interpolate'
          'isArea'
          'duration'
          'transitionDuration'
          'x'
          'y'
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
