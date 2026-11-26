import { epoch_seconds_sql } from '#libs-server/epoch-seconds.mjs'

// SELECT lists for tables whose rows the API serves whole. Each instant is
// stored as timestamptz and served as epoch seconds under its long-standing
// response name, so the response shape does not change with the column.

const select_sql = (value_columns, instant_columns) =>
  [
    ...value_columns.map((column) => `"${column}"`),
    ...instant_columns.map(([column, alias]) =>
      epoch_seconds_sql(column, alias)
    )
  ].join(', ')

export const VOTING_WEIGHT_SELECT_SQL = select_sql(
  [
    'address',
    'quorum_delta',
    'online_weight_quorum_percent',
    'online_weight_minimum',
    'online_stake_total',
    'trended_stake_total',
    'peers_stake_total'
  ],
  [['observed_at', 'timestamp']]
)

export const ACCOUNT_META_INDEX_SELECT_SQL = select_sql(
  ['account', 'balance', 'block_count', 'weight', 'delegators'],
  [['observed_at', 'timestamp']]
)

export const REPRESENTATIVE_META_INDEX_SELECT_SQL = select_sql(
  [
    'account',
    'cpu_cores',
    'cpu_description',
    'cpu_model',
    'bandwidth_description',
    'ram',
    'ram_description',
    'donation_address',
    'description',
    'dedicated',
    'type',
    'provider',
    'mynano_ninja',
    'ninja_ram_description',
    'ninja_cpu_description',
    'ninja_description',
    'ninja_type',
    'ninja_provider',
    'reddit',
    'twitter',
    'discord',
    'discord_user_id',
    'github',
    'website',
    'email',
    'nano_node_monitor_url'
  ],
  [
    ['created_at', 'created_at'],
    ['ninja_created_at', 'ninja_created_at'],
    ['recorded_at', 'timestamp']
  ]
)

export const REPRESENTATIVE_NETWORK_SELECT_SQL = select_sql(
  [
    'account',
    'address',
    'continent',
    'country',
    'countryCode',
    'region',
    'regionName',
    'city',
    'zip',
    'lat',
    'lon',
    'timezone',
    'isp',
    'org',
    'as',
    'asname',
    'hosted'
  ],
  [['observed_at', 'timestamp']]
)

export const GITHUB_EVENT_SELECT_SQL = select_sql(
  [
    'id',
    'type',
    'actor_id',
    'actor_name',
    'actor_avatar',
    'action',
    'ref',
    'title',
    'body',
    'event_url'
  ],
  [['created_at', 'created_at']]
)

export const GITHUB_DISCUSSION_SELECT_SQL = select_sql(
  [
    'id',
    'author_id',
    'author_name',
    'author_avatar',
    'ref',
    'title',
    'url',
    'repo',
    'body',
    'upvotes',
    'category_name',
    'closed',
    'state_reason',
    'category_id'
  ],
  [
    ['created_at', 'created_at'],
    ['updated_at', 'updated_at'],
    ['closed_at', 'closed_at']
  ]
)
