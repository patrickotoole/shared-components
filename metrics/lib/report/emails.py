import logging
import os
import re

from tornado.template import Loader
import sendgrid
import premailer
from tornado.options import define
from tornado.options import options
from tornado.options import parse_command_line

from lib.report.reportutils import get_advertiser_ids
from lib.report.domain import ReportDomain

from lib.report.utils.constants import (
        DOMAIN,
        ADMIN_EMAIL,
        SENDGRID_USER,
        SENDGRID_PW,
        WEI_EMAIL,
        RON_EMAIL,
        )

REGEX = re.compile('\((\d+)\)')
TEMP_BASE = '_report_%s.html'
TEMP_MAIN_DIR = os.path.realpath(os.path.dirname(__file__) + '../../../templates/reporting')
EMAIL_BASE = '%s@rockerbox.com'
EMPTY = [" "]

def send_domain_email(to, limit,
        df=None,
        start_date=None,
        end_date=None,
        metrics=None,
        group=None,
        cache=True,
        ):
    subject = '{metrics} domain: {start_date} - {end_date}'.format(
            start_date=start_date,
            end_date=end_date,
            metrics=metrics,
            )
    rows = _get_domain_report_rows(df, limit,
            group=group,
            start_date=start_date,
            end_date=end_date,
            metrics=metrics,
            cache=cache,
            )
    _kwargs = {'rows': rows,
               'start_date': start_date,
               'end_date': end_date,
               'metrics': metrics,
              }
    kwargs = dict(subject=subject,
                  from_email=ADMIN_EMAIL,
                  to=to,
                  _kwargs=_kwargs,
                  )
    return send_email(DOMAIN, **kwargs)

def _get_domain_report_rows(df, limit, **kwargs):
    rows = []
    df = df or ReportDomain().get_report(**kwargs)
    _all_advertiser_rows = _to_list(df)[:limit]
    _grouped_by_advertiser_rows = _get_grouped_by_adv(df, limit)
    rows.extend(_all_advertiser_rows)
    rows.extend(_grouped_by_advertiser_rows)
    return rows

def _get_grouped_by_adv(df, limit):
    _len = len(df.columns)
    rows = []
    _ids = get_advertiser_ids()
    for _id in _ids:
        _empty_row = EMPTY * _len
        _header = [_id] + EMPTY * (_len - 1)
        _df = _get_adver(df, _id, limit)
        _rows = _to_list(_df, limit)
        rows.append(_empty_row)
        rows.append(_header)
        rows.extends(_rows)
    return rows

def _get_adver(df, _id, limit):
    def _helper(x):
        m = REGEX.search(x)
        return m.group(1) if m else x
    df['advertiser'] = df['advertiser'].map(_helper)
    res = df[df['advertiser'] == _id][:limit]
    return res

def _to_list(df, limit):
    """
    convert dataframe to list of tupe(rows), as reportdomain template's table's tr, and td.
    @param: df: DataFrame
    @return: list(tuple('imps', 'booked_revenue', etc.))
    """
    dict_ = df.to_dict()
    headers  = dict_.keys()
    results = [ dict_.get(h).values()[:limit] for h in headers ]
    results = zip(*results)
    results = map(lambda res: map(lambda x: round(x, 3)
                                  if isinstance(x, float) else x, res),
                  results)
    if not results:
        return []
    return [tuple(headers)] + results

def send_email(_template,
        subject=None,
        from_email=None,
        to=None,
        _kwargs=None,
        ):
    sg = _initialize_email()
    loader = Loader(TEMP_MAIN_DIR)
    _template = TEMP_BASE % _template
    html = loader.load(_template).generate(**_kwargs)
    html = premailer.transform(html)
    _send_email(subject=subject,
            to=to,
            from_email=from_email,
            html=html,
            sg=sg,
            )

def _send_email(
        subject=None,
        to=None,
        from_email=None,
        html=None,
        sg=None,
        ):
    message = sendgrid.Mail(to=to, subject=subject, html=html, from_email=from_email)
    status, msg = sg.send(message)
    logging.info("message sent to %s. status : %s" % (to, status))

sg = None
def _initialize_email():
    global sg
    if sg:
        return sg
    sg = sendgrid.SendGridClient(SENDGRID_USER, SENDGRID_PW)
    return sg


def main():
    define("to", type=str, help="email reciever")
    define('limit', type=int)
    define('start_date', type=str)
    define('end_date', type=str)
    define("metrics", type=str, default='worst')
    define('group', type=str, default='advertise,site_domain')
    define("cache", type=bool, default=True)
    define('act', type=bool, default=False, help='if read from cache, act will create csv file if file not exist')

    parse_command_line()

    kwargs = dict(
            starte_date=options.start_date,
            end_date=options.end_date,
            metrics=options.metrics,
            group=options.group,
            cache=options.cache,
            )
    if options.act:
        logging.info("sending email to %s" % options.to)
        send_domain_email(options.to, options.limit, **kwargs)
        return

if __name__ == '__main__':
    exit(main())
