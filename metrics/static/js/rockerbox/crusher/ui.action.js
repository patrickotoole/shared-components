var RB = RB || {}
RB.crusher = RB.crusher || {}
RB.crusher.ui = RB.crusher.ui || {}

var pubsub = RB.crusher.pubsub;

RB.crusher.ui.action = (function(action) {

  var crusher = RB.crusher

  action.category_colors = d3.scale.category20c()

  action.save = function(callback) {
    var data = this.selectAll(".action-pattern .tt-input")[0].map(function(x){return x.value})

    var d = data
    var objectData = this.datum()
    objectData.url_pattern = d
    objectData.action_name = this.selectAll("input").node().value
    objectData.operator = this.selectAll(".operator").node().value


    delete objectData['visits_data']

    this.select("h5").text("Edit a segment")
    this.select(".save").text("Update segment")

    var actions = crusher.cache.actionData // this should really be in the controller

    if (!objectData.action_id) actions.push(objectData)

    var onSave = callback
    urls = actions[0].values

    //action.showAll(actions,onSave,urls)
    //action.select(objectData)
    action.view(d3.select(this.node().parentNode))

    callback(objectData,this)

  }

  action.status = function(wrapper) {

      var status = d3_updateable(wrapper,".action-status","div")
        .classed("action-status",true)

      var wrapper = d3_updateable(status,".status-wrapper","div")
        .classed("status-wrapper col-md-6",true)

      var series = d3_updateable(wrapper,".series","div")
        .classed("series",true)

      d3_updateable(series,".title","div")
        .classed("title",true)
        .text("Cache stats")

      var percent_bar = d3_updateable(series,".percent-bar","div")
        .classed("percent-bar",true)

      d3_updateable(percent_bar,".value","div")
        .classed("value",true)
        .text(function(x){return x.pattern_stats.completed + " days"})

      d3_updateable(percent_bar,".description.percent","div")
        .classed("description percent",true)
        .text(function(x){return "Percent complete: " + d3.format("%")(x.pattern_stats.percent_complete)})
        .style("color","#000")

      var progress = d3_updateable(percent_bar,".progress","div")
        .classed("progress",true)
        .style("height","12px")
        .style("margin-top","5px")


      d3_updateable(progress,".progress-bar-striped","div")
        .classed("progress-bar progress-bar-striped",true)
        .attr("role","progressbar")
        .attr("aria-valuenow",function(x){return 100*x.pattern_stats.percent_complete})
        .attr("aria-valuemin","0")
        .attr("aria-valuemax","100")
        .style("width",function(x){return (x.pattern_stats.percent_complete*100) + "%"})


      d3_updateable(series,".description.timeseries","div")
        .classed("description timeseries",true)
        .text("Time to complete cache days")



      var newTs = d3_updateable(series,".values","div")
        .classed("values",true)


      var ts = RB.rho.ui.buildTimeseries(newTs,newTs.datum().pattern_stats.raw,"Seconds",["seconds"], undefined)

      newTs.selectAll("circle").filter(function(x){return x.completed == 0 }).attr("fill","red")


      var missingWrapper = d3_updateable(series,".missing-wrapper","div")
        .classed("missing-wrapper",true)

      var missingDescription = d3_splat(missingWrapper,".description","div",function(x){
        var values = x.pattern_stats.raw.filter(function(y){return y.completed == 0 })
        return values.length ? [true] : []
      },function(x){return x.key})
        .classed("description",true)
        .style("padding-top","10px")
        .style("padding-bottom","15px")
        .style("color","#000")
        .text("The following dates were not properly cached or are actively running")

      missingDescription.exit().remove()

      var missing = d3_splat(missingWrapper,".missing","div",function(x){
        var values = x.pattern_stats.raw.filter(function(y){return y.completed == 0 })
        return values
      },function(x){return x.key})
        .classed("missing",true)
        .style("min-height","30px")

      d3_updateable(missing,".btn","a")
        .classed("btn btn-danger btn-xs pull-right",true)
        .text("Re-run")
        .attr("href",function(x){return "/crusher/pattern/run?pattern=" + x.url_pattern + "&cache_date=" + (new Date(x.cache_date*1000)).toISOString().split("T")[0] })
        .on("click",function(x){
          var self = this
          d3.json(this.href,function(err,dd){
            d3.select(self).attr("disabled",true)
            console.log(dd)
            return dd
          })
          d3.event.preventDefault()
          return false
        })

      d3_updateable(missing,".btn-label","div")
        .classed("btn-label",true)
        .text(function(x){return (new Date(x.cache_date*1000)).toISOString().split("T")[0] })


      var activeWrapper = d3_updateable(series,".active-wrapper","div")
        .classed("active-wrapper",true)

      var activeDescription = d3_splat(activeWrapper,".description","div",function(x){
        var values = x.pattern_stats.raw.filter(function(y){return y.active })
        return values.length ? [true] : []
      },function(x){return x.key})
        .classed("description",true)
        .style("padding-top","10px")
        .style("padding-bottom","15px")
        .style("color","#000")
        .text("The following dates are actively being cached")

      activeDescription.exit().remove()

      var active = d3_splat(activeWrapper,".active","div",function(x){
        var values = x.pattern_stats.raw.filter(function(y){return y.active })
        return values
      },function(x){return x.key})
        .classed("active",true)
        .style("min-height","30px")

      d3_updateable(active,".btn","a")
        .classed("btn btn-danger btn-xs pull-right",true)
        .text("Stop")
        .attr("href",function(x){return "/crusher/pattern/reset?pattern=" + x.url_pattern + "&cache_date=" + (new Date(x.cache_date*1000)).toISOString().split("T")[0] })
        .on("click",function(x){
          var self = this
          d3.json(this.href,function(err,dd){
            d3.select(self).attr("disabled",true)
            console.log(dd)
            return dd
          })
          d3.event.preventDefault()
          return false
        })

      d3_updateable(active,".btn-label","div")
        .classed("btn-label",true)
        .text(function(x){return (new Date(x.cache_date*1000)).toISOString().split("T")[0] })


      var queuedWrapper = d3_updateable(series,".queued-wrapper","div")
        .classed("queued-wrapper",true)

      var queuedDescription = d3_splat(queuedWrapper,".description","div",function(x){
        var values = x.pattern_stats.raw.filter(function(y){return y.queued })
        return values.length ? [true] : []
      },function(x){return x.key})
        .classed("description",true)
        .style("padding-top","10px")
        .style("padding-bottom","15px")
        .style("color","#000")
        .text("The following dates are queued")

      queuedDescription.exit().remove()

      var queued = d3_splat(queuedWrapper,".queued","div",function(x){
        var values = x.pattern_stats.raw.filter(function(y){return y.queued })
        return values
      },function(x){return x.key})
        .classed("queued",true)
        .style("min-height","30px")

      d3_updateable(queued,".btn","a")
        .classed("btn btn-danger btn-xs pull-right",true)
        .text("Dequeue")
        .attr("href",function(x){
          return "/crusher/pattern/clear?pattern=" +
            x.url_pattern + "&cache_date=" + (new Date(x.cache_date*1000)).toISOString().split("T")[0]
        })
        .on("click",function(x){
          var self = this
          d3.json(this.href,function(err,dd){
            d3.select(self).attr("disabled",true)
            console.log(dd)
            return dd
          })
          d3.event.preventDefault()
          return false
        })

      d3_updateable(queued,".btn-label","div")
        .classed("btn-label",true)
        .text(function(x){return (new Date(x.cache_date*1000)).toISOString().split("T")[0] })




  }

  action.preview = function(wrapper) {
    var segment;

    var actionView = wrapper.selectAll(".action-view")
      .data(function(x){return [x]},function(x){
        segment = x;
        return x.action_id + x.action_name;
      })

    actionView.enter()
      .append("div")
      .classed("action-view row",true)
      .classed("hidden",function(x){return !x.action_id})

    actionView.exit().remove()

    var h5 = actionView.selectAll("h5").data(function(x){return [x.action_name]})
    h5.enter().append("h5")

    h5.text(function(x) { return "Segment > " + x } )
      .attr("style","margin-top:-15px;padding-left:20px;height: 70px;line-height:70px;border-bottom:1px solid #f0f0f0;margin-left:-30px;margin-right:-30px")
      .classed("heading",true)

    var remove_button = d3_updateable(h5, '.btn', 'a')
      .text('Remove Segment')
      .classed('btn btn-default pull-right',true)
      .style('margin', '16px 16px 0 0')
      .on('click', function(e) {
        if(confirm('Are you sure you want to delete this segment?')) {
          try{
            RB.crusher.controller.action.delete(segment)

            var xx = RB.crusher.controller.states["/crusher/action/existing"];
            RB.routes.navigation.forward(xx);
          } catch(e) {
            
          }
        }
      });

    h5.exit().remove()

   // var edit = d3_updateable(h5,".pull-right.edit","a")
   //   .classed("pull-right edit btn btn-default btn-sm", true)
   //   .style("margin-right","30px")
   //   .style("margin-top","20px")

   // edit.exit().remove()




   // edit.text("Edit")
   //   .on("click",function(){
   //     var current = d3.select(".action").classed("hidden")
   //     d3.select(".action").classed("hidden",!current)
   //     var current_text = d3.select(this).text()

   //     d3.select(this).text(current_text == "Edit" ? "Close" : "Edit")
   //   })

    var info = actionView.selectAll(".urls").data(function(x){

      if (!x.visits_data) {
        x.all = [x]
        //crusher.controller.action.get(x,action.view.bind(false,wrapper))
        delete x['all']
      }

      return [x]
    })

    info.enter()
      .append("div").classed("urls",true)

    d3_updateable(info,".description","div")
      .classed("description",true)
      .text(function(x){
        return "These are the analytics details associated with the segment " + x.action_name + ". Below we summarize on-site and off-site activity."
      })

    info.filter(function(x){console.log(x); return !x.action_id}).remove()


  }

  action.wait = function(wrapper) {
    var info = wrapper.selectAll(".urls")


    d3_updateable(info,".loading","div")
      .classed("loading",true)
      .text(function(x){
        return "Your data is loading..."
      }).style("display","block")


  }

  action.view = function(wrapper) {

    var info = wrapper.selectAll(".urls")

    info.selectAll(".loading").remove()

    var with_data = info.filter(function(x){return x.visits_data})

    var timeseries = with_data.selectAll(".ts").data(function(data){
      var nested = d3.nest()
        .key(function(x){return x.date})
        .rollup(function(x){

          return {
            "views": x[0].views,
            "visits": x[0].visits,
            "uniques": x[0].uniques
          }

        })
        .entries(data.visits_data).map(function(x){
          x.date = x.key
          x.views = x.values.views
          x.visits = x.values.visits
          x.uniques = x.values.uniques
          x.url_pattern = data.url_pattern
          return x
        }).filter(function(x){
          return x.key != ""
        }).sort(function(x,y) {
          return (+new Date(x.date)) - (+new Date(y.date))
        })


      return (nested.length) ? [nested] : []
    },function(x){
      return x[0].url_pattern
    })

    timeseries.exit().remove()
    var newTs = timeseries.enter().append("div").classed("ts",true)

  }

  action.show_timeseries = function(wrapper) {
    var newTs = wrapper.selectAll(".ts")
    var tsData = newTs.datum()
    var urlData = wrapper.datum().urls
    // console.log('newTs', JSON.stringify(tsData));
    RB.rho.ui.buildTimeseriesSummary(
      newTs,tsData,"Views",["views"], undefined,
      "This is the number of page views per day"
    )
    RB.rho.ui.buildTimeseriesSummary(
      newTs,tsData,"Visits",["visits"], undefined,
      "This is the number of unique page views per day"
    )
    RB.rho.ui.buildTimeseriesSummary(
      newTs,tsData,"Uniques",["uniques"], undefined,
      "This is the number of unique visitors per day"
    )





  }





  action.edit = function(wrapper,onSave) {
    if (window.location.pathname.indexOf("existing") > -1 || window.location.pathname.indexOf("recommended") > -1) {
      setTimeout(function() {
        var edits = wrapper.selectAll(".action")
          .data(function(x){return [x]},function(x){
            if(typeof x.action_name !== typeof undefined) {
              matched_domains_wrapper.style("display", "block")
              matched_domains_loading.style("display", "block");
              search.query = x.action_name;
              search_input.attr("value", search.query);
              search.perform(search.query);
              search.buildResults();
            }
          });
      }, 1);
    }

    var client_sld;

    pubsub.subscriber("advertiser-domain",["advertiser"])
      .run(function(advertiser_data) {
        client_sld = advertiser_data.client_sld;
          var client_sld_wrappers = wrapper.selectAll(".client_sld")
            .text(advertiser_data.client_sld)
      })
        .unpersist(true)
        .trigger()

    var search = {
      results: {
        'contains_keyword': [],
        'matches_keyword': [],
        'starts_with_keyword': [],
        'ends_with_keyword': []
      },
      query: '',
      filters: [
        {
          id: 1,
          title: "Contains Keyword",
          url: "/*<span class=\"search_query\"></span>*",
          visits: 0,
          active: true
        },
        {
          id: 2,
          title: "Matches Keyword",
          url: "/<span class=\"search_query\"></span>",
          visits: 0,
          active: false
        },
        {
          id: 3,
          title: "Starts With Keyword",
          url: "/<span class=\"search_query\"></span>*",
          visits: 0,
          active: false
        },
        {
          id: 4,
          title: "Ends With Keyword",
          url: "/*<span class=\"search_query\"></span>",
          visits: 0,
          active: false
        }
      ],
      filter: 1,
      data_fetching: null,

      buildResults: function() {
        switch(search.filter) {
          case 1:
            var domains = search.results.contains_keyword;
            break;
          case 2:
            var domains = search.results.matches_keyword;
            break;
          case 3:
            var domains = search.results.starts_with_keyword;
            break;
          case 4:
            var domains = search.results.ends_with_keyword;
            break;
        }
        var matched_domains = d3_splat(wrapper.selectAll(".matched_domains"), '.matched-domain', 'li', domains, function(x, i) {
          return x.url;
          matched_domains_loading.style("display", "none");
        })
          .html(function(x) {
            var formatted_url = x.url.replace(search.query, '<strong style="font-size:1.2em;">' + search.query + '</strong>');
            return '<span>' + formatted_url + '</span>';
            // return '<span class="icon glyphicon glyphicon-' + x.icon + '" style="font-size: 32px;"></span>' +
            //   '<span style="display: block; margin-top: 10px;">' + x.title + '</span>';
          })
          .classed('matched-domain', true)

        // todo: sort based on visits
        matched_domains.exit().remove();

        search_loading_indicator.style("display", "none")
      },

      buildFilters: function() {
        search.filters[0].visits = search.results.contains_keyword.length;
        search.filters[1].visits = search.results.matches_keyword.length;
        search.filters[2].visits = search.results.starts_with_keyword.length;
        search.filters[3].visits = search.results.ends_with_keyword.length;

        var filter_options = d3_splat(wrapper.selectAll("ol.filters"), ".filter-option", "li", search.filters, function(x, i) {
          return x.title;
        })
          .on("click", function(filter) {
            search.switchFilter.bind(this)(filter.id,filter_options);
          })
          .classed("filter-option", true)
          .html(function(x) {
            return "<h3>" + x.title + "</h3>" +
            "<p><span class=\"client_sld\"></span>" + x.url + "</p>" +
            "<p>" + x.visits + " visits</p>";
          });

        if(!wrapper.selectAll("ol.filters li.active").size()) {
          wrapper.selectAll("ol.filters li:first-child").classed("active", true);
        }
        filter_options.exit().remove();

        var search_query_wrappers = wrapper.selectAll(".search_query")
          .text(search.query)
      },

      switchFilter: function(filter, filter_options) {
        search.filter = filter;

        console.log(filter_options)

        filter_options.classed("active", false);
        d3.select(this).classed("active", true);

        search.buildFilters();
        search.buildResults();
      },

      perform: function(query) {
        if(typeof query !== typeof undefined && query != "") {
          wrapper.selectAll(".matched_domains_wrapper")
            .style("display", "block")

          search.data_fetching = d3.json("/crusher/search/urls?search=" + query + "&format=json&logic=and&timeout=4", function(error, response) {
            search.results = {
              'contains_keyword': [],
              'matches_keyword': [],
              'starts_with_keyword': [],
              'ends_with_keyword': []
            }

            response.results.forEach(function(result) {
              var domain_result = {
                url: result.url,
                visits: result.count,
                importance: (result.count/564)
              };

              // Refresh matched domains
              var search_query_wrappers = wrapper.selectAll(".search_query")
                .text(query)


              // Get domain and remove slashes from query if necessary
              var test_domain = result.url.split(client_sld + "/")[1];

              if(typeof test_domain !== typeof undefined) {
                if(test_domain[0] == '/') {
                  test_domain = test_domain.substring(1);
                }
                if(test_domain[test_domain.length - 1] == '/') {
                  test_domain = test_domain.slice(0, -1);
                }

                // Get query and remove slashes from query if necessary
                if(query[0] == '/') {
                  var test_query = query.substring(1);
                } else {
                  var test_query = query;
                }
                if(query[query.length - 1] == '/') {
                  test_query = test_query.slice(0, -1);
                }


                // Add to array of all URL's (contains keyword)
                search.results.contains_keyword.push(domain_result);


                // Check for urls exactly matching keyword
                if(test_query == test_domain) {
                  search.results.matches_keyword.push(domain_result);
                }


                // Check for urls starting with keyword
                if(test_domain.indexOf(test_query) == 0) {
                  search.results.starts_with_keyword.push(domain_result);
                }


                // Check for urls ending with keyword
                if(typeof test_domain[test_domain.indexOf(test_query) + test_query.length] === typeof undefined) {
                  search.results.ends_with_keyword.push(domain_result);
                }
              } else {
                // Something is wrong with the client_sld, just push to the "contains keyword" array for now
                search.results.contains_keyword.push(domain_result);
              }
            });

            if(error) {
              alert("Something went wrong, please try again");
            } else {
              search.buildFilters();
              search.buildResults();
              matched_domains_loading.style("display", "none");
            }
          });


          setTimeout(function() {
            search.data_fetching.abort();
            search_loading_indicator.style("display", "none");
            matched_domains_loading.style("display", "none");
            if(!wrapper.selectAll(".matched-domain").size()) {
              matched_domains_nothing_found.style("display", "block");
            }
          }, 4000);
        } else {
          search.data_fetching.abort();
          search_loading_indicator.style("display", "none");
          matched_domains_loading.style("display", "none");
          if(!wrapper.selectAll(".matched-domain").size()) {
            matched_domains_nothing_found.style("display", "block");
          }
        }
      }
    }



    /*
      Header
    */

    var edits = wrapper.selectAll(".action")
      .data(function(x){return [x]},function(x){return x.action_id + x.action_name})

    var editWrapper = edits.enter()
      .append("div")
      .classed("action",true)
      .classed("hidden",function(x){return x.action_id})
      .style("min-height", "100%")

    edits.exit()
      .remove()

    editWrapper.append("h5")
      .text(function(x){
        return x.action_id ? "Edit a segment" : "Create a segment"
      })
      .attr("style","margin-top:-15px;padding-left:20px;height: 70px;line-height:70px;border-bottom:1px solid #f0f0f0;margin-left:-30px;margin-right:-30px")
      .classed("heading",true)


    /*
      Search
    */

    var search_wrapper = d3_updateable(editWrapper,".search_wrapper","section")
      .classed("search_wrapper", true)

    var search_loading_indicator = d3_updateable(search_wrapper,".search_loading_indicator","img")
      .classed("search_loading_indicator", true)
      .attr("src", "/static/img/general/ajax-loader.gif")

    var search_interval;

    var search_input = d3_updateable(search_wrapper,".search_input","input")
      .classed("search_input", true)
      .attr("placeholder", "Type in a segment or select a recommended segment from the sidebar...")
      .attr("type", "text")
      .on('keyup', function(e) {
        if(search.query != this.value) {
          search.query = this.value;
          window.clearInterval(search_interval);
          search_loading_indicator
            .style("display", "block")

          /*
            Uncomment this line when backend is ready for filters
          */
          // filters_wrapper.style("display", "block")
          matched_domains_wrapper.style("display", "block")
          matched_domains_loading.style("display", "block");
          matched_domains_nothing_found.style("display", "none");

          $('.matched-domain').remove();

          search_interval = setInterval(function() {
            window.clearInterval(search_interval);
            search.perform(search.query)
            // action.search(editWrapper, search.query);
          }, 500);
        }
      })

    var create_action_button = d3_updateable(search_wrapper,".create_action","div")
      .classed("create_action btn btn-sm btn-success", true)
      .html("<span class=\"icon glyphicon glyphicon-plus\" style=\"padding-right: 21px;\"></span> Create a Segment")
      .on("click", function(e) {
        if(search.query.length) {

          try {
            Intercom('trackEvent', 'Create Segment', { 'segment': search.query });
          } catch(e) {}
          document.cookie="toast=new-action";
          var data = {
            'action_id': undefined,
            'action_name': search.query,
            'action_string': search.query,
            'domains': undefined,
            'name': search.query,
            'operator': 'or',
            'param_list': [],
            'rows': [{
              'url_pattern': search.query,
              'values': undefined
            }],
            'url_pattern': [
              search.query
            ],
            'urls': undefined,
            'values': undefined,
            'visits_data': []
          }
          RB.crusher.controller.action.save(data, false);

          window.location.href = '/crusher/action/existing?id=' + search.query;
        } else {
          $.toast({
            heading: "Something went wrong",
            text: "You can't create a segment without specifying a search pattern",
            position: "top-right",
            icon: "error"
          })
        }
      })


    /*
      Filters
    */

    var filters_wrapper = d3_updateable(editWrapper, ".filters_wrapper", "section")
      .classed("filters_wrapper", true)
      .style("display", "none")

    var filters = d3_updateable(filters_wrapper, ".filters", "ol")
      .classed("filters", true)


    // Matched Domains
    var matched_domains_wrapper = d3_updateable(editWrapper, ".matched_domains_wrapper", "section")
      .classed("matched_domains_wrapper ct-chart", true)
      // .style("display", "none")
    var matched_domains_title = d3_updateable(matched_domains_wrapper, ".matched_domains_title", "div")
      .classed("matched_domains_title chart-title", true)
      .text("This segment will include visits to these URLs:")
      // .text("Matched URLs (" + domains_contains_keyword.length + ")")

    var matched_domains = d3_updateable(matched_domains_wrapper, ".matched_domains", "ol")
      .classed("matched_domains", true)

    var matched_domains_loading = d3_updateable(matched_domains_wrapper, ".matched_domains_loading", "ol")
      .classed("matched_domains_loading", true)
      .html("<li></li><li></li><li></li><li></li><li></li><li></li>")

    var matched_domains_nothing_found = d3_updateable(matched_domains_wrapper, ".matched_domains_nothing_found", "p")
      .classed("matched_domains_nothing_found", true)
      .text("No results were found...")
      .style("display", "none")
  }

  action.show = function(target,onSave,expandTarget) {

/*
    var h5 = target.selectAll("div").data(function(x){return [x]})
    h5.enter().append("div").classed("",true)

    var spans = h5.selectAll("span").data(function(x){return [x]})
    spans.enter().append("span")
    spans.text(function(x){ return x.action_name })

    h5.selectAll(".edit").data(function(x){return [x]}).enter()
      .append("button")
      .classed("edit btn  btn-xs pull-right",true)
      .text("edit")
      .on("click",function(){
        var edit = d3.select(this.parentNode)
        var data = edit.datum()

        action.select(data)

        expandTarget.datum(data)
        action.edit(expandTarget,onSave)
        action.view(expandTarget)
      }) */




  }

  action.showAll = function(actions,onSave,urls) {

    var selected = d3.selectAll(".action-wrapper").selectAll(".action")
      .data(actions)

    selected.enter().append("div")
      .classed("list-group-item action",true)

    var expandTarget = d3.selectAll(".action-view-wrapper")

    action.show(selected,onSave,expandTarget)
    action.add_action(urls)

  }

  action.showRecommended = function(actions,onSave,urls) {

    var selected = d3.selectAll(".action-recommended-wrapper").selectAll(".action")
      .data(actions)

    selected.enter().append("div")
      .classed("list-group-item action",true)

    var expandTarget = d3.selectAll(".action-view-wrapper")

    action.show(selected,onSave,expandTarget)

    selected.selectAll(".remove").remove()
    selected.selectAll(".edit").text("build")
      .classed("edit",false)
      .classed("build",true)
      .on("click",function(){
        var edit = d3.select(this.parentNode)
        var data = edit.datum()

        action.select(data)

        expandTarget.datum(data)
        action.edit(expandTarget,onSave)
        action.view(expandTarget)
        d3.select(this.parentNode.parentNode).remove()
      })

  }

  action.select = function(data) {
    var selected = d3.selectAll(".action-wrapper").selectAll(".action")
      .classed("active",false)
      .filter(function(x) { return x == data })
      .classed("active",true)

  }

  action.add_action = function(dd) {
    var wrapper = d3.selectAll(".add-action-wrapper")
    var action_wrapper = d3.selectAll(".action-view-wrapper")

    wrapper.selectAll(".button-wrapper")
      .data([{}])
      .enter()
        .append("div").classed("button-wrapper",true)
        .append("button")
        .classed("btn btn-xs",true)
        .text("New segment")
        .on("click",crusher.controller.action.new.bind(this,action_wrapper,dd))
  }

  action.showList = function(target,actions) {
    var select = target.append("select")

    select.selectAll("option")
      .data(actions)
      .enter()
        .append("option")
        .attr("value",function(x){return x.id})
        .text(function(x){return x.action_name})

  }

  action.buildEdit = function(target,data,onSave) {

    var edit = target.selectAll(".action")
      .data(data)

    var newEdit = edit
      .enter()
      .append("div").classed("row",true)
      .append("div").classed("action",true)

    action.edit(newEdit,onSave)

  }

  action.buildBase = function(id) {

    var id = id || "action"
    var target = d3.selectAll(".container")

    var actionsRow = d3_splat(target,".row","div",[{"id":id}],function(x){return x.id})
      .classed("row actions",true)

    var viewWrapper = d3_updateable(actionsRow,".action-view-wrapper","div")
      .classed("action-view-wrapper col-md-12",true)

    actionsRow.exit().remove()

  }

  return action
})(RB.crusher.ui.action || {})
