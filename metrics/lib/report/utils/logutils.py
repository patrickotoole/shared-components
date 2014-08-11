import logging
from lib.report.utils.utils import local_now

def logtimer(fn, *args, **kwargs):
    start_time = local_now()
    logging.info("start running function: %s, at %s" % (fn.__name__, start_time))
    res = fn(*args, **kwargs)
    end_time = local_now()
    logging.info("finished running function: %s, at %s" % (fn.__name__, end_time))
    return res
