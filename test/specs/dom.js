var $ = require("../../src/dom")

describe("Test dom operation", function() {
  it("should add class name to body", function() {
    var $body = $(document.body)
    $body.addClass("fuck")
    document.body.className.should.be.equal("fuck")

    $body.addClass("you")
    document.body.className.should.be.equal("fuck you")

    $body.addClass("you")
    document.body.className.should.be.equal("fuck you")

    $body.addClass("every")
    document.body.className.should.be.equal("fuck you every")

    $body.addClass("ever")
    document.body.className.should.not.be.equal("fuck you every")

  })
  it("should remove class name of body", function() {
    var $body = $(document.body)
    $body.el.className = "fuck you every day"

    $body.removeClass("fuck")
    $body.el.className.should.be.equal("you every day")

    $body.removeClass("every")
    $body.el.className.should.be.equal("you day")

    $body.removeClass("day")
    $body.el.className.should.be.equal("you")

    $body.addClass("fuck")
    $body.el.className.should.be.equal("you fuck")
  })
})
