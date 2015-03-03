import json
import time
from link.wrappers import ConsoleAPIRequestWrapper

MAX_TRIES = 20

def csv_to_dataframe(csv):
    import StringIO
    import pandas
    s = StringIO.StringIO(csv)
    df = pandas.read_csv(s) 

    return df 


def formattable(default=False):

    def build_formattable(fn):

        def formatter(self,*args,**kwargs):
            formatter = kwargs.get("formatter",default)
            result = fn(self,*args,**kwargs)
            return formatter(result) if formatter else result

        return formatter

    return build_formattable

class ReportAPIRequestWrapper(ConsoleAPIRequestWrapper):
    def __init__(self, wrap_name=None, base_url=None, user=None, password=None):
        self._token = None
        super(ReportAPIRequestWrapper, self).__init__(wrap_name = wrap_name, 
                                                       base_url=base_url,
                                                       user=user,
                                                       password=password)

    def post_report(self,data,advertiser_id=None):
        base = "/report"
        if advertiser_id:
            base += "?advertiser_id=%s" % advertiser_id

        _resp = self.request('post', url_params=base, data=data).content
        _json = json.loads(_resp)

        report_id = _json.get('response',{}).get('report_id',False)
        if not report_id:
            raise Exception('No reporting found for %s' % base)
        return report_id

       
    def check_reporting(self,report_id,_tries=1):
        base = "/report?id=%s" % report_id
        
        _resp = self.request('get',base).content
        _json = json.loads(_resp)

        report_url = _json.get('response',{}).get('report',{}).get('url',False)
        if report_url:
            return "/%s" % report_url
        elif _tries < MAX_TRIES:
            time.sleep(5*_tries)
            print report_id, _tries
            return self.check_reporting(report_id,_tries+1)


    @formattable(csv_to_dataframe)
    def get_report(self, advertiser_id = None, data='', **kwargs):
        
        report_id = self.post_report(data,advertiser_id)
        report_url = self.check_reporting(report_id)
        try:
            got = self.request('get',report_url)
        except Exception, e:
            print str(e)[:300]
        
        return got.content

        
