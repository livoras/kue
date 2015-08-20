var $ = require("./dom")
window.JSON = require("json3")

module.exports = function(Wat) {

// =========================== Test Code ===========================
var userTpl = $(document.getElementById("user-tpl")).html()
var profileTpl = $(document.getElementById("profile-tpl")).html()
var schoolTpl = $(document.getElementById("school-tpl")).html()

var model = {
  _id: 0,
  education: {
    school: "No!",
    date: "2015-07-09"
  },
  profile: {
    school: {
      name: "SYSU",
      isShow: false
    },
    name: "jerry",
    desc: "I love you!",
    girls: [
      {name: "lucy", age: 18},
      {name: "Lily", age: 19},
      {name: "Jessy", age: 20}
    ],
    avatars: [
      "/pics/1",
      "/pics/2"
    ]
  }
}

/* Component */
var Profile = Wat.component("Profile", {template: profileTpl})
var User = Wat.component("User", {template: userTpl})
var School = Wat.component("School", {template: schoolTpl})

var user = new User({state: model})
Wat.render(document.getElementById("content"), user)
console.log(user)

window.u = function(name) {
  user.update({
    _id: "fuck",
    education: {
      school: "HuaGong"
    },
    profile: {
      girls: {
        0: {
          name: "Fuck Lucy!"
        },
        1: {
          name: "Fuck Lily!"
        }
      }
    }
  })
}

window.u2 = function(name) {
  user.update({
    profile: {
      girls: [
        {name: "Tomy", age: 49},
        {name: "Jerry", age: 48},
        {name: "Jack", age: 55}
      ]
    }
  })
  //user.updateArray("profile.girls").slice(0, 1)
}

window.u3 = function() {
  user.updateArray("profile.girls").pop()
  //user.updateArray("profile.girls").slice(0, 1)
}
window.m = model

}
