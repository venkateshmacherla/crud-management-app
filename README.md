# Customer Management App

A full-stack web application for managing customers and their multiple addresses. Built with **React JS**, **Node.js (Express.js)**, and **SQLite**.

## Features

- **Customer CRUD**: Create, read, update, and delete customer records.
- **Multiple Addresses**: Add, edit, and delete multiple addresses per customer.
- **Search & Filter**: Filter customers by city, state, or pin code.
- **Pagination**: Navigate through customer lists with paging controls.
- **Responsive Design**: Works on desktop and mobile devices.
- **Validation**: Client-side and server-side validation for all forms.
- **Error Handling**: User-friendly error messages and server logging.
- **Mark "Only One Address"**: Indicates if a customer has only one address.
- **Test Cases**: Basic unit tests included.

## Tech Stack

- **Frontend**: React JS, React Router, Axios, CSS
- **Backend**: Node.js, Express.js
- **Database**: SQLite

## Getting Started

### Prerequisites

- Node.js (v16+ recommended)
- npm

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/customer-management-app.git
   cd customer-management-app
   ```

2. **Install dependencies**
   ```bash
   cd client
   npm install
   cd ../server
   npm install
   ```

3. **Start the backend server**
   ```bash
   cd server
   npm start
   ```
   The server runs on [http://localhost:5000](http://localhost:5000).

4. **Start the frontend**
   ```bash
   cd client
   npm start
   ```
   The app runs on [http://localhost:3000](http://localhost:3000).

## Usage

- **Add Customer**: Click "Add New Customer" and fill out the form.
- **Edit Customer**: Click "Edit" on a customer record.
- **Delete Customer**: Click "Delete" and confirm.
- **View Details**: Click "View" to see all customer info and addresses.
- **Search/Filter**: Use the filter bar to search by city, state, or pin code.
- **Pagination**: Use Previous/Next to navigate pages.

## Testing

Run unit tests in the client:
```bash
cd client
npm test
```

## Folder Structure

- `/client` - React frontend
- `/server` - Express backend and SQLite database

## API Endpoints

- `GET /api/customers` - List customers (with filters, pagination)
- `POST /api/customers` - Create customer
- `GET /api/customers/:id` - Get customer details
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer
- `GET /api/customers/:id/addresses` - Get customer addresses
- `POST /api/customers/:id/addresses` - Add address
- `PUT /api/addresses/:addressId` - Update address
- `DELETE /api/addresses/:addressId` - Delete address
