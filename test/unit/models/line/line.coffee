should = chai.should()

apiTest = apiTest || {}

apiTest.line = (instance, overrides=[])->
    options = [
        'margin'
        'width'
        'height'
        'x'
        'y'
        'clipEdge'
        'color'
        'interpolate'
        'defined'
        'isArea'
        'duration'
    ]

    describe 'Inherited API', ->
        apiTest.layer(instance)

    describe 'Line API', ->
        checkProperties
            instance: instance
            properties: options
            overrides: overrides
            parent: Line

describe 'Line Model', ->
    apiTest.line(nv.models.line())

    describe 'Submodels', ->
        instance = nv.models.line()
        describe 'Scatter', ->
            it "exists", ->
                should.exist instance.scatter
            checkForDuck instance.scatter, nv.models.scatter()

    describe 'Instance properties', ->
        events = [
            'elementClick'
            'elementMouseover'
            'elementMouseout'
            'renderEnd'
        ]
        checkDispatch nv.models.scatter, events
        checkOptionsFunc nv.models.scatter


