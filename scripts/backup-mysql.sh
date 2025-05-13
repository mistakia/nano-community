#!/bin/sh
set -e
set -x

FULL=false
SNAPSHOT=false

while getopts 'fs' opt; do
    case $opt in
        f) FULL=true ;;
        s) SNAPSHOT=true ;;
        *) echo 'Error in command line parsing' >&2
    esac
done

DUMP_DIR="/root/backups"
DB_NAME="nano_production"
DB_FILE="/root/mysqldump.cnf"
DB_TABLES="accounts accounts_changelog accounts_meta_index accounts_tags github_discussion_labels github_discussions github_events github_issue_labels github_issues nano_community_messages posts post_labels representatives_meta_index representatives_meta_index_changelog representatives_network representatives_network_index sources users user_addresses"
DATE_FORMAT="%Y-%m-%d_%H-%M"

if $SNAPSHOT; then
    file_name="snapshot"
    backup_type="full"
else
    file_name="$(date +$DATE_FORMAT)"
    if $FULL; then
        backup_type="full"
    else
        backup_type="user"
    fi
fi
sql_file="$file_name-$backup_type.sql"
gz_file="$file_name-$backup_type.tar.gz"

# make sure that the folder exists
mkdir -p $DUMP_DIR
cd $DUMP_DIR

# run mysqlbackup, tar gz and delete sql file
if $FULL || $SNAPSHOT; then
    mysqldump --defaults-extra-file=$DB_FILE $DB_NAME > $sql_file
else
    mysqldump --defaults-extra-file=$DB_FILE $DB_NAME $DB_TABLES > $sql_file
fi
tar -zvcf $gz_file $sql_file
rm $sql_file

/root/.google-drive-upload/bin/gupload $gz_file
if ! $SNAPSHOT; then
    rm $gz_file
fi
