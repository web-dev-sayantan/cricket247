ALTER TABLE `innings`
ADD `opening_striker_id` integer REFERENCES `players`(`id`);

ALTER TABLE `innings`
ADD `opening_non_striker_id` integer REFERENCES `players`(`id`);

ALTER TABLE `innings`
ADD `opening_bowler_id` integer REFERENCES `players`(`id`);
