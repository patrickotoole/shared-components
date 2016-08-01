from link import lnk
import requests
import ujson
import time
import logging

QUERY = "select * from topic_runner_segments"

def check_job(job_id):
    try:
        j = requests.get("http://workqueue.crusher.getrockerbox.com/jobs/%s" % job_id,auth=("rockerbox","rockerbox")).json()
        return (len(j['entries']) == 0) and (len(j['running']) == 0)
    except:
        logging.info("error checking on status")
        return True 

def run_job(d):
    
    logging.info("submitting")
    resp = requests.post("http://workqueue.crusher.getrockerbox.com/jobs",data=d,auth=("rockerbox","rockerbox"))
    job_id = resp.json()['job_id']
    logging.info("submitted!")
    
    done = False
    while not done:
        time.sleep(10)
        logging.info("checking...")
        done = check_job(job_id)

    logging.info("job_complete!")

def create_json(ADVERTISER, PATTERN, FILTER_ID):
    d1 = ujson.dumps({
        "advertiser": ADVERTISER,
        "filter_id": FILTER_ID,
        "parameters":{},
        "pattern":PATTERN,
        "udf":"domains_full_time_minute"
    })

    d2 = ujson.dumps({
        "advertiser": ADVERTISER,
        "filter_id": FILTER_ID,
        "parameters":{},
        "pattern":PATTERN,
        "udf":"topic_runner"
    })
    return d1, d2


if __name__ == "__main__":

    from link import lnk

    db = lnk.dbs.crushercache
    df = db.select_dataframe(QUERY)
    
    for advertiser_segment in df.iterrows():
        d1, d2 = create_json(advertiser_segment[1]['advertiser'], advertiser_segment[1]['pattern'], advertiser_segment[1]['filter_id'])
        logging.info("job 1:")
        run_job(d1)
        logging.info("job 2:")
        run_job(d2)
