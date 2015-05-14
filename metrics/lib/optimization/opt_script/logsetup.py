import sys
sys.path.append("../../")
import buffering_smtp_handler
import logging

def configure_log(subject="no subject", level=logging.INFO, name="opt"):
    subject = "[Rockerbox - Optimization Script] Log - " + subject
    logger = logging.getLogger(name)
    logger.setLevel(level)

    formatter = logging.Formatter("%(asctime)s %(levelname)-5s %(message)s")
    ch = logging.StreamHandler(sys.stdout)
    ch.setFormatter(formatter)

    logger.addHandler(ch)

    logger.addHandler(
        buffering_smtp_handler.BufferingSMTPHandler(
            "alerts@rockerbox.com",
            ["will@rockerbox.com", "stephen@rockerbox.com"],
            subject,
            10000
            ))
