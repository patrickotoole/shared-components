var buildCampaigns = (function() {

  var states = ["", "active", "inactive"];

  function getCampaigns(wrapper) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", '/campaign?format=json', true);
    xhr.onreadystatechange = function() {
      if (xhr.readyState == 4) {
        var resp = xhr.responseText,
          jdata = JSON.parse(resp);
        
        addNewData(jdata,false,wrapper);
      }
    }
    xhr.send();
  }

  function addNewData(jdata,newData,wrapper) {
    console.log(wrapper,jdata)
    var wrapper = wrapper || d3.select("#content").selectAll(".wrapper")

    var content_wrapper = wrapper

    var pixel_group = wrapper.append("div")
      .classed("panel-sub-heading pixel-reporting list-group",true)

    var header = pixel_group.append("div").classed("list-group-item",true)
      .append("div").classed("row",true)

    header.append("div").classed("col-md-6",true)
      .text("Campaign controls")

    header.append("div")
      .classed("col-md-6 text-right",true)
      .attr("id","flash")
     

    var body = wrapper.selectAll(".panel-body")
      .data([jdata])
      .enter()
        .append("div")
        .classed("panel-body",true)
        .style("margin-top","-15px")

    

    makeTable(body) 

    startEditable();
  }

  function makeTable(body) {
    var table = body.append("table")
      .classed("table table-condensed table-hover",true)

    var thead = table.append("thead").append("tr")

    var headers = ["ID","Name","Base Bid","Daily Budget","State","Remove"]
    headers.map(function(x){
      thead.append("th").text(x)
    })


    var tbody = table.append("tbody")
    var tableRow = tbody.selectAll("tr")
      .data(function(d){return d}); 

    tableRow.enter()
      .insert("tr", ":first-child")

    addNewRows(tableRow);
    tableRow.exit().remove();
  }

  function addNewRows(tableRow) {

    var entries = ["id","name","base_bid","daily_budget","state","remove"];
    var values = {
      "state": function(entry,data) {
        return data[entry] === "active" ? "1" : "2"
      }
    }
    var titles = {
      "state": "Select state",
      "base_bid": "Enter bid",
      "daily_budget": "Enter budget",
      "comments": "Enter a comment"
    }

    entries.map(function(entry) {
      if (titles[entry]) { 
        tableRow.append("td")
          .append("a")
          .attr("href","#")
          .attr("data-name",entry)
          .attr("data-pk",function(x){return x.id})
          .attr("data-value",function(x){
            var fn = values[entry] 
            return fn ? fn(entry,x) : ""
          })
          .attr("data-title",titles[entry])
          .classed("editable editable-click",true)
          .classed(entry,true)
          .text(function(d){return d[entry]})
      } else {
        tableRow.append("td")
          .classed(entry,true)
          .text(function(d){return d[entry]})
      }
    })
    
  }

  function startEditable() {
    $.fn.editable.defaults.mode = 'popup';
    $(document).ready(function() {
        $('.state').editable({
          type: "select",
          showbuttons: false,
          source:[
            {value: 1, text: states[1]}, 
            {value: 2, text: states[2]}
          ],
          success: function(response, newValue) { sendToServer(response, newValue, this); }
        });
        $('.base_bid').editable({
          type: "text",
          showbuttons: false,
          validate: function(value) {
            if (!$.isNumeric(value)) {
              return "Bid must be numeric";
            } else if (parseInt(value) < 0 || parseInt(value) > 20) {
              return "Bid must be between 0 and 20";
            }
          },
          success: function(response, newValue) { sendToServer(response, newValue, this); }
        });
        $('.daily_budget').editable({
          type: "text",
          showbuttons: false,
          validate: function(value) {
            if (!$.isNumeric(value)) {
              return "Budget must be numeric";
            } else if (parseInt(value) < 0 || parseInt(value) > 500) {
              return "Budget must be between 0 and 500";
            }
          },
          success: function(response, newValue) { sendToServer(response, newValue, this); }
        });
        $('.comments').editable({
          type: "text",
          showbuttons: false,
          success: function(response, newValue) { sendToServer(response, newValue, this); }
        });
    });
    $(".remove").addClass("glyphicon glyphicon-remove-circle").css("display","table-cell").css("padding-left","25px").on("click",function(x){
      var should = confirm("Are you sure you want to delete this campaign?")

      if (should) {
        var selection = d3.select(x.currentTarget)
        var obj = { 
          "campaign":{
            "id": selection.data()[0].id,
            "state":"inactive",
            "comments":"deleted"
          }
        }

        put( "/campaign?format=json&id=" + obj.campaign.id, obj, function(){ $(x.currentTarget).parent().remove() })
      }

    })
  }

  function put(url, obj, callback) {
    var loadingInterval;
    var xhr = new XMLHttpRequest();
    var callback = callback || function(){}

    xhr.open("PUT", url, true);
    xhr.setRequestHeader("Content-type", "application/json");
    xhr.onreadystatechange = function() {
        
        if(xhr.readyState == 4 && xhr.status == 200) {
          clearInterval(loadingInterval);

            var text = "Changes saved!",
              color = "lime"

            if (JSON.parse(xhr.responseText)[0]['error']) {
              text = "Error: " + JSON.parse(xhr.responseText)[0]['error']
              color = "red"
            }
            
            d3.select("#flash").text(text)
              .style("visibility","visible").style("color",color)
              .transition()
                .duration(1500)
                .style("color", "black")
            callback()

        } else if (xhr.readyState == 4 && xhr.status != 200) {
          clearInterval(loadingInterval);
          d3.select("#flash").text("Changes failed, please contact support.")
            .style("visibility","visible").style("color","red")
            .transition()
              .duration(1500)
              .style("color", "black");
        }
    }

    xhr.send(JSON.stringify(obj));

    loadingFlash();
    loadingInterval = setInterval(function() {
        loadingFlash();
    }, 500);
  }
  

  function sendToServer(response, newValue, thisNode) {
    var selection = d3.select(thisNode);
    var obj = {"campaign":{}};
    obj["campaign"]["id"] = parseInt(selection.attr("data-pk"));
    if (selection.attr("data-name") !== "state") {
      obj["campaign"][selection.attr("data-name")] = $.isNumeric(newValue) ? parseFloat(newValue) : newValue;
    } else {
      obj["campaign"][selection.attr("data-name")] = states[parseInt(newValue)];
    }
    console.log(obj);

    var loadingInterval;
    var xhr = new XMLHttpRequest();
    var url = "/campaign?id=" + selection.attr("data-pk");
    if (selection.attr("data-name") === "state") {
      url += "&state=" + states[parseInt(newValue)];
    }
    url += "&format=json";

    xhr.open("PUT", url, true);
    xhr.setRequestHeader("Content-type", "application/json");

    xhr.onreadystatechange = function() {
        
        if(xhr.readyState == 4 && xhr.status == 200) {
          clearInterval(loadingInterval);

            var text = "Changes saved!",
              color = "lime"

            if (JSON.parse(xhr.responseText)[0]['error']) {
              text = "Error: " + JSON.parse(xhr.responseText)[0]['error']
              color = "red"
            }
            
            //console.log(xhr.responseText);
            d3.select("#flash")
                .text(text)
                .style("visibility","visible")
                .style("color",color)
                .transition()
                .duration(1500)
                  .style("color", "black")

        } else if (xhr.readyState == 4 && xhr.status != 200) {
          clearInterval(loadingInterval);
          d3.select("#flash")
                .text("Changes failed, please contact support.")
                .style("visibility","visible")
                .style("color","red")
                .transition()
                .duration(1500)
                .style("color", "black");
        }
    }

    if (selection.attr("data-name") !== "state") {
      xhr.send(JSON.stringify(obj));
    } else {
      xhr.send();
    }
    loadingFlash();
    loadingInterval = setInterval(function() {
        loadingFlash();
    }, 500);
  }

  var loadingFlashNumber = 0;
  var loadingFlashArray = ["Loading", "Loading.", "Loading..", "Loading..."];
  function loadingFlash() {
    console.log(d3.select("#flash"))
    d3.select("#flash")
      .text(loadingFlashArray[loadingFlashNumber])
      .style("visibility","visible")
      .style("color","black");
    if (loadingFlashNumber < 3) {
      loadingFlashNumber++;
    } else {
      loadingFlashNumber = 0;
    }
  }
  return function(wrapper) {
    getCampaigns(wrapper)    
  }
})()

