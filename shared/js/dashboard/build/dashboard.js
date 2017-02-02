(function (global, factory) {
   typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('table'), require('filter')) :
   typeof define === 'function' && define.amd ? define('dashboard', ['exports', 'table', 'filter'], factory) :
   factory((global.dashboard = {}),global.table,global.filter);
}(this, function (exports,table,filter) { 'use strict';

   table = 'default' in table ? table['default'] : table;
   filter = 'default' in filter ? filter['default'] : filter;

   function render_filter(_top,_lower) {
     var self = this
       , data = self._data;

     var wrapper = d3_updateable(_top,".filter-wrapper","div",false, function(x) { return 1})
       .classed("filter-wrapper",true)
       .classed("hidden",false)

     d3_updateable(_top, "h3.summary-head","h3")
       .classed("summary-head",true)
       .style("margin-bottom","15px")
       .style("margin-top","-5px")
       .text("Search Summary")

     var summary = d3_updateable(_top,".search-summary","div",false, function(x) { return 1})
       .classed("search-summary",true)
       .style("min-height","60px")

     //var _top = wrapper


     var save = d3_updateable(wrapper, ".save-subtitle-filter","div")
       .classed("save-subtitle-filter",true)
       .classed("hidden",true)
       .attr("style","padding-left:10px; text-transform: uppercase; font-weight: bold; line-height: 24px; margin-bottom: 10px;")
       .style("text-align","right")


     d3_updateable(save,"span","span")
       .text("Save filter as:")

     var save_input = d3_updateable(save,"input","input")
       .style("margin-left","10px")
       .style("padding-left","8px")
       .style("font-weight","normal")
       .style("line-height","12px")
       .attr("placeholder","Filter name...")

     d3_updateable(save,"br","br")


     d3_updateable(save,"button","button")
       .style("margin-left","10px")
       .style("padding-left","8px")
       .style("font-weight","normal")
       .style("height","20px")
       .style("line-height","12px")
       .text("Save")
       .on("click", function(x) {
         var value = save_input.property("value")

         var filters = self._state.get("filter")
         var saved_searches = JSON.parse(localStorage.getItem("search.saved")) || []

         saved_searches.push({
             "key": value
           , "values": filters
         })

         localStorage.setItem("search.saved",JSON.stringify(saved_searches))

         save.classed("hidden",true)
       })






     var subtitle = d3_updateable(wrapper, ".subtitle-filter","div")
       .classed("subtitle-filter",true)
       .attr("style","padding-left:10px; text-transform: uppercase; font-weight: bold; line-height: 33px; background: #e3ebf0; margin-bottom:10px")
       

     d3_updateable(subtitle,"span.first","span")
       .text("Users matching " )
       .classed("first",true)

     var filter_type  = d3_updateable(subtitle,"span.middle","span")
       .classed("middle",true)


     var select = d3_updateable(filter_type,"select","select")
       .style("font-size","10")
       .style("width","50px")
       .on("change",function() {
         var d = this.selectedOptions[0].__data__
         self._state.set("logic", (d == "Any") ? "or" : "and")
         self._logic_filter.on("update")(self._state.get("filter"))
       })

     d3_splat(select,"option","option",["All","Any"])
       .attr("selected",function(x) {
         return self._state.get("logic","and") == "or" ? x == "Any" : undefined
       })
       .text(String)
     


     d3_updateable(subtitle,"span.last","span")
       .text(" of the following:")
       .classed("last",true)

     var mapping = {
         "Category": "parent_category_name"
       , "Title": "url"
       , "Time": "hour"
     }

     var hours = d3.range(0,24).map(function(x) { return x < 10 ? "0" + String(x) : String(x) })
       , minutes = d3.range(0,40,20).map(String);


     var hourSelected = function() {}

     var filters = self._state.get("filter",[{}])

     //if (document.location.search.indexOf("filter") > -1) {
     //
     //  filters = document.location.search.split("filter=")[1]
     //  filters = JSON.parse(decodeURIComponent(filters.split("&")[0]))
     //  this._state.filters
     //}

     //debugger
     var categories = this._data.category.map(function(x) {x.key = x.parent_category_name; return x})

     self._logic_filter = filter.filter(wrapper)
       .fields(Object.keys(mapping))
       .ops([
           [{"key": "equals.category"}]
         , [{"key":"contains"},{"key":"starts with"},{"key":"ends with"}]
         , [{"key":"equals"}, {"key":"between","input":2}]
       ])
       .data(filters)
       .render_op("equals.category",function(filter,value) {
         var self = this;

         var select = d3_updateable(filter,"select.value","select")
           .classed("value",true)
           .style("margin-bottom","10px")
           .style("padding-left","10px")
           .style("width","150px")
           .attr("value", value.value)
           .on("change", function(x){
             value.value = this.value
             self.on("update")(self.data())
           })

         d3_splat(select,"option","option",categories,function(x) { return x.key })
           .attr("selected",function(x) { return x.key == value.value ? "selected" : undefined })
           .text(function(x) { return x.key })

       })
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
               //value.fn = self.buildOp(value)
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
               //value.fn = self.buildOp(value)
               self.on("update")(self.data())
             },1000)
           })


       })
       .on("update",function(x){

         self._state.set("filter",x)

         var y = x.map(function(z) {
           return { 
               "field": mapping[z.field]
             , "op": z.op
             , "value": z.value
           }
         })

         if (y.length > 0 && y[0].value) {
           var logic = self._state.get("logic","and")
           var data = {
               "full_urls": filter.filter_data(self._data.full_urls).logic(logic).by(y)
             //, "url_only": filter.filter_data(self._data.url_only).logic("and").by(y)
           }

           var categories = d3.nest()
             .key(function(x){ return x.parent_category_name})
             .rollup(function(v) {
               return v.reduce(function(p,c) { return p + c.uniques },0)
             })
             .entries(data.full_urls)

           var total = categories.reduce(function(p,c) { return p + c.values },0)

           categories.map(function(x) {
             x.value = x.values
             x.percent = x.value / total
           })

           data["display_categories"] = {
               "key":"Categories"
             , "values": categories.filter(function(x) { return x.key != "NA" })
           }

           var category_hour = d3.nest()
             .key(function(x){ return x.parent_category_name + x.hour + x.minute})
             .rollup(function(v) {
               return {
                   "parent_category_name": v[0].parent_category_name
                 , "hour": v[0].hour
                 , "minute": v[0].minute 
                 , "count":v.reduce(function(p,c) { return p + c.count },0)
               }
             })
             .entries(data.full_urls)
             .map(function(x) { return x.values })

           data["category_hour"] = category_hour

           




           self._data.display_categories = data.display_categories

           self.render_right(data)
           self.render_summary(_top,data)
           self.render_view(_lower,data)
         } else {
           self.render_right(data)
           self.render_summary(_top,self._data)

           self.render_view(_lower,self._data)
         }
       })
       .draw()

     self._logic_filter
       .on("update")(filters)

     
   }

   function accessor(attr, val) {
     if (val === undefined) return this["_" + attr]
     this["_" + attr] = val
     return this
   }

   function topSection(section) {
     return d3_updateable(section,".top-section","div")
       .classed("top-section",true)
       .style("min-height","160px")
   }

   function remainingSection(section) {
     return d3_updateable(section,".remaining-section","div")
       .classed("remaining-section",true)
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

   function autoScales(_sizes, len) {

     var margin = _sizes.margin,
       width = _sizes.width,
       height = _sizes.height;

     height = len * 26
     
     var x = d3.scale.linear()
         .range([width/2, width-20]);
     
     var y = d3.scale.ordinal()
         .rangeRoundBands([0, height], .2);

     var xAxis = d3.svg.axis()
         .scale(x)
         .orient("top");


     return {
         x: x
       , y: y
       , xAxis: xAxis
     }
   }

   var EXAMPLE_DATA = {
       "key": "User Visits"
     , "values": [
         {  
             "key":"Off-site Views"
           , "value": 12344
         }
       , {
             "key":"Off-site Uniques"
           , "value": 12344
         }
     ] 
   }

   function SummaryBox(target) {
     this._target = target;
     this._data = EXAMPLE_DATA
   }

   function summary_box(target) {
     return new SummaryBox(target)
   }

   SummaryBox.prototype = {

       data: function(val) { return accessor.bind(this)("data",val) }
     , title: function(val) { return accessor.bind(this)("title",val) }
     , draw: function() {
         var wrap = this._target
         var desc = d3_updateable(wrap,".vendor-domains-bar-desc","div")
           .classed("vendor-domains-bar-desc",true)
           .style("display","inherit")
           .datum(this._data)

         var w = d3_updateable(desc,".w","div")
           .classed("w",true)
     
         d3_updateable(w, "h3","h3")
           .text(function(x){return x.key})
           .style("margin-bottom","15px")

         var ww = d3_splat(desc,".ww","div",function(x){ return x.values},function(x){ return x.key})
           .classed("ww",true)
           .style("text-align","center")
           .style("display","inline-block")
           .style("width","45%")
     
         var views = d3_updateable(ww,".views","div")
           .classed("views",true)
           .style("text-align","left")
           .style("display","inline-block")
     
         d3_updateable(views,"div","div")
           .text(function(x){return x.key})
     
         d3_updateable(views,".number","div")
           .classed("number",true)
           .text(function(x){ return d3.format(",")(x.value)})
           .style("font-size","32px")
           .style("font-weight","bold")

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

     values.map(function(x) {
       x.sample_percent_norm = norm(x.sample_percent)
       //x.percent_norm = x.percent
     })



     
     return {
         key: "Top Domains"
       , values: values.slice(0,300)
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

   var EXAMPLE_DATA$1 = {
       "key": "Categories"
     , "values": [
         {  
             "key":"cat1"
           , "value": 12344
           , "percent": .50

         }
       , {
             "key":"cat2"
           , "value": 12344
           , "percent": .50

         }
     ] 
   }

   function BarSelector(target) {
     var nullfunc = function() {}
     this._target = target;
     this._data = EXAMPLE_DATA$1
     this._categories = {}
     this._on = {
         click: nullfunc
     }
     this._type = "checkbox"
   }

   function bar_selector(target) {
     return new BarSelector(target)
   }

   BarSelector.prototype = {

       data: function(val) { return accessor.bind(this)("data",val) }
     , on: function(action, fn) {
         if (fn === undefined) return this._on[action];
         this._on[action] = fn;
         return this
       }
     , type: function(val) { return accessor.bind(this)("type",val) }
     , title: function(val) { return accessor.bind(this)("title",val) }
     , skip_check: function(val) { return accessor.bind(this)("skip_check",val) }

     , draw: function() {

         var self = this
         var wrap = this._target
         var desc = d3_updateable(wrap,".vendor-domains-bar-desc","div")
           .classed("vendor-domains-bar-desc",true)
           .style("display","inherit")
           .datum(this._data)


         var wrapper = d3_updateable(desc,".w","div")
           .classed("w",true)

         wrapper.each(function(row) {

             var data = row.values
     
             d3_updateable(wrapper, "h3","h3")
               .text(function(x){return x.key})
               .style("margin-bottom","15px")
       
             var _sizes = autoSize(wrapper,function(d){return d -50}, function(d){return 400})
             var len = data.length
       
             var scales = autoScales(_sizes,len),
               x = scales.x,
               y = scales.y,
               xAxis = scales.xAxis;
               
             var svg_wrap = d3_updateable(wrapper,"svg","svg")
               .attr("width", _sizes.width + _sizes.margin.left + _sizes.margin.right) 
               .attr("height", _sizes.height + _sizes.margin.top + _sizes.margin.bottom)
             
             var svg = d3_splat(svg_wrap,"g","g",function(x) { return [x.values]},function(x,i) {return i })
               .attr("transform", "translate(" + _sizes.margin.left + "," + 0 + ")")
           
             var valueAccessor = function(x){ return x.value }
               , labelAccessor = function(x) { return x.key }
       
             var values = data.map(valueAccessor)
           
             x.domain(
               d3.extent(
                 [
                      d3.min(values)-.1,d3.max(values)+.1
                   , -d3.min(values)+.1,-d3.max(values)-.1
                 ],
                 function(x) { return x}
               )
             ).nice();
           
             y.domain(data.map(labelAccessor));
           

             var bar = d3_splat(svg,".bar","rect",false,labelAccessor)
                 .attr("class", function(d) { return valueAccessor(d) < 0 ? "bar negative" : "bar positive"; })
                 .attr("x",_sizes.width/2 + 60)
                 .attr("y", function(d) { return y(labelAccessor(d)); })
                 .attr("width", function(d) { return Math.abs(x(valueAccessor(d)) - x(0)); })
                 .attr("height", y.rangeBand())
                 .style("cursor", "pointer")
                 .on("click", function(x) {
                   self._click.bind(this)(x,self)
                 })
           
             bar.exit().remove()

             if (!self._skip_check) { 
               var checks = d3_splat(svg,".check","foreignObject",false,labelAccessor)
                   .classed("check",true)
                   .attr("x",2)
                   .attr("y", function(d) { return y(labelAccessor(d)) })
                   .html("<xhtml:tree></xhtml:tree>")
           
               svg.selectAll("foreignobject").each(function(z){
                 var tree = d3.select(this.children[0])
                 var z = z
                 d3_updateable(tree,"input","input")
                   .attr("type",self._type)
                   .property("checked",function(y){
                     return z.selected ? "checked" : undefined
                   })
                   .on("click", function(x) {
                     self._on.click.bind(this)(z,self)
                   })
               })
           
               checks.exit().remove()
             }
           
           
             var label = d3_splat(svg,".name","text",false,labelAccessor)
                 .classed("name",true)
                 .attr("x", self._skip_check ? 5 : 25 )
                 .attr("style", "text-anchor:start;dominant-baseline: middle;")
                 .attr("y", function(d) { return y(labelAccessor(d)) + y.rangeBand()/2 + 1; })
                 .text(labelAccessor)
           
             label.exit().remove()
           
             var percent = d3_splat(svg,".percent","text",false,labelAccessor)
                 .classed("percent",true)
                 .attr("x",_sizes.width/2 + 20)
                 .attr("style", "text-anchor:start;dominant-baseline: middle;font-size:.9em")
                 .attr("y", function(d) { return y(labelAccessor(d)) + y.rangeBand()/2 + 1; })
                 .classed("hidden",function(d) {return d.percent === undefined })
                 .text(function(d) {
                   var v = d3.format("%")(d.percent);
                   var x = (d.percent > 0) ?  "↑" : "↓"
                   return "(" + v + x  + ")"
                 })

             percent.exit().remove()
           
             svg.append("g")
                 .attr("class", "y axis")
               .append("line")
                 .attr("x1", x(0))
                 .attr("x2", x(0))
                 .attr("y2", _sizes.height);

         })

       }
   }

   var EXAMPLE_DATA$3 = {
       "key": "Top Sites"
     , "values": [
         {  
             "key":"URL.com"
           , "value": 12344
         }
       , {
             "key":"aol.com"
           , "value": 12344
         }
     ] 
   }

   function Table(target) {
     this._target = target;
     this._data = EXAMPLE_DATA$3
     this._render_header = function(wrap) {

       wrap.each(function(data) {
         var headers = d3_updateable(d3.select(this),".headers","div")
           .classed("headers",true)
           .style("text-transform","uppercase")
           .style("font-weight","bold")
           .style("line-height","24px")
           .style("border-bottom","1px solid #ccc")
           .style("margin-bottom","10px")

         headers.html("")


         d3_updateable(headers,".url","div")
           .classed("url",true)
           .style("width","75%")
           .style("display","inline-block")
           .text("Article")

         d3_updateable(headers,".count","div")
           .classed("count",true)
           .style("width","25%")
           .style("display","inline-block")
           .text("Count")


       })

     }
     this._render_row = function(row) {

         d3_updateable(row,".url","div")
           .classed("url",true)
           .style("width","75%")
           .style("line-height","24px")
           .style("height","24px")
           .style("overflow","hidden")
           .style("display","inline-block")
           .text(function(x) {return x.key})

         d3_updateable(row,".count","div")
           .classed("count",true)
           .style("width","25%")
           .style("display","inline-block")
           .style("vertical-align","top")
           .text(function(x){return x.value})

     }
   }

   function table$1(target) {
     return new Table(target)
   }

   Table.prototype = {

       data: function(val) { return accessor.bind(this)("data",val) }
     , title: function(val) { return accessor.bind(this)("title",val) }
     , row: function(val) { return accessor.bind(this)("render_row",val) }
     , header: function(val) { return accessor.bind(this)("render_header",val) }

     
     , draw: function() {
         var wrap = this._target
         var desc = d3_updateable(wrap,".vendor-domains-bar-desc","div")
           .classed("vendor-domains-bar-desc",true)
           .style("display","inherit")
           .style("padding-left","10px")
           .datum(this._data)

         var wrapper = d3_updateable(desc,".w","div")
           .classed("w",true)
           
         var self = this

         wrapper.each(function(row) {

           var wrap = d3.select(this)

           //d3_updateable(wrap, "h3","h3")
           //  .text(function(x){return x.key})
           //  .style("margin-bottom","15px")

           self._render_header(wrap)
           var row = d3_splat(wrap,".row","div",function(x) {return x.values}, function(x) {return x.key})
             .classed("row",true)
             .style("line-height","24px")
             .each(function() {
               self._render_row(d3.select(this))
             })

           row.exit().remove()

           row.sort(function(p,c) {return c.value - p.value})

         })
       }
   }

   // TODO: unit tests

   function State(loc) {
     this._loc = loc
     this._parse = function parseQuery(qstr) {
           var query = {};
           var a = qstr.substr(1).split('&');
           for (var i = 0; i < a.length; i++) {
               var b = a[i].split('=');
               query[decodeURIComponent(b[0])] = decodeURIComponent(b[1] || '');
           }
           return query;
       }
   }

   function state(loc) {
     return new State(loc)
   }

   State.prototype = {

       get: function(key,_default) { 
         var loc = this._loc || document.location.search
           , _default = _default || false;

         if (loc.indexOf(key) == -1) return _default


         var f = this._parse(loc)[key]

         try {
           return JSON.parse(f)
         } catch(e) {
           return f
         }
       }
     , set: function(key,val) {
         var loc = this._loc || document.location.search

         var parsed = this._parse(loc)

         parsed[key] = val

         var s = "?"
         Object.keys(parsed).map(function(k) {
           if (typeof(parsed[k]) == "object") {

             var o = parsed[k]
             if (o.length == undefined) {
               var o2 = {}
     
               Object.keys(o).map(function(x) { o2[x] = encodeURIComponent(o[x]) })
               s += k + "=" + JSON.stringify(o2) + "&"
             } else {
               var o1 = []
     
               o.map(function(i) {
                 if (typeof(i) == "number") return o1.push(i)
                 if (typeof(i) == "string") return o1.push(encodeURIComponent(i))

                 var o2 = {}
                 Object.keys(i).map(function(x) { o2[x] = encodeURIComponent(i[x]) })
                 o1.push(o2)
               })
     
               s += k + "=" + JSON.stringify(o1) + "&"
             }
           }
           else s += k + "=" + parsed[k] + "&"
         })
         
         history.pushState({}, "", document.location.pathname + s.slice(0,-1))

       }
   }

   function Dashboard(target) {
     this._on = {}
     this._state = state()
     this._target = target
       .append("ul")
       .classed("vendors-list",true)
         .append("li")
         .classed("vendors-list-item",true);
   }

   function dashboard(target) {
     return new Dashboard(target)
   }

   Dashboard.prototype = {
       data: function(val) { return accessor.bind(this)("data",val) }
     , actions: function(val) { return accessor.bind(this)("actions",val) }
     , draw: function() {
         this._target
         this._categories = {}
         this.render_wrappers()
         this._target.selectAll(".loading").remove()
         this.render_lhs()
         this.render_right()

         this.render_center()

       }
     , on: function(action, fn) {
         if (fn === undefined) return this._on[action];
         this._on[action] = fn;
         return this
       }
     , draw_loading: function() {
         this.render_wrappers()
         this.render_center_loading()
         return this
       }
     , render_wrappers: function() {

         this._lhs = d3_updateable(this._target,".lhs","div")
           .classed("lhs col-md-3",true)

         this._center = d3_updateable(this._target,".center","div")
           .classed("center col-md-6",true)

         this._right = d3_updateable(this._target,".right","div")
           .classed("right col-md-3",true)

       }
     , render_lhs: function() {

         var self = this

         this._lhs = d3_updateable(this._target,".lhs","div")
           .classed("lhs col-md-3",true)

         var current = this._lhs
           , _top = topSection(current)
           , _lower = remainingSection(current)

         summary_box(_top)
           .data(buildOnsiteSummary(this._data))
           .draw()

         this._data.display_actions = this._data.display_actions || buildActions(this._data)

         bar_selector(_lower)
           .type("radio")
           .data(this._data.display_actions)
           .on("click",function(x) {
             var t = this;

             _lower.selectAll("input")
               .attr("checked",function() {
                 this.checked = (t == this)
                 return undefined
               })

             //self._data.display_actions.values.map(function(v) {
             //  v.selected = 0
             //  if (v == x) v.selected = 1
             //})
             self.draw_loading()

             self.on("select")(x)
           })
           .draw()

       }
     , render_view: function(_lower,data) {

         var head = d3_updateable(_lower, "h3","h3")
           .style("margin-bottom","15px")
           .style("margin-top","-5px")

         var tabs = [
             buildDomains(data)
           , buildUrls(data)
         ]
         tabs[0].selected = 1

         d3_updateable(head,"span","span")
           .text(tabs.filter(function(x){ return x.selected})[0].key)

         var select = d3_updateable(head,"select","select")
           .style("width","19px")
           .style("margin-left","12px")
           .on("change", function(x) {
             tabs.map(function(y) { y.selected = 0 })

             this.selectedOptions[0].__data__.selected = 1
             draw()
           })
         
         d3_splat(select,"option","option",tabs,function(x) {return x.key})
           .text(function(x){ return x.key })
           .style("color","#888")
           .style("min-width","100px")
           .style("text-align","center")
           .style("display","inline-block")
           .style("padding","5px")
           .style("border",function(x) {return x.selected ? "1px solid #888" : undefined})
           .style("opacity",function(x){ return x.selected ? 1 : .5})

         function draw() {
           var selected = tabs.filter(function(x){ return x.selected})[0]

           d3_updateable(head,"span","span")
             .text(selected.key)

           _lower.selectAll(".vendor-domains-bar-desc").remove()

           var t = table$1(_lower)
             .data(selected)


           if (selected.key == "Top Domains") {
             var samp_max = d3.max(selected.values,function(x){return x.percent_norm})
               , pop_max = d3.max(selected.values,function(x){return x.pop_percent})
               , max = Math.max(samp_max,pop_max);

             var width = _lower.style("width").split(".")[0].replace("px","")/2 - 10
               , height = 20

             var x = d3.scale.linear()
               .range([0, width])
               .domain([0, max])

             t.header(function(wrap) {
               var headers = d3_updateable(wrap,".headers","div")
                 .classed("headers",true)
                 .style("text-transform","uppercase")
                 .style("font-weight","bold")
                 .style("line-height","24px")
                 .style("border-bottom","1px solid #ccc")
                 .style("margin-bottom","10px")

               headers.html("")

               d3_updateable(headers,".url","div")
                 .classed("url",true)
                 .style("width","30%")
                 .style("display","inline-block")
                 .text("Domain")

               d3_updateable(headers,".bullet","div")
                 .classed("bullet",true)
                 .style("width","50%")
                 .style("display","inline-block")
                 .text("Likelihood Versus Population")

               d3_updateable(headers,".percent","div")
                 .classed("percent",true)
                 .style("width","20%")
                 .style("display","inline-block")
                 .text("Percent Diff")



             })

             t.row(function(row) {
               d3_updateable(row,".url","div")
                 .classed("url",true)
                 .style("width","30%")
                 .style("display","inline-block")
                 .style("vertical-align","top")
                 .text(function(x) {return x.key})

               var bullet = d3_updateable(row,".bullet","div")
                 .classed("bullet",true)
                 .style("width","50%")
                 .style("display","inline-block")

               var diff = d3_updateable(row,".diff","div")
                 .classed("diff",true)
                 .style("width","15%")
                 .style("display","inline-block")
                 .style("vertical-align","top")
                 .text(function(x) {return d3.format("%")((x.percent_norm-x.pop_percent)/x.pop_percent) })

               var plus = d3_updateable(row,".plus","a")
                 .classed("plus",true)
                 .style("width","5%")
                 .style("display","inline-block")
                 .style("font-weight","bold")
                 .style("vertical-align","top")
                 .text("+")
                 .on("click",function(x) {

                   var d3_this = d3.select(this)
                   var d3_parent = d3.select(this.parentNode)
                   var target = d3_parent.selectAll(".expanded")

                   if (target.classed("hidden")) {
                     d3_this.html("&ndash;")
                     target.classed("hidden", false)

                     d3_splat(target,".row","div",x.urls.filter(function(x){
                         var sp = x.replace("http://","")
                           .replace("https://","")
                           .replace("www.","")
                           .split("/");

                         if ((sp.length > 1) && (sp.slice(1).join("/").length > 7)) return true


                         return false
                       }).slice(0,10))
                       .classed("row",true)
                       .style("overflow","hidden")
                       .style("height","30px")
                       .style("line-height","30px")
                       .text(String)

                     return x
                   }
                   d3_this.html("+")
                   target.classed("hidden",true).html("")
                 })
                  

               var expanded = d3_updateable(row,".expanded","div")
                 .classed("expanded hidden",true)
                 .style("width","100%")
                 .style("vertical-align","top")
                 .style("padding-right","30px")
                 .style("padding-left","10px")
                 .style("margin-left","10px")
                 .style("margin-bottom","30px")
                 .style("border-left","1px solid grey")





               var svg = d3_updateable(bullet,"svg","svg")
                 .attr("width",width)
                 .attr("height",height)

    
               d3_updateable(svg,".bar","rect")
                 .attr("x",0)
                 .attr("width", function(d) {return x(d.pop_percent) })
                 .attr("height", height)
                 .attr("fill","#888")

               d3_updateable(svg,".bar","rect")
                 .attr("x",0)
                 .attr("y",height/4)
                 .attr("width", function(d) {return x(d.percent_norm) })
                 .attr("height", height/2)
                 .attr("fill","rgb(8, 29, 88)")


             })
           }

           t.draw()
         }

         draw()      
       }
     , render_center: function() {
         this._center = d3_updateable(this._target,".center","div")
           .classed("center col-md-6",true)

         var current =  this._center
           , _top = topSection(current)
           , _lower = remainingSection(current)

         var head = d3_updateable(_top, "h3","h3")
           .style("margin-bottom","15px")
           .style("margin-top","-5px")
           .text("Filter off-site activity")

         



         //time_selector(_top)
         //  .data(transform.buildTimes(this._data))
         //  .draw()

         var self = this
           , data = self._data;

         this.render_filter(_top,_lower)
         this.render_view(_lower,this._data)

       }
     , render_filter: render_filter
     , render_center_loading: function() {
         this._center = d3_updateable(this._target,".center","div")
           .classed("center col-md-6",true)

         this._center.html("")

         d3_updateable(this._center,"center","center")
           .style("text-align","center")
           .style("display","block")
           .classed("loading",true)
           .text("Loading...")


       }
     , render_right: function(data) {

         var self = this
           , data = data || this._data

         this._right = d3_updateable(this._target,".right","div")
           .classed("right col-md-3",true)

         var current = this._right
           , _top = topSection(current)
           , _lower = remainingSection(current)

         summary_box(_top)
           .data(buildOffsiteSummary(data))
           .draw()

         this._data.display_categories = data.display_categories || buildCategories(data)

         bar_selector(_lower)
           .skip_check(true)
           .data(data.display_categories)
           .on("click",function(x) {
             x.selected = !x.selected
             self.draw() 
           })
           .draw()
         

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

   function schedule_report(x) {

               var ss = share(d3.select("body"))
                 .draw()

               ss.inner(function(target) {

                 var self = this;

                   var header = d3_updateable(target,".header","h4")
                     .classed("header",true)
                     .style("text-align","center")
                     .style("text-transform","uppercase")
                     .style("font-family","ProximaNova, sans-serif")
                     .style("font-size","12px")
                     .style("font-weight","bold")
                     .style("padding-top","30px")
                     .style("padding-bottom","30px")
                     .text("Schedule search results:")

                   var email_form = d3_updateable(target,"div","div")
                     .style("text-align","center")

                   var to = d3_updateable(email_form, ".to", "div")
                     .classed("to",true)
                   
                   d3_updateable(to,".label","div")
                     .style("width","100px")
                     .style("display","inline-block")
                     .style("text-transform","uppercase")
                     .style("font-family","ProximaNova, sans-serif")
                     .style("font-size","12px")
                     .style("font-weight","bold")
                     .style("text-align","left")
                     .text("To:")

                   var to_input = d3_updateable(to,"input","input")
                     .style("width","300px")
                     .attr("placeholder","elonmusk@example.com")

                   var name = d3_updateable(email_form, ".name", "div")
                     .classed("name",true)
                   
                   d3_updateable(name,".label","div")
                     .style("width","100px")
                     .style("display","inline-block")
                     .style("text-transform","uppercase")
                     .style("font-family","ProximaNova, sans-serif")
                     .style("font-size","12px")
                     .style("font-weight","bold")
                     .style("text-align","left")
                     .text("Report Name:")

                   var name_input = d3_updateable(name,"input","input")
                     .style("width","300px")
                     .attr("placeholder","My awesome search")


                   var schedule = d3_updateable(email_form, ".schedule", "div")
                     .classed("schedule",true)


                   d3_updateable(schedule,".label","div")
                     .style("width","100px")
                     .style("display","inline-block")
                     .style("text-transform","uppercase")
                     .style("font-family","ProximaNova, sans-serif")
                     .style("font-size","12px")
                     .style("font-weight","bold")
                     .style("text-align","left")
                     .text("Schedule:")

                   var schedule_input = d3_updateable(schedule,"select","select",["Mon","Tues","Wed","Thurs","Fri","Sat","Sun"])
                     .style("width","300px")
                     .attr("multiple",true)

                   d3_splat(schedule_input,"option","option")
                     .text(String)

                   var time = d3_updateable(email_form, ".time", "div")
                     .classed("time",true)


                   d3_updateable(time,".label","div")
                     .style("width","100px")
                     .style("display","inline-block")
                     .style("text-transform","uppercase")
                     .style("font-family","ProximaNova, sans-serif")
                     .style("font-size","12px")
                     .style("font-weight","bold")
                     .style("text-align","left")
                     .text("Time:")

                   var time_input = d3_updateable(time,"select","select",d3.range(0,23).map(function(x) { return (x%12 + 1) + (x +1 > 11 ? " pm" : " am") }) )
                     .style("width","300px")

                   d3_splat(time_input,"option","option")
                     .attr("selected",function(x) { return x == "12 pm" ? "selected" : undefined })
                     .text(String)


                   var send = d3_updateable(email_form, ".send", "div")
                     .classed("send",true)
                     .style("text-align","center")

                   var data = x;

                   d3_updateable(send,"button","button")
                     .style("line-height","16px")
                     .style("margin-top","10px")
                     .text("Send")
                     .on("click",function(x) {
                       var email = to_input.property("value")
                         , name = name_input.property("value") 
                         , time = time_input.property("value")
                         , days = d3.selectAll(schedule_input.node().selectedOptions).data().join(",")

                       var URLS = [
                           "/crusher/funnel/action?format=json" 
                         , "/crusher/v2/visitor/domains_full_time_minute/cache?format=json&top=20000&url_pattern=" + data.url_pattern[0] + "&filter_id=" + data.action_id
                         , "/crusher/pattern_search/timeseries_only?search=" + data.url_pattern[0] 
                         , location.pathname + decodeURIComponent(location.search)
                       ]

                       d3.xhr("/share")
                         .post(JSON.stringify({
                               "email": email
                             , "name": name
                             , "days": days
                             , "time": time
                             , "urls": URLS
                           })
                         )

                       self.hide()

                     })
                     .text("Schedule")


               })



   }

   function share_search(x) {
       var x = x
       var ss = share(d3.select("body"))
         .draw()

       ss.inner(function(target) {

         var self = this;

           var header = d3_updateable(target,".header","h4")
             .classed("header",true)
             .style("text-align","center")
             .style("text-transform","uppercase")
             .style("font-family","ProximaNova, sans-serif")
             .style("font-size","12px")
             .style("font-weight","bold")
             .style("padding-top","30px")
             .style("padding-bottom","30px")
             .text("Share search results via:")

           var email_form = d3_updateable(target,".email-share-form","div")
             .classed("email-share-form hidden",true)
             .style("text-align","center")

           var to = d3_updateable(email_form, ".to", "div")
             .classed("to",true)
           
           d3_updateable(to,".label","div")
             .style("width","100px")
             .style("display","inline-block")
             .style("text-transform","uppercase")
             .style("font-family","ProximaNova, sans-serif")
             .style("font-size","12px")
             .style("font-weight","bold")
             .style("text-align","left")
             .text("To:")

           var to_input = d3_updateable(to,"input","input")
             .style("width","300px")
             .attr("placeholder","elonmusk@example.com")

           var name = d3_updateable(email_form, ".name", "div")
             .classed("name",true)
           
           d3_updateable(name,".label","div")
             .style("width","100px")
             .style("display","inline-block")
             .style("text-transform","uppercase")
             .style("font-family","ProximaNova, sans-serif")
             .style("font-size","12px")
             .style("font-weight","bold")
             .style("text-align","left")
             .text("Report Name:")

           var name_input = d3_updateable(name,"input","input")
             .style("width","300px")
             .attr("placeholder","My awesome search")



           


           var message = d3_updateable(email_form, ".message", "div")
             .classed("message",true)
           
           d3_updateable(message,".label","div")
             .style("display","inline-block")
             .style("width","100px")
             .style("text-transform","uppercase")
             .style("font-family","ProximaNova, sans-serif")
             .style("font-size","12px")
             .style("font-weight","bold")
             .style("text-align","left")
             .text("Message:")

           var message_input = d3_updateable(message,"textarea","textarea")
             .style("width","300px")
             .style("height","100px")
             .style("border","1px solid #ccc")
             .attr("placeholder","Hey Elon - Thought you might be interested in this...")


           var send = d3_updateable(email_form, ".send", "div")
             .classed("send",true)
             .style("text-align","center")

           var data = x;

           d3_updateable(send,"button","button")
             .style("line-height","16px")
             .style("margin-top","10px")
             .text("Send")
             .on("click",function(x) {
               console.log(message_input.value, to_input.value)
               var msg = message_input.property("value")
                 , email = to_input.property("value")
                 , name = name_input.property("value")


               var URLS = [
                   "/crusher/funnel/action?format=json" 
                 , "/crusher/v2/visitor/domains_full_time_minute/cache?format=json&top=20000&url_pattern=" + data.url_pattern[0] + "&filter_id=" + data.action_id
                 , "/crusher/pattern_search/timeseries_only?search=" + data.url_pattern[0] 
                 , location.pathname + decodeURIComponent(location.search)
               ]

               d3.xhr("/share")
                 .post(JSON.stringify({
                       "email": email
                     , "msg": msg
                     , "name": name
                     , "urls": URLS
                   })
                 )

               self.hide()

             })


      
           

           var slack_form = d3_updateable(target,".slack-share-form","div")
             .classed("slack-share-form hidden",true)
             .style("text-align","center")
             .text("Slack integration coming soon...")


           var email = d3_updateable(target,".email-wrap","div")
             .classed("btn-wrap email-wrap col-md-6",true)
             .style("text-align","center")

           d3_updateable(email,"a","a")
             .attr("style","text-transform: uppercase; font-weight: bold; line-height: 24px; padding: 10px; width: 180px; text-align: center; border-radius: 10px; border: 1px solid rgb(204, 204, 204); margin: auto auto 10px; cursor: pointer; display: block;")
             .text("email")
             .on("click",function() {
               header.text("Share results via email")
               target.selectAll(".btn-wrap").classed("hidden",true)
               email_form.classed("hidden",false)

             })


           var slack = d3_updateable(target,".slack-wrap","div")
             .classed("btn-wrap slack-wrap col-md-6",true)
             .style("text-align","center")

           d3_updateable(slack,"a","a")
             .attr("style","text-transform: uppercase; font-weight: bold; line-height: 24px; padding: 10px; width: 180px; text-align: center; border-radius: 10px; border: 1px solid rgb(204, 204, 204); margin: auto auto 10px; cursor: pointer; display: block;")
             .text("slack")
             .on("click",function() {
               target.selectAll(".btn-wrap").classed("hidden",true)
               slack_form.classed("hidden",false)

             })







         })
   }

   function render_rhs(data) {

         var self = this
           , data = data || this._data

         this._right = d3_updateable(this._target,".right","div")
           .classed("right col-md-3",true)

         var current = this._right
           , _top = topSection(current)
           , _lower = remainingSection(current)

         var head = d3_updateable(_top, "h3","h3")
           .style("margin-bottom","15px")
           .style("margin-top","-5px")
           .text("")

         _top.classed("affix",true)
           .style("right","0px")
           .style("width","inherit")


         

         var funcs = {
             "Build Media Plan": function(x) {
               document.location = "/crusher/media_plan"
             }
           , "Share Search": share_search
           , "Schedule Report": schedule_report
         }

         //var f = d3_splat(_top,".subtitle-filter","a",["Save Results","Share Results","Schedule Results","Build Content Brief","Build Media Plan" ])

         var f = d3_splat(_top,".subtitle-filter","a",["Share Search","Schedule Report", "", "Build Media Plan"])
           .classed("subtitle-filter",true)
           .style("text-transform","uppercase")
           .style("font-weight","bold")
           .style("line-height", "24px")
           .style("padding","16px")
           .style("width"," 180px")
           .style("text-align"," center")
           .style("border-radius"," 10px")
           .style("border",function(x) { return x == "" ? "none" : "1px solid #ccc" } )
           .style("padding"," 10px")
           .style("margin"," auto")
           .style("margin-bottom","10px")
           .style("cursor","pointer")
           .style("display","block")
           .text(String)
           .on("click", function(x) {
             funcs[x].bind(self)(self._data)
           })

        

         this._data.display_categories = data.display_categories || buildCategories(data)


       }

   function prepData() {
     return p.apply(this, arguments)
   };

   var EXAMPLE_DATA$4 = {
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
     this._data = EXAMPLE_DATA$4
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
           .datum(this._data)

         var wrapper = d3_updateable(desc,".w","div")
           .classed("w",true)
           .style("height","100%")

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

   function buildSummaryData$1(data) {
         var reduced = data.full_urls.reduce(function(p,c) {
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

   function buildSummaryAggregation$1(samp,pop) {
         var data_summary = {}
         Object.keys(samp).map(function(k) {
           data_summary[k] = {
               sample: samp[k]
             , population: pop[k]
           }
         })

         return data_summary
     
   }

   var drawPie = function(data,radius,target) {

     var d = d3.entries({
         sample: data.sample
       , population: data.population - data.sample
     })
     
     var color = d3.scale.ordinal()
         .range(["#98abc5", "#8a89a6", "#7b6888", "#6b486b", "#a05d56", "#d0743c", "#ff8c00"]);
     
     var arc = d3.svg.arc()
         .outerRadius(radius - 10)
         .innerRadius(0);
     
     var pie = d3.layout.pie()
         .sort(null)
         .value(function(d) { return d.value; });
     
     var svg = d3_updateable(target,"svg","svg",false,function(x){return 1})
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

   var buildSummaryBlock = function(radius_scale,x) {
     var data = this.parentNode.__data__[x.key]
       , dthis = d3.select(this)

     drawPie(data,radius_scale(data.population),dthis)

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


   function render_summary(_top,data) {

     var CSS_STRING = String(function() {/*
   .search-summary { padding-left:10px; padding-right:10px }
   .search-summary .table-wrapper { background:#e3ebf0; padding-top:5px; padding-bottom:10px }
   .search-summary .table-wrapper tr { border-bottom:none }
   .search-summary .table-wrapper thead tr { background:none }
   .search-summary .table-wrapper tbody tr:hover { background:none }
   .search-summary .table-wrapper tr td { border-right:1px dotted #ccc;text-align:center } 
   .search-summary .table-wrapper tr td:last-of-type { border-right:none } 
     */})

     d3_updateable(d3.select("head"),"style#custom-table-css","style")
       .attr("id","custom-table-css")
       .text(CSS_STRING.replace("function () {/*","").replace("*/}",""))



     var head = d3_updateable(_top, "h3.summary-head","h3")
       .classed("summary-head",true)
       .style("margin-bottom","15px")
       .style("margin-top","-5px")
       .text("")

     var summary = d3_updateable(_top,".search-summary","div",false, function(x) { return 1})
       .classed("search-summary",true)
       .style("min-height","145px")

     var reduced = buildSummaryData$1(data)
     this._reduced = this._reduced ? this._reduced : buildSummaryData$1(this._data)
     this._timeseries = this._timeseries ? this._timeseries : prepData(this._data.full_urls)


     var data_summary = buildSummaryAggregation$1(reduced,this._reduced)

     var draw_summary = function() {

       summary.html("")

       var radius_scale = d3.scale.linear()
         .domain([data_summary.domains.population,data_summary.views.population])
         .range([20,35])
     
       table.table(summary)
         .data({"key":"T","values":[data_summary]})
         .skip_option(true)
         .render("domains",function(x) { buildSummaryBlock.bind(this)(radius_scale,x) })
         .render("articles",function(x) { buildSummaryBlock.bind(this)(radius_scale,x) })
         .render("sessions",function(x) { buildSummaryBlock.bind(this)(radius_scale,x) })
         .render("views",function(x) { buildSummaryBlock.bind(this)(radius_scale,x) })
         .draw()

     }

     var ts = this._timeseries

     var tabs = [
         {"key":"Summary", "values": data_summary, "draw":draw_summary}
       , {"key": "Timing Overview", "values":[], "draw":function(d) {
         var prepped = prepData(d.full_urls)

         summary.html("")



         var w = d3_updateable(summary,"div.timeseries","div")
           .classed("timeseries",true)
           .style("width","60%")
           .style("display","inline-block")
           .style("background-color", "#e3ebf0")
           .style("padding-left", "10px")
           .style("height","127px")



         var q = d3_updateable(summary,"div.timeseries-details","div")
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



         var mappedts = prepped.reduce(function(p,c) { p[c.key] = c; return p}, {})

         var prepped = ts.map(function(x) {
           return {
               key: x.key
             , hour: x.hour
             , minute: x.minute
             , value2: x.value
             , value: mappedts[x.key] ?  mappedts[x.key].value : 0
           }
         })




         timeseries['default'](w)
           .data({"key":"y","values":prepped})
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
               .each(function(z) { buildSummaryBlock.bind(this)(function() { return 35 }, x) })
           })
           .draw()



         
   }}
     ]  

     if ((tabs[0].selected == undefined) && (!this._state.get("summary")))  this._state.set("summary",[1,0]) 

     this._state.get("summary").map(function(x,i) { tabs[i].selected = x })

     d3_updateable(head,"span","span")
       .text(tabs.filter(function(x){ return x.selected})[0].key)

     var self = this

     var select = d3_updateable(head,"select","select")
       .style("width","19px")
       .style("margin-left","12px")
       .on("change", function(x) {
         tabs.map(function(y) { y.selected = 0 })

         this.selectedOptions[0].__data__.selected = 1
         self._state.set("summary", tabs.map(function(y) {return y.selected }) )
         head.selectAll("span").text(this.selectedOptions[0].__data__.key)
         this.selectedOptions[0].__data__.draw(data)

         //draw()
       })
     
     d3_splat(select,"option","option",tabs,function(x) {return x.key})
       .text(function(x){ return x.key })
       .style("color","#888")
       .style("min-width","100px")
       .style("text-align","center")
       .style("display","inline-block")
       .style("padding","5px")
       .style("border",function(x) {return x.selected ? "1px solid #888" : undefined})
       .style("opacity",function(x){ return x.selected ? 1 : .5})


     tabs.filter(function(x) {
       return x.selected
     }).pop().draw(data)

     


   }

   function Select(target) {
     this._on = {}
     this.target = target
   }

   function noop$10() {}
   function identity$8(x) { return x }
   function key$8(x) { return x.key }


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

         this._options = d3_splat(this._select,"option","option",identity$8,key$8)
           .text(key$8)

         return this
       }
     , on: function(action, fn) {
         if (fn === undefined) return this._on[action] || noop$10;
         this._on[action] = fn;
         return this
       }
   }

   function noop$2() {}
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

         return this
       }
     , on: function(action, fn) {
         if (fn === undefined) return this._on[action] || noop$2;
         this._on[action] = fn;
         return this
       }
   }

   function noop$9() {}
   function identity$7(x) { return x }
   function key$7(x) { return x.key }

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
         if (fn === undefined) return this._on[action] || noop$9;
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
     
       d3_splat(button_row,".show-button","a",identity$7, key$7)
         .classed("show-button",true)
         .classed("selected", function(x) { return x.selected })
         .text(key$7)
         .on("click", function(x) { bound(x) })

       return this
     
       }
     
   }

   function noop$8() {}
   function identity$6(x) { return x }
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
         if (fn === undefined) return this._on[action] || noop$8;
         this._on[action] = fn;
         return this
       }
     , draw: function () {

         var classes = this.classed()

         var wrap = d3_updateable(this.target,".conditional-wrap","div",this.data())
           .classed("conditional-wrap",true)

         var objects = d3_splat(wrap,".conditional","div",identity$6, function(x,i) { return i })
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

   function noop$11() {}


   function DomainExpanded(target) {
     this._on = {}
     this.target = target
   }

   function domain_expanded(target) {
     return new DomainExpanded(target)
   }

   DomainExpanded.prototype = {
       data: function(val) {
         return accessor.bind(this)("data",val) 
       }
     , urls: function(val) {
         return accessor.bind(this)("urls",val) 
       }
     , draw: function() {

         var timing = d3_updateable(this.target,"div.timing","div",this.data())
           .classed("timing",true)
           .style("height","60px")
           .style("width","60%")
           .style("text-transform","uppercase")
           .style("font-weight","bold")
           .style("font-size",".9em")
           .style("margin-bottom","45px")
           .style("line-height","35px")
           .style("display","inline-block")
           .text("Articles Accessed")

         var details = d3_updateable(this.target,"div.details","div")
           .classed("details",true)
           .style("width","40%")
           .style("display","inline-block")
           .style("vertical-align","top")

         d3_updateable(details,"span","span")
           .style("text-transform","uppercase")
           .style("font-weight","bold")
           .style("font-size",".9em")
           .style("margin-bottom","10px")
           .style("line-height","35px")
           .text("Details")

         var articles = d3_updateable(this.target,"div.articles","div")
           .classed("articles",true)

         d3_updateable(articles,"span","span")
           .style("text-transform","uppercase")
           .style("font-weight","bold")
           .style("font-size",".9em")
           .style("margin-bottom","10px")
           .style("line-height","35px")
           .text("Top articles")
           
         var drawArticles = function(urls) {

           var a = d3_splat(articles,"div","div",urls)
             .text(String)
             .exit().remove()

         }

         var drawDetails = function(x) {

           var time = d3_updateable(details,".time","div",x)
             .classed("time",true)
             .text("Time: " + x.hour + ":" + (x.minute.length == 1 ? "0" + x.minute : x.minute ) )

           var button = d3_updateable(details,".button","a",false,function() { return 1})
             .classed("button",true)
             .style("padding","5px")
             .style("border-radius","5px")
             .style("border","1px solid #ccc")
             .style("margin","auto")
             .style("margin-top","10px")
             .style("display","block")
             .style("width","50px")
             .style("text-align","center")
             .text("Reset")
             .on("click",reset)

         }

         var reset = function() {
           details.selectAll(".time").remove()
           details.selectAll(".button").remove()

           drawArticles(this._urls.slice(0,10))
         }.bind(this)

         reset() 

         time_series(timing)
           .data({"key":"y","values":timing.data()[0]})
           .on("hover",function(x) {
             drawArticles(Object.keys(x.articles).slice(0,10))
             drawDetails(x)

           })
           .draw()

         return this
       }
     , on: function(action, fn) {
         if (fn === undefined) return this._on[action] || noop$11;
         this._on[action] = fn;
         return this
       }
   }

   function DomainBullet(target) {
     this._on = {}
     this.target = target
   }

   function noop$12() {}
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
         if (fn === undefined) return this._on[action] || noop$12;
         this._on[action] = fn;
         return this
       }
   }

   function noop$5() {}
   function DomainView(target) {
     this._on = {
       select: noop$5
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
             , {key:"value",value:"Sample versus Pop",locked:true}
             , {key:"count",value:"Views",selected:false}

           ])
           .option_text("&#65291;")
           .on("expand",function(d) {

             d3.select(this).selectAll("td.option-header").html("&ndash;")
             if (d3.select(this.nextSibling).classed("expanded") == true) {
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
               .data(rolled)
               .urls(d.urls)
               .draw()

           })
           .hidden_fields(["urls","percent_unique","sample_percent_norm"])
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
         if (fn === undefined) return this._on[action] || noop$5;
         this._on[action] = fn;
         return this
       }
   }

   function render_data_view(_lower,data) {

         // ----- BEGIN STATE STUFF ----- //

         var SELECTION_STATES = [
               {"key":"Explore data","value":"data-view"}
             , {"key":"Create Media Plan", "value":"media-view"}
             , {"key":"Build Content Brief", "value":"content-view"}
           ]

         var view = this._state.get("view",false)

         var set_state = function(x) { 
           this._state.set("view",x) 
           SELECTION_STATES.map(function(d) { 
             d.selected = (x == d.value)
           })
         }.bind(this)

         var self = this

         SELECTION_STATES.map(function(x) { 
           x.selected = (x.value == view)

           if (x.value == "data-view") {
             x.data = [
                 buildDomains(data)
               , buildUrls(data)
               , buildTopics(data)
             ]

             var tabs = x.data
             self._state.get("tabs",[]).map(function(x,i) { tabs[i].selected = x })

             if ((tabs[0].selected == undefined) && (!self._state.get("tabs")))  self._state.set("tabs",[1,0]) 
           }

           if (x.value == "media-view") {
             x.data = data
           }

         })

         // ----- END STATE STUFF ----- //

         button_radio(_lower)
           .on("click", function(x) {
             set_state(x.value)
             
             show()
           })
           .data(SELECTION_STATES)
           .draw()



         var show = function() {

           return conditional_show(_lower)
             .data(SELECTION_STATES)
             .classed("view-option",true)
             .draw()
         }

         var conditional = show()

         conditional.each(function(x) {
           if (x.value == "data-view") {

             var dv = domain_view(d3.select(this))
               .options(x.data)
               .data(data)
               .on("select", function(d) {

                 x.data.map(function(q) { 
                   if (q.key == d.key) return q.selected = 1
                   q.selected = 0 
                 })

                 dv.draw()
               })
               .draw()
            
           }

           if (x.value == "media-view") {
             media_plan.media_plan(d3.select(this))
              .data(data)
              .draw()
           }
         })
         
       }

   function render_lhs() {

         var self = this

         this._lhs = d3_updateable(this._target,".lhs","div")
           .classed("lhs col-md-2",true)
           .style("border-right","1px solid #ccc")

         var current = this._lhs
           //, _top = ui_helper.topSection(current)
           , _lower = remainingSection(current)

         //summary_box(_top)
         //  .data(transform.buildOnsiteSummary(this._data))
         //  .draw()

         this._data.display_actions = this._data.display_actions || buildActions(this._data)
         _lower.classed("affix",true)
           .style("min-width","200px")

         bar_selector(_lower)
           .type("radio")
           .data(this._data.display_actions)
           .on("click",function(x) {
             var t = this;
             self._state.set("action_name",x.key)
             _lower.selectAll("input")
               .attr("checked",function() {
                 this.checked = (t == this)
                 return undefined
               })

             //self._data.display_actions.values.map(function(v) {
             //  v.selected = 0
             //  if (v == x) v.selected = 1
             //})
             self.draw_loading()

             self.on("select")(x)
           })
           .draw()

       }

   function FilterDashboard(target) {
     this._on = {}
     this._state = state()

     this._target = target
       .append("ul")
       .classed("vendors-list",true)
         .append("li")
         .classed("vendors-list-item",true);
   }

   function filter_dashboard(target) {
     return new FilterDashboard(target)
   }

   FilterDashboard.prototype = {
       data: function(val) { return accessor.bind(this)("data",val) }
     , actions: function(val) { return accessor.bind(this)("actions",val) }
     , draw: function() {
         this._target
         this._categories = {}
         this.render_wrappers()
         this._target.selectAll(".loading").remove()
         this.render_lhs()
         this.render_right()

         this.render_center()

       }
     , on: function(action, fn) {
         if (fn === undefined) return this._on[action];
         this._on[action] = fn;
         return this
       }
     , draw_loading: function() {
         this.render_wrappers()
         this.render_center_loading()
         return this
       }
     , render_wrappers: function() {

         this._center = d3_updateable(this._target,".center","div")
           .classed("center",true)
           .style("float","none")
           .style("margin","auto")

       }
     , render_center: function() {

         var self = this;

         var CSS_STRING = String(function() {/*
       .header-buttons a span.hover-show { display:none }
       .header-buttons a:hover span.hover-show { display:inline; padding-left:3px }
         */})
       
         d3_updateable(d3.select("head"),"style#header-css","style")
           .attr("id","header-css")
           .text(CSS_STRING.replace("function () {/*","").replace("*/}",""))



         this._center = d3_updateable(this._target,".center","div")
           .classed("center",true)

         var current =  this._center
           , _top = topSection(current)
           , _lower = remainingSection(current)


         var head = d3_updateable(_top, "h3.buttons","h3")
           .classed("buttons",true)
           .style("margin-bottom","15px")
           .style("margin-top","-5px")

         var title = d3_updateable(head,"span.title","span")
           .classed("title",true)

         var body = d3_updateable(head,"div.body","div")
           .style("font-size","13px")
           .style("text-transform","none")
           .style("color","#333")
           .style("font-weight","normal")
           .style("margin-left","175px")
           .style("padding","25px")
           .style("margin-bottom","25px")
           .style("margin-right","175px")
           .style("background-color","white")
           .classed("body hidden",true)



         d3_updateable(_top, "h3.filter","h3")
           .classed("filter",true)
           .style("margin-bottom","15px")
           .style("margin-top","-5px")
           .text("Filter activity")


         var right_pull = d3_updateable(head,".pull-right","span")
           .classed("pull-right header-buttons", true)
           .style("margin-right","17px")
           .style("line-height","22px")
           .style("text-decoration","none !important")

         d3_updateable(right_pull,".saved-search","a")
           .classed("saved-search",true)
           .style("vertical-align","middle")
           .style("font-size","12px")
           .style("font-weight","bold")
           .style("border-right","1px solid #ccc")
           .style("padding-right","10px")
           .style("display","inline-block")
           .style("line-height","22px")
           .style("text-decoration","none")
           .html("<span class='fa-folder-open-o fa'></span><span style='padding-left:3px'>Open Saved</span>")
           .on("click",function() {
             self.render_saved(_top,_lower)
             var w = _top.selectAll(".filter-wrapper")
             //w.classed("hidden",function(x) { return !w.classed("hidden") })

           })

         d3_updateable(right_pull,".new-saved-search","a")
           .classed("new-saved-search",true)
           .style("font-size","12px")
           .style("font-weight","bold")
           .style("padding-left","10px")
           .style("border-right","1px solid #ccc")
           .style("padding-right","10px")
           .style("display","inline-block")
           .style("line-height","22px")
           .style("text-decoration","none")
           .html("<span class='fa-bookmark fa'></span><span class='hover-show'>Save</span>")

           .on("click",function() {
             //self.render_saved(_top,_lower)
             var w = _top.selectAll(".save-subtitle-filter")
             w.classed("hidden",function(x) { return !w.classed("hidden") })
             
           })

         d3_updateable(right_pull,".share","a")
           .datum(this._data)
           .classed("share",true)
           .style("font-size","12px")
           .style("font-weight","bold")
           .style("padding-left","10px")
           .style("border-right","1px solid #ccc")
           .style("padding-right","10px")
           .style("display","inline-block")
           .style("line-height","22px")
           .style("text-decoration","none")
           .html("<span class='fa-paper-plane fa'></span><span class='hover-show'>Share</span>")
           .on("click",share_search)


         d3_updateable(right_pull,".schedule","a")
           .datum(this._data)
           .classed("schedule",true)
           .style("font-size","12px")
           .style("font-weight","bold")
           .style("padding-left","10px")
           .style("border-right","1px solid #ccc")
           .style("padding-right","10px")
           .style("display","inline-block")
           .style("line-height","22px")
           .style("text-decoration","none")
           .html("<span class='fa-calendar fa'></span><span class='hover-show'>Schedule</span>")
           .on("click",schedule_report)

         d3_updateable(right_pull,".help","a")
           .datum(this._data)
           .classed("help",true)
           .style("font-size","12px")
           .style("font-weight","bold")
           .style("padding-left","10px")
           .style("padding-right","10px")
           .style("display","inline-block")
           .style("line-height","22px")
           .style("text-decoration","none")
           .html("<span class='fa-question-circle fa'></span><span class='hover-show'>Help</span>")
           .on("click",function() {
             //title.text("What is Hindsight?")
             body.classed("hidden",false).html(
               "<h3 style='text-align:center;margin-bottom:15px;color:#333'>What is Hindsight?</h3>" +
               "Hindsight lets you see what <b>your users</b> are doing when they are not on your website. Hindsight lets you build custom audience segmentation using this offsite activity to inform how you can:<br><br><ul>" + 
               "<li> build a <b>media plan</b> that matches the behavior of your audience</li>" +
               "<li> generate a <b>content brief</b> to inform your content marketing</li>" +
               "<li> <b>optimize your site</b> so that it matches the behavior and interests of your audience</li>" + 
               "</ul>"
             )
             
             var confirm_row = d3_updateable(body,".confirm-row","div")
               .classed("confirm-row",true)
               .style("text-align","center")
               .style("margin-top","25px")

             d3_updateable(confirm_row,"a","a")
               .attr("style","font-size:11px;text-transform:uppercase;font-weight:bold;text-align:center;padding:15px;padding-top:10px;padding-bottom:10px;border-radius:10px;border:1px solid #ccc")
               .text("Got it!")
               .on("click",function() { body.classed("hidden",true) })

           })








         this.render_saved(_top,_lower)
         this.render_filter(_top,_lower)

         //this.render_view(_lower,this._data)

       }
     , render_saved: function(_top,_lower) {

         var self = this;

         var saved = d3_updateable(_top,".saved","div")
           .classed("saved",true)
           .classed("hidden",function() { return !d3.select(this).classed("hidden") })
           .style("padding-left","10px")

         var saved_searches = JSON.parse(localStorage.getItem("search.saved")) || []

         var saved_items = d3_splat(saved,".item","a",saved_searches,function(x) { return x.key })
           .style("display","block")
           .style("font-weight","bold")
           .style("margin-left","auto")
           .style("width","240px")
           .classed("item",true)
           .style("line-height","24px")
           .text(function(x) {return x.key})
           .on("click", function(x) {
             self._state.set("filter",x.values)
             self.render_saved(_top,_lower)
             self.render_filter(_top,_lower)
           })

       }
     , render_center_loading: function() {
         this._center = d3_updateable(this._target,".center","div")
           .classed("center col-md-9",true)

         this._center.html("")

         d3_updateable(this._center,"center","center")
           .style("text-align","center")
           .style("display","block")
           .classed("loading",true)
           .text("Loading...")

       }
     , render_lhs: render_lhs
     , render_view: render_data_view
     , render_summary: render_summary
     , render_filter: render_filter
     , render_right: render_rhs
   }

   function noop$3() {}
   function FilterView(target) {
     this._on = {
       select: noop$3
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

         return this
       }
     , on: function(action, fn) {
         if (fn === undefined) return this._on[action] || noop$3;
         this._on[action] = fn;
         return this
       }
   }

   function noop$4() {}
   function OptionView(target) {
     this._on = {
       select: noop$4
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
         if (fn === undefined) return this._on[action] || noop$4;
         this._on[action] = fn;
         return this
       }
   }

   function noop$6() {}
   function SegmentView(target) {
     this._on = {
       select: noop$6
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

         header(wrap).text("Segment").draw()      

         var body = d3_updateable(wrap,".body","div")
           .classed("body",true)
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
           .text("Choose Base")
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


   d3_updateable(inner,"div.color","div")
     .classed("color",true)
     .style("background-color","#081d58")
     .style("width","10px")
     .style("height","32px")
     .style("margin-top","2px")
     .style("margin-right","10px")
     .style("margin-left","-10px")






         select(inner)
           .options(this._segments)
           .on("select", this.on("change") )
           .draw()


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

         d3_updateable(inner_desc,"h3","h3")
           .text("(Filters applied to this segment)")
           .style("margin","10px")
           .style("color","inherit")
           .style("font-size","inherit")
           .style("font-weight","bold")
           .style("text-transform","uppercase")
           .style("flex","1")





         d3_updateable(inner2,"h3","h3")
           .text("Compare To")
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


   d3_updateable(inner2,"div.color","div")
     .classed("color",true)
     .style("background-color","grey")
     .style("width","10px")
     .style("height","32px")
     .style("margin-top","2px")
     .style("margin-right","10px")
     .style("margin-left","-10px")









         select(inner2)
           .options(this._segments)
           .on("select", this.on("comparison.change") )
           .draw()


         return this
       }
     , on: function(action, fn) {
         if (fn === undefined) return this._on[action] || noop$6;
         this._on[action] = fn;
         return this
       }
   }

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

   function noop$7() {}
   function SummaryView(target) {
     this._on = {
       select: noop$7
     }
     this.target = target
   }



   function buildSummaryBlock$1(data, target, radius_scale, x) {
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

   function drawCategory(target,data) {

     var w = d3_updateable(target,"div.category","div",false,function() { return 1})
       .classed("category",true)
       .style("width","50%")
       .style("display","inline-block")
       .style("background-color", "#e3ebf0")
       .style("padding-left", "10px")
       .style("min-height","325px")


     d3_updateable(w,"h3","h3")
       .text("Categories visited for filtered versus all views")
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

     var wrap = d3_updateable(w,".svg-wrap","div",data,function(x) { return 1 })
       .classed("svg-wrap",true)

     var categories = data.map(function(x) { return x.key })

     var max = d3.max(data,function(x) { return x.pop })
     var sampmax = d3.max(data,function(x) { return x.samp })


     var xsampscale = d3.scale.linear()
       .domain([0,sampmax])
       .range([0,300]);



     var xscale = d3.scale.linear()
       .domain([0,max])
       .range([0,300]);

     var height = 20

     var yscale = d3.scale.linear()
       .domain([0,categories.length])
       .range([0,categories.length*height]);

     var canvas = d3_updateable(wrap,"svg","svg",false,function() { return 1})
       .attr({'width':450,'height':categories.length*height + 30});

     var xAxis = d3.svg.axis();
     xAxis
       .orient('bottom')
       .scale(xscale)

     //  .tickValues(tickVals);

     var yAxis = d3.svg.axis();
     yAxis
       .orient('left')
       .scale(yscale)
       .tickSize(2)
       .tickFormat(function(d,i){ return categories[i]; })
       .tickValues(d3.range(categories.length));

     var y_xis = d3_updateable(canvas,'g.y','g')
       .attr("class","y axis")
       .attr("transform", "translate(150,15)")
       .attr('id','yaxis')
       .call(yAxis);

     var x_xis = d3_updateable(canvas,'g.x','g')
       .attr("class","x axis")
       .attr("transform", "translate(150," + categories.length*height+ ")")
       .attr('id','xaxis')
       .call(xAxis);

     var chart = d3_updateable(canvas,'g.chart','g')
       .attr("class","chart")
       .attr("transform", "translate(150,0)")
       .attr('id','bars')
     
     var bars = d3_splat(chart,".pop-bar","rect",function(x) { return x}, function(x) { return x.key })
       .attr("class","pop-bar")
       .attr('height',height-2)
       .attr({'x':0,'y':function(d,i){ return yscale(i) + 7.5; }})
       .style('fill','gray')
       .attr("width",function(x) { return xscale(x.pop) })

     var sampbars = d3_splat(chart,".samp-bar","rect",function(x) { return x}, function(x) { return x.key })
       .attr("class","samp-bar")
       .attr('height',height-10)
       .attr({'x':0,'y':function(d,i){ return yscale(i) + 11.5; }})
       .style('fill','#081d58')
       .attr("width",function(x) { return xsampscale(x.samp || 0) })

     y_xis.exit().remove()
     x_xis.exit().remove()
     chart.exit().remove()

     bars.exit().remove()
     sampbars.exit().remove()






   }

   function drawKeywords(target,data) {

     var w = d3_updateable(target,"div.keyword","div",false,function() { return 1})
       .classed("keyword",true)
       .style("width","50%")
       .style("display","inline-block")
       .style("background-color", "#e3ebf0")
       .style("padding-left", "10px")
       .style("min-height","325px")
       .style("vertical-align","top")



     d3_updateable(w,"h3","h3")
       .text("Keywords visited for filtered versus all views")
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

     var wrap = d3_updateable(w,".svg-wrap","div",data,function(x) { return 1 })
       .classed("svg-wrap",true)

     var categories = data.map(function(x) { return x.key })

     var max = d3.max(data,function(x) { return x.pop })
     var sampmax = d3.max(data,function(x) { return x.samp })

     var xsampscale = d3.scale.linear()
       .domain([0,sampmax])
       .range([0,300]);

     var xscale = d3.scale.linear()
       .domain([0,max])
       .range([0,300]);

     var height = 20

     var yscale = d3.scale.linear()
       .domain([0,categories.length])
       .range([0,categories.length*height]);

     var canvas = d3_updateable(wrap,"svg","svg")
       .attr({'width':450,'height':categories.length*height + 30});

     var xAxis = d3.svg.axis();
     xAxis
       .orient('bottom')
       .scale(xscale)

     //  .tickValues(tickVals);

     var yAxis = d3.svg.axis();
     yAxis
       .orient('left')
       .scale(yscale)
       .tickSize(2)
       .tickFormat(function(d,i){ return categories[i]; })
       .tickValues(d3.range(categories.length));

     var y_xis = d3_updateable(canvas,'g.y','g')
       .attr("class","y axis")
       .attr("transform", "translate(150,15)")
       .attr('id','yaxis')
       .call(yAxis);

     var x_xis = d3_updateable(canvas,'g.x','g')
       .attr("class","x axis")
       .attr("transform", "translate(150," + categories.length*height+ ")")
       .attr('id','xaxis')
       .call(xAxis);

     var chart = d3_updateable(canvas,'g.chart','g')
       .attr("class","chart")
       .attr("transform", "translate(150,0)")
       .attr('id','bars')
     
     var bars = d3_splat(chart,".pop-bar","rect",function(x) { return x}, function(x) { return x.key })
       .attr("class","pop-bar")
       .attr('height',height-2)
       .attr({'x':0,'y':function(d,i){ return yscale(i) + 7.5; }})
       .style('fill','gray')
       .attr("width",function(x) { return xscale(x.pop) })

     var sampbars = d3_splat(chart,".samp-bar","rect",function(x) { return x}, function(x) { return x.key })
       .attr("class","samp-bar")
       .attr('height',height-10)
       .attr({'x':0,'y':function(d,i){ return yscale(i) + 11.5; }})
       .style('fill','#081d58')
       .attr("width",function(x) { return xsampscale(x.samp || 0) })

     y_xis.exit().remove()
     x_xis.exit().remove()
     chart.exit().remove()

     bars.exit().remove()
     sampbars.exit().remove()





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
             buildSummaryBlock$1(data,this,radius_scale,x) 
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
           .classed("cat-row",true)
           .style("padding-bottom","10px")





         var radius_scale = d3.scale.linear()
           .domain([this._data.domains.population,this._data.views.population])
           .range([20,35])

         

         table.table(piewrap)
           .data({"key":"T","values":[this.data()]})
           .skip_option(true)
           .render("domains",function(x) { 
             var data = d3.select(this.parentNode).datum()[x.key]; 
             buildSummaryBlock$1(data,this,radius_scale,x) 
           })
           .render("articles",function(x) { 
             var data = d3.select(this.parentNode).datum()[x.key]; 
             buildSummaryBlock$1(data,this,radius_scale,x) 
           })

           .render("sessions",function(x) { 
             var data = d3.select(this.parentNode).datum()[x.key]; 
             buildSummaryBlock$1(data,this,radius_scale,x) 
           })
           .render("views",function(x) { 
             var data = d3.select(this.parentNode).datum()[x.key]; 
             buildSummaryBlock$1(data,this,radius_scale,x) 
           })
           .draw()

         
         drawTimeseries(tswrap,this._timing,radius_scale)     
         drawCategory(catwrap,this._category)     
         drawKeywords(catwrap,this._keywords)     


         return this
       }
     , on: function(action, fn) {
         if (fn === undefined) return this._on[action] || noop$7;
         this._on[action] = fn;
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
     , view_options: function(val) {
         return accessor.bind(this)("view_options",val) 
       }
     , logic_options: function(val) {
         return accessor.bind(this)("logic_options",val) 
       }
     , explore_tabs: function(val) {
         return accessor.bind(this)("explore_tabs",val) 
       }
     , logic_categories: function(val) {
         return accessor.bind(this)("logic_categories",val) 
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


     , filters: function(val) {
         return accessor.bind(this)("filters",val) 
       }

     , draw: function() {

         var data = this.data()

         var options = JSON.parse(JSON.stringify(this.view_options()))
         var tabs = JSON.parse(JSON.stringify(this.explore_tabs()))


         var logic = JSON.parse(JSON.stringify(this.logic_options()))
           , categories = this.logic_categories()
           , filters = JSON.parse(JSON.stringify(this.filters()))
           , actions = JSON.parse(JSON.stringify(this.actions()))


         var target = this.target
         var self = this

         segment_view(target)
           .segments(actions)
           .on("change", this.on("action.change"))
           .on("comparison.change", this.on("comparison.change"))
           .draw()

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
                 .draw()
             }

             if (x.value == "media-view") {
               media_plan.media_plan(dthis.style("margin-left","-15px").style("margin-right","-15px"))
                .data(data)
                .draw()
             }

             if (x.value == "summary-view") {
               summary_view(dthis)
                .data(self.summary())
                .timing(self.time_summary())
                .category(self.category_summary())
                .keywords(self.keyword_summary())
                .draw()
             }

           })

         return this

       }
     , on: function(action, fn) {
         if (fn === undefined) return this._on[action] || noop$1;
         this._on[action] = fn;
         return this
       }

   }

   var version = "0.0.1";

   exports.version = version;
   exports.dashboard = dashboard;
   exports.filter_dashboard = filter_dashboard;
   exports.new_dashboard = new_dashboard;
   exports.state = state;
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