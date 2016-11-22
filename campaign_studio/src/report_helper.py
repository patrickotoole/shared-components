def get_report(advertiser_id,dd, api, db):
    import datetime
    import json

    start_date = datetime.datetime.now() + datetime.timedelta(-30)
    end_date = datetime.datetime.now() + datetime.timedelta(1)

    start_date = start_date.date().isoformat()
    end_date = end_date.date().isoformat()


    from lib.appnexus_reporting.appnexus import AppnexusReport

    import hashlib
    m = hashlib.md5()
    m.update(json.dumps(dd))

    digest = str(m.hexdigest())

    report_wrapper = AppnexusReport(api, db, advertiser_id, start_date, end_date, "custom-" + digest)
    report_id = report_wrapper.request_report(advertiser_id,json.dumps(dd) % {"start_date":start_date,"end_date":end_date})
    report_url = report_wrapper.get_report(report_id)
    report_IO = report_wrapper.download_report(report_url)
    
    import pandas
    df = pandas.read_csv(report_IO)

    return df
