#!/bin/bash
curl -X POST -d '{"advertiser":"littlebits", "pattern":"/", "udf":"domains"}' http://rockerbox:rockerbox@workqueue.crusher.getrockerbox.com/jobs 
curl -X POST -d '{"advertiser":"littlebits", "pattern":"/", "udf":"recurring"}' http://rockerbox:rockerbox@workqueue.crusher.getrockerbox.com/jobs
curl -X POST -d '{"advertiser":"littlebits", "pattern":"/", "udf":"backfill"}' http://rockerbox:rockerbox@workqueue.crusher.getrockerbox.com/jobs
curl -X POST -d '{"advertiser":"littlebits", "pattern":"/", "udf":"domains_full_time_minute"}' http://rockerbox:rockerbox@workqueue.crusher.getrockerbox.com/jobs
curl -X POST -d '{"advertiser":"littlebits", "pattern":"/", "udf":"topic_runner"}' http://rockerbox:rockerbox@workqueue.crusher.getrockerbox.com/jobs
