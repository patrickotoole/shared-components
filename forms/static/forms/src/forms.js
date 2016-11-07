export function Forms(target) {
  this._target = target
  this._on = {
      submit: function(x) {}
  }
  this._renderers = {
      select: function(row) {
        var select = d3_updateable(row,"select","select")
        d3_splat(select,"option","option",function(x) { return x.values })
          .text(String)
      }
    , input: function(row) {
        var select = d3_updateable(row,"input","input")
      }
    , textarea: function(row) {
        var textarea = d3_updateable(row,"textarea","textarea")
      }
  }
}

Forms.prototype = {
    fields: function(d) {
      if (d === undefined) return this._fields
      this._fields = d
      return this
    }
  , data: function(d) {
      if (d === undefined) return this._data
      this._data = d
      this._fields = d.fields
      return this
    }
  , renderer: function(f) {
      return this._renderers[f] || function() {}
    }
  , draw: function() {

      var form = d3_updateable(this._target,".build-form","div",this.fields())
        .classed("build-form",true)

      var rows = d3_splat(form,".row","div",function(x) { return x}, function(x) { return x.name })
        .classed("row",true)
      
      d3_updateable(rows,".label","div")
        .classed("label",true)
        .text(function(x) { return x.name })

      var self = this

      var field = d3_updateable(rows,".field","div")
        .classed("field",true)
        .each(function(x) {
          var fn = self.renderer(x.type)
          fn(d3.select(this))
        })

      var submit = d3_updateable(this._target,"button","button")
        .text("Submit")
        .on("click", function() {
          var data = {"data":self.summarize(), "script": self.data().script }
          self.on("submit")(data)
        })

      return this
    }
  , on: function(action,fn) {
      if (fn === undefined) return this._on[action] || function() {};
      this._on[action] = fn;
      return this
    }
  , summarize: function() {
      var values = this._target.selectAll(".row")[0].map(function(arg) {
        var r = arg.__data__
        try {
          var xx = d3.select(arg).selectAll("input").node().value
          if (xx) return {"key":r.name,"value":xx}
        } catch(e) {}

        try {
          var xx = d3.select(arg).selectAll("select").node().selectedOptions[0].value
          if (xx) return {"key":r.name,"value":xx}
        } catch(e) {}

        return {"key":r.name,"value":undefined}
      })

      return values
    } 
}

function forms(target) {
  return new Forms(target)
}

forms.prototype = Forms.prototype

export default forms;