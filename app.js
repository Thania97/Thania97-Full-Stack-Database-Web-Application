// App.js
//   Citation for the following HTML document
//   Date: 02/12/2025
//   Used JavaScript Reference for the following functions: formatting publication date, setting price to NULL if not provided,
//   using trim function for filtering, mapping to display authors :
//   Source URL: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference

//   Citation for the following HTML document
//   Date: 02/24/2025
//   Adapted registerHelper function from the following source:
//   Source URL: https://stackoverflow.com/questions/41764373/how-to-register-custom-handlebars-helpers

// express 
var express = require('express');   // Use the express library for the web server
var app     = express();            // Instantiate an express object to interact with the server 
PORT        = 33207;                 // Set a port number at the top so it's easy to change in the future

// app.js - SETUP section

app.use(express.json())
app.use(express.urlencoded({extended: true}))
app.use(express.static('public'))

//handlebars

const { engine } = require('express-handlebars');
var exphbs = require('express-handlebars');     // Import express-handlebars
app.engine('.hbs', engine({extname: ".hbs"}));  // Create an instance of the handlebars engine to process templates
app.set('view engine', '.hbs');                 // Tell express to use the handlebars engine whenever it encounters a *.hbs file.

// Register the 'isEqual' helper
const Handlebars = require('handlebars');
Handlebars.registerHelper('isEqual', function(value1, value2) {
    return value1 === value2;
});

// Database
var db = require('./database/db-connector')

app.use(express.static('public'));


// ROUTES    

// GET BOOKS, AUTHORS, AND BOOKS AUTHORS for INDEX
app.get('/', function(req, res) {
    let bookTitle = req.query.title || ''; 

    // Query to get books with publisher's full name, filtered by title
    let queryBooks = `
        SELECT 
            Books.book_id, 
            Books.title, 
            Books.description, 
            Books.genre, 
            Publishers.name AS publisher_name,  
            Books.publication_date, 
            Books.inventory_quantity, 
            Books.price
        FROM Books
        LEFT JOIN Publishers ON Books.publisher_id = Publishers.publisher_id
    `;

    let queryParams = [];
    // If searching by title, modify the query
    if (bookTitle.trim() !== '') {
        queryBooks += ` WHERE Books.title LIKE ? `;
        queryParams.push(`%${bookTitle}%`);
    }

    // Query to get book-author relationships (book title + authors, including author_id)
    let booksAuthorsQuery = `
        SELECT 
            Books_Authors.book_id, 
            Books_Authors.author_id,  
            Books.title,
            CONCAT(Authors.first_name, ' ', Authors.last_name) AS author
        FROM Books_Authors
        LEFT JOIN Books ON Books_Authors.book_id = Books.book_id
        LEFT JOIN Authors ON Books_Authors.author_id = Authors.author_id
    `;

    // Apply search filter to booksAuthorsQuery
    if (bookTitle.trim() !== '') {
        booksAuthorsQuery += ` WHERE Books_Authors.book_id IN (SELECT book_id FROM Books WHERE title LIKE ?)`
        queryParams.push(`%${bookTitle}%`);
    }

    // Query to get all authors (for author dropdown)
    let queryAuthors = `SELECT author_id, CONCAT(first_name, ' ', last_name) AS full_name FROM Authors`;

    // Query to get publishers (for publisher dropdown)
    let publishersQuery = `SELECT publisher_id, name FROM Publishers;`;

    // Fetch books data
    db.pool.query(queryBooks, queryParams, function(error, booksRows) {
        if (error) {
            console.error("Error in books query:", error);
            return res.status(500).send("Error in database query");
        }

        // Fetch authors data for dropdown
        db.pool.query(queryAuthors, function(error, authorsRows) {
            if (error) {
                console.error("Error in authors query:", error);
                return res.status(500).send("Error in database query");
            }

            // Fetch books-author relationships with author_id included
            db.pool.query(booksAuthorsQuery, queryParams, function(error, booksAuthorsRows) {
                if (error) {
                    console.error("Error in books authors query:", error);
                    return res.status(500).send("Error in database query");
                }

                // Fetch publishers data
                db.pool.query(publishersQuery, function(error, publishersRows) {
                    if (error) {
                        console.error("Error in publishers query:", error);
                        return res.status(500).send("Error in database query");
                    }

                    // Merge authors with corresponding books
                    booksRows.forEach(book => {
                        // Find the authors for the book
                        const authorsForBook = booksAuthorsRows.filter(author => author.book_id === book.book_id);
                        book.authors = authorsForBook.length > 0 
                            ? authorsForBook.map(a => a.author).join(", ") // If multiple authors, join their names
                            : 'Unknown';  // If no authors found, display "Unknown"

                        // Format the publication_date for each book (if available)
                        const pubDate = new Date(book.publication_date);
                        book.publication_date = !isNaN(pubDate.getTime()) 
                            ? pubDate.toISOString().split('T')[0] // Format as YYYY-MM-DD
                            : '';  // Empty string if the date is invalid
                    });

                    // Render the page with books, authors, and publishers
                    res.render('index', { 
                        data: booksRows,  // Pass merged data (books + authors) to display books
                        booksAuthors: booksAuthorsRows,  // Pass book-author relationships to the table
                        publishers: publishersRows,  
                        authors: authorsRows  
                    });
                });
            });
        });
    });
});


