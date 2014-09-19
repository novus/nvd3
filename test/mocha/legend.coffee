describe 'NVD3', ->
  describe.only 'Legend', ->

    sampleData1 = [{"values":[{"x":0,"y":2},{"x":1,"y":2.3},{"x":2,"y":2.6}],"key":"Line 1"}]

    legendOptions =
      margin:
        top: 0
        right: 0
        bottom: 0
        left: 0
      width: 100
      height: 100
      key: (d) -> d.key
      color: nv.utils.defaultColor()
      align: true
      rightAlign: false
      updateState: true
      radioButtonMode: false

    builder = null
    beforeEach ->
      builder = new ChartBuilder nv.models.legend()
      builder.build legendOptions, sampleData1

      legend = builder.model
      for opt, val of legendOptions
        legend[opt](val)

    afterEach ->
      builder.teardown()

    it 'api check', ->
      legend = builder.model
      for opt, val of legendOptions
        should.exist legend[opt](), "#{opt} can be called"

    it 'legend structure', ->
      legend = builder.$ '.nvd3.nv-legend'
      should.exist legend[0], '.nvd3.nv-legend'

    xit 'y axis structure', ->
      axis = builder.$ '.nv-y.nv-axis'

      should.exist axis[0], '.nv-axis exists'

      maxMin = builder.$ '.nv-y.nv-axis .nv-axisMaxMin'

      maxMin.should.have.length 2

      maxMin[0].textContent.should.equal '-1'
      maxMin[1].textContent.should.equal '2'

      ticks = builder.$ '.nv-y.nv-axis .tick'

      ticks.should.have.length 7

      expected = [
        '-1'
        '-0.5'
        '0'
        '0.5'
        '1'
        '1.5'
        '2'
      ]

      for tick,i in ticks
        tick.textContent.should.equal expected[i]

    xit 'axis rotate labels', ->
      axis = builder.model.xAxis
      axis.rotateLabels 30
      builder.model.update()

      ticks = builder.$ '.nv-x.nv-axis .tick text'

      for tick in ticks
        transform = tick.getAttribute 'transform'
        transform.should.equal 'rotate(30 0,0)'

    xit 'axis stagger labels', ->
      axis = builder.model.xAxis
      axis.staggerLabels true
      builder.model.update()

      ticks = builder.$ '.nv-x.nv-axis .tick text'

      for tick, i in ticks
        transform = tick.getAttribute 'transform'
        if i % 2 is 0 then transform.should.contain 'translate(0,12)'
        else transform.should.contain 'translate(0,0)'

    xit 'axis orientation', (done)->
      axis = builder.model.xAxis
      axis.orient 'top'
      builder.model.update()

      axis.orient 'right'
      builder.model.update()

      done()
