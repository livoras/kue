var $ = require("./dom")
window.JSON = require("json3")

module.exports = function(Wet) {

// =========================== Test Code ===========================
var userTpl = $(document.getElementById("user-tpl")).html()
var profileTpl = $(document.getElementById("profile-tpl")).html()
var schoolTpl = $(document.getElementById("school-tpl")).html()
var girlTpl = $(document.getElementById("girl-tpl")).html()

var model = {
  _id: 0,
  costs: [1, 2, 3, 4, 5, 6],
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
var Profile = Wet.component("Profile", {template: profileTpl})
var User = Wet.component("User", {
  template: userTpl,
  tellMom: function() {
    console.log("good", arguments)
  }
})
var School = Wet.component("School", {template: schoolTpl})
var Girl = Wet.component("Girl", {
  template: girlTpl,
  clickOnName: function(profile) {
    console.log(this.state.name, profile)
  }
})

var user = new User({state: model})
Wet.render(document.getElementById("content"), user)
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
  console.log("pop")
  user.updateArray("profile.girls").pop()
  //user.updateArray("profile.girls").slice(0, 1)
}

window.splice = function() {
  console.log("pop")
  user.updateArray("profile.girls").splice(1, 1)
  //user.updateArray("profile.girls").slice(0, 1)
}

window.reverse = function() {
  console.log("pop")
  user.updateArray("profile.girls").reverse()
  user.updateArray("costs").reverse()
  //user.updateArray("profile.girls").slice(0, 1)
}

window.u4 = function() {
  console.log("shift")
  user.updateArray("profile.girls").shift()
  //user.updateArray("profile.girls").slice(0, 1)
}

window.sort = function() {
  user.updateArray("costs").sort(function(a, b) {
    return b - a
  })
}

window.u5 = function() {
  console.log("push")
  user.updateArray("profile.girls").push({
    name: "Mike",
    age: 45
  }, {
    name: "John",
    age: 34
  })
  //user.updateArray("profile.girls").slice(0, 1)
}

window.u6 = function() {
  console.log("unshift")
  user.updateArray("profile.girls").unshift({
    name: "Mike",
    age: 45
  }, {
    name: "John",
    age: 34
  })
  //user.updateArray("profile.girls").slice(0, 1)
}
window.m = model

}
