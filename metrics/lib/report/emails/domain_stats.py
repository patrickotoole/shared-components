import logging
from datetime import timedelta

from tornado.options import define
from tornado.options import options
from tornado.options import parse_command_line

from lib.report.emails.emails import send_multi_table_report_email
from lib.report.emails.models import HighlightRow
from lib.report.emails.models import Table
from lib.report.utils.utils import get_start_end_date
from lib.report.utils.utils import convert_datetime
from lib.report.reportutils import get_report_obj
from lib.report.reportutils import get_advertisers
from lib.report.analyze.report import _modify_domain_columns
from lib.report.analyze.report import apply_filter
from lib.report.analyze.report import _sort_by_best
from lib.report.analyze.report import _sort_by_worst
from lib.report.analyze.report import transform_
from lib.report.analyze.report import _filter_domain

hundred_k = 100000
ten_k = 10000

"different convs thresholds, use as predicates for month or day"
MON_CONVS_THRES = 2
DAY_CONVS_THRES = 0

def _is_a_month(start, end):
    _t = convert_datetime(end) - convert_datetime(start)
    return _t >= timedelta(days=28)

def _get_tables(limit=None,
        start_date=None,
        end_date=None,
        pred=None,
        ):
    """
    @return list(Table)
    """
    df = get_report_obj('domain')._get_report(
            group = 'advertiser,domain,line_item',
            start_date=start_date,
            end_date=end_date,
            cache=True,
            )
    df = _modify_domain_columns(df)
    _ismonth = _is_a_month(start_date, end_date)
    best_df = _filter_best(_filter_domain(df), _ismonth, pred)
    worst_df = _filter_worst(_filter_domain(df), _ismonth, pred)

    best_domain_summary = Table('Best performers', _to_list(best_df))
    worst_domain_summary = Table('Worst Performers', _to_list(worst_df))
    _best = _get_tables_by_adver(best_df, limit)
    _worst = _get_tables_by_adver(worst_df, limit)

    tables = [
            best_domain_summary,
            worst_domain_summary,
            ]
    tables = ([best_domain_summary] + [b for b in _best] +
              [worst_domain_summary] + [w for w in _worst]
              )
    return tables

def _filter_best(df, _ismon, pred):
    pred_new = 'convs > %d' % (MON_CONVS_THRES if _ismon else DAY_CONVS_THRES)
    if pred:
        pred_new = '%s&%s' % (pred, pred_new)
    df = apply_filter(df, pred_new)
    df = _sort_by_best(df)
    df = transform_(df)
    return df

def _filter_worst(df, _ismon, pred):
    pred_new = 'imps>%d&convs=0' % (hundred_k if _ismon else ten_k)
    if pred:
        pred_new = '%s&%s' % (pred, pred_new)
    df = apply_filter(df, pred_new)
    df = _sort_by_worst(df)
    df = transform_(df)
    return df

def _get_tables_by_adver(df, limit):
    """
    worst or best depends on param df
    @return: list(Table)
    """
    to_return = []
    _advertisers = list(get_advertisers().values)
    for _id, name in _advertisers:
        headers = '%s -- %s' % (name, _id)
        cp_df = df.copy(deep=True)
        cp_df = cp_df[cp_df['advertiser'] == _id][:limit]
        if not cp_df.empty:
            rows = _to_list(cp_df)
            table = Table(headers, rows)
            to_return.append(table)
    return to_return

def _to_list(df):
    """
    @param: df: DataFrame
    @return: list(tuple('imps', 'booked_revenue', etc.))
    """
    names = ['advertiser', 'domain', 'line_item', 'imps', 'clicks', 'ctr', 'convs',
             'pv_convs', 'pc_convs', 'rev', 'mc', 'profit']
    df = df.reset_index(drop=True)
    dict_ = df.to_dict()
    headers  = dict_.keys()
    _rank = dict(zip(names, range(len(headers))))
    headers = sorted(headers, key=lambda h: _rank.get(h))
    results = [ dict_.get(h).values() for h in headers ]
    results = zip(*results)
    if not results:
        return []
    results = [tuple(headers)] + results
    return map(lambda r: r[1:], results)


def main():
    define("to", type=str, multiple=True, help="email reciever")
    define('limit', type=int, default=10)
    define('start_date', type=str, default='28h')
    define('end_date', type=str, default='4h')
    define('pred', type=str)
    define('act', type=bool, default=False)
    parse_command_line()

    start_date, end_date = get_start_end_date(options.start_date, options.end_date)
    subject = 'report domain stats: {start_date} - {end_date}'.format(
            start_date=start_date,
            end_date=end_date,
            )
    tables = _get_tables(limit=options.limit,
            start_date=start_date,
            end_date=end_date,
            pred=options.pred,
            )

    if options.act:
        logging.info("sending email to %s" % options.to)
        send_multi_table_report_email(options.to, tables,
                subject=subject,
                )
        return
    else:
        logging.info("--act to actually sent the email")
        pprint(tables)

if __name__ == '__main__':
    exit(main())

