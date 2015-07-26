var _ = require("./util")
var compiler = require("./compiler")
var obserable = require("./obserable")
var parser = require("./parser")

function Kue(options) {
  this.el = document.getElementById(options.el)
  this.vm = options.vm
  this.methods = options.methods
  compiler.compile(this.el, this)
}

var vm = {
  name: obserable("Jerry"),
  app: obserable("Kue App")
}

var app = new Kue({
  el: "jerry",
  vm: vm,
  methods: {
    onClick: function(event) {
      console.log("click!")
    }
  }
})

