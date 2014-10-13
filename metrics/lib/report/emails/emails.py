import logging
import os

from tornado.template import Loader
import sendgrid
import premailer

from lib.report.emails.models import Table
from lib.report.utils.constants import (
        ADMIN_EMAIL,
        SENDGRID_USER,
        SENDGRID_PW,
        )

REPORT_TEMPLATE = '_internal_report.html'
TEMP_MAIN_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../templates/reporting'))

def _render(_template, **kwargs):
    _loader = Loader(TEMP_MAIN_DIR)
    html = _loader.load(_template).generate(**kwargs)
    return html

sg = None
def _initialize_email():
    global sg
    if sg:
        return sg
    sg = sendgrid.SendGridClient(SENDGRID_USER, SENDGRID_PW)
    return sg

def _send_email(_template,
        subject=None,
        to=None,
        from_email=None,
        **_kwargs):
    kwargs = dict(_kwargs, **dict(subject=subject))
    html = _render(_template, **kwargs)
    html = premailer.transform(html)
    sg = _initialize_email()
    from_email = from_email or ADMIN_EMAIL
    message = sendgrid.Mail(to=to, subject=subject, html=html, from_email=from_email)
    status, msg = sg.send(message)
    logging.info("message sent to %s. status : %s" % (to, status))
    return html

def send_report_email(to, headers, rows,
        subject='report',
        width=700,
        title=None,
        ):
    """
    @param to: str
    @param headers: list(str)
    @param rows: list(list(int))
    @param subject: str
    @param width: int, width in pixels of the report table.
    @param table_title: str|None
    @return: html
    """
    return send_multi_table_report_email(to,
            [Table(headers, rows,
                title=title,
                )],
            subject=subject,
            width=width,
            )

def send_multi_table_report_email(to, tables,
        from_email=None,
        subject='report',
        width=700,
        ):
    """
    @param email: str
    @param tables: list(Table)
    @param subject: str
    @param width: int, width in pixels of the report table.
    @return: html
    """
    return _send_email(REPORT_TEMPLATE,
            subject=subject,
            to=to,
            from_email=from_email,
            tables=tables,
            width=width,
            )
