import logging

from auction_runner import AuctionsRunner
from analyze import summarize_bidding

from lib.report.utils.loggingutils import setup_logger
from lib.report.utils.loggingutils import basicConfig

from log import flumelog
from bidform_helpers import *
from lib.report.utils.constants import NUM_TRIES, FORM_HEADERS

def time_it(f, *args):
    import time
    start = time.clock()
    r = f(*args)
    print (time.clock() - start)*1000
    return r

def _setup_logging_for_flume(path):
    LOG_PARAMS = {
        "fmt": '{"timestamp":%(asctime)s, "bid_result": %(message)s }',
        "datefmt": '%s',
        "level": logging.WARNING
    }
    setup_logger('log_flume', path, **LOG_PARAMS)
    LOG_FLUME = logging.getLogger('log_flume')
    return LOG_FLUME

def batch(arr, size):
    cur_arr = []
    for item in arr:
        cur_arr.append(item)
        if len(cur_arr) >= size:
            yield cur_arr
            cur_arr = []
    if cur_arr:
        yield cur_arr

def run_campaign(campaign_id,uid,api):

    bidform_options = {
        "uid": uid,
        "use_cache": False
    }

    forms = campaign_forms(campaign_id,api,**bidform_options)
    to_return = []

    batched_forms = batch(forms, 50)
    for idx, forms in enumerate(batched_forms):
        resps = AuctionsRunner(forms).run_auctions(False)
        for (resp, form) in zip(resps, forms):
            summarized = time_it(summarize_bidding,resp.content,form.get("campaign_id"))
            to_log = dict(summarized,**form)
            to_return.append(to_log)
            
    return to_return
 


def main():
    define('flume_log_path', default='/tmp/flume.log', type=str)
    define('serial', default=False, type=bool, help='concurrent or not')
    define('limit', default=None, type=int, help='how many forms')
    define('batch_size', default=50, type=int)
    define('use_cache', default=False, type=bool)
    define('build_cache', default=False, type=bool) 

    define('aid', default=None, type=int, help='advertiser id, testing specific advertiser for user')  
    define('lid', default=None, type=int, help='line_item id, testing specific line_item for user') 
    define('cid', default=None, type=int, help='campaign id, testing specific campaign for user')
    define('uid', default=0, type=int, help='user-id combining with campaign_id to test campaign setting')

    # debug purposes
    define('debug', default=False, type=bool, help="if set to True, it doesnt do anything by should")
    define('verbose', default=False, type=bool, help='verbose')

    
    parse_command_line()
    basicConfig(options=options)

    if options.build_cache:
        if not options.aid:
            raise Exception("need to specify advertiser id")
        build_cache(options.aid)
        return
     

    LOG_FLUME = _setup_logging_for_flume(options.flume_log_path)

    bidform_options = {
        "uid": options.uid,
        "use_cache": options.use_cache,
        "verbose": options.verbose
    }

    if options.cid:
        forms = campaign_forms(options.cid,**bidform_options)
    elif options.lid:
        forms = lineitem_forms(options.lid,**bidform_options) 
    elif options.aid:
        forms = advertiser_forms(options.aid,**bidform_options)
    else:
        raise exception("need specify a campaign, line_item or advertiser_id")

    if options.limit:
        forms = forms[:options.limit]

    batched_forms = batch(forms, options.batch_size)
    for idx, forms in enumerate(batched_forms):
        logging.info("running auctions for %s forms" % len(forms))
        resps = AuctionsRunner(forms).run_auctions(options.serial)
        logging.info("completed running %s auctions" % len(forms))
        for (resp, form) in zip(resps, forms):
            summarized = time_it(summarize_bidding,resp.content,form.get("campaign_id"))
            to_log = dict(summarized,**form)
            flumelog(to_log, logger=LOG_FLUME)


if __name__ == '__main__':
    from lib.report.utils.options import define
    from lib.report.utils.options import options
    from lib.report.utils.options import parse_command_line
    exit(main())
