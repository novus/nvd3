apiTest.config.line =
    ctor: Line
    name: 'line'
    parent: 'layer'
    options: [
        'margin'
        'width'
        'height'
        'interpolate'
        'isArea'
        'duration'
        'transitionDuration'
    ]
    submodels:
        scatter: nv.models.scatter
    inheritedInstance:
      scatter: [
        'x'
        'y'
        'xScale'
        'yScale'
        'zScale'
        'xDomain'
        'yDomain'
        'xRange'
        'yRange'
        'id'
        'interactive'
        'size'
        'sizeDomain'
        'forceX'
        'forceY'
        'forceSize'
        'clipVoronoi'
        'useVoronoi'
        'clipRadius'
        'padData'
        'highlightPoint'
        'clearHighlights'
        'clipEdge'
        'color'
      ]
    dispatch: true
    optionsFunc: true
    events: [
        'elementClick'
        'elementMouseover'
        'elementMouseout'
        'renderEnd'
    ]

apiTest.run 'line'