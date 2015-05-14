import logging
from abc import ABCMeta, abstractmethod
from link import lnk


class Analysis(object):
    __metaclass__ = ABCMeta

    def __new__(cls, *args, **kwargs):
        instance = object.__new__(cls)

        # Set up logger
        logging.basicConfig(level=logging.INFO)
        instance.logger = logging.getLogger(__name__)
        instance.rbox_api = lnk.api.rockerbox

        return instance

    def func(self):
        print "Testing"

    @abstractmethod
    def analyze(self):
        pass

    @staticmethod
    def verify_cols(col_names):
        def outer(func):
            def inner(self, *args, **kwargs):
                cols = self.df.columns.tolist()
                if len(cols) == len(col_names) and set(cols) == set(col_names):
                    self.logger.info("Columns verification passed: {} == {}"
                                     .format(cols, col_names))
                    return func(self, *args, **kwargs)
                else:
                    raise Exception("Invalid column names found: {} != {}"
                                    .format(cols, col_names))
            return inner
        return outer

    # Decorator that verifies that the list of index names matches
    # what we expect
    @staticmethod
    def verify_index(index_name):
        def outer(func):
            def inner(self, *args, **kwargs):
                df_index_name = self.df.index.names
                if df_index_name == index_name:
                    self.logger.info("Index verification passed: {} == {}"
                                     .format(df_index_name, index_name))
                    return func(self, *args, **kwargs)
                else:
                    raise Exception("Invalid index found: {} != {}"
                                    .format(df_index_name, index_name))
            return inner
        return outer
