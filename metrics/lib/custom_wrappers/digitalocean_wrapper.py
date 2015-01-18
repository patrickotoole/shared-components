import json
import pandas
from link.wrappers import APIRequestWrapper
from requests.auth import HTTPBasicAuth

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

class DigitalOceanAPIRequestWrapper(APIRequestWrapper):
    def __init__(self, wrap_name=None, base_url=None, user=None, password=None):
        self._token = None
        super(DigitalOceanAPIRequestWrapper, self).__init__(wrap_name = wrap_name, 
                                                       base_url=base_url,
                                                       user=user,
                                                       password=password)
    def authenticate(self):
        """
        The authenicate function is called in the init of APIRequestWrapper.  
        This can be overridden for customized Authentication.  By Default
        it will auth using HTTPBasicAuth
        """
        if self.user:
            # self._wrapped object is the requests.session() object. So we just set the
            # auth here
            self._wrapped.auth = HTTPBasicAuth(self.user, "") 

    def droplets(self,like=False):
        from pandas import DataFrame
        df = DataFrame(self.get("/droplets?per_page=200").json['droplets'])
        if like:
            df = df[df.name.map(lambda x: like in x)]

        df['public_ip_address'] = df.networks.map(lambda x: ([{}] + [i for i in x['v4'] if i['type'] == "public"])[-1].get('ip_address') )
        df['private_ip_address'] = df.networks.map(lambda x: ([{}] + [i for i in x['v4'] if i['type'] == "private"])[-1].get('ip_address') ) 

        return df.T.to_dict().values()

    def etc_hosts(self,hosts_type="private",like=False):
        from pandas import DataFrame
        di = self.droplets(like)
        df = DataFrame(di)
        df = df[["%s_ip_address" % hosts_type,"name"]]
        return "\n".join(["%s %s" % tuple(i.values()) for i in df.T.to_dict().values()])
