import logging
import os

from lib.report.utils.utils import retry
from lib.report.reportutils import get_or_create_console

from lib.report.utils.constants import NUM_TRIES
from lib.report.utils.constants import SLEEP

FILE_FMT = '{name}_{group}{start_date}_{end_date}.csv'
TMP_DIR = os.path.abspath('/tmp')

def get_path(
        name=None,
        group=None,
        start_date=None,
        end_date=None,
        ):
    _len = len("yyyy-mm-dd-hh")
    def _helper(ts):
        ts = (ts[:_len]).replace(' ', '-')
        return ts
    start_date, end_date = _helper(start_date), _helper(end_date)
    file_name = FILE_FMT.format(name=name,
            group=group or "",
            start_date=start_date,
            end_date=end_date,
            ).lower()
    path = os.path.join(TMP_DIR, file_name)
    return path


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
