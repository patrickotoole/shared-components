import d3_wrapper_with_title from './helper';

export function Setup(target) {
  this._target = target
  this._on = {}

  this._opts = [
          {"key":"Duplicate (profile includes)","value":"Duplicate"}
        , {"key":"Replace","value":"Replace"}
        , {"key":"Modify (profile excludes)","value":"Modify"}
        , {"key":"Deactivate","value":"Deactivate"}
      ]

  this._options = [
          {"groups":"duplicate replace","name":"Line Item ID","type":"input","key":"line_item_id"}
        , {"groups":"duplicate replace","name":"Group or Breakout","type":"select","key":"breakout","options":[{"key":"Breakout","value":"Breakout"},{"key":"Group","value":"Group"}]}
        , {"groups":"create","name":"Group by","type":"input","key":"create_group"}
        , {"groups":"duplicate replace modify","name":"Override or Append fields","type":"select","key":"append","options":[{"key":"Override","value":"Override"},{"key":"Append","value":"Append"}]}
        , {"groups":"override","name":"Imp Budget Override","type":"input","key":"imp_budget"}
        , {"groups":"override","name":"Spend Budget Override","type":"input","key":"spend_budget"}
        , {"groups":"override","name":"Imp Bid Override","type":"input","key":"imp_bid"}
        , {"groups":"override","name":"Spend Bid Override","type":"input","key":"spend_bid"}
        , {"groups":"override","name":"Imp Lifetime Budget Override","type":"input","key":"lifetime_imp_budget"}
        , {"groups":"override","name":"Spend Lifetime Budget Override","type":"input","key":"lifetime_spend_budget"}
      ]
}

function showableSection(target,key,option) {

  var option = option || "extract_type"
  
  return d3_updateable(target,"." + key).classed("showable hidden " + key,true)
    .classed("hidden",function(d) { return !(d[option] == key) })
}

Setup.prototype = {
    draw: function() {

      var self = this
      var setup_wrap = d3_wrapper_with_title(this._target,"Setup","setup",this._data)

      var advertiser_wrap = d3_class(setup_wrap,"advertiser")
      d3_updateable(advertiser_wrap,"span","span").text("Advertiser ID:")
      d3_select(advertiser_wrap,this._data.advertisers,(x) => x.key, x => { return x.value == this._data.advertiser })
        .on("change",function(x){
          var y = this.selectedOptions[0].__data__
          self.on("advertiser")(y)
        })

      var opt_wrap = d3_class(setup_wrap,"optimization")
      d3_updateable(opt_wrap,"span","span").text("Optimization Type:")

      var opts = this._opts

      var opt_type = this._data.settings.filter(x => x.key =="opt_type").concat([{"value":"false"}])[0].value


      d3_select(opt_wrap,opts,(x) => x.key, (x) => { return x.value == opt_type })
        .on("change",function(x){
          var y = this.selectedOptions[0].__data__
          self.on("opt_type")(y)
        })

      var settings = this._data.settings.reduce((p,c) => { p[c.key] = c.value; return p },{})
      var options = this._options

      options.map(o => {o.value = settings[o.key]; return o })

      var _options = d3_class(setup_wrap,"options")

      var o = d3_splat(_options,".option","div",options,x => x.key)
        .attr("class", function(x) { return "option hidden optional " + x.groups})
        .each(function(x) {
          d3_updateable(d3.select(this),"span","span").text(x => x.name)

          if (x.type == "select") d3_select(d3.select(this),x => x.options, x => x.key, y => { return y.value == x.value } )
            .on("change",function(x){
              self.on("update")({"key":x.key,"value":this.selectedOptions[0].__data__.value})
            })

          if (x.type == "input") d3_updateable(d3.select(this),"input","input")
            .attr("value",x.value)
            .on("change",function(x) {
              self.on("update")({"key":x.key,"value":this.value})
            })

        })

      var toggle = d3_updateable(this._target,"a","a").attr("href","#").text("Show Overrides (+)").on("click",function() {

        var or = _options.selectAll(".override")
        toggle.text(!or.classed("hidden") ? "Show Overrides (+)" : "Hide Overrides (-)")
        or.classed("hidden",!or.classed("hidden"))
        
      })


      _options.selectAll("." + opt_type.toLowerCase() )
        .classed("hidden",false)
      

    }
  , summarize: function() {

      var summary = {}

      this._target.selectAll("input").each(function(x) {
        summary.push({"key":this.__data__.key,"value": this.value})
      })

      return {}
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

function setup(target) {
  return new Setup(target)
}

setup.prototype = Setup.prototype

export default setup;
