PYTHONPATH=/srv/metrics/current/metrics/ tail -F /var/log/nginx/pixel.log | grep --line-buffered type=imp | python /srv/metrics/current/metrics/lib/kafka_stream/kafka_stream.py --topic=visit_events --use_parse --batch_time=1 --kafka_hosts=slave17:9092,slave18:9092,slave19:9092,slave16:9092
