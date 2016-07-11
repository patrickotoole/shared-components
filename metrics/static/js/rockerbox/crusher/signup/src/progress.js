import accessor from './helpers'

function UglyAssCssTemplate() {
/*
.arrow-steps .step {
	font-size: 12px;
        line-height: 12px;
	text-align: center;
	color: white;
	cursor: default;
	margin: 0 3px;
	padding: 3px 15px 3px 23px;
	min-width: 30px;
	float: left;
	position: relative;
	background-color: #d9e3f7;
	-webkit-user-select: none;
	-moz-user-select: none;
	-ms-user-select: none;
	user-select: none; 
  transition: background-color 0.2s ease;
  margin-right:-6px;
  border-top: 1px solid white;
  border-bottom: 1px solid white;

}

.arrow-steps .step.selected {
  font-weight:bold;
  color: #fff;
}

.arrow-steps .step:after,
.arrow-steps .step:before {
	content: " ";
	position: absolute;
	top: 0;
	right: -8px;
	width: 0;
	height: 0;
	border-top: 10px solid transparent;
	border-bottom: 7px solid transparent;
	border-left: 7px solid #d9e3f7;	
	z-index: 2;
  transition: border-color 0.2s ease;
}

.arrow-steps .step:before {
	right: auto;
	left: 5px;
	border-left: 7px solid white ;	
        border-left-opacity: .1;
	z-index: 0;
}

.arrow-steps .step:first-child:before {
	border: none;
}
.arrow-steps .step:last-child:after {
	border: none;
} 
.arrow-steps .step:last-child {
        padding-left:23px;
        padding-right:20px;
        border-right: 1px solid white;
	border-top-right-radius: 4px;
	border-bottom-right-radius: 4px;
}

.arrow-steps .step:first-child {
        padding-left:16px;
        padding-left:16px;
        border-left: 1px solid white;
	border-top-left-radius: 4px;
	border-bottom-left-radius: 4px;
}

.arrow-steps .step span {
	position: relative;
}

.arrow-steps .step span:before {
	opacity: 0;
	content: "i";
	position: absolute;
	top: -2px;
	left: -20px;
}

.arrow-steps .step.done span:before {
	opacity: 1;
	-webkit-transition: opacity 0.3s ease 0.5s;
	-moz-transition: opacity 0.3s ease 0.5s;
	-ms-transition: opacity 0.3s ease 0.5s;
	transition: opacity 0.3s ease 0.5s;
}

.arrow-steps .step.current {
	color: #fff;
	background-color: #23468c;
}

.arrow-steps .step.current:after {
	border-left: 7px solid #23468c;	
}
/**/
}

export function Progress(target) {
  this._target = target;
  this._on = {}
}

export default function progress(target) {
  return new Progress(target)
}

Progress.prototype = {
    draw: function() {
      d3_updateable(d3.select("head"),"style#arrows","style")
        .attr("id","arrows")
        .text(
          String(UglyAssCssTemplate)
            .split("/*")[1]
            .replace(/#d9e3f7/g,"#38abdd")
            .replace(/white/g,"rgba(208,208,208,.7)")
            .replace("#666","white")
        )

      this._progress = d3_updateable(this._target,".arrow-steps","div")
        .classed("arrow-steps",true)
        .style("padding-top","29px")
        .style("padding-right","30px")

      var self = this;

      this._arrows = d3_splat(this._progress,".step","div",this._data,function(x,i){return i})
        .classed("step",true)
        .classed("selected",function(x,i) { return i == self._selected})
        .style("width","30px")
        .text(function(x,i){ return i + 1 })
        .on("click", function(x,i) {
          return self._on["click"](i)
        })


      return this
    }
  , text: function(val) { return accessor.bind(this)("text",val) }
  , data: function(val) { return accessor.bind(this)("data",val) }
  , selected: function(val) { return accessor.bind(this)("selected",val) }
  , update: function(val) {
      this.text(val)
      this.draw()
    }
  , on: function(action, fn) {
      if (fn === undefined) return this._on[action];
      this._on[action] = fn;
      return this
    }
}
