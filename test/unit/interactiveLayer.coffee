

should = chai.should()

apiTest = apiTest || {}

apiTest.interactiveGuideline = (instance, overrides=[])->
    options = [
        'margin'
        'width'
        'height'
        'xScale'
        'showGuideLine'
        'svgContainer'
        'renderGuideLine'
    ]

    describe 'InteractiveGuideline API', ->
        checkProperties
            instance: instance
            properties: options
            overrides: overrides
            parent: InteractiveGuideline

describe 'InteractiveGuideline Model', ->
    apiTest.interactiveGuideline nv.interactiveGuideline()



