import json
import os
import logging
from campaign_lib.report_helper import get_report, get_sql

def get_data(_json,api,reporting):

    try:
        _json['report_advertiser'] = [i for i in _json['settings'] if i['key'] == "report_advertiser"][0]['value']
        _json['sql_advertiser'] = [i for i in _json['settings'] if i['key'] == "sql_advertiser"][0]['value']
    except:
        pass


    if _json.get("report",False):
        raw_data = get_report(_json['report_advertiser'],_json,api,reporting)

    if _json.get("sql",False):
        raw_data = get_sql(_json['sql_advertiser'],_json, reporting)

    return raw_data
    
def run_transform(_json):
    
    import subprocess
    import json

    print os.path.dirname(__file__) + '/../../../shared/js/run_transform.js'

    process2 = subprocess.Popen(['node',os.path.dirname(__file__) + '/../../../shared/js/run_transform.js'], stdout=subprocess.PIPE, stdin=subprocess.PIPE)
    data = process2.communicate(input=json.dumps(_json) )[0]
    import pandas 
    return pandas.DataFrame(json.loads(data)['data'])



def run_filter(df,opt_json):
    
    import subprocess
    import json

    print os.path.dirname(__file__) + '/../../../shared/js/run_filter.js'

    process2 = subprocess.Popen(['node',os.path.dirname(__file__) + '/../../../shared/js/run_filter.js',json.dumps(opt_json['filters'])], stdout=subprocess.PIPE, stdin=subprocess.PIPE)
    data = process2.communicate(input=json.dumps(df.to_dict('records')) )[0]

    import pandas 
    return json.loads(data)

def run(opt_name=False, advertiser=False):
    from link import lnk

    db = lnk.dbs.crushercache
    reporting = lnk.dbs.reporting
    api = lnk.api.console
    logging.info("opt - initialized connectors")

    if opt_name and advertiser:
        df = db.select_dataframe("SELECT * FROM optimization where name = '%s' and active = 1 and deleted = 0 and advertiser_id = %s" % (opt_name, advertiser))
    else:
        df = db.select_dataframe("SELECT * FROM recurring_optimizations where days like concat('%',DATE_FORMAT(NOW(),'%a'),'%')  and time like concat('%',DATE_FORMAT(NOW(),'%H'),'%') ")
        


    logging.info("opt - found scheduled jobs: %s" % len(df))


    if len(df) == 0:
        logging.info("No scheduled jobs found")
        return


    for i, row in df.iterrows():
        logging.info("opt - starting job: %s" % i)
        _json = json.loads(row.state)

        logging.info("opt - running job: " + json.dumps(_json))

        try:
            raw_data = get_data(_json, api, reporting)
            _json['data'] = raw_data.to_dict('records')

            
            if 'transforms' not in _json.keys():
                _json['transforms'] = [{'name':"null", 'eval':"1"}]
            else:
                _json['transforms'] = [x for x in _json['transforms'] if x['eval']!=""] + [{'name':"null", 'eval':"1"}]

            logging.info("opt - transforming: " + json.dumps(_json['transforms']) )
            data = run_transform(_json)

            logging.info("opt - filtering: " + json.dumps(_json['filters']) )
            filter_data = run_filter(data, _json)

            logging.info("opt - filtered data: %s to %s" % (len(data) , len(filter_data)) )

            import runner
            import parse

            dparams = parse.parse({"params":_json['settings']})

            logging.info("opt - starting updates.")
            runner.runner(dparams,filter_data,api,row['name'])

            logging.info("opt - finished updates.")
            logging.info("opt - finished job: %s" % i)

        except Exception as e:
            logging.info("opt - encountered error %s" %e)




if __name__ == "__main__":
    from link import lnk

    from lib.report.utils.options import define
    from lib.report.utils.options import options
    from lib.report.utils.options import parse_command_line
    from lib.report.utils.loggingutils import basicConfig

    define('console', default=True)
    define('name', default=False)
    define('advertiser', default=False)


    parse_command_line()
    basicConfig(options=options)

    run(options.name, options.advertiser)
