from cache_runner_base import BaseRunner

import pandas
import logging
import uuid

from topic.run_email import main

def runner(advertiser=None, pattern=None, email=None, title=None, subject=None, limit=5, **kwargs):

    if None in [advertiser, pattern, email, title, subject]:
        raise Exception("missing required params")

    job_name = kwargs.get("job_id", "local_"+str(uuid.uuid4()))
    db = kwargs['connectors']['crushercache']
    
    main(db, advertiser, pattern, email, title, subject, limit)

if __name__ == "__main__":

    from lib.report.utils.loggingutils import basicConfig
    from lib.report.utils.options import define
    from lib.report.utils.options import options
    from lib.report.utils.options import parse_command_line

    define("advertiser",  default="")
    define("pattern", default="/")
    define("title", default=" Your ")
    define("subject", default="Hindsight Daily Digest")

    define("email", default="rick@rockerbox.com")
    define("limit", default=10)


    basicConfig(options={})
    parse_command_line()
    from link import lnk
    runner(options.advertiser, options.pattern, options.email, options.title, options.subject, options.limit, connectors = {"crushercache" : lnk.dbs.crushercache})
