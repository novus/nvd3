###
Utility to build an NVD3 chart.
###
class ChartBuilder
    # @model should be something like nv.models.scatterChart()
    constructor: (@model)->

    ###
    options: an object hash of chart options.
    data: sample data to pass in to chart.

    This method builds a chart and puts it on the <body> element.
    ###
    build: (options, data)->
        @svg = document.createElement 'svg'
        document.querySelector('body').appendChild @svg

        for opt, val of options
            unless @model[opt]?
                console.warn "#{opt} not property of model."
            else
                @model[opt](val)

        d3.select(@svg)
        .datum(data)
        .call(@model)

    # Removes chart from <body> element.
    teardown: ->
        if @svg?
            document.querySelector('body').removeChild @svg

    # Runs a simple CSS selector to retrieve elements
    $: (cssSelector)->
        @svg.querySelectorAll cssSelector