// GET EDIT BOOK AUTHOR
app.get('/edit-book-author/:book_id', function(req, res) {
    let bookId = req.params.book_id;

    // Query to fetch the selected book-author relationship
    let query = `
        SELECT 
            Books.book_id, 
            Books.title AS book_title, 
            CONCAT(Authors.first_name, ' ', Authors.last_name) AS full_name,
            Authors.author_id AS author_id
        FROM Books
        LEFT JOIN Books_Authors ON Books.book_id = Books_Authors.book_id
        LEFT JOIN Authors ON Books_Authors.author_id = Authors.author_id
        WHERE Books.book_id = ?
    `;
    
    // Fetch the selected book-author relationship
    db.pool.query(query, [bookId], function(error, result) {
        if (error) {
            console.error(error);
            return res.status(500).send("Error in database query");
        }

        // Query to fetch all authors for the dropdown
        let queryAuthors = 'SELECT author_id, CONCAT(first_name, " ", last_name) AS full_name FROM Authors';

        // Fetch authors for the dropdown
        db.pool.query(queryAuthors, function(error, authors) {
            if (error) {
                console.error(error);
                return res.status(500).send('Failed to retrieve authors');
            }

            // Render the page with the selected book-author relationship and authors list
            res.render('edit-book-author', { 
                bookAuthor: result[0], 
                authors: authors 
            });
        });
    });
});


// POST EDIT BOOK AUTHOR  
app.post('/update-book-author', function(req, res) {
    let bookId = req.body.book_id;  // Get the book_id from the form
    let authorId = req.body.author_id;  // Get the author_id from the form

    // // Log the values to ensure we're receiving correct input
    // console.log("bookId:", bookId); 
    // console.log("authorId:", authorId); 

    // Check if both book_id and author_id are valid
    if (!bookId || !authorId || authorId === '') {
        return res.status(400).send("Invalid input. Book ID or Author ID is missing.");
    }


    // Query to check if the relationship already exists
    let checkQuery = `SELECT * FROM Books_Authors WHERE book_id = ? AND author_id = ?;`;

    db.pool.query(checkQuery, [bookId, authorId], function(error, result) {
        if (error) {
            console.error("Error checking for existing relationship:", error);
            return res.status(500).send("Error checking for existing relationship");
        }

        // If no existing relationship, update
        let query = `
            UPDATE Books_Authors
            SET author_id = ?
            WHERE book_id = ?;
        `;

        db.pool.query(query, [authorId, bookId], function(error, result) {
            if (error) {
                console.error("Error updating book-author relationship:", error);
                return res.status(500).send(`Error updating book-author relationship: ${error.message}`);
            }

            // Redirect after update
            res.redirect('/');
        });
    });
});

//ADD BOOK AUTHOR POST
app.post('/add-book-author', function(req, res) {
    let bookId = req.body.book_id;
    let authorId = req.body.author_id;

    // Log the values for debugging
    console.log("bookId:", bookId);
    console.log("authorId:", authorId);

    // Check if both book_id and author_id are valid
    if (!bookId || !authorId) {
        return res.status(400).send("Invalid input. Book ID or Author ID is missing.");
    }

    // Check if the book-author relationship already exists
    let checkQuery = `SELECT * FROM Books_Authors WHERE book_id = ? AND author_id = ?;`;
    db.pool.query(checkQuery, [bookId, authorId], function(error, result) {
        if (error) {
            console.error("Error checking for existing relationship:", error);
            return res.status(500).send("Error checking for existing relationship");
        }

        if (result.length > 0) {
            return res.status(400).send("This book is already associated with the selected author.");
        }

        // Add the new book-author relationship to the Books_Authors table
        let insertQuery = `
            INSERT INTO Books_Authors (book_id, author_id)
            VALUES (?, ?);
        `;
        
        db.pool.query(insertQuery, [bookId, authorId], function(error, result) {
            if (error) {
                console.error("Error adding book-author relationship:", error);
                return res.status(500).send("Error adding book-author relationship");
            }

            // Redirect 
            res.redirect('/');
        });
    });
});

// DELETE BOOK AUTHOR
app.post('/delete-book-author', function(req, res) {
    let bookId = req.body.book_id;
    let authorId = req.body.author_id;

    // // Log the received values to check if they're correct
    // console.log(`Received Book ID: ${bookId}, Author ID: ${authorId}`);

    // Proceed with the check and deletion
    if (!bookId || !authorId) {
        return res.status(400).send("Both book_id and author_id are required.");
    }

    let deleteQuery = 'DELETE FROM Books_Authors WHERE book_id = ? AND author_id = ?';

    db.pool.query(deleteQuery, [bookId, authorId], function(error, result) {
        if (error) {
            console.error("Error deleting relationship:", error);
            return res.status(500).send("Error deleting book-author relationship");
        }

        // console.log(`Deleted rows: ${result.affectedRows}`);
        res.redirect('/');
    });
});


