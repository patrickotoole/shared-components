import logging
from abc import ABCMeta, abstractmethod

from link import lnk
import pandas as pd

class DataSource(object):
    __metaclass__ = ABCMeta

    def __new__(cls, *args, **kwargs):
        instance = object.__new__(cls)

        # Set up logger
        logging.basicConfig(level=logging.INFO)
        instance.logger = logging.getLogger(__name__)

        # Create any connections that might be necessary
        # to pull data
        instance.hive = lnk.dbs.hive
        instance.reporting = lnk.dbs.reporting
        # instance.console = lnk.api.console

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

