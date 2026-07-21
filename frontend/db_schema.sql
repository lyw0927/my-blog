CREATE TABLE IF NOT EXISTS users (
  username TEXT PRIMARY KEY,
  password TEXT NOT NULL,
  nickname TEXT NOT NULL,
  avatar TEXT,
  role TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author TEXT NOT NULL,
  authorId TEXT NOT NULL,
  category TEXT NOT NULL,
  tags TEXT, -- Store JSON string of array
  likes INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  postId TEXT NOT NULL,
  author TEXT NOT NULL,
  content TEXT NOT NULL,
  avatar TEXT NOT NULL,
  passwordHash TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  FOREIGN KEY(postId) REFERENCES posts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS likes_log (
  id TEXT PRIMARY KEY, -- postId_ip
  postId TEXT NOT NULL,
  ip TEXT NOT NULL,
  likedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cards_cache (
  cardName TEXT PRIMARY KEY,
  cardData TEXT NOT NULL,
  lastAccessedAt INTEGER NOT NULL
);
