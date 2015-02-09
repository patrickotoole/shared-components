
function unique(arr) {
    var hash = {}, result = [];
    for ( var i = 0, l = arr.length; i < l; ++i ) {
        if ( !hash.hasOwnProperty(arr[i]) ) { //it works with objects! in FF, at least
            hash[ arr[i] ] = true;
            result.push(arr[i]);
        }
    }
    return result;
}

var RB = RB || {}

RB.QS = (function(a) {
  if (a == "") return {};
  var b = {};
  for (var i = 0; i < a.length; ++i) {
    var p = a[i].split('=', 2);
    if (p.length == 1) b[p[0]] = "";
    else b[p[0]] = decodeURIComponent(p[1].replace(/\+/g, " "));
  }
  return b;
})(window.location.search.substr(1).split('&'))
 

RB.helpers = {
  formatters: {
    date: d3.time.format("%y-%m-%d")
  },
  get_start_date: function(){
    var today = new Date()
    var thirtydaysago = new Date(today - (30 * 24 * 60 * 60 * 1000))
    return  RB.QS["start_date"] || this.formatters.date(thirtydaysago)
  },
  order_by_nested: function(key) {
    return function (x,y) { return y.values[0][key] - x.values[0][key] }
  },
  timeseries_formatter: function(z){
    return {
      "values":z.values[0].timeseries,
      "title": z.name,
    }
  },
  add_id: function(id){
    return function(x) {
      x.id = x.id || id
      return x
    }
  },

  timeseries_transform: function(data_key) {
    var self = this
    return function(d) {
      var rand = parseInt(Math.random()*10000000)
      var values = d[data_key]
        .map(self.timeseries_formatter)
        .map(self.add_id(rand))
      values.map(function(z){
        z.values = z.values.map(function(d){
          d.date = typeof(d.date) == "string" ? new Date("20"+d.date) : d.date;  
          return d
        })
      })
      return [values]
    }
  },
  recursiveMapBuffer: function(tsmap,times) {
    Object.keys(tsmap).map(function(k){
      var arr = tsmap[k] || {}
      if (arr instanceof Array) {
        times.map(function(y) { 
          var to_count = tsmap[y] || []; 
          tsmap[y] = to_count.length 
          // want to do something here so that we can have a calced value
          // i.e., spend from served impressions
        })
      } else {
        RB.helpers.recursiveMapBuffer(arr,times)
      }
    })
    return tsmap
  },
  nestedDataSelector: function(fields) {
    var fields = fields;
    return function(data) {
      
      var data = data,
        timeToKey = function(x) {
          x.time = x.key
          return x
        }

      return function(segment) {
        var keys = fields.object_fields.map(function(x){return segment[x]}),
          selected = data;

        keys.map(function(field) {
          selected = selected[field] || {}
        })

        var result = d3.map(selected).entries().map(timeToKey)

        return result.length ? result : false
      }
    }
  }
}

RB.defaults= {
  timeseries: "?format=json&wide=timeseries&include=date",
  paths: {
    pixel_reporting: "/pixel",
    conversion_reporting: "/admin/advertiser/conversion/reporting",
    campaign_conversion_reporting: "/campaign_conversion",
    advertiser_reporting: "/admin/advertiser/viewable/reporting"
  }

}

RB.__data__ = {}

