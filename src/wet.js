function Wet(options) {}

Wet.component = require("./component")
Wet.register = require("./register")

Wet.render = function(el, component) {
  el.innerHTML = ""
  el.appendChild(component.el)
}

window.Wet = Wet
