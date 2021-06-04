-- --------------------------------------------------------

--
-- Table structure for table `accounts`
--

DROP TABLE IF EXISTS `accounts`;

CREATE TABLE `accounts` (
  `account` char(65) CHARACTER SET utf8 NOT NULL,
  `alias` varchar(255) DEFAULT NULL,
  `monitor_url` varchar(255) CHARACTER SET utf8 DEFAULT NULL,
  `frontier` char(64) CHARACTER SET utf8 DEFAULT NULL,
  `watt_hour` int(11) DEFAULT NULL,
  `open_block` char(64) CHARACTER SET utf8 DEFAULT NULL,
  `representative` tinyint(1) DEFAULT 0,
  `representative_block` char(64) CHARACTER SET utf8 DEFAULT NULL,
  `weight` varchar(39) CHARACTER SET utf8 DEFAULT NULL,
  `delegators` int(11) DEFAULT NULL,
  `balance` varchar(39) CHARACTER SET utf8 DEFAULT NULL,
  `modified_timestamp` int(11) DEFAULT NULL,
  `block_count` int(11) DEFAULT NULL,
  `confirmation_height` int(11) DEFAULT NULL,
  `confirmation_height_frontier` char(64) CHARACTER SET utf8 DEFAULT NULL,
  `key` char(64) CHARACTER SET utf8 DEFAULT NULL,
  UNIQUE KEY `account` (`account`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `accounts_meta`
--

DROP TABLE IF EXISTS `accounts_meta`;

CREATE TABLE `accounts_meta` (
  `account` char(65) CHARACTER SET utf8 NOT NULL,
  `balance` varchar(39) CHARACTER SET utf8 DEFAULT NULL,
  `block_count` int(11) DEFAULT NULL,
  `weight` varchar(39) CHARACTER SET utf8 DEFAULT NULL,
  `delegators` int(11) DEFAULT NULL,
  `timestamp` int(11) NOT NULL,
  UNIQUE KEY `account` (`account`, `timestamp`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `accounts_tags`
--

DROP TABLE IF EXISTS `accounts_tags`;

CREATE TABLE `accounts_tags` (
  `account` char(65) NOT NULL,
  `tag` char(65) NOT NULL,
  UNIQUE KEY `account` (`account`, `tag`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Table structure for table `github_events`
--

DROP TABLE IF EXISTS `github_events`;

CREATE TABLE `github_events` (
  `id` varchar(15) NOT NULL,
  `type` varchar(100) CHARACTER SET utf8 NOT NULL,
  `actor_id` varchar(15) NOT NULL,
  `actor_name` varchar(100) CHARACTER SET utf8 NOT NULL,
  `actor_avatar` varchar(255) CHARACTER SET utf8 NOT NULL,

  `action` varchar(255) CHARACTER SET utf8 NOT NULL,
  `ref` varchar(255) CHARACTER SET utf8 DEFAULT NULL,
  `title` varchar(255) DEFAULT NULL,
  `body` text CHARACTER SET utf8mb4 DEFAULT NULL,
  `event_url` varchar(255) DEFAULT NULL,

  `created_at` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;


-- --------------------------------------------------------

--
-- Table structure for table `posts`
--

DROP TABLE IF EXISTS `posts`;

CREATE TABLE `posts` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `pid` varchar(255) CHARACTER SET utf8 NOT NULL,
  `sid` varchar(255) CHARACTER SET utf8 NOT NULL,
  `title` varchar(255) DEFAULT NULL,
  `url` varchar(255) CHARACTER SET utf8 NOT NULL,
  `content_url` varchar(255) CHARACTER SET utf8 NOT NULL DEFAULT '',
  `author` varchar(32) NOT NULL,
  `authorid` varchar(32) DEFAULT NULL,
  `text` text CHARACTER SET utf8mb4,
  `html` text CHARACTER SET utf8mb4,
  `summary` int(11) DEFAULT NULL,
  `score` decimal(7,1) NOT NULL DEFAULT '1.0',
  `social_score` decimal(7,1) NOT NULL DEFAULT '1.0',
  `created_at` int(11) NOT NULL,
  `updated_at` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `url` (`url`),
  KEY `created_at` (`created_at`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `post_tags`
--

DROP TABLE IF EXISTS `post_tags`;

CREATE TABLE `post_tags` (
  `post_id` int(11) NOT NULL,
  `tag` varchar(65) NOT NULL,
  `account_id` int(11) NOT NULL,
  KEY `post_id` (`post_id`),
  KEY `tag` (`tag`),
  UNIQUE KEY `user_tag` (`post_id`,`tag`,`account_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `representatives_meta`
--

DROP TABLE IF EXISTS `representatives_meta`;

CREATE TABLE `representatives_meta` (
  `account` char(65) CHARACTER SET utf8 NOT NULL,
  `cpu_cores` int(2) DEFAULT NULL,
  `cpu_description` varchar(255) CHARACTER SET utf8 DEFAULT NULL,
  `cpu_model` varchar(255) CHARACTER SET utf8 DEFAULT NULL,
  `bandwidth_description` varchar(255) CHARACTER SET utf8 DEFAULT NULL,
  `ram` int(3) DEFAULT NULL,
  `ram_description` varchar(255) DEFAULT NULL,
  `dedicated` tinyint(1) DEFAULT NULL,
  `type` varchar(255) CHARACTER SET utf8 DEFAULT NULL,
  `provider` varchar(255) CHARACTER SET utf8 DEFAULT NULL,
  `mynano_ninja` varchar(255) CHARACTER SET utf8 DEFAULT NULL,
  `created_at` int(11) DEFAULT NULL,
  `description` text CHARACTER SET utf8mb4 DEFAULT NULL,

  `reddit` varchar(255) CHARACTER SET utf8 DEFAULT NULL,
  `twitter` varchar(255) CHARACTER SET utf8 DEFAULT NULL,
  `discord` varchar(255) CHARACTER SET utf8 DEFAULT NULL,
  `github` varchar(255) CHARACTER SET utf8 DEFAULT NULL,

  `timestamp` int(11) NOT NULL,
  UNIQUE KEY `account` (`account`, `timestamp`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sources`
--

DROP TABLE IF EXISTS `sources`;

CREATE TABLE `sources` (
  `id` varchar(255) CHARACTER SET utf8 DEFAULT NULL,
  `title` varchar(255) CHARACTER SET utf8 DEFAULT NULL,
  `logo_url` varchar(255) CHARACTER SET utf8 DEFAULT NULL,
  `score_avg` decimal(7,1) NOT NULL DEFAULT '1.0',
  `social_score_avg` decimal(7,1) NOT NULL DEFAULT '1.0',
  `created_at` int(11) DEFAULT NULL,
  `updated_at` int(11) DEFAULT NULL,
  UNIQUE KEY `id` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;

CREATE TABLE `users` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `username` varchar(32) NOT NULL,
  `pub` varchar(64) NOT NULL,
  `last_visit` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `pub` (`pub`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `user_addresses`
--

DROP TABLE IF EXISTS `user_addresses`;

CREATE TABLE `user_addresses` (
  `account_id` int(11) NOT NULL,
  `address` char(65) NOT NULL,
  `signature` varchar(255) NOT NULL,
  KEY (`account_id`),
  UNIQUE KEY `address` (`address`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;
