import mock
import lib.helpers
import sys
sys.path.append("../../")

def side_effect(func):
    def inner(*args, **kwargs):
        return func(*args, **kwargs)
    return inner

mocked_deferred = mock.MagicMock()
mocked_deferred.side_effect = side_effect

lib.helpers.decorators.deferred = mocked_deferred

def rate_limited_side_effect(func):
    return func

mocked_rate_limited = mock.MagicMock()
mocked_rate_limited.side_effect = rate_limited_side_effect

lib.helpers.decorators.rate_limited = mocked_rate_limited
