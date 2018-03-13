echo "BEWARE: This operation will erase all existing data."
read -r -p "Really write schema? (Type \"yes\" to confirm.) " choice
if [ $choice = "yes" ]; then
    echo "DOIN IT"
    . /opt/shorter/src/scripts/env.sh
    export PGPASSFILE=/home/ubuntu/.pgpass
    psql -h $SHORTER_DB_HOST -d $SHORTER_DB_NAME -U $SHORTER_DB_USER -a -f /opt/shorter/src/schema.sql
fi
