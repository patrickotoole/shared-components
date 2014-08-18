"""
script to parse log files, and endpoint.

sample log:
2014-08-18 04:01:55,079 WARNING pid:16014, file:apiutils.py:30> Got report id: 63b13314d4acda32d503341c4027348c
"""


import os
import re
import glob
import logging

from pprint import pprint

from lib.report.utils.utils import parse as parsetime
from lib.report.utils.fileutils import tail
from lib.report.utils.utils import parse_params

LOG_LEVELS = {
        'python': r'(\bINFO\b|\bWARNING\b|\bERROR\b|\bFATAL\b)',
        }

LOG_PATH = '/var/log/ubuntu/cron'

DATE_TIME_REGEX = r'(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})'
PID_REGEX = r'pid:(\d+)'
FILE_REGEX = r'file:(.*?):'
MSG_REGEX = r'\d+> (.*)'
RE = '%s.*?%s.*?%s.*?%s' % (DATE_TIME_REGEX, PID_REGEX, FILE_REGEX, MSG_REGEX)
REGEX = re.compile(RE)


def main():
    define("filename", type=str)
    define("num_lines", type=int, default=10000)
    define("start", default='1h')
    define("include_info", default=False, type=bool)
    define('log_type', default='python')

    basicConfig(optins=options)
    parse_command_line()
    assert(options.filename)

    lines = parse(options.filename,
            num_lines=options.num_lines,
            start=options.start,
            include_info=options.include_info,
            log_type=options.log_type,
            )
    pprint(lines)


def parse(filename, num_lines=10000,
        start='1h',
        include_info=False,
        log_type='python',
        ):
    """
    @return: json
    """
    if filename == 'all':
        kwargs = locals()
        del kwargs['filename']
        return _parse_all(**kwargs)

    filename = filename.split('/')[-1].replace('.', '_')
    logging.info("Getting log: %s" % filename)
    start = parsetime(start)
    path = os.path.join(LOG_PATH, filename + '.log')
    try:
        lines = tail(path,
                num_lines=options.num_lines,
                start=start,
                )
    except IOError:
        logging.warning("cannot open file at %s" % path,
                exc_info=True,
                )
        return
    lines = _parse_lines(lines, options.log_type)
    logging.info("Got %s lines alters" % len(lines))
    return {
            filename: lines
            }

def _parse_all(**kwargs):
    to_return = {}
    filenames = _get_all_logs()
    for name in filenames:
        to_return.update(parse(name, **kwargs))
    return to_return

def _get_all_logs():
    os.chdir(LOG_PATH)
    return [os.path.splitext(f)[0] for f in glob.glob('*.log')]

def _parse_lines(lines, log_type):
    """
    @param lines    : list(str)
    @param log_type : str
    @return         : list(str)
    """
    to_return = []
    regex = re.compile(LOG_LEVELS.get(log_type))
    for line in lines:
        m = regex.search(line)
        if m:
            level = m.group(1)
            if not options.include_info and level == 'INFO':
                continue
            dict_ = to_dict(line)
            to_return.append(dict_)
    return to_return

def to_dict(line):
    try:
        date, pid, f, msg = REGEX.search(line).groups()
        return {
                'date': date,
                'pid' : pid,
                'file': f,
                'msg' : msg,
                }
    except Exception, e:
        logging.warn(e)
        return {}


if __name__ == '__main__':
    from lib.report.utils.options import define
    from lib.report.utils.options import options
    from lib.report.utils.options import parse_command_line
    from lib.report.utils.loggingutils import basicConfig
    exit(main())
