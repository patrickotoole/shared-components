import requests, re, pandas
from StringIO import StringIO
URL = "http://ib.adnxs.com/tt?id=%s&size=300x250&debug=1&debug_member=2024&dongle=QWERTY&referrer=%s"
ASI_URL = "http://ib.adnxs.com/asi?member_id=%s&debug=1&debug_member=2024&dongle=QWERTY"

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

class DebugBase(object):
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

class Debug(DebugBase):
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
        self.auction_diagnostics()

    def run(self):
        headers = {
            "Accept":"text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Encoding":"gzip,deflate,sdch",
            "Accept-Language":"en-US,en;q=0.8",
            "Cache-Control":"max-age=0",
            "Connection":"keep-alive",
            "Cookie":"uuid2=%(uid)s; sess=1; icu=ChIIjIAQEAoYASABKAEw2s7slwUQ2s7slwUYAQ.." % {"uid":self.uid},
            "Host":"ib.adnxs.com",
            "User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/32.0.1700.107 Safari/537.36"
        }
        auction = requests.get(URL % (self.tag,self.domain), headers=headers)
        self.result = auction.content

    def auction_diagnostics(self):
        self.auction_id = re.findall("Auction ID: (\d+)",self.result)[0]
        self.last_imp = ",".join(re.findall("Last imp: (\d+)",self.result))
        s = re.compile("Auction\s+(\d+)\s+result:\s+(.*?)\n\t((?:.|\n\t|\n\s+)*)\n")
        p = re.compile("(?:.*?(\d+\\.\d+))")

        try: 
            auction = s.findall(self.result)[0][0] 
            result = s.findall(self.result)[0][1]

            self.auction_result = zip(
                [ 
                  "gross_bid","winning_bid","biased_bid",
                  "soft_floor","%mod","$mod","%mod2",
                  "$mod2","second_price_calc","second_price",
                  "win_price","gross_win_price"
                ],
                p.findall(s.findall(self.result)[0][2])
            )
        except:
            pass
 
    def add_debug_info(self,df):
        df['auction_id'] = self.auction_id
        df['uid'] = self.uid
        df['tag'] = self.tag
        

    @formattable
    def frequency_info(self,*args,**kwargs):
        frequency = pandas.DataFrame(
            re.findall("(?:(?:Advertiser (\d+))|(?:Campaign (\d+))|(?:Campaign Group (\d+))|(?:Creative (\d+))): (\d+) .*?, (\d+) .*?, (\d+) .*?, (\d+).*?\n",self.result),
            columns=["advertiser","campaign","lineitem","creative","session","day","lifetime","last_imp"]
        ).applymap(lambda x: int(x) if x != '' else '')
        self.add_debug_info(frequency)
        return frequency
    
    @formattable
    def frequency_summary(self,*args,**kwargs):
        frequency_objects = self.frequency_info()
        frequency_summary = frequency_objects[["session","day","lifetime"]].sum()
        frequency_summary['count'] = len(frequency_objects)
        return frequency_summary

    @formattable
    def conversion_info(self,*args,**kwargs):
        conversion = pandas.DataFrame(
            re.findall("Pixel (\d+).*?\n.*?(\d+).*?\n\s+(.*?) auction.*?:.*?(\d+).*?\n.*?(\d+)",self.result),
            columns=["pixel","campaign","pc/pv","since","until"]
        )
        self.add_debug_info(conversion)
        return conversion

    @formattable
    def conversion_summary(self,*args,**kwargs):
        conversion_objects = self.conversion_info()
        return conversion_objects.groupby("pc/pv")["pc/pv"].count()

    @formattable
    def privledged_bids(self,*args,**kwargs):
        regex = "<h2>Privileged Bids</h2>\n(<table>.*?</table>)"
        privledged_bids = self.regex_html_to_df(regex,self.result)
        self.add_debug_info(privledged_bids)

        return privledged_bids

    @formattable
    def all_bids(self,*args,**kwargs):
        regex = "<h2>All Bids</h2>\n(<table>(?:\n|.)*?</table>)"
        all_bids = self.regex_html_to_df(regex,self.result)
        self.add_debug_info(all_bids)

        return all_bids

    @formattable
    def final_bids(self,*args,**kwargs):
        regex = "<h2>Final Bids</h2>\n(<table>(?:\n|.)*?</table>)"
        final_bids = self.regex_html_to_df(regex,self.result)
        self.add_debug_info(final_bids)
        return final_bids

    @formattable
    def optimized_bids(self,*args,**kwargs):
        bids = self.all_bids()
        return bids[bids['Learn Type'] == "Optimized"]

    @formattable
    def bidder_bids(self,*arg,**kwargs):
        bidder_regex = re.compile("\n\t(Bidder\s+?(\d+):(?:.|\n\t\t)*\n)")
        bids_regex = re.compile("(\d+) Member: (\d+).*?\\$(\d+\\.\d+) .*?\\$(\d+\\.\d+)")

        bids = bidder_regex.findall(self.result)
        bidder_bids = pandas.DataFrame([
                list(j) + [i[1]] for i in bids for j in bids_regex.findall(i[0])
            ],
            columns=["auction_id","member_id","bid","net_bid","bidder"]
        )
        self.add_debug_info(bidder_bids)
        return bidder_bids

    def bid_density(self,*args,**kwargs):
        bids = self.bidder_bids()
        bids['bid'] = bids.bid.map(float)
        described = bids.bid.describe()
        described['total'] = described['count']*described['mean']
        return described



if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--tag",default="1823989")
    parser.add_argument("--uid",default="564153939259713281")
    parser.add_argument("--domain",default="")
    parser.add_argument("--seller",default="")


    args = parser.parse_args()
    import time
    start = time.time()
    d = Debug(args.tag,args.uid,args.domain,args.seller,"300","250","24.99.225.175") 
    d.post()
    d.auction_diagnostics()
    print d.bid_density()
    print d.conversion_summary()
    print d.frequency_summary()
    print time.time() - start

