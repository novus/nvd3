describe 'NVD3', ->

  describe 'Core', ->

    objects = [
      'window.nv'
      'daysInMonth'
      'd3_time_range'
      'nv.tooltip'
      'nv.utils'
      'nv.models'
      'nv.charts'
      'nv.graphs'
      'nv.logs'
      'nv.dispatch'
      'nv.log'
      'nv.deprecated'
      'nv.render'
      'nv.addGraph'
      'nv.identity'
      'nv.strip'
      'd3.time.monthEnd'
      'd3.time.monthEnds'
    ]

    describe 'has', ->
      for obj in objects
        it " #{obj} object", ->
          should.exist eval obj

    it 'has correctly working daysInMonth', ->
      # input = month, year
      daysInMonth(0, 2014).should.be.equal 31
      daysInMonth(1, 2014).should.be.equal 28
      daysInMonth(1, 2012).should.be.equal 29
      daysInMonth(1, 1989).should.be.equal 28
      daysInMonth(9, 2055).should.be.equal 31

    describe 'has nv.dispatch with default', ->
      dispatchDefaults = ['render_start', 'render_end']
      for event in dispatchDefaults
        do (event) ->
          it "#{event} event", -> assert.isFunction nv.dispatch[event]

    it 'has nv.identity function', ->
      nv.identity({}).should.be.deep.equal {}
      nv.identity(1).should.be.deep.equal 1
      assert.equal nv.identity(null), null
      nv.identity('string').should.be.deep.equal 'string'

    it 'has nv.strip function', ->
      nv.strip('  a & & &       &&  ').should.be.equal 'a'

    it 'has d3.time.monthEnd function', ->
      date = new Date(2014, 1, 15)
      date2 = new Date(2014, 1, 0)
      d3.time.monthEnd(date).should.be.deep.equal date2