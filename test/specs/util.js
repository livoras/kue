_ = require("../../src/util.js")

describe("Test utils functions", function() {
  it("map", function() {
    var arr = [1, 2, 3, 4]
    var newArr = _.map(arr, function(val) {
      return val * 2
    })
    for(var i = 0, len = arr.length; i < len; i++) {
      arr[i] = arr[i] * 2
    }
    arr.should.be.deep.equal(newArr)
  })
  it("trim", function() {
    _.trim(" i love you    ").should.be.equal("i love you")
  })
})