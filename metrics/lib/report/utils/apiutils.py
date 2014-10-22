import logging

from link import lnk

from lib.report.utils.utils import retry
from lib.report.utils.constants import NUM_TRIES
from lib.report.utils.constants import SLEEP

CONSOLE = None
@retry(num_retries=5,
       sleep_interval=60,
       )
def get_or_create_console():
    global CONSOLE
    if CONSOLE:
        return CONSOLE
    try:
        console = lnk.api.console
    except:
        raise ValueError("blocked by appnexus when creating lnk.console")
    logging.info("created a api console")
    CONSOLE = console
    return console

@retry(num_retries=NUM_TRIES,
       sleep_interval=SLEEP,
       retry_log_prefix='no report id detected, reconnecting',
       )
def get_report_id(request_url, request_json_form):
    resp = _get_resp(request_url, method='post', forms=request_json_form)
    json_ = resp.json
    error = json_.get('response').get('error')
    if error:
        logging.warn(error)
    report_id = json_.get('response').get('report_id')
    logging.info("Got report id: %s" % report_id)
    assert report_id
    return report_id

@retry(num_retries=NUM_TRIES,
       sleep_interval=SLEEP,
       )
def get_report_url(report_id):
    url = '/report?id={report_id}'.format(report_id=report_id)
    resp = _get_resp(url)
    _resp = resp.json.get('response')
    url = _resp.get('report').get('url')
    if not url:
        status = _resp.get('execution_status')
        logging.info("report: %s status is %s" % (report_id, status))
        raise ValueError(status)
    logging.info("report url is: %s" % url)
    return url

@retry(num_retries=NUM_TRIES,
       sleep_interval=SLEEP,
       retry_log_prefix='retrying getting resp',
       )
def get_report_resp(url):
    logging.info("getting url: %s" % url)
    if not url.startswith('/'):
        url = '/' + url
    resp = _get_resp(url)
    logging.info("successfully got response from url: %s" % url)
    return resp.text

def _get_resp(url, method='get', forms=None):
    c = get_or_create_console()
    try:
        if method == 'get':
            resp = c.get(url)
        else:
            resp = c.post(url, forms)
        return resp
    except ValueError as e:
        logging.warn(e)
        raise
