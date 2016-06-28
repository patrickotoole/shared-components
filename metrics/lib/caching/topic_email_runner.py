from cache_runner_base import BaseRunner

import pandas
import logging
import uuid

from topic.run_email import main

def runner(advertiser=None, pattern=None, email=None, title=None, **kwargs):

    if None in [advertiser, pattern, email, title]:
        raise Exception("missing required params")

    job_name = kwargs.get("job_id", "local_"+str(uuid.uuid4()))
    
    main(advertiser, pattern, email, title)

if __name__ == "__main__":

    from lib.report.utils.loggingutils import basicConfig
    from lib.report.utils.options import define
    from lib.report.utils.options import options
    from lib.report.utils.options import parse_command_line

    define("advertiser",  default="")
    define("pattern", default="/")
    define("title", default=" Your ")
    define("email", default="rick@rockerbox.com")

    basicConfig(options={})
    parse_command_line()

    main(options.advertiser, options.pattern, options.email, options.title)
