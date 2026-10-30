-- Stage the original rows without secondary indexes. REPLACE on the large live
-- table needlessly deletes/reinserts unchanged rows and rebuilds every index.
CREATE TEMPORARY TABLE initial_user_presents AS SELECT * FROM user_presents LIMIT 0;
LOAD DATA LOCAL INFILE '5_user_presents_not_receive_data.tsv'
  INTO TABLE initial_user_presents FIELDS ESCAPED BY '|' IGNORE 1 LINES;
INSERT INTO user_presents
  (id,user_id,sent_at,item_type,item_id,amount,present_message,created_at,updated_at,deleted_at)
SELECT id,user_id,sent_at,item_type,item_id,amount,present_message,created_at,updated_at,deleted_at
FROM initial_user_presents WHERE 1
ON DUPLICATE KEY UPDATE
  user_id=VALUES(user_id),sent_at=VALUES(sent_at),item_type=VALUES(item_type),
  item_id=VALUES(item_id),amount=VALUES(amount),present_message=VALUES(present_message),
  created_at=VALUES(created_at),updated_at=VALUES(updated_at),deleted_at=VALUES(deleted_at);
DROP TEMPORARY TABLE initial_user_presents;
