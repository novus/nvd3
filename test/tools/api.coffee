apiTest = apiTest || {}
apiTest.models = apiTest.models || {}
apiTest.config = apiTest.config || {}
modelNum = 0;

apiTest.run = (name, only)->
    label = name.toFirstUpper()
    config = apiTest.config[name]


    apiTest.models[name] = do (config)-> (instance, overrides)->
        if config.parent?
            describe 'Inherited API', ->
                pOverrides =
                    if overrides?
                        overrides.concat config.overrides 
                    else
                        config.overrides
                apiTest.models[config.parent] instance, pOverrides

        describe "#{label} API", ->
            checkProperties
                instance: instance
                properties: config.options
                overrides: overrides
                parent: config.ctor

    test =
        if only
            describe.only
        else
            describe

    test "#{label} Model #{modelNum++}", ->
        apiTest.models[name] nv.models[name]()

        if config.submodels?
            describe 'Submodels', ->
                instance = nv.models[name]()
                submodels = config.submodels

                for key, model of submodels
                    describe "#{key}", ->
                        it 'exists', ->
                            should.exist instance[key]
                        checkForDuck instance[key], model()

        if config.inheritedInstance?
            describe 'Inherited instance properties', ->
                instance = nv.models[name]()
                for model, props of config.inheritedInstance
                    describe "from #{model}", ->
                        checkInstanceProp instance, instance[model], props

        if config.dispatch or config.optionsFunc
            describe 'Instance properties', ->
                if config.dispatch
                    config.events = config.events || []
                    checkDispatch nv.models[name], config.events
                if config.optionsFunc
                    checkOptionsFunc nv.models[name]

apiTest.run.only = (arg)->
    apiTest.run arg, true