// GET AUTHORS 
app.get('/authors', function(req, res) {
    let authorsQuery;

    // If no last name is specified, select all authors
    if (!req.query.last_name || req.query.last_name === '') {
        authorsQuery = `
            SELECT author_id, first_name, last_name
            FROM Authors;
        `;
    } else {
        // Search for authors by last name (partial last name matches allowed)
        authorsQuery = `
            SELECT author_id, first_name, last_name
            FROM Authors
            WHERE last_name LIKE "%${req.query.last_name}%";  
        `;
    }

    // Execute the query
    db.pool.query(authorsQuery, function(error, authorsRows) {
        if (error) {
            console.error("Error in authors query:", error);
            return res.status(500).send("Error in database query");
        }

        // Render the authors page with the filtered or all authors
        res.render('authors', { authorsData: authorsRows });
    });
});


// GET CUSTOMERS
app.get('/customers', function(req, res) {
    let query1;

    // If no last_name is specified, select all customers
    if (!req.query.last_name || req.query.last_name === '') {
        query1 = `
            SELECT 
                customer_id, 
                first_name, 
                last_name, 
                email, 
                phone_number, 
                address
            FROM Customers;`;
    } else {
        // Search for customers by last name
        query1 = `
            SELECT 
                customer_id, 
                first_name, 
                last_name, 
                email, 
                phone_number, 
                address
            FROM Customers
            WHERE last_name LIKE "%${req.query.last_name}%";`;  
    }

    db.pool.query(query1, function(error, rows, fields) {
        if (error) {
            console.error('Database Query Error:', error); 
            return res.status(500).send("Error in database query");
        }

        // console.log('Query Result:', rows); // Log rows returned by the query
        res.render('customers', { data: rows }); 
    });  
});

// GET BOOK ORDERS
app.get('/orders', function (req, res) {
    let customerLastName = req.query.customer_last_name || ''; 

    let ordersQuery = `
        SELECT 
            Orders.order_id,  
            Orders.order_date, 
            Orders.total_amount,  
            CONCAT(Customers.first_name, ' ', Customers.last_name) AS customer_full_name,
            GROUP_CONCAT(Books.title ORDER BY Books.title ASC) AS book_titles,
            COALESCE(SUM(Books_Orders.quantity_ordered), 0) AS total_books_ordered
        FROM Orders
        JOIN Customers ON Orders.customer_id = Customers.customer_id
        LEFT JOIN Books_Orders ON Books_Orders.order_id = Orders.order_id
        LEFT JOIN Books ON Books_Orders.book_id = Books.book_id
    `;

    let queryParams = [];

    // If searching by last name, modify query
    if (customerLastName.trim() !== '') {
        ordersQuery += ` WHERE Customers.last_name LIKE ? `;
        queryParams.push(`%${customerLastName}%`);
    }

    ordersQuery += ` GROUP BY Orders.order_id, Orders.total_amount, Customers.customer_id;`;

    let booksOrdersQuery = `
        SELECT 
            Books_Orders.book_order_id,
            Orders.order_id, 
            Books.title AS book_title,
            Books_Orders.quantity_ordered,
            Books_Orders.price_at_sale,
            Orders.order_date,
            CONCAT(Customers.first_name, ' ', Customers.last_name) AS customer_full_name
        FROM Books_Orders
        JOIN Orders ON Books_Orders.order_id = Orders.order_id
        JOIN Books ON Books_Orders.book_id = Books.book_id
        JOIN Customers ON Orders.customer_id = Customers.customer_id
    `;

    // Apply filter to booksOrdersQuery too
    if (customerLastName.trim() !== '') {
        booksOrdersQuery += ` WHERE Customers.last_name LIKE ? `;
    }

    booksOrdersQuery += ` ORDER BY Orders.order_date;`;

    let booksQuery = `SELECT book_id, title FROM Books;`;
    let customersQuery = `SELECT customer_id, CONCAT(first_name, ' ', last_name) AS full_name FROM Customers;`;

    db.pool.query(ordersQuery, queryParams, function (error, ordersRows) {
        if (error) {
            console.error("Error in orders query:", error);
            return res.status(500).send("Error in database query");
        }

        ordersRows.forEach(row => {
            const orderDate = new Date(row.order_date);
            row.order_date = !isNaN(orderDate.getTime()) ? orderDate.toISOString().split('T')[0] : '';
        });

        db.pool.query(booksOrdersQuery, queryParams, function (error, booksOrdersRows) {
            if (error) {
                console.error("Error in books orders query:", error);
                return res.status(500).send("Error in database query");
            }

            booksOrdersRows.forEach(row => {
                const orderDate = new Date(row.order_date);
                row.order_date = !isNaN(orderDate.getTime()) ? orderDate.toISOString().split('T')[0] : '';
            });

            db.pool.query(booksQuery, function (error, booksRows) {
                if (error) {
                    console.error("Error in books query:", error);
                    return res.status(500).send("Error fetching books");
                }

                db.pool.query(customersQuery, function (error, customersRows) {
                    if (error) {
                        console.error("Error in customers query:", error);
                        return res.status(500).send("Error fetching customers");
                    }

                    res.render('orders', {
                        ordersData: ordersRows,
                        booksOrdersData: booksOrdersRows,
                        books: booksRows,
                        customers: customersRows
                    });
                });
            });
        });
    });
});


