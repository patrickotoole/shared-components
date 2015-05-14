import logging
logger = logging.getLogger("opt")
from abc import ABCMeta, abstractmethod

from link import lnk
import pandas as pd

class DataSource(object):
    __metaclass__ = ABCMeta

    def __new__(cls, *args, **kwargs):
        instance = object.__new__(cls)

        # Set up logger
        instance.logger = logger

        # Create any connections that might be necessary
        # to pull data
        # instance.hive = lnk.dbs.hive
        instance.reporting = lnk.dbs.reporting
        instance.console = lnk.api.console
        instance.reporting_api = lnk.api.reporting
        instance.hive = lnk.dbs.hive

        return instance

    @abstractmethod
    def pull(self):
        pass

    @abstractmethod
    def transform(self):
        pass
    
    @abstractmethod
    def filter(self):
        pass

