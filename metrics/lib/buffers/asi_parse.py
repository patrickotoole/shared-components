import requests, re, pandas
from StringIO import StringIO
#ASI_URL = "http://ib.adnxs.com/asi?member_id=%s"
ASI_URL = "http://107.170.18.93/streaming?member_id=%s"


def formattable(fn,*args,**kwargs):
    """
    # If a formatter is available, attempt to use it.
    """
    
    def formatter(*a,**kw):
        _formatter = kw.get('reformatter',None)
        result = fn(*a)
        if _formatter is not None:
            try:
                return _formatter(result)
            except:
                print "failed formatting"
                pass
        return result

    return formatter

class ASIBase(object):
    @classmethod
    def html_table_to_csv(self,html):
        buf = StringIO()
        df = pandas.read_html(html,header=0)
        df[0].to_csv(buf,index=False)
        return buf.getvalue()
    
    @classmethod
    def df_to_csv_string(self,df,**kwargs):
        buf = StringIO()
        df.to_csv(buf,index=False,**kwargs)
        return buf.getvalue()

    @classmethod
    def regex_html_table_to_csv(self,regex,html):
        comp = re.compile(regex)
        try:
            extracted = comp.findall(html)[0]
            return self.html_table_to_csv(extracted)
        except:
            return ""

    @classmethod
    def regex_html_to_df(self,regex,html):
        comp = re.compile(regex)
        try:
            extracted = comp.findall(html)[0]
            return pandas.read_html(extracted,header=0)[0]
        except:
            return pandas.DataFrame()

class ASI(ASIBase):
    def __init__(self,tag,uid,domain,seller="",width="",height="",ip="",original_auction=""):
        self.tag = tag
        self.uid = uid
        self.domain = domain
        self.seller = seller
        self.width = width
        self.height = height
        self.ip = ip
        self.original_auction = original_auction

    def post(self):
        body = {
            "an_user_id": int(self.uid),
            "ext_auction_id": "db" + self.uid,
            "width": int(self.width),
            "height": int(self.height),
            "ad_format":"iframe",
            "an_placement_id": int(self.tag),
            "page_url": self.domain,
            "ip_address": self.ip
        } 
        import ujson
        auction = requests.post(ASI_URL % (self.seller), data=ujson.dumps(body))
        self.result = auction.content




