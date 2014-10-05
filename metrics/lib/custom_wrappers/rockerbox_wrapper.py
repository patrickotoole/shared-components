import json
import pandas
from link.wrappers import APIRequestWrapper

def json_as_dataframe(json_string):
    _json = json.loads(json_string)
    return pandas.DataFrame(_json)

def formattable(default=False):

    def build_formattable(fn):

        def formatter(self,*args,**kwargs):
            formatter = kwargs.get("formatter",default)
            result = fn(self,*args,**kwargs)
            return formatter(result) if formatter else result

        return formatter

    return build_formattable

class RockerboxAPIRequestWrapper(APIRequestWrapper):
    def __init__(self, wrap_name=None, base_url=None, user=None, password=None):
        self._token = None
        super(RockerboxAPIRequestWrapper, self).__init__(wrap_name = wrap_name, 
                                                       base_url=base_url,
                                                       user=user,
                                                       password=password)
    
    @formattable(json_as_dataframe)
    def get_report(self, url_params= '', data='', **kwargs):
        
        return self.get(url_params= url_params).content

        
