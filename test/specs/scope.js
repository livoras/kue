var Scope = require("../../src/scope")

describe("Test states change", function() {
  var model = {
    user: "name",
    profile: {
      school: {
        name: "JD"
      }
    },
    avatar: [
      {url: "/pics/1"},
      {url: "/pics/2"},
    ]
  }

  var root;

  before(function() {
    root = new Scope("", model)
    profile = new Scope("profile", model.profile, root)
    school = new Scope("profile.school", model.profile.school, profile)
  })

  it("Scope should emit own changes", function() {
    var spy = sinon.spy()
    var spy2 = sinon.spy()
    var spy3 = sinon.spy()
    var spy4 = sinon.spy()

    root.watch("profile.school.name", spy)
    root.watch("profile.school", spy2)
    root.watch("profile", spy3)
    root.watch("name", spy4)

    root.update({
      profile: {
        school: {name: "Jerry"}
      }
    })

    root.state.profile.school.name.should.be.equal("Jerry")
    spy.should.have.been.calledOnce
    spy2.should.have.been.calledOnce
    spy3.should.have.been.calledOnce
    spy4.should.not.have.been.called
  })

  it("Test devlier change from root to child state", function() {
    var spy1 = sinon.spy()
    var spy2 = sinon.spy()

    profile.watch("school.name", spy1)
    profile.watch("school.name", spy1)
    profile.watch("school", spy2)

    school.update({name: "Tomy"})

    model.profile.school.name.should.be.equal("Tomy")
    spy1.should.have.been.calledTwice
    spy2.should.have.been.calledOnce
  })

  it("When upper state was fully changed, substate will not get the notification", function() {
    var spy1 = sinon.spy()
    var spy2 = sinon.spy()

    root.watch("profile.school", spy1)
    school.watch("name", spy2)
    profile.update({
      school: "no school!"
    })

    model.profile.school.should.be.equal("no school!")
    spy1.should.have.been.calledOnce
    spy2.should.not.have.been.calledOnce
  })

  it("Deeper changes", function() {
    var school2 = new Scope("profile.school", profile.school, profile)
    var spy1 = sinon.spy()
    var spy2 = sinon.spy()
    var spy3 = sinon.spy()
    var spy4 = sinon.spy()

    school2.watch("name", spy1)
    school.watch("name", spy2)
    profile.watch("school.name", spy3)
    root.watch("profile.school.name", spy4)

    school.update({name: "Lily"})
    spy1.should.have.been.calledOnce
    spy2.should.have.been.calledOnce
    spy3.should.have.been.calledOnce
    spy4.should.have.been.calledOnce
  })
})