RB.websocket = (function(rb){
  var self = rb,
    ws;
  
  return {
    addSubscription: function(stream,filter,callback) {

      var hash = btoa(
        self.websocket.streams.length + "," + 
        self.websocket.filters.length + "," + 
        self.websocket.message_handlers.length
      )

      self.websocket.streams.push(stream)
      self.websocket.filters.push(filter)
      self.websocket.message_handlers.push(callback)

      return hash
    },
    removeSubscription: function(hash) {
      var arr_pos = self.websocket.hashes.indexOf(hash)
      self.websocket.streams.splice(arr_pos,1)
      self.websocket.filters.splice(arr_pos,1)
      self.websocket.message_handlers.splice(arr_pos,1)
      
    },
    streams: [],
    filters: [],
    hashes: [],
    subscribe: function() {
      var uniq = unique(self.websocket.streams)
      var subscriptions = { streams: uniq }

      self.websocket.filters.map(function(x){
        var current = subscriptions[x.name] || []
        if (x.values[0]) {
          current.push(x.values[0])
          subscriptions[x.name] = current
        }
      })

      ws.send(JSON.stringify(subscriptions))
    },
    on_message: function(x){
      var data = JSON.parse(x.data)

      self.websocket.unique_handlers().map(function(fn){
        fn(data)
      })
    },
    connect: function(){

      if (!self.websocket.is_connected) {
      
        ws = new WebSocket("ws://localhost:8080/admin/websocket?id=" + 1234);
        ws.onopen = function() {
          self.websocket.is_connected = 1
          ws.send("initialize");
          ws.send("start");
        };
        ws.onmessage = self.websocket.on_message
        ws.onclose = function() {
          self.websocket.is_connected = 0
          console.log("disconnected");
        }
        self.websocket.ws = ws
      }
    },
    unique_handlers: function(){
      var uniques = {}
      self.websocket.message_handlers.map(function(d){
        uniques[d.name] = d.callback
      })
      return Object.keys(uniques).map(function(k){return uniques[k]})
    },
    message_handlers: [],
    is_connected: 0,
    ws: false,
    buildBufferedWrapper: function(steps,transformer) {

      var transformer = transformer || function(time,json) { return {"time":time,"value":json} }     

      var Wrapper = function(_obj,_steps) {
        var wrap = this;
        this.callbacks = []
        this.t = 0
        this.buffer = d3.range(steps).map(function(){
          wrap.t++;
          return {"time":wrap.t,"value":[]}
        })
        this.add = function(data) {
          this.t++;
          this.buffer.shift()
          this.buffer.push(transformer(this.t,data))
          this.callbacks.map(function(cb) { cb(wrap.buffer) })
        }
        
      }

      return new Wrapper(steps,transformer)
    
    }
  }
})(RB)

