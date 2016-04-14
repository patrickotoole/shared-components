import logging
from report import Report

def get_advertisers(db):
    df = db.select_dataframe("select * from advertiser where active=1 and deleted=0 and running=1")
    return set(df.external_advertiser_id)

def run(db, console, rockerbox, ids, report_types):
    advertisers = ids or get_advertisers(rockerbox)

    for advertiser_id in advertisers:
        try:
            logging.info("Running: %s" % advertiser_id)
            r = Report(db,console,advertiser_id, start_date, end_date, report_types)
            r.run()
        except Exception as e:
            raise e
    

if __name__ == "__main__":
    from link import lnk
    import timeutils

    from lib.report.utils.options import define
    from lib.report.utils.options import options
    from lib.report.utils.options import parse_command_line

    from lib.report.utils.loggingutils import basicConfig

    define('start_date', default='7h')
    define('end_date', default='6h')
    define('external_advertiser_ids', type=int, multiple=True)
    define('report_types', type=str, multiple=True)
    define('console', default=True)


    parse_command_line()
    basicConfig(options=options)


    start_date, end_date = timeutils.get_start_end_date(
        options.start_date,
        options.end_date, 
        "hours"
    )
 
    db = lnk.dbs.reporting
    rockerbox = lnk.dbs.rockerbox
    console = lnk.api.console

    ids = options.external_advertiser_ids

    run(db, console, rockerbox, ids, options.report_types)
