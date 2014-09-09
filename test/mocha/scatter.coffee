describe 'NVD3', ->
    describe 'Scatter Chart', ->
        sampleData1 = [
            key: 'Series 1'
            values: [
                [-1,-1]
                [0,0]
                [1,1]
                [2,2]
            ]
        ]

        svg = null

        beforeEach ->
            svg = document.createElement 'svg'
            document.querySelector('body').appendChild svg

            model = nv.models.scatterChart()

            d3.select(svg)
            .datum(sampleData1)
            .transition()
            .duration(0)
            .call(model)

        it 'sanity', ->
            expect(true).to.be.true
            console.log svg
