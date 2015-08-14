var EventEmitter = require("../../src/event-emitter")
var objectPath = require("../../src/object-path")

describe("Test anything", function() {
  describe("Event emiter should work", function() {
    it("Listen and emit events", function() {
      var e = new EventEmitter
      var spy = sinon.spy()
      e.on("some", spy)
      var data = {a: 'name'}
      e.emit("some", data)
      spy.should.have.been.calledWith(data)
    })

    it("Off some evetns", function() {
      var e = new EventEmitter
      var spy = sinon.spy()
      e.on("some", spy)
      var data = {a: 'name'}
      e.emit("some", data)
      spy.should.have.been.calledWith(data)

      var spy2 = sinon.spy()
      e.on("some", spy2)
      e.off("some", spy2)
      e.emit("some")
      spy.should.have.been.calledTwice
      spy2.should.not.have.been.calledWith(data)
    })
  })
  describe("Object path", function() {
    it("Should make steps from a path", function() {
      objectPath.makeStepsFromPath("jerry.0.fuck.you")
        .should.be.deep.equal([
          "jerry",
          "jerry.0",
          "jerry.0.fuck",
          "jerry.0.fuck.you"
        ])
      objectPath.makeStepsFromPath("jerry.0")
        .should.be.deep.equal(["jerry", "jerry.0"])
    })
  })
})
