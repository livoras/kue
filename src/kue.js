var _ = require("./util")
var compiler = require("./compiler")
var objectPath = require("./object-path")
var parser = require("./parser")
var $ = require("./dom")
var components = {}
var EventEmitter = require("./event-emitter")

function Wat(options) {}

var componentMethods = {
  update: function(state) {
    var paths = objectPath.makePathsOfObj(state)
    var self = this
    _.extend(true, self.state, state)
    _.each(paths, function(path) {
      var eventName = objectPath.join([self.currentPath, path])
      self.emit(eventName)
    })
  }
}

var defaultComponentConfig = {
  currentPath: ""
}

Wat.component = function(componentName, componentOpts) {
  var Component = function(options, config) {
    EventEmitter.call(this)
    config = config || _.extend({}, defaultComponentConfig)
    this.currentPath = config.currentPath
    this.el = $.getDOMNodeFromTemplate(componentOpts.template)
    this.state = options.state
    compiler.compile(this.el, this)
  }
  var pro = Component.prototype
  _.extend(pro, EventEmitter.prototype)
  _.extend(pro, componentMethods)
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

var User = Wat.component("User", { template: userTpl })

var user = new User({ state: user })

window.user = user

Wat.mount(
  document.getElementById("content"),
  user
)

window.u = function() {
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
}

// ================== TodoList ===============
var todoListTpl = $(document.getElementById("todo-list-tpl")).html()
var todoItemTpl = $(document.getElementById("todo-item-tpl")).html()

//console.log(parser.parse("{jerry.profile.girls[0].name+tomy.name} @==== I love {tomy.name}"))
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
