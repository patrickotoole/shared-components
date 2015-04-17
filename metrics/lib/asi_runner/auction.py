class Auction(object):

    BID_REQUEST_URL_BASE = 'http://ib.adnxs.com/asi?debug_member=2024&member_id=%s&debug=1&dongle=QWERTY'
    REQUEST_PARAMS = ["an_user_id", "page_url", "ext_auction_id", "width", "height", "ad_format", 
        "an_placement_id", "dma", "country", "language", "user_agent", "ip_address" ]

    TAG_SELLER_URL = "/api?table=reporting.seller_tag_ref&tag_id=%s"

    def __init__(self,bidform):
        self.bidform = bidform

    @property
    def form(self):
        import ujson
        res = {k: v for k, v in self.bidform.iteritems() if k in self.REQUEST_PARAMS and v is not None}
        res = ujson.dumps(res)
        return res

    @property
    def url(self):
        from link import lnk
        URL = self.TAG_SELLER_URL % self.bidform.get("an_placement_id")
        try:
            seller_tag = lnk.api.rockerbox.get(URL).json[0]
            seller_id = seller_tag['seller_id']
            url = self.BID_REQUEST_URL_BASE % seller_id 
            return url
        except:
            return self.BID_REQUEST_URL_BASE % 181

    @property
    def form_and_url(self):
        return (self.form,self.url)
 
