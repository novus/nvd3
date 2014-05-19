apiTest.config.scatter =
    ctor: Scatter
    name: 'scatter'
    parent: 'layer'
    options: [
        'clearHighlights'
        'highlightPoint'
        'x'
        'y'
        'size'
        'margin'
        'width'
        'height'
        'xScale'
        'yScale'
        'zScale'
        'xDomain'
        'yDomain'
        'sizeDomain'
        'xRange'
        'yRange'
        'sizeRange'
        'forceX'
        'forceY'
        'forceSize'
        'interactive'
        'pointKey'
        'pointActive'
        'padData'
        'padDataOuter'
        'clipEdge'
        'clipVoronoi'
        'useVoronoi'
        'clipRadius'
        'color'
        'shape'
        'onlyCircles'
        'id'
        'singlePoint'
        'duration'
    ]
    overrides: [
    	'size'
    ]
    dispatch: true
    optionsFunc: true
    events: [
        'elementClick'
        'elementMouseover'
        'elementMouseout'
        'renderEnd'
    ]

apiTest.run 'scatter'
