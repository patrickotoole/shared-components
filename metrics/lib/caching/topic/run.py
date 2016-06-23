if __name__ == "__main__":

    from lib.report.utils.loggingutils import basicConfig
    from lib.report.utils.options import define
    from lib.report.utils.options import options
    from lib.report.utils.options import parse_command_line

    define("advertiser",  default="")
    #define("pattern", default=False)
    #define("run_local", default=True)
    #define("filter_id", default=0)
    #define("base_url", default="http://beta.crusher.getrockerbox.com")

    basicConfig(options={})
    parse_command_line()




    from link import lnk
    db = lnk.dbs.crushercache
    df = db.select_dataframe('select matches, `group`, count(*) count, sum(`count`) views, max(url) url from action_topics where advertiser = "{}" group by 1,2 order by 1 desc limit 5'.format(options.advertiser) )
    xxx = []
    import requests
    for i,row in list(df.iterrows()):
       
        url = row.url
        s = row['count']
        top_phrase = ""
        _j = requests.get("http://slave7:4000/?url=" + url).json()
        title = _j['result']['title'].split("|")[0].replace('\n', ' ').replace('\r', '').encode("latin","ignore")
        if len(title) > 0:
            xxx.append({
                "url": url,
                "title": title,
                "description": _j['result'].get('description',''),
                "image": _j['result'].get('image',''),
                "phrase": top_phrase,
                "articles": s,
                "views": row['views']
            })
    
    import json
    print json.dumps(xxx).encode('latin', 'ignore')
