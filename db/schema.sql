-- --------------------------------------------------------

--
-- Table structure for table `accounts`
--

DROP TABLE IF EXISTS `accounts`;

CREATE TABLE `accounts` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `pub` varchar(255) NOT NULL,
  `prv` varchar(255) NOT NULL,
  `address` char(65) NOT NULL,
  `signature` varchar(255) NOT NULL,
  `alias` varchar(255) DEFAULT NULL,
  `verified` tinyint(1) DEFAULT 0,
  `last_visit` int(11) NOT NULL,
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
  `social_score` int(11) NOT NULL DEFAULT '0',
  `created_at` int(11) NOT NULL,
  `updated_at` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `url` (`url`)
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
  KEY `tag` (`tag`)
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
  `score_avg` int(11) NOT NULL DEFAULT 1,
  `social_score_avg` int(11) NOT NULL DEFAULT 1,
  `created_at` int(11) DEFAULT NULL,
  `updated_at` int(11) DEFAULT NULL,
  UNIQUE KEY `id` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
