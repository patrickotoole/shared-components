#!/bin/bash

export PYTHONPATH=/root/rockerbox/rockerbox-metrics/metrics:/root/rockerbox/rockerbox-metrics/workqueue
export LNK_DIR=/root/rockerbox/rockerbox-metrics/.link
python /root/rockerbox/rockerbox-metrics/workqueue/tornado_worker.py --port=8888 --debug=True &
pidone=$(echo $!)
echo $pidone
python /root/rockerbox/rockerbox-metrics/metrics/tornado_websocket.py --port=9001 --skip_buffers --skip_bidder_api --skip_console_api --skip_spark_sql &
pidtwo=$(echo $!)
echo $pidtwo
while [ -d "/proc/$pidone" ] && [ -d "/proc/$pidtwo" ]; do
sleep 10
done


kill -9 $pidone
kill -9 $pidtwo

exit 0
#[ -d "/proc/6010" ]  echo "process exists" || echo "process not exists"

