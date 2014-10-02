describe 'NVD3', ->
    describe 'Line Chart', ->
        sampleData1 = [
            key: 'Series 1'
            values: [
                [-1,-1]
                [0,0]
                [1,1]
                [2,2]
            ]
        ]

        sampleData2 = [
            key: 'Series 1'
            values: [
                [-1,-3]
                [0,6]
                [1,12]
                [2,18]
            ]
        ,
            key: 'Series 2'
            values: [
                [-1,-4]
                [0,7]
                [1,13]
                [2,14]
            ]
        ,
            key: 'Series 3'
            values: [
                [-1,-5]
                [0,7.2]
                [1,11]
                [2,18.5]
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
            x: (d)-> d[0]
            y: (d)-> d[1]
            margin:
                top: 30
                right: 20
                bottom: 50
                left: 75
            color: nv.utils.defaultColor()
            height: 400
            width: 800
            showLegend: true
            showXAxis: true
            showYAxis: true
            rightAlignYAxis: true
            useInteractiveGuideline: true
            tooltips: true
            tooltipContent: (key,x,y)-> "<h3>#{key}</h3>"
            noData: 'No Data Available'
            duration: 0
            clipEdge: false
            isArea: (d)-> d.area
            defined: (d)-> true
            interpolate: 'linear'

        builder1 = null
        beforeEach ->
            builder1 = new ChartBuilder nv.models.lineChart()
            builder1.build options, sampleData1

            elements = document.getElementsByClassName('nvtooltip')
            while(elements[0])
              elements[0].parentNode.removeChild(elements[0])

        afterEach ->
            builder1.teardown()

        it 'api check', ->
            for opt of options
                should.exist builder1.model[opt](), "#{opt} can be called"

            builder1.model.update()

        it 'renders', ->
            wrap = builder1.$ 'g.nvd3.nv-lineChart'
            should.exist wrap[0]

        it 'no data text', ->
            builder1 = new ChartBuilder nv.models.lineChart()
            builder1.build options, []

            noData = builder1.$ '.nv-noData'
            noData[0].textContent.should.equal 'No Data Available'

        it 'interactive tooltip', ->
            builder1 = new ChartBuilder nv.models.lineChart()
            builder1.build options, sampleData2

            evt =
                mouseX: 243
                mouseY: 96
                pointXValue: 28.15

            builder1.model.interactiveLayer.dispatch.elementMousemove evt

            getGuideline = ->
                line = builder1.$ '.nv-interactiveGuideLine line'
                line[0]

            should.exist getGuideline(), 'guideline exists'

            tooltip = document.querySelector '.nvtooltip'
            should.exist tooltip, 'tooltip exists'

            builder1.model.interactiveLayer.dispatch.elementMouseout()

        it 'has correct structure', ->
          cssClasses = [
            '.nv-x.nv-axis'
            '.nv-y.nv-axis'
            '.nv-linesWrap'
            '.nv-legendWrap'
            '.nv-line'
            '.nv-scatter'
            '.nv-legend'
          ]
          for cssClass in cssClasses
            do (cssClass) ->
              should.exist builder1.$("g.nvd3.nv-lineChart #{cssClass}")[0]

        describe "applies correctly option", ->

          sampleData = sampleData1
          builder = null

          beforeEach ->
            builder = new ChartBuilder nv.models.lineChart()

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
            builder.$(".nv-lineChart")[0].getAttribute('transform').should.be.equal "translate(444,111)"

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
            builder.$(".nv-lineChart")[0].getBoundingClientRect().width.should.be.equal 500

          # ideally it should be passed but...
          xit 'height', ->
            options =
              margin:
                top: 0
                right: 0
                bottom: 0
                left: 0
              height: 500
            builder.build options, sampleData
            builder.$(".nv-lineChart")[0].getBoundingClientRect().height.should.be.equal 500

          it "color", ->
            options.color = -> "rgb(0, 0, 255)"
            builder.build options, sampleData
            for group in builder.$(".nv-lineChart .nv-groups .nv-group")
              group.style.fill.should.be.equal "rgb(0, 0, 255)"
              group.style.stroke.should.be.equal "rgb(0, 0, 255)"
            legend = builder.$(".nv-lineChart .nv-legend-symbol")[0]
            legend.style.fill.should.be.equal "rgb(0, 0, 255)"
            legend.style.stroke.should.be.equal "rgb(0, 0, 255)"

          describe "showLegend", ->
            it 'true', ->
              options =
                showLegend: true
              builder.build options, sampleData
              builder.$(".nv-lineChart .nv-legendWrap *").length.should.not.be.equal 0
            it 'false', ->
              options =
                showLegend : false
              builder.build options, sampleData
              builder.$(".nv-lineChart .nv-legendWrap *").length.should.be.equal 0

            describe "showXAxis", ->
              it "true", ->
                options.showXAxis = true
                builder.build options, sampleData
                builder.$(".nv-lineChart .nv-axis.nv-x .nv-axis").length.should.be.above 0
              it "false", ->
                options.showXAxis = false
                builder.build options, sampleData
                builder.$(".nv-lineChart .nv-axis.nv-x .nv-axis").should.have.length 0

            describe "showYAxis", ->
              it "true", ->
                options.showYAxis = true
                builder.build options, sampleData
                builder.$(".nv-lineChart .nv-axis.nv-y .nv-axis").length.should.be.above 0
              it "false", ->
                options.showYAxis = false
                builder.build options, sampleData
                builder.$(".nv-lineChart .nv-axis.nv-y .nv-axis").should.have.length 0

          describe "rightAlignYAxis", ->
            it "true", ->
              options.rightAlignYAxis = true
              builder.build options, sampleData
              builder.$(".nv-lineChart .nv-y.nv-axis")[0]
              .getAttribute("transform").should.be.equal "translate(880,0)"
            it "false", ->
              options.rightAlignYAxis = false
              builder.build options, sampleData
              assert.isUndefined builder.$(".nv-lineChart .nv-y.nv-axis *")[0]

          describe "useInteractiveGuideline", ->
            it "true", ->
              options =
                useInteractiveGuideline: true
              builder.build options, sampleData
              should.exist builder.$(".nv-lineChart .nv-interactiveGuideLine")[0]
            it "false", ->
              options =
                useInteractiveGuideline: false
              builder.build options, sampleData
              should.not.exist builder.$(".nv-lineChart .nv-interactiveGuideLine")[0]

          it "state", ->
            builder.build options, sampleData
            expect(builder.model.state({})).to.throw(Error)

          it "transitionDuration", ->
            builder.build options, sampleData
            expect(builder.model.transitionDuration(0)).to.throw(Error)

          it "duration", ->
            options =
              duration: 100
            builder.build options, sampleData
            builder.model.duration().should.be.equal 100

          it "noData", ->
            options.noData = "error error"
            builder.build options, []
            builder.svg.textContent.should.be.equal 'error error'

          it "tooltipContent", ->
            options.tooltipContent = (key) -> "<strong>#{key}</strong>"
            builder.build options, sampleData
            builder.model.lines.dispatch.elementMouseover( mouseOverEventData )
            document.querySelectorAll(".nvtooltip")[0].innerHTML.should.be.equal "<strong>#{sampleData[0].key}</strong>"

          describe 'tooltips', ->
            it "true", ->
              options =
                tooltipContent: (key) -> "<h2>#{key}</h2>"
                tooltips: true
              builder.build options, sampleData
              builder.model.lines.dispatch.elementMouseover( mouseOverEventData )
              should.exist document.querySelectorAll(".nvtooltip")[0]
            it "false", ->
              options.tooltips = false
              builder.build options, sampleData
              builder.model.lines.dispatch.elementMouseover( mouseOverEventData )
              should.not.exist document.querySelectorAll(".nvtooltip")[0]

          ###
          defaultState
          ###
