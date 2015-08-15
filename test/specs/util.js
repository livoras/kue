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
  it("deep extend", function() {
    var profile = {
      school: {
        name: "good"
      }
    }
    var obj = {
      user: {
        profile: profile
      },
      name: "jerry"
    }

    var obj2 = {
      user: {
        profile: {
          school: {
            name: "fuck"
          }
        }
      },
      name: "yes",
      age: 12
    }

    _.extend(obj, obj2)
    obj.user.profile.school.name.should.be.equal("fuck")
    obj.user.profile.should.be.equal(profile)
    obj.age.should.be.equal(12)
  })
})
