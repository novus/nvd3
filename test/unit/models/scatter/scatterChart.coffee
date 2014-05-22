apiTest.config.scatterChart =
    ctor: ScatterChart
    name: 'scatterChart'
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
        'fisheye'
        'xPadding'
        'yPadding'
        'state'
        'defaultState'
        'duration'
        'tooltipX'
        'tooltipY'
    ]
    overrides: [
        'size'
        'tooltips'
    ]
    submodels:
        scatter: nv.models.scatter
        legend: nv.models.legend
        controls: nv.models.legend
        xAxis: nv.models.axis
        yAxis: nv.models.axis
        distX: nv.models.distribution
        distY: nv.models.distribution
    inheritedInstance:
        scatter: [
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
    dispatch: true
    optionsFunc: true
    events: [
        'tooltipShow'
        'tooltipHide'
        'stateChange'
        'changeState'
        'renderEnd'
    ]

apiTest.run 'scatterChart'
