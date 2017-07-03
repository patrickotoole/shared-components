import 'd3'
import 'start'
import accessor from '../helpers'
import message from '../message'


export function Example(target) {
  this._target = target;

  var self = this;
  this._on = {
      "success": function(x) { /* should override with success event (next) */ }
    , "fail" : function(err) { self._message.update("Error: " + err)}
  }
}

export default function example(target) {
  return new Example(target)
}

Example.prototype = {
    draw: function() {

      this.render_stage()
      this.render_envelope()
      //this.render_message()

      return this
    }
  , render_stage: function() {
      this._stage = start.stage(this._target)
        .title("Congrats!")
        .subtitle("You'll start to receive the Hindsight Daily Digest in the next few days.")
        .left("<div class='codepeek_text'>The Hindsight Daily Digest will show you the most popular content your audience is reading.<br><br></div>")
        .right("<div class='codepeek_text'>Understanding what content your audience is reading and where you should be engaging.</div>")
        .draw()
    }
  , render_envelope: function() {
      var iwrap = d3_updateable(this._stage._stage,".img","div")
        .classed("img pull-left",true)
        .style("width"," 50%")
        .style("border"," 10px solid white")

      d3_updateable(iwrap,"img","img")
        .attr("src","/static/img/demos/hindsight-email.png")
        .style("width","100%")

      
         

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

