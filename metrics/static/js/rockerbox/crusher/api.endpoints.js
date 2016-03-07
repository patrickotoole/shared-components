var RB = RB || {}
RB.crusher = RB.crusher || {}
RB.crusher.api = RB.crusher.api || {}

var pubsub = RB.crusher.pubsub;

RB.crusher.cache = (function(cache) {
  return cache
})(RB.crusher.cache || {})




RB.crusher.api.endpoints = (function(endpoints, api, crusher, cache) {

  endpoints.an_uid = api.helpers.genericQueuedAPIWithData(function(data, cb, deferred_cb) {
    var img = new Image()
    img.src = "http://ib.adnxs.com/getuid?" + window.location.origin + "/crusher/pixel/cookie?uid=$UID"

    var run_uid = function() {

      try {
        var uuid = document.cookie.split("an_uuid=")[1].split(";")[0]
        cache.uuid = uuid
        deferred_cb(null, cb.bind(false, uuid))
      } catch (e) {
        setTimeout(run_uid, 1000)
      }
    }

    run_uid()
  })

  endpoints.segment_pixel_status = api.helpers.genericQueuedAPIWithData(function(segment, cb, deferred_cb) {
    var path = "/crusher/pixel/status/lookup?format=json&segment="
    d3.json(path + segment.external_segment_id + "&uid=" + segment.uuid, function(dd) {
      deferred_cb(null, cb.bind(false, dd))
    })

  })

  endpoints.pixel_status = api.helpers.genericQueuedAPIWithData(function(data, cb, deferred_cb) {
    d3.json("/crusher/pixel/status?format=json", function(dd) {
      deferred_cb(null, cb.bind(false, dd))
    })
  })

  endpoints.cached_visitor_domains = api.helpers.genericQueuedAPIWithData(function(data, cb, deferred_cb) {
    d3.json("/crusher/v1/visitor/domains_full/cache?format=json&top=500&url_pattern=" + data['url_pattern'][0], function(dd) {
      deferred_cb(null, cb.bind(false, dd))
    })
  })

  endpoints.cached_visitor_domains_only = api.helpers.genericQueuedAPIWithData(function(data, cb, deferred_cb) {
    if (!!data.domains) deferred_cb(null, cb.bind(false, data))

    d3.json("/crusher/v1/visitor/domains/cache?format=json&url_pattern=" + data['url_pattern'][0], function(dd) {
      data.domains = dd.domains[0].values

      deferred_cb(null, cb.bind(false, dd))
    })
  })

  endpoints.advertiser = api.helpers.genericQueuedAPIWithData(function(data, cb, deferred_cb) {

    if (!cache.advertiserData) {
      d3.json(api.URL.advertiser + "?format=json", function(dd) {
        cache.advertiserData = dd[0]

        deferred_cb(null, cb.bind(false, cache.advertiserData))
      })
    } else {
      deferred_cb(null, cb.bind(false, cache.advertiserData))
    }
  })

  endpoints.comparison = new api.helpers.genericQueuedAPIWithData(function(input, cb, deferred_cb) {
    d3.json("/crusher/pattern_search/timeseries?search=" + input.segmentB, function(segmentB_data) {
      d3.json("/crusher/multi_search/uids?search=" + input.segmentA + '>' + input.segmentB, function(intersection_data) {

        pubsub.subscriber("get_action_idf",["tf_idf_action"])
          .run(function(d){
            comparisonData = {
              segmentA: input.segmentA_data.slice(0, 41),
              segmentB: segmentB_data.domains.slice(0, 41),
              intersection_data: {
                segmentA: intersection_data.results[0].total_count,
                segmentB: intersection_data.results[1].total_count,
                intersection: intersection_data.summary.intersection_size
              }
            };
            deferred_cb(null, cb.bind(false, comparisonData));
          })
          .data(segmentB_data)
          .unpersist(true)
          .trigger()
      });
    });
  });

  endpoints.dashboard_cached = api.helpers.genericQueuedAPIWithData(function(data, cb, deferred_cb) {
    if (!cache.dashboard_cached) {
      d3.json("/crusher/v1/visitor/domains/cache?limit=3", function(json_output) {
        cache.dashboard_cached = json_output;
        deferred_cb(null, cb.bind(false, cache.dashboard_cached));
      })
    } else {
      deferred_cb(null, cb.bind(false, cache.dashboard_cached));
    }
  })

  endpoints.pattern_domains_cached = new api.helpers.genericQueuedAPIWithData(function(vendor, cb, deferred_cb) {
    if (!vendor.domains_raw) {
      d3.json("/crusher/v1/visitor/domains/cache?url_pattern=" + vendor.url_pattern[0], function(json_output) {
        vendor.domains_raw = json_output;
        vendor.domains = json_output.domains[0].values;

        deferred_cb(null, cb.bind(false, json_output));
      })
    } else {
      deferred_cb(null, cb.bind(false, vendor.domains_raw));
    }
  });

  endpoints.current_user = api.helpers.genericQueuedAPIWithData(function(data, cb, deferred_cb) {
    if (!cache.current_user) {
      d3.json("/login?format=json", function(dd) {
        // console.log('THIS IS THE LOGIN ENDPOINT', dd)
        cache.current_user = dd

        deferred_cb(null, cb.bind(false, cache.current_user))
      })
    } else {
      deferred_cb(null, cb.bind(false, cache.current_user))
    }
  })

  endpoints.pattern_status = api.helpers.genericQueuedAPIWithData(function(data, cb, deferred_cb) {
    var pattern = data.url_pattern[0]

    if (pattern) {
      d3.json("/crusher/pattern/status?pattern=" + pattern, function(err, dd) {

        var json = dd.response.map(function(x) {
          var date = new Date(x.timestamp * 1000 - x.num_days * 24 * 60 * 60 * 1000)
          var hour = date.getUTCHours();
          var min = date.getUTCMinutes();
          var sec = date.getUTCSeconds();
          var secs = hour * 60 * 60 + min * 60 + sec

          x.key = new Date(date.getTime() - secs * 1000)

          return x
        }).sort(function(x, y) {
          return y.key - x.key
        })

        var complete = json.filter(function(x) {
          return x.completed
        })

        data.pattern_stats = {
          completed: complete.length,
          percent_complete: complete.length / json.length,
          total_time: json.map(function(x) {
            return x.seconds
          }).reduce(function(p, c) {
            return p + c
          }, 0),
          average_time: json.map(function(x) {
            return x.seconds
          }).reduce(function(p, c) {
            return p + c
          }, 0) / json.length,
          missing: json.filter(function(x) {
            return x.completed == false
          }),
          raw: json
        }

        deferred_cb(null, cb.bind(false, data))
      })
    } else {
      deferred_cb(null, cb.bind(false, data))
    }
  })

  endpoints.tf_idf_action = api.helpers.genericQueuedAPIWithData(function(data, cb, deferred_cb) {
    var domains = data.domains.map(function(x) {
      return x.domain
    })
    if (domains && (data.domains[0].idf === undefined)) {
      d3.xhr("/crusher/domain/idf")
        .post(JSON.stringify({
          "domains": domains
        }), function(err, dd) {
          var json = JSON.parse(dd.response)
          var keyed = d3.nest()
            .key(function(x) {
              return x.domain
            })
            .rollup(function(x) {
              return x[0]
            })
            .map(json)

          data.domains.map(function(x) {
            idf_dict = keyed[x.domain] || {}

            x.category_name = idf_dict.category_name || "NA"
            x.parent_category_name = idf_dict.parent_category_name || "NA"
            x.idf = idf_dict.idf || (x.category_name == "NA" ? 3 : 12)

            x.weighted = x.domain == "NA" ? 0 : Math.exp(x.idf) * Math.log(Math.sqrt(x.count))

          })
          deferred_cb(null, cb.bind(false, data))
        })
    } else {
      deferred_cb(null, cb.bind(false, data))
    }
  })

  endpoints.tf_idf_funnel = api.helpers.genericQueuedAPIWithData(function(data, cb, deferred_cb) {
    var domains = data.funnel_domains ? data.funnel_domains.map(function(x) {
      return x.domain
    }) : []
    if (domains) {
      d3.xhr("/crusher/domain/idf")
        .post(JSON.stringify({
          "domains": domains
        }), function(err, dd) {
          var json = JSON.parse(dd.response)
          var keyed = d3.nest()
            .key(function(x) {
              return x.domain
            })
            .rollup(function(x) {
              return x[0]
            })
            .map(json)

          data.funnel_domains.map(function(x) {
            idf_dict = keyed[x.domain] || {}
            x.idf = idf_dict.idf || 12
            x.category_name = idf_dict.category_name || "NA"
            x.wuid = Math.exp(x.idf) * Math.log(x.uid)

          })
          deferred_cb(null, cb.bind(false, data))
        })
    } else {
      deferred_cb(null, cb.bind(false, data))
    }
  })

  endpoints.tf_idf = api.helpers.genericQueuedAPIWithData(function(cb, deferred_cb) {
    if (!crusher.pop_domains) {
      d3.json("/admin/api?table=reporting.pop_domain_with_category&format=json", function(dd) {
        crusher.pop_domains = {}
        crusher.cat_domains = {}
        dd.map(function(x) {
          crusher.pop_domains[x.domain] = x.idf
          crusher.cat_domains[x.domain] = x.category_name

        })
        deferred_cb(null, cb)
      })
    } else {
      deferred_cb(null, cb)
    }
  })

  endpoints.visits = api.helpers.genericQueuedAPIWithData(function(data, cb, deferred_cb) {
    if (!cache.urlData) {
      d3.json(api.URL.visitURL, function(dd) {
        cache.urlData = dd
        cache.urls = dd.map(function(x) {
          return x.url
        })
        cache.urls_wo_qs = api.helpers.set(cache.urls)
        if (cache.actionData) cache.actionData.map(function(x) {
          x.values = cache.urls_wo_qs
        })

        cache.uris = d3.nest()
          .key(function(x) {
            return x.url.split("?")[0].split(".com")[1]
          })
          .rollup(function(x) {
            return d3.sum(x, function(y) {
              return y.visits
            })
          })
          .entries(dd)
          .sort(function(x, y) {
            return y.values - x.values
          })

        deferred_cb(null, cb)
      })
    } else {
      if (cache.actionData) cache.actionData.map(function(x) {
        x.values = cache.urls_wo_qs
      })
      deferred_cb(null, cb)
    }
  })

  endpoints.campaigns = api.helpers.genericQueuedAPIWithData(function(data, cb, deferred_cb) {
    if (!cache.actionData || !cache.campaign_map) {
      d3.json(api.URL.campaigns, function(campaigns) {
        cache.campaigns = campaigns
        cache.campaign_map = d3.nest()
          .key(function(x) {
            return x.funnel_id
          })
          .key(function(x) {
            return x.order
          })
          .map(campaigns)

        deferred_cb(null, cb)
      })
    } else {
      if (cache.urls_wo_qs) cache.actionData.map(function(x) {
        x.values = cache.urls_wo_qs
      })
      deferred_cb(null, cb)
    }
  })

  endpoints.actions = api.helpers.genericQueuedAPIWithData(function(data, cb, deferred_cb) {

    if (!cache.actionData) {
      d3.json(api.URL.actionURL, function(actions) {
        cache.actionData = actions.response
        if (cache.urls_wo_qs) cache.actionData.map(function(x) {
          x.values = cache.urls_wo_qs
        })
        deferred_cb(null, cb.bind(false, cache.actionData))
      })
    } else {
      if (cache.urls_wo_qs) cache.actionData.map(function(x) {
        x.values = cache.urls_wo_qs
      })
      deferred_cb(null, cb.bind(false, cache.actionData))
    }
  })

  endpoints.vendors = api.helpers.genericQueuedAPIWithData(function(data, cb, deferred_cb) {

    if (!cache.actionData) {
      d3.json(api.URL.actionURL, function(actions) {
        cache.actionData = actions.response
        if (cache.urls_wo_qs) cache.actionData.map(function(x) {
          x.values = cache.urls_wo_qs
        })
        deferred_cb(null, cb.bind(false, cache.actionData.filter(function(x) { return x.action_type == 'vendor' })))
      })
    } else {
      if (cache.urls_wo_qs) cache.actionData.map(function(x) {
        x.values = cache.urls_wo_qs
      })
      deferred_cb(null, cb.bind(false, cache.actionData.filter(function(x) { return x.action_type == 'vendor' })))
    }
  })

  endpoints.recommended_actions = api.helpers.genericQueuedAPIWithData(function(data, cb, deferred_cb) {
    if (!cache.recommendations) {
      d3.json(api.URL.recommendedActions, function(recommendations) {
        cache.recommendations = recommendations
        deferred_cb(null, cb.bind(false, recommendations))
      })
    } else {
      deferred_cb(null, cb.bind(false, cache.recommendations))
    }

  })

  endpoints.permissions = api.helpers.genericQueuedAPI(function(cb, deferred_cb) {
    if (!cache.userPermissions) {
      d3.json(api.URL.userPermissions, function(dd) {
        cache.userPermissions = dd.results
        deferred_cb(null, cb)
      })
    } else {
      deferred_cb(null, cb)
    }
  })

  endpoints.funnels = api.helpers.genericQueuedAPI(function(cb, deferred_cb) {
    if (!cache.funnelData) {
      d3.json(api.URL.funnelURL, function(dd) {
        cache.funnelData = dd.response
        deferred_cb(null, cb.bind(false, cache.funnelData))
      })
    } else {
      deferred_cb(null, cb.bind(false, cache.funnelData))
    }
  })

  endpoints.lookalikes = api.helpers.genericQueuedAPI(function(cb, deferred_cb) {

    if (!cache.lookalikeData) {
      d3.json(api.URL.lookalikes, function(dd) {
        cache.lookalikeData = dd
        cache.lookalikeFunnel = d3.nest()
          .key(function(x) {
            return x.funnel_id
          })
          .rollup(function(x) {
            return x
          })
          .map(dd)
        deferred_cb(null, cb)
      })
    } else {
      deferred_cb(null, cb)
    }
  })

  endpoints.lookalikeCampaigns = api.helpers.genericQueuedAPI(function(cb, deferred_cb) {

    if (!cache.lookalikeCampaigns) {
      d3.json(api.URL.lookalikeCampaigns, function(dd) {
        cache.lookalikeCampaigns = dd
        cache.lookalikeCampaignsByIdentifier = d3.nest()
          .key(function(x) {
            return x.identifier
          })
          .rollup(function(x) {
            return x
          })
          .map(dd)
        deferred_cb(null, cb)
      })
    } else {
      deferred_cb(null, cb)
    }
  })

  endpoints.funnelUIDs = api.helpers.genericQueuedAPIWithData(function(funnel, cb, deferred_cb) {
    console.log("F:", funnel.funnel_name)
    var funnel_actions = funnel.actions
    var patterns = funnel_actions.map(function(action) {
      return action.url_pattern
    })
    var action_strings = patterns.map(function(pattern) {
      return pattern.map(function(p) {
        return p.split(" ").join(",")
      })
    })
    var pattern_strings = action_strings.map(function(patterns) {
      return patterns.join("|")
    })
    var funnel_string = pattern_strings.join(">")

    d3.json(api.URL.funnelUIDs + funnel_string, function(dd) {
      var previous = false
      funnel.union_size = dd.summary.union_size
      funnel.intersection_size = dd.summary.intersection_size

      funnel_actions.map(function(action, i) {
        action.uids = dd.results[i].uids
        action.funnel_uids = dd.results[i].uids
        action.funnel_count = dd.results[i].count
        action.total_count = dd.results[i].total_count
        action.funnel_percent = (previous === false) ? 1 : action.funnel_count / previous
        previous = action.funnel_count
      })
      deferred_cb(null, cb.bind(false, funnel))
    })
  })

  endpoints.funnelDomains = api.helpers.genericQueuedAPIWithData(function(funnel, cb, deferred_cb) {
    var funnel_actions = funnel.actions
    var patterns = funnel_actions.map(function(action) {
      return action.url_pattern
    })
    var action_strings = patterns.map(function(pattern) {
      return pattern.map(function(p) {
        return p.split(" ").join(",")
      })
    })
    var pattern_strings = action_strings.map(function(patterns) {
      return patterns.join("|")
    })
    var funnel_string = pattern_strings.join(">")

    d3.json(api.URL.funnelDomains + funnel_string, function(dd) {
      funnel_actions.map(function(action, i) {
        action.funnel_domains = dd.results[i].domains
      })
      deferred_cb(null, cb.bind(false, funnel))
    })
  })

  endpoints.funnelAvails = api.helpers.genericQueuedAPIWithData(function(funnel, cb, deferred_cb) {
    var funnel_actions = funnel.actions
    var patterns = funnel_actions.map(function(action) {
      return action.url_pattern
    })
    var action_strings = patterns.map(function(pattern) {
      return pattern.map(function(p) {
        return p.split(" ").join(",")
      })
    })
    var pattern_strings = action_strings.map(function(patterns) {
      return patterns.join("|")
    })
    var funnel_string = pattern_strings.join(">")

    d3.json(api.URL.funnelAvails + funnel_string, function(dd) {
      funnel_actions.map(function(action, i) {
        action.avails_raw = {
          "avails": dd.results[i].avails,
          "total": dd.results[i].count
        }
        action.funnel_avails = dd.results[i].avails
      })
      deferred_cb(null, cb.bind(false, funnel))
    })
  })

  endpoints.actionBeforeAndAfter = api.helpers.genericQueuedAPIWithData(function(action, cb, deferred_cb) {
    if (action.before) {
      deferred_cb(null, cb.bind(false, action))
      return
    }
    d3.xhr(api.URL.actionBeforeAndAfter + action.action_string)
      .header("Content-Type", "application/json")
      .get(function(err, rawData) {
        var dd = JSON.parse(rawData.response)
        action.before = {
          categories: dd.before_categories,
          domains: dd.before_domains
        }
        action.after = {
          categories: dd.after_categories,
          domains: dd.after_domains
        }
        action.hourly = {
          categories: dd.hourly_domains,
          onsite: dd.hourly_visits
        }

        deferred_cb(null, cb.bind(false, action))

      })

    // dd = window.mock
    // action.before = {
    //   categories: dd.before_categories,
    //   domains: dd.before_domains
    // }
    // action.after = {
    //   categories: dd.after_categories,
    //   domains: dd.after_domains
    // }
    //
    // deferred_cb(null,cb.bind(false,action))
  })

  endpoints.actionClusters = api.helpers.genericQueuedAPIWithData(function(action, cb, deferred_cb) {
    if (action.clusters) {
      deferred_cb(null, cb.bind(false, action))
      return
    }
    d3.xhr(api.URL.actionClusters + action.action_string)
      .header("Content-Type", "application/json")
      .get(function(err, rawData) {
        var dd = JSON.parse(rawData.response)
        action.clusters = dd.clusters
        action.uid_clusters = dd.uid_clusters
        action.similarity = dd.similarity

        deferred_cb(null, cb.bind(false, action))
      })
  })

  endpoints.actionTimeseries = api.helpers.genericQueuedAPIWithData(function(action, cb, deferred_cb) {
    var days = parseInt(action.action_string.split("num_days=")[1] || 3)

    if (action.visits_data && (action.visits_data.length >= days)) {
      deferred_cb(null, cb.bind(false, action))
      return
    }
    return d3.xhr(api.URL.actionTimeseries + action.action_string)
      .header("Content-Type", "application/json")
      .get(function(err, rawData) {
        var dd = JSON.parse(rawData.response)
        action.visits_data = dd.results
        action.urls = dd.urls
        action.domains = dd.domains

        action.param_list = []

        if (action.urls) {
          action.urls.map(function(x) {
            var split = x.url.split("?")
            if (split.length > 1) {
              split[1].split("&").map(function(y) {
                var splitted = y.split("=")
                var name = splitted[0]
                var value = splitted.slice(1, splitted.length).join("=")


                action.param_list.push({
                  "name": name,
                  "value": value,
                  "count": x.count
                })

              })
            }
          })
        }

        action.param_rolled = d3.nest()
          .key(function(x) {
            return x.name
          })
          .key(function(x) {
            return x.value
          })
          .rollup(function(x) {
            return x.reduce(function(p, c) {
              return p + c.count
            }, 0)
          })
          .entries(action.param_list)
          .map(function(x) {
            x.count = x.values.reduce(function(p, c) {
              return p + c.values
            }, 0)
            return x
          }).sort(function(y, x) {
            return x.count - y.count
          })

        console.log(action.param_rolled)

        //var fn = function(){deferred_cb(null,cb.bind(false,action))}
        deferred_cb(null, cb.bind(false, action))
          //RB.crusher.api.tf_idf_action(fn,action)
      })
  })

  endpoints.actionTimeseriesOnly = api.helpers.genericQueuedAPIWithData(function(action, cb, deferred_cb) {
    console.log('list_items_data', action);
    var endpoint_url = '/crusher/pattern_search/timeseries_only?search=' + action.url_pattern[0];

    if (action.visits_data) {
      deferred_cb(null, cb.bind(false, action))
      return
    }

    d3.json(endpoint_url, function(dd) {
      action.timeseries_data = dd.results
      action.visits_data = dd.results
      deferred_cb(null, cb.bind(false, action))
    })
  })

  endpoints.actionToUIDs = api.helpers.genericQueuedAPI(function(action, deferred_cb) {
    var helpers = api.helpers
    var obj = {}
    obj.urls = helpers.matchDomains(action.url_pattern)

    var pattern_str = action.url_pattern.join("|")

    if (!action.visits_data) {

      console.debug("GETTING DATA FOR: ", action)
      d3.xhr(api.URL.actionUIDs + pattern_str)
        .header("Content-Type", "application/json")
        .get(
          function(err, rawData) {
            var dd = JSON.parse(rawData.response)
            action.visits_data = dd
            action.uids = dd.results
            action.count = dd.summary.num_users
            deferred_cb(null, action)
          }
        );
    } else {
      if (!action.action_id) action.uids = []
      deferred_cb(null, action)
    }
  })

  endpoints.UIDsToDomains = api.helpers.genericQueuedAPIWithData(function(uids, cb, deferred_cb) {
    var data = {
      "uids": uids
    }
    if (uids.length) {
      d3.xhr(api.URL.visitDomains)
        .header("Content-Type", "application/json")
        .post(
          JSON.stringify(data),
          function(err, rawData) {
            var resp = JSON.parse(rawData.response)
            deferred_cb(null, cb.bind(false, resp))
          }
        );
    } else {
      deferred_cb(null, [])
    }
  })

  endpoints.UIDsToDomainsNoQueue = function(cb, uids) {
    var data = {
      "uids": uids
    }

    if (uids.length) {
      d3.xhr(api.URL.visitDomains)
        .header("Content-Type", "application/json")
        .post(
          JSON.stringify(data),
          function(err, rawData) {
            var resp = JSON.parse(rawData.response)
            cb(resp)
          }
        );
    } else {
      cb([])
    }
  }

  endpoints.actionToAvails = api.helpers.genericQueuedAPIWithData(function(action, cb, deferred_cb) {
    var data = {
      "uids": action.funnel_uids
    }
    if (action.funnel_uids.length && (!action.avails)) {
      d3.xhr(api.URL.visitAvails)
        .header("Content-Type", "application/json")
        .post(
          JSON.stringify(data),
          function(err, rawData) {
            var resp = JSON.parse(rawData.response)
            action.avails_raw = resp[0]
            deferred_cb(null, action)
          }
        );
    } else {
      deferred_cb(null, action)
    }
  })

  endpoints.dashboardStats = api.helpers.genericQueuedAPIWithData(function(data, cb, deferred_cb) {
    d3.json(api.URL.statsURL, function(data) {
      deferred_cb(null, cb.bind(false, data))
    })
  })

  return endpoints

})(RB.crusher.api.endpoints || {}, RB.crusher.api, RB.crusher, RB.crusher.cache)
