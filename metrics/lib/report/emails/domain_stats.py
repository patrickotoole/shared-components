import logging
from datetime import timedelta
from pprint import pprint

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
from lib.report.analyze.report import AnalyzeDomain


hundred_k = 100000
ten_k = 10000

"different convs thresholds, use as predicates for month or day"
MON_CONVS_THRES = 2
DAY_CONVS_THRES = 0

def _is_a_month(start, end):
    """
    @param  start : str
    @param  end   : str
    @return       : bool
    """
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
    best_df, worst_df = _get_dfs(start_date=start_date, end_date=end_date, pred=pred)
    _best_summary = _create_table(best_df, title='Best performers')
    _worst_summary = _create_table(worst_df, title='Worst Performers')
    _best = _get_tables_by_adver(best_df, limit)
    _worst = _get_tables_by_adver(worst_df, limit)
    tables = (
            [ _best_summary  ]  + _best +
            [ _worst_summary ]  + _worst
            )
    return tables

def _get_dfs(start_date=None,
        end_date=None,
        pred=None,
        ):
    """
    @param start_date: str
    @param end_date:   str
    @return: Tuple(Dataframe(best), Dataframe(worst))
    """
    df = get_report_obj('domain')._get_report(
            group = 'advertiser,domain,line_item',
            start_date=start_date,
            end_date=end_date,
            cache=True,
            )
    _ismon = _is_a_month(start_date, end_date)
    best_pred = _pred_for_best(_ismon)
    worst_pred = _pred_for_worst(_ismon)
    if pred:
        base = '%s&%s'
        best_pred = base % (best_pred, pred)
        worst_pred = base % (worst_pred, pred)
    best_df = _filter(df, best_pred, 'best')
    worst_df = _filter(df, worst_pred, 'worst')
    return best_df, worst_df

def _pred_for_best(_ismon):
    """
    @param _ismon : bool
    @return: str
    """
    return 'convs > %d' % (MON_CONVS_THRES if _ismon else DAY_CONVS_THRES)

def _pred_for_worst(_ismon):
    return 'imps>%d&convs=0' % (hundred_k if _ismon else ten_k)

def _filter(df, pred, metrics):
    return AnalyzeDomain(pred, metrics).analyze(df)

def _get_tables_by_adver(df, limit):
    """
    worst or best depends on param df
    @return: list(Table)
    """
    to_return = []
    _advertisers = list(get_advertisers().values)
    for _id, name in _advertisers:
        title = '%s -- %s' % (name, _id)
        cp_df = df.copy(deep=True)
        cp_df = cp_df[cp_df['advertiser'] == _id][:limit]
        if not cp_df.empty:
            table = _create_table(cp_df, title=title)
            if table:
                to_return.append(table)
    return to_return

def _create_table(df, title=None, to_drop='advertiser'):
    """
    @param: df:        DataFrame
    @param: title:     str
    @param: to_drop:   str
    @return:           Table
    """
    if to_drop:
        df = df.drop(to_drop, axis=1)
    names = ['domain', 'line_item', 'imps', 'clicks', 'ctr', 'convs',
             'pv_convs', 'pc_convs', 'rev', 'mc', 'profit']
    df = df.reset_index(drop=True)
    dict_ = df.to_dict()
    headers  = dict_.keys()
    _rank = dict(zip(names, range(len(headers))))
    headers = sorted(headers, key=lambda h: _rank.get(h))
    rs = [ dict_.get(h).values() for h in headers ]
    rs = zip(*rs)
    if not rs:
        return None
    return Table(headers=headers, title=title, rows=rs)


def main():
    define("to", type=str, multiple=True, help="email reciever")
    define('limit', type=int, default=100)
    define('start_date', type=str, default='28h')
    define('end_date', type=str, default='4h')
    define('pred', type=str)
    define('act', type=bool, default=False)
    parse_command_line()

    start_date, end_date = get_start_end_date(options.start_date,
            options.end_date, units='days')
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
        pprint([[r for r in t.rows] for t in tables][:options.limit])
        logging.info("--act to actually sent the email")

if __name__ == '__main__':
    exit(main())

