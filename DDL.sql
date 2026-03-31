-- Disable foreign key checks temporarily
SET foreign_key_checks = 0;

-- Drop existing tables
DROP TABLE IF EXISTS `Books_Publishers`;
DROP TABLE IF EXISTS `Books_Authors`;
DROP TABLE IF EXISTS `Books_Orders`;
DROP TABLE IF EXISTS `Books`;
DROP TABLE IF EXISTS `Authors`;
DROP TABLE IF EXISTS `Customers`;
DROP TABLE IF EXISTS `Orders`;
DROP TABLE IF EXISTS `Publishers`;

-- Re-enable foreign key checks
SET foreign_key_checks = 1;

-- Create Publishers table
CREATE TABLE `Publishers` (
    `publisher_id` INT(11) AUTO_INCREMENT NULL UNIQUE PRIMARY KEY, 
    `name` VARCHAR(255) NOT NULL, 
    `address` VARCHAR(255) NOT NULL, 
    `phone_number` VARCHAR(15) NOT NULL, 
    `email` VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- Create Books table
CREATE TABLE `Books` (
  `book_id` INT(11) NOT NULL AUTO_INCREMENT,
  `publisher_id` INT(11) NOT NULL, 
  `title` VARCHAR(225) NOT NULL,
  `description` VARCHAR(255) NOT NULL,
  `genre` ENUM('Fantasy', 'Horror', 'Science Fiction', 'Mystery', 'Romance', 
               'Thriller', 'Non-fiction', 'Biography', 
               'Self-Help', 'Young Adult', 'Children''s', 'Adventure', 
               'Dystopian', 'Classic', 'Fiction') NOT NULL, 
  `publication_date` DATE NOT NULL,
  `inventory_quantity` INT(11) NOT NULL,
  `price` DECIMAL(10,2),
  PRIMARY KEY (`book_id`),
  FOREIGN KEY (`publisher_id`) REFERENCES `Publishers`(`publisher_id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8;

-- Create Authors table
CREATE TABLE `Authors` (
  `author_id` int(11) NOT NULL AUTO_INCREMENT,
  `first_name` varchar(255) NOT NULL,
  `last_name` varchar(255) NOT NULL,
  PRIMARY KEY (`author_id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8;

-- Create Books_Authors table
CREATE TABLE `Books_Authors` (
  `book_id` INT(11) NOT NULL,  
  `author_id` INT(11) NOT NULL,  
  PRIMARY KEY (`book_id`, `author_id`),  
  FOREIGN KEY (`book_id`) REFERENCES `Books` (`book_id`) 
    ON DELETE CASCADE ON UPDATE CASCADE,  
  FOREIGN KEY (`author_id`) REFERENCES `Authors` (`author_id`) 
    ON DELETE CASCADE ON UPDATE CASCADE  
) ENGINE=InnoDB DEFAULT CHARSET=utf8;


-- Create Customers table
CREATE TABLE `Customers` (
  `customer_id` int(11) NOT NULL AUTO_INCREMENT,
  `first_name` varchar(255) NOT NULL,
  `last_name` varchar(255) NOT NULL,
  `email` varchar(50) NOT NULL,
  `phone_number` varchar(15) NOT NULL,
  `address` varchar(255) NOT NULL,
  PRIMARY KEY (`customer_id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8;

-- Create Orders table
CREATE TABLE `Orders` (
  `order_id` int(11) NOT NULL AUTO_INCREMENT,
  `order_date` date NOT NULL,
  `customer_id` int(11) NOT NULL,
  `total_amount` decimal(10,2) NOT NULL,
  PRIMARY KEY (`order_id`),
  KEY `customer_id` (`customer_id`),
  CONSTRAINT `Orders_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `Customers` (`customer_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8;

-- Create Books_Orders table
CREATE TABLE `Books_Orders` (
    `book_order_id` INT(11) AUTO_INCREMENT NOT NULL UNIQUE PRIMARY KEY, 
    `order_id` INT(11) NOT NULL, 
    `book_id` INT(11) NOT NULL, 
    `quantity_ordered` INT(11) NOT NULL, 
    `price_at_sale` DECIMAL(10, 2) NOT NULL, 
    FOREIGN KEY (`book_id`) REFERENCES `Books` (`book_id`) 
        ON DELETE CASCADE ON UPDATE CASCADE, 
    FOREIGN KEY (`order_id`) REFERENCES `Orders` (`order_id`) 
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;


-- Insert data into Publishers table
INSERT INTO `Publishers` (`name`, `address`, `phone_number`, `email`) VALUES
('Harper Voyager', '704 Findley Avenue, New York, USA, 54321-0000', '111-222-3333', 'info@harpervoyager.com'),
('Secker & Warburg', '4006 Pringle Drive, London, UK, 54321-0001', '222-111-3333', 'info@seckerwarburg.com'),
('Laboratory', '3362 Clark Street, London, UK, 54321-0002', '333-2222-1111', 'info@laboratory.com');

-- Insert data into Books table 
INSERT INTO `Books` (`publisher_id`, `title`, `description`, `genre`, `publication_date`, `price`, `inventory_quantity`) VALUES
(1, 'Babel', 'A determined young scholar embarks on a journey to uncover ancient secrets.', 'Fiction', '2022-08-23', 19.99, 150),
(2, '1984', 'A dystopian novel about totalitarianism and surveillance.', 'Fiction', '1949-06-08', 15.99, 50),
(1, 'The Lord of the Rings', 'A group of heroes embarks on an epic quest to save the world from darkness', 'Fantasy', '1954-07-29', 12.99, 75),
(2, 'Animal Farm', 'A group of farm animals revolt against their oppressive human owner.', 'Fiction', '1945-08-17', 9.99, 0);

-- Insert data into Authors table
INSERT INTO `Authors` VALUES
(1, 'Rebecca F.', 'Kuang'),
(2, 'George', 'Orwell'),
(3, 'J.R.R.', 'Tolkien'),
(4, 'Anita', 'Lovecraft');

-- Insert data into Customers table
INSERT INTO `Customers` VALUES 
(1, 'Chelsey', 'Riddle', 'chelsey.riddle@gmail.com', '458-000-1111', '4311 Davis Street, HappyTown, OR, 12345-0000'),
(2, 'Aleena', 'Acosta', 'aleena.acosta@gmail.com', '458-000-1112', '414 Seneca Drive, SunnyTown, CA, 12346-0000'),
(3, 'Darius', 'Edwards', 'darius.edwards@gmail.com', '458-000-1113', '4058 Buena Vista Avenue, OR, 12347-0000');

-- Insert data into Orders table
INSERT INTO `Orders` (order_id, order_date, customer_id, total_amount) VALUES
(1, '2025-02-01', 1, 29.98),   -- Customer with ID 1
(2, '2025-02-02', 2, 15.99),   -- Customer with ID 2
(3, '2025-02-03', 3, 29.97);   -- Customer with ID 3

-- Insert data into Books_Authors table
INSERT INTO `Books_Authors` VALUES 
(1, 1),  -- Babel by Rebecca F. Kuang
(2, 2),  -- 1984 by George Orwell
(3, 3),  -- The Lord of the Rings by J.R.R. Tolkien
(4, 2);  -- Animal Farm by George Orwell

-- Insert data into Books_Orders table
INSERT INTO `Books_Orders` VALUES
(1, 1, 1, 2, 14.99),
(2, 2, 2, 1, 15.99) ,
(3, 3, 3, 3, 9.99);
