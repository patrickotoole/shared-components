import sys
import os.path
sys.path.append(
    os.path.abspath(os.path.join(os.path.dirname(__file__), os.path.pardir)))

from report_helper import get_report


def run(df,opt_json):
    
    import subprocess
    import json

    process2 = subprocess.Popen(['node',os.path.dirname(__file__) + '/run_filter.js',json.dumps(opt_json['filters'])], stdout=subprocess.PIPE, stdin=subprocess.PIPE)
    data = process2.communicate(input=json.dumps(df.to_dict('records')) )[0]

    import pandas 
    return json.loads(data)

if __name__ == "__main__":
    import json
    from link import lnk

    db = lnk.dbs.crushercache
    reporting = lnk.dbs.reporting
    api = lnk.api.console

    df = db.select_dataframe("SELECT * FROM recurring_optimizations where days = DATE_FORMAT(NOW(),'%a') and time = 10")

    _json = json.loads(df.iloc[0].state)

    raw_data = get_report(_json['advertiser'],_json,api,reporting)
    filter_data = run(raw_data,_json)



    import runner
    import parse

    dparams = parse.parse({"params":_json['settings']})

    runner.runner(dparams,filter_data,api)
