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

  describe 'Interactive Bisect', ->
    runTest = (list, searchVal, accessor = null)->
      xAcc = unless accessor?
        (d)-> d
      else
        accessor

      nv.interactiveBisect list, searchVal, xAcc

    it 'exists', ->
      expect(nv.interactiveBisect).to.exist

    it 'basic test', ->
      expect(runTest([0,1,2,3,4,5], 3)).to.equal 3

    it 'zero bound', ->
      expect(runTest([0,1,2,3,4,5], 0)).to.equal 0

    it 'length bound', ->
      expect(runTest([0,1,2,3,4,5], 5)).to.equal 5

    it 'negative number', ->
      expect(runTest([0,1,2,3,4,5], -4)).to.equal 0

    it 'past the end', ->
      expect(runTest([0,1,2,3,4,5], 10)).to.equal 5

    it 'floating point number 1', ->
      expect(runTest([0,1,2,3,4,5], 0.34)).to.equal 0

    it 'floating point number 2', ->
      expect(runTest([0,1,2,3,4,5], 1.50001)).to.equal 2

    it 'fibonacci - existing', ->
      list = [0,1,1,2,3,5,8,13,21,34]
      expect(runTest(list,8)).to.equal 6

    it 'fibonacci - inbetween item (left)', ->
      list = [0,1,1,2,3,5,8,13,21,34]
      expect(runTest(list,15)).to.equal 7

    it 'fibonacci - inbetween item (right)', ->
      list = [0,1,1,2,3,5,8,13,21,34]
      expect(runTest(list,20)).to.equal 8

    it 'accessor in index mode - existing item', ->
      x = (d,i)-> i
      list = [0,1,1,2,3,5,8,13,21,34]
      expect(runTest(list,7,x)).to.equal 7

    it 'accessor in index mode - inbetween item 1', ->
      x = (d,i)-> i
      list = [0,1,1,2,3,5,8,13,21,34]
      expect(runTest(list,7.3,x)).to.equal 7

    it 'accessor in index mode - inbetween item 2', ->
      x = (d,i)-> i
      list = [0,1,1,2,3,5,8,13,21,34]
      expect(runTest(list,7.50001,x)).to.equal 8

    it 'empty array', ->
      expect(runTest([],4)).to.equal 0

    it 'single element array', ->
      expect(runTest([0],0)).to.equal 0

    it 'single element array - negative bound', ->
      expect(runTest([0],-4)).to.equal 0

    it 'single element array - past the end', ->
      expect(runTest([0],1)).to.equal 0
