#!/bin/sh

tail -F /tmp/graylogging.log | python /root/rockerbox-metrics/metrics/lib/custom_logging/file_to_graylog.py
