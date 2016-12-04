import 'd3'
import 'start'
import accessor from '../helpers'
import message from '../message'


export function IntegrationsExample(target) {
  this._target = target;

  var self = this;
  this._on = {
      "success": function(x) { /* should override with success event (next) */ }
    , "fail" : function(err) { self._message.update("Error: " + err)}
  }
}

export default function integrations_example(target) {
  return new IntegrationsExample(target)
}

IntegrationsExample.prototype = {
    draw: function() {

      this.render_stage()
      this.render_envelope()
      //this.render_message()

      return this
    }
  , render_stage: function() {
      this._stage = start.stage(this._target)
        .title("Congrats!")
        .subtitle("You'll start to receive the Hindsight Daily Digest in the slack channel you setup.")
        .left("")
        .right("")
        .draw()
    }
  , render_envelope: function() {
      var iwrap = d3_updateable(this._stage._stage,".img","div")
        .classed("img pull-left",true)
        .style("width"," 50%")
        .style("border"," 10px solid white")

      d3_updateable(iwrap,"img","img")
        .attr("src","/static/img/demos/slack-screenshot.png")
        .style("width","100%")

      d3_updateable(d3.select(this._target.selectAll(".row")[0][1]),".section_subtitle.number2","div")
        .classed("section_subtitle number2 pull-left",true)
        .style("padding-top","50px")
        .style("width","50%")
        .html("Now your whole team can see the most important articles that your audience is reading.")
         

    }
  , render_message: function() {
      this._message = message(this._row)
        .text("")
        .draw()
    }
  , text: function(val) { return accessor.bind(this)("text",val) }
  , data: function(val) { return accessor.bind(this)("data",val) }
  , on: function(action, fn) {
      if (fn === undefined) return this._on[action];
      this._on[action] = fn;
      return this
    }
}

