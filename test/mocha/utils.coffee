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

    it 'should return a function if passing a function into nv.utils.getColor', ->
      uno = (d,i) -> 1
      nv.utils.getColor(uno).should.be.equal uno

    it 'should return a function wrapping an array if passing an array into nv.utils.getColor', ->
      arr = ['#fff', '#ccc', '#aaa', '#000']
      returnedFunction = nv.utils.getColor(arr)

      returnedFunction({},0).should.be.equal '#fff'
      returnedFunction({},1).should.be.equal '#ccc'
      returnedFunction({},2).should.be.equal '#aaa'
      returnedFunction({},3).should.be.equal '#000'