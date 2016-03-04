import logging
from temporal import *

def process_before_and_after(db,urls,domains,response):

    logging.info("Started before and after...")

    joined = url_domain_intersection(urls,domains)
    before, after = before_and_after(joined)

    # before
    before_grouped = groupby_timedifference(before)
    idf = get_idf(db,set(before_grouped.domain))

    merged = before_grouped.merge(idf,on="domain")
    before_domains = time_bucket_domains(merged)
    before_categories = category_time_buckets(merged).to_dict()

    before_categories = [{"key":k,"values":v} for k,v in before_categories.items()]

    # after
    after_grouped = groupby_timedifference(after)
    idf = get_idf(db,set(after_grouped.domain))

    merged = after_grouped.merge(idf,on="domain")
    after_domains = time_bucket_domains(merged)
    after_categories = category_time_buckets(merged).to_dict()

    after_categories = [{"key":k,"values":v} for k,v in after_categories.items()] 

    # response
    response['before_categories'] = before_categories
    response['before_domains'] = before_domains.T.to_dict()

    response['after_categories'] = after_categories
    response['after_domains'] = after_domains.T.to_dict()

    logging.info("Finished before and after.")

    return response
