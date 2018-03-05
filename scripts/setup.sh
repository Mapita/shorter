export PROFILE="/opt/shorter/.profile"
export LOG="/opt/shorter/setup.log"

mkdir -p /opt/shorter/src/
chown -R ubuntu:ubuntu /opt/

# Add a readme to the system describing how to manage it
cat >>/opt/shorter/readme.txt <<EOL
This is a backend for shorter (https://github.com/mapita/shorter).
It was made in June 2018 by Sophie Kirschner.
Sophie (sophie.kirschner@mapita.fi or sophiek@pineapplemachine.com)
is the best person to ask about infrastructure and server management.

Application source is located at /opt/shorter/src.
Scripts, config files, and other tools are at /opt/shorter.
/opt/shorter/src/scripts/setup.sh was used to set up this server and can be
used to configure another server from scratch.

An express server (https://expressjs.com/), source located at the path
/opt/shorter/src/main.js, listens on port 8080 with default configuration.

The server connects to a database instance running PostgreSQL 9.6.2.
The database schema is located on this server at /opt/shorter/src/schema.sql.
Connection parameters for the database are read from /opt/shorter/private_config.json.
A new database may be configured by running /opt/shorter/src/scripts/setupdb.sh.

The server is not intended to be run directly; rather it is managed by
pm2 (https://github.com/Unitech/pm2). Convenience scripts are located in
/opt/shorter to start, stop, and restart the server using pm2.
In case the server must be run sans pm2, this is possible by entering into
the /opt/shorter/src directory and running `npm run start`.

Nginx (https://www.nginx.com/) serves content and forwards requests to
the webserver from port 80. The nginx configuration file is located at
/opt/shorter/src/config/nginx.conf.
When changing the nginx config, test the validity of the new configuration
with nginx -t and load it with /etc/init.d/nginx restart.
EOL

ln -s /opt/shorter/readme.txt /home/ubuntu/shorter_readme.txt
ln -s /opt/shorter/readme.txt /shorter_readme.txt

apt-get update >> $LOG

echo "Installing git."
apt-get install git -y --fix-missing >> $LOG
echo "Retrieving application source from github."
git clone https://github.com/Mapita/shorter.git /opt/shorter/src
chown -R ubuntu:ubuntu /opt/shorter/src

echo "Installing nodejs."
# https://nodejs.org/en/download/package-manager/#debian-and-ubuntu-based-linux-distributions
curl -sL https://deb.nodesource.com/setup_9.x | sudo -E bash - >> $LOG
apt-get install nodejs -y --fix-missing >> $LOG
npm install -g npm@5.6.0 >> $LOG

# Generate files to run and configure the server
echo "Generating user scripts and config files."
echo "pm2 start /opt/shorter/src/main.js" >> "/opt/shorter/start.sh"
chmod 777 /opt/shorter/start.sh
echo "pm2 delete main" >> "/opt/shorter/stop.sh"
chmod 777 /opt/shorter/stop.sh
echo "pm2 restart main" >> "/opt/shorter/restart.sh"
chmod 777 /opt/shorter/restart.sh
echo "source $PROFILE; psql -h $SHORTER_DB_HOST -d $SHORTER_DB_NAME -U $SHORTER_DB_USER" >> "/opt/shorter/dbclient.sh"
chmod 777 /opt/shorter/dbclient.sh

# For a smooth setup process these environment vars should be set before
# running this script.
cat >>/opt/shorter/src/private_config.json <<EOL
{
    "productionDatabaseHost": "$SHORTER_DB_HOST",
    "productionDatabasePort": $SHORTER_DB_PORT,
    "productionDatabaseName": "$SHORTER_DB_NAME",
    "productionDatabaseUser": "$SHORTER_DB_USER",
    "productionDatabasePassword": "$SHORTER_DB_PASSWORD",
    "apiKeys": $SHORTER_API_KEYS
}
EOL

echo "Installing psql client."
apt-get install postgresql-client jq -y --fix-missing >> $LOG # jq used to read config json
echo "$SHORTER_DB_HOST:$SHORTER_DB_PORT:$SHORTER_DB_NAME:$SHORTER_DB_USER:$SHORTER_DB_PASSWORD" >> /home/ubuntu/.pgpass
chmod 0600 /home/ubuntu/.pgpass
echo "export PGPASSFILE=/home/ubuntu/.pgpass" >> $PROFILE

echo "Installing backend dependencies."
cd /opt/shorter/src
npm install >> $LOG

echo "Installing process manager pm2."
npm install -g pm2 >> $LOG
# Ensure pm2 is run on system start
env PATH=$PATH:/usr/local/bin pm2 startup ubuntu -u root

echo "Installing and configuring nginx."
apt-get install nginx -y --fix-missing >> $LOG
rm /etc/nginx/sites-enabled/default
ln -s /opt/shorter/src/config/nginx.conf /etc/nginx/sites-enabled/shorter
/etc/init.d/nginx restart

echo "Starting server."
/opt/shorter/start.sh >> $LOG

echo "All done!"
