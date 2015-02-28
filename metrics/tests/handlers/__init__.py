import mock
import lib.helpers
import sys
sys.path.append("../../")

def side_effect(func):
    def inner(*args, **kwargs):
        result = [func()]
        for r in result:
            yield r
    return inner

mocked_deferred = mock.MagicMock()
mocked_deferred.side_effect = side_effect
lib.helpers.decorators = mock.MagicMock()
lib.helpers.decorators.deferred = mocked_deferred
import ipdb; ipdb.set_trace()
