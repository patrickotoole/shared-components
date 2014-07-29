import os
import sys
import glob
import inspect

from lib.report.utils.utils import memo
from link import lnk

@memo
def get_default_db():
    my_db = lnk.dbs.roclocal
    return my_db


def get_report_obj(report):
    name = filter(str.isalnum, str(report).lower())
    if not os.path.dirname(__file__) in sys.path:
        sys.path.append(os.path.dirname(__file__))
    os.chdir(os.path.dirname(__file__) or '.')
    for f in glob.glob("*.py"):
        f = os.path.splitext(f)[0]
        if name == f:
            _module = __import__(f)
            for member_name, obj in inspect.getmembers(_module):
                name = ('report' + report).lower()
                if inspect.isclass(obj) and member_name.lower() == name:
                    return obj(report)
    raise ValueError("Can't for related report file")

