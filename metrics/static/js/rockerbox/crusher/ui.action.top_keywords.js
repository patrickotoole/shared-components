var RB = RB || {}
RB.crusher = RB.crusher || {}
RB.crusher.ui = RB.crusher.ui || {}

var pubsub = RB.crusher.pubsub;

RB.crusher.ui.action = (function(action) {
  action.show_top_keywords = function(wrapper, segment) {
    var title = "",
      series = ["top_keywords"],
      formatting = ".col-md-12.action-top_keywords.hidden",
      description = "See below for the most popular keywords for users within the " + segment.action_name + " segment."

    var target = RB.rho.ui.buildSeriesWrapper(wrapper.selectAll(".action-body"), title, series, [wrapper.datum()], formatting, description)

    var parentNode = wrapper.selectAll(".action-body").selectAll(".top_keywords")

    parentNode.selectAll(".loading-icon").remove()

    parentNode.selectAll('div.value').remove();

<<<<<<< cbcc5edd3efda107514394a5968e394d9e03c13f
<<<<<<< dbd069963193d8e3a917e7a0431dc981c6cbc084
    pubsub.subscriber("visitor_keywords_cache",["visitor_keywords_cache"])
      .run(function(keywords){
        // debugger;

        var keywords = keywords.filter(function(x) {
          if(x.keyword == '') {
            return false;
          } else {
            return true;
          }
        })
        .map(function(x, i) {
          x.key = x.keyword;
          return x;
        })
        console.log('KEYWORDS', keywords);
=======
    // pubsub.subscriber("cached_visitor_domains",["cached_visitor_domains"])
    //   .run(function(cached_visitor_domains){
>>>>>>> First version of keywords table
=======
    // pubsub.subscriber("cached_visitor_domains",["cached_visitor_domains"])
    //   .run(function(cached_visitor_domains){
>>>>>>> First version of keywords table
        var table_data = {
          header: [
            {
              key: 'key',
              title: 'Keyword'
            },
            {
<<<<<<< cbcc5edd3efda107514394a5968e394d9e03c13f
<<<<<<< dbd069963193d8e3a917e7a0431dc981c6cbc084
              key: 'count',
              title: 'Unique Articles'
            }
          ],
          body: keywords
        };

=======
=======
>>>>>>> First version of keywords table
              key: 'articles',
              title: 'Unique Articles'
            },
            {
              key: 'uniques',
              title: 'Occurances'
            }
          ],
          body: [{key:"2016",articles: 1337,uniques:5519},{key:"us",articles: 1337,uniques:4461},{key:"the",articles: 1337,uniques:4119},{key:"02",articles: 1337,uniques:3391},{key:"en",articles: 1337,uniques:3070},{key:"to",articles: 1337,uniques:3035},{key:"news",articles: 1337,uniques:2710},{key:"of",articles: 1337,uniques:2304},{key:"and",articles: 1337,uniques:2273},{key:"in",articles: 1337,uniques:2077},{key:"ss",articles: 1337,uniques:1823},{key:"a",articles: 1337,uniques:1788},{key:"2",articles: 1337,uniques:1650},{key:"article",articles: 1337,uniques:1646},{key:"you",articles: 1337,uniques:1583},{key:"for",articles: 1337,uniques:1510},{key:"oscars",articles: 1337,uniques:1240},{key:"photos",articles: 1337,uniques:1143},{key:"search",articles: 1337,uniques:1078},{key:"10",articles: 1337,uniques:945},{key:"ar",articles: 1337,uniques:935},{key:"03",articles: 1337,uniques:924},{key:"3",articles: 1337,uniques:909},{key:"on",articles: 1337,uniques:881},{key:"25",articles: 1337,uniques:880},{key:"with",articles: 1337,uniques:846},{key:"from",articles: 1337,uniques:811},{key:"that",articles: 1337,uniques:805},{key:"best",articles: 1337,uniques:790},{key:"health",articles: 1337,uniques:785},{key:"s",articles: 1337,uniques:758},{key:"your",articles: 1337,uniques:743},{key:"movies",articles: 1337,uniques:723},{key:"articles",articles: 1337,uniques:715},{key:"de",articles: 1337,uniques:706},{key:"new",articles: 1337,uniques:690},{key:"celebrity",articles: 1337,uniques:689},{key:"trump",articles: 1337,uniques:659},{key:"about",articles: 1337,uniques:627},{key:"story",articles: 1337,uniques:623},{key:"is",articles: 1337,uniques:620},{key:"sports",articles: 1337,uniques:619},{key:"at",articles: 1337,uniques:618},{key:"entertainment",articles: 1337,uniques:616},{key:"4",articles: 1337,uniques:613},{key:"26",articles: 1337,uniques:611},{key:"5",articles: 1337,uniques:603},{key:"homes",articles: 1337,uniques:598},{key:"gallery",articles: 1337,uniques:595},{key:"2015",articles: 1337,uniques:590},{key:"sch",articles: 1337,uniques:588},{key:"catalog",articles: 1337,uniques:584},{key:"1",articles: 1337,uniques:578},{key:"01",articles: 1337,uniques:575},{key:"how",articles: 1337,uniques:571},{key:"tv",articles: 1337,uniques:553},{key:"politics",articles: 1337,uniques:549},{key:"who",articles: 1337,uniques:540},{key:"itm",articles: 1337,uniques:535},{key:"collective",articles: 1337,uniques:535},{key:"now",articles: 1337,uniques:532},{key:"product",articles: 1337,uniques:529},{key:"recipes",articles: 1337,uniques:525},{key:"24",articles: 1337,uniques:523},{key:"realestateandhomes",articles: 1337,uniques:522},{key:"celebrities",articles: 1337,uniques:509},{key:"12",articles: 1337,uniques:509},{key:"home",articles: 1337,uniques:493},{key:"prd",articles: 1337,uniques:489},{key:"this",articles: 1337,uniques:488},{key:"weather",articles: 1337,uniques:486},{key:"are",articles: 1337,uniques:477},{key:"after",articles: 1337,uniques:463},{key:"20",articles: 1337,uniques:463},{key:"browse",articles: 1337,uniques:451},{key:"lifestyle",articles: 1337,uniques:445},{key:"v3",articles: 1337,uniques:439},{key:"slideshow",articles: 1337,uniques:439},{key:"photo",articles: 1337,uniques:431},{key:"obituaries",articles: 1337,uniques:431},{key:"7",articles: 1337,uniques:431},{key:"15",articles: 1337,uniques:426},{key:"16",articles: 1337,uniques:425},{key:"11",articles: 1337,uniques:425},{key:"6",articles: 1337,uniques:421},{key:"never",articles: 1337,uniques:419},{key:"8",articles: 1337,uniques:414},{key:"by",articles: 1337,uniques:414},{key:"ip",articles: 1337,uniques:412},{key:"0",articles: 1337,uniques:406},{key:"9",articles: 1337,uniques:405},{key:"world",articles: 1337,uniques:399},{key:"awards",articles: 1337,uniques:399},{key:"29",articles: 1337,uniques:392},{key:"all",articles: 1337,uniques:391},{key:"any_days",articles: 1337,uniques:391},{key:"stars",articles: 1337,uniques:389},{key:"womens",articles: 1337,uniques:383},{key:"ads",articles: 1337,uniques:379},{key:"donald",articles: 1337,uniques:373},{key:"will",articles: 1337,uniques:366},{key:"13",articles: 1337,uniques:363},{key:"life",articles: 1337,uniques:358},{key:"detail",articles: 1337,uniques:355},{key:"things",articles: 1337,uniques:355},{key:"30",articles: 1337,uniques:350},{key:"foods",articles: 1337,uniques:348},{key:"out",articles: 1337,uniques:347},{key:"pictures",articles: 1337,uniques:346},{key:"what",articles: 1337,uniques:343},{key:"for_sale",articles: 1337,uniques:341},{key:"up",articles: 1337,uniques:340},{key:"27",articles: 1337,uniques:340},{key:"RealMedia",articles: 1337,uniques:339},{key:"28",articles: 1337,uniques:339},{key:"red",articles: 1337,uniques:338},{key:"adstream_sx.ads",articles: 1337,uniques:338},{key:"should",articles: 1337,uniques:332},{key:"2014",articles: 1337,uniques:331},{key:"most",articles: 1337,uniques:327}]
        };

        // var raw_table_data = cached_visitor_domains
        //   .sort(function(x, y) {
        //     return y.count - x.count
        //   })
        //   .filter(function(x) {
        //     if(x.url.substr(-5) === '.com/' || x.url.substr(-4) === '.com' ||
        //        x.url.substr(-5) === '.net/' || x.url.substr(-4) === '.net' ||
        //        x.url.substr(-4) === '.tv/' || x.url.substr(-3) === '.tv' ||
        //        x.url.substr(-4) === '.me/' || x.url.substr(-3) === '.me' ||
        //        x.url.substr(-18) === '.anonymous.google/' || x.url.substr(-17) === '.anonymous.google' ||
        //        x.url == '') {
        //       return false;
        //     } else {
        //       return true;
        //     }
        //   })
        //   .slice(0, 50);
        //
        // raw_table_data.forEach(function(item, i) {
        //   table_data['body'].push({
        //     key: (i + 1),
        //     url: item.url,
        //     uniques: item.uniques,
        //     count: item.count
        //   });
        // });

<<<<<<< cbcc5edd3efda107514394a5968e394d9e03c13f
>>>>>>> First version of keywords table
=======
>>>>>>> First version of keywords table
        setTimeout(function() {
          var table = components.table(target)
            .data(table_data)
            .draw();
        }, 1);
<<<<<<< cbcc5edd3efda107514394a5968e394d9e03c13f
<<<<<<< dbd069963193d8e3a917e7a0431dc981c6cbc084
      })
      .data(segment)
      .unpersist(true)
      .trigger()
=======
=======
>>>>>>> First version of keywords table
      // })
      // .data(segment)
      // .unpersist(true)
      // .trigger()
<<<<<<< cbcc5edd3efda107514394a5968e394d9e03c13f
>>>>>>> First version of keywords table
=======
>>>>>>> First version of keywords table
  }

  return action;

})(RB.crusher.ui.action || {})
