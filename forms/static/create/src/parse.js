export function ProcessCSV(csv) {
  this.result = csv
}

ProcessCSV.prototype = {
    headers: function() {

      var split = this.result.split("\n")[0]

      var lower_cased = split.toLowerCase()
        .replace(/%/,"").replace(/\(/g,"")
        .replace(/\)/g,"")
        .split(",")
        .map(function(x) { return x.trim().replace(/ /g,"_") })

      lower_cased = lower_cased.map(function override_names(x) {
        console.log(x)
        return x == "sellers" ? "seller_id" : x
      })

      return lower_cased
      
    }
  , data: function() {
      var headers = this.headers().join(",")
      var tabular = this.result.split("\n").slice(1).join("\n") 

      var r = headers + "\n" + tabular

      var datum = d3.csv.parse(r, function(d){ return d; });

      return datum
    }
}

function parse(csv) {
  return new ProcessCSV(csv)
}

parse.prototype = ProcessCSV.prototype;

export default parse;