// GET PUBLISHERS 
app.get('/publishers', function(req, res) {
    let publishersQuery;

    // If no name is specified, select all publishers
    if (!req.query.name || req.query.name === '') {
        publishersQuery = `
            SELECT publisher_id, name, address, phone_number, email
            FROM Publishers;
        `;
    } else {
        // Search for publishers by name (partial name matches allowed)
        publishersQuery = `
            SELECT publisher_id, name, address, phone_number, email
            FROM Publishers
            WHERE name LIKE "%${req.query.name}%";  
        `;
    }

    // Execute the query
    db.pool.query(publishersQuery, function(error, publishersRows) {
        if (error) {
            console.error("Error in publishers query:", error);
            return res.status(500).send("Error in database query");
        }

        // Render the publishers page with the filtered or all publishers
        res.render('publishers', { publishersData: publishersRows });
    });
});


// ADD 
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// POST ADD BOOK
app.post('/add-book-form', function(req, res) {
    let data = req.body;

    // Get the data fields from the form
    let title = data['input-title'];
    let description = data['input-description'];
    let genre = data['input-genre'];
    let publication_date = data['input-publication_date'];
    let inventory_quantity = data['input-inventory_quantity'];
    let publisher_id = data['input-publisher']; 

    // Validate that publisher_id is provided
    if (!publisher_id || publisher_id === '') {
        return res.status(400).send("Publisher is required.");
    }

    // Validate and parse price (if not provided, set to null)
    let price = data['input-price'];
    if (!price || price === '') {
        price = null; // If price is not submitted, set it to null
    } else {
        price = parseFloat(price);
        if (isNaN(price)) {
            price = null; // If the price is invalid, set it to null
        }
    }

    // Create the SQL query to insert the book
    let query = `
        INSERT INTO Books (publisher_id, title, description, genre, publication_date, inventory_quantity, price)
        VALUES (?, ?, ?, ?, ?, ?, ?)`;

    db.pool.query(query, [publisher_id, title, description, genre, publication_date, inventory_quantity, price], function(error, result) {
        if (error) {
            console.log(error);
            return res.status(400).send("Error inserting book: " + error.message);
        } else {
            // Redirect to the index page after successful insertion
            res.redirect('/');
        }
    });
});


// POST ADD CUSTOMERS
app.post('/add-customer-form', function(req, res) {
    
    let data = req.body;

    // Get customer data fields from the request
    let first_name = data['first_name'];
    let last_name = data['last_name'];
    let email = data['email'];
    let phone_number = data['phone_number'];
    let address = data['address'];

    let query1 = `
        INSERT INTO Customers (first_name, last_name, email, phone_number, address)
        VALUES (?, ?, ?, ?, ?);
    `;

    // Execute the query to insert data into the database
    db.pool.query(query1, [first_name, last_name, email, phone_number, address], function(error, rows, fields) {
        // Check for errors
        if (error) {
            res.sendStatus(400); 
        } else {
            // Redirect back to the customers page on success
            res.redirect('/customers');
        }
    });
});

// POST ADD BOOK ORDER
app.post('/add-book-order', function (req, res) {
    let data = req.body;

    let orderId = data['order_id'];
    let customerId = data['customer_id']; 
    let bookId = data['book_id'];
    let quantityOrdered = parseInt(data['quantity_ordered']);
    let priceAtSale = parseFloat(data['price_at_sale']);
    let orderDate = data['order_date'];

    // Validate inputs
    if (!customerId) {
        return res.status(400).send('Customer ID is required');
    }
    if (isNaN(quantityOrdered) || quantityOrdered <= 0) {
        return res.status(400).send('Invalid quantity ordered');
    }
    if (isNaN(priceAtSale)) {
        return res.status(400).send('Invalid price format');
    }

    let totalAmountForThisOrder = quantityOrdered * priceAtSale;
    let formattedOrderDate = orderDate ? orderDate.split('T')[0] : null;

    if (orderId === 'new') {
        // Check if customer exists
        let checkCustomerQuery = `SELECT * FROM Customers WHERE customer_id = ?`;
        db.pool.query(checkCustomerQuery, [customerId], function (error, results) {
            if (error) {
                console.error("Error checking customer:", error);
                return res.status(500).send('Error validating customer ID');
            }
            if (results.length === 0) {
                return res.status(400).send('Invalid customer ID');
            }

            // Insert into Orders with customer_id
            let insertOrderQuery = `
                INSERT INTO Orders (order_date, customer_id, total_amount)
                VALUES (?, ?, ?);`;

            db.pool.query(insertOrderQuery, [formattedOrderDate, customerId, totalAmountForThisOrder], function (error, result) {
                if (error) {
                    console.error("Error inserting new order:", error);
                    return res.status(500).send('Failed to create new order');
                }

                let newOrderId = result.insertId;
                insertBookOrder(newOrderId);
            });
        });
    } else {
        // Use existing order
        insertBookOrder(orderId);
    }

    function insertBookOrder(orderId) {
        let insertBookOrderQuery = `
            INSERT INTO Books_Orders (order_id, book_id, quantity_ordered, price_at_sale)
            VALUES (?, ?, ?, ?);`;

        db.pool.query(insertBookOrderQuery, [orderId, bookId, quantityOrdered, priceAtSale], function (error) {
            if (error) {
                console.error("Error inserting book order:", error);
                return res.status(500).send('Failed to add book order');
            }

            console.log("Book order added successfully.");
            updateOrderTotal(orderId);
        });
    }

    function updateOrderTotal(orderId) {
        let totalAmountQuery = `
            SELECT SUM(quantity_ordered * price_at_sale) AS total_amount
            FROM Books_Orders WHERE order_id = ?;`;

        db.pool.query(totalAmountQuery, [orderId], function (error, result) {
            if (error) {
                console.error("Error calculating total amount:", error);
                return res.status(500).send('Failed to recalculate order total');
            }

            let totalAmount = result[0].total_amount || 0;
            let updateOrderQuery = `
                UPDATE Orders 
                SET total_amount = ?
                WHERE order_id = ?;`;

            db.pool.query(updateOrderQuery, [totalAmount, orderId], function (error) {
                if (error) {
                    console.error("Error updating order:", error);
                    return res.status(500).send('Failed to update order details');
                }

                console.log("Successfully updated order total.");
                res.redirect('/orders');
            });
        });
    }
});

