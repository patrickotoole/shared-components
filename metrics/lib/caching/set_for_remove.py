from link import lnk


QUERY = ""

class remover():

    def __init__(self, connectors):
        self.connectors = connectors

    def get_segs(self):
        self.connectors['crushercache'].select_dataframe(QUERY)

    def set_to_del(self, crusher, pattern):
        _resp = crusher.get('/crusher/pattern_search/timeseries_only?search={}'.format(pattern))
        data = _resp.json()
        data_dict = dict(data['results'][0])
        has_data = False
        for key, val in data_dict.items():
            if key == 'views':
                if value >0:
                    has_data = True
            if has_data:
                break
        return has_data

    def set_pattern_to_delete(self,pattern):
        return True

    def setter(self,crusher, pattern):
        has_data = self.set_to_del(crusher, pattern)
        if not has_data:
            self.set_pattern_to_delete(pattern)
