var _ = require("./util")
var compiler = require("./compiler")
var obserable = require("./obserable")
var parser = require("./parser")
var $ = require("./dom")
var components = {}

function Wat(options) {}

Wat.component = function(componentName, componentOpts) {
  var Component = function(options) {
    this.el = $.getDOMNodeFromTemplate(componentOpts.template)
    this.state = options.state
    compiler.compile(this.el, this)
  }
  components[componentName] = Component
  return Component
}

Wat.mount = function(el, component) {
  el.innerHTML = ""
  el.appendChild(component.el)
}

// =========================== Test Code ===========================
var userTpl = $(document.getElementById("user-tpl")).html()

var user = {
  _id: 0,
  education: {
    school: "SYSU",
    date: "2015-07-09"
  },
  profile: {
    name: "jerry",
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

var User = Wat.component("User", { template: userTpl })

Wat.mount(
  document.getElementById("content"),
  new User({ state: user })
)

// ================== TodoList ===============
var todoListTpl = $(document.getElementById("todo-list-tpl")).html()
var todoItemTpl = $(document.getElementById("todo-item-tpl")).html()

var state = {
  name: "Todo App",
  todos: [
    {_id: 1, content: "This is short item"},
    {_id: 2, content: "u bad bad!"}
  ]
}

var TodoList = Wat.component("TodoList", {
  template: todoListTpl,
  defautState: {},
  init: function(options) {
    // will set state automatically
  }
  // methods here
})

var TodoItem = Wat.component("TodoItem", {
  template: todoItemTpl,
  defautState: {}
  // methods here
})
