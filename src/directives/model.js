var $ = require("../dom")

module.exports = {
  bind: function(ele, attr, kue, dir) {
    this.update(ele, attr, kue, dir)
    $(ele).on("input", updateVM)
    $(ele).on("keyup", updateVM)
    function updateVM() {
      var vmName = dir.replace(/\(\)/g, "")
      kue.vm[vmName](ele.value)
    }
  },
  update: function(ele, attr, kue, dir) {
    var vmName = dir.replace(/\(\)/g, "")
    ele.value = kue.vm[vmName]()
  }
}
