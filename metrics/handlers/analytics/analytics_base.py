from datetime import datetime

class AnalyticsBase(object):
    def make_date_where(self, start_date, end_date):
        pass

    # Note: only works with string objects
    def make_in_clause(self, items):
        in_clause = ','.join(["'{}'".format(i) for i in items])
        return "(" + in_clause + ")"
    
    def batch_execute(self, queries):
        futures = []
        for query in queries:
            self.logging.info(query)
            future = self.cassandra.select_async(query)
            futures.append(future)

        results = []

        for future in futures:
            result = future.result()
            results.extend(result)
        return results
        
    def format_timestamp(self, date):
        try:
            dt = datetime.strptime(date, "%y-%m-%d")
            return dt.strftime("%Y-%m-%d %H:%M:%S")
        except ValueError as e:
            return ""

    def make_date_clause(self, variable, date, start_date, end_date):
        params = locals()

        for i in ["date", "start_date", "end_date"]:
            params[i] = self.format_timestamp(params[i])

        if date:
            return "%(variable)s = '%(date)s'" % params
        elif start_date and end_date:
            return "%(variable)s >= '%(start_date)s' AND %(variable)s <= '%(end_date)s'" % params
        elif start_date:
            return "%(variable)s >= '%(start_date)s'" % params
        elif end_date:
            return "%(variable)s <= '%(end_date)s'" % params
        else:
            return ""
