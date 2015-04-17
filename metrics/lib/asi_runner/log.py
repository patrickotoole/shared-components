import logging
import ujson

def flumelog(log_dict, logger=None):
    """
    Using logger_for_flume to log relevant information to specified
    location using specified log format.
    """
    msg = ujson.dumps(log_dict)
    logger = logger or logging
    logger.warning(msg)
