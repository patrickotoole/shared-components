import json
import pandas
from crusher_response_wrapper import CrusherResponseWrapper
from link.wrappers import APIRequestWrapper
from link.wrappers import APIResponseWrapper
import requests
from requests.auth import AuthBase

class CrusherAPIRequestWrapper(APIRequestWrapper):
  
    def __init__(self, wrap_name=None, base_url=None, user=None, password=None):
        self._token=None
        super(CrusherAPIRequestWrapper, self).__init__(wrap_name = wrap_name,
                                                        base_url=base_url,
                                                        user=user,
                                                        password=password,
                                                        response_wrapper=CrusherResponseWrapper)

    def authenticate(self):
        data = {"username":self.user,"password":self.password}
        auth_data = json.dumps(data)
        self._wrapped = requests.session()
        auth_data = self.post("/login", data = auth_data, auth=None)
        _token = dict(auth_data.cookies)
        self._token = _token
        self._wrapped.auth = CrusherAuth(_token) 

    @property
    def token(self):
        if not self._token:
            self._token= self.authenticate().token
        return self._token

    def switch_user(self, username):
        user_perms = self.get("/account/permissions", cookies = self._token, auth=None)
        users = user_perms.json["results"]["advertisers"]
        advertiser_id = None
        for u in users:
            if u["pixel_source_name"] == username:
                advertiser_id = u["external_advertiser_id"]
        if advertiser_id:
            data = {"advertiser_id": advertiser_id}
            new_perm = self.post("/account/permissions", data = json.dumps(data), cookies = self._token, auth=None)
            _token = new_perm.cookies
            self._token = _token
        return advertiser_id

class CrusherAuth(AuthBase):

    def __init__(self,token):
        self.token = token

    def __call__(self, r):
        r.cookies = self.token
        return r