// POST ADD AUTHOR 
app.post('/add-author', function(req, res) {
    let data = req.body;

    // Extract first and last name
    let firstName = data['input-first-name'];
    let lastName = data['input-last-name'];

    // SQL query to insert into Authors table
    let query = `INSERT INTO Authors (first_name, last_name) VALUES (?, ?);`;

    // Execute the query 
    db.pool.query(query, [firstName, lastName], function(error, result) {
        if (error) {
            console.error("Error inserting author:", error);
            return res.sendStatus(400); 
        }
        res.redirect('/authors');
    });
});

// ADD PUBLISHER
app.post('/add-publisher', function(req, res) {
    let data = req.body;
    let query = `
        INSERT INTO Publishers (name, address, phone_number, email)
        VALUES (?, ?, ?, ?);
    `;

    db.pool.query(query, [data.name, data.address, data.phone_number, data.email], function(error, result) {
        if (error) {
            console.error("Error inserting publisher:", error);
            return res.status(500).send("Failed to add publisher");
        }

        res.redirect('/publishers');
    });
});

//////////////////////////////////////////////////////////////////////////////////////////////////////
// DELETE BOOKS
app.post('/delete-book', function(req, res) {

    let bookId = req.body.book_id;
    bookId = parseInt(bookId, 10);

    if (isNaN(bookId)) {
        return res.status(400).send('Invalid book ID');
    }

    let query = `DELETE FROM Books WHERE book_id = ?`;
    db.pool.query(query, [bookId], function(error, result) {
        if (error) {
            console.error(error);
            return res.status(500).send('Failed to delete book');
        }

        if (result.affectedRows === 0) {
            return res.status(404).send('Book not found');
        }

        res.redirect('/');
    });
});


// DELETE CUSTOMERS
app.post('/delete-customer', function(req, res) {

    let customerId = req.body.customer_id;
    customerId = parseInt(customerId, 10);

    if (isNaN(customerId)) {
        return res.status(400).send('Invalid customer ID');
    }

    let query = `DELETE FROM Customers WHERE customer_id = ?`;
    db.pool.query(query, [customerId], function(error, result) {
        if (error) {
            console.error(error);
            return res.status(500).send('Failed to delete customer');
        }

        if (result.affectedRows === 0) {
            return res.status(404).send('Customer not found');
        }

        res.redirect('/customers');  // Redirect back to customers page after deletion
    });
});

// DELETE A BOOK ORDER
app.post('/delete-book-order', function (req, res) {

    let bookOrderId = parseInt(req.body.book_order_id, 10);

    if (isNaN(bookOrderId)) {
        return res.status(400).send('Invalid book order ID');
    }

    // Get order_id and price info before deleting
    let getOrderInfoQuery = `
        SELECT order_id, (quantity_ordered * price_at_sale) AS order_value
        FROM Books_Orders WHERE book_order_id = ?;
    `;

    db.pool.query(getOrderInfoQuery, [bookOrderId], function (error, results) {
        if (error) {
            console.error('Error fetching order info:', error);
            return res.status(500).send('Error fetching order info');
        }

        if (results.length === 0) {
            return res.status(404).send('Book order not found');
        }

        let orderId = results[0].order_id;
        let orderValue = results[0].order_value;

        // Delete book order
        let deleteBookOrderQuery = `DELETE FROM Books_Orders WHERE book_order_id = ?;`;

        db.pool.query(deleteBookOrderQuery, [bookOrderId], function (error, result) {
            if (error) {
                console.error('Error deleting book order:', error);
                return res.status(500).send('Failed to delete book order');
            }

            if (result.affectedRows === 0) {
                return res.status(404).send('Book order not found');
            }

            console.log(`Book order ${bookOrderId} deleted successfully.`);

            // Check if there are remaining book orders for this order_id
            let checkRemainingOrdersQuery = `SELECT COUNT(*) AS count FROM Books_Orders WHERE order_id = ?;`;

            db.pool.query(checkRemainingOrdersQuery, [orderId], function (error, countResults) {
                if (error) {
                    console.error('Error checking remaining book orders:', error);
                    return res.status(500).send('Error checking remaining book orders');
                }

                let remainingOrders = countResults[0].count;

                if (remainingOrders === 0) {
                    // If no remaining book orders, delete the order entry
                    let deleteOrderQuery = `DELETE FROM Orders WHERE order_id = ?;`;

                    db.pool.query(deleteOrderQuery, [orderId], function (error) {
                        if (error) {
                            console.error('Error deleting empty order:', error);
                            return res.status(500).send('Failed to delete empty order');
                        }
                        console.log(`Order ${orderId} deleted as it had no remaining book orders.`);
                        return res.redirect('/orders');
                    });
                } else {
                    // If book orders remain, update the total amount
                    let updateOrderTotalQuery = `
                        UPDATE Orders 
                        SET total_amount = total_amount - ?
                        WHERE order_id = ?;
                    `;

                    db.pool.query(updateOrderTotalQuery, [orderValue, orderId], function (error) {
                        if (error) {
                            console.error('Error updating order total:', error);
                            return res.status(500).send('Failed to update order total');
                        }

                        console.log(`Order ${orderId} total updated successfully.`);
                        return res.redirect('/orders');
                    });
                }
            });
        });
    });
});


