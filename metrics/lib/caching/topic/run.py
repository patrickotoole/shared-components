def run(db, advertiser, pattern, limit=10):

    import requests
    import json
    import urllib
    import logging

    Q = '''
select 
	a.topic, a.max_value, a.topic_num, a.topic_rank,
	b.url, b.count, b.uniques
from (select topic, max(score) max_value, count(*) topic_num, (max(score)-.9)*log(idf)/log(count(*)*count(*)) topic_rank from action_topics where advertiser = "%(advertiser)s" and pattern = "%(pattern)s" group by 1) a 
inner join (select * from action_topics order by RAND()) b on a.topic = b.topic and a.max_value = b.score
where b.advertiser = "%(advertiser)s" and b.pattern = "%(pattern)s" and a.topic_rank is not null
order by 4
limit %(limit)s
    '''

    df = db.select_dataframe(Q % {"advertiser":advertiser,"pattern":pattern, "limit":limit} )

    xxx = []
    for i,row in list(df.iterrows()):
       
        url = row.url
        s = row['topic_num']
        top_phrase = ""
        
        try:
            _c = requests.get("http://scrapper.crusher.getrockerbox.com/?url=" + urllib.quote_plus(url.replace(" ","") ) , auth=("rockerbox","rockerbox"))
            _j = _c.json()
            title = _j['result']['title'].split("|")[0].replace('\n', ' ').replace('\r', '').encode("latin","ignore")
            desc = _j['result'].get('description','').encode("latin","ignore")

            if len(title) > 0 and len(desc) > 0:
                xxx.append({
                    "url": unicode(url, errors='ignore'),

                    "title": unicode(title, errors='ignore'),
                    "description": unicode(desc, errors='ignore'),
                    "image": _j['result'].get('image',''),
                    "phrase": "",
                    "articles": s,
                    "views": row['uniques']
                })
        except:
            logging.info("error parsing: %s" % url)
        
    
    return json.dumps(xxx).encode('latin', 'ignore')
    
if __name__ == "__main__":

    from lib.report.utils.loggingutils import basicConfig
    from lib.report.utils.options import define
    from lib.report.utils.options import options
    from lib.report.utils.options import parse_command_line

    define("advertiser",  default="")
    define("pattern", default="/")
    define("limit", default=10)
    #define("run_local", default=True)
    #define("filter_id", default=0)
    #define("base_url", default="http://beta.crusher.getrockerbox.com")

    basicConfig(options={})
    parse_command_line()

    from link import lnk
    db = lnk.dbs.crushercache
    print run(db, options.advertiser, options.pattern, options.limit)
