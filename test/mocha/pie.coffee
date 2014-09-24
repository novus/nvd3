describe 'NVD3', ->
    describe 'Pie Chart', ->
        sampleData1 = [
            {label: 'America', value: 100}
            {label: 'Europe', value: 200}
            {label: 'Asia', value: 50}
            {label: 'Africa', value: 70}
        ]

        options =
            x: (d)-> d.label
            y: (d)-> d.value
            margin:
                top: 30
                right: 20
                bottom: 50
                left: 75
            width: 200
            height: 200
            color: nv.utils.defaultColor()
            showLegend: true
            valueFormat: (d)-> d.toFixed 2
            showLabels: true
            donutLabelsOutside: false
            pieLabelsOutside: true
            donut: false
            donutRatio: 0.5
            labelThreshold: 0.02
            labelType: 'key'
            tooltips: true
            tooltipContent: (key,x,y)-> "<h3>#{key}</h3>"
            noData: 'No Data Available'
            duration: 0

        builder = null
        beforeEach ->
            builder = new ChartBuilder nv.models.pieChart()
            builder.build options, sampleData1

        afterEach ->
            builder.teardown()

        it 'api check', ->
            for opt of options
                should.exist builder.model[opt](), "#{opt} can be called"

        describe 'renders', ->

            wrap = null
            labels = null

            beforeEach ->
              wrap = builder.$ 'g.nvd3.nv-pieChart'
              labels = wrap[0].querySelectorAll('.nv-label text')

            it '.nv-pieChart', ->
              should.exist wrap[0]

            describe 'labels correctly', ->
              it "[#{sampleData1.length}] labels", ->
                wrap[0].querySelectorAll('.nv-label').should.have.length sampleData1.length

              for item, i in sampleData1
                do (item, i) ->
                  it "label '#{item.label}'", ->
                    item.label.should.be.equal labels[i].textContent

        it 'has correct structure', ->
          cssClasses = [
            '.nv-pieWrap'
            '.nv-pie'
            '.nv-pieLabels'
            '.nv-legendWrap'
          ]
          for cssClass in cssClasses
            do (cssClass) ->
              should.exist builder.$("g.nvd3.nv-pieChart #{cssClass}")[0]