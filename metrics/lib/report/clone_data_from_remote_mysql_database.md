```
mysqldump -h 50.112.210.39 -u ron_test -pron_test appnexus_reporting advertiser > dump.sql
```

```
scp root@roc:/root/dump.sql .
```

```
mysql -u root -h 127.0.0.1 -D roclocal < dump.sql
```
