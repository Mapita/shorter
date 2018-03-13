# Set up environment variables given the contents of /opt/shorter/src/private_config.json
export CONFIG=/opt/shorter/src/private_config.json
export SHORTER_DB_HOST="$(cat $CONFIG | jq -r '.productionDatabaseHost')"
export SHORTER_DB_PORT="$(cat $CONFIG | jq -r '.productionDatabasePort')"
export SHORTER_DB_NAME="$(cat $CONFIG | jq -r '.productionDatabaseName')"
export SHORTER_DB_USER="$(cat $CONFIG | jq -r '.productionDatabaseUser')"
export SHORTER_DB_PASSWORD="$(cat $CONFIG | jq -r '.productionDatabasePassword')"