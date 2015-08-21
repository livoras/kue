var parser = require("../../src/parser")
var config = require("../../src/config")
var Scope = require("../../src/scope")

describe("Test parser", function() {

  it("Get raw expressions from text.", function() {
    parser.getRawExps("{firstName + lastName} is my {name}")
          .should.be.deep.equal(["{firstName + lastName}", "{name}"])
  })

  it("Get expression objects from text.", function() {
    parser.parse("{name() === true ? good() + 'ye': bad()}")
      .should.be.deep.equal([{
        rawExp: "{name() === true ? good() + 'ye': bad()}",
        exp: "name() === true ? good() + 'ye': bad()",
        tokens: ["name", "good", "bad"],
        paths: ["name", "good", "bad"]
      }])
    parser.parse('{name() + "Good\' name is my love"}')
      .should.be.deep.equal([{
        rawExp: '{name() + "Good\' name is my love"}',
        exp: 'name() + "Good\' name is my love"',
        tokens: ["name"],
        paths: ["name"]
      }])
    parser.parse("Today totalCount is {parseFloat(totalCount()) + 'Hello'}, {name} should make it.")
      .should.be.deep.equal([{
        rawExp: "{parseFloat(totalCount()) + 'Hello'}",
        exp: "parseFloat(totalCount()) + 'Hello'",
        tokens: ["totalCount"],
        paths: ["totalCount"]
      }, {
        rawExp: "{name}",
        exp: "name",
        tokens: ["name"],
        paths: ["name"]
      }])
    parser.parse("{jerry.profile.girls[0].name+tomy.name} @==== I love {tomy.name}")
      .should.be.deep.equal([{
        rawExp: "{jerry.profile.girls[0].name+tomy.name}",
        exp: "jerry.profile.girls[0].name+tomy.name",
        tokens: ["jerry", "tomy"],
        paths: ["jerry.profile.girls.0.name", "tomy.name"]
      }, {
        rawExp: "{tomy.name}",
        exp: "tomy.name",
        tokens: ["tomy"],
        paths: ["tomy.name"]
      }])
  })

  it("Execute an expression.", function() {
    parser.exec({
      exp: "lucy + name + 1",
      tokens: ["name", "lucy"]
    }, new Scope("", {
      name: "Jerry!",
      lucy: "good"
    })).should.be.equal("goodJerry!1")
  })

  it("Parse with custom open and close tag.", function() {
    config.openTag = "{{"
    config.closeTag = "}}"
    parser.parse("{{name() === true ? good(): bad()}}")
          .should.be.deep.equal([{
            rawExp: "{{name() === true ? good(): bad()}}",
            exp: "name() === true ? good(): bad()",
            tokens: ["name", "good", "bad"],
            paths: ["name", "good", "bad"]
          }])
  })

  it("Parse key-value directive.", function() {
    parser.parseDirective("color: red, 'font-size': '12px'")
          .should.be.deep.equal({
            "color": "red",
            "font-size": "'12px'"
          })
  })

  it("Parse string directive.", function() {
    parser.parseDirective("users").should.be.equal("users")
    parser.parseDirective("user in users").should.be.equal("user in users")
  })

  it("Parse key-value directive of function call and paramaters", function() {
    parser.parseDirective("click: clickOnName, mousedown: clickOnName($index, name)")
          .should.be.deep.equal({
            "click": "clickOnName",
            "mousedown": "clickOnName($index, name)"
          })
  })

  it("Pase only one time", function() {
    parser.parseTokensAndPaths("name + name + name + jerry").tokens.should.be.deep.equal(["name", "jerry"])
  })
})
