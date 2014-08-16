ssh root@portal.getrockerbox.com 'cd /srv/rockerbox-metrics/current; git pull origin master; supervisorctl restart metrics-production'
