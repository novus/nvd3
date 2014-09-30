describe 'NVD3', ->
    describe 'Cumulative Line Chart', ->
        sampleData1 = [
            key: 'Series 1'
            values: [
                [-1,-1]
                [0,0]
                [1,1]
                [2,2]
            ]
            average: 1.3
        ]

        sampleData2 = [
            key: 'Series 1'
            values: [
                [-1,-3]
                [0,6]
                [1,12]
                [2,18]
            ]
            average: 12.3
        ,
            key: 'Series 2'
            values: [
                [-1,-4]
                [0,7]
                [1,13]
                [2,14]
            ]
        ]

        eventTooltipData = {mouseX: 1250, mouseY: 363, pointXValue: 1271774227712.8547}

        options =
            x: (d)-> d[0]
            y: (d)-> d[1]
            margin:
                top: 10
                right: 20
                bottom: 30
                left: 40
            color: nv.utils.defaultColor()
            showLegend: true
            showXAxis: true
            showYAxis: true
            rightAlignYAxis: false
            useInteractiveGuideline: true
            tooltips: true
            tooltipContent: (key,x,y)-> "<h3>#{key}</h3>"
            noData: 'No Data Available'
            average: (d)-> d.average
            duration: 0
            noErrorCheck: false

        builder1 = null
        beforeEach ->
            builder1 = new ChartBuilder nv.models.cumulativeLineChart()
            builder1.build options, sampleData1

            # remove all tooltips
            elements = document.getElementsByClassName('nvtooltip')
            while(elements[0])
              elements[0].parentNode.removeChild(elements[0])

        afterEach ->
            builder1.teardown()

        it 'api check', ->
            for opt of options
                should.exist builder1.model[opt](), "#{opt} can be called"

        it 'renders', ->
            wrap = builder1.$ 'g.nvd3.nv-cumulativeLine'
            should.exist wrap[0]

        it 'has the element with .nv-cumulativeLine class right positioned', ->
          cumulativeLine = builder1.$ 'g.nvd3.nv-cumulativeLine'
          cumulativeLine[0].getAttribute('transform').should.be.equal "translate(40,30)"

        it 'has correct structure', ->
          cssClasses = [
            '.nv-interactive'
            '.nv-interactiveLineLayer'
            '.nv-interactiveGuideLine'
            '.nv-y.nv-axis'
            '.nv-x.nv-axis'
            '.nv-background'
            '.nv-linesWrap'
            '.nv-line'
            '.nv-scatterWrap'
            '.nv-scatter'
            '.nv-indexLine'
            '.nv-avgLinesWrap'
            '.nv-legendWrap'
            '.nv-controlsWrap'
            '.tempDisabled'
          ]
          for cssClass in cssClasses
            do (cssClass) ->
              should.exist builder1.$("g.nvd3 #{cssClass}")[0]

        describe "applies correctly option", ->

          builder = null
          sampleData = sampleData1

          beforeEach ->
            builder = new ChartBuilder nv.models.cumulativeLineChart()

          afterEach ->
            builder.teardown()

          # todo: ideally it should work, but...
          xit 'margin', ->
            options =
              margin:
                top: 10
                right: 20
                bottom: 30
                left: 40
            builder.build options, sampleData
            builder.$(".nv-cumulativeLine")[0].getAttribute('transform').should.be.equal "translate(40,10)"

          it "color", ->
            options.color = -> "#000000"
            builder.build options, sampleData
            legendSymbol = builder.$(".nv-cumulativeLine .nv-legend-symbol")
            expect(legendSymbol[0].getAttribute("style")).to.contain "fill: rgb(0, 0, 0)"
            expect(legendSymbol[0].getAttribute("style")).to.contain "stroke: rgb(0, 0, 0)"

          describe "showLegend", ->
            it 'true', ->
              options.showLegend = true
              builder.build options, sampleData
              builder.$(".nv-cumulativeLine .nv-legendWrap *").length.should.not.be.equal 0
            it 'false', ->
              options =
                showLegend : false
              builder.build options, sampleData
              builder.$(".nv-cumulativeLine .nv-legendWrap *").length.should.be.equal 0

          describe 'showXAxis', ->
            it 'true', ->
              options.showXAxis = true
              builder.build options, sampleData
              builder.$(".nv-cumulativeLine .nv-axis.nv-x *").length.should.not.be.equal 0
            it 'false', ->
              options.showXAxis = false
              builder.build options, sampleData
              builder.$(".nv-cumulativeLine .nv-axis.nv-x *").length.should.be.equal 0


          describe 'showYAxis', ->
            it 'true', ->
              options.showYAxis = true
              builder.build options, sampleData
              builder.$(".nv-cumulativeLine .nv-axis.nv-y *").length.should.not.be.equal 0
            it 'false', ->
              options.showYAxis = false
              builder.build options, sampleData
              builder.$(".nv-cumulativeLine .nv-axis.nv-y *").length.should.be.equal 0

          describe 'rightAlignYAxis', ->
            it 'true', ->
              options.rightAlignYAxis = true
              builder.build options, sampleData
              builder.$(".nv-cumulativeLine .nv-axis.nv-y")[0].getAttribute('transform').should.be.equal "translate(870,0)"
            it 'false', ->
              options.rightAlignYAxis = false
              builder.build options, sampleData
              assert.isNull builder.$(".nv-cumulativeLine .nv-axis.nv-y")[0].getAttribute('transform')

          describe "useInteractiveGuideline", ->
            it "true", ->
              options.useInteractiveGuideline = true
              builder.build options, sampleData
              builder.$(".nv-cumulativeLine .nv-interactiveLineLayer").should.have.length 1
            it "false", ->
              options.useInteractiveGuideline = false
              builder.build options, sampleData
              builder.$(".nv-cumulativeLine .nv-interactiveLineLayer").should.have.length 0

          # todo: pass this
          describe 'tooltips', ->
            xit "true", ->
              options.tooltips = true
              builder.build options, sampleData
              builder.model.interactiveLayer.dispatch.elementMousemove eventTooltipData
              tooltip = document.querySelector '.nvtooltip'
              should.exist tooltip

            xit "false", ->
              options.tooltips = false
              builder.build options, sampleData
              builder.model.interactiveLayer.dispatch.elementMousemove eventTooltipData
              tooltip = document.querySelector '.nvtooltip'
              should.not.exist tooltip

          # todo: pass this
          describe "noErrorCheck", ->
            xit "true", ->
              options.noErrorCheck = true
              builder.build options, sampleData
            xit "false", ->
              options.noErrorCheck = false
              builder.build options, sampleData
            xit "tooltipContent", ->
              options.tooltipContent = (key,x,y)-> "<h2>#{key}</h2>"
              builder.build options, sampleData
              # show a tooltip
              expect(builder.$(".nv-cumulativeLine .nv-tooltip")).to.contain "<h2>#{sampleData1[0].key}</h2>"

          it "noData", ->
            options.noData = "error error"
            builder.build options, []
            builder.svg.textContent.should.be.equal 'error error'

          it "x", ->
            options.x = (d) -> d[1]
            builder.build options, sampleData
            builder.model.x()([1,2]).should.be.equal 2

          it "y", ->
            options.y = (d) -> d[0]
            builder.build options, sampleData
            builder.model.y()({display: {y: 1}}).should.be.equal 1

          it "average", ->
            options.average = (d)-> d.avg
            builder.build options, sampleData
            builder.model.average()({avg: 1}).should.be.equal 1

          it "duration", ->
            options.duration = 100
            builder.build options, sampleData
            builder.model.duration().should.be.equal 100