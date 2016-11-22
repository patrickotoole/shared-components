def run(opt_json,db,api):

    import report_helper

    df = report_helper.get_report(opt_json['advertiser'],opt_json,api,db)

    import subprocess
    import json

    process2 = subprocess.Popen(['node','run_filter.js',json.dumps(opt_json['filters'])], stdout=subprocess.PIPE, stdin=subprocess.PIPE)
    data = process2.communicate(input=json.dumps(df.to_dict('records')) )[0]

    import pandas 
    return json.loads(data)

if __name__ == "__main__":
    import json
    from link import lnk

    db = lnk.dbs.crushercache
    reporting = lnk.dbs.reporting
    api = lnk.api.console

    df = db.select_dataframe("SELECT * FROM recurring_optimizations")

    _json = json.loads(df.iloc[0].state)
    filter_data = run(_json,reporting,api)

    _json['data'] = filter_data

    import runner

    runner.runner
