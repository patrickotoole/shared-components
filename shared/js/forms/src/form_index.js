import forms from "./forms"
import new_form from "./new_form"

export function FormIndex(target) {

  var self = this;

  this._target = target
  this._on = {
      "click": function(x) {
        self.render_back(x.name)
        self.render_form.bind(self)(this,x)
      }
    , "new": function(x) {
        self.render_back("New")
        self.render_new(x)
      }
    , "create": function(x) { }
    , "submit": function(x) { }
  }

}

FormIndex.prototype = {
    forms: function(d) {
      if (d === undefined) return this._forms
      this._forms = d
      return this
    }
  , select: function(d) {
      if (d === undefined) return this._selected
      this._selected = d
      return this
    }
  , render_selected: function() {
      var self = this

      var d = self._forms.filter(function(f) { return f.name == self._selected.name })

      if (d.length) d = d[0]

      self.render_back(d.name)
      self.render_form.bind(self)(self._show,d)

    }
  , render_form: function(target,x) {
      this._target.selectAll(".new-row")
        .classed("hidden",true)

      forms(target)
        .fields(x.fields)
        .data(x)
        .on("submit", this.on("submit"))
        .draw()

    }
  , render_new: function(x) {
      var self = this;
      self._target.selectAll(".new-row")
        .classed("hidden",true)

      self._index.classed("hidden",true)
      self._show.html("")

      new_form(self._show)
        .data({"name":"","fields":[{}]})
        .on("create",self.on("create"))
        .draw()

      
    }
  , render_back: function(x) {
      var self = this

      self._title.html("")
      self._index.classed("hidden",true)
      self._show.html("")

      var back = d3_updateable(self._title,".back","span")
        .style("display","inline-block")
        .style("width","35px")
        .classed("back",true)

      d3_updateable(back,"a","a")
        .attr("href","#")
        .text("back")
        .on("click", function() { self.on("back")(self._selected) })

      d3_updateable(self._title,".title","span")
        .classed("title",true)
        .text(" > " + x)
    }
  , draw: function() {

      this._title = d3.select("#page-title")
        .text("Forms")

      var index = d3_updateable(this._target,".index","div")
        .classed("index",true)
        .classed("hidden",false)

      this._index = index

      var show = d3_updateable(this._target,".show","div")
        .classed("show",true)
        .html("")

      this._show = show

      var groups = d3.nest()
        .key(function(x) { return x.header || "Other" })
        .entries(this._forms)

      var groups = d3_splat(index,".group","div",groups,function(x) { return x.key})
        .classed("group",true)

      d3_updateable(groups,"h3","h3")
        .text(function(x) { return x.key })


      var rows = d3_splat(groups,".row","div",function(x) { return x.values },function(x) { return x.name })
        .classed("row",true)

      var self = this

      d3_updateable(rows,"a","a")
        .attr("href","#")
        .text(function(x) { return x.name })
        .on("click", function(x) { self.on("click").bind(show)(x,self._selected) })

      var new_row = d3_updateable(this._target,".new-row","div")
        .classed("new-row",true)
        .classed("hidden",false)


      d3_updateable(new_row,"button","button")
        .text("New")
        .on("click",this.on("new").bind(show))

      if (Object.keys(this._selected).length > 0) this.render_selected()

      return this
    }
  , on: function(action,fn) {
      if (fn === undefined) return this._on[action] || function() {};
      this._on[action] = fn;
      return this
    }
}

function form_index(target) {
  return new FormIndex(target)
}

form_index.prototype = FormIndex.prototype

export default form_index;
