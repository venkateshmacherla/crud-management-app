import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

import './CustomerDetailPage.css';

function CustomerDetailPage() {
    const { id } = useParams();
    const [customer, setCustomer] = useState(null);
    const [addresses, setAddresses] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const fetchData = () => {
        axios.get(`http://localhost:5000/api/customers/${id}`)
            .then(res => {
                setCustomer(res.data.data.customer);
                setAddresses(res.data.data.addresses);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchData();
    }, [id]);

    const handleDeleteCustomer = () => {
        if (window.confirm('Are you sure you want to delete this customer?')) {
            axios.delete(`http://localhost:5000/api/customers/${id}`)
                .then(() => navigate('/customers'))
                .catch(err => alert('Deletion failed: ' + err.message));
        }
    };

    if (loading) return <div>Loading...</div>;
    if (!customer) return <div>Customer not found</div>;

    return (
        <div className="container">
            <h2>Customer Profile</h2>
            <p><strong>First Name:</strong> {customer.first_name}</p>
            <p><strong>Last Name:</strong> {customer.last_name}</p>
            <p><strong>Phone Number:</strong> {customer.phone_number}</p>

            <h3>Addresses</h3>
            {addresses.length === 0 && <p>No addresses found</p>}
            <ul>
                {addresses.map(a => (
                    <li key={a.id}>
                        {a.address_details}, {a.city}, {a.state}, {a.pin_code}
                        {' '}
                        <Link to={`/customers/edit/${id}`}>Edit</Link>
                    </li>
                ))}
            </ul>

            <div className="detail-actions">
                <button className="edit-btn" onClick={() => navigate(`/customers/edit/${id}`)}>
                    Edit Customer
                </button>
                <button className="delete-btn" onClick={handleDeleteCustomer}>
                    Delete Customer
                </button>
                <Link className="back-link" to="/customers">
                    Back to List
                </Link>
            </div>
        </div>
    );
}

export default CustomerDetailPage;
