var parser = require("../../src/parser")
var config = require("../../src/config")

describe("Test parser", function() {

  it("Get raw expressions from text.", function() {
    parser.getRawExps("{firstName + lastName} is my {name}")
          .should.be.deep.equal(["{firstName + lastName}", "{name}"])
  })
  
  it("Get expression objects from text.", function() {
    parser.parse("{name() === true ? good(): bad()}")
          .should.be.deep.equal([{
            rawExp: "{name() === true ? good(): bad()}",
            exp: "name() === true ? good(): bad()",
            tokens: ["name", "good", "bad"]
          }])
    parser.parse("Today totalCount is {parseFloat(totalCount())}, {name} should make it.")
          .should.be.deep.equal([{
            rawExp: "{parseFloat(totalCount())}",
            exp: "parseFloat(totalCount())",
            tokens: ["totalCount"]
          }, {
            rawExp: "{name}",
            exp: "name",
            tokens: ["name"]
          }])
  })

  it("Execute an expression.", function() {
    parser.exec({
      exp: "this.lucy + name() + 1",
      tokens: ["name"]
    }, {
      name: function() {
        return "Jerry!"
      },
      lucy: "good"
    }).should.be.equal("goodJerry!1")
  })

  it("Parse with custom open and close tag.", function() {
    config.openTag = "{{"
    config.closeTag = "}}"
    parser.parse("{{name() === true ? good(): bad()}}")
          .should.be.deep.equal([{
            rawExp: "{{name() === true ? good(): bad()}}",
            exp: "name() === true ? good(): bad()",
            tokens: ["name", "good", "bad"]
          }])
  })
})