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

/* User */
var Profile = Wat.component("Profile", {template: profileTpl})
var User = Wat.component("User", {template: userTpl})
var School = Wat.component("School", {template: schoolTpl})

var user = new User({state: model})
Wat.mount(document.getElementById("content"), user)

/* Profile */
// var profile = new Profile({state: model.profile}, {
//   parent: user,
//   currentPath: "profile"
// })
//Wat.mount(document.getElementById("profile"), profile)

/* School */
// var school = new School({state: model.profile.school}, {
//   parent: profile,
//   currentPath: "profile.school"
// })
// Wat.mount(document.getElementById("school"), school)

window.u = function(name) {
  user.update({
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
  school.update({name: name || "jerry"})
}

}
// ================== TodoList ===============
// var todoListTpl = $(document.getElementById("todo-list-tpl")).html()
// var todoItemTpl = $(document.getElementById("todo-item-tpl")).html()
//
// //console.log(parser.parse("{jerry.profile.girls[0].name+tomy.name} @==== I love {tomy.name}"))
// var state = {
//   name: "Todo App",
//   todos: [
//     {_id: 1, content: "This is short item"},
//     {_id: 2, content: "u bad bad!"}
//   ]
// }
//
// var TodoList = Wat.component("TodoList", {
//   template: todoListTpl,
//   defautState: {},
//   init: function(options) {
//     // will set state automatically
//   }
//   // methods here
// })
//
// var TodoItem = Wat.component("TodoItem", {
//   template: todoItemTpl,
//   defautState: {}
//   // methods here
// })
//
// }
