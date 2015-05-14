import logging
from abc import ABCMeta, abstractmethod

from link import lnk
import pandas as pd

class Action(object):
    __metaclass__ = ABCMeta

    @abstractmethod
    def actions(self):
        pass

    def __new__(cls, *args, **kwargs):
        instance = object.__new__(cls)

        # Set up logger
        logging.basicConfig(level=logging.INFO)
        instance.logger = logging.getLogger(__name__)

        # Set up rockerbox API connector
        instance.rockerbox = lnk.api.rockerbox
        instance.console = lnk.api.console
        instance.reporting_db = lnk.dbs.reporting

        return instance

    # Decorator that verifies that this list of column names matches what we expect
    @staticmethod
    def verify_param_cols(col_names):
        def outer(func):
            def inner(self, *args, **kwargs):
                cols = args[0].columns.tolist()
                if len(cols) == len(col_names) and set(cols) == set(col_names):
                    self.logger.info("Columns verification passed: {} == {}"
                                     .format(cols, col_names))
                    return func(self, *args, **kwargs)
                else:
                    raise Exception("Invalid column names found: {} != {}"
                                    .format(cols, col_names))
            return inner
        return outer

    # Decorator that verifies that the list of index names matches what we expect
    @staticmethod
    def verify_param_index(index_name):
        def outer(func):
            def inner(self, *args, **kwargs):
                df_index_name = args[0].index.names
                if df_index_name == index_name:
                    self.logger.info("Index verification passed: {} == {}"
                                     .format(df_index_name, index_name))
                    return func(self, *args, **kwargs)
                else:
                    raise Exception("Invalid index found: {} != {}"
                                    .format(df_index_name, index_name))
            return inner
        return outer
