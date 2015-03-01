describe 'NVD3', ->
    describe 'Tooltips', ->
        it 'removes tooltip from document', (done)->
            d3.select('body')
            .append('div')
            .classed('nvtooltip', true)

            nv.tooltip.cleanup()

            window.setTimeout ->
                d3.select('.nvtooltip').empty().should.be.true
                d3.select('.nvtooltip-pending-removal').empty().should.be.true
                done()
            , 500
