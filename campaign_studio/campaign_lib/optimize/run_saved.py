import json
import os
import logging
from campaign_lib.report_helper import get_report, get_sql

def get_data(_json,api,reporting):

    if _json.get("report",False):
        raw_data = get_report(_json['advertiser'],_json,api,reporting)

    if _json.get("sql",False):
        raw_data = get_sql(_json['advertiser'],_json, reporting)

    return raw_data
    

def run_filter(df,opt_json):
    
    import subprocess
    import json

    print os.path.dirname(__file__) + '/../../../shared/js/run_filter.js'

    process2 = subprocess.Popen(['node',os.path.dirname(__file__) + '/../../../shared/js/run_filter.js',json.dumps(opt_json['filters'])], stdout=subprocess.PIPE, stdin=subprocess.PIPE)
    data = process2.communicate(input=json.dumps(df.to_dict('records')) )[0]

    import pandas 
    return json.loads(data)

def run():
    from link import lnk

    db = lnk.dbs.crushercache
    reporting = lnk.dbs.reporting
    api = lnk.api.console
    logging.info("opt - initialized connectors")

    df = db.select_dataframe("SELECT * FROM recurring_optimizations where days like concat('%',DATE_FORMAT(NOW(),'%a'),'%')  and time like concat('%',DATE_FORMAT(NOW(),'%H'),'%') ")

    logging.info("opt - found scheduled jobs: %s" % len(df))


    if len(df) == 0:
        logging.info("No scheduled jobs found")
        return

    for i, row in df.iterrows():
        logging.info("opt - starting job: %s" % i)
        _json = json.loads(row.state)

        logging.info("opt - running job: " + json.dumps(_json))

        raw_data = get_data(_json, api, reporting)
        filter_data = run_filter(raw_data, _json)

        logging.info("opt - filtered data.")



        import runner
        import parse

        dparams = parse.parse({"params":_json['settings']})

        logging.info("opt - starting updates.")
        
        runner.runner(dparams,filter_data,api)

        logging.info("opt - finished updates.")
        logging.info("opt - finished job: %s" % i)




if __name__ == "__main__":
    run()
