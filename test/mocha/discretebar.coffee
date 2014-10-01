describe 'NVD3', ->
    describe 'Discrete Bar Chart', ->
        sampleData1 = [
            key: 'Series 1'
            values: [
                {label: 'America', value: 100}
                {label: 'Europe', value: 200}
                {label: 'Asia', value: 50}
                {label: 'Africa', value: 70}
            ]
        ]

        options =
            x: (d)-> d.label
            y: (d)-> d.value
            margin:
                top: 30
                right: 20
                bottom: 50
                left: 75
            color: nv.utils.defaultColor()
            showXAxis: true
            showYAxis: true
            rightAlignYAxis: false
            staggerLabels: true
            showValues: true
            valueFormat: (d)-> d.toFixed 2
            tooltips: true
            tooltipContent: (key,x,y)-> "<h3>#{key}</h3>"
            noData: 'No Data Available'
            duration: 0

        mouseOverEventData =
          pos: [0,1]
          series: sampleData1[0]
          seriesIndex: 0
          value: 111
          point: {label: 'America', value: 100, series: 0}
          pointIndex: 0

        builder1 = null
        beforeEach ->
            builder1 = new ChartBuilder nv.models.discreteBarChart()
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
            wrap = builder1.$ 'g.nvd3.nv-discreteBarWithAxes'
            should.exist wrap[0]

        it 'has correct structure', ->
          cssClasses = [
            '.nv-x.nv-axis'
            '.nv-y.nv-axis'
            '.nv-barsWrap'
            '.nv-discretebar'
          ]
          for cssClass in cssClasses
            do (cssClass) ->
              should.exist builder1.$("g.nvd3.nv-discreteBarWithAxes #{cssClass}")[0]

        describe "applies correctly option", ->

          builder = null
          sampleData = sampleData1

          beforeEach ->
            builder = new ChartBuilder nv.models.discreteBarChart()

          afterEach ->
            builder.teardown()

          it "margin", ->
            options.margin =
              top: 111
              right: 222
              bottom: 333
              left: 444
            builder.build options, sampleData
            builder.$(".nv-discreteBarWithAxes")[0].getAttribute("transform").should.be.equal "translate(444,111)"

          # todo: ideally it should be passed but...
          xit 'width', ->
            options =
              margin:
                top: 0
                right: 0
                bottom: 0
                left: 0
              width: 500
            builder.build options, sampleData
            builder.$(".nv-discreteBarWithAxes")[0].getBoundingClientRect().width.should.be.equal 500

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
            builder.$(".nv-discreteBarWithAxes")[0].getBoundingClientRect().height.should.be.equal 500

          it "color", ->
            options.color = -> "#0000ff"
            builder.build options, sampleData
            for element in builder.$(".nv-discreteBarWithAxes .nv-bar")
              element.style.fill.should.be.equal "rgb(0, 0, 255)"
              element.style.stroke.should.be.equal "rgb(0, 0, 255)"

          describe "showXAxis", ->
            it "true", ->
              options.showXAxis = true
              builder.build options, sampleData
              builder.$(".nv-discreteBarWithAxes .nv-axis.nv-x *").length.should.be.above 0
            it "false", ->
              options.showXAxis = false
              builder.build options, sampleData
              builder.$(".nv-discreteBarWithAxes .nv-axis.nv-x *").should.have.length 0

          describe "showYAxis", ->
            it "true", ->
              options.showYAxis = true
              builder.build options, sampleData
              should.exist builder.$(".nv-discreteBarWithAxes .nv-axis.nv-y .nv-axis")
            it "false", ->
              options.showYAxis = false
              builder.build options, sampleData
              should.exist builder.$(".nv-discreteBarWithAxes .nv-axis.nv-y .nv-axis")

          describe "rightAlignYAxis", ->
            it "true", ->
              options.rightAlignYAxis = true
              builder.build options, sampleData
              builder.$(".nv-discreteBarWithAxes .nv-y.nv-axis")[0]\
              .getAttribute("transform").should.be.equal "translate(890,0)"
            it "false", ->
              options.rightAlignYAxis = false
              builder.build options, sampleData
              assert.isNull builder.$(".nv-discreteBarWithAxes .nv-y.nv-axis")[0]\
              .getAttribute("transform")

          describe "staggerLabels", ->
            it "true", ->
              options =
                staggerLabels: true
              builder.build options, sampleData
              should.exist builder.$(".nv-discreteBarWithAxes .nv-x.nv-axis .tick text")[0]\
              .getAttribute("transform")
            it "false", ->
              options =
                staggerLabels: false
              builder.build options, sampleData
              assert.isNull builder.$(".nv-discreteBarWithAxes .nv-x.nv-axis .tick text")[0]\
              .getAttribute("transform")

          describe 'tooltips', ->
            it "true", ->
              options =
                tooltipContent: (key) -> "<h2>#{key}</h2>"
                tooltips: true
              builder.build options, sampleData
              builder.model.discretebar.dispatch.elementMouseover( mouseOverEventData )
              should.exist document.querySelectorAll(".nvtooltip")[0]
            it "false", ->
              options.tooltips = false
              builder.build options, sampleData
              builder.model.discretebar.dispatch.elementMouseover( mouseOverEventData )
              should.not.exist document.querySelectorAll(".nvtooltip")[0]

          it "tooltipContent", ->
            options.tooltipContent = (key) -> "<h2>#{key}</h2>"
            builder.build options, sampleData
            builder.model.discretebar.dispatch.elementMouseover( mouseOverEventData )
            document.querySelectorAll(".nvtooltip")[0].innerHTML.should.be.equal "<h2>#{sampleData[0].key}</h2>"

          it "noData", ->
            options.noData = "error error"
            builder.build options, []
            builder.svg.textContent.should.be.equal 'error error'

          it "transitionDuration", ->
            options =
              transitionDuration: 99
            builder.build options, sampleData
            expect(builder.model.transitionDuration()).to.throw(Error)

          it "duration", ->
            options =
              duration: 100
            builder.build options, sampleData
            builder.model.duration().should.be.equal 100