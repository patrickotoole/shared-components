from link import lnk

def find_url(pixel_code):
    import bs4
    bs_obj = bs4.BeautifulSoup(pixel_code)
    src = bs_obj.find("img") or bs_obj.find("script")

    if src:
        url = src.attrs["src"]
        return url
        
    return ""

def find_fields(url):
    import urlparse
    qs = urlparse.urlparse(url).query
    return ",".join(set(urlparse.parse_qs(qs).keys()))

def pull_parse_segments():
    m = lnk.dbs.mysql
    x = m.select_dataframe("select * from advertiser_segment where segment_implemented is not null")

    x["segment_raw"] = x.segment_implemented.map(find_url)
    x["segment_fields"] = x.segment_raw.map(find_fields)
    return x[["segment_raw","segment_fields","id"]]

def put_parsed_segments(df):
    m = lnk.dbs.mysql
    tuples = df[["segment_raw","segment_fields","id"]].set_index("segment_raw").to_records().tolist()
    for tuple in tuples:
        q = "update advertiser_segment set segment_raw = '%s', segment_fields = '%s' where id = '%s'" % tuple
        m.execute(q)
  
    m.commit()

if __name__ == "__main__":
    df = pull_parse_segments()
    put_parsed_segments(df)
