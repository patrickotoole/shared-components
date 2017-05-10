export function Input(target) {
  this._target = target
  this._on = {}
}

Input.prototype = {
    draw: function() {

      var target = this._target

      try {
        var selectedAdvertiser = target.datum().settings.filter(function(x) { return x.key == "report_advertiser" })[0].value
      } catch (e) {}

      var report_row = d3_class(target,"report-row") 
      d3_class(report_row,"report-label","span").text("Upload a file: ")

      var text = d3_updateable(report_row,"textarea","textarea").attr("type","file")
        .text(function(x) {
          return JSON.stringify(x.report)
        })

      var report_advertiser_row = d3_class(target,"report-advertiser-row")

      d3_class(report_advertiser_row,"report-advertiser-label","span")
        .text("Report Advertiser: ")    

      var select = d3_select(
        report_advertiser_row, 
        function(x) { return x.advertisers }, 
        function(x) { return x.key }, 
        function(x) { return x.value == selectedAdvertiser ? "selected" : false }
      )

      var properties = this;

      d3_updateable(target,"button","button")
        .text("Get")
        .on("click", function() {
          var json = text.property("value")
          var selected = select.node().selectedOptions

          if (selected.length) var advertiser = selected[0].__data__.value
          properties.on("click").bind(this)({"report":json, "report_advertiser": advertiser})
        })

      return this

    }
  , data: function(d) {
      if (d === undefined) return this._data
      this._data = d
      return this
    }
  , on: function(action,fn) {
      if (fn === undefined) return this._on[action] || function() {};
      this._on[action] = fn;
      return this
    }
}

export function input(target) {
  return new Input(target)
}