// DELETE AUTHOR
app.post('/delete-author', function(req, res) {

    let authorId = req.body.author_id;
    authorId = parseInt(authorId, 10);

    if (isNaN(authorId)) {
        return res.status(400).send('Invalid author ID');
    }

    let query = `DELETE FROM Authors WHERE author_id = ?`;
    db.pool.query(query, [authorId], function(error, result) {
        if (error) {
            console.error("Error deleting author:", error);
            return res.status(500).send('Failed to delete author');
        }

        if (result.affectedRows === 0) {
            return res.status(404).send('Author not found');
        }

        res.redirect('/authors');  // Redirect back to the authors page after deletion
    });
});

// DELETE PUBLISHER
app.post('/delete-publisher', function(req, res) {
    let publisherId = parseInt(req.body.publisher_id, 10);

    if (isNaN(publisherId)) {
        return res.status(400).send("Invalid publisher ID");
    }

    let query = `DELETE FROM Publishers WHERE publisher_id = ?`;
    db.pool.query(query, [publisherId], function(error, result) {
        if (error) {
            console.error("Error deleting publisher:", error);
            return res.status(500).send("Failed to delete publisher");
        }

        res.redirect('/publishers');
    });
});


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// GET UPDATE A BOOK
app.get('/update-book/:bookId', function(req, res) {
    const bookId = req.params.bookId;

    // Query to get the current book details based on the bookId
    let bookQuery = `SELECT * FROM Books WHERE book_id = ?`;
    // Query for publisher names
    let publisherQuery = `SELECT publisher_id, name FROM Publishers`; 
    // Query to get authors (read-only)
    let authorsQuery = `
        SELECT CONCAT(Authors.first_name, ' ', Authors.last_name) AS author_name
        FROM Books_Authors
        JOIN Authors ON Books_Authors.author_id = Authors.author_id
        WHERE Books_Authors.book_id = ?
    `;

    // Get book details and publisher list
    db.pool.query(bookQuery, [bookId], function(error, result) {
        if (error) {
            console.error(error);
            return res.status(500).send('Failed to retrieve book details');
        }

        if (result.length === 0) {
            return res.status(404).send('Book not found');
        }

        const book = result[0];
        let pubDate = new Date(book.publication_date);

        // Check if the publication_date is a valid date
        if (!isNaN(pubDate.getTime())) {
            book.publication_date = pubDate.toISOString().split('T')[0];  // Format to 'YYYY-MM-DD'
        } else {
            book.publication_date = '';  // If invalid, set to empty string
        }

        // Get publishers list
        db.pool.query(publisherQuery, function(error, publishers) {
            if (error) {
                console.error(error);
                return res.status(500).send('Failed to retrieve publisher list');
            }

            // Get authors (for read-only)
            db.pool.query(authorsQuery, [bookId], function(error, authors) {
                if (error) {
                    console.error(error);
                    return res.status(500).send('Failed to retrieve authors');
                }

                // Extract author names as a list for display
                const authorNames = authors.map(author => author.author_name);

                // Render the edit form with book data, publisher options, and authors
                res.render('edit-book-form', { 
                    book: book, 
                    publishers: publishers,
                    authors: authorNames // Display authors but with no option to edit
                });
            });
        });
    });
});

// POST UPDATE A BOOK (no author update)
app.post('/update-book/:bookId', function(req, res) {
    const bookId = req.params.bookId;
    const { 
        'input-title': title, 
        'input-description': description, 
        'input-genre': genre, 
        'input-publication_date': publication_date, 
        'input-inventory_quantity': inventory_quantity, 
        'input-price': price, 
        'input-publisher': publisherId 
    } = req.body;

    // Ensure the publication_date is in the 'YYYY-MM-DD' format
    const formattedPublicationDate = publication_date ? publication_date.split('T')[0] : null;
    const validDate = new Date(formattedPublicationDate);
    
    if (isNaN(validDate.getTime())) {
        console.error("Invalid publication_date:", formattedPublicationDate);
        return res.status(400).send('Invalid publication date format');
    }

    // Update query (no author update)
    let query = `UPDATE Books 
                 SET title = ?, description = ?, genre = ?, publication_date = ?, inventory_quantity = ?, price = ?, publisher_id = ? 
                 WHERE book_id = ?`;

    db.pool.query(query, [title, description, genre, formattedPublicationDate, inventory_quantity, price, publisherId, bookId], function(error, result) {
        if (error) {
            console.error(error);
            return res.status(500).send('Failed to update book');
        }

        if (result.affectedRows === 0) {
            return res.status(404).send('Book not found');
        }

        // Redirect to the index page after successful update
        res.redirect('/');
    });
});


