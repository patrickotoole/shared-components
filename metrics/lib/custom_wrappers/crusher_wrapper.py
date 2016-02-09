import json
import pandas
from link.wrappers import APIRequestWrapper, APIResponseWrapper
import requests
from requests.auth import AuthBase

class CrusherAPIRequestWrapper(APIRequestWrapper):
  
    def __init__(self, wrap_name=None, base_url=None, user=None, password=None):
        self._token=None
        super(CrusherAPIRequestWrapper, self).__init__(wrap_name = wrap_name,
                                                        base_url=base_url,
                                                        user=user,
                                                        password=password,
                                                        response_wrapper=APIResponseWrapper)

    def authenticate(self):
        data = {"username":self.user,"password":self.password}
        auth_data = json.dumps(data)
        self._wrapped = requests.session()
        #resp = requests.post("http://crusher.getrockerbox.com/login", data=auth_data, auth=None)
        auth_data = self.post("/login", data = auth_data, auth=None)
        _token = dict(auth_data.cookies)
        self._token = _token
        self._wrapped.auth = CrusherAuth(_token) 

    @property
    def token(self):
        if not self._token:
            self._token= self.authenticate().token
        return self._token


class CrusherAuth(AuthBase):

    def __init__(self,token):
        self.token = token

    def __call__(self, r):
        r.cookies = self.token
        return r
