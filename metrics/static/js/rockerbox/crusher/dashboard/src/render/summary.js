import table from 'table'

export default function(_top,data) {
      d3_updateable(_top, "h3.summary-head","h3")
        .classed("summary-head",true)
        .style("margin-bottom","15px")
        .style("margin-top","-5px")
        .text("Summary")
    
      var summary = d3_updateable(_top,".search-summary","div",false, function(x) { return 1})
        .classed("search-summary",true)
        .style("min-height","90px")

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

      if (!this._reduced) {

        this._reduced = this._data.full_urls.reduce(function(p,c) {
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

        this._reduced.domains = Object.keys(this._reduced.domains).length
        this._reduced.articles = Object.keys(this._reduced.articles).length

      }

      var data_summary = {}
      Object.keys(reduced).map(function(k) {
        data_summary[k] = {
            sample: reduced[k]
          , population: this._reduced[k]
        }
      }.bind(this))

      summary//.datum(data_summary)
        //.text(JSON.stringify)

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

      var radius_scale = d3.scale.linear()
        .domain([data_summary.domains.population,data_summary.views.population])
        .range([20,35])

      var buildPie = function(x) {
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

      table.table(summary)
        .data({"key":"T","values":[data_summary]})
        .skip_option(true)
        .render("domains",buildPie)
        .render("articles",buildPie)
        .render("sessions",buildPie)
        .render("views",buildPie)
        .draw()


      // domains
      // articles
      // sessions
      // views


    }