////////////////////////////////////////////////////////////////////////////////////////////////////
// UPDATE CUSTOMER 
app.get('/update-customer/:customerId', function(req, res) {
    const customerId = req.params.customerId;  // Get the customerId from the route parameter

    // Query to get the current customer details based on the customerId
    let query = `SELECT * FROM Customers WHERE customer_id = ?`;
    db.pool.query(query, [customerId], function(error, result) {
        if (error) {
            console.error(error);
            return res.status(500).send('Failed to retrieve customer details');
        }

        if (result.length === 0) {
            return res.status(404).send('Customer not found');
        }

        // Render the edit form with the customer data
        res.render('edit-customer-form', { customer: result[0] });
    });
});

// POST: UPDATE CUSTOMER
app.post('/update-customer/:customerId', function(req, res) {
    const customerId = req.params.customerId;

    // Destructuring to extract the form fields
    const { 
        'first_name': first_name, 
        'last_name': last_name, 
        'email': email, 
        'phone_number': phone_number, 
        'address': address
    } = req.body;

    // // Log the entire form data to inspect it
    // console.log("Form data received:", req.body);

    // Proceed with the update query
    let query = `UPDATE Customers 
                 SET first_name = ?, last_name = ?, email = ?, phone_number = ?, address = ? 
                 WHERE customer_id = ?`;

    db.pool.query(query, [first_name, last_name, email, phone_number, address, customerId], function(error, result) {
        if (error) {
            console.error(error);
            return res.status(500).send('Failed to update customer');
        }

        if (result.affectedRows === 0) {
            return res.status(404).send('Customer not found');
        }

        // Log the result of the update
        console.log("Rows affected:", result.affectedRows);

        // After updating the customer, redirect to the customer page
        res.redirect('/customers');
    });
});


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// GET: UPDATE BOOK ORDER
app.get('/update-book-order/:bookOrderId', function(req, res) {
    const bookOrderId = req.params.bookOrderId; 

    // Query to get the current book order details and include order_date from Orders table
    let bookOrderQuery = `
        SELECT 
            Books_Orders.book_order_id, 
            Books_Orders.order_id, 
            Books_Orders.book_id, 
            Books_Orders.quantity_ordered, 
            Books_Orders.price_at_sale, 
            Orders.order_date,   -- Get order_date from the Orders table
            Orders.customer_id   -- Get customer_id from the Orders table
        FROM Books_Orders
        JOIN Orders ON Books_Orders.order_id = Orders.order_id
        WHERE Books_Orders.book_order_id = ?
    `;

    // Query to fetch books for dropdown (book titles)
    let booksQuery = `SELECT book_id, title FROM Books`;

    // Query to fetch customers for dropdown (customer names)
    let customersQuery = `SELECT customer_id, CONCAT(first_name, ' ', last_name) AS full_name FROM Customers`;

    // Get book order details
    db.pool.query(bookOrderQuery, [bookOrderId], function(error, result) {
        if (error) {
            console.error(error);
            return res.status(500).send('Failed to retrieve book order details');
        }

        if (result.length === 0) {
            return res.status(404).send('Book order not found');
        }

        const bookOrder = result[0];

        // Format the order_date to 'YYYY-MM-DD'
        let orderDate = new Date(bookOrder.order_date);
        bookOrder.order_date = !isNaN(orderDate.getTime()) 
            ? orderDate.toISOString().split('T')[0] 
            : '';  // Ensuring the date format is 'YYYY-MM-DD'

        // Get books for dropdown
        db.pool.query(booksQuery, function(error, books) {
            if (error) {
                console.error(error);
                return res.status(500).send('Failed to retrieve books');
            }

            // Get customers for dropdown
            db.pool.query(customersQuery, function(error, customers) {
                if (error) {
                    console.error(error);
                    return res.status(500).send('Failed to retrieve customers');
                }

                // Get authors for this book
                let bookAuthorsQuery = `
                    SELECT CONCAT(Authors.first_name, ' ', Authors.last_name) AS full_name
                    FROM Books_Authors
                    JOIN Authors ON Books_Authors.author_id = Authors.author_id
                    WHERE Books_Authors.book_id = ?
                `;

                // Get authors for the selected book
                db.pool.query(bookAuthorsQuery, [bookOrder.book_id], function(error, authors) {
                    if (error) {
                        console.error(error);
                        return res.status(500).send('Failed to retrieve book authors');
                    }

                    // Convert authors to a mapped list
                    const authorNames = authors.map(author => author.full_name);

                    // Render the edit form with the book order data, books, customers, and authors
                    res.render('edit-order-form', {
                        bookOrder: bookOrder,
                        books: books,
                        customers: customers,
                        authors: authorNames
                    });
                });
            });
        });
    });
});


// POST: UPDATE BOOKS ORDERS

