# Book Store API

A E-commerce API for managing books, orders, and reviews with role-based access control.

## Setup Instructions
To get the project running, execute the following commands in order:
1. `npm install`
2. `npm run setup`
3. `npm run start`

## API Endpoints

### Authentication
* **POST /api/auth/register**: Register a new user with password complexity rules. Supports admin creation via secret key.
* **POST /api/auth/login**: Authenticate user and return a JWT Bearer token.

### Books
* **GET /api/books**: Public paginated list of books with filters (genre, author, price). Shows out-of-stock items for admins only.
* **GET /api/books/:id**: Public retrieval of full book details and ordered images.
* **POST /api/books**: [Admin] Create a new book record.
* **PATCH /api/books/:id**: [Admin] Update specific fields of an existing book.
* **DELETE /api/books/:id**: [Admin] Soft-delete a book (sets flag to 1).
* **POST /api/books/:id/images**: [Admin] Upload up to 5 images (JPEG/PNG/WebP) with binary content validation.
* **DELETE /api/books/:id/images/:imageId**: [Admin] Remove an image record and its physical file.

### Orders
* **POST /api/orders**: [Customer] Place an order with stock validation, book snapshots, and address handling.
* **GET /api/orders**: [Admin] View all orders placed in the system.
* **GET /api/orders/my**: [Customer] View personal order history.
* **GET /api/orders/:id**: [Auth] View specific order details (Owner or Admin only).
* **PATCH /api/orders/:id/status**: [Admin] Update order status (pending, confirmed, shipped, delivered).

### Reviews
* **GET /api/reviews**: [Admin] View all reviews across the platform.
* **POST /api/reviews/:bookId**: [Auth] Post a 1-5 star review. Enforces one review per book per user.
* **GET /api/reviews/:bookId**: Public list of all reviews for a specific book.
* **DELETE /api/reviews/:id**: [Auth] Delete own review, or any review if Admin.
