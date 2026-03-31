# CS 340 Project Step 4 Draft
# Project Title: Local Bookstore Management System
# Team Name: Data Dream Team
# Member Names: Thania Cisneros, Tetiana Rens

-- SELECT QUERIES

-- Select all customers
SELECT 
    customer_id AS "Customer ID",
    first_name AS "First Name",
    last_name AS "Last Name",
    email AS "Email",
    phone_number AS "Phone Number",
    address AS "Address"
FROM Customers;

-- Select all orders
SELECT 
    order_id AS "Order ID", 
    customer_id AS "Customer ID", 
    order_date AS "Order Date", 
    total_amount AS "Total Amount"
FROM Orders;

-- Select all books
SELECT 
    book_id AS "Book ID", 
    title AS "Title", 
    description AS "Description", 
    genre AS "Genre", 
    publication_date AS "Publication Date", 
    price AS "Price", 
    inventory_quantity AS "Stock Available"
FROM Books;

-- Select all authors
SELECT 
    author_id AS "Author ID", 
    first_name AS "First Name", 
    last_name AS "Last Name"
FROM Authors;

-- Select all books-authors relationships
SELECT 
    book_id AS "Book ID", 
    author_id AS "Author ID"
FROM Books_Authors;


-- Select all publishers
SELECT 
    publisher_id AS "Publisher ID", 
    name AS "Publisher Name", 
    address AS "Address", 
    phone_number AS "Phone Number", 
    email AS "Email"
FROM Publishers;

-- Select all books-publishers relationships
SELECT 
    book_id AS "Book ID", 
    publisher_id AS "Publisher ID"
FROM Books_Publishers;

-- Select all books-orders relationships
SELECT 
    order_id AS "Order ID", 
    book_id AS "Book ID", 
    quantity_ordered AS "Quantity Ordered", 
    price_at_sale AS "Sale Price"
FROM Books_Orders;

-- Select all customers with their orders
SELECT 
    c.customer_id AS "Customer ID", 
    c.first_name AS "First Name", 
    c.last_name AS "Last Name", 
    c.email AS "Email", 
    c.phone_number AS "Phone Number", 
    c.address AS "Address", 
    o.order_id AS "Order ID", 
    o.order_date AS "Order Date", 
    o.total_amount AS "Total Amount"
FROM Customers AS c
INNER JOIN Orders AS o ON c.customer_id = o.customer_id;

-- INSERT QUERIES 

-- Insert a new customer
INSERT INTO Customers (first_name, last_name, email, phone_number, address)
VALUES (:firstNameInput, :lastNameInput, :emailInput, :phoneNumberInput, :addressInput);

-- Insert a new order
INSERT INTO Orders (customer_id, order_date, total_amount)
VALUES (:customerIdInput, :orderDateInput, :totalAmountInput);

-- Insert a new book
INSERT INTO Books (title, description, genre, publication_date, price, inventory_quantity)
VALUES (:titleInput, :descriptionInput, :genreInput, :publicationDateInput, :priceInput, :inventoryQuantityInput);

-- Insert a new author
INSERT INTO Authors (first_name, last_name)
VALUES (:firstNameInput, :lastNameInput);

-- Insert a new book-author relationship
INSERT INTO Books_Authors (book_id, author_id)
VALUES (:bookIdInput, :authorIdInput);

-- Insert a new publisher
INSERT INTO Publishers (name, address, phone_number, email)
VALUES (:nameInput, :addressInput, :phoneNumberInput, :emailInput);

-- Insert a new book-publisher relationship
INSERT INTO Books_Publishers (book_id, publisher_id)
VALUES (:bookIdInput, :publisherIdInput);

-- Insert a new book-order relationship
INSERT INTO Books_Orders (order_id, book_id, quantity_ordered, price_at_sale)
VALUES (:orderIdInput, :bookIdInput, :quantityOrderedInput, :priceAtSaleInput);

-- UPDATE QUERIES

-- Update a customer's information
UPDATE Customers
SET first_name = :firstNameInput, last_name = :lastNameInput, email = :emailInput, 
    phone_number = :phoneNumberInput, address = :addressInput
WHERE customer_id = :customerIdInput;

-- Update an order's information
UPDATE Orders
SET order_date = :orderDateInput, total_amount = :totalAmountInput
WHERE order_id = :orderIdInput;

-- Update a book's information
UPDATE Books
SET title = :titleInput, description = :descriptionInput, genre = :genreInput, 
    publication_date = :publicationDateInput, price = :priceInput, inventory_quantity = :inventoryQuantityInput
WHERE book_id = :bookIdInput;

-- Update an author's information
UPDATE Authors
SET first_name = :firstNameInput, last_name = :lastNameInput
WHERE author_id = :authorIdInput;

-- Update a book-author relationship
UPDATE Books_Authors
SET author_id = :newAuthorIdInput
WHERE book_id = :bookIdInput AND author_id = :authorIdInput;

-- Update a publisher's information
UPDATE Publishers
SET name = :nameInput, address = :addressInput, phone_number = :phoneNumberInput, email = :emailInput
WHERE publisher_id = :publisherIdInput;

-- Update a book-publisher relationship
UPDATE Books_Publishers
SET publisher_id = :newPublisherIdInput
WHERE book_id = :bookIdInput AND publisher_id = :publisherIdInput;

-- Update a book-order relationship
UPDATE Books_Orders
SET quantity_ordered = :quantityOrderedInput, price_at_sale = :priceAtSaleInput
WHERE book_order_id = :bookOrderIdInput;

-- DELETE QUERIES

-- Delete a customer
DELETE FROM Customers
WHERE customer_id = :customerIdInput;

-- Delete an order
DELETE FROM Orders
WHERE order_id = :orderIdInput;

-- Delete a book
DELETE FROM Books
WHERE book_id = :bookIdInput;

-- Delete an author
DELETE FROM Authors
WHERE author_id = :authorIdInput;

-- Delete a book-author relationship
DELETE FROM Books_Authors
WHERE book_id = :bookIdInput AND author_id = :authorIdInput;

-- Delete a publisher
DELETE FROM Publishers
WHERE publisher_id = :publisherIdInput;

-- Delete a book-publisher relationship
DELETE FROM Books_Publishers
WHERE book_id = :bookIdInput AND publisher_id = :publisherIdInput;

-- Delete a book-order relationship
DELETE FROM Books_Orders
WHERE book_order_id = :bookOrderIdInput;