app.post('/update-book-order/:bookOrderId', function(req, res) {
    const bookOrderId = req.params.bookOrderId;

    // Destructuring to extract the form fields
    const { 
        'book_id': bookId, 
        'quantity_ordered': quantityOrdered, 
        'price_at_sale': priceAtSale, 
        'order_date': orderDate, 
        'customer_id': customerId 
    } = req.body;

    // Ensure orderDate is in the 'YYYY-MM-DD' format
    const formattedOrderDate = orderDate ? orderDate.split('T')[0] : null;

    // Check if the formatted order date is valid
    const validDate = new Date(formattedOrderDate);
    if (isNaN(validDate.getTime())) {
        console.error("Invalid orderDate:", formattedOrderDate);
        return res.status(400).send('Invalid order date format');
    }

    // Update the Books_Orders table (for book_id, quantity_ordered, and price_at_sale)
    let updateBookOrderQuery = `
        UPDATE Books_Orders 
        SET book_id = ?, quantity_ordered = ?, price_at_sale = ? 
        WHERE book_order_id = ?`;

    db.pool.query(updateBookOrderQuery, [bookId, quantityOrdered, priceAtSale, bookOrderId], function(error, result) {
        if (error) {
            console.error(error);
            return res.status(500).send('Failed to update book order');
        }

        if (result.affectedRows === 0) {
            console.error("No rows updated in Books_Orders table. This might be because the book_order_id is invalid.");
            return res.status(404).send('Book order not found');
        }

        // Recalculate the total amount for the order
        let totalAmountQuery = `
            SELECT SUM(quantity_ordered * price_at_sale) AS total_amount
            FROM Books_Orders
            WHERE order_id = (SELECT order_id FROM Books_Orders WHERE book_order_id = ?)`; 

        db.pool.query(totalAmountQuery, [bookOrderId], function(error, result) {
            if (error) {
                console.error(error);
                return res.status(500).send('Failed to recalculate total amount');
            }

            const totalAmount = result[0].total_amount;

            // Update the Orders table with the new total amount, order_date, and customer_id
            let updateOrderQuery = `
                UPDATE Orders
                SET total_amount = ?, order_date = ?, customer_id = ?
                WHERE order_id = (SELECT order_id FROM Books_Orders WHERE book_order_id = ?)`; 

            db.pool.query(updateOrderQuery, [totalAmount, formattedOrderDate, customerId, bookOrderId], function(error, result) {
                if (error) {
                    console.error(error);
                    return res.status(500).send('Failed to update order details in Orders');
                }

                // console.log("Successfully updated order date, total amount, and customer.");

                // Redirect to the orders page after successful update
                res.redirect('/orders');
            });
        });
    });
});

// GET EDIT AUTHOR
app.get('/update-author/:authorId', function(req, res) {
    const authorId = req.params.authorId;  

    // Query to get the current author details
    let query = `SELECT * FROM Authors WHERE author_id = ?`;

    db.pool.query(query, [authorId], function(error, result) {
        if (error) {
            console.error("Error fetching author details:", error);
            return res.status(500).send('Failed to retrieve author details');
        }

        if (result.length === 0) {
            return res.status(404).send('Author not found');
        }

        // Render the edit form with the author data
        res.render('edit-author-form', { author: result[0] });
    });
});

// POST Update Author
app.post('/update-author/:authorId', function(req, res) {
    const authorId = req.params.authorId;

    // Extract form data
    const { first_name, last_name } = req.body;

    // Update query
    let query = `UPDATE Authors SET first_name = ?, last_name = ? WHERE author_id = ?`;

    db.pool.query(query, [first_name, last_name, authorId], function(error, result) {
        if (error) {
            console.error("Error updating author:", error);
            return res.status(500).send('Failed to update author');
        }

        if (result.affectedRows === 0) {
            return res.status(404).send('Author not found');
        }

        // Redirect back to the main page after update
        res.redirect('/authors');
    });
});

// GET EDIT PUBLISHER 
app.get('/update-publisher/:publisherId', function(req, res) {
    let publisherId = req.params.publisherId;

    let query = `SELECT * FROM Publishers WHERE publisher_id = ?`;
    db.pool.query(query, [publisherId], function(error, result) {
        if (error) {
            console.error("Error fetching publisher:", error);
            return res.status(500).send("Failed to retrieve publisher details");
        }

        if (result.length === 0) {
            return res.status(404).send("Publisher not found");
        }

        res.render('edit-publisher-form', { publisher: result[0] });
    });
});

// POST UPDATE PUBLISHER
app.post('/update-publisher/:publisherId', function(req, res) {
    let publisherId = req.params.publisherId;
    let data = req.body;

    let query = `
        UPDATE Publishers 
        SET name = ?, address = ?, phone_number = ?, email = ?
        WHERE publisher_id = ?;
    `;

    db.pool.query(query, [data.name, data.address, data.phone_number, data.email, publisherId], function(error, result) {
        if (error) {
            console.error("Error updating publisher:", error);
            return res.status(500).send("Failed to update publisher");
        }

        res.redirect('/publishers');
    });
});


/*
    LISTENER
*/
app.listen(PORT, function(){            // This is the basic syntax for what is called the 'listener' which receives incoming requests on the specified PORT.
    console.log('Express started on http://localhost:' + PORT + '; press Ctrl-C to terminate.')
});

