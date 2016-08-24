//import d3 from 'd3'

/* FROM OTHER FILE */


export function buildDomains(data) {

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
    x.value = Math.log(x.tf_idf)
  })
  values = values.sort(function(p,c) { return c.tf_idf - p.tf_idf })


  var total = d3.sum(values,function(x) { return x.count*x.percent_unique})

  values.map(function(x) { 
    x.pop_percent = 1.02/getIDF(x.key)*100
    x.pop_percent = x.pop_percent == Infinity ? 0 : x.pop_percent

    x.percent = x.count*x.percent_unique/total*100
  })

  var norm = d3.scale.linear()
    .range([0, d3.max(values,function(x){ return x.pop_percent})])
    .domain([0, d3.max(values,function(x){return x.percent})])
    .nice()

  values.map(function(x) {
    x.percent_norm = norm(x.percent)
    //x.percent_norm = x.percent
  })



  
  return values;
  //{
  //    key: "Top Domains"
  //  , values: values.slice(0,100)
  //}
}


/* END FROM OTHER FILE */




export default function d3_updateable(target,selector,type,data,joiner) {
  var type = type || "div"
  var updateable = target.selectAll(selector).data(
    function(x){return data ? [data] : [x]},
    joiner || function(x){return [x]}
  )

  updateable.enter()
    .append(type)

  return updateable
}

export default function d3_splat(target,selector,type,data,joiner) {
  var type = type || "div"
  var updateable = target.selectAll(selector).data(
    data || function(x){return x},
    joiner || function(x){return x}
  )

  updateable.enter()
    .append(type)

  return updateable
}


export default function accessor(attr, val) {
  if (val === undefined) return this["_" + attr]
  this["_" + attr] = val
  return this
}

export function MediaPlan(target) {
  this._target = target
  this._on = {}
}

export default function media_plan(target) {
  return new MediaPlan(target)
}

function transformData(data) {

  var category_hour = d3.nest()
    .key(function(x) { return x.parent_category_name + "," + x.hour })
    .rollup(function(v) {
      return v.reduce(function(p,c) {
        p.uniques = (p.uniques || 0) + c.uniques
        p.count = (p.count || 0) + c.count
     
        return p
      },{})
    })
    .entries(data.category_hour)
    .map(function(x) {
      return {
          "category": x.key.split(",")[0]
        , "hour": x.key.split(",")[1]
        , "count": x.values.count
        , "uniques": x.values.uniques
      }
    })

  var scaled = d3.nest()
    .key(function(x) { return x.category } )
    .rollup(function(v) {
      var min = d3.min(v,function(x) { return x.count })
        , max = d3.max(v,function(x) { return x.count })

       var scale = d3.scale.linear()
         .domain([min,max])
         .range([0,100])
       var hourly = d3.range(0,24).map(function(i) { return v[i] ? scale(v[i].count) : 0 })
       var reordered = hourly.slice(3)
       reordered = reordered.concat(hourly.slice(0,3))
       return reordered
       //return hourly
    })
    .entries(category_hour)
    .map(function(x) { x.total = d3.sum(x.values); return x})
    //.sort(function(p,c) { return c.total - p.total})

  return scaled
}

MediaPlan.prototype = {
    draw: function() {
      //debugger
      if (this.data().category_hour == undefined) return this

      this.render_left()
      this.render_right()


      return this
    }
  , render_right: function(d) {

      var wrapper = d3_updateable(this._target,".rhs","div")
        .classed("rhs col-md-5",true)

      var head = d3_updateable(wrapper, "h3","h3")
        .style("margin-bottom","15px")
        .style("margin-top","10px")
        .text("Details")

      var plan_target = d3_updateable(wrapper,".plan-target","div")
        .classed("plan-target",true)

       var rows = d3_splat(plan_target,".row","div",d,function(x) { return x.key })
         .classed("row",true)
         .text(JSON.stringify)

       rows.exit().remove()


    }
  , render_left: function() {
      var scaled = transformData(this.data())

      var wrapper = d3_updateable(this._target,".lhs","div",scaled)
        .classed("lhs col-md-7",true)

      var head = d3_updateable(wrapper, "h3","h3")
        .style("margin-bottom","15px")
        .style("margin-top","10px")
        .text("Media Plan")

      
      var self = this;

      var row = d3_splat(wrapper,".row","div",false,function(x) { return x.key })
        .classed("row",true)
        .style("height","21px")
        .attr("class", function(x) { return x.key + " row" })
        .on("mouseover",function(x) {


          var _d = self.data()
          _d.display_categories = _d.display_categories || {"values":[]}
          var dd = buildDomains(_d)

          var d = dd.filter(function(z) { return z.parent_category_name == x.key})
          
          //var d = d3.nest()
          //  .key(function(x) { return x.domain})
          //  .rollup(function(v) { return v.reduce(function(p,c) { p.count += c.count; p.sessions += c.uniques; return p },{count:0,sessions:0}) })
          //  .entries(data)
          //  .map(function(x) { x.count = x.values.count; return x})
          //  .sort(function(p,c) { return c.count - p.count})
          //  .slice(0,30)

          self.render_right(d)
        })

      var MAGIC = 15

      var name = d3_updateable(row,".name","div")
        .classed("name",true)
        .style("width","170px")
        .style("display","inline-block")
        .style("line-height","20px")
        .style("vertical-align","top")
        .text(function(x) { return x.key })


      var square = d3_splat(row,".sq","div",function(x) { return x.values }, function(x,i) { return i }) 
        .classed("sq",true)
        .style("display","inline-block")
        .style("width","20px")
        .style("height","20px")
        .style("background-color",function(x,i) { 
          var pd = this.parentNode.__data__; 
          return ((x > MAGIC) && ( (pd.values[i-1] > MAGIC || false) || (pd.values[i+1] > MAGIC|| false) )) ? "black" : undefined 
        })
        .style("opacity",function(x) { return x/100 + .5 })



    }
  , data: function(d) {
      if (d === undefined) return this._target.datum()
      this._target.datum(d)
      return this
    }
  , on: function(action,fn) {
      if (fn === undefined) return this._on[action] || function() {};
      this._on[action] = fn;
      return this
    }
}
