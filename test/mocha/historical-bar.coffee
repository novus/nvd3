describe 'NVD3', ->
    describe 'Historical Bar Chart', ->
        sampleData1 = [
            key: 'Series 1'
            values: [
                [-1,-1]
                [0,0]
                [1,1]
                [2,2]
            ]
        ]

        mouseOverEventData =
          pos: [0,1]
          series: sampleData1[0]
          seriesIndex: 0
          value: 111
          point: {label: 'America', value: 100, series: 0}
          pointIndex: 0

        options =
            x: (d,i)-> i
            y: (d)-> d[1]
            margin:
                top: 30
                right: 20
                bottom: 50
                left: 75
            width: 200
            height: 200
            color: nv.utils.defaultColor()
            showLegend: true
            showXAxis: true
            showYAxis: true
            rightAlignYAxis: false
            tooltips: true
            tooltipContent: (key,x,y)-> "<h3>#{key}</h3>"
            noData: 'No Data Available'

        builder1 = null
        beforeEach ->
            builder1 = new ChartBuilder nv.models.historicalBarChart()
            builder1.build options, sampleData1

            elements = document.getElementsByClassName('nvtooltip')
            while(elements[0])
              elements[0].parentNode.removeChild(elements[0])

        afterEach ->
            builder1.teardown()

        it 'api check', ->
            for opt of options
                should.exist builder1.model[opt](), "#{opt} can be called"

        it 'renders', ->
            wrap = builder1.$ 'g.nvd3.nv-historicalBarChart'
            should.exist wrap[0]

        it 'has correct structure', ->
          cssClasses = [
            '.nv-x.nv-axis'
            '.nv-y.nv-axis'
            '.nv-barsWrap'
            '.nv-bars'
            '.nv-legendWrap'
          ]
          for cssClass in cssClasses
            do (cssClass) ->
              should.exist builder1.$("g.nvd3.nv-historicalBarChart #{cssClass}")[0]

        describe "applies correctly option", ->

          builder = null
          sampleData = sampleData1

          beforeEach ->
            builder = new ChartBuilder nv.models.historicalBarChart()

          afterEach ->
            builder.teardown()

          # todo: ideally it should be passed
          xit "margin", ->
            options.margin =
              top: 111
              right: 222
              bottom: 333
              left: 444
            builder.build options, sampleData
            builder.$(".nv-historicalBarChart")[0].getAttribute('transform').should.be.equal "translate(444,111)"

          # todo: ideally it should be passed
          xit 'width', ->
            options =
              margin:
                top: 0
                right: 0
                bottom: 0
                left: 0
              width: 500
            builder.build options, sampleData
            builder.$(".nv-historicalBarChart")[0].getBoundingClientRect().width.should.be.equal 500

          # todo: ideally it should be passed but...
          xit 'height', ->
            options =
              margin:
                top: 0
                right: 0
                bottom: 0
                left: 0
              height: 500
            builder.build options, sampleData
            builder.$(".nv-historicalBarChart")[0].getBoundingClientRect().height.should.be.equal 500

          it "color", ->
            options.color = -> "rgb(0, 0, 255)"
            builder.build options, sampleData
            for bar in builder.$(".nv-historicalBarChart .nv-barsWrap .nv-bars rect")
              bar.getAttribute('fill').should.be.equal "rgb(0, 0, 255)"
            builder.$(".nv-historicalBarChart .nv-legend-symbol")[0].style.fill.should.be.equal "rgb(0, 0, 255)"

          describe "showLegend", ->
            it 'true', ->
              options.showLegend = true
              builder.build options, sampleData
              builder.$(".nv-historicalBarChart .nv-legendWrap *").length.should.not.be.equal 0
            it 'false', ->
              options =
                showLegend : false
              builder.build options, sampleData
              builder.$(".nv-historicalBarChart .nv-legendWrap *").length.should.be.equal 0

          describe "showXAxis", ->
            it "true", ->
              options.showXAxis = true
              builder.build options, sampleData
              builder.$(".nv-historicalBarChart .nv-axis.nv-x .nv-axis").length.should.be.above 0
            it "false", ->
              options.showXAxis = false
              builder.build options, sampleData
              builder.$(".nv-historicalBarChart .nv-axis.nv-x .nv-axis").should.have.length 0

          describe "showYAxis", ->
            it "true", ->
              options.showYAxis = true
              builder.build options, sampleData
              builder.$(".nv-historicalBarChart .nv-axis.nv-y .nv-axis").length.should.be.above 0
            it "false", ->
              options.showYAxis = false
              builder.build options, sampleData
              builder.$(".nv-historicalBarChart .nv-axis.nv-y .nv-axis").should.have.length 0

          describe "rightAlignYAxis", ->
            it "true", ->
              options.rightAlignYAxis = true
              builder.build options, sampleData
              builder.$(".nv-historicalBarChart .nv-y.nv-axis")[0]
              .getAttribute("transform").should.be.equal "translate(780,0)"
            it "false", ->
              options.rightAlignYAxis = false
              builder.build options, sampleData
              assert.isUndefined builder.$(".nv-historicalBarChart .nv-y.nv-axis *")[0]

          describe 'tooltips', ->
            it "true", ->
              options.tooltips = true
              builder.build options, sampleData
              builder.model.bars.dispatch.elementMouseover( mouseOverEventData )
              should.exist document.querySelectorAll(".nvtooltip")[0]
            it "false", ->
              options.tooltips = false
              builder.build options, sampleData
              builder.model.bars.dispatch.elementMouseover( mouseOverEventData )
              should.not.exist document.querySelectorAll(".nvtooltip")[0]

          it "tooltipContent", ->
            options.tooltipContent = (key) -> "<strong>#{key}</strong>"
            builder.build options, sampleData
            builder.model.bars.dispatch.elementMouseover( mouseOverEventData )
            document.querySelectorAll(".nvtooltip")[0].innerHTML.should.be.equal "<strong>#{sampleData[0].key}</strong>"

          # todo: it should be passed
          xit "defaultState", ->
            options =
              defaultState: {disabled: [true]}
              state: null
            builder.build options, sampleData
            builder.model.state().should.be.deep.equal {disabled: [true]}

          # todo: it should be passed
          xit "state", ->
            options =
              state: {disabled: [true]}
            builder.build options, sampleData
            builder.model.state().should.be.deep.equal {disabled: [true]}

          it "noData", ->
            options.noData = "error error"
            builder.build options, []
            builder.svg.textContent.should.be.equal 'error error'

          # todo: as far as I understand 'transitionDuration' is about to be deprecated...
          it "transitionDuration", ->
            options =
              transitionDuration: 99
            builder.build options, sampleData
            builder.model.transitionDuration().should.be.equal 99
            #expect(builder.model.transitionDuration()).to.throw(Error)

          xit "duration", ->
            options =
              duration: 100
            builder.build options, sampleData
            builder.model.duration().should.be.equal 100
