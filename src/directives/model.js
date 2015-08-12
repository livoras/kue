var $ = require("../dom")

module.exports = {
  bind: function(ele, attr, kue) {
    this.update(ele, attr, kue)
    $(ele).on("input", updateVM)
    $(ele).on("keyup", updateVM)
    function updateVM() {
      kue.vm[attr.value](ele.value)
    }
  },
  update: function(ele, attr, kue) {
    ele.value = kue.vm[attr.value]()
  }
}
