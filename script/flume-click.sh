/usr/bin/flume-ng agent --conf $FLUME_PATH/flume/ -f $FLUME_PATH/flume/flume.conf -Dflume.monitoring.type=http -Dflume.monitoring.port=34546 -Xms100m -Xmx200m -Dflume.root.logger=DEBUG,console -n tail8
