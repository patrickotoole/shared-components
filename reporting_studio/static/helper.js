function make_table(selection, columns, data){

  var table = selection.append('table').classed('table',true)
  
  thead = table.append('thead')

  thead.append('tr')
   .selectAll('th')
   .data(columns).enter()
   .append('th')
   .text(function(x){return x['name']});
  
  
  tbody = table.append('tbody')

  
  var trows = tbody
    .selectAll('tr')
    .data(data).enter()
    .append('tr')
  
  
  trows.selectAll('td')
    .data(function(row) {
        return columns.map(function(c){
            var cell = {}
            cell['name'] = c['name']
            cell['value'] = c['formatter'] ? c['formatter'](row[c['name']]) : row[c['name']]
            cell['class']= c['class']
            cell['type'] = c['type']
            cell['text'] = c['text']
            
            return cell 
        })
    })
    .enter()
    .append('td')
    .attr('class',function(x){
            return x['class']
    })
    .text(function(x){
        var k = x['text']!= null ? x['text'] : x['value']
        return k
  })
  trows.selectAll('td').append(function(d){
        return document.createElement(d['type'])
  })
  
  return table

}

function getParameterByName(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}