RB.data = (function(rb) {
  var self = rb,
    stored_data = rb.__data__

  return {
    campaign_conversion_reporting: function(advertiser,callback,order,url_override) {
      var start = self.helpers.get_start_date(),
        BASE    = url_override || self.defaults.paths.campaign_conversion_reporting,
        URL     = BASE + self.defaults.timeseries + "&start_date=" + start + "&advertiser=" + advertiser
        order   = order || "conv";

      if (stored_data[URL]) {
        callback(stored_data[URL])
      } else {
        d3.json(URL,function(data){

          reporting = d3.nest()
            .key(function(d) {return d.conv_id})
            .key(function(d) {return d.campaign })
            .entries(data)

          if (order) {
            reporting.map(function(x){
              v.values = x.values.sort(self.helpers.order_by_nested(order))
              x.values.map(function(y,i) {
                y.name = y.key;
                y.position = i
              })
            })
          }

          callback(reporting)
          
        })
      }
    },
    domain_list_reporting: function(advertiser,callback,order,url_override) {
      var start = self.helpers.get_start_date(),
        BASE    = url_override || self.defaults.paths.advertiser_reporting,
        URL     = BASE + self.defaults.timeseries + "&start_date=" + start + "&advertiser_equal=" + advertiser + 
          "&meta=type&include=type,date&fields=loaded,served,visible",
        order   = order || "served";

      if (stored_data[URL]) {
        callback(stored_data[URL])
      } else {
        d3.json(URL,function(data){

          reporting = d3.nest()
            .key(function(d) {return d.type})
            .entries(data)

          if (order) {
            reporting.sort(self.helpers.order_by_nested(order))
            reporting.map(function(x,i){ x.position = i })
          }

          callback(reporting)
          
        })
      }
    },
    venue_reporting: function(advertiser,callback,order,url_override) {
      var start = self.helpers.get_start_date(),
        BASE    = url_override || self.defaults.paths.advertiser_reporting,
        URL     = BASE + self.defaults.timeseries + "&start_date=" + start + "&advertiser_equal=" + advertiser + 
          "&meta=none&include=venue,date&fields=loaded,served,visible",
        order   = order || "served";

      if (stored_data[URL]) {
        callback(stored_data[URL])
      } else {
        d3.json(URL,function(data){

          reporting = d3.nest()
            .key(function(d) {return d.venue})
            .entries(data)

          if (order) {
            reporting.sort(self.helpers.order_by_nested(order))
            reporting.map(function(x,i){x.position = i})
          }

          callback(reporting)
          
        })
      }
    },
    tag_reporting: function(advertiser,callback,order,url_override) {
      var start = self.helpers.get_start_date(),
        BASE    = url_override || self.defaults.paths.advertiser_reporting,
        URL     = BASE + self.defaults.timeseries + "&start_date=" + start + "&advertiser_equal=" + advertiser + 
          "&meta=none&include=tag,date&fields=loaded,served,visible",
        order   = order || "served";

      if (stored_data[URL]) {
        callback(stored_data[URL])
      } else {
        d3.json(URL,function(data){

          reporting = d3.nest()
            .key(function(d) {return d.tag})
            .entries(data)

          if (order) {
            reporting.sort(self.helpers.order_by_nested(order))
            reporting.map(function(x,i){x.position = i})
          }

          callback(reporting)
          
        })
      }
    },
    campaign_reporting: function(advertiser,callback,order,url_override) {
      var start = self.helpers.get_start_date(),
        BASE    = url_override || self.defaults.paths.advertiser_reporting,
        URL     = BASE + self.defaults.timeseries + "&start_date=" + start + "&advertiser_equal=" + advertiser + 
          "&meta=none&include=campaign,date&fields=loaded,served,visible",
        order   = order || "served";

      if (stored_data[URL]) {
        callback(stored_data[URL])
      } else {
        d3.json(URL,function(data){

          reporting = d3.nest()
            .key(function(d) {return d.campaign})
            .entries(data)

          if (order) {
            reporting.sort(self.helpers.order_by_nested(order))
            reporting.map(function(x,i){x.position = i})
          }

          callback(reporting)
          
        })
      }
    },
    advertiser_reporting: function(advertiser,callback,order,url_override) {
      var start = self.helpers.get_start_date(),
        BASE    = url_override || self.defaults.paths.advertiser_reporting,
        URL     = BASE + self.defaults.timeseries + "&start_date=" + start + "&advertiser_equal=" + advertiser + 
          "&meta=none&include=advertiser,date&fields=loaded,served,visible",
        order   = order || "num_conv";

      if (stored_data[URL]) {
        callback(stored_data[URL])
      } else {
        d3.json(URL,function(data){

          reporting = d3.nest()
            .key(function(d) {return "advertiser"})
            .entries(data)

          if (order) {
            reporting.sort(self.helpers.order_by_nested(order))
            reporting.map(function(x,i){x.position = i})
          }

          callback(reporting)
          
        })
      }
    }, 
    conversion_reporting: function(advertiser,callback,order,url_override) {
      var start = self.helpers.get_start_date(),
        BASE    = url_override || self.defaults.paths.conversion_reporting,
        URL     = BASE + self.defaults.timeseries + "&start_date=" + start + "&advertiser=" + advertiser + "&meta=rbox_vs_total",
        order   = order || "num_conv";

      if (stored_data[URL]) {
        callback(stored_data[URL])
      } else {
        d3.json(URL,function(data){

          reporting = d3.nest()
            .key(function(d) {return d.conv_id})
            .entries(data)

          if (order) {
            reporting.sort(self.helpers.order_by_nested(order))
            reporting.map(function(x,i){x.position = i})
          }

          callback(reporting)
          
        })
      }
    },
    pixel_reporting: function(advertiser,callback,order,url_override) {
      var start = self.helpers.get_start_date(),
        BASE    = url_override || self.defaults.paths.pixel_reporting,
        URL     = BASE + self.defaults.timeseries + "&start_date=" + start + "&advertiser=" + advertiser,
        order   = order || "imps";

      if (stored_data[URL]) {
        callback(stored_data[URL])
      } else {
        d3.json(URL,function(data){

          reporting = d3.nest()
            .key(function(d) {return d.segment})
            .entries(data)

          if (order) {
            reporting.sort(self.helpers.order_by_nested(order))
            reporting.map(function(x,i){x.position = i})
          }

          callback(reporting)
          
        })
      }
    }
  }
})(RB)

