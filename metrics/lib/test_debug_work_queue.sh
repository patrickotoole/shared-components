#!/bin/bash
curl -X POST -d '{"advertiser":"littlebits", "pattern":"/", "udf":"domains", "debug":"True"}' http://192.168.99.100:8888/jobs 
curl -X POST -d '{"advertiser":"littlebits", "pattern":"/", "udf":"recurring", "debug":"True"}' http://192.168.99.100:8888/jobs
curl -X POST -d '{"advertiser":"littlebits", "pattern":"/", "udf":"backfill", "debug":"True"}' http://192.168.99.100:8888/jobs
curl -X POST -d '{"advertiser":"littlebits", "pattern":"/", "udf":"domains_full_time_minute", "debug":"True"}' http://192.168.99.100:8888/jobs
curl -X POST -d '{"advertiser":"littlebits", "pattern":"/", "udf":"topic_runner", "debug":"True"}' http://192.168.99.100:8888/jobs
