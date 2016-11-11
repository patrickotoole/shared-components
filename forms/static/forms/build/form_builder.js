(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define('form_builder', ['exports'], factory) :
  factory((global.form_builder = {}));
}(this, function (exports) { 'use strict';

  function Forms(target) {
    this._target = target
    this._on = {
        submit: function(x) {}
    }
    this._renderers = {
        select: function(row) {
          var select = d3_updateable(row,"select","select")
          d3_splat(select,"option","option",function(x) { return x.values },function(x) { return typeof(x) == "object" ? x.key : x})
            .text(function(x) { return typeof(x) == "object" ?  x.key : x })
            .attr("value",function(x) { return typeof(x) == "object" ?  x.value : x })

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
            var xx = d3.select(arg).selectAll("textarea").node().value
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

  function NewForm(target) {
    var self = this
    this._target = target
    this._on = {
        add: function(x) {
          var data = self.data()
          if (data.fields.filter(function(x) { return x.name === undefined }).length) return 

          data.fields.push({})
          self.data(data).draw()
        }
      , create: function(x) {
          console.log(self.data())
        }
    }
    
  }

  NewForm.prototype = {
      data: function(d) {
        if (d === undefined) return this._data
        this._data = d
        return this
      }
    , draw: function() {

        var self = this;

        var form = d3_updateable(this._target,".build-form","div", this.data() )
          .classed("build-form",true)

        var name_row = d3_updateable(form,".form-name-row","div")
          .classed("form-name-row row",true)

        d3_updateable(name_row,"span","span")
          .text("Form name: ")

        d3_updateable(name_row,"input","input")
          .attr("value",function(x) { return x.name })
          .on("change",function(x) {
            x.name = this.value
          })

        var script_row = d3_updateable(form,".script-name-row","div")
          .classed("script-name-row row",true)

        d3_updateable(script_row,"span","span")
          .text("Script name: ")

        d3_updateable(script_row,"input","input")
          .attr("value",function(x) { return x.name })
          .on("change",function(x) {
            x.script = this.value
          })


        var description_row = d3_updateable(form,".form-description-row","div")
          .classed("form-description-row row",true)

        d3_updateable(description_row,"span","span")
          .text("Form description: ")

        d3_updateable(description_row,"textarea","textarea")
          .attr("value",function(x) { return x.description })
          .on("change",function(x) {
            x.description = this.value
          })

        d3_updateable(form,"hr","hr")






        var rows = d3_splat(form,".row","div",function(x) { return x.fields }, function(x) { return x.name })
          .classed("row",true)
        
        var field_label = d3_updateable(rows,".field-label","span")
          .classed("field-label",true)
          .text("Field name: ")

        d3_updateable(field_label,"input","input")
          .attr("value",function(x) { return x.name })
          .on("change",function(x) {
            x.name = this.value
          })

        var field_type = d3_updateable(rows,".field-type","span")
          .classed("field-type",true)
          .text("Field type: ")

        var select_type = d3_updateable(field_type,"select","select")
          .attr("value",function(x) { return x.type})
          .on("change",function(x) {
            x.type = this.selectedOptions[0].__data__
          })

        d3_splat(select_type,"option","option",["input","select","textarea"])
          .attr("selected", function(x) { return this.parentNode.__data__.type == x ? "selected" : undefined })
          .text(String)

        var field_default = d3_updateable(rows,".field-default-select","span")
          .classed("field-default-select",true)
          .text("Field default: ")

        var select_default = d3_updateable(field_default,"select","select")
          .attr("value",function(x) { return x.default})
          .on("change",function(x) {
            x.default_type = this.selectedOptions[0].__data__
          })

        d3_splat(select_default,"option","option",["none","text","json","sql"])
          .attr("selected", function(x) { return this.parentNode.__data__.default == x ? "selected" : undefined })
          .text(String)



        var field_defaults = d3_updateable(rows,".field-default","span")
          .classed("field-default",true)
          .text("Default: ")

        d3_updateable(field_defaults,"textarea","textarea")
          .attr("rows",1)
          .text(function(x) { return x.value })
          .on("change",function(x) { 
            x.default_value = this.value
          })

        var field_defaults = d3_updateable(rows,".field-description","span")
          .classed("field-description",true)
          .text("Description: ")

        d3_updateable(field_defaults,"textarea","textarea")
          .attr("rows",1)
          .text(function(x) { return x.value })
          .on("change",function(x) { 
            x.description = this.value
          })






        var add_row = d3_updateable(this._target,".add-row","div")
          .classed("add-row",true)

        d3_updateable(add_row,"button","button")
          .text("Add row")
          .on("click",this.on("add"))

        var create_row = d3_updateable(this._target,".create-row","div")
          .classed("create-row",true)

        d3_updateable(create_row,"button","button")
          .style("margin-top","10px")
          .text("Create")
          .on("click",function(x) { self.on("create")(self.data()) })

        return this
      }
    , on: function(action,fn) {
        if (fn === undefined) return this._on[action] || function() {};
        this._on[action] = fn;
        return this
      }
    , summarize: function() {
        var values = this._target.selectAll(".row")[0].map(function(arg) {

          var data = arg.__data__

          return { "name": data.name, "value": data.value, "type": data.type }
        })

        return values
      } 
  }

  function new_form(target) {
    return new NewForm(target)
  }

  new_form.prototype = NewForm.prototype

  function FormIndex(target) {

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

  function State(target) {

    var self = this;

    this._target = target
    this._state = {}
    this._subscription = {}

    

  }

  State.prototype = {
      publish: function(name,v) {

         var subscriber = this.get_subscribers_fn(name) || function() {}
           , all = this.get_subscribers_fn("*") || function() {};

         var cb = function(error,value) {
           if (error) return cb(error,null)
           
           this.set(name, value)
           subscriber(false,this._state[name],state)
           all(false,this._state)

         }.bind(this)

         if (typeof v === "function") v(cb)
         else cb(false,v)

         return this
      }
    , subscribe: function(id,fn) {
        var id = id, to = "*", fn = fn;

        if (arguments.length == 3) {
          id = arguments[0]
          to = arguments[1]
          fn = arguments[2]
        }

        var subscriptions = this.get_subscribers_obj(to)

        if (fn === undefined) return subscriptions[id] || function() {};

        subscriptions[id] = fn;

        if (to == "*") subscriptions[id](false,this._state)
        else if (this._state[to]) subscriptions[id](false,this._state[to],this._state)

        return this
       
      }
    , set: function(k,v) {
        if (k != undefined && v != undefined) this._state[k] = v
        return this
      }
    , get_subscribers_obj: function(k) {
        this._subscription[k] = this._subscription[k] || {}
        return this._subscription[k]
      }
    , get_subscribers_fn: function(k) {
        var fns = this.get_subscribers_obj(k)
          , funcs = Object.keys(fns).map(function(x) { return fns[x] })
          , fn = function(error,value,state) {
              return funcs.map(function(g) { return g(error,value,state) })
            }

        return fn
      }
  }

  function state(target) {
    return new State(target)
  }

  state.prototype = State.prototype

  var version = "0.0.1";

  exports.version = version;
  exports.forms = forms;
  exports.form_index = form_index;
  exports.state = state;

}));