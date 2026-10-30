-- user_presents is preserved by initialize. Add its index only when missing.
SET @present_index_ddl = IF(
  EXISTS(SELECT 1 FROM information_schema.statistics
    WHERE table_schema = DATABASE() AND table_name = 'user_presents'
      AND index_name = 'idx_user_presents_user_deleted_created_id'),
  'SELECT 1',
  'ALTER TABLE user_presents ADD INDEX idx_user_presents_user_deleted_created_id (user_id, deleted_at, created_at DESC, id ASC)'
);
PREPARE present_index_stmt FROM @present_index_ddl;
EXECUTE present_index_stmt;
DEALLOCATE PREPARE present_index_stmt;
