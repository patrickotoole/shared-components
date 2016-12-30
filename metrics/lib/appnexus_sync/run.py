import logging
import advertiser_campaign

def get_advertisers(db):
    df = db.select_dataframe("select * from advertiser where active=1 and deleted=0 and running=1 and media=1")
    return set(df.external_advertiser_id)

def run(console, rockerbox, ids):
    advertisers = ids or get_advertisers(rockerbox)

    for advertiser_id in advertisers:
        logging.warning("Running: %s" % advertiser_id)
        advertiser_campaign.run(advertiser_id, console, rockerbox)


if __name__ == "__main__":

    from link import lnk

    from lib.report.utils.options import define
    from lib.report.utils.options import options
    from lib.report.utils.options import parse_command_line
    from lib.report.utils.loggingutils import basicConfig

    define('console', default=True)
    define('external_advertiser_ids', type=int, multiple=True)

    parse_command_line()
    basicConfig(options=options)

    ids = options.external_advertiser_ids
    rockerbox = lnk.dbs.rockerbox
    console = lnk.api.console

    run(console, rockerbox, ids)