RB.objects = (function(rb) {

  var self = rb;

  return {
    streaming: {
      buffered_row: function(row,rowFilter,name_key,data_fields,object_fields) {

        var fields = {
          name_field: name_key,
          data_fields: data_fields,
          object_fields: object_fields,
          data_field: data_fields[data_fields.length-1],
          object_field: object_fields[object_fields-1]
        }


        var pixel_bars = row
          .append("div")
          .classed("col-md-6 pixel-row-wrapper",true)

        var rows = pixel_bars.append("div").classed("row",true).selectAll("div")
          .data(rowFilter)
          .enter()
            .append("div")
            .attr("id",function(x){return x[fields.name_field] })

        var col = rows.append("div").classed("col-md-6 pixel-row-name",true)

        col.append("div")
          .style("font-size","13px").style("height","13px")
          .style("padding","6px").style("vertical-align","bottom")
          .text(function(x){return x[fields.name_field] })

        var bar_wrapper   = rows.append("div").classed("col-md-3 min-height",true)
        var count_wrapper = rows.append("div").classed("col-md-1",true)
         
        

        var axisTransform = function(obj) {

          return function(data) {
            var filtered = data.value.filter(function(x){ 
              return x[fields.data_fields[0]] == obj[fields.object_fields[0]]
            })
            return {"time":data.time,"value":filtered.length}
          }   
        }

        var STEPS = 60,
          BAR_WIDTH = 2,
          HEIGHT = 22;

        var transform = RB.helpers.nestedDataSelector(fields)


        var buffered_wrapper = RB.websocket.buildBufferedWrapper(STEPS);
        var graph = RB.objects.streaming.graph(
          bar_wrapper,
          BAR_WIDTH,
          HEIGHT,
          buffered_wrapper.buffer,
          transform,
          axisTransform
        )

        buffered_wrapper.callbacks.push(function(x){

          var flattened = [].concat.apply([],x.map(function(x){ 
            x.value.map( function(y) { y.time = x.time }); 
            return x.value
          }))

          var toNest = d3.nest(), 
            nest_keys = [].concat(fields.data_fields).concat(["time"]) 

          nest_keys.map(function(f){
            toNest.key(function(x){return x[f]})
          })
          
          var m = toNest.map(flattened),
            times = x.map(function(y){return y.time})

          m = RB.helpers.recursiveMapBuffer(m,times)

          var bound = count_wrapper.selectAll("div").data(function(d){
            var data = transform(m)(d) || []
            var count = data.reduce(function(p,c){ return c.value + p},0)
            return [count]
          })

          bound.enter().append("div").text(function(x){return x})
          bound.text(function(x){return x})

          // TODO: need a way of limiting which graphs get updated at this step
          // otherwise we wend up selecting and binding too many rows
          // potentially use the count to say a graph is considered "active"
          var counts_filter = function(d) {
            var data = transform(m)(d) || []
            var count = data.reduce(function(p,c){ return c.value +p},0)
            return count
          }
          
          graph(m,counts_filter)
        })

        return buffered_wrapper
      },
      graph: function(obj,width,height,data,transform,axisTransform) {
        var useRedrawAxis = !!axisTransform,
          original_data = JSON.parse(JSON.stringify(data));

        var w = width || 5, h = height || 80,
          transform = transform || function(x) {return x},
          axisTransform = axisTransform || function(x) {return x};

        var x = d3.scale.linear().domain([0, 1]).range([0, w]),
          y = d3.scale.linear().domain([0, 10]).range([0, h]),
          yAxisScale = d3.scale.linear().domain([0, 10]).range([h, 0]),
          yAxis = d3.svg.axis().scale(yAxisScale).orient("left").ticks(1); 

        var wrapper = obj.append("svg")
           .attr("class", "chart row")
           .attr("width", w * data.length - 1 + 20)
           .attr("height", h + 8);

        var yAxisDrawn = wrapper.append("g")
          .attr("height", h + 6)
          .attr("class","mg-y-axis axis") 
          .attr("transform", "translate(" + 15 + ",4)")
          .call(yAxis);

        var chart = wrapper.append("g")
          .attr("transform","translate(" + 18 + ",4)")

        chart.selectAll("rect")
           .data(original_data)
         .enter().append("rect")
           .attr("x", function(d, i) { return x(i) - .5; })
           .attr("y", function(d) { return h - y(d.value) - .5; })
           .attr("width", w)
           .attr("height", function(d) { return y(d.value); });

        chart.append("line")
           .attr("x1", 0)
           .attr("x2", w * data.length)
           .attr("y1", h + 0)
           .attr("y2", h + 0)
           .style("stroke", "#ccc");

        var calcY = function(d) { 
          var y = this.parentNode.previousSibling.__chart__; 
          return y(d.value) - .5; 
        }
        var calcHeight = function(d) { 
          var y = this.parentNode.previousSibling.__chart__; 
          return h - y(d.value); 
        }

        var redrawAxis = function(groups) {
          var maxes = groups.map(function(group){
            var rep = (group.length) ? group[0].__data__ : false,
              format = rep ? axisTransform(rep) : false;

            var arr = format ? 
                data.map(format).map(function(y){return y.value}) : 
                data.map(function(){return 0});

            return d3.max(arr)
          })

          groups.map(function(group,i){
            var y = d3.scale.linear().domain([0, maxes[i]]).range([h, 0])
            group.map(function(x){ x.__newchart__ = y })
          })

          return yAxis(groups)
        }

        var redraw = function(data,counts_filter) {
          //var max = d3.max(data.map(function(x){ return x.value.length }))
          var max = 10,
            counts_filter = counts_filter || function(){return true}

          y.domain([0, max])
          yAxisScale.domain([0,max])

          var customAxis = useRedrawAxis ? redrawAxis : yAxis

          yAxisDrawn.filter(counts_filter).call(customAxis)

          var selected = chart.filter(counts_filter)

          var rect = selected.selectAll("rect")
            .data(function(d){
              var dd = transform(data)(d);
              // this should prevent the redraw for the actual chart
              return dd ? dd : original_data;
           }, function(d) { return d.time; });

          rect.enter().insert("rect", "line")
            .attr("x", function(d, i) { return x(i + 1) - .5; })
            .attr("y", calcY)
            .attr("width", w)
            .attr("height", calcHeight)
          .transition()
            .duration(1)
            .attr("x", function(d, i) { return x(i) - .5; })
            .attr("y", calcY)
            .attr("height", calcHeight)

          rect.transition()
            .duration(1)
            .attr("x", function(d, i) { return x(i) - .5; })
            .attr("y", calcY)
            .attr("height", calcHeight)

          rect.exit().transition()
            .duration(1)
            .attr("x", function(d, i) { return x(i - 1) - .5; })
            .remove(); 
        }
        
        return redraw
      },
    },
    timeseries: {
      graph: function(obj,limit_series,title_prefix) {

        var chart_obj = obj
          .classed("chart",true)
          .style("height","100%")

        
        chart_obj.append("div")
          .classed("legend",true)
          .attr("id",function(x){
            return "legend" + x.id
          })

        var chart = chart_obj.append("div")
          .classed("chart",true)
          .attr("id",function(x){
            return "chart" + x.id
          })
          .style("height",function(){ return chart_obj.style("height")})

        var helper = chart_obj.append("div")
          .classed("chart-helper",true)
          .html(function(x){
            var values = x.values

            if (limit_series) {
              values = values.map(function(z){
                y = { "date":z.date }
                limit_series.map(function(m){ y[m.name] = z[m.key] })
                return y
              })
            }

            var keys = Object.keys(values[0]).filter(function(x){return x != "date"})

            var build = function() {
               MG.data_graphic({
                title: title_prefix + " &mdash; " + x.title,
                data: values,
                full_width: true,
                right: 20,
                full_height: true,
                top:20,
                bottom:20,
                legend: keys,
                legend_target: '#legend' + x.id,
                target: '#chart' + x.id,
                x_accessor: 'date',
                y_accessor: keys
              })
            }

            build()
            
          })
      },

      multiSeriesGraph: function(obj,series,title_prefix,initial_position,outer,height) { 

        var position = initial_position || 0,
          height = height || 150

        var chart_obj = obj.selectAll("div")
          .data(function(data){
            var values = data[position]
            //console.log(values ? [data[position]] : [])
            return values ? [data[position]] : []
          })

        chart_obj.enter()
            .append("div")

        self.objects.timeseries.graph(
          chart_obj,
          series,
          title_prefix,
          height
        )

        
  
      },
      graphWithTable: function(d) {

        var build = function(wrapper,data_key,graph_series,table_series,title) {

          var graphWrapper = wrapper.classed("chart-table-wrapper",true)
            .selectAll("div")
            .data(self.helpers.timeseries_transform(data_key))
              .enter()
              .append("div") 
              .classed("chart-wrapper","true")
              .style("height","200px")
              .style("padding-bottom","50px")

          var tableWrapper = wrapper.append("div").classed("table-wrapper",true)
            .append("table")
            .classed("table table-condensed table-hover",true) 

          var boundGraphArea = self.objects.timeseries.multiSeriesGraph.bind(false,graphWrapper,graph_series,title)

          boundGraphArea(0)
          self.objects.table(tableWrapper,data_key,table_series,boundGraphArea)

        }

        build(
          d.wrapper, 
          d.data_key, 
          d.graph_series, 
          d.table_series, 
          d.title
        )  
      }
    },
    table: function(obj,data_key,columns,onclick) {
      var th = obj.append("thead").append("tr");

      columns.map(function(x){ th.append("th").text(x.header) })

      var tr = obj
        .append("tbody")
        .selectAll("tr")
        .data(function(d){ return d[data_key] })
        .enter()
          .append("tr")
          .attr("id",function(x){return x.key})

      if (onclick) {
        tr.on("click",function(x){
          obj.selectAll("td").classed("active",false)
          d3.select(this).selectAll("td").classed("active",true) 
          console.log(x)
          onclick(x.position,x)
        })
      }

      columns.map(function(x) {
        tr.append("td").text(function(d){
          if (typeof(x.key) == "string") {
            return d[x.key]
          } else if (x.key.length > 1 && x.formatter) {
            var args = x.key.map(function(q) { return d.values[0][q] })
            return x.formatter.apply(false,args)
          } else {
            return (x.formatter) ? 
              x.formatter(d.values[0][x.key[0]]) : 
              d.values[0][x.key[0]]
          }
        }).classed("active",function(x){
          return x.position == 0
        })
      })
    }
  }

})(RB)


