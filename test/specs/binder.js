var binder = require("../../src/binder")

describe("Test binder", function() {
  it("Get tokens from different directive", function() {
    binder.getTokensAndPathsFromDirective("token in tokens")
      .tokens.should.be.deep.equal(["token", "tokens"])
    binder.getTokensAndPathsFromDirective({
          "color": "'red'",
          "'font-size'": "size() + 'px'",
          "name": "jerry()",
          "width": "width() + 'px'"
        }).tokens.should.be.deep.equal(["size", "jerry", "width"])
  })
})
