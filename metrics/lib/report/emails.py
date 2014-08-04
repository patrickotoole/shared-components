import logging
import os
import re

from tornado.template import Loader
import sendgrid

from lib.report.reportutils import get_advertiser_ids

from lib.report.utils.constants import (
        DOMAIN,
        ADMIN_EMAIL,
        SENDGRID_USER,
        SENDGRID_PW,
        )

REGEX = re.compile('\((\d+)\)')
TEMP_BASE = '_report_%s.html'
TEMP_MAIN_DIR = os.path.realpath(os.path.dirname(__file__) +
                                 '../../../templates/reporting')

def send_domain_email(to, df, metrics, **kwargs):
    start_date, end_date = kwargs.get('start_date'), kwargs.get('end_date')
    limit = kwargs.get('limit')
    subject = 'domain top {limit} {metrics} {start_date} - {end_date}'.format(
            limit=limit,
            start_date=start_date,
            end_date=end_date,
            metrics=metrics,
            )
    _kwargs = {'alladvers': _to_list(df)[:limit+1],
               'grouped_by_adv': _get_grouped_by_adv(df, limit=limit),
               'metrics': metrics,
              }
    _kwargs.update(**kwargs)
    kwargs = dict(subject=subject,
                  from_email=ADMIN_EMAIL,
                  to=to,
                  _kwargs=_kwargs,
                  )
    return send_email(DOMAIN, **kwargs)

def _get_grouped_by_adv(df, limit=None):
    _ids = get_advertiser_ids()
    return dict((_id, _to_list(_get_adver(df, _id, limit=limit)))
                 for _id in _ids)

def _get_adver(df, _id, limit=None):
    def _helper(x):
        m = REGEX.search(x)
        return m.group(1) if m else x
    df['advertiser'] = df['advertiser'].map(_helper)
    res = df[df['advertiser'] == _id][:limit]
    return res

def _to_list(df):
    """
    convert dataframe to list of tupe(rows), as reportdomain template's table's tr, and td.

    dataframe   table
    - row       - tr
      - col       - td

    @param: df: DataFrame
    @return: list(tuple('imps', 'booked_revenue', etc.))
    """
    dict_ = df.to_dict()
    headers  = dict_.keys()
    results = [ dict_.get(h).values()
                for h in headers
              ]
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
    _send_email(subject=subject,
            to=to,
            from_email=from_email,
            html=html,
            sg=sg,
            )

sg = None
def _initialize_email():
    global sg
    if sg:
        return sg
    sg = sendgrid.SendGridClient(SENDGRID_USER, SENDGRID_PW)
    return sg

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
