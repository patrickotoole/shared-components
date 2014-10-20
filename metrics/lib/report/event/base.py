"""
Other event should just extentiate Eventbase,
and initiate with event table's column names and values:

e = EventReport(talbe_name='event_report', start_date=start_date, col2=val2, col3=val3)
and e.create_event() to create event entry.
"""

import pandas as pd
from lib.pandas_sql import s as _sql


class EventBase(object):
    def create_event(self):
        """
        use key in __init__ kwargs as event's column name,
        use val as column's value
        """
        assert self.table_name
        assert self.db_wrapper
        assert self.event_name

        kwargs = vars(self)

        table_name =  kwargs.pop('table_name')
        con =  kwargs.pop('db_wrapper')

        df = pd.DataFrame([kwargs])
        column_names = df.columns.tolist()

        _sql._write_mysql(df, table_name, column_names, con)
