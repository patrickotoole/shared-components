if __name__ == "__main__":
    from link import lnk
    import time
    import os
    import ujson
    import requests
    os.environ['TZ'] = 'US/Eastern'
    
    _time = time.localtime()
    _time.tm_hour

    DOW = time.strftime("%a",_time)
    df = lnk.dbs.crushercache.select_dataframe("SELECT * FROM recurring_scripts where days like '%%%s%%'" % DOW)
    xx = df.time.map( lambda x: int(x.split(" pm")[0]) +12 if "pm" in x else int(x.split(" am")[0]) ) == _time.tm_hour

    current = df[xx]

    for item in current.iterrows():
        name = item[1]['name']
        post_obj = {'udf':name}
        _resp = requests.post('http://workqueue.crusher.getrockerbox.com/jobs', data=ujson.dumps(post_obj), auth=('rockerbox','rockerbox'))
        print _resp.status_code
