var parser = require("../../src/parser")

describe("Test parser", function() {
  it("Get expressions from text", function() {
    parser.getExps("{firstName + lastName} is my {name}")
          .should.be.deep.equal(["firstName + lastName", "name"])
  })
})