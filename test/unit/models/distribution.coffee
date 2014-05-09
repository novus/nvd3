should = chai.should()

apiTest = apiTest || {}

apiTest.distribution = (instance, overrides=[])->
    options = [
        'margin'
        'width'
        'axis'
        'size'
        'getData'
        'scale'
        'color'
        'duration'
    ]

    describe 'Inherited API', ->
        apiTest.layer(instance, [], ['height'])
    describe 'Distribution API', ->
        checkProperties
            instance: instance
            properties: options
            overrides: overrides
            parent: Distribution

describe 'Distribution Model', ->
    apiTest.distribution(nv.models.distribution())
    describe 'Instance properties', ->
        events = [
            'renderEnd'
        ]
        checkDispatch nv.models.distribution, events
        checkOptionsFunc nv.models.distribution



