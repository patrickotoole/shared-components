import accessor from '../helpers'
import header from '../generic/header'
import * as timeseries from '../timeseries'

import table from 'table'
import domain_expanded from './domain_expanded'
import domain_bullet from './domain_bullet'

function noop() {}
function identity(x) { return x }
function key(x) { return x.key }


export function DomainView(target) {
  this._on = {
    select: noop
  }
  this.target = target
}



export default function domain_view(target) {
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
          var rolled = timeseries.prepData(dd)
          
          domain_expanded(td)
            .data(rolled)
            .urls(d.urls)
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
      if (fn === undefined) return this._on[action] || noop;
      this._on[action] = fn;
      return this
    }
}
export default domain_view;
