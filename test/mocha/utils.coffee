describe 'NVD3', ->
  describe 'Utils', ->
    objects = [
      'nv.utils.windowSize'
      'nv.utils.windowResize'
      'nv.utils.getColor'
      'nv.utils.defaultColor'
      'nv.utils.customTheme'
      'nv.utils.pjax'
      'nv.utils.calcApproxTextWidth'
      'nv.utils.NaNtoZero'
      'nv.utils.renderWatch'
      'nv.utils.deepExtend'
      'nv.utils.state'
      'nv.utils.optionsFunc'
    ]

    describe 'has ', ->
      for obj in objects
        it " #{obj} object", ->
          should.exist eval obj

    it 'has working nv.utils.NaNtoZero function', ->
      nv.utils.NaNtoZero().should.be.equal 0
      nv.utils.NaNtoZero(undefined ).should.be.equal 0
      nv.utils.NaNtoZero(NaN).should.be.equal 0
      nv.utils.NaNtoZero(null).should.be.equal 0
      nv.utils.NaNtoZero(Infinity).should.be.equal 0
      nv.utils.NaNtoZero(-Infinity).should.be.equal 0
      nv.utils.NaNtoZero(1).should.be.equal 1
      nv.utils.NaNtoZero(0).should.be.equal 0
      nv.utils.NaNtoZero(-1).should.be.equal -1