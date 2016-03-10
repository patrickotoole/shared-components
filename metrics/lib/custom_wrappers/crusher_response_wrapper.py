import json
from link.wrappers import APIResponseWrapper

class CrusherResponseWrapper(APIResponseWrapper):

    @property
    def json(self):
        """
        custom response wrapper to raise error if response contains 'error' as a key
        """
        if not self._json:
            try:
                self._json = json.loads(self.content)
                if type(self._json) == dict and self._json.get("error") != None:
                    raise AttributeError(self._json["error"])
            except:
                raise ValueError("Response is not valid json %s " % self.content)
        return self._json
