if __name__ == "__main__":
    from link import lnk
    import time
    import os
    import ujson
    os.environ['TZ'] = 'US/Eastern'
    
    _time = time.localtime()
    _time.tm_hour

    DOW = time.strftime("%a",_time)
    df = lnk.dbs.rockerbox.select_dataframe("SELECT * FROM action_dashboard_schedule where days like '%%%s%%'" % DOW)
    xx = df.time.map( lambda x: int(x.split(" pm")[0]) +12 if "pm" in x else int(x.split(" am")[0]) ) == _time.tm_hour

    current = df[xx]

    lookup = lnk.dbs.rockerbox.select_dataframe("SELECT external_advertiser_id, pixel_source_name FROM advertiser where active = 1 and deleted =0 and crusher =1")

    joined = current.set_index("advertiser_id").join(lookup.set_index("external_advertiser_id"))


    crusher = lnk.api.crusher

    for i,row in joined.iterrows():
        crusher.base_url = "http://slave7:8888"
        crusher.user = "a_" + row['pixel_source_name']
        crusher.authenticate()
        crusher.post("/share",row.json)
        

    print joined
