import {d3_updateable, d3_splat} from 'helpers'
import accessor from '../helpers'
import header from '../generic/header'
import * as timeseries from '../generic/timeseries'

import table from 'table'
import {domain_expanded} from 'component'
import {domain_bullet} from 'chart'

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

      var t = table(_explore)
        .top(140)
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
        .on("expand",function(d,td) {

          var dd = this.parentElement.__data__.full_urls.filter(function(x) { return x.domain == d.key})
          var rolled = timeseries.prepData(dd)
          
          domain_expanded(td)
            .domain(dd[0].domain)
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
      if (fn === undefined) return this._on[action] || noop;
      this._on[action] = fn;
      return this
    }
}
