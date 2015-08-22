function Wat(options) {}

Wat.component = require("./component")

Wat.render = function(el, component) {
  el.innerHTML = ""
  el.appendChild(component.el)
}

require("./page-test")(Wat)
