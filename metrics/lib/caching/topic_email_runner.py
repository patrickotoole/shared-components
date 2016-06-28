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
    runner("fsastore","Baby","rick@rockerbox.com", " Baby ")
