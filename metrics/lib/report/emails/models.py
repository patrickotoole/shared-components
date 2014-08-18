class Table(object):
    def __init__(self, headers=None, rows=None, title=None):
        self.headers = headers
        self.rows = rows
        self.title = title

class HighlightRow(list):
    pass
