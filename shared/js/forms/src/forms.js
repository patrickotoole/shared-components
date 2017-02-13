export function Forms(target) {
  this._target = target
  this._on = {
      submit: function(x) {}
  }
  this._renderers = {
      multi_select: function(row,_default) {
        var select = d3_updateable(row,"select","select")
          .attr("multiple","true")

        d3_splat(select,"option","option",function(x) { return x.values },function(x) { return typeof(x) == "object" ? x.key : x})
          .text(function(x) { return typeof(x) == "object" ?  x.key : x })
          .attr("value",function(x) { return typeof(x) == "object" ?  x.value : x })
          .attr("selected", function(x) { return x.value == _default ? "selected" : undefined })


      }
    , select: function(row,_default) {
        var select = d3_updateable(row,"select","select")
        d3_splat(select,"option","option",function(x) { return x.values },function(x) { return typeof(x) == "object" ? x.key : x})
          .text(function(x) { return typeof(x) == "object" ?  x.key : x })
          .attr("value",function(x) { return typeof(x) == "object" ?  x.value : x })
          .attr("selected", function(x) { return x.value == _default ? "selected" : undefined })

      }
    , input: function(row,_default) {
        var select = d3_updateable(row,"input","input")
          .attr("value",_default)

      }
    , textarea: function(row,_default) {
        var textarea = d3_updateable(row,"textarea","textarea")
          .text(_default)
      }
  }
}

Forms.prototype = {
    defaults: function(d) {
      if (d === undefined) return this._defaults
      this._defaults = d
      return this

    }
  , fields: function(d) {
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

      var form = d3_updateable(this._target,".build-form","div",this.data())
        .classed("build-form",true)

      d3_updateable(form,".form-description","div")
        .classed("form-description",true)
        .text(function(x) { return x.description })
        
      var rows = d3_splat(form,".row","div",function(x) { return x.fields}, function(x) { return x.name })
        .classed("row",true)
      
      d3_updateable(rows,".label","div")
        .classed("label",true)
        .text(function(x) { return x.name })

      var self = this

      var field = d3_updateable(rows,".field","div")
        .classed("field",true)
        .each(function(x) {
          var fn = self.renderer(x.type)
          var _default = self._defaults && self._defaults[x.name]
          fn(d3.select(this),_default)
        })

      var field = d3_updateable(rows,".description","div")
        .classed("description",true)
        .html(function(x) { return x.description })



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
          var xx = d3.select(arg).selectAll("textarea").node().value
          if (xx) return {"key":r.name,"value":xx}
        } catch(e) {}

        try {
          var xx = Array.apply([],d3.select(arg).select("select[multiple=true]").node().selectedOptions).map(function(q) { return q.value } )
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
