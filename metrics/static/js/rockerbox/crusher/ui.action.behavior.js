var RB = RB || {}
RB.crusher = RB.crusher || {}
RB.crusher.ui = RB.crusher.ui || {}

RB.crusher.ui.action = (function(action) {

  var now = new Date()

  var transformKey = function(d,key){

      var is_before = (key == "before"),

        transformed_categories = transformData(d[key].categories,is_before);
        first = transformed_categories[0].values,
        dates = first.map(function(d){return d.date}),

        inflection_val = calcInflection(transformed_categories),
        inflection_pos = is_before ? first.length - inflection_val -1 : inflection_val,
        inflection = first[inflection_pos];
          

      return {
        key: key,
        dates: dates,
        orientation: is_before ? "left" : "right",
        categories: transformed_categories,
        domains: d[key].domains,
        inflection: inflection
      }

    }

  var transformData = function(data,is_before) {
    var data = data.map(function(x){

      x.summed = x.values.reduce(function(p,c){
        p.y = p.y + c.y*c.time_bucket
        return p
      },{ y: 0 })
  
      x.name = x.key
      x.values = x.values.map(function(y){
        var time = y.time_bucket*60*1000
        y.date = new Date(+now - time)
        y.y = y.count
        return y
      }).sort(function(p,c){return p.date - c.date})
  
  
      // add to the beginning
      var z = JSON.parse(JSON.stringify(x.values[x.values.length-1]))
      var time = +new Date(z.date)
      z.date = new Date( time + 15*60*1000)
  
      x.values.push(z)
      x.values = x.values.slice(6-x.values.length) // remove the first 6 points (since its so long...


      // add to the end
      var z = JSON.parse(JSON.stringify(x.values[0]))
      z.date = new Date(+new Date(x.values[1].date) - 20*60*1000)
  
      x.values = x.values.slice(1-x.values.length)
      x.values.splice(0,0,z)


      // add to the end
      var z = JSON.parse(JSON.stringify(z))
      z.y = z.y
      z.date = new Date(+new Date(z.date) - 30*60*1000)
  
      x.values.splice(0,0,z)
      x.values = x.values.sort(function(p,c){return p.date - c.date})


      
      x.final = x.values[x.values.length-1].y
      x.initial = x.values[0].y
  
      x.percent_diff = (x.final - x.initial)/x.initial
  
      return x
    })

    data = data
      .sort(function(c,p){return (p.values[p.values.length-1].y) - (c.values[c.values.length-1].y)})
      .slice(0,8)

    if (!is_before) {
      data.map(function(x) {
        x.values.map(function(y){ y.date = new Date(+now + y.time_bucket*60*1000) })
      })
    }

    return data
  }

  var calcInflection = function(data) {
    return data.reverse().map(function(x) {
      // cumulative average
      return x.values.reduce(function(p,c){
        p.push( ((p[p.length-1]*p.length || 0) + c.y)/(p.length + 1))
        return p
      },[])
    }).reverse().reduce(function(p,c){
      // sum across series by value at date i
      c.map(function(x,i){
        p[i] = (p[i] || 0) + x
      })
      return p
    },[]).reverse().reduce(function(p,c){
      // find the min point in this series
      if (p[1] === undefined) return [0,c]
      if (c < p[1]) return [p[0] + 1,c]
      return p
    },[])[0]
  }


  var stackDates = function(data,all_data,x) {

    var stacked_dates = data[0].values
      .sort(function(p,c){return p.date - c.date})
      .map(function(d,i){ return { y:x(d.date), x:0, d: d.date } })

    var previous = 0
    stacked_dates = stacked_dates.reverse().map(function(d){
      d.y0 = previous
      previous = d.y
      d.all = all_data
     
      return d
    }).reverse()
    return stacked_dates
  }

  function autoSize(wrap,adjustWidth,adjustHeight) {

    function elementToWidth(elem) {
      var num = wrap.style("width").split(".")[0].replace("px","") 
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

    var margin = {top: 40, right: 10, bottom: 30, left: 10},
        width  = w - margin.left - margin.right,
        height = h - margin.top - margin.bottom;

    return {
      margin: margin,
      width: width,
      height: height
    }
  } 

  action.build_behavior_transform = function(wrap) {

    // Consider the current element and then make a function that computers 
    // the appropriate sizes and transforms the data for what we want

    var adjustWidth = function(w) { return w/12*8 - 50 },
      adjustHeight = function(h) { return 370 };

    var _sizes = autoSize(wrap,adjustWidth,adjustHeight),
      width = _sizes.width,
      height = _sizes.height,
      margin = _sizes.margin;


    var transform = function(d){

      var LABEL_WIDTH = 140; 

      var leftOffset  = (d.orientation == "left") ? 0 : LABEL_WIDTH,
          rightOffset = (d.orientation == "left") ? LABEL_WIDTH : 0,

          x = d3.time.scale().range([leftOffset, width-rightOffset]),
          y = d3.scale.linear().range([height, 0]),

          stack = d3.layout.stack()
            .offset("silhouette")
            .values(function(d) { return d.values; }),

          area = d3.svg.area()
            .interpolate("cardinal")
            .x(function(d) { return x(d.date); })
            .y0(function(d) { return y(d.y0); })
            .y1(function(d) { return y(d.y0 + d.y); });

          

      x.domain(d3.extent(d.dates, function(d) { return d; }));

      return {
        key: d.key,
        categories: d.categories,
        inflection: d.inflection,
        orientation: d.orientation,
        domains: d.domains,


        stacked: stack(d.categories),
        stacked_dates: stackDates(d.categories,d.domains,x),
        area: area, x: x, y: y,

        width: width, height: height, margin: margin, 
        leftOffset: leftOffset,
        rightOffset: rightOffset
      }

    }

    return transform 
  }

  action.show_behavior = function(wrapper) {

    var wrap = action.build_behavior_wrapper(wrapper)
    var transform = action.build_behavior_transform(wrap)

    action.build_behavior(wrap,transform)
    action.build_intent(wrap)
    action.build_domain_intent(wrap)
    
  }

  action.build_domain_intent = function(wrap) {


    var wrapper = d3_updateable(wrap,"div.domain-intent-wrapper","div")
      .classed("domain-intent-wrapper row",true)
      .style("margin-left","-15px")
      .style("margin-right","-15px")
      .datum(function(d){
        
        var binflection = function(x) { return x.time_bucket <= d.before_and_after[0].inflection.time_bucket},
          ainflection = function(x) {return x.time_bucket <= d.before_and_after[1].inflection.time_bucket};

        var before_cat = d.before_and_after[0].categories,
          after_cat = d.before_and_after[1].categories

        var before = before_cat.map(function(x){return {key:x.key,values:x.values.filter(binflection)} })
        var after = after_cat.map(function(x){return {key:x.key,values:x.values.filter(ainflection)} })

        var nbefore = before_cat.map(function(x){
          return {
            key:x.key,
            values:x.values.filter(function(x) {return !binflection(x)}) 
          }
        })
        var nafter = after_cat.map(function(x){
          return {
            key:x.key,
            values:x.values.filter(function(x) {return !ainflection(x)}) 
          }
        })

        var intent = []
        intent.push.apply(intent,before)
        intent.push.apply(intent,after)

        var category_intent = intent.reduce(function(p,c){
          p[c.key] = c.values.reduce(function(q,r){return q + r.count*r.num},0)
          p[c.key] = p[c.key]/c.values.length

          return p
        },{})


        var non_intent = []
        non_intent.push.apply(intent,nbefore)
        non_intent.push.apply(intent,nafter)

        var category_non_intent = intent.reduce(function(p,c){
          p[c.key] = c.values.reduce(function(q,r){return q + r.count*r.num},0)
          p[c.key] = p[c.key]/c.values.length

          return p
        },{})

        var category_diff = Object.keys(category_intent).reduce(function(p,cat){
          p[cat] = (category_intent[cat] - category_non_intent[cat]) / category_non_intent[cat]
          p[cat] = p[cat] == Infinity ? 0 : p[cat]
          return p
        },{})

        var category_change = Object.keys(category_diff).map(function(x){
          return {"name":x,"value": category_diff[x]} 
        })

        

        // domain
        var before_bucket = d.before_and_after[0].inflection.time_bucket 
        var after_bucket = d.before_and_after[1].inflection.time_bucket 

        var before_domains = d.before_and_after[0].domains
        var after_domains = d.before_and_after[1].domains


        var intent_x = []
        intent_x.push.apply(intent_x,
          Object.keys(before_domains).reduce(function(p,c){
            if (c <= before_bucket) p.push.apply(p,before_domains[c])
            return p
          },[])
        )
        intent_x.push.apply(intent_x,
          Object.keys(after_domains).reduce(function(p,c){
            if (c <= after_bucket) p.push.apply(p,after_domains[c])
            return p
          },[])
        )

        var intent_domains = d3.nest()
          .key(function(x){return x.domain})
          .rollup(function(x){return d3.sum(x.map(function(y){return y.uid / y.idf})) })
          .map(intent_x)


        var non_intent_x = []
        non_intent_x.push.apply(non_intent_x,
          Object.keys(before_domains).reduce(function(p,c){
            if (c > before_bucket) p.push.apply(p,before_domains[c])
            return p
          },[])
        )
        non_intent_x.push.apply(non_intent_x,
          Object.keys(after_domains).reduce(function(p,c){
            if (c > after_bucket) p.push.apply(p,after_domains[c])
            return p
          },[])
        )

        var non_intent_domains = d3.nest()
          .key(function(x){return x.domain})
          .rollup(function(x){return d3.sum(x.map(function(y){return y.uid / y.idf})) })
          .map(non_intent_x)

        var total_intent = Object.keys(intent_domains).reduce(function(p,c){return p + intent_domains[c]},0)
        var total_non_intent = Object.keys(non_intent_domains).reduce(function(p,c){return p + non_intent_domains[c]},0)

        var domains = {}

        Object.keys(intent_domains).map(function(x){
          domains[x] = 0
        })
        Object.keys(non_intent_domains).map(function(x){
          domains[x] = 0
        })

        var domains_diff = Object.keys(domains).map(function(x){
          if (!(intent_domains[x] && non_intent_domains[x])) return { name: x, value: 0}

          console.log(intent_domains[x]/total_intent, non_intent_domains[x]/total_non_intent, intent_domains[x], non_intent_domains[x])

          return {
            name: x,
            value: (intent_domains[x]/total_intent - non_intent_domains[x]/total_non_intent)/(non_intent_domains[x]/total_non_intent + intent_domains[x]/total_intent ),
            intent: intent_domains[x],
            non_intent: non_intent_domains[x]
          }
        }).sort(function(p,c) {return c.value - p.value})

        
        var terms = d3.max(Object.keys(non_intent_domains).map(function(x) {return non_intent_domains[x]}))

        var idf = {}
        Object.keys(non_intent_domains).map(function(x){return idf[x] = Math.log(2*terms/(non_intent_domains[x] + (intent_domains[x] || 0) ) ) })
        Object.keys(intent_domains).map(function(x){return idf[x] = Math.log(2*terms/( (non_intent_domains[x] || 0) + (intent_domains[x] || 0) ) ) })


        var tfidf = Object.keys(intent_domains).map(function(x){
          return {"key":x,"value":intent_domains[x],"idf":idf[x],"tf_idf":intent_domains[x]*idf[x]}
        }).sort(function(p,c){return p.tf_idf - c.tf_idf})

        tfidf = tfidf.filter(function(x){return x.tf_idf < 10})

        var x = d3.scale.linear()
          .range([-1,1])
          .domain([tfidf[0].tf_idf, tfidf[tfidf.length-1].tf_idf])

        tfidf.map(function(y){
          y.name = y.key
          y.value = x(y.tf_idf)
        })

        var xx = tfidf.slice(0,10)
        xx.push.apply(xx,tfidf.slice(-10))


        debugger

        return xx
      })

    /*
     Headers
    */

    d3_updateable(wrapper,".title","div")
      .classed("title col-md-12",true)
      .html("<br>During Intent Window")

    d3_updateable(wrapper,".value","div")
      .classed("value col-md-12",true)

    d3_updateable(wrapper,".description","div")
      .classed("description col-md-12",true)
      .style("margin-bottom","10px")
      .text("Below we show what happens during the window of intent as it compares to before and after visiting")


    /*
      Body
    */

    var lhs_target = d3_updateable(wrapper,".col-md-6","div")
      .classed("col-md-6",true)
      .classed("pull-right",function(d){return d.key == "after"})

    var _sizes = autoSize(lhs_target,function(d){return d -50}, function(d){return 300}),
      margin = _sizes.margin,
      width = _sizes.width,
      height = _sizes.height

    var x = d3.scale.linear()
        .range([0, width]);

    var y = d3.scale.ordinal()
        .rangeRoundBands([0, height], .2);
    
    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("top");
    
    var svg = lhs_target.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", "translate(" + margin.left + "," + 0 + ")");

    var data = lhs_target.datum().sort(function(p,c){return c.value - p.value})


    var values = data.map(function(x){ return x.value })

    x.domain(d3.extent([d3.min(values)-.1,d3.max(values)+.1,-d3.min(values)+.1,-d3.max(values)-.1],function(x) { return x})).nice();

    y.domain(data.map(function(d) { return d.name; }));

    svg.selectAll(".bar")
        .data(data)
      .enter().append("rect")
        .attr("class", function(d) { return d.value < 0 ? "bar negative" : "bar positive"; })
        .attr("x", function(d) { return x(Math.min(0, d.value)); })
        .attr("y", function(d) { return y(d.name); })
        .attr("width", function(d) { return Math.abs(x(d.value) - x(0)); })
        .attr("height", y.rangeBand());

    svg.selectAll(".label")
        .data(data)
      .enter().append("text")
        .attr("x", function(d) { return d.value < 0 ? x(0) + 6: x(0) -6; })
        .attr("style", function(d) { return d.value < 0 ? "text-anchor:start;dominant-baseline: middle;" : "text-anchor:end;dominant-baseline: middle;"; })
        .attr("y", function(d) { return y(d.name) + y.rangeBand()/2 + 1; })
        .text(function(d) { return d.name; })

    svg.selectAll(".label")
        .data(data)
      .enter().append("text")
        .attr("x", function(d) { return d.value < 0 ? 
          x(d.value) - 35:
          x(d.value) + 35; 
        })
        .attr("style", function(d) { return d.value < 0 ? "text-anchor:start;dominant-baseline: middle;font-size:.9em" : "text-anchor:end;dominant-baseline: middle;font-size:.9em"; })
        .attr("y", function(d) { return y(d.name) + y.rangeBand()/2 + 1; })
        .text(function(d) { 
          var v = d3.format("%")(d.value); 
          var x = (d.value > 0) ?  "↑" : "↓"


          return "(" + v + x  + ")"
        })




    // svg.append("g")
    //     .attr("class", "x axis")
    //     .call(xAxis);

    svg.append("g")
        .attr("class", "y axis")
      .append("line")
        .attr("x1", x(0))
        .attr("x2", x(0))
        .attr("y2", height);
    


  }

  action.build_intent = function(wrap) {


    var wrapper = d3_updateable(wrap,"div.intent-wrapper","div")
      .classed("intent-wrapper row",true)
      .style("margin-left","-15px")
      .style("margin-right","-15px")
      .datum(function(d){
        
        var binflection = function(x) { return x.time_bucket <= d.before_and_after[0].inflection.time_bucket},
          ainflection = function(x) {return x.time_bucket <= d.before_and_after[1].inflection.time_bucket};

        var before_cat = d.before_and_after[0].categories,
          after_cat = d.before_and_after[1].categories

        var before = before_cat.map(function(x){return {key:x.key,values:x.values.filter(binflection)} })
        var after = after_cat.map(function(x){return {key:x.key,values:x.values.filter(ainflection)} })

        var nbefore = before_cat.map(function(x){
          return {
            key:x.key,
            values:x.values.filter(function(x) {return !binflection(x)}) 
          }
        })
        var nafter = after_cat.map(function(x){
          return {
            key:x.key,
            values:x.values.filter(function(x) {return !ainflection(x)}) 
          }
        })

        var intent = []
        intent.push.apply(intent,before)
        intent.push.apply(intent,after)

        var category_intent = intent.reduce(function(p,c){
          p[c.key] = c.values.reduce(function(q,r){return q + r.count*r.num},0)
          p[c.key] = p[c.key]/c.values.length

          return p
        },{})


        var non_intent = []
        non_intent.push.apply(intent,nbefore)
        non_intent.push.apply(intent,nafter)

        var category_non_intent = intent.reduce(function(p,c){
          p[c.key] = c.values.reduce(function(q,r){return q + r.count*r.num},0)
          p[c.key] = p[c.key]/c.values.length

          return p
        },{})

        var category_diff = Object.keys(category_intent).reduce(function(p,cat){
          p[cat] = (category_intent[cat] - category_non_intent[cat]) / category_non_intent[cat]
          p[cat] = p[cat] == Infinity ? 0 : p[cat]
          return p
        },{})

        var category_change = Object.keys(category_diff).map(function(x){
          return {"name":x,"value": category_diff[x]} 
        })

        

        // domain
        var before_bucket = d.before_and_after[0].inflection.time_bucket 
        var after_bucket = d.before_and_after[1].inflection.time_bucket 

        var before_domains = d.before_and_after[0].domains
        var after_domains = d.before_and_after[1].domains


        var x = []
        x.push.apply(x,
          Object.keys(before_domains).reduce(function(p,c){
            if (c <= before_bucket) p.push.apply(p,before_domains[c])
            return p
          },[])
        )
        x.push.apply(x,
          Object.keys(after_domains).reduce(function(p,c){
            if (c <= after_bucket) p.push.apply(p,after_domains[c])
            return p
          },[])
        )

        var intent_domains = d3.nest()
          .key(function(x){return x.domain})
          .rollup(function(x){return d3.sum(x.map(function(y){return y.uid / y.idf})) })
          .map(x)


        var x = []
        x.push.apply(x,
          Object.keys(before_domains).reduce(function(p,c){
            if (c > before_bucket) p.push.apply(p,before_domains[c])
            return p
          },[])
        )
        x.push.apply(x,
          Object.keys(after_domains).reduce(function(p,c){
            if (c > after_bucket) p.push.apply(p,after_domains[c])
            return p
          },[])
        )

        var non_intent_domains = d3.nest()
          .key(function(x){return x.domain})
          .rollup(function(x){return d3.sum(x.map(function(y){return y.uid / y.idf})) })
          .map(x)

        var total_intent = Object.keys(intent_domains).reduce(function(p,c){return p + intent_domains[c]},0)
        var total_non_intent = Object.keys(non_intent_domains).reduce(function(p,c){return p + non_intent_domains[c]},0)

        var domains = {}

        Object.keys(intent_domains).map(function(x){
          domains[x] = 0
        })
        Object.keys(non_intent_domains).map(function(x){
          domains[x] = 0
        })

        var domains_diff = Object.keys(domains).map(function(x){
          if (!(intent_domains[x] && non_intent_domains[x])) return { name: x, value: 0}

          console.log(intent_domains[x]/total_intent, non_intent_domains[x]/total_non_intent, intent_domains[x], non_intent_domains[x])

          return {
            name: x,
            value: (intent_domains[x]/total_intent - non_intent_domains[x]/total_non_intent)/(non_intent_domains[x]/total_non_intent + intent_domains[x]/total_intent ),
            intent: intent_domains[x],
            non_intent: non_intent_domains[x]
          }
        }).sort(function(p,c) {return c.value - p.value})

        
        var terms = d3.max(Object.keys(non_intent_domains).map(function(x) {return non_intent_domains[x]}))

        var idf = {}
        Object.keys(non_intent_domains).map(function(x){return idf[x] = Math.log(2*terms/(non_intent_domains[x] + (intent_domains[x] || 0) ) ) })
        Object.keys(intent_domains).map(function(x){return idf[x] = Math.log(2*terms/( (non_intent_domains[x] || 0) + (intent_domains[x] || 0) ) ) })


        var tfidf = Object.keys(intent_domains).map(function(x){
          return {"key":x,"value":intent_domains[x],"idf":idf[x],"tf_idf":intent_domains[x]*idf[x]}
        }).sort(function(p,c){return p.tf_idf - c.tf_idf})

        var x = d3.scale.linear()
          .range([-1,1])
          .domain([tfidf[0].tf_idf, tfidf[tfidf.length-1].tf_idf])


        tfidf.map(function(y){
          y.name = y.key
          y.value = x(y.tf_idf)
        })

        var xx = tfidf.slice(0,10)
        xx.push.apply(xx,tfidf.slice(-10))

        var x = []
        x.push.apply(x,
          Object.keys(before_domains).reduce(function(p,c){
            if (c <= before_bucket) p.push.apply(p,before_domains[c])
            return p
          },[])
        )
        x.push.apply(x,
          Object.keys(after_domains).reduce(function(p,c){
            if (c <= after_bucket) p.push.apply(p,after_domains[c])
            return p
          },[])
        )

        var domain_to_category = d3.nest()
          .key(function(x){return x.domain})
          .rollup(function(x){return x[0].parent_category_name})
          .map(x)

        var ds = d3.nest()
          .key(function(y){return domain_to_category[y.name] })
          .key(function(y){return y.name})
          .rollup(function(y){return y[0].value})
          .entries(tfidf)


        return {category: category_change, domains: ds}
      })

    /*
     Headers
    */

    d3_updateable(wrapper,".title","div")
      .classed("title col-md-12",true)
      .html("<br>During Intent Window")

    d3_updateable(wrapper,".value","div")
      .classed("value col-md-12",true)

    d3_updateable(wrapper,".description","div")
      .classed("description col-md-12",true)
      .style("margin-bottom","10px")
      .text("Below we show what happens during the window of intent as it compares to before and after visiting")


    /*
      Body
    */

    var lhs_target = d3_updateable(wrapper,".col-md-6","div")
      .classed("col-md-6",true)
      .classed("pull-right",function(d){return d.key == "after"})

    var rhs_target = d3_updateable(wrapper,".rhs.col-md-6","div")
      .classed("col-md-6 rhs",true)
      .classed("pull-right",function(d){return d.key == "after"})


    var _sizes = autoSize(lhs_target,function(d){return d -50}, function(d){return 300}),
      margin = _sizes.margin,
      width = _sizes.width,
      height = _sizes.height

    var x = d3.scale.linear()
        .range([0, width]);

    var y = d3.scale.ordinal()
        .rangeRoundBands([0, height], .2);
    
    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("top");
    
    var svg = lhs_target.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)

        .datum(function(x){return x.category})
      .append("g")
        .attr("transform", "translate(" + margin.left + "," + (margin.top-20) + ")")

    var data = svg.datum().sort(function(p,c){return c.value - p.value})


    var values = data.map(function(x){ return x.value })

    x.domain(d3.extent([d3.min(values)-.1,d3.max(values)+.1,-d3.min(values)+.1,-d3.max(values)-.1],function(x) { return x})).nice();

    y.domain(data.map(function(d) { return d.name; }));

    svg.selectAll(".bar")
        .data(data)
      .enter().append("rect")
        .attr("class", function(d) { return d.value < 0 ? "bar negative" : "bar positive"; })
        .attr("x", function(d) { return x(Math.min(0, d.value)); })
        .attr("y", function(d) { return y(d.name); })
        .attr("width", function(d) { return Math.abs(x(d.value) - x(0)); })
        .attr("height", y.rangeBand())
        .on("mouseover",function(z){
          var domains = this.parentElement.parentElement.parentElement.__data__.domains
          var data = domains.filter(function(y){return y.key == z.name})[0].values
            .map(function(x) {
              x.count = x.values + 1 
              x.domain = x.key
              x.category_name = z.name
              x.parent_category_name = z.name
              return x
            })

          var filtered = rhs_target
          RB.rho.ui.buildBarTable(filtered,data,"asdf","domain",false,15,action.category_colors)

        })

    svg.selectAll(".label")
        .data(data)
      .enter().append("text")
        .attr("x", function(d) { return d.value < 0 ? x(0) + 6: x(0) -6; })
        .attr("style", function(d) { return d.value < 0 ? "text-anchor:start;dominant-baseline: middle;" : "text-anchor:end;dominant-baseline: middle;"; })
        .attr("y", function(d) { return y(d.name) + y.rangeBand()/2 + 1; })
        .text(function(d) { return d.name; })

    svg.selectAll(".label")
        .data(data)
      .enter().append("text")
        .attr("x", function(d) { return d.value < 0 ? 
          x(d.value) - 35:
          x(d.value) + 35; 
        })
        .attr("style", function(d) { return d.value < 0 ? "text-anchor:start;dominant-baseline: middle;font-size:.9em" : "text-anchor:end;dominant-baseline: middle;font-size:.9em"; })
        .attr("y", function(d) { return y(d.name) + y.rangeBand()/2 + 1; })
        .text(function(d) { 
          var v = d3.format("%")(d.value); 
          var x = (d.value > 0) ?  "↑" : "↓"


          return "(" + v + x  + ")"
        })




    // svg.append("g")
    //     .attr("class", "x axis")
    //     .call(xAxis);

    svg.append("g")
        .attr("class", "y axis")
      .append("line")
        .attr("x1", x(0))
        .attr("x2", x(0))
        .attr("y2", height);
    


  }

  action.build_behavior_wrapper = function(wrapper) {

    var title = "",
      series = ["before","after"],
      formatting = ".col-md-12",
      description = "", //"What happens to user activity before and after visiting this segment",
      ts = wrapper.selectAll(".action-body")

    var wrap = RB.rho.ui.buildSeriesWrapper(ts, title, series, false, formatting, description)

    var parentNode = ts.selectAll(".before-and-after")
    parentNode.selectAll(".loading-icon").remove()

    parentNode.classed("hidden",false)
      .style("visibility","hidden")

    setTimeout(function(){
      parentNode.classed("hidden",!parentNode.classed("selected"))
        .style("visibility",undefined)

    },1)




    wrap.selectAll(".title").remove()
    wrap.selectAll(".value").remove()

    wrap.datum(function(d) {
      d.before_and_after = ["before","after"].map(function(y){
        return transformKey(d,y)
      })
      return d
    })


    return wrap
  }

  action.behavior = {

    title: function(d,i){
      var str = i ? "" : "<br>"
      str += "Activity " + d.key.capitalize() + " Visiting"
      return str
    },
    description: function(d){
      var str = "Below shows the change in categories that a user visits "
      str += d.key
      str += " they take part in this action"

      return str
    }
  }


  action.build_behavior = function(wrap,transform){

   var wrapper = d3_splat(wrap,".before-wrapper","div",
      function(d){ 
        var data = d.before_and_after.map(transform)
        return data
      },
      function(x){ return x.key }
    ).classed("before-wrapper row",true)
      .style("margin-left","-15px") 
    

    /*
      Headers
     */

    d3_updateable(wrapper,".title","div")
      .classed("title col-md-12",true)
      .html(action.behavior.title)

    d3_updateable(wrapper,".value","div")
      .classed("value col-md-12",true)

    d3_updateable(wrapper,".description","div")
      .classed("description col-md-12",true)
      .style("margin-bottom","10px")
      .text(action.behavior.description)


    /*
      Body
    */

    var lhs_target = d3_updateable(wrapper,".col-md-8","div")
      .classed("col-md-8",true)
      .classed("pull-right",function(d){return d.key == "after"})

    var rhs_target = d3_updateable(wrapper,".col-md-3","div")
      .classed("col-md-4",true)


    /*
      Chart
    */

    var svg = lhs_target.append("svg")
        .attr("width", function(d){ return d.width + d.margin.left + d.margin.right} )
        .attr("height", function(d){ return d.height + d.margin.top + d.margin.bottom} )
      .append("g")
        .attr("transform", function(d) {return "translate(" + d.margin.left + "," + d.margin.top + ")" })
        .classed("behavior",true)


     var mouseover = function(d){
       var d = d,
         time_bucket = ((now - d.d )/60/1000)
         parentNode = d3.select(this.parentElement.parentElement.parentElement)

       d3.selectAll(".time").classed("hidden",true)
       d3.select(this.parentNode).select("text").classed("hidden",false)
       
       d3.select(this.parentElement.parentElement).selectAll("rect").attr("opacity",".2")
       d3.select(this).attr("opacity","0")

       time_bucket = time_bucket > 0 ? time_bucket : -1*time_bucket

       var data = d.all[time_bucket].sort(function(p,c){return c.uid - p.uid})
         .map(function(x) {
           x.count = x.uid
           x.category_name = ""
           return x
         })

       var filtered = rhs_target.filter(function(d){ return d == parentNode.datum()})
       RB.rho.ui.buildBarTable(filtered,data,"asdf","domain",false,15,action.category_colors)

    }   

    
    action.behavior_paths(svg)
    action.behavior_labels(svg)
    action.behavior_inflection(svg)
    action.behavior_visit(svg)
    action.behavior_axis(svg)
    action.behavior_hover(svg,mouseover)

  }

  action.behavior_paths = function(svg) {
    /* Path Wrapper */

    var path_wrapper = d3_updateable(svg,".path-wrapper","g")
      .classed("path-wrapper",true)

    var browser = d3_splat( path_wrapper,".stack","g",
        function(x){ return x.stacked },
        function(x){ return x.key }
      ).attr("class", "stack");

    d3_updateable(browser,".area","path")
      .attr("class", "area")
      .attr("d", function(d) { 
        var parent = d3.select(this.parentNode.parentNode).datum()
        
        var area = parent.area
        var orient = (parent.orientation == "left")
        return area(d.values); 
      })
      .style("fill", function(d) { return action.category_colors(d.name); });

  }

  action.behavior_labels = function(svg) {
    /* Label Wrapper */

    var label_wrapper = d3_updateable(svg,".label-wrapper","g")
      .classed("label-wrapper",true)

    d3_splat(label_wrapper,".label","text",
        function(x){ return x.stacked },
        function(x){ return x.key }
      ).attr("class","label")
      .datum(function(d) { 
        var parent = d3.select(this.parentNode.parentNode).datum()
        d.orient = parent.orientation == "left"

        return {
          name: d.name, 
          value: d.values[d.orient ? (d.values.length - 1) : 0 ], 
          percent_diff: d.percent_diff,
          orient: d.orient,
          leftOffset: parent.leftOffset
        }; 
      })
      .attr("transform", function(d) { 
        var parent = d3.select(this.parentNode.parentNode).datum()
        var y = parent.y 
        var width = parent.width

        var yPos = y(d.value.y0 + d.value.y / 2)
        var xPos = d.orient ? (width - parent.rightOffset + 5) : 0

        return "translate(" + xPos + "," + yPos + ")"; 
      })
      .attr("x", function(d){ return d.orient ? 6: (d.leftOffset -6) })
      .attr("dy", ".35em")
      .attr("style", "font-size:.9em")
      .attr("style", function(d){ 
        return d.orient ? 
          "text-anchor:start;font-size:.9em": 
          "text-anchor:end;font-size:.9em"
      })
      .text(function(d) { 
          
          var x = d3.format("%")(d.percent_diff)
          //x += (d.percent_diff > 0) ?  "↑" : "↓"

          var result = d.name
          //result += (d.percent_diff != Infinity) ? " (" + x + ")" : ""

          return result
      })
      .attr("class",function(d){ 
        return d.value.y < .03 ? "hidden" : "" 
      })
  }

  action.behavior_inflection = function(svg) {

    var inflectionLine = svg.append("g")

    inflectionLine.append("text")
        .attr("transform", function(d) { return "translate(" + (d.x(d.inflection.date)) + "," + (-25) + ")"; })
          .attr("dy", ".35em")
          .style("text-anchor","middle")
          .text(function(d) { 
              return "Behavioral change"
          })

    inflectionLine.append("line")
        .attr("x1", function(d){ return d.x(d.inflection.date) } )
        .attr("y1", -12)
        .attr("x2", function(d){ return d.x(d.inflection.date) })
        .attr("y2", function(d){ return d.height + 15} )
        .attr("stroke-dasharray","5, 5")
        .style("stroke-width", .5)
        .style("stroke", "grey")
        .style("fill", "none");

    inflectionLine.append("text")
        .attr("transform", function(d) { return "translate(" + (d.x(d.inflection.date) + 5) + "," + (d.height+10) + ")"; })
          .attr("dy", ".35em")
          .style("text-anchor","start")
          .classed("time start",true)
          .text(function(d) { 
              var num = parseInt((now - d.inflection.date)/60/1000)
              var preposition = num > 0 ? "before" : "after"
              num = num > 0 ? num : -num
              return  num + " mins " + preposition
          })

  }

  action.behavior_visit = function(svg) {
     var s = svg.append("g")

     s.append("line")
         .attr("x1", function(d){ return d.width - d.margin.right - 50 - d.margin.left})
         .attr("y1", -12)
         .attr("x2", function(d){ return d.width - d.margin.right - 50 - d.margin.left})
         .attr("y2", 0)
         .attr("stroke-dasharray","5, 5")
         .style("stroke-width", .5)
         .style("stroke", "grey")
         .style("fill", "none");

     s.append("text")
         .attr("transform", function(d) { return "translate(" + (d.width - d.margin.right - 50 - d.margin.left) + "," + (-25) + ")"; })
         .attr("dy", ".35em")
         .style("text-anchor","middle")
         //.text(function(d) { return "Visit" })

  }

  action.behavior_axis = function(svg) {

    var topRow = svg.append("g")

     

    var leftLine = labelWithDottedLine(svg)
      .width(function(d){return d.x(d.inflection.date) - d.leftOffset })
      .x(function(d) {return d.leftOffset })
      .classname("typical")
      .text(function(d){
        return d.orientation == "left" ? "Typical behavior" : "Intent"
      })()


    var rightLine = labelWithDottedLine(svg)
      .width(function(d){return  d.width - d.x(d.inflection.date) - d.rightOffset})
      .x(function(d) {return d.x(d.inflection.date) })
      .classname("intent")
      .text(function(d){
        return d.orientation == "left" ? "Intent" : "Typical behavior" 
      })()


    // var rightLine = labelWithDottedLine(svg)
    //   .width(function(d){return  d.leftOffset + d.rightOffset})
    //   .x(function(d) {return d.leftOffset + d.width - d.rightOffset})
    //   .classname("visit")
    //   .text("During visit")()


    var bottomRow = svg.append("g")

    bottomRow.append("line")
        .attr("x1", 0)
        .attr("y1", function(d){ return d.height-8})
        .attr("x2", 0)
        .attr("y2", function(d){ return d.height})
        .style("stroke-width", .5)
        .style("stroke", "grey")
        .style("fill", "none");

    bottomRow.append("text")
        .attr("transform", function(d) { return "translate(" + 0 + "," + (d.height+10) + ")"; })
        .attr("dy", ".35em")
        .classed("time start",true)
        .style("text-anchor","start")
        .text(function(d) { return "> 8 hours before visit" })

  }
    
  action.behavior_hover = function(svg,mouseover) {

    var date_wrapper = d3_updateable(svg,'.date-wrapper',"g")
      .classed("date-wrapper",true)

    var date_rects = date_wrapper.selectAll("dates")
        .data(function(x){return x.stacked_dates})
        .enter().append("g")
        .attr("class", "dates");

    date_rects
        .append("rect")
        .attr("x", function(d){ return d.y })
        .attr("y", 0)
        .attr("fill","#fff")
        .attr("opacity",".2")
        .attr("width", function(d){    
            if ((d.y0 - d.y) > 0) return d.y0 - d.y 
            return 0
        })
        .attr("height", function(d){
          return d3.select(this.parentNode.parentNode).datum().height
        })
        .on("mouseover",mouseover)
        .on("mouseout",function(d){})

    date_rects
        .append("text")
        .attr("x", function(d){ return d.y + 6 })
        .attr("y", function(d){
          var height = d3.select(this.parentNode.parentNode).datum().height

          return height + 20
        } )
        .classed("time hidden",true)
        .text(function(d){
          var num = parseInt((now - d.d)/60/1000)
          var preposition = num > 0 ? "before" : "after"
          num = num > 0 ? num : -num
          return  num + " mins " + preposition

        }) 



  }

  return action

})(RB.crusher.ui.action || {})  
