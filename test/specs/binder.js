var binder = require("../../src/binder")

describe("Test binder", function() {
  it("Get tokens from different directive", function() {
    binder.getTokensFromDirective("token in tokens")
        .should.be.deep.equal(["token", "tokens"])
    binder.getTokensFromDirective({
          "color": "'red'",
          "'font-size'": "size() + 'px'",
          "name": "jerry()",
          "width": "width() + 'px'"
        }).should.be.deep.equal(["size", "jerry", "width"])
  })
})