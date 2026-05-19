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
# User-tables only (omits time-series hypertables retained on storage via
# the archive-to-postgres delta cron). Mirrors backup-mysql.sh DB_TABLES.
USER_TABLES="accounts accounts_changelog accounts_meta_index accounts_tags github_discussion_labels github_discussions github_events github_issue_labels github_issues nano_community_messages posts post_labels representatives_meta_index representatives_meta_index_changelog representatives_network sources users user_addresses"
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
# Inner artifact: pg_dump custom format (already compressed). Outer artifact
# stays .tar.gz so storage's nano-community-snapshot-pull glob (*-full.tar.gz)
# and the backup-freshness monitor continue to apply unchanged.
dump_file="$file_name-$backup_type.dump"
gz_file="$file_name-$backup_type.tar.gz"

mkdir -p $DUMP_DIR
cd $DUMP_DIR

if $FULL || $SNAPSHOT; then
    sudo -n -u postgres pg_dump -Fc -d $DB_NAME -f $dump_file
else
    table_args=""
    for t in $USER_TABLES; do
        table_args="$table_args -t public.$t"
    done
    sudo -n -u postgres pg_dump -Fc -d $DB_NAME $table_args -f $dump_file
fi
tar -zvcf $gz_file $dump_file
rm $dump_file

# Storage server pulls snapshot-full.tar.gz weekly via nano-community-snapshot-pull.
# Time-series dumps are local-only; cap retention at 7 days.
if ! $SNAPSHOT; then
    find "$DUMP_DIR" -maxdepth 1 -type f -name "[0-9]*-${backup_type}.tar.gz" -mtime +7 -delete
fi
