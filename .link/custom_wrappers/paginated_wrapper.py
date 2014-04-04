from link.wrappers import ConsoleAPIRequestWrapper
from link.wrappers import ConsoleAPIResponseWrapper

class PaginatedConsoleAPIRequestWrapper(ConsoleAPIRequestWrapper):
		def __init__(self, wrap_name=None, base_url=None, user=None, password=None):
				self._token = None
				super(PaginatedConsoleAPIRequestWrapper, self).__init__(wrap_name = wrap_name, 
                                                       base_url=base_url,
                                                       user=user,
                                                       password=password)

		def get_all_pages(self, url_params = '', key= '', **kwargs):
				response = self.get(url_params, **kwargs).json['response']
				items = response[key]
				total = response['count']
				num = response['start_element'] + response['num_elements']
				while num < total:
						response = self.get(url_params + "?start_element=%s" % num, **kwargs).json['response']
						items += response[key]
						num = response['start_element'] + response['num_elements']
				return items

		def post_all_pages(self, url_params = '', obj = '', key= '', **kwargs):
				response = self.post(url_params, obj, **kwargs).json['response']
				items = response[key]
				total = response['count']
				num = response['start_element'] + response['num_elements']
				while num < total:
						response = self.post(url_params + "?start_element=%s" % num, obj, **kwargs).json['response']
						items += response[key]
						num = response['start_element'] + response['num_elements']
				return items
