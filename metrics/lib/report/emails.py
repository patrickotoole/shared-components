import logging
import os

from tornado.template import Loader
import sendgrid

from lib.report.utils.constants import (
        DOMAIN,
        ADMIN_EMAIL,
        SENDGRID_USER,
        SENDGRID_PW,
        )

TEMP_BASE = '_report_%s.html'
TEMP_MAIN_DIR = os.path.realpath(os.path.dirname(__file__) +
                                 '../../../templates/reporting')

def send_domain_email(to, df, metrics, **kwargs):
    start_date, end_date = kwargs.get('start_date'), kwargs.get('end_date')
    subject = 'domain report %s - %s' % (start_date, end_date)
    _kwargs = {'table': _to_list(df),
               'metrics': metrics,
              }
    _kwargs.update(**kwargs)
    kwargs = dict(subject=subject,
                  from_email=ADMIN_EMAIL,
                  to=to,
                  _kwargs=_kwargs,
                  )
    return send_email(DOMAIN, **kwargs)

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
    results = map(lambda res: map(lambda x: round(x,3)
                                  if isinstance(x, float) else x, res),
                  results)
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
    logging.info("message sent. status : %s" % status)
