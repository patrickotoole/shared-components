from link.wrappers import JsonClient

class PaginatedConsoleAPIRequestWrapper(JsonClient):
    def __init__(self, wrap_name=None, base_url=None, user=None, password=None):
        self._token = None
        super(PaginatedConsoleAPIRequestWrapper, self).__init__(wrap_name = wrap_name, 
                                                       base_url=base_url,
                                                       user=user,
                                                       password=password)

    def get_profile(self, url_params = '', key="campaign", **kwargs):
        response = self.get(url_params, **kwargs).json['response']
        items = response[key]

        return self.get("/profile?id=%s" % items['profile_id'])


    def get_all_pages(self, url_params = '', key= '', **kwargs):
        if '?' in url_params:
            delimiter = '&'
        else:
            delimiter = '?'
        response = self.get(url_params, **kwargs).json['response']
        items = response[key]
        total = response['count']
        num = response['start_element'] + response['num_elements']
        while num < total:
            response = self.get(url_params + delimiter + "start_element=%s" % num, **kwargs).json['response']
            items += response[key]
            num = response['start_element'] + response['num_elements']
        return items

    def post_all_pages(self, url_params = '', obj = '', key= '', **kwargs):
        if '?' in url_params:
            delimiter = '&'
        else:
            delimiter = '?'
        response = self.post(url_params, obj, **kwargs).json['response']
        items = response[key]
        total = response['count']
        num = response['start_element'] + response['num_elements']
        while num < total:
            response = self.post(url_params + delimiter + "start_element=%s" % num, obj, **kwargs).json['response']
            items += response[key]
            num = response['start_element'] + response['num_elements']
        return items

    def put_it(self, url_params = '', obj = '', key= '', **kwargs):
        response = self.put(url_params, obj, **kwargs).json['response']
        items = response[key]
        return items



