(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('state'), require('table'), require('filter')) :
  typeof define === 'function' && define.amd ? define('dashboard', ['exports', 'state', 'table', 'filter'], factory) :
  factory((global.dashboard = {}),global.state,global.table,global.filter);
}(this, function (exports,state,table,filter) { 'use strict';

  table = 'default' in table ? table['default'] : table;
  filter = 'default' in filter ? filter['default'] : filter;

  function accessor(attr, val) {
    if (val === undefined) return this["_" + attr]
    this["_" + attr] = val
    return this
  }

  function autoSize(wrap,adjustWidth,adjustHeight) {

    function elementToWidth(elem) {

      var _w = wrap.node().offsetWidth || wrap.node().parentNode.offsetWidth || wrap.node().parentNode.parentNode.offsetWidth
      var num = _w || wrap.style("width").split(".")[0].replace("px","") 
      return parseInt(num)
    }

    function elementToHeight(elem) {
      var num = wrap.style("height").split(".")[0].replace("px","")
      return parseInt(num)
    }

    var w = elementToWidth(wrap) || 700,
      h = elementToHeight(wrap) || 340;

    w = adjustWidth(w)
    h = adjustHeight(h)


    var margin = {top: 10, right: 15, bottom: 10, left: 15},
        width  = w - margin.left - margin.right,
        height = h - margin.top - margin.bottom;

    return {
      margin: margin,
      width: width,
      height: height
    }
  }

  function Select(target) {
    this._on = {}
    this.target = target
  }

  function noop$11() {}
  function identity$7(x) { return x }
  function key$7(x) { return x.key }


  function select(target) {
    return new Select(target)
  }

  Select.prototype = {
      options: function(val) {
        return accessor.bind(this)("options",val) 
      }
    , draw: function() {

        this._select = d3_updateable(this.target,"select","select",this._options)

        var bound = this.on("select").bind(this)

        this._select
          .on("change",function(x) { bound(this.selectedOptions[0].__data__) })

        this._options = d3_splat(this._select,"option","option",identity$7,key$7)
          .text(key$7)
          .property("selected", (x) => x.value == this._selected ? "selected" : null)

        return this
      }
    , selected: function(val) {
        return accessor.bind(this)("selected",val)
      }
    , on: function(action, fn) {
        if (fn === undefined) return this._on[action] || noop$11;
        this._on[action] = fn;
        return this
      }
  }

  function noop$10() {}
  function buttonWrap(wrap) {
    var head = d3_updateable(wrap, "h3.buttons","h3")
      .classed("buttons",true)
      .style("margin-bottom","15px")
      .style("margin-top","-5px")

    var right_pull = d3_updateable(head,".pull-right","span")
      .classed("pull-right header-buttons", true)
      .style("margin-right","17px")
      .style("line-height","22px")
      .style("text-decoration","none !important")

    return right_pull
  }

  function expansionWrap(wrap) {
    return d3_updateable(wrap,"div.header-body","div")
      .style("font-size","13px")
      .style("text-transform","none")
      .style("color","#333")
      .style("font-weight","normal")
      .style("margin-left","175px")
      .style("padding","25px")
      .style("margin-bottom","25px")
      .style("margin-right","175px")
      .style("background-color","white")
      .classed("header-body hidden",true)
  }

  function headWrap(wrap) {
    return d3_updateable(wrap, "h3.data-header","h3")
      .classed("data-header",true)
      .style("margin-bottom","15px")
      .style("margin-top","-5px")
      .style("font-weight"," bold")
      .style("font-size"," 14px")
      .style("line-height"," 22px")
      .style("text-transform"," uppercase")
      .style("color"," #888")
      .style("letter-spacing"," .05em")

  }


  function Header(target) {
    this._on = {}
    this.target = target

    var CSS_STRING = String(function() {/*
      .header-buttons a span.hover-show { display:none }
      .header-buttons a:hover span.hover-show { display:inline; padding-left:3px }
    */})
    
  }

  function header(target) {
    return new Header(target)
  }

  Header.prototype = {
      text: function(val) {
        return accessor.bind(this)("text",val) 
      }
    , options: function(val) {
        return accessor.bind(this)("options",val) 
      }
    , buttons: function(val) {
        return accessor.bind(this)("buttons",val) 
      }
    , expansion: function(val) {
        return accessor.bind(this)("expansion",val) 
      }
    , draw: function() {
        var wrap = d3_updateable(this.target, ".header-wrap","div")
          .classed("header-wrap",true)

        var expand_wrap = expansionWrap(wrap)
          , button_wrap = buttonWrap(wrap)
          , head_wrap = headWrap(wrap)

        d3_updateable(head_wrap,"span.title","span")
          .classed("title",true)
          .text(this._text)

        if (this._options) {

          var bound = this.on("select").bind(this)

          var selectBox = select(head_wrap)
            .options(this._options)
            .on("select",function(x) { bound(x) })
            .draw()

          selectBox._select
            .style("width","19px")
            .style("margin-left","12px")
            
          selectBox._options
            .style("color","#888")
            .style("min-width","100px")
            .style("text-align","center")
            .style("display","inline-block")
            .style("padding","5px")
        }

        if (this._buttons) {

          var self = this;

          var a = d3_splat(button_wrap,"a","a",this._buttons, function(x) { return x.text })
            .style("vertical-align","middle")
            .style("font-size","12px")
            .style("font-weight","bold")
            .style("border-right","1px solid #ccc")
            .style("padding-right","10px")
            .style("padding-left","10px")
            .style("display","inline-block")
            .style("line-height","22px")
            .style("text-decoration","none")
            .html(x => "<span class='" + x.icon + "'></span><span style='padding-left:3px'>" + x.text + "</span>")
            .attr("class",x => x.class)
            .on("click",x => this.on(x.class + ".click")(x))


        }

        return this
      }
    , on: function(action, fn) {
        if (fn === undefined) return this._on[action] || noop$10;
        this._on[action] = fn;
        return this
      }
  }

  function noop$2() {}
  function FilterView(target) {
    this._on = {
      select: noop$2
    }

    this.target = target
    this._filter_options = {
        "Category": "parent_category_name"
      , "Title": "url"
      , "Time": "hour"
    }
  }

  function filter_view(target) {
    return new FilterView(target)
  }

  FilterView.prototype = {
      data: function(val) {
        return accessor.bind(this)("data",val) 
      }
    , logic: function(val) {
        return accessor.bind(this)("logic",val) 
      }
    , categories: function(val) {
        return accessor.bind(this)("categories",val) 
      }
    , filters: function(val) {
        return accessor.bind(this)("filters",val) 
      }
    , draw: function() {
        
        var wrapper = d3_updateable(this.target,".filter-wrap","div",false,function(){ return 1})
          .classed("filter-wrap",true)

        header(wrapper)
          .text("Filter")
          .draw()

        var subtitle = d3_updateable(wrapper, ".subtitle-filter","div")
          .classed("subtitle-filter",true)
          .style("padding-left","10px")
          .style("text-transform"," uppercase")
          .style("font-weight"," bold")
          .style("line-height"," 33px")
          .style("background"," #e3ebf0")
          .style("margin-bottom","10px")
      
        d3_updateable(subtitle,"span.first","span")
          .text("Users matching " )
          .classed("first",true)
      
        var filter_type  = d3_updateable(subtitle,"span.middle","span")
          .classed("middle",true)
      
        select(filter_type)
          .options(this.logic())
          .on("select", function(x) {
            this.logic().map(function(y) { 
              y.selected = (y.key == x.key)
            })
            this.on("logic.change")(this.logic())
          }.bind(this))
          .draw()
        
        d3_updateable(subtitle,"span.last","span")
          .text(" of the following:")
          .classed("last",true)


        // -------- CATEGORIES --------- //

        var categories = this.categories()
        var filter_change = this.on("filter.change").bind(this)

        function selectizeInput(filter,value) {
          var self = this;
          
          var select = d3_updateable(filter,"input","input")
            .style("width","200px")
            .property("value",value.value)

          filter.selectAll(".selectize-control")
            .each(function(x) {
              var destroy = d3.select(this).on("destroy")
              if (destroy) destroy()
            })


          var s = $(select.node()).selectize({
            persist: false,
            create: function(x){
              value.value = (value.value ? value.value + "," : "") + x
              self.on("update")(self.data())
              return {
                value: x, text: x
              }
            },
            onDelete: function(x){
              value.value = value.value.split(",").filter(function(z) { return z != x[0]}).join(",")
              self.on("update")(self.data())
              return {
                value: x, text: x
              }
            }
          })

          filter.selectAll(".selectize-control")
            .on("destroy",function() {
              s[0].selectize.destroy()
            })

        }

        function selectizeSelect(filter,value) {
          var self = this;

          filter.selectAll(".selectize-control").remove()

          filter.selectAll(".selectize-control")
            .each(function(x) {
              var destroy = d3.select(this).on("destroy")
              if (destroy) destroy()
            })



      
          var select = d3_updateable(filter,"select.value","select")
            .classed("value",true)
            .style("margin-bottom","10px")
            .style("padding-left","10px")
            .style("min-width","200px")
            .style("max-width","500px")
            .attr("multiple",true)
            .on("change", function(x){
              value.value = this.value
              self.on("update")(self.data())
            })
      
          d3_splat(select,"option","option",categories,function(x) { return x.key })
            .attr("selected",function(x) { return value.value && value.value.indexOf(x.key) > -1 ? "selected" : undefined })
            .text(function(x) { return x.key })

          var s = $(select.node()).selectize({
            persist: false,
            onChange: function(x) {
              value.value = x.join(",")
              self.on("update")(self.data())
            }
          })

          filter.selectAll(".selectize-control")
            .on("destroy",function() {
              s[0].selectize.destroy()
            })



      
        }
      
        this._logic_filter = filter.filter(wrapper)
          .fields(Object.keys(this._filter_options))
          .ops([
              [{"key": "is in.category"},{"key": "is not in.category"}]
            , [{"key": "contains.selectize"}, {"key":"does not contain.selectize"}]
            , [{"key": "equals"}, {"key":"between","input":2}]
          ])
          .data(this.filters())
          .render_op("contains.selectize",selectizeInput)
          .render_op("does not contain.selectize",selectizeInput)
          .render_op("is in.category",selectizeSelect)
          .render_op("is not in.category",selectizeSelect)
          .render_op("between",function(filter,value) {
            var self = this
      
            value.value = typeof(value.value) == "object" ? value.value : [0,24]
      
            d3_updateable(filter,"input.value.low","input")
              .classed("value low",true)
              .style("margin-bottom","10px")
              .style("padding-left","10px")
              .style("width","90px")
              .attr("value", value.value[0])
              .on("keyup", function(x){
                var t = this
              
                self.typewatch(function() {
                  value.value[0] = t.value
                  self.on("update")(self.data())
                },1000)
              })
      
            d3_updateable(filter,"span.value-and","span")
              .classed("value-and",true)
              .text(" and ")
      
            d3_updateable(filter,"input.value.high","input")
              .classed("value high",true)
              .style("margin-bottom","10px")
              .style("padding-left","10px")
              .style("width","90px")
              .attr("value", value.value[1])
              .on("keyup", function(x){
                var t = this
              
                self.typewatch(function() {
                  value.value[1] = t.value
                  self.on("update")(self.data())
                },1000)
              })
          })
          .on("update",function(filters){
            filter_change(filters)
          })
          .draw()

        //d3_updateable(this.target,".filter-wrap-spacer","div")
        //  .classed("filter-wrap-spacer",true)
        //  .style("height",wrapper.style("height"))

        //wrapper
        //  .style("width",this.target.style("width"))
        //  .style("position","fixed")
        //  .style("z-index","300")
        //  .style("background","#f0f4f7")

        return this
      }
    , on: function(action, fn) {
        if (fn === undefined) return this._on[action] || noop$2;
        this._on[action] = fn;
        return this
      }
  }

  function noop$12() {}
  function identity$8(x) { return x }
  function key$8(x) { return x.key }

  function ButtonRadio(target) {
    this._on = {}
    this.target = target
  }

  function button_radio(target) {
    return new ButtonRadio(target)
  }

  ButtonRadio.prototype = {
      data: function(val) {
        return accessor.bind(this)("data",val) 
      }
    , on: function(action, fn) {
        if (fn === undefined) return this._on[action] || noop$12;
        this._on[action] = fn;
        return this
      }
    , draw: function () {
    
      var CSS_STRING = String(function() {/*
        .options-view { text-align:right }
        .show-button {
        width: 150px;
        text-align: center;
        line-height: 40px;
        border-radius: 15px;
        border: 1px solid #ccc;
        font-size: 12px;
        text-transform: uppercase;
        font-weight: bold;
        display:inline-block;
        margin-right:15px;
          }
        .show-button:hover { text-decoration:none; color:#555 }
        .show-button.selected {
          background: #e3ebf0;
          color: #555;
        }
      */})
    
      d3_updateable(d3.select("head"),"style#show-css","style")
        .attr("id","header-css")
        .text(CSS_STRING.replace("function () {/*","").replace("*/}",""))
    
      var options = d3_updateable(this.target,".button-radio-row","div")
        .classed("button-radio-row",true)
        .style("margin-bottom","35px")
    
    
      var button_row = d3_updateable(options,".options-view","div",this.data())
        .classed("options-view",true)

      var bound = this.on("click").bind(this)
    
      d3_splat(button_row,".show-button","a",identity$8, key$8)
        .classed("show-button",true)
        .classed("selected", function(x) { return x.selected })
        .text(key$8)
        .on("click", function(x) { bound(x) })

      return this
    
      }
    
  }

  function noop$3() {}
  function OptionView(target) {
    this._on = {
      select: noop$3
    }
    this.target = target
  }



  function option_view(target) {
    return new OptionView(target)
  }

  OptionView.prototype = {
      data: function(val) {
        return accessor.bind(this)("data",val) 
      }
    , options: function(val) {
        return accessor.bind(this)("options",val) 
      }
    , draw: function() {


        var wrap = d3_updateable(this.target,".option-wrap","div")
          .classed("option-wrap",true)

        //header(wrap)
        //  .text("Choose View")
        //  .draw()

        button_radio(wrap)
          .on("click", this.on("select") )
          .data(this.data())
          .draw()

        return this
      }
    , on: function(action, fn) {
        if (fn === undefined) return this._on[action] || noop$3;
        this._on[action] = fn;
        return this
      }
  }

  function p(dd) {
    var p = []
    d3.range(0,24).map(function(t) {
      ["0","20","40"].map(function(m) {
        if (t < 10) p.push("0" + String(t)+String(m))
        else p.push(String(t)+String(m))

      })
    })
    var rolled = d3.nest()
      .key(function(k) { return k.hour + k.minute })
      .rollup(function(v) {
        return v.reduce(function(p,c) {
          p.articles[c.url] = true
          p.views += c.count
          p.sessions += c.uniques
          return p
        },{ articles: {}, views: 0, sessions: 0})
      })
      .entries(dd)
      .map(function(x) {
        Object.keys(x.values).map(function(y) {
          x[y] = x.values[y]
        })
        x.article_count = Object.keys(x.articles).length
        x.hour = x.key.slice(0,2)
        x.minute = x.key.slice(2)
        x.value = x.article_count
        x.key = p.indexOf(x.key)
        //delete x['articles']
        return x
      })
    return rolled
  }
  function buildSummaryData(data) {
        var reduced = data.reduce(function(p,c) {
            p.domains[c.domain] = true
            p.articles[c.url] = true
            p.views += c.count
            p.sessions += c.uniques

            return p
          },{
              domains: {}
            , articles: {}
            , sessions: 0
            , views: 0
          })

        reduced.domains = Object.keys(reduced.domains).length
        reduced.articles = Object.keys(reduced.articles).length

        return reduced

  }

  function buildSummaryAggregation(samp,pop) {
        var data_summary = {}
        Object.keys(samp).map(function(k) {
          data_summary[k] = {
              sample: samp[k]
            , population: pop[k]
          }
        })

        return data_summary
    
  }
  function buildCategories(data) {
    var values = data.category
          .map(function(x){ return {"key": x.parent_category_name, "value": x.count } })
          .sort(function(p,c) {return c.value - p.value }).slice(0,15)
      , total = values.reduce(function(p, x) {return p + x.value }, 0)

    return {
        key: "Categories"
      , values: values.map(function(x) { x.percent = x.value/total; return x})
    }
  }

  function buildTimes(data) {

    var hour = data.current_hour

    var categories = data.display_categories.values
      .filter(function(a) { return a.selected })
      .map(function(a) { return a.key })

    if (categories.length > 0) {
      hour = data.category_hour.filter(function(x) {return categories.indexOf(x.parent_category_name) > -1})
      hour = d3.nest()
        .key(function(x) { return x.hour })
        .key(function(x) { return x.minute })
        .rollup(function(v) {
          return v.reduce(function(p,c) { 
            p.uniques = (p.uniques || 0) + c.uniques; 
            p.count = (p.count || 0) + c.count;  
            return p },{})
        })
        .entries(hour)
        .map(function(x) { 
          console.log(x.values); 
          return x.values.reduce(function(p,k){ 
            p['minute'] = parseInt(k.key); 
            p['count'] = k.values.count; 
            p['uniques'] = k.values.uniques; 
            return p 
        }, {"hour":x.key}) } )
    }

    var values = hour
      .map(function(x) { return {"key": parseFloat(x.hour) + 1 + x.minute/60, "value": x.count } })

    return {
        key: "Browsing behavior by time"
      , values: values
    }
  }

  function buildTopics(data) {

    var categories = data.display_categories.values
      .filter(function(a) { return a.selected })
      .map(function(a) { return a.key })


    var idf = d3.nest()
      .key(function(x) {return x.topic})
      .rollup(function(x) {return x[0].idf })
      .map(data.full_urls.filter(function(x){ return x.parent_category_name != "Internet & Telecom"}) )

    var getIDF = function(x) {
      return (idf[x] == "NA") || (idf[x] > 8686) ? 0 : idf[x]
    }

    var values = data.full_urls
      .filter(function(x) { return x.topic ? x.topic.toLowerCase() != "no topic" : true })
      .map(function(x) { 
        return {
            "key":x.topic
          , "value":x.count
          , "uniques": x.uniques 
          , "url": x.url
        } 
      })



    values = d3.nest()
      .key(function(x){ return x.key})
      .rollup(function(x) { 
         return {
             "key": x[0].key
           , "value": x.reduce(function(p,c) { return p + c.value},0)
           , "percent_unique": x.reduce(function(p,c) { return p + c.uniques/c.value},0)/x.length
           , "urls": x.reduce(function(p,c) { p.indexOf(c.url) == -1 ? p.push(c.url) : p; return p },[])

         } 
      })
      .entries(values).map(function(x){ return x.values })

    if (categories.length > 0)
      values = values.filter(function(x) {return categories.indexOf(x.parent_category_name) > -1 })

    values.map(function(x) {
      x.tf_idf = getIDF(x.key) * (x.value*x.percent_unique) * (x.value*x.percent_unique) 
      x.count = x.value
      x.importance = Math.log(x.tf_idf)
    })
    values = values.sort(function(p,c) { return c.tf_idf - p.tf_idf })


    var total = d3.sum(values,function(x) { return x.count*x.percent_unique})

    values.map(function(x) { 
      x.pop_percent = 1.02/getIDF(x.key)*100
      x.pop_percent = x.pop_percent == Infinity ? 0 : x.pop_percent

      x.sample_percent = x.count*x.percent_unique/total*100
    })

    var norm = d3.scale.linear()
      .range([0, d3.max(values,function(x){ return x.pop_percent})])
      .domain([0, d3.max(values,function(x){return x.sample_percent})])
      .nice()

    values.map(function(x) {
      x.sample_percent_norm = norm(x.sample_percent)

      x.ratio = x.sample_percent/x.pop_percent
      //x.percent_norm = x.percent
    })



    
    return {
        key: "Top Topics"
      , values: values.slice(0,300)
    }
  }

  function buildDomains(data) {

    var categories = data.display_categories.values
      .filter(function(a) { return a.selected })
      .map(function(a) { return a.key })

    var idf = d3.nest()
      .key(function(x) {return x.domain })
      .rollup(function(x) {return x[0].idf })
      .map(data.full_urls.filter(function(x){ return x.parent_category_name != "Internet & Telecom"}) )

    var getIDF = function(x) {
      return (idf[x] == "NA") || (idf[x] > 8686) ? 0 : idf[x]
    }

    var values = data.full_urls
      .map(function(x) { 
        return {
            "key":x.domain
          , "value":x.count
          , "parent_category_name": x.parent_category_name
          , "uniques": x.uniques 
          , "url": x.url
        } 
      })



    values = d3.nest()
      .key(function(x){ return x.key})
      .rollup(function(x) { 
         return {
             "parent_category_name": x[0].parent_category_name
           , "key": x[0].key
           , "value": x.reduce(function(p,c) { return p + c.value},0)
           , "percent_unique": x.reduce(function(p,c) { return p + c.uniques/c.value},0)/x.length
           , "urls": x.reduce(function(p,c) { p.indexOf(c.url) == -1 ? p.push(c.url) : p; return p },[])

         } 
      })
      .entries(values).map(function(x){ return x.values })

    if (categories.length > 0)
      values = values.filter(function(x) {return categories.indexOf(x.parent_category_name) > -1 })

    values.map(function(x) {
      x.tf_idf = getIDF(x.key) * (x.value*x.percent_unique) * (x.value*x.percent_unique) 
      x.count = x.value
      x.importance = Math.log(x.tf_idf)
    })
    values = values.sort(function(p,c) { return c.tf_idf - p.tf_idf })


    var total = d3.sum(values,function(x) { return x.count*x.percent_unique})

    values.map(function(x) { 
      x.pop_percent = 1.02/getIDF(x.key)*100
      x.pop_percent = x.pop_percent == Infinity ? 0 : x.pop_percent

      x.sample_percent = x.count*x.percent_unique/total*100
    })

    var norm = d3.scale.linear()
      .range([0, d3.max(values,function(x){ return x.pop_percent})])
      .domain([0, d3.max(values,function(x){return x.sample_percent})])
      .nice()

    var tt = d3.sum(values,function(x) { return x.pop_percent })

    values.map(function(x) {
      x.sample_percent_norm = norm(x.sample_percent)
      x.real_pop_percent = x.pop_percent/tt*100
      x.ratio = x.sample_percent/x.real_pop_percent

    })



    
    return {
        key: "Top Domains"
      , values: values.slice(0,500)
    }
  }

  function buildUrls(data) {

    var categories = data.display_categories.values
      .filter(function(a) { return a.selected })
      .map(function(a) { return a.key })

    var values = data.full_urls
      .map(function(x) { return {"key":x.url,"value":x.count, "parent_category_name": x.parent_category_name} })

    if (categories.length > 0)
      values = values.filter(function(x) {return categories.indexOf(x.parent_category_name) > -1 })

    values = values.filter(function(x) {
      try {
        return x.key
          .replace("http://","")
          .replace("https://","")
          .replace("www.","").split(".").slice(1).join(".").split("/")[1].length > 5
      } catch(e) {
        return false
      }
    }).sort(function(p,c) { return c.value - p.value })


    
    return {
        key: "Top Articles"
      , values: values.slice(0,100)
    }
  }

  function buildOnsiteSummary(data) {
    var yesterday = data.timeseries_data[0]
    var values = [
          {
              "key": "Page Views"
            , "value": yesterday.views
          }
        , {
              "key": "Unique Visitors"
            , "value": yesterday.uniques

          }
      ]
    return {"key":"On-site Activity","values":values}
  }

  function buildOffsiteSummary(data) {
    var values = [  
          {
              "key": "Off-site Views"
            , "value": data.full_urls.reduce(function(p,c) {return p + c.uniques},0)
          }
        , {
              "key": "Unique pages"
            , "value": Object.keys(data.full_urls.reduce(function(p,c) {p[c.url] = 0; return p },{})).length
          }
      ]
    return {"key":"Off-site Activity","values":values}
  }

  function buildActions(data) {
    
    return {"key":"Segments","values": data.actions.map(function(x){ return {"key":x.action_name, "value":0, "selected": data.action_name == x.action_name } })}
  }

  function prepData() {
    return p.apply(this, arguments)
  };

  var EXAMPLE_DATA = {
      "key": "Browsing behavior by time"
    , "values": [
        {  
            "key": 1
          , "value": 12344
        }
      , {
            "key": 2
          , "value": 12344
        }
      , {
            "key": 2.25
          , "value": 12344
        }
      , {
            "key": 2.5
          , "value": 12344
        }
      , {
            "key": 3
          , "value": 1234
        }

      , {
            "key": 4
          , "value": 12344
        }


    ] 
  }

  function TimeSeries(target) {
    this._target = target;
    this._data = EXAMPLE_DATA
    this._on = {}
  }

  function time_series(target) {
    return new TimeSeries(target)
  }

  TimeSeries.prototype = {

      data: function(val) { return accessor.bind(this)("data",val) }
    , on: function(action,fn) {
        if (fn === undefined) return this._on[action] || function() {};
        this._on[action] = fn;
        return this
      }
    , title: function(val) { return accessor.bind(this)("title",val) }
    , height: function(val) { return accessor.bind(this)("height",val) }

    , draw: function() {
        var wrap = this._target
        var desc = d3_updateable(wrap,".vendor-domains-bar-desc","div")
          .classed("vendor-domains-bar-desc",true)
          .style("display","inherit")
          .style("height","100%")
          .style("width","100%")
          .datum(this._data)

        var wrapper = d3_updateable(desc,".w","div")
          .classed("w",true)
          .style("height","100%")
          .style("width","100%")


        var self = this;
    
        

        wrapper.each(function(row){

          var data = row.values.sort(function(p,c) { return c.key - p.key})
            , count = data.length;


          var _sizes = autoSize(wrapper,function(d){return d -10}, function(d){return self._height || 60 }),
            gridSize = Math.floor(_sizes.width / 24 / 3);

          var valueAccessor = function(x) { return x.value }
            , valueAccessor2 = function(x) { return x.value2 }
            , keyAccessor = function(x) { return x.key }

          var steps = Array.apply(null, Array(count)).map(function (_, i) {return i+1;})

          var _colors = ["#ffffd9","#edf8b1","#c7e9b4","#7fcdbb","#41b6c4","#1d91c0","#225ea8","#253494","#081d58"]
          var colors = _colors

          var x = d3.scale.ordinal().range(steps)
            , y = d3.scale.linear().range([_sizes.height, 0 ])


          var colorScale = d3.scale.quantile()
            .domain([0, d3.max(data, function (d) { return d.frequency; })])
            .range(colors);

          var svg_wrap = d3_updateable(wrapper,"svg","svg")
            .attr("width", _sizes.width + _sizes.margin.left + _sizes.margin.right)
            .attr("height", _sizes.height + _sizes.margin.top + _sizes.margin.bottom)

          var svg = d3_splat(svg_wrap,"g","g",function(x) {return [x.values]},function(_,i) {return i})
            .attr("transform", "translate(" + _sizes.margin.left + "," + 0 + ")")

          x.domain([0,72]);
          y.domain([0, d3.max(data, function(d) { return Math.sqrt(valueAccessor(d)); })]);

          var buildBars = function(data,keyAccessor,valueAccessor,y,c) {

            var bars = d3_splat(svg, ".timing-bar" + c, "rect", data, keyAccessor)
              .attr("class", "timing-bar" + c)
             
            bars
              .attr("x", function(d) { return ((keyAccessor(d) - 1) * gridSize ); })
              .attr("width", gridSize - 1)
              .attr("y", function(d) { 
                return y(Math.sqrt( valueAccessor(d) )); 
              })
              .attr("fill","#aaa")
              .attr("fill",function(x) { return colorScale( keyAccessor(x) + c ) || "grey" } )
              //.attr("stroke","white")
              //.attr("stroke-width","1px")
              .attr("height", function(d) { return _sizes.height - y(Math.sqrt( valueAccessor(d) )); })
              .style("opacity","1")
              .on("mouseover",function(x){ 
                self.on("hover").bind(this)(x)
              })

          }
          

          if (data && data.length && data[0].value2) {
            var  y2 = d3.scale.linear().range([_sizes.height, 0 ])
            y2.domain([0, d3.max(data, function(d) { return Math.sqrt(valueAccessor2(d)); })]);
            buildBars(data,keyAccessor,valueAccessor2,y2,"-2")
          }


          buildBars(data,keyAccessor,valueAccessor,y,"")
        
      
        var z = d3.time.scale()
          .range([0, gridSize*24*3])
          .nice(d3.time.hour,24)
          
      
        var xAxis = d3.svg.axis()
          .scale(z)
          .ticks(3)
          .tickFormat(d3.time.format("%I %p"));
      
        svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + _sizes.height + ")")
            .call(xAxis);



          
        })


      }
  }


  var timeseries = Object.freeze({
    prepData: prepData,
    TimeSeries: TimeSeries,
    default: time_series
  });

  function Pie(target) {
    this.target = target
  }

  Pie.prototype = {
      radius: function(val) {
        return accessor.bind(this)("radius",val)
      }
    , data: function(val) {
        return accessor.bind(this)("data",val) 
      }
    , on: function(action, fn) {
        if (fn === undefined) return this._on[action] || noop;
        this._on[action] = fn;
        return this
      }
    , draw: function() {
    
      var d = d3.entries({
          sample: this._data.sample
        , population: this._data.population - this._data.sample
      })
      
      var color = d3.scale.ordinal()
          .range(["#98abc5", "#8a89a6", "#7b6888", "#6b486b", "#a05d56", "#d0743c", "#ff8c00"]);
      
      var arc = d3.svg.arc()
          .outerRadius(this._radius - 10)
          .innerRadius(0);
      
      var pie = d3.layout.pie()
          .sort(null)
          .value(function(d) { return d.value; });
      
      var svg = d3_updateable(this.target,"svg","svg",false,function(x){return 1})
          .attr("width", 50)
          .attr("height", 52)
    
      svg = d3_updateable(svg,"g","g")
          .attr("transform", "translate(" + 25 + "," + 26 + ")");
      
      var g = d3_splat(svg,".arc","g",pie(d),function(x){ return x.data.key })
        .classed("arc",true)
    
      d3_updateable(g,"path","path")
        .attr("d", arc)
        .style("fill", function(d) { return color(d.data.key) });
    }
  }

  function pie(target) {
    return new Pie(target)
  }

  function diff_bar(target) {
    return new DiffBar(target)
  }

  // data format: [{key, normalized_diff}, ... ]

  class DiffBar {
    constructor(target) {
      this._target = target

      this._key_accessor = "key"
      this._value_accessor = "value"
      this._bar_height = 20
      this._bar_width = 150
    } 

    key_accessor(val) { return accessor.bind(this)("key_accessor",val) }
    value_accessor(val) { return accessor.bind(this)("value_accessor",val) }
    bar_height(val) { return accessor.bind(this)("bar_height",val) }
    bar_width(val) { return accessor.bind(this)("bar_width",val) }



    data(val) { return accessor.bind(this)("data",val) } 
    title(val) { return accessor.bind(this)("title",val) } 


    draw() {

      var w = d3_updateable(this._target,".diff-wrap","div",false,function() {return 1})
        .classed("diff-wrap",true)

      d3_updateable(w,"h3","h3").text(this._title)

      var wrap = d3_updateable(w,".svg-wrap","div",this._data,function(x) { return 1 })
        .classed("svg-wrap",true)

      var k = this.key_accessor()
        , v = this.value_accessor()
        , height = this.bar_height()
        , bar_width = this.bar_width()

      var keys = this._data.map(function(x) { return x[k] })
        , max = d3.max(this._data,function(x) { return x[v] })
        , sampmax = d3.max(this._data,function(x) { return -x[v] })

      var xsampscale = d3.scale.linear()
            .domain([0,sampmax])
            .range([0,bar_width])
        , xscale = d3.scale.linear()
            .domain([0,max])
            .range([0,bar_width])
        , yscale = d3.scale.linear()
            .domain([0,keys.length])
            .range([0,keys.length*height]);

      var canvas = d3_updateable(wrap,"svg","svg",false,function() { return 1})
        .attr({"width":bar_width*3, "height": keys.length*height + 10});

      var xAxis = d3.svg.axis();
      xAxis
        .orient('bottom')
        .scale(xscale)

      var yAxis = d3.svg.axis();
      yAxis
        .orient('left')
        .scale(yscale)
        .tickSize(2)
        .tickFormat(function(d,i){ return keys[i]; })
        .tickValues(d3.range(keys.length));

      var y_xis = d3_updateable(canvas,'g.y','g')
        .attr("class","y axis")
        .attr("transform", "translate(" + (bar_width + bar_width/2) + ",15)")
        .attr('id','yaxis')
        .call(yAxis);

      y_xis.selectAll("text")
        .attr("style","text-anchor: middle;")

      
      var chart = d3_updateable(canvas,'g.chart','g')
        .attr("class","chart")
        .attr("transform", "translate(" + (bar_width*2) + ",0)")
        .attr('id','bars')
      
      var bars = d3_splat(chart,".pop-bar","rect",function(x) { return x}, function(x) { return x.key })
        .attr("class","pop-bar")
        .attr('height',height-4)
        .attr({'x':0,'y':function(d,i){ return yscale(i) + 8.5; }})
        .style('fill','#388e3c')
        .attr("width",function(x) { return xscale(x[v]) })

      var chart2 = d3_updateable(canvas,'g.chart2','g')
        .attr("class","chart2")
        .attr("transform", "translate(0,0)")
        .attr('id','bars')


      var sampbars = d3_splat(chart2,".samp-bar","rect",function(x) { return x}, function(x) { return x.key })
        .attr("class","samp-bar")
        .attr('height',height-4)
        .attr({'x':function(x) { return bar_width - xsampscale(-x[v])},'y':function(d,i){ return yscale(i) + 8.5; }})
        .style('fill','#d32f2f')
        .attr("width",function(x) { return xsampscale(-x[v]) })

      y_xis.exit().remove()

      chart.exit().remove()
      chart2.exit().remove()

      bars.exit().remove()
      sampbars.exit().remove()


      


      return this
    }
  }

  function comp_bar(target) {
    return new CompBar(target)
  }

  // data format: [{key, normalized_diff}, ... ]

  class CompBar {
    constructor(target) {
      this._target = target

      this._key_accessor = "key"
      this._pop_value_accessor = "value"
      this._samp_value_accessor = "value"

      this._bar_height = 20
      this._bar_width = 300
    } 

    key_accessor(val) { return accessor.bind(this)("key_accessor",val) }
    pop_value_accessor(val) { return accessor.bind(this)("pop_value_accessor",val) }
    samp_value_accessor(val) { return accessor.bind(this)("samp_value_accessor",val) }

    bar_height(val) { return accessor.bind(this)("bar_height",val) }
    bar_width(val) { return accessor.bind(this)("bar_width",val) }



    data(val) { return accessor.bind(this)("data",val) } 
    title(val) { return accessor.bind(this)("title",val) } 


    draw() {

      var w = d3_updateable(this._target,".comp-wrap","div",false,function() {return 1})
        .classed("comp-wrap",true)

      d3_updateable(w,"h3","h3").text(this._title)

      var wrap = d3_updateable(w,".svg-wrap","div",this._data,function(x) { return 1 })
        .classed("svg-wrap",true)

      var k = this.key_accessor()
        , p = this.pop_value_accessor()
        , s = this.samp_value_accessor()
        , height = this.bar_height()
        , bar_width = this.bar_width()

      var keys = this._data.map(function(x) { return x[k] })
        , max = d3.max(this._data,function(x) { return x[p] })
        , sampmax = d3.max(this._data,function(x) { return x[s] })

      var xsampscale = d3.scale.linear()
            .domain([0,sampmax])
            .range([0,bar_width])
        , xscale = d3.scale.linear()
            .domain([0,max])
            .range([0,bar_width])
        , yscale = d3.scale.linear()
            .domain([0,keys.length])
            .range([0,keys.length*height]);

      var canvas = d3_updateable(wrap,"svg","svg",false,function() { return 1})
        .attr({"width":bar_width+bar_width/2, "height": keys.length*height + 10});

      var xAxis = d3.svg.axis();
      xAxis
        .orient('bottom')
        .scale(xscale)

      var yAxis = d3.svg.axis();
      yAxis
        .orient('left')
        .scale(yscale)
        .tickSize(2)
        .tickFormat(function(d,i){ return keys[i]; })
        .tickValues(d3.range(keys.length));

      var y_xis = d3_updateable(canvas,'g.y','g')
        .attr("class","y axis")
        .attr("transform", "translate(" + (bar_width/2) + ",15)")
        .attr('id','yaxis')
        .call(yAxis);

      y_xis.selectAll("text")

      
      var chart = d3_updateable(canvas,'g.chart','g')
        .attr("class","chart")
        .attr("transform", "translate(" + (bar_width/2) + ",0)")
        .attr('id','bars')
      
      var bars = d3_splat(chart,".pop-bar","rect",function(x) { return x}, function(x) { return x.key })
        .attr("class","pop-bar")
        .attr('height',height-2)
        .attr({'x':0,'y':function(d,i){ return yscale(i) + 7.5; }})
        .style('fill','gray')
        .attr("width",function(x) { return xscale(x[p]) })


      var sampbars = d3_splat(chart,".samp-bar","rect",function(x) { return x}, function(x) { return x.key })
        .attr("class","samp-bar")
        .attr('height',height-10)
        .attr({'x':0,'y':function(d,i){ return yscale(i) + 11.5; }})
        .style('fill','#081d58')
        .attr("width",function(x) { return xsampscale(x[s] || 0) })

      y_xis.exit().remove()

      chart.exit().remove()

      bars.exit().remove()
      sampbars.exit().remove()

      return this
    }
  }

  function comp_bubble(target) {
    return new CompBubble(target)
  }

  // data format: [{key, normalized_diff}, ... ]

  class CompBubble {
    constructor(target) {
      this._target = target

      this._key_accessor = "key"

      this._height = 20
      this._space = 14
      this._middle = 180
      this._legend_width = 80

      this._buckets = [10,30,60,120,180,360,720,1440,2880,5760,10080].map(function(x) { return x*60 })
      this._rows = []


    } 

    key_accessor(val) { return accessor.bind(this)("key_accessor",val) }
    value_accessor(val) { return accessor.bind(this)("value_accessor",val) }

    height(val) { return accessor.bind(this)("height",val) }
    space(val) { return accessor.bind(this)("space",val) }
    middle(val) { return accessor.bind(this)("middle",val) }
    buckets(val) { return accessor.bind(this)("buckets",val) }

    rows(val) { return accessor.bind(this)("rows",val) }
    after(val) { return accessor.bind(this)("after",val) }




    data(val) { return accessor.bind(this)("data",val) } 
    title(val) { return accessor.bind(this)("title",val) } 

    buildScales() {

      var rows = this.rows()
        , buckets = this.buckets()
        , height = this.height(), space = this.space()

      this._yscale = d3.scale.linear()
        .domain([0,rows.length])
        .range([0,rows.length*height]);

      this._xscale = d3.scale.ordinal()
        .domain(buckets)
        .range(d3.range(0,buckets.length*(height+space),(height+space)));

      this._xscalereverse = d3.scale.ordinal()
        .domain(buckets.reverse())
        .range(d3.range(0,buckets.length*(height+space),(height+space)));

      this._rscale = d3.scale.pow()
        .exponent(0.5)
        .domain([0,1])
        .range([.35,1])
      
      this._oscale = d3.scale.quantize()
        .domain([-1,1])
        .range(['#f7fbff','#deebf7','#c6dbef','#9ecae1','#6baed6','#4292c6','#2171b5','#08519c','#08306b'])
      
    }

    drawLegend() {
      var canvas = this._canvas
        , buckets = this.buckets()
        , height = this.height(), space = this.space(), middle = this.middle(), legendtw = this._legend_width
        , rscale = this._rscale, oscale = this._oscale;

      var legend = d3_updateable(canvas,'g.legend','g')
        .attr("class","legend")
        .attr("transform","translate(" + (buckets.length*(height+space)*2+middle-310) + ",-130)")

      var size = d3_updateable(legend,'g.size','g')
        .attr("class","size")
        .attr("transform","translate(" + (legendtw+10) + ",0)")

      d3_updateable(size,"text.more","text")
        .attr("class","more axis")
        .attr("x",-legendtw)
        .html("more activity")
        .style("text-transform","uppercase").style("font-size",".6em").style("font-weight","bold") 
        .attr("dominant-baseline", "central")

      d3_updateable(size,"text.more-arrow","text")
        .attr("class","more-arrow axis")
        .attr("x",-legendtw-10)
        .html("&#9664;")
        .style("text-transform","uppercase").style("font-size",".6em").style("font-weight","bold") 
        .style("font-size",".7em")
        .attr("dominant-baseline", "central")




      d3_updateable(size,"text.less","text")
        .attr("class","less axis")
        .attr("x",(height+4)*5+legendtw)
        .style("text-anchor","end")
        .html("less activity")
        .style("text-transform","uppercase").style("font-size",".6em").style("font-weight","bold")

        .attr("dominant-baseline", "central")

      d3_updateable(size,"text.less-arrow","text")
        .attr("class","less-arrow axis")
        .attr("x",(height+4)*5+legendtw+10)
        .html("&#9654;")
        .style("text-anchor","end")
        .style("text-transform","uppercase").style("font-size",".6em").style("font-weight","bold")
        .style("font-size",".7em") 
        .attr("dominant-baseline", "central")


      d3_splat(size,"circle","circle",[1,.6,.3,.1,0])
        .attr("r",function(x) { return (height-2)/2*rscale(x) })
        .attr('cx', function(d,i) { return (height+4)*i+height/2})
        .attr('stroke', 'grey')
        .attr('fill', 'none')


      


      var size = d3_updateable(legend,'g.importance','g')
        .attr("class","importance")
        .attr("transform","translate("+ (legendtw+10) +",25)")

      d3_updateable(size,"text.more","text")
        .attr("class","more axis")
        .attr("x",-legendtw)
        .html("more important")
        .style("text-transform","uppercase").style("font-size",".6em").style("font-weight","bold")
        .attr("dominant-baseline", "central")

      d3_updateable(size,"text.more-arrow","text")
        .attr("class","more-arrow axis")
        .attr("x",-legendtw-10)
        .html("&#9664;")
        .style("text-transform","uppercase").style("font-size",".6em").style("font-weight","bold")
        .style("font-size",".7em") 
        .attr("dominant-baseline", "central")



      d3_updateable(size,"text.less","text")
        .attr("class","less axis")
        .attr("x",(height+4)*5+legendtw)
        .style("text-anchor","end")
        .html("less important")
        .style("text-transform","uppercase").style("font-size",".6em").style("font-weight","bold")
        .attr("dominant-baseline", "central")

      d3_updateable(size,"text.less-arrow","text")
        .attr("class","less-arrow axis")
        .attr("x",(height+4)*5+legendtw+10)
        .html("&#9654;")
        .style("text-anchor","end")
        .style("text-transform","uppercase").style("font-size",".6em").style("font-weight","bold")
        .style("font-size",".7em")
        .attr("dominant-baseline", "central")


      d3_splat(size,"circle","circle",[1,.75,.5,.25,0])
        .attr("r",height/2-2)
        .attr("fill",function(x) { return oscale(x) })
        .attr("opacity",function(x) { return rscale(x/2 + .2) })
        .attr('cx', function(d,i) { return (height+4)*i+height/2 })
   
    }

    drawAxes() {
      var canvas = this._canvas
        , buckets = this.buckets()
        , height = this.height(), space = this.space(), middle = this.middle(), legendtw = this._legend_width
        , rscale = this._rscale, oscale = this._oscale 
        , xscale = this._xscale, yscale = this._yscale
        , xscalereverse = this._xscalereverse
        , rows = this._rows

      var xAxis = d3.svg.axis();
      xAxis
        .orient('top')
        .scale(xscalereverse)
        .tickFormat(function(x) { 
          if (x == 3600) return "1 hour"
          if (x < 3600) return x/60 + " mins" 

          if (x == 86400) return "1 day"
          if (x > 86400) return x/86400 + " days" 

          return x/3600 + " hours"
        })

      var x_xis = d3_updateable(canvas,'g.x.before','g')
        .attr("class","x axis before")
        .attr("transform", "translate(" + (height + space)+ ",-4)")
        .attr('id','xaxis')
        .call(xAxis);

            
      x_xis.selectAll("text")
        .attr("y", -8)
        .attr("x", -8)
        .attr("dy", ".35em")
        .attr("transform", "rotate(45)")
        .style("text-anchor", "end")

      x_xis.selectAll("line")
        .attr("style","stroke:black")

      x_xis.selectAll("path")
        .attr("style","stroke:black; display:inherit")

      d3_updateable(x_xis,"text.title","text")
        .attr("class","title")
        .attr("x",buckets.length*(height+space)/2 - height+space )
        .attr("y",-53)
        .attr("transform",undefined)
        .style("text-anchor", "middle")
        .style("text-transform", "uppercase")
        .style("font-weight", "bold")
        .text("before arriving")



      var xAxis = d3.svg.axis();
      xAxis
        .orient('top')
        .scale(xscale)
        .tickFormat(function(x) { 
          if (x == 3600) return "1 hour"
          if (x < 3600) return x/60 + " mins" 

          if (x == 86400) return "1 day"
          if (x > 86400) return x/86400 + " days" 

          return x/3600 + " hours"
        })

      var x_xis = d3_updateable(canvas,'g.x.after','g')
        .attr("class","x axis after")
        .attr("transform", "translate(" + (buckets.length*(height+space)+middle) + ",0)")
        .attr('id','xaxis')
        .call(xAxis);
      
      x_xis.selectAll("text")
        .attr("y", -8)
        .attr("x", 8)
        .attr("dy", ".35em")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "start")

      x_xis.selectAll("line")
        .attr("style","stroke:black")

      x_xis.selectAll("path")
        .attr("style","stroke:black; display:inherit")

      d3_updateable(x_xis,"text.title","text")
        .attr("class","title")
        .attr("x",buckets.length*(height+space)/2  )
        .attr("y",-53)
        .attr("transform",undefined)
        .style("text-anchor", "middle")
        .style("text-transform", "uppercase")
        .style("font-weight", "bold")
        .text("after leaving")


      var yAxis = d3.svg.axis();
      yAxis
        .orient('left')
        .scale(yscale)
        .tickSize(2)
        .tickFormat(function(d,i){ return rows[i].key; })
        .tickValues(d3.range(rows.length));


      
      var y_xis = d3_updateable(canvas,'g.y','g')
        .attr("class","y axis")
        .attr("transform", "translate(" + (buckets.length*(height+space)+0) + ",15)")
        .attr('id','yaxis')


      y_xis
        .call(yAxis);

      y_xis.selectAll("line")
        .attr("x2",18)
        .attr("x1",22)
        .style("stroke-dasharray","0")
        .remove()


      y_xis.selectAll("path")
        .attr("x2",18)
        .attr("transform","translate(18,0)") 
        //.style("stroke","black")



        //.remove()

      
      y_xis.selectAll("text")
        .attr("style","text-anchor: middle; font-weight:bold; fill: #333")
        .attr("x",middle/2)




    }

    draw() {

      var buckets = this.buckets()
        , height = this.height(), space = this.space(), middle = this.middle(), legendtw = this._legend_width
        , rows = this.rows()

      var svg = d3_updateable(this._target,"svg","svg",false,function() { return 1})
        .style("margin-left","10px")
        .style("margin-top","-5px")
        .attr({'width':buckets.length*(height+space)*2+middle,'height':rows.length*height + 165})
        .attr("xmlns", "http://www.w3.org/2000/svg")

      this._svg = svg

      this._canvas = d3_updateable(svg,".canvas","g")
        .attr("class","canvas")
        .attr("transform", "translate(0,140)")



      this.buildScales()
      this.drawLegend()
      this.drawAxes()

      var canvas = this._canvas
        , rscale = this._rscale, oscale = this._oscale 
        , xscale = this._xscale, yscale = this._yscale
        , xscalereverse = this._xscalereverse
        , rows = this.rows()


      var chart_before = d3_updateable(canvas,'g.chart-before','g',this.rows(),function() { return 1 })
        .attr("class","chart-before")
        .attr("transform", "translate(" + buckets.length*(height+space) + ",0)")
        .attr('id','bars')


      var rows = d3_splat(chart_before,".row","g",function(x) { return x }, function(x) { return x.key })
        .attr("class","row")
        .attr({'transform':function(d,i){ return "translate(0," + (yscale(i) + 7.5) + ")"; } })
        .attr({'label':function(d,i){ return d.key; } })

      rows.exit().remove()

      var bars = d3_splat(rows,".pop-bar","circle",function(x) { return x.values }, function(x) { return x.key })
        .attr("class","pop-bar")
        .attr('cy',(height-2)/2)
        .attr({'cx':function(d,i) { return -xscale(d.key)}})
        .attr("opacity",".8")
        .attr("r",function(x) { return (height)/2 * rscale(x.norm_time) }) 
        .style("fill",function(x) { return oscale(x.percent_diff) })

      var chart_after = d3_updateable(canvas,'g.chart-after','g',this._after,function() { return 1 })
        .attr("class","chart-after")
        .attr("transform", "translate(" + (buckets.length*(height+space)+middle) + ",0)")
        .attr('id','bars')


      var rows = d3_splat(chart_after,".row","g",function(x) { return x }, function(x) { return x.key })
        .attr("class","row")
        .attr({'transform':function(d,i){ return "translate(0," + (yscale(i) + 7.5) + ")"; } })
        .attr({'label':function(d,i){ return d.key; } })

      rows.exit().remove()

      var bars = d3_splat(rows,".pop-bar","circle",function(x) { return x.values }, function(x) { return x.key })
        .attr("class","pop-bar")
        .attr('cy',(height-2)/2)
        .attr({'cx':function(d,i) { return xscale(d.key)}})
        .attr("r",function(x) { return (height-2)/2 * rscale(x.norm_time) })
        .style("fill",function(x) { return oscale(x.percent_diff) })
        .attr("opacity",".8")


      return this
    }
  }

  function stream_plot(target) {
    return new StreamPlot(target)
  }

  function drawAxis(target,scale,text,width) {
    var xAxis = d3.svg.axis();
    xAxis
      .orient('top')
      .scale(scale)
      .tickFormat(function(x) { 
        if (x == 3600) return "1 hour"
        if (x < 3600) return x/60 + " mins" 

        if (x == 86400) return "1 day"
        if (x > 86400) return x/86400 + " days" 

        return x/3600 + " hours"
      })

    var x_xis = d3_updateable(target,'g.x.before','g')
      .attr("class","x axis before")
      .attr("transform", "translate(0,-5)")
      .attr('id','xaxis')
      .call(xAxis);

          
    x_xis.selectAll("text")
      .attr("y", -25)
      .attr("x", 15)
      .attr("dy", ".35em")
      .attr("transform", "rotate(45)")
      .style("text-anchor", "end")

    x_xis.selectAll("line")
      .attr("style","stroke:black")

    x_xis.selectAll("path")
      .attr("style","stroke:black; display:inherit")

    d3_updateable(x_xis,"text.title","text")
      .attr("class","title")
      .attr("x",width/2)
      .attr("y",-46)
      .attr("transform",undefined)
      .style("text-anchor", "middle")
      .style("text-transform", "uppercase")
      .style("font-weight", "bold")
      .text(text + " ")

    return x_xis

  }


  class StreamPlot {
    constructor(target) {
      this._target = target
      this._on = {}
      this._buckets = [0,10,30,60,120,180,360,720,1440,2880,5760,10080].map(function(x) { return x*60 })

      this._width = 370
      this._height = 250
      this._color = d3.scale.ordinal()
        .range(
  ['#999','#aaa','#bbb','#ccc','#ddd','#deebf7','#c6dbef','#9ecae1','#6baed6','#4292c6','#2171b5','rgba(33, 113, 181,.9)','rgba(8, 81, 156,.91)','#08519c','rgba(8, 48, 107,.9)','#08306b'].reverse())

    } 

    key_accessor(val) { return accessor.bind(this)("key_accessor",val) }
    value_accessor(val) { return accessor.bind(this)("value_accessor",val) }
    height(val) { return accessor.bind(this)("height",val) }
    width(val) { return accessor.bind(this)("width",val) }


    data(val) { return accessor.bind(this)("data",val) } 
    title(val) { return accessor.bind(this)("title",val) } 


    draw() {

      var data = this._data
        , order = data.order
        , buckets = this._buckets
        , before_stacked = data.before_stacked
        , after_stacked = data.after_stacked
        , height = this._height
        , width = this._width
        , target = this._target
        , color = this._color
        , self = this

      color.domain(order)

      var y = d3.scale.linear()
        .range([height,0])
        .domain([0,d3.max(before_stacked, function(layer) { return d3.max(layer,function(d) {return d.y0 + d.y })})])
    
      var x = d3.scale.ordinal()
        .domain(buckets)
        .range(d3.range(0,width,width/(buckets.length-1)))
    
      var xreverse = d3.scale.ordinal()
        .domain(buckets.slice().reverse())
        .range(d3.range(0,width+10,width/(buckets.length-1)))

      this._before_scale = xreverse
      this._after_scale = x
    
      var barea = d3.svg.area()
        .interpolate("zero")
        .x(function(d) { return xreverse(d.x); })
        .y0(function(d) { return y(d.y0); })
        .y1(function(d) { return y(d.y0 + d.y); });
    
      var aarea = d3.svg.area()
        .interpolate("linear")
        .x(function(d) { return x(d.x); })
        .y0(function(d) { return y(d.y0); })
        .y1(function(d) { return y(d.y0 + d.y); });
    
    
      var svg = d3_updateable(target,"svg","svg")
        .attr("width", width*2+180)
        .attr("height", height + 100);

      this._svg = svg
    
      var before = d3_updateable(svg,".before-canvas","g")
        .attr("class","before-canvas")
        .attr("transform", "translate(0,60)")

      function hoverCategory(cat,time) {
        apaths.style("opacity",".5")
        bpaths.style("opacity",".5")
        apaths.filter(y => y[0].key == cat).style("opacity",undefined)
        bpaths.filter(y => y[0].key == cat).style("opacity",undefined)
        d3.select(this).style("opacity",undefined)

        d3_updateable(middle,"text","text")
          .style("text-anchor", "middle")
          .style("text-transform","uppercase")
          .style("font-weight", "bold")
          .style("font-size","10px")
          .style("color","#333")
          .style("opacity",".65")
          .text(cat)

        var mwrap = d3_updateable(middle,"g","g")

        self.on("category.hover").bind(mwrap.node())(cat,time)
      }
    
      var b = d3_updateable(before,"g","g")

      var bpaths = d3_splat(b,"path","path", before_stacked,function(x,i) { return x[0].key})
        .attr("d", barea)
        .attr("class", function(x) { return x[0].key})
        .style("fill", function(x,i) { return color(x[0].key); })
        .on("mouseover",function(x) {
          var dd = d3.event
          var pos = parseInt(dd.offsetX/(width/buckets.length))
          
          hoverCategory.bind(this)(x[0].key,buckets.slice().reverse()[pos])
        })
        .on("mouseout",function(x) {
          apaths.style("opacity",undefined)
          bpaths.style("opacity",undefined)
        })

      bpaths.exit().remove()

      var brect = d3_splat(b,"rect","rect",buckets.slice().reverse(),(x,i) => i)
        .attr("x",z => xreverse(z))
        .attr("width",1)
        .attr("height",height)
        .attr("y",0)
        .attr("opacity","0")



        

      var middle = d3_updateable(svg,".middle-canvas","g")
        .attr("class","middle-canvas")
        .attr("transform","translate(" + (width + 180/2) + ",60)")
    
    
    
      var after = d3_updateable(svg,".after-canvas","g")
        .attr("class","after-canvas")
        .attr("transform", "translate(" + (width + 180) + ",60)")

      var a = d3_updateable(after,"g","g")

    
      var apaths = d3_splat(a,"path","path",after_stacked,function(x,i) { return x[0].key})
        .attr("d", aarea)
        .attr("class", function(x) { return x[0].key})
        .style("fill", function(x,i) { return color(x[0].key); })
        .on("mouseover",function(x) {
          hoverCategory.bind(this)(x[0].key)
        })
        .on("mouseout",function(x) {
          apaths.style("opacity",undefined)
          bpaths.style("opacity",undefined)
        })

      apaths.exit().remove()

      var _x_xis = drawAxis(before,xreverse,"before arriving",width)

      _x_xis.selectAll("text").filter(function(y){ return y == 0 }).remove()

      var _x_xis = drawAxis(after,x,"after leaving",width)

      _x_xis.selectAll("text:not(.title)")
        .attr("transform", "rotate(-45)")
        .attr("x",20)
        .attr("y",-25)

      _x_xis.selectAll("text").filter(function(y){ return y == 0 }).remove()

      return this
    }

    on(action,fn) {
      if (fn === undefined) return this._on[action] || noop;
      this._on[action] = fn;
      return this
    }
  }

  function noop$6() {}
  function SummaryView(target) {
    this._on = {
      select: noop$6
    }
    this.target = target
  }

  function buildStreamData(data,buckets) {
    
    var units_in_bucket = buckets.map(function(x,i) { return x - (x[i-1]|| 0) })

    var stackable = data.map(function(d) { 
      var valuemap = d.values.reduce(function(p,c) { p[c.key] = c.values; return p },{})
      var percmap = d.values.reduce(function(p,c) { p[c.key] = c.percent; return p },{})

      var vmap = d.values.reduce(function(p,c) { p[c.key] = c.norm_cat; return p },{})


      var normalized_values = buckets.map(function(x,i) {
        if (x == 0) return {key: d.key, x: parseInt(x), y: (vmap["600"]||0), values: (valuemap["600"]||0), percent: (percmap["600"]||0)}
        return { key: d.key, x: parseInt(x), y: (vmap[x] || 0), values: (valuemap[x] || 0), percent: (percmap[x] || 0) }
      })


      return normalized_values
      //return e2.concat(normalized_values)//.concat(extra)
    })


    stackable = stackable.sort((p,c) => p[0].y - c[0].y).reverse().slice(0,12)

    return stackable

  }

  function streamData(before,after,buckets) {
    var stackable = buildStreamData(before,buckets)
    var stack = d3.layout.stack().offset("wiggle").order("reverse")
    var before_stacked = stack(stackable)

    var order = before_stacked.map(item => item[0].key)

    var stackable = buildStreamData(after,buckets)
      .sort(function(p,c) { return order.indexOf(c[0].key) - order.indexOf(p[0].key) })

    stackable = stackable.filter(x => order.indexOf(x[0].key) == -1).concat(stackable.filter(x => order.indexOf(x[0].key) > -1))

    var stack = d3.layout.stack().offset("wiggle").order("default")
    var after_stacked = stack(stackable)

    return {
        order: order
      , before_stacked: before_stacked
      , after_stacked: after_stacked
    }

  }

  function simpleTimeseries(target,data,w,h) {
    var width = w || 120
      , height = h || 30

    var x = d3.scale.ordinal().domain(d3.range(0,data.length)).range(d3.range(0,width,width/data.length))
    var y = d3.scale.linear().range([4,height]).domain([d3.min(data),d3.max(data)])

    var wrap = d3_updateable(target,"g","g",data,function(x,i) { return 1})

    d3_splat(wrap,"rect","rect",x => x, (x,i) => i)
      .attr("x",(z,i) => x(i))
      .attr("width", width/data.length -1.2)
      .attr("y", z => height - y(z) )
      .attr("height", z => z ? y(z) : 0)

    return wrap
    
  }



  function drawStream(target,before,after) {

  function extractData(b,a,buckets,accessor) {
    var bvolume = {}, avolume = {}

    try { var bvolume = b[0].reduce(function(p,c) { p[c.x] = accessor(c); return p },{}) } catch(e) {}
    try { var avolume = a[0].reduce(function(p,c) { p[c.x] = accessor(c); return p },{}) } catch(e) {}

    var volume = buckets.slice().reverse().map(x => bvolume[x] || 0).concat(buckets.map(x => avolume[x] || 0))

    return volume
  }

    var buckets = [0,10,30,60,120,180,360,720,1440,2880,5760,10080].map(function(x) { return x*60 })

    var data = streamData(before,after,buckets)
      , before_stacked = data.before_stacked
      , after_stacked = data.after_stacked

    var before = d3_updateable(target,".before-stream","div",data,function() { return 1})
      .classed("before-stream",true)
      .style("padding","10px")
      .style("padding-top","0px")

      .style("background-color","rgb(227, 235, 240)")

    d3_updateable(before,"h3","h3")
      .text("Consideration and Research Phase Identification")
      .style("font-size","12px")
      .style("color","#333")
      .style("line-height","33px")
      .style("background-color","#e3ebf0")
      .style("margin-left","-10px")
      .style("margin-bottom","10px")
      .style("padding-left","10px")
      .style("margin-top","0px")
      .style("font-weight","bold")
      .style("text-transform","uppercase")

    var inner = d3_updateable(before,".inner","div")
      .classed("inner",true)

    

    var stream = stream_plot(inner)
      .data(data)
      .on("category.hover",function(x,time) { 
        console.log(time)
        var b = data.before_stacked.filter(y => y[0].key == x)
        var a = data.after_stacked.filter(y => y[0].key == x)

        var volume = extractData(b,a,buckets,function(c) { return c.values.length })
          , percent = extractData(b,a,buckets,function(c) { return c.percent })
          , importance = extractData(b,a,buckets,function(c) { return c.y })


        var wrap = d3.select(this)
          , vwrap = d3_updateable(wrap,".volume","g")
              .attr("class","volume")
              .attr("transform","translate(-60,30)")
          , pwrap = d3_updateable(wrap,".percent","g")
              .attr("class","percent")
              .attr("transform","translate(-60,90)")
          , iwrap = d3_updateable(wrap,".importance","g")
              .attr("class","importance")
              .attr("transform","translate(-60,150)")


        d3_updateable(vwrap,"text","text").text("Visits")
          .attr("style","title")
        simpleTimeseries(vwrap,volume)
          .attr("transform","translate(0,2)")


        d3_updateable(pwrap,"text","text").text("Share of time")
          .attr("class","title")

        simpleTimeseries(pwrap,percent)
          .attr("transform","translate(0,2)")


        d3_updateable(iwrap,"text","text").text("Importance")
          .attr("class","title")

        simpleTimeseries(iwrap,importance)
          .attr("transform","translate(0,2)")


        return 
      })
      .draw()

    var before_agg = before_stacked.reduce((o,x) => { return x.reduce((p,c) => { p[c.x] = (p[c.x] || 0) + c.y; return p},o) },{})
      , after_agg = after_stacked.reduce((o,x) => { return x.reduce((p,c) => { p[c.x] = (p[c.x] || 0) + c.y; return p},o) },{})


    var local_before = Object.keys(before_agg).reduce((minarr,c) => { 
        if (minarr[0] >= before_agg[c]) return [before_agg[c],c];
        if (minarr.length > 1) minarr[0] = -1;
        return minarr 
      },[Infinity]
    )[1]

    var local_after = Object.keys(after_agg).reduce((minarr,c) => { 
        if (minarr[0] >= after_agg[c]) return [after_agg[c],c];
        if (minarr.length > 1) minarr[0] = -1;
        return minarr 
      },[Infinity]
    )[1]

    
    var before_line = buckets[buckets.indexOf(parseInt(local_before))]
      , after_line = buckets[buckets.indexOf(parseInt(local_after))]

    var svg = stream
      ._svg.style("margin","auto").style("display","block")


    var bline = d3_updateable(svg.selectAll(".before-canvas"),"g.line-wrap","g")
      .attr("class","line-wrap")

    d3_updateable(bline,"line","line")
      .style("stroke-dasharray", "1,5")
      .attr("stroke-width",1)
      .attr("stroke","black")
      .attr("y1", 0)
      .attr("y2", stream._height+20)
      .attr("x1", stream._before_scale(before_line))
      .attr("x2", stream._before_scale(before_line))

    d3_updateable(bline,"text","text")
      .attr("y", stream._height+20)
      .attr("x", stream._before_scale(before_line) + 10)
      .style("text-anchor","start")
      .text("Consideration Stage")


    var aline = d3_updateable(svg.selectAll(".after-canvas"),"g.line-wrap","g")
      .attr("class","line-wrap")

    d3_updateable(aline,"line","line")
      .style("stroke-dasharray", "1,5")
      .attr("stroke-width",1)
      .attr("stroke","black")
      .attr("y1", 0)
      .attr("y2", stream._height+20)
      .attr("x1", stream._after_scale(after_line))
      .attr("x2", stream._after_scale(after_line))

    d3_updateable(aline,"text","text")
      .attr("y", stream._height+20)
      .attr("x", stream._after_scale(after_line) - 10)
      .style("text-anchor","end")
      .text("Validation / Research")
     
      

    return {
      "consideration": "" + before_line,
      "validation": "-" + after_line
    }
  }



  function buildSummaryBlock(data, target, radius_scale, x) {
    var data = data
      , dthis = d3.select(target)

    pie(dthis)
      .data(data)
      .radius(radius_scale(data.population))
      .draw()

    var fw = d3_updateable(dthis,".fw","div",false,function() { return 1 })
      .classed("fw",true)
      .style("width","50px")
      .style("display","inline-block")
      .style("vertical-align","top")
      .style("padding-top","3px")
      .style("text-align","center")
      .style("line-height","16px")

    var fw2 = d3_updateable(dthis,".fw2","div",false,function() { return 1 })
      .classed("fw2",true)
      .style("width","60px")
      .style("display","inline-block")
      .style("vertical-align","top")
      .style("padding-top","3px")
      .style("text-align","center")
      .style("font-size","22px")
      .style("font-weight","bold")
      .style("line-height","40px")
      .text(d3.format("%")(data.sample/data.population))



    d3_updateable(fw,".sample","span").text(d3.format(",")(data.sample))
      .classed("sample",true)
    d3_updateable(fw,".vs","span").html("<br> out of <br>").style("font-size",".88em")
      .classed("vs",true)
    d3_updateable(fw,".population","span").text(d3.format(",")(data.population))
      .classed("population",true)

  }

  function drawBeforeAndAfter(target,data) {

    var before = d3_updateable(target,".before","div",data,function() { return 1})
      .classed("before",true)
      .style("padding","10px")
      .style("padding-top","0px")

      .style("background-color","rgb(227, 235, 240)")

    d3_updateable(before,"h3","h3")
      .text("Category activity before arriving and after leaving site")
      .style("font-size","12px")
      .style("color","#333")
      .style("line-height","33px")
      .style("background-color","#e3ebf0")
      .style("margin-left","-10px")
      .style("margin-bottom","10px")
      .style("padding-left","10px")
      .style("margin-top","0px")
      .style("font-weight","bold")
      .style("text-transform","uppercase")

    var inner = d3_updateable(before,".inner","div")
      .classed("inner",true)
      .style("position","absolute")

    d3_updateable(inner,"h3","h3")
      .text("Sort By")
      .style("margin","0px")
      .style("line-height","32px")
      .style("color","inherit")
      .style("font-size","inherit")
      .style("font-weight","bold")
      .style("text-transform","uppercase")
      .style("background","#e3ebf0")
      .style("padding-left","10px")
      .style("margin-right","10px")
      .style("margin-top","2px")
      .style("margin-bottom","2px")
      .style("display","inline-block")
      .style("width","140px")

    

    inner.selectAll("select")
      .style("min-width","140px")
    

    var cb = comp_bubble(before)
      .rows(data.before_categories)
      .after(data.after_categories)
      .draw()

    cb._svg.style("display","block")
      .style("margin-left","auto")
      .style("margin-right","auto")


    return inner

  }

  function drawCategoryDiff(target,data) {

    diff_bar(target)
      .data(data)
      .title("Category indexing versus comp")
      .value_accessor("normalized_diff")
      .draw()

  }

  function drawCategory(target,data) {

    comp_bar(target)
      .data(data)
      .title("Categories visited for filtered versus all views")
      .pop_value_accessor("pop")
      .samp_value_accessor("samp")
      .draw()

  }

  function drawTimeseries(target,data,radius_scale) {
    var w = d3_updateable(target,"div.timeseries","div")
      .classed("timeseries",true)
      .style("width","60%")
      .style("display","inline-block")
      .style("background-color", "#e3ebf0")
      .style("padding-left", "10px")
      .style("height","127px")



    var q = d3_updateable(target,"div.timeseries-details","div")
      .classed("timeseries-details",true)
      .style("width","40%")
      .style("display","inline-block")
      .style("vertical-align","top")
      .style("padding","15px")
      .style("padding-left","57px")
      .style("background-color", "#e3ebf0")
      .style("height","127px")

      



    var pop = d3_updateable(q,".pop","div")
      .classed("pop",true)

    d3_updateable(pop,".ex","span")
      .classed("ex",true)
      .style("width","20px")
      .style("height","10px")
      .style("background-color","grey")
      .style("display","inline-block")


    d3_updateable(pop,".title","span")
      .classed("title",true)
      .style("text-transform","uppercase")
      .style("padding-left","3px")
      .text("all")


    
    var samp = d3_updateable(q,".samp","div")
      .classed("samp",true)

    d3_updateable(samp,".ex","span")
      .classed("ex",true)
      .style("width","20px")
      .style("height","10px")
      .style("background-color","#081d58")
      .style("display","inline-block")



    d3_updateable(samp,".title","span")
      .classed("title",true)
      .style("text-transform","uppercase")
      .style("padding-left","3px")
      .text("filtered")


    var details = d3_updateable(q,".deets","div")
      .classed("deets",true)
    



    d3_updateable(w,"h3","h3")
      .text("Filtered versus All Views")
      .style("font-size","12px")
      .style("color","#333")
      .style("line-height","33px")
      .style("background-color","#e3ebf0")
      .style("margin-left","-10px")
      .style("margin-bottom","10px")
      .style("padding-left","10px")
      .style("margin-top","0px")
      .style("font-weight","bold")
      .style("text-transform","uppercase")






    timeseries['default'](w)
      .data({"key":"y","values":data})
      .height(80)
      .on("hover",function(x) {
        var xx = {}
        xx[x.key] = {sample: x.value, population: x.value2 }
        details.datum(xx)

        d3_updateable(details,".text","div")
          .classed("text",true)
          .text("@ " + x.hour + ":" + (x.minute.length > 1 ? x.minute : "0" + x.minute) )
          .style("display","inline-block")
          .style("line-height","49px")
          .style("padding-top","15px")
          .style("padding-right","15px")
          .style("font-size","22px")
          .style("font-weight","bold")
          .style("width","110px")
          .style("vertical-align","top")
          .style("text-align","center")




        d3_updateable(details,".pie","div")
          .classed("pie",true)
          .style("display","inline-block")
          .style("padding-top","15px")
          .each(function(x) { 
            var data = Object.keys(x).map(function(k) { return x[k] })[0]
            buildSummaryBlock(data,this,radius_scale,x) 
          })
      })
      .draw()

  }





  function summary_view(target) {
    return new SummaryView(target)
  }

  SummaryView.prototype = {
      data: function(val) {
        return accessor.bind(this)("data",val) 
      }
    , timing: function(val) {
        return accessor.bind(this)("timing",val) 
      }
    , category: function(val) {
        return accessor.bind(this)("category",val) 
      }
    , keywords: function(val) {
        return accessor.bind(this)("keywords",val) 
      }
    , before: function(val) {
        return accessor.bind(this)("before",val) 
      }
    , after: function(val) {
        return accessor.bind(this)("after",val) 
      }


    , draw: function() {


    var CSS_STRING = String(function() {/*
  .summary-wrap .table-wrapper { background:#e3ebf0; padding-top:5px; padding-bottom:10px }
  .summary-wrap .table-wrapper tr { border-bottom:none }
  .summary-wrap .table-wrapper thead tr { background:none }
  .summary-wrap .table-wrapper tbody tr:hover { background:none }
  .summary-wrap .table-wrapper tr td { border-right:1px dotted #ccc;text-align:center } 
  .summary-wrap .table-wrapper tr td:last-of-type { border-right:none } 
    */})

    d3_updateable(d3.select("head"),"style#custom-table-css","style")
      .attr("id","custom-table-css")
      .text(CSS_STRING.replace("function () {/*","").replace("*/}",""))




        var wrap = d3_updateable(this.target,".summary-wrap","div")
          .classed("summary-wrap",true)

        header(wrap)
          .text("Summary")
          .draw()


        var tswrap = d3_updateable(wrap,".ts-row","div")
          .classed("ts-row",true)
          .style("padding-bottom","10px")

        var piewrap = d3_updateable(wrap,".pie-row","div")
          .classed("pie-row",true)
          .style("padding-bottom","10px")

        var catwrap = d3_updateable(wrap,".cat-row","div")
          .classed("cat-row dash-row",true)
          .style("padding-bottom","10px")

        var keywrap = d3_updateable(wrap,".key-row","div")
          .classed("key-row dash-row",true)
          .style("padding-bottom","10px")

        var bawrap = d3_updateable(wrap,".ba-row","div",false,function() { return 1})
          .classed("ba-row",true)
          .style("padding-bottom","10px")

        var streamwrap = d3_updateable(wrap,".stream-ba-row","div",false,function() { return 1})
          .classed("stream-ba-row",true)
          .style("padding-bottom","10px")
         







        var radius_scale = d3.scale.linear()
          .domain([this._data.domains.population,this._data.views.population])
          .range([20,35])

        

        table.table(piewrap)
          .data({"key":"T","values":[this.data()]})
          .skip_option(true)
          .render("domains",function(x) { 
            var data = d3.select(this.parentNode).datum()[x.key]; 
            buildSummaryBlock(data,this,radius_scale,x) 
          })
          .render("articles",function(x) { 
            var data = d3.select(this.parentNode).datum()[x.key]; 
            buildSummaryBlock(data,this,radius_scale,x) 
          })

          .render("sessions",function(x) { 
            var data = d3.select(this.parentNode).datum()[x.key]; 
            buildSummaryBlock(data,this,radius_scale,x) 
          })
          .render("views",function(x) { 
            var data = d3.select(this.parentNode).datum()[x.key]; 
            buildSummaryBlock(data,this,radius_scale,x) 
          })
          .draw()

        
        drawTimeseries(tswrap,this._timing,radius_scale)     


        try {
        drawCategory(catwrap,this._category)     
        drawCategoryDiff(catwrap,this._category)     
        } catch(e) {}

        //drawKeywords(keywrap,this._keywords)     
        //drawKeywordDiff(keywrap,this._keywords)     

        var inner = drawBeforeAndAfter(bawrap,this._before)

        select(inner)
          .options([
              {"key":"Importance","value":"percent_diff"}
            , {"key":"Activity","value":"score"}
            , {"key":"Population","value":"pop"}
          ])
          .selected(this._before.sortby || "")
          .on("select", this.on("ba.sort"))
          .draw()


        drawStream(streamwrap,this._before.before_categories,this._before.after_categories)
          

        return this
      }
    , on: function(action, fn) {
        if (fn === undefined) return this._on[action] || noop$6;
        this._on[action] = fn;
        return this
      }
  }

  function d3_class$3(target,cls,type,data) {
    return d3_updateable(target,"." + cls, type || "div",data)
      .classed(cls,true)
  }

  function noop$13() {}


  function DomainExpanded(target) {
    this._on = {}
    this.target = target
  }

  function domain_expanded(target) {
    return new DomainExpanded(target)
  }

  var allbuckets = []
  var hourbuckets = d3.range(0,24).map(x => String(x).length > 1 ? String(x) : "0" + x)

  var hours = [0,20,40]
  var buckets = d3.range(0,24).reduce((p,c) => {
    hours.map(x => {
      p[c + ":" + x] = 0
    })
    allbuckets = allbuckets.concat(hours.map(z => c + ":" + z))
    return p
  },{})

  DomainExpanded.prototype = {
      data: function(val) {
        return accessor.bind(this)("data",val) 
      }
    , raw: function(val) {
        return accessor.bind(this)("raw",val) 
      }
    , urls: function(val) {
        return accessor.bind(this)("urls",val) 
      }
    , draw: function() {

        var self = this

        var data = this._raw
        var d = { domain: data[0].domain }

        //var articles = data.reduce((p,c) => {
        //  p[c.url] = p[c.url] || Object.assign({},buckets)
        //  p[c.url][c.hour + ":" + c.minute] = c.count
        //  return p
        //},{})

        //Object.keys(articles).map(k => {
        //  articles[k] = allbuckets.map(b => articles[k][b])
        //})

        var articles = data.reduce((p,c) => {
          p[c.url] = p[c.url] || Object.assign({},buckets)
          p[c.url][c.hour] = (p[c.url][c.hour] || 0) + c.count
          return p
        },{})


        Object.keys(articles).map(k => {
          articles[k] = hourbuckets.map(b => articles[k][b] || 0)
        })

        var to_draw = d3.entries(articles)
          .map(function(x){
            x.domain = d.domain
            x.url = x.key
            x.total = d3.sum(x.value)
            return x
          })

        var kw_to_draw = to_draw
          .reduce(function(p,c){
            c.key.toLowerCase().split(d.domain)[1].split("/").reverse()[0].replace("_","-").split("-").map(x => {
              var values = ["that","this","what","best","most","from","your","have","first","will","than","says","like","into","after","with"]
              if (x.match(/\d+/g) == null && values.indexOf(x) == -1 && x.indexOf(",") == -1 && x.indexOf("?") == -1 && x.indexOf(".") == -1 && x.indexOf(":") == -1 && parseInt(x) != x && x.length > 3) {
                p[x] = p[x] || {}
                Object.keys(c.value).map(q => {
                  p[x][q] = (p[x][q] || 0) + (c.value[q] || 0)
                })
              }
            })

            return p
          },{})

        kw_to_draw = d3.entries(kw_to_draw)
          .map(x => {
            x.values = Object.keys(x.value).map(z => x.value[z] || 0)
            x.total = d3.sum(x.values)
            return x
          })



        var td = this.target

        d3_class$3(td,"action-header")
          .style("text-align","center")
          .style("font-size","16px")
          .style("font-weight","bold")
          .style("padding","10px")
          .text("Explore and Refine")

        var title_row = d3_class$3(td,"title-row")
        var expansion_row = d3_class$3(td,"expansion-row")



        var euh = d3_class$3(title_row,"expansion-urls-title")
          .style("width","50%")
          .style("height","36px")
          .style("line-height","36px")
          .style("display","inline-block")
          .style("vertical-align","top")
   
        d3_class$3(euh,"title")
          .style("width","265px")
          .style("font-weight","bold")
          .style("display","inline-block")
          .style("vertical-align","top")
          .text("URL")

        d3_class$3(euh,"view")
          .style("width","40px")
          .style("margin-left","20px")
          .style("margin-right","20px")
          .style("font-weight","bold")
          .style("display","inline-block")
          .style("vertical-align","top")
          .text("Views")

            var svg_legend = d3_class$3(euh,"legend","svg")
              .style("width","144px")
              .style("height","36px")
              .style("vertical-align","top")



            d3_updateable(svg_legend,"text.one","text")
              .attr("x","0")
              .attr("y","20")
              .style("text-anchor","start")
              .text("12 am")

            d3_updateable(svg_legend,"text.two","text")
              .attr("x","72")
              .attr("y","20")
              .style("text-anchor","middle")
              .text("12 pm")

            d3_updateable(svg_legend,"text.three","text")
              .attr("x","144")
              .attr("y","20")
              .style("text-anchor","end")
              .text("12 am")

            d3_updateable(svg_legend,"line.one","line")
                  .classed("one",true)
                  .style("stroke-dasharray", "1,5")
                  .attr("stroke-width",1)
                  .attr("stroke","black")
                  .attr("y1", 25)
                  .attr("y2", 35)
                  .attr("x1", 0)
                  .attr("x2", 0)

  d3_updateable(svg_legend,"line.two","line")
                  .classed("two",true)
                  .style("stroke-dasharray", "1,5")
                  .attr("stroke-width",1)
                  .attr("stroke","black")
                  .attr("y1", 25)
                  .attr("y2", 35)
                  .attr("x1", 72)
                  .attr("x2", 72)


  d3_updateable(svg_legend,"line.three","line")
                  .classed("three",true)
                  .style("stroke-dasharray", "1,5")
                  .attr("stroke-width",1)
                  .attr("stroke","black")
                  .attr("y1", 25)
                  .attr("y2", 35)
                  .attr("x1", 144)
                  .attr("x2", 144)



        var ekh = d3_class$3(title_row,"expansion-kws-title")
          .style("width","50%")
          .style("height","36px")
          .style("line-height","36px")
          .style("display","inline-block")
          .style("vertical-align","top")

        d3_class$3(ekh,"title")
          .style("width","265px")
          .style("font-weight","bold")
          .style("display","inline-block")
          .text("Keywords")

        d3_class$3(ekh,"view")
          .style("width","40px")
          .style("margin-left","20px")
          .style("margin-right","20px")
          .style("font-weight","bold")
          .style("display","inline-block")
          .text("Views")

          var svg_legend = d3_class$3(ekh,"legend","svg")
              .style("width","144px")
              .style("height","36px")
              .style("vertical-align","top")



            d3_updateable(svg_legend,"text.one","text")
              .attr("x","0")
              .attr("y","20")
              .style("text-anchor","start")
              .text("12 am")

            d3_updateable(svg_legend,"text.two","text")
              .attr("x","72")
              .attr("y","20")
              .style("text-anchor","middle")
              .text("12 pm")

            d3_updateable(svg_legend,"text.three","text")
              .attr("x","144")
              .attr("y","20")
              .style("text-anchor","end")
              .text("12 am")

            d3_updateable(svg_legend,"line.one","line")
                  .classed("one",true)
                  .style("stroke-dasharray", "1,5")
                  .attr("stroke-width",1)
                  .attr("stroke","black")
                  .attr("y1", 25)
                  .attr("y2", 35)
                  .attr("x1", 0)
                  .attr("x2", 0)

           d3_updateable(svg_legend,"line.two","line")
             .classed("two",true)
             .style("stroke-dasharray", "1,5")
             .attr("stroke-width",1)
             .attr("stroke","black")
             .attr("y1", 25)
             .attr("y2", 35)
             .attr("x1", 72)
             .attr("x2", 72)


           d3_updateable(svg_legend,"line.three","line")
             .classed("three",true)
             .style("stroke-dasharray", "1,5")
             .attr("stroke-width",1)
             .attr("stroke","black")
             .attr("y1", 25)
             .attr("y2", 35)
             .attr("x1", 144)
             .attr("x2", 144)






        var expansion = d3_class$3(expansion_row,"expansion-urls")
          .classed("scrollbox",true)
          .style("width","50%")
          .style("display","inline-block")
          .style("vertical-align","top")


          .style("max-height","250px")
          .style("overflow","scroll")

        expansion.html("")

        var url_row = d3_splat(expansion,".url-row","div",to_draw.slice(0,500),function(x) { return x.url })
          .classed("url-row",true)

        var url_name = d3_updateable(url_row,".name","div").classed("name",true)
          .style("width","260px")
          .style("overflow","hidden")
          .style("line-height","20px")
          .style("height","20px")

          .style("display","inline-block")

        d3_updateable(url_name,"input","input")
          .style("margin-right","10px")
          .style("display","inline-block")
          .style("vertical-align","top")
          .attr("type","checkbox")
          .on("click", function(x) {
            self.on("stage-filter")(x)
          })

        d3_class$3(url_name,"url")
          .style("display","inline-block")
          .style("text-overflow","ellipsis")
          .style("width","205px")
          .text(x => {
            return x.url.split(d.domain)[1] || x.url 
          })

        d3_updateable(url_row,".number","div").classed("number",true)
          .style("width","40px")
          .style("height","20px")
          .style("line-height","20px")
          .style("vertical-align","top")
          .style("text-align","center")
          .style("font-size","13px")
          .style("font-weight","bold")
          .style("margin-left","20px")
          .style("margin-right","20px")
          .style("display","inline-block")
          .text(function(x) { return x.total })


        d3_updateable(url_row,".plot","svg").classed("plot",true)
          .style("width","144px")
          .style("height","20px")
          .style("display","inline-block")
          .each(function(x) {
            var dthis = d3.select(this)
            var values = x.value
            simpleTimeseries(dthis,values,144,20)

          })


        var expansion = d3_class$3(expansion_row,"expansion-kws")
          .classed("scrollbox",true)
          .style("width","50%")
          .style("display","inline-block")
          .style("vertical-align","top")


          .style("max-height","250px")
          .style("overflow","scroll")

        expansion.html("")


        var url_row = d3_splat(expansion,".url-row","div",kw_to_draw.slice(0,500),function(x) { return x.key })
          .classed("url-row",true)

        var url_name = d3_updateable(url_row,".name","div").classed("name",true)
          .style("width","260px")
          .style("overflow","hidden")
          .style("line-height","20px")
          .style("height","20px")

          .style("display","inline-block")

        d3_updateable(url_name,"input","input")
          .style("margin-right","10px")
          .style("display","inline-block")
          .style("vertical-align","top")
          .attr("type","checkbox")
          .on("click", function(x) {
            self.on("stage-filter")(x)
          })

        d3_class$3(url_name,"url")
          .style("display","inline-block")
          .style("text-overflow","ellipsis")
          .style("width","205px")
          .text(x => {
            return x.key
          })

        d3_updateable(url_row,".number","div").classed("number",true)
          .style("width","40px")
          .style("height","20px")
          .style("line-height","20px")
          .style("vertical-align","top")
          .style("text-align","center")
          .style("font-size","13px")
          .style("font-weight","bold")
          .style("margin-left","20px")
          .style("margin-right","20px")
          .style("display","inline-block")
          .text(function(x) { return x.total })


        d3_updateable(url_row,".plot","svg").classed("plot",true)
          .style("width","144px")
          .style("height","20px")
          .style("display","inline-block")
          .each(function(x) {
            var dthis = d3.select(this)
            var values = x.values
            simpleTimeseries(dthis,values,144,20)

          })


        return this
      }
    , on: function(action, fn) {
        if (fn === undefined) return this._on[action] || noop$13;
        this._on[action] = fn;
        return this
      }
  }

  function DomainBullet(target) {
    this._on = {}
    this.target = target
  }

  function noop$14() {}
  function domain_bullet(target) {
    return new DomainBullet(target)
  }

  DomainBullet.prototype = {
      data: function(val) {
        return accessor.bind(this)("data",val) 
      }
    , max: function(val) {
        return accessor.bind(this)("max",val) 
      }
    , draw: function() {

        var width = (this.target.style("width").replace("px","") || this.offsetWidth) - 50
          , height = 28;

        var x = d3.scale.linear()
          .range([0, width])
          .domain([0, this.max()])

        if (this.target.text()) this.target.text("")

        var bullet = d3_updateable(this.target,".bullet","div",this.data(),function(x) { return 1 })
          .classed("bullet",true)
          .style("margin-top","3px")

        var svg = d3_updateable(bullet,"svg","svg",false,function(x) { return 1})
          .attr("width",width)
          .attr("height",height)
    
     
        d3_updateable(svg,".bar-1","rect",false,function(x) { return 1})
          .classed("bar-1",true)
          .attr("x",0)
          .attr("width", function(d) {return x(d.pop_percent) })
          .attr("height", height)
          .attr("fill","#888")
    
        d3_updateable(svg,".bar-2","rect",false,function(x) { return 1})
          .classed("bar-2",true)
          .attr("x",0)
          .attr("y",height/4)
          .attr("width", function(d) {return x(d.sample_percent_norm) })
          .attr("height", height/2)
          .attr("fill","rgb(8, 29, 88)")

        return this
      }
    , on: function(action, fn) {
        if (fn === undefined) return this._on[action] || noop$14;
        this._on[action] = fn;
        return this
      }
  }

  function noop$4() {}
  function DomainView(target) {
    this._on = {
      select: noop$4
    }
    this.target = target
  }



  function domain_view(target) {
    return new DomainView(target)
  }

  DomainView.prototype = {
      data: function(val) {
        return accessor.bind(this)("data",val) 
      }
    , options: function(val) {
        return accessor.bind(this)("options",val) 
      }
    , draw: function() {

        var self = this

        var _explore = this.target
          , tabs = this.options()
          , data = this.data()
          , filtered = tabs.filter(function(x){ return x.selected})
          , selected = filtered.length ? filtered[0] : tabs[0]

        header(_explore)
          .text(selected.key )
          .options(tabs)
          .on("select", function(x) { this.on("select")(x) }.bind(this))
          .draw()

        

        _explore.selectAll(".vendor-domains-bar-desc").remove()
        _explore.datum(data)

        var t = table.table(_explore)
          .data(selected)


        var samp_max = d3.max(selected.values,function(x){return x.sample_percent_norm})
          , pop_max = d3.max(selected.values,function(x){return x.pop_percent})
          , max = Math.max(samp_max,pop_max);

        t.headers([
              {key:"key",value:"Domain",locked:true,width:"100px"}
            , {key:"sample_percent",value:"Segment",selected:false}
            , {key:"real_pop_percent",value:"Baseline",selected:false}
            , {key:"ratio",value:"Ratio",selected:false}
            , {key:"importance",value:"Importance",selected:false}
            , {key:"value",value:"Segment versus Baseline",locked:true}
          ])
          .sort("importance")
          .option_text("&#65291;")
          .on("expand",function(d) {

            d3.select(this).selectAll("td.option-header").html("&ndash;")
            if (this.nextSibling && d3.select(this.nextSibling).classed("expanded") == true) {
              d3.select(this).selectAll("td.option-header").html("&#65291;")
              return d3.select(this.parentNode).selectAll(".expanded").remove()
            }

            d3.select(this.parentNode).selectAll(".expanded").remove()
            var t = document.createElement('tr');
            this.parentNode.insertBefore(t, this.nextSibling);  

            var tr = d3.select(t).classed("expanded",true).datum({})
            var td = d3_updateable(tr,"td","td")
              .attr("colspan",this.children.length)
              .style("background","#f9f9fb")
              .style("padding-top","10px")
              .style("padding-bottom","10px")

            var dd = this.parentElement.__data__.full_urls.filter(function(x) { return x.domain == d.key})
            var rolled = prepData(dd)
            
            domain_expanded(td)
              .raw(dd)
              .data(rolled)
              .urls(d.urls)
              .on("stage-filter", function(x) {
                self.on("stage-filter")(x)
              })
              .draw()

          })
          .hidden_fields(["urls","percent_unique","sample_percent_norm","pop_percent","tf_idf","parent_category_name"])
          .render("ratio",function(d) {
            this.innerText = Math.trunc(this.parentNode.__data__.ratio*100)/100 + "x"
          })
          .render("value",function(d) {

            domain_bullet(d3.select(this))
              .max(max)
              .data(this.parentNode.__data__)
              .draw()

          })
          
        t.draw()
       

        return this
      }
    , on: function(action, fn) {
        if (fn === undefined) return this._on[action] || noop$4;
        this._on[action] = fn;
        return this
      }
  }

  function noop$5() {}
  function simpleBar(wrap,value,scale,color) {

    var height = 20
      , width = wrap.style("width").replace("px","")

    var canvas = d3_updateable(wrap,"svg","svg",[value],function() { return 1})
      .style("width",width+"px")
      .style("height",height+"px")


    var chart = d3_updateable(canvas,'g.chart','g',false,function() { return 1 })
      .attr("class","chart")
    
    var bars = d3_splat(chart,".pop-bar","rect",function(x) { return x}, function(x,i) { return i })
      .attr("class","pop-bar")
      .attr('height',height-4)
      .attr({'x':0,'y':0})
      .style('fill',color)
      .attr("width",function(x) { return scale(x) })


  }


  function SegmentView(target) {
    this._on = {
      select: noop$5
    }
    this.target = target
  }



  function segment_view(target) {
    return new SegmentView(target)
  }

  SegmentView.prototype = {
      data: function(val) {
        return accessor.bind(this)("data",val) 
      }
    , segments: function(val) {
        return accessor.bind(this)("segments",val) 
      }
    , draw: function() {

        var wrap = d3_updateable(this.target,".segment-wrap","div")
          .classed("segment-wrap",true)
          .style("height","140px")
          .style("width",this.target.style("width"))
          .style("position","fixed")
          .style("z-index","300")
          .style("background","#f0f4f7")


        d3_updateable(this.target,".segment-wrap-spacer","div")
          .classed("segment-wrap-spacer",true)
          .style("height",wrap.style("height"))


        header(wrap)
          .buttons([
              {class: "saved-search", icon: "fa-folder-open-o fa", text: "Open Saved"}
            , {class: "new-saved-search", icon: "fa-bookmark fa", text: "Save"}
            , {class: "create", icon: "fa-plus-circle fa", text: "New Segment"}
            , {class: "logout", icon: "fa-sign-out fa", text: "Logout"}
          ])
          .on("saved-search.click", this.on("saved-search.click"))
          .on("logout.click", function() { window.location = "/logout" })
          .on("create.click", function() { window.location = "/segments" })
          .on("new-saved-search.click", this.on("new-saved-search.click"))
          .text("Segment").draw()      


        wrap.selectAll(".header-body")
          .classed("hidden",!this._is_loading)
          .style("text-align","center")
          .style("margin-bottom","-40px")
          .style("padding-top","10px")
          .style("height","0px")
          .style("background","none")
          .html("<img src='/static/img/general/logo-small.gif' style='height:15px'/> loading...")


        if (this._data == false) return

        var body = d3_updateable(wrap,".body","div")
          .classed("body",true)
          .style("clear","both")
          .style("display","flex")
          .style("flex-direction","column")
          .style("margin-top","-15px")
          .style("margin-bottom","30px")
          

        var row1 = d3_updateable(body,".row-1","div")
          .classed("row-1",true)
          .style("flex",1)
          .style("display","flex")
          .style("flex-direction","row")

        var row2 = d3_updateable(body,".row-2","div")
          .classed("row-2",true)
          .style("flex",1)
          .style("display","flex")
          .style("flex-direction","row")


        var inner = d3_updateable(row1,".action.inner","div")
          .classed("inner action",true)
          .style("flex","1")
          .style("display","flex")
          .style("padding","10px")
          .style("padding-bottom","0px")

          .style("margin-bottom","0px")

        var inner_desc = d3_updateable(row1,".action.inner-desc","div")
          .classed("inner-desc action",true)
          .style("flex","1")
          .style("padding","10px")
          .style("padding-bottom","0px")

          .style("display","flex")
          .style("margin-bottom","0px")


        d3_updateable(inner,"h3","h3")
          .text("Choose Segment")
          .style("margin","0px")
          .style("line-height","32px")
          .style("color","inherit")
          .style("font-size","inherit")
          .style("font-weight","bold")
          .style("text-transform","uppercase")
          .style("flex","1")
          .style("background","#e3ebf0")
          .style("padding-left","10px")
          .style("margin-right","10px")
          .style("margin-top","2px")
          .style("margin-bottom","2px")
          .style("height","100%")



        d3_updateable(inner,"div.color","div")
          .classed("color",true)
          .style("background-color","#081d58")
          .style("width","10px")
          .style("height","32px")
          .style("margin-top","2px")
          .style("margin-right","10px")
          .style("margin-left","-10px")



        var self = this

        select(inner)
          .options(this._segments)
          .on("select", function(x){
            self.on("change").bind(this)(x)
          })
          .selected(this._action.value || 0)
          .draw()

        



        var cal = d3_updateable(inner,"a.fa-calendar","a")
          .style("line-height","34px")
          .style("width","36px")
          .style("border","1px solid #ccc")
          .style("border-radius","5px")
          .classed("fa fa-calendar",true)
          .style("text-align","center")
          .style("margin-left","5px")
          .on("click", function(x) {
            calsel.node()
          })

        
        var calsel = select(cal)
          .options([{"key":"Today","value":0},{"key":"Yesterday","value":1},{"key":"7 days ago","value":7}])
          .on("select", function(x){
            self.on("action_date.change").bind(this)(x.value)
          })
          .selected(this._action_date || 0)
          .draw()
          ._select
          .style("width","18px")
          .style("margin-left","-18px")
          .style("height","34px")
          .style("opacity",".01")
          .style("flex","none")
          .style("border","none")

        

        var inner2 = d3_updateable(row2,".comparison.inner","div")
          .classed("inner comparison",true)
          .style("flex","1")
          .style("padding","10px")
          .style("padding-bottom","0px")

          .style("display","flex")

        var inner_desc2 = d3_updateable(row2,".comparison-desc.inner","div")
          .classed("inner comparison-desc",true)
          .style("flex","1")
          .style("padding","10px")
          .style("padding-bottom","0px")

          .style("display","flex")

        //d3_updateable(inner_desc,"h3","h3")
        //  .text("(Filters applied to this segment)")
        //  .style("margin","10px")
        //  .style("color","inherit")
        //  .style("font-size","inherit")
        //  .style("font-weight","bold")
        //  .style("text-transform","uppercase")
        //  .style("flex","1")

        d3_updateable(inner_desc,".bar-wrap-title","h3").classed("bar-wrap-title",true)
          .style("flex","1 1 0%")
          .style("margin","0px")
          .style("line-height","32px")
          .style("color","inherit")
          .style("font-size","inherit")
          .style("font-weight","bold")
          .style("text-transform","uppercase")
          .style("padding-left","10px")
          .style("margin-right","10px")
          .style("margin-top","2px")
          .style("margin-bottom","2px")
          .style("height","100%")
          .style("text-align","right")


          .text("views")

        d3_updateable(inner_desc2,".bar-wrap-title","h3").classed("bar-wrap-title",true)
          .style("flex","1 1 0%")
          .style("margin","0px")
          .style("line-height","32px")
          .style("color","inherit")
          .style("font-size","inherit")
          .style("font-weight","bold")
          .style("text-transform","uppercase")
          .style("padding-left","10px")
          .style("margin-right","10px")
          .style("margin-top","2px")
          .style("margin-bottom","2px")
          .style("height","100%")
          .style("text-align","right")



          .text("views")



        var bar_samp = d3_updateable(inner_desc,"div.bar-wrap","div")
          .classed("bar-wrap",true)
          .style("flex","2 1 0%")
          .style("margin-top","8px")

        d3_updateable(inner_desc,".bar-wrap-space","div").classed("bar-wrap-space",true)
          .style("flex","1 1 0%")
          .style("line-height","36px")
          .style("padding-left","10px")
          .text(d3.format(",")(this._data.views.sample))


        d3_updateable(inner_desc,".bar-wrap-opt","div").classed("bar-wrap-opt",true)
          .style("flex","2 1 0%")
          .style("line-height","36px")
          //.text("apply filters?")



        var xscale = d3.scale.linear()
          .domain([0,Math.max(this._data.views.sample, this._data.views.population)])
          .range([0,bar_samp.style("width")])


        var bar_pop = d3_updateable(inner_desc2,"div.bar-wrap","div")
          .classed("bar-wrap",true)
          .style("flex","2 1 0%")
          .style("margin-top","8px")


        d3_updateable(inner_desc2,".bar-wrap-space","div").classed("bar-wrap-space",true)
          .style("flex","1 1 0%")
          .style("line-height","36px")
          .style("padding-left","10px")
          .text(d3.format(",")(this._data.views.population))


        d3_updateable(inner_desc2,".bar-wrap-opt","div").classed("bar-wrap-opt",true)
          .style("flex","2 1 0%")
          .style("margin","0px")
          .style("line-height","32px")
          .style("color","inherit")
          .style("font-size","inherit")
          .style("font-weight","bold")
          .style("text-transform","uppercase")
          .style("height","100%")
          .style("text-align","right")
          .html("apply filters? <input type='checkbox'></input>")



        simpleBar(bar_samp,this._data.views.sample,xscale,"#081d58")
        simpleBar(bar_pop,this._data.views.population,xscale,"grey")











        d3_updateable(inner2,"h3","h3")
          .text("Compare Against")
          .style("line-height","32px")
          .style("margin","0px")
          .style("color","inherit")
          .style("font-size","inherit")
          .style("font-weight","bold")
          .style("flex","1")
          .style("text-transform","uppercase")
          .style("background","#e3ebf0")
          .style("padding-left","10px")
          .style("margin-right","10px")
          .style("margin-top","2px")
          .style("margin-bottom","2px")
          .style("height","100%")



        d3_updateable(inner2,"div.color","div")
          .classed("color",true)
          .style("background-color","grey")
          .style("width","10px")
          .style("height","32px")
          .style("margin-top","2px")
          .style("margin-right","10px")
          .style("margin-left","-10px")








        select(inner2)
          .options([{"key":"Current Segment (without filters)","value":false}].concat(this._segments) )
          .on("select", function(x){

            self.on("comparison.change").bind(this)(x)
          })
          .selected(this._comparison.value || 0)
          .draw()

        var cal2 = d3_updateable(inner2,"a.fa-calendar","a")
          .style("line-height","34px")
          .style("width","36px")
          .style("border","1px solid #ccc")
          .style("border-radius","5px")
          .classed("fa fa-calendar",true)
          .style("text-align","center")
          .style("margin-left","5px")
          .on("click", function(x) {
            calsel2.node()
          })

        
        var calsel2 = select(cal2)
          .options([{"key":"Today","value":0},{"key":"Yesterday","value":1},{"key":"7 days ago","value":7}])
          .on("select", function(x){
            self.on("comparison_date.change").bind(this)(x.value)
          })
          .selected(this._comparison_date || 0)
          .draw()
          ._select
          .style("width","18px")
          .style("margin-left","-18px")
          .style("height","34px")
          .style("opacity",".01")
          .style("flex","none")
          .style("border","none")



        return this
      }
    , action_date: function(val) {
        return accessor.bind(this)("action_date",val)
      }
    , action: function(val) {
        return accessor.bind(this)("action",val)
      }
    , comparison_date: function(val) {
        return accessor.bind(this)("comparison_date",val)
      }

    , comparison: function(val) {
        return accessor.bind(this)("comparison",val)
      }
    , is_loading: function(val) {
        return accessor.bind(this)("is_loading",val)
      }

    , on: function(action, fn) {
        if (fn === undefined) return this._on[action] || noop$5;
        this._on[action] = fn;
        return this
      }
  }

  var buckets$1 = [10,30,60,120,180,360,720,1440,2880,5760,10080].reverse().map(function(x) { return String(x*60) })
  buckets$1 = buckets$1.concat([10,30,60,120,180,360,720,1440,2880,5760,10080].map(function(x) { return String(-x*60) }))


  function noop$15(){}

  function d3_class$4(target,cls,type,data) {
    return d3_updateable(target,"." + cls, type || "div",data)
      .classed(cls,true)
  }

  function calcCategory(before_urls,after_urls) {
    var url_category = before_urls.reduce((p,c) => {
      p[c.url] = c.parent_category_name
      return p
    },{})

    url_category = after_urls.reduce((p,c) => {
      p[c.url] = c.parent_category_name
      return p
    },url_category)

    return url_category
  }


  function refine(target) {
    return new Refine(target)
  }

  class Refine {
    constructor(target) {
      this._target = target
      this._on = {}
    }

    data(val) { return accessor.bind(this)("data",val) } 
    stages(val) { return accessor.bind(this)("stages",val) } 

    before_urls(val) { return accessor.bind(this)("before_urls",val) } 
    after_urls(val) { return accessor.bind(this)("after_urls",val) } 



    on(action, fn) {
      if (fn === undefined) return this._on[action] || noop$15;
      this._on[action] = fn;
      return this
    }

    draw() {

      var self = this

      var td = this._target
      var before_urls = this._before_urls
        , after_urls = this._after_urls
        , d = this._data
        , stages = this._stages


      var url_category = calcCategory(before_urls,after_urls)


            var url_volume = before_urls.reduce((p,c) => {
              p[c.url] = (p[c.url] || 0) + c.visits
              return p
            },{})

            url_volume = after_urls.reduce((p,c) => {
              p[c.url] = (p[c.url] || 0) + c.visits
              return p
            },url_volume)

      
            
            var sorted_urls = d3.entries(url_volume).sort((p,c) => { 
              return d3.descending(p.value,c.value) 
            })


            var before_url_ts = before_urls.reduce((p,c) => {
              p[c.url] = p[c.url] || {}
              p[c.url]["url"] = c.url

              p[c.url][c.time_diff_bucket] = c.visits
              return p
            },{})

            var after_url_ts = after_urls.reduce((p,c) => {
              p[c.url] = p[c.url] || {}
              p[c.url]["url"] = c.url

              p[c.url]["-" + c.time_diff_bucket] = c.visits
              return p
            },before_url_ts)



            var to_draw = sorted_urls.slice(0,1000).map(x => after_url_ts[x.key])
  .map(function(x){
    x.total = d3.sum(buckets$1.map(function(b) { return x[b] || 0 }))
    return x
  })

  var kw_to_draw = d3.entries(after_url_ts).reduce(function(p,c) {

    c.key.toLowerCase().split(d.domain)[1].split("/").reverse()[0].replace("_","-").split("-").map(x => {
      var values = ["that","this","what","best","most","from","your","have","first","will","than","says","like","into","after","with"]
      if (x.match(/\d+/g) == null && values.indexOf(x) == -1 && x.indexOf(",") == -1 && x.indexOf("?") == -1 && x.indexOf(".") == -1 && x.indexOf(":") == -1 && parseInt(x) != x && x.length > 3) {
        p[x] = p[x] || {}
        p[x].key = x
        Object.keys(c.value).map(q => {
          p[x][q] = (p[x][q] || 0) + c.value[q]
        })
      }
      return p
    })
    return p
  },{})


  kw_to_draw = Object.keys(kw_to_draw).map(function(k) { return kw_to_draw[k] }).map(function(x){
    x.total = d3.sum(buckets$1.map(function(b) { return x[b] || 0 }))
    return x
  }).sort((p,c) => {
    return c.total - p.total
  })




            var summary_row = d3_class$4(td,"summary-row").style("margin-bottom","15px")
              .style("position","relative")
            d3_class$4(td,"action-header").style("text-align","center").style("font-size","16px").style("font-weight","bold").text("Explore and Refine").style("padding","10px")
            var title_row = d3_class$4(td,"title-row")

            var expansion_row = d3_class$4(td,"expansion-row")
            var footer_row = d3_class$4(td,"footer-row").style("min-height","10px").style("margin-top","15px")
            
            function buildFilterInput(x) {
                this.on("something")(x)
                //select_value.value += (select_value.value ? "," : "") + x.key
            }

            d3_class$4(summary_row,"title")
              .style("font-size","16px")
              .style("font-weight","bold")
              .style("text-align","center")
              .style("line-height","40px")
              .style("margin-bottom","5px")
              .text("Before and After: " + d.domain)

            var options = [
                {"key":"All","value":"all", "selected":1}
              , {"key":"Consideration","value":"consideration", "selected":0}
              , {"key":"Validation","value":"validation", "selected":0}
            ]

            var tsw = 250;

            var timeseries = d3_class$4(summary_row,"timeseries","svg")
              .style("display","block")
              .style("margin","auto")
              .style("margin-bottom","30px")
              .attr("width",tsw + "px")
              .attr("height","70px")

   

            var before_rollup = d3.nest()
              .key(function(x) { return x.time_diff_bucket})
              .rollup(function(x) { return d3.sum(x,y => y.visits) })
              .map(before_urls)
            
            var after_rollup = d3.nest()
              .key(function(x) { return "-" + x.time_diff_bucket})
              .rollup(function(x) { return d3.sum(x,y => y.visits) })
              .map(after_urls)

            var overall_rollup = buckets$1.map(x => before_rollup[x] || after_rollup[x] || 0)



            simpleTimeseries(timeseries,overall_rollup,tsw)
            d3_class$4(timeseries,"middle","line")
                  .style("stroke-dasharray", "1,5")
                  .attr("stroke-width",1)
                  .attr("stroke","black")
                  .attr("y1", 0)
                  .attr("y2", 55)
                  .attr("x1", tsw/2)
                  .attr("x2", tsw/2)

            d3_class$4(timeseries,"middle-text","text")
              .attr("x", tsw/2)
              .attr("y", 67)
              .style("text-anchor","middle")
              .text("On-site")

            
            var before_pos, after_pos;

            buckets$1.map(function(x,i) {
               if (stages.consideration == x) before_pos = i
               if (stages.validation == x) after_pos = i

            })

            var unit_size = tsw/buckets$1.length

            d3_class$4(timeseries,"before","line")
              .style("stroke-dasharray", "1,5")
              .attr("stroke-width",1)
              .attr("stroke","black")
              .attr("y1", 39)
              .attr("y2", 45)
              .attr("x1", unit_size*before_pos)
              .attr("x2", unit_size*before_pos)

            d3_class$4(timeseries,"before-text","text")
              .attr("x", unit_size*before_pos - 8)
              .attr("y", 48)

              .style("text-anchor","end")
              .text("Consideration")

            d3_class$4(timeseries,"window","line")
              .style("stroke-dasharray", "1,5")
              .attr("stroke-width",1)
              .attr("stroke","black")
              .attr("y1", 45)
              .attr("y2", 45)
              .attr("x1", unit_size*(before_pos))
              .attr("x2", unit_size*(after_pos+1)+1)


            d3_class$4(timeseries,"after","line")
              .style("stroke-dasharray", "1,5")
              .attr("stroke-width",1)
              .attr("stroke","black")
              .attr("y1", 39)
              .attr("y2", 45)
              .attr("x1", unit_size*(after_pos+1))
              .attr("x2", unit_size*(after_pos+1))

            d3_class$4(timeseries,"after-text","text")
              .attr("x", unit_size*(after_pos+1) + 8)
              .attr("y", 48)
              .style("text-anchor","start")
              .text("Validation")



            function selectOptionRect(options) {

              var subset = td.selectAll("svg").selectAll("rect")
                .attr("fill",undefined).filter((x,i) => {
                  var value = options.filter(x => x.selected)[0].value
                  if (value == "all") return false
                  if (value == "consideration") return (i < before_pos) || (i > buckets$1.length/2 - 1 )
                  if (value == "validation") return (i < buckets$1.length/2 ) || (i > after_pos)
                })


              subset.attr("fill","grey")
            }

            

            selectOptionRect(options)

            var opts = d3_class$4(summary_row,"options","div",options)
              .style("text-align","center")
              .style("position","absolute")
              .style("width","120px")
              .style("top","35px")
              .style("left","200px")


            function buildOptions(options) {
              

              d3_splat(opts,".show-button","a",options,x => x.key)
                .classed("show-button",true)
                .classed("selected",x => x.selected)
                .style("line-height","18px")
                .style("width","100px")
                .style("font-size","10px")
                .style("margin-bottom","5px")
                .text(x => x.key)
                .on("click",function(x) {
                  this.parentNode.__data__.map(z => z.selected = 0)
                  x.selected = 1
                  buildOptions(this.parentNode.__data__)
                  if (x.value == "consideration") {
                    buildUrlSelection(consideration_to_draw)
                    buildKeywordSelection(consideration_kw_to_draw)
                  } else if (x.value == "validation") {
                    buildUrlSelection(validation_to_draw)
                    buildKeywordSelection(validation_kw_to_draw)
                  } else {
                    buildUrlSelection(to_draw)
                    buildKeywordSelection(kw_to_draw)
                  }

                  selectOptionRect(this.parentNode.__data__)
                })

            }

            buildOptions(options)

            d3_class$4(summary_row,"description")
              .style("font-size","12px")
              .style("position","absolute")
              .style("width","120px")
              .style("top","35px")
              .style("right","200px")
              .text("Select domains and keywords to build and refine your global filter")





            var urls_summary = d3_class$4(summary_row,"urls-summary")
              .style("display","inline-block")
              .style("width","50%")
              .style("vertical-align","top")

            var kws_summary = d3_class$4(summary_row,"kws-summary")
              .style("display","inline-block")
              .style("width","50%")
              .style("vertical-align","top")

              

            d3_class$4(urls_summary,"title")
              .style("font-weight","bold")
              .style("font-size","14px")
              .text("URL Summary")

            d3_class$4(kws_summary,"title")
              .style("font-weight","bold")
              .style("font-size","14px")
              .text("Keyword Summary")



            var consideration_buckets = buckets$1.filter((x,i) => !((i < before_pos) || (i > buckets$1.length/2 - 1 )) )
              , validation_buckets = buckets$1.filter((x,i) => !((i < buckets$1.length/2 ) || (i > after_pos)) )

            var consideration_to_draw = to_draw.filter(x => consideration_buckets.reduce((p,c) => { p += x[c] || 0; return p},0) )
              , validation_to_draw = to_draw.filter(x => validation_buckets.reduce((p,c) => { p += x[c] || 0; return p},0) )

            function avgViews(to_draw) {
              return parseInt(to_draw.reduce((p,c) => p + c.total,0)/to_draw.length)
            }
            function medianViews(to_draw) {
              return (to_draw[parseInt(to_draw.length/2)] || {}).total || 0
            }


            var url_summary_data = [
                {"name":"Distinct URLs", "all": to_draw.length, "consideration": consideration_to_draw.length, "validation": validation_to_draw.length }
              , {"name":"Average Views", "all": avgViews(to_draw), "consideration": avgViews(consideration_to_draw), "validation": avgViews(validation_to_draw)  }
              , {"name":"Median Views", "all": medianViews(to_draw), "consideration": medianViews(consideration_to_draw), "validation": medianViews(validation_to_draw)  }
            ]

            var uwrap = d3_class$4(urls_summary,"wrap").style("width","90%")


            table.table(uwrap)
              .data({"values":url_summary_data})
              .skip_option(true)
              .headers([
                  {"key":"name","value":""}
                , {"key":"all","value":"All"}
                , {"key":"consideration","value":"Consideration"}
                , {"key":"validation","value":"Validation"}
              ])
              .draw()
              ._target.selectAll(".table-wrapper")
              .classed("table-wrapper",false)


            var consideration_kw_to_draw = kw_to_draw.filter(x => consideration_buckets.reduce((p,c) => { p += x[c] || 0; return p},0) )
              , validation_kw_to_draw = kw_to_draw.filter(x => validation_buckets.reduce((p,c) => { p += x[c] || 0; return p},0) )


            var kws_summary_data = [
                {"name":"Distinct Keywords", "all": kw_to_draw.length, "consideration": consideration_kw_to_draw.length, "validation": validation_kw_to_draw.length }
              , {"name":"Average Views", "all": avgViews(kw_to_draw), "consideration": avgViews(consideration_kw_to_draw), "validation": avgViews(validation_kw_to_draw)  }
              , {"name":"Median Views", "all": medianViews(kw_to_draw), "consideration": medianViews(consideration_kw_to_draw), "validation": medianViews(validation_kw_to_draw)  }
            ]

            var kwrap = d3_class$4(kws_summary,"wrap").style("width","90%")

            table.table(kwrap)
              .data({"values":kws_summary_data})
              .skip_option(true)
              .headers([
                  {"key":"name","value":""}
                , {"key":"all","value":"All"}
                , {"key":"consideration","value":"Consideration"}
                , {"key":"validation","value":"Validation"}
              ])
              .draw()
              ._target.selectAll(".table-wrapper")
              .classed("table-wrapper",false)





            var euh = d3_class$4(title_row,"expansion-urls-title")
              .style("width","50%")
              .style("height","36px")
              .style("line-height","36px")
              .style("display","inline-block")
              .style("vertical-align","top")
   
            d3_class$4(euh,"title")
              .style("width","265px")
              .style("font-weight","bold")
              .style("display","inline-block")
              .style("vertical-align","top")

              .text("URL")

            d3_class$4(euh,"view")
              .style("width","50px")
              .style("margin-left","20px")
              .style("margin-right","20px")
              .style("font-weight","bold")
              .style("display","inline-block")
              .style("vertical-align","top")

              .text("Views")

            var svg_legend = d3_class$4(euh,"legend","svg")
              .style("width","120px")
              .style("height","36px")
              .style("vertical-align","top")



            d3_updateable(svg_legend,".before","text")
              .attr("x","30")
              .attr("y","20")
              .style("text-anchor","middle")
              .text("Before")

            d3_updateable(svg_legend,".after","text")
              .attr("x","90")
              .attr("y","20")
              .style("text-anchor","middle")
              .text("After")

            d3_updateable(svg_legend,"line","line")
                  .style("stroke-dasharray", "1,5")
                  .attr("stroke-width",1)
                  .attr("stroke","black")
                  .attr("y1", 0)
                  .attr("y2", 36)
                  .attr("x1", 60)
                  .attr("x2", 60)




            var ekh = d3_class$4(title_row,"expansion-kws-title")
              .style("width","50%")
              .style("height","36px")
              .style("line-height","36px")
              .style("display","inline-block")
              .style("vertical-align","top")

            d3_class$4(ekh,"title")
              .style("width","265px")
              .style("font-weight","bold")
              .style("display","inline-block")
              .text("Keywords")

            d3_class$4(ekh,"view")
              .style("width","50px")
              .style("margin-left","20px")
              .style("margin-right","20px")
              .style("font-weight","bold")
              .style("display","inline-block")
              .text("Views")

            var svg_legend = d3_class$4(ekh,"legend","svg")
              .style("width","120px")
              .style("height","36px")
  .style("vertical-align","top")



            d3_updateable(svg_legend,".before","text")
              .attr("x","30")
              .attr("y","20")
              .style("text-anchor","middle")
              .text("Before")

            d3_updateable(svg_legend,".after","text")
              .attr("x","90")
              .attr("y","20")
              .style("text-anchor","middle")
              .text("After")

            d3_updateable(svg_legend,"line","line")
                  .style("stroke-dasharray", "1,5")
                  .attr("stroke-width",1)
                  .attr("stroke","black")
                  .attr("y1", 0)
                  .attr("y2", 36)
                  .attr("x1", 60)
                  .attr("x2", 60)







            function buildUrlSelection(to_draw) {
              var expansion = d3_class$4(expansion_row,"expansion-urls")
                .classed("scrollbox",true)
                .style("width","50%")
                .style("display","inline-block")
                .style("vertical-align","top")


                .style("max-height","250px")
                .style("overflow","scroll")

              expansion.html("")

              var url_row = d3_splat(expansion,".url-row","div",to_draw.slice(0,500),function(x) { return x.url })
                .classed("url-row",true)

              var url_name = d3_updateable(url_row,".name","div").classed("name",true)
                .style("width","260px")
                .style("overflow","hidden")
                .style("line-height","20px")
                .style("height","20px")

                .style("display","inline-block")

              d3_updateable(url_name,"input","input")
                .style("margin-right","10px")
                .style("display","inline-block")
                .style("vertical-align","top")
                .attr("type","checkbox")
                .on("click", function(x) {
                  self.on("stage-filter")(x)
                })

              d3_class$4(url_name,"url")
                .style("display","inline-block")
                .style("text-overflow","ellipsis")
                .style("width","235px")
                .text(x => x.url.split(d.domain)[1] || x.url )

              d3_updateable(url_row,".number","div").classed("number",true)
                .style("width","50px")
                .style("height","20px")
                .style("line-height","20px")
                .style("vertical-align","top")
                .style("text-align","center")
                .style("font-size","13px")
                .style("font-weight","bold")
                .style("margin-left","20px")
                .style("margin-right","20px")
                .style("display","inline-block")
                .text(function(x) { return d3.sum(buckets$1.map(function(b) { return x[b] || 0 })) })


              d3_updateable(url_row,".plot","svg").classed("plot",true)
                .style("width","120px")
                .style("height","20px")
                .style("display","inline-block")
                .each(function(x) {
                  var dthis = d3.select(this)
                  var values = buckets$1.map(function(b) { return x[b] || 0 })
                  simpleTimeseries(dthis,values,120,20)
                  d3_updateable(dthis,"line","line")
                    .style("stroke-dasharray", "1,5")
                    .attr("stroke-width",1)
                    .attr("stroke","black")
                    .attr("y1", 0)
                    .attr("y2", 20)
                    .attr("x1", 60)
                    .attr("x2", 60)

                })
            }


            function buildKeywordSelection(kw_to_draw) {
              var expansion = d3_class$4(expansion_row,"expansion-keywords")
                .classed("scrollbox",true)
                .style("width","50%")
                .style("display","inline-block")
                .style("vertical-align","top")

                .style("max-height","250px")
                .style("overflow","scroll")

              expansion.html("")

              var url_row = d3_splat(expansion,".url-row","div",kw_to_draw.slice(0,500),function(x) { return x.key })
                .classed("url-row",true)

              var kw_name = d3_updateable(url_row,".name","div").classed("name",true)
                .style("width","260px")
                .style("overflow","hidden")
                .style("line-height","20px")
                .style("height","20px")

                .style("display","inline-block")

              d3_updateable(kw_name,"input","input")
                .style("display","inline-block")
                .style("vertical-align","top")

                .style("margin-right","10px")
                .attr("type","checkbox")
                .on("click", function(x) {
                  self.on("stage-filter")(x)
                })

              d3_class$4(kw_name,"url")
                .style("text-overflow","ellipsis")
                .style("display","inline-block")
                .style("width","235px")
                .text(x => x.key )

              d3_updateable(url_row,".number","div").classed("number",true)
                .style("width","50px")
                .style("height","20px")
                .style("line-height","20px")
                .style("vertical-align","top")
                .style("text-align","center")
                .style("font-size","13px")
                .style("font-weight","bold")
                .style("margin-left","20px")
                .style("margin-right","20px")
                .style("display","inline-block")
                .text(function(x) { return d3.sum(buckets$1.map(function(b) { return x[b] || 0 })) })


              d3_updateable(url_row,".plot","svg").classed("plot",true)
                .style("width","120px")
                .style("height","20px")
                .style("display","inline-block")
                .each(function(x) {
                  var dthis = d3.select(this)
                  var values = buckets$1.map(function(b) { return x[b] || 0 })
                  simpleTimeseries(dthis,values,120,20)
                  d3_updateable(dthis,"line","line")
                    .style("stroke-dasharray", "1,5")
                    .attr("stroke-width",1)
                    .attr("stroke","black")
                    .attr("y1", 0)
                    .attr("y2", 20)
                    .attr("x1", 60)
                    .attr("x2", 60)

                })
            }
            
            buildUrlSelection(to_draw)
            buildKeywordSelection(kw_to_draw)





    }

  }

  function noop$7(){}

  function d3_class(target,cls,type,data) {
    return d3_updateable(target,"." + cls, type || "div",data)
      .classed(cls,true)
  }


  function relative_timing(target) {
    return new RelativeTiming(target)
  }

  class RelativeTiming {
    constructor(target) {
      this._target = target
      this._on = {}
    }

    data(val) { return accessor.bind(this)("data",val) } 

    on(action, fn) {
      if (fn === undefined) return this._on[action] || noop$7;
      this._on[action] = fn;
      return this
    }


    draw() {


          var self = this
      var data = this._data
      var wrap = d3_class(this._target,"summary-wrap")

      header(wrap)
        .text("Before and After")
        .draw()

      var bawrap = d3_updateable(wrap,".ba-row","div",false,function() { return 1})
          .classed("ba-row",true)
          .style("padding-bottom","60px")

      try {
        var stages = drawStream(bawrap,this._data.before_categories,this._data.after_categories)
        bawrap.selectAll(".before-stream").remove() // HACK
      } catch(e) {
        bawrap.html("")
        return
      }

      var values = this._data.before_categories[0].values


      var category_multipliers = data.before_categories.reduce((p,c) => {
        p[c.key] = (1 + c.values[0].percent_diff)
        return p
      },{})


      var tabular_data = this._data.before.reduce((p,c) => {
        p[c.domain] = p[c.domain] || {}
        p[c.domain]['domain'] = c.domain
        p[c.domain]['weighted'] = c.visits * category_multipliers[c.parent_category_name]
        
        p[c.domain][c.time_diff_bucket] = (p[c.domain][c.time_diff_bucket] || 0) + c.visits
        return p
      },{})

      tabular_data = this._data.after.reduce((p,c) => {
        p[c.domain] = p[c.domain] || {} 
        p[c.domain]['domain'] = c.domain
        p[c.domain]["-" + c.time_diff_bucket] = (p[c.domain][c.time_diff_bucket] || 0) + c.visits

        return p
      },tabular_data)

      var sorted_tabular = Object.keys(tabular_data).map((k) => {
        return tabular_data[k]
      }).sort((p,c) => {
        
        return d3.descending(p['600']*p.weighted || -Infinity,c['600']*c.weighted || -Infinity)
      })




      var buckets = [10,30,60,120,180,360,720,1440,2880,5760,10080].reverse().map(function(x) { return String(x*60) })
      buckets = buckets.concat([10,30,60,120,180,360,720,1440,2880,5760,10080].map(function(x) { return String(-x*60) }))


      var formatName = function(x) {

        if (x < 0) x = -x

        if (x == 3600) return "1 hr"
        if (x < 3600) return x/60 + " mins" 

        if (x == 86400) return "1 day"
        if (x > 86400) return x/86400 + " days" 

        return x/3600 + " hrs"
      }

      bawrap.selectAll(".table-wrapper").html("")

      var table_obj = table.table(bawrap)
        .top(140)
        .headers(
          [{"key":"domain", "value":"Domain"}].concat(
            buckets.map(x => { return {"key":x, "value":formatName(x), "selected":true} })
          )
          
        )
        .on("expand",function(d) {

            d3.select(this).selectAll("td.option-header").html("&ndash;")
            if (this.nextSibling && d3.select(this.nextSibling).classed("expanded") == true) {
              d3.select(this).selectAll("td.option-header").html("&#65291;")
              return d3.select(this.parentNode).selectAll(".expanded").remove()
            }

            d3.select(this.parentNode).selectAll(".expanded").remove()
            var t = document.createElement('tr');
            this.parentNode.insertBefore(t, this.nextSibling);  


            var tr = d3.select(t).classed("expanded",true).datum({})
            var td = d3_updateable(tr,"td","td")
              .attr("colspan",this.children.length)
              .style("background","#f9f9fb")
              .style("padding-top","10px")
              .style("padding-bottom","10px")

            var before_urls = data.before.filter(y => y.domain == d.domain)
            var after_urls = data.after.filter(y => y.domain == d.domain)

            refine(td)
              .data(d)
              .stages(stages)
              .before_urls(before_urls)
              .after_urls(after_urls)
              .on("stage-filter",self.on("stage-filter"))
              .draw()

          })
        .option_text("<div style='width:40px;text-align:center'>&#65291;</div>")
        //.sort("600")
        .data({"values":sorted_tabular.slice(0,1000)})
        .draw()

      table_obj._target.selectAll("th")
        //.style("width",x => (parseInt(x.key) == x.key) ? "31px" : undefined )
        //.style("max-width",x => (parseInt(x.key) == x.key) ? "31px" : undefined )
        .style("border-right","1px rgba(0,0,0,.1)")
        .selectAll("span")
        .attr("style", function(x) { 
          if (parseInt(x.key) == x.key && x.key < 0) return "font-size:.9em;width:70px;transform:rotate(-45deg);display:inline-block;margin-left:-9px;margin-bottom: 12px"
          if (parseInt(x.key) == x.key && x.key > 0) return "font-size:.9em;width:70px;transform:rotate(45deg);text-align:right;display:inline-block;margin-left: -48px; margin-bottom: 12px;"

        })


      table_obj._target.selectAll(".table-option")
        .style("display","none")


      var max = sorted_tabular.reduce((p,c) => {
        Object.keys(c).filter(z => z != "domain" && z != "weighted").map(function(x) {
          p = c[x] > p ? c[x] : p
        })
      
        return p
      },0)

      var oscale = d3.scale.linear().range([0,.8]).domain([0,Math.log(max)])

      table_obj._target.selectAll("tr").selectAll("td:not(:first-child)")
        .style("border-right","1px solid white")
        .style("padding-left","0px")
        .style("text-align","center")
        .style("background-color",function(x) {
          var value = this.parentNode.__data__[x['key']] || 0
          return "rgba(70, 130, 180," + oscale(Math.log(value+1)) + ")"
        })






        



      //var t = table.table(_explore)
      //  .data(selected)



      
    }
  }

  function noop$8(){}

  function d3_class$1(target,cls,type,data) {
    return d3_updateable(target,"." + cls, type || "div",data)
      .classed(cls,true)
  }

  function formatHour(h) {
    if (h == 0) return "12 am"
    if (h == 12) return "12 pm"
    if (h > 12) return (h-12) + " pm"
    return (h < 10 ? h[1] : h) + " am"
  }


  function timing(target) {
    return new Timing(target)
  }

  class Timing {
    constructor(target) {
      this._target = target
      this._on = {}
    }

    data(val) { return accessor.bind(this)("data",val) } 

    on(action, fn) {
      if (fn === undefined) return this._on[action] || noop$8;
      this._on[action] = fn;
      return this
    }


    draw() {


      var self = this
      var data = this._data
      var wrap = d3_class$1(this._target,"timing-wrap")

      header(wrap)
        .text("Timing")
        .draw()

      var timingwrap = d3_updateable(wrap,".timing-row","div",false,function() { return 1})
          .classed("timing-row",true)
          .style("padding-bottom","60px")

      // DATA
      var hourbuckets = d3.range(0,24).map(x => String(x).length > 1 ? String(x) : "0" + x)


      var d = d3.nest()
        .key(x => x.domain)
        .key(x => x.hour)
        .entries(data.full_urls)

      var max = 0

      d.map(x => {
        var obj = x.values.reduce((p,c) => {
          p[c.key] = c.values
          return p
        },{})

        x.buckets = hourbuckets.map(z => {
         
          var o = {
            values: obj[z],
            key: formatHour(z)
          }
          o.views = d3.sum(obj[z] || [], q => q.uniques)

          max = max > o.views ? max : o.views
          return o
        })

        x.tabular = x.buckets.reduce((p,c) => {
          p[c.key] = c.views || undefined
          return p
        },{})

        x.tabular["domain"] = x.key
        x.tabular["total"] = d3.sum(x.buckets,x => x.views)

        
        x.values
      })

      var headers = [
        {key:"domain",value:"Domain"}
      ]

      headers = headers.concat(hourbuckets.map(formatHour).map(x => { return {key: x, value: x} }) )
      
      var oscale = d3.scale.linear().range([0,.8]).domain([0,Math.log(max)])


      var table_obj = table.table(timingwrap)
        .headers(headers)
        .data({"key":"", "values":d.map(x => x.tabular) })
        .sort("total")
        .skip_option(true)
        .on("expand",function(d) {

            d3.select(this).selectAll("td.option-header").html("&ndash;")
            if (this.nextSibling && d3.select(this.nextSibling).classed("expanded") == true) {
              d3.select(this).selectAll("td.option-header").html("&#65291;")
              return d3.select(this.parentNode).selectAll(".expanded").remove()
            }

            d3.select(this.parentNode).selectAll(".expanded").remove()
            var t = document.createElement('tr');
            this.parentNode.insertBefore(t, this.nextSibling);  

            var tr = d3.select(t).classed("expanded",true).datum({})
            var td = d3_updateable(tr,"td","td")
              .attr("colspan",this.children.length)
              .style("background","#f9f9fb")
              .style("padding-top","10px")
              .style("padding-bottom","10px")

            var dd = data.full_urls.filter(function(x) { return x.domain == d.domain })
            var rolled = prepData(dd)
            
            domain_expanded(td)
              .raw(dd)
              .data(rolled)
              .on("stage-filter", function(x) {
                self.on("stage-filter")(x)
              })
              .draw()

          })
        .draw()

      table_obj._target.selectAll("tr").selectAll("td:not(:first-child)")
        .style("border-right","1px solid white")
        .style("padding-left","0px")
        .style("text-align","center")
        .style("background-color",function(x) {
          var value = this.parentNode.__data__[x['key']] || 0
          return "rgba(70, 130, 180," + oscale(Math.log(value+1)) + ")"
        })




      
    }
  }

  function d3_class$2(target,cls,type) {
    return d3_updateable(target,"." + cls, type || "div")
      .classed(cls,true)
  }

  function staged_filter(target) {
    return new StagedFilter(target)
  }

  class StagedFilter {
    constructor(target) {
      this._target = target
      this._on = {}
    }

    data(val) { return accessor.bind(this)("data",val) } 

    on(action, fn) {
      if (fn === undefined) return this._on[action] || noop;
      this._on[action] = fn;
      return this
    }


    draw() {
      var owrap = d3_class$2(this._target,"footer-wrap")
        .style("padding-top","5px")
        .style("min-height","60px")
        .style("bottom","0px")
        .style("position","fixed")
        .style("width","1000px")
        .style("background","#F0F4F7")

      var wrap = d3_class$2(owrap,"inner-wrap")
        .style("border-top","1px solid #ccc")
        .style("padding-top","5px")

      d3_class$2(wrap,"header-label")
        .style("line-height","35px")
        .style("text-transform","uppercase")
        .style("font-weight","bold")
        .style("display","inline-block")
        .style("font-size","14px")
        .style("color","#888888")
        .style("width","200px")
        .style("vertical-align","top")
        .text("Build Filters")

      d3_class$2(wrap,"text-label")
        .style("line-height","35px")
        .style("text-transform","uppercase")
        .style("font-weight","bold")
        .style("display","inline-block")
        .style("font-size","12px")
        .style("width","60px")
        .style("vertical-align","top")
        .style("display","none")
        .text("Title")

      var select_box = select(wrap)
        .options([
            {"key":"contains","value":"contains"}
          , {"key":"does not contain","value":"does not contain"}
        ])
        .draw()
        ._select
        .style("height","36px")
        .style("vertical-align","top")




      var footer_row = d3_class$2(wrap,"footer-row")
        .style("display","inline-block")


      var select_value = this.data()

      function buildFilterInput() {

        footer_row.selectAll(".selectize-control")
          .each(function(x) {
            var destroy = d3.select(this).on("destroy")
            if (destroy) destroy()
          })


        var select = d3_updateable(footer_row,"input","input")
          .style("margin-left","10px")
          .style("min-width","200px")
          .attr("value",select_value)
          .property("value",select_value)

        


        var s = $(select.node()).selectize({
          persist: false,
          create: function(x){
            select_value = (select_value.length ? select_value + "," : "") + x
            self.on("update")(select_value)
            return {
              value: x, text: x
            }
          },
          onDelete: function(x){
            select_value = select_value.split(",").filter(function(z) { return z != x[0]}).join(",")
            self.on("update")(select_value)
            return {
              value: x, text: x
            }
          }
        })

        footer_row.selectAll(".selectize-control")
          .on("destroy",function() {
            s[0].selectize.destroy()
          })

      }

      buildFilterInput()

      var self = this
      d3_class$2(wrap,"include-submit","button")
        .style("float","right")
        .style("min-width","120px")
        .style("border-radius","5px")
        .style("line-height","29px")
        .style("background","#f9f9fb")
        .style("border","1px solid #ccc")
        .style("border-radius","5px")
        .style("vertical-align","top")
        .attr("type","submit")
        .text("Modify Filters")
        .on("click",function() {
          var value = footer_row.selectAll("input").property("value")
          var op =  select_box.node().selectedOptions[0].__data__.key + ".selectize"
          
          self.on("modify")({"field":"Title","op":op,"value":value})
        })

      d3_class$2(wrap,"exclude-submit","button")
        .style("float","right")
        .style("min-width","120px")
        .style("border-radius","5px")
        .style("line-height","29px")
        .style("background","#f9f9fb")
        .style("border","1px solid #ccc")
        .style("border-radius","5px")
        .style("vertical-align","top")
        .attr("type","submit")
        .text("New Filter")
        .on("click",function() {
          var value = footer_row.selectAll("input").property("value")
          var op =  select_box.node().selectedOptions[0].__data__.key + ".selectize"

          self.on("add")({"field":"Title","op":op,"value":value})
        })


    }
  }

  function noop$9() {}
  function identity$5(x) { return x }
  function ConditionalShow(target) {
    this._on = {}
    this._classes = {}
    this._objects = {}
    this.target = target
  }

  function conditional_show(target) {
    return new ConditionalShow(target)
  }

  ConditionalShow.prototype = {
      data: function(val) {
        return accessor.bind(this)("data",val) 
      }
    , classed: function(k, v) {
        if (k === undefined) return this._classes
        if (v === undefined) return this._classes[k] 
        this._classes[k] = v;
        return this
      }  
    , on: function(action, fn) {
        if (fn === undefined) return this._on[action] || noop$9;
        this._on[action] = fn;
        return this
      }
    , draw: function () {

        var classes = this.classed()

        var wrap = d3_updateable(this.target,".conditional-wrap","div",this.data())
          .classed("conditional-wrap",true)

        var objects = d3_splat(wrap,".conditional","div",identity$5, function(x,i) { return i })
          .attr("class", function(x) { return x.value })
          .classed("conditional",true)
          .classed("hidden", function(x) { return !x.selected })


        Object.keys(classes).map(function(k) { 
          objects.classed(k,classes[k])
        })

        this._objects = objects


        return this
    
      }
    , each: function(fn) {
        this.draw()
        this._objects.each(fn)
        
      }
  }

  function Share(target) {
    this._target = target
    this._inner = function() {}
  }

  function share(target) {
    return new Share(target)
  }

  Share.prototype = {
      draw: function() {
        var self = this;

        var overlay = d3_updateable(this._target,".overlay","div")
          .classed("overlay",true)
          .style("width","100%")
          .style("height","100%")
          .style("position","fixed")
          .style("top","0px")
          .style("background","rgba(0,0,0,.5)")
          .style("z-index","301")
          .on("click",function() {
            overlay.remove()
          })

        this._overlay = overlay;

        var center = d3_updateable(overlay,".popup","div")
          .classed("popup col-md-5 col-sm-8",true)
          .style("margin-left","auto")
          .style("margin-right","auto")
          .style("min-height","300px")
          .style("margin-top","150px")
          .style("background-color","white")
          .style("float","none")
          .on("click",function() {
            d3.event.stopPropagation()
          })
          .each(function(x) {
            self._inner(d3.select(this))
          })

        return this
      }
    , inner: function(fn) {
        this._inner = fn.bind(this)
        this.draw()
        return this
      }
    , hide: function() {
        this._overlay.remove()
        return this 
      }
  }

  function noop$1() {}

  function NewDashboard(target) {
    this.target = target
    this._on = {}
  }

  function new_dashboard(target) {
    return new NewDashboard(target)
  }

  NewDashboard.prototype = {
      data: function(val) {
        return accessor.bind(this)("data",val) 
      }
    , staged_filters: function(val) {
        return accessor.bind(this)("staged_filters",val) || ""
      }
    , saved: function(val) {
        return accessor.bind(this)("saved",val) 
      }
    , selected_action: function(val) {
        return accessor.bind(this)("selected_action",val) 
      }
    , selected_comparison: function(val) {
        return accessor.bind(this)("selected_comparison",val) 
      }
    , action_date: function(val) {
        return accessor.bind(this)("action_date",val) 
      }
    , comparison_date: function(val) {
        return accessor.bind(this)("comparison_date",val) 
      }

    , view_options: function(val) {
        return accessor.bind(this)("view_options",val) || []
      }
    , logic_options: function(val) {
        return accessor.bind(this)("logic_options",val) || []
      }
    , explore_tabs: function(val) {
        return accessor.bind(this)("explore_tabs",val) || []
      }
    , logic_categories: function(val) {
        return accessor.bind(this)("logic_categories",val) || []
      }
    , actions: function(val) {
        return accessor.bind(this)("actions",val) || []
      }
    , summary: function(val) {
        return accessor.bind(this)("summary",val) || []
      }
    , time_summary: function(val) {
        return accessor.bind(this)("time_summary",val) || []
      }
    , category_summary: function(val) {
        return accessor.bind(this)("category_summary",val) || []
      }
    , keyword_summary: function(val) {
        return accessor.bind(this)("keyword_summary",val) || []
      }
    , before: function(val) {
        return accessor.bind(this)("before",val) || []
      }
    , after: function(val) {
        return accessor.bind(this)("after",val) || []
      }
    , filters: function(val) {
        return accessor.bind(this)("filters",val) || []
      }
    , loading: function(val) {
        if (val !== undefined) this._segment_view && this._segment_view.is_loading(val).draw()
        return accessor.bind(this)("loading",val)
      }
    , draw: function() {

        var data = this.data()

        var options = JSON.parse(JSON.stringify(this.view_options()))
        var tabs = JSON.parse(JSON.stringify(this.explore_tabs()))


        var logic = JSON.parse(JSON.stringify(this.logic_options()))
          , categories = this.logic_categories()
          , filters = JSON.parse(JSON.stringify(this.filters()))
          , actions = JSON.parse(JSON.stringify(this.actions()))
          , staged_filters = JSON.parse(JSON.stringify(this.staged_filters()))



        var target = this.target
        var self = this

        this._segment_view = segment_view(target)
          .is_loading(self.loading() || false)
          .segments(actions)
          .data(self.summary())
          .action(self.selected_action() || {})
          .action_date(self.action_date() || "")
          .comparison_date(self.comparison_date() || "")

          .comparison(self.selected_comparison() || {})
          .on("change", this.on("action.change"))
          .on("action_date.change", this.on("action_date.change"))
          .on("comparison.change", this.on("comparison.change"))
          .on("comparison_date.change", this.on("comparison_date.change"))
          .on("saved-search.click", function() {  
            var ss = share(d3.select("body")).draw()
            ss.inner(function(target) {

              var header = d3_updateable(target,".header","h4")
                .classed("header",true)
                .style("text-align","center")
                .style("text-transform","uppercase")
                .style("font-family","ProximaNova, sans-serif")
                .style("font-size","12px")
                .style("font-weight","bold")
                .style("padding-top","30px")
                .style("padding-bottom","30px")
                .text("Open a saved dashboard")

              var form = d3_updateable(target,"div","div",self.saved())
                .style("text-align","left")
                .style("padding-left","25%")

              if (!self.saved() || self.saved().length == 0) {
                d3_updateable(form,"span","span")
                  .text("You currently have no saved dashboards")
              } else {
                d3_splat(form,".row","a",function(x) { return x },function(x) { return x.name })
                  .classed("row",true)
                  //.attr("href", x => x.endpoint)
                  .text(x => x.name)
                  .on("click", function(x) {
                    // HACK: THIS is hacky...
                    var _state = state.qs({}).from("?" + x.endpoint.split("?")[1])

                    ss.hide()
                    window.onpopstate({state: _state})
                    d3.event.preventDefault()
                    return false
                  })

              }

            })

          })
          .on("new-saved-search.click", function() { 
            var ss = share(d3.select("body")).draw()
            ss.inner(function(target) {

              var header = d3_updateable(target,".header","h4")
                .classed("header",true)
                .style("text-align","center")
                .style("text-transform","uppercase")
                .style("font-family","ProximaNova, sans-serif")
                .style("font-size","12px")
                .style("font-weight","bold")
                .style("padding-top","30px")
                .style("padding-bottom","30px")
                .text("Save this dashboard:")

              var form = d3_updateable(target,"div","div")
                .style("text-align","center")

              var name = d3_updateable(form, ".name", "div")
                .classed("name",true)
              
              d3_updateable(name,".label","div")
                .style("width","100px")
                .style("display","inline-block")
                .style("text-transform","uppercase")
                .style("font-family","ProximaNova, sans-serif")
                .style("font-size","12px")
                .style("font-weight","bold")
                .style("text-align","left")
                .text("Dashboard Name:")

              var name_input = d3_updateable(name,"input","input")
                .style("width","300px")
                .attr("placeholder","My awesome search")


              var send = d3_updateable(form, ".send", "div")
                .classed("send",true)
                .style("text-align","center")


              d3_updateable(send,"button","button")
                .style("line-height","16px")
                .style("margin-top","10px")
                .text("Send")
                .on("click",function(x) {
                  var name = name_input.property("value") 

                  d3.xhr("/crusher/saved_dashboard")
                    .post(JSON.stringify({
                          "name": name
                        , "endpoint": window.location.pathname + window.location.search
                      })
                    )

                  ss.hide()

                })
                .text("Save")



            })


          })
          .draw()

        if (this.summary() == false) return false

        filter_view(target)
          .logic(logic)
          .categories(categories)
          .filters(filters)
          .data(data)
          .on("logic.change", this.on("logic.change"))
          .on("filter.change", this.on("filter.change"))
          .draw()

        option_view(target)
          .data(options)
          .on("select", this.on("view.change") )
          .draw()

        conditional_show(target)
          .data(options)
          .classed("view-option",true)
          .draw()
          .each(function(x) {

            if (!x.selected) return

            var dthis = d3.select(this)

            if (x.value == "data-view") {
              var dv = domain_view(dthis)
                .options(tabs)
                .data(data)
                .on("select", self.on("tab.change") )
                .on("stage-filter",function(x) {

                 staged_filters = staged_filters.split(",").concat(x.key || x.url).filter(x => x.length).join(",")
                 self.on("staged-filter.change")(staged_filters)
                 HACKbuildStagedFilter(staged_filters)

      
               })

                .draw()
            }

            if (x.value == "media-view") {
              media_plan.media_plan(dthis.style("margin-left","-15px").style("margin-right","-15px"))
               .data(data)
               .draw()
            }

            if (x.value == "ba-view") {
              relative_timing(dthis)
               .data(self.before())
               .on("stage-filter",function(x) {

                 staged_filters = staged_filters.split(",").concat(x.key || x.url).filter(x => x.length).join(",")
                 self.on("staged-filter.change")(staged_filters)
                 HACKbuildStagedFilter(staged_filters)

      
               })
               .draw()
            }

            if (x.value == "summary-view") {
              summary_view(dthis)
               .data(self.summary())
               .timing(self.time_summary())
               .category(self.category_summary())
               .before(self.before())
               .after(self.after())
               .keywords(self.keyword_summary())
               .on("ba.sort",self.on("ba.sort"))
               .draw()
            }

            if (x.value == "timing-view") {
              timing(dthis)
               .data(self.data())
               .on("stage-filter",function(x) {

                 staged_filters = staged_filters.split(",").concat(x.key || x.url).filter(x => x.length).join(",")
                 self.on("staged-filter.change")(staged_filters)
                 HACKbuildStagedFilter(staged_filters)

      
               })
               .draw()
            }

          })

        function HACKbuildStagedFilter(staged) {

          staged_filter(target)
            .data(staged)
            .on("update",function(x) {
              self.on("staged-filter.change")(x)
            })
            .on("modify",function(x) {
              self.on("staged-filter.change")("")
              self.on("modify-filter")(x)
            })

            .on("add",function(x) {
              self.on("staged-filter.change")("")
              self.on("add-filter")(x)
            })
            .draw()
        }
        HACKbuildStagedFilter(staged_filters)

        return this

      }
    , on: function(action, fn) {
        if (fn === undefined) return this._on[action] || noop$1;
        this._on[action] = fn;
        return this
      }

  }

  function compare(qs_state,_state) {

    var updates = {}


    state.comp_eval(qs_state,_state,updates)
      .accessor(
          "selected_action"
        , (x,y) => y.actions.filter(z => z.action_id == x.selected_action)[0]
        , (x,y) => y.selected_action
      )
      .failure("selected_action", (_new,_old,obj) => { 
        Object.assign(obj,{
            "loading": true
          , "selected_action": _new
        })
      })
      .accessor(
          "selected_view"
        , (x,y) => x.selected_view
        , (_,y) => y.dashboard_options.filter(x => x.selected)[0].value 
      )
      .failure("selected_view", (_new,_old,obj) => {
        // this should be redone so its not different like this
        Object.assign(obj, {
            "loading": true
          , "dashboard_options": JSON.parse(JSON.stringify(_state.dashboard_options)).map(x => { 
              x.selected = (x.value == _new); 
              return x 
            })
        })
      })
      .accessor(
          "selected_comparison"
        , (x,y) => y.actions.filter(z => z.action_id == x.selected_comparison)[0]
        , (x,y) => y.selected_comparison
      )
      .failure("selected_comparison", (_new,_old,obj) => { 
        Object.assign(obj,{
            "loading": true
          , "selected_comparison": _new
        })
      })
      .equal("filters", (x,y) => JSON.stringify(x) == JSON.stringify(y) )
      .failure("filters", (_new,_old,obj) => { 
        Object.assign(obj,{
            "loading": true
          , "filters": _new || [{}]
        })
      })
      .failure("action_date", (_new,_old,obj) => { 
        Object.assign(obj,{ loading: true, "action_date": _new })
      })
      .failure("comparison_date", (_new,_old,obj) => { 
        Object.assign(obj,{ loading: true, "comparison_date": _new })
      })

      .evaluate()

    var current = state.qs({}).to(_state.qs_state || {})
      , pop = state.qs({}).to(qs_state)

    if (Object.keys(updates).length && current != pop) {
      return updates
    }

    return {}
    
  }


  var s = Object.freeze({
    compare: compare
  });

  let state$1 = s;

  var version = "0.0.1";

  exports.version = version;
  exports.state = state$1;
  exports.new_dashboard = new_dashboard;
  exports.prepData = p;
  exports.buildSummaryData = buildSummaryData;
  exports.buildSummaryAggregation = buildSummaryAggregation;
  exports.buildCategories = buildCategories;
  exports.buildTimes = buildTimes;
  exports.buildTopics = buildTopics;
  exports.buildDomains = buildDomains;
  exports.buildUrls = buildUrls;
  exports.buildOnsiteSummary = buildOnsiteSummary;
  exports.buildOffsiteSummary = buildOffsiteSummary;
  exports.buildActions = buildActions;

}));