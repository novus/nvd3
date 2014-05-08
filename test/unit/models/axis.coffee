should = chai.should()

apiTest = apiTest || {}

apiTest.axis = (instance, overrides=[])->
    options = [
        'margin'
        'width'
        'ticks'
        'height'
        'axisLabel'
        'showMaxMin'
        'highlightZero'
        'scale'
        'rotateYLabel'
        'rotateLabels'
        'staggerLabels'
        'axisLabelDistance'
        'duration'
    ]

    describe 'Inherited APIs', ->
        apiTest.layer(instance)

    describe 'Axis API', ->
        checkProperties
            instance: instance
            properties: options
            overrides: overrides
            parent: Axis


describe 'Axis Model', ->
    apiTest.axis nv.models.axis()

    describe 'Submodels', ->
        instance = null
        before ->
            instance = nv.models.axis()
        submodels = [
            'axis'
            'dispatch'
        ]
        submodels.forEach (model)->
                it "#{model} exists", ->
                    should.exist instance[model]

    describe 'Inherited instance properties', ->
        instance = nv.models.axis()
        axisBind = [
            'orient'
            'tickValues'
            'tickSubdivide'
            'tickSize'
            'tickPadding'
            'tickFormat'
        ]
        scaleBind = [
            'domain'
            'range'
            'rangeBand'
            'rangeBands'
        ]

        describe 'from axis', ->
            checkInstanceProp instance, instance.axis, axisBind
        describe 'from scale', ->
            checkInstanceProp instance, instance.scale(), scaleBind


