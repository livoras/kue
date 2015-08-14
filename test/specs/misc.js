var EventEmitter = require("../../src/event-emitter")

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
})
