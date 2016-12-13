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
        .on("click", function() { self.draw() })

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

      var rows = d3_splat(index,".row","div",this._forms,function(x) { return x.name })
        .classed("row",true)

      d3_updateable(rows,"a","a")
        .attr("href","#")
        .text(function(x) { return x.name })
        .on("click",this.on("click").bind(show))

      var new_row = d3_updateable(this._target,".new-row","div")
        .classed("new-row",true)
        .classed("hidden",false)


      d3_updateable(new_row,"button","button")
        .text("New")
        .on("click",this.on("new").bind(show))

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