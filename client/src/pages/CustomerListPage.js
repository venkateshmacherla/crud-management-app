import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import './CustomerListPage.css';


function CustomerListPage() {
    const [customers, setCustomers] = useState([]);
    const [searchParams, setSearchParams] = useSearchParams();
    const [pagination, setPagination] = useState({});
    const navigate = useNavigate();

    // Filter state
    const [city, setCity] = useState(searchParams.get('city') || '');
    const [stateFilter, setStateFilter] = useState(searchParams.get('state') || '');
    const [pinCode, setPinCode] = useState(searchParams.get('pin_code') || '');
    const [page, setPage] = useState(Number(searchParams.get('page')) || 1);

    // Fetch customers with query params
    useEffect(() => {
        const params = {
            city: city || undefined,
            state: stateFilter || undefined,
            pin_code: pinCode || undefined,
            page,
            limit: 5,
            sortField: 'id',
            sortOrder: 'ASC',
        };
        axios.get('http://localhost:5000/api/customers', { params })
            .then(res => {
                setCustomers(res.data.data);
                setPagination(res.data.pagination);
            })
            .catch(err => {
                console.error('Error', err);
            });
    }, [city, stateFilter, pinCode, page]);

    const handleClearFilters = () => {
        setCity('');
        setStateFilter('');
        setPinCode('');
        setPage(1);
        setSearchParams({});
    };

    const applyFilters = () => {
        const params = {};
        if (city) params.city = city;
        if (stateFilter) params.state = stateFilter;
        if (pinCode) params.pin_code = pinCode;
        params.page = page;
        setSearchParams(params);
    };

    useEffect(() => {
        applyFilters();
    }, [city, stateFilter, pinCode, page]);

    return (
        <div className="container">
            <h1>Customer List</h1>
            <Link to="/customers/new" className="create-btn">Add New Customer</Link>

            <div className="filter-bar">
                <input
                    placeholder="Filter by City"
                    value={city}
                    onChange={e => setCity(e.target.value)}
                />
                <input
                    placeholder="Filter by State"
                    value={stateFilter}
                    onChange={e => setStateFilter(e.target.value)}
                />
                <input
                    placeholder="Filter by Pin Code"
                    value={pinCode}
                    onChange={e => setPinCode(e.target.value)}
                />
                <button onClick={() => { setPage(1); applyFilters(); }}>Search</button>
                <button onClick={handleClearFilters}>Clear Filters</button>
            </div>

            <table className="customer-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>First Name</th>
                        <th>Last Name</th>
                        <th>Phone</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {customers.length === 0 && (
                        <tr>
                            <td colSpan="5">No customers found.</td>
                        </tr>
                    )}
                    {customers.map(c => (
                        <tr key={c.id}>
                            <td data-label="ID">{c.id}</td>
                            <td data-label="First Name">{c.first_name}</td>
                            <td data-label="Last Name">{c.last_name}</td>
                            <td data-label="Phone">{c.phone_number}</td>
                            <td className="actions" data-label="Actions">
                                <button onClick={() => navigate(`/customers/${c.id}`)}>View</button>
                                <button onClick={() => navigate(`/customers/edit/${c.id}`)}>Edit</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="pagination-bar">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>
                    Previous
                </button>
                <span>{pagination.page} / {pagination.pages}</span>
                <button onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} disabled={page >= pagination.pages}>
                    Next
                </button>
            </div>
        </div>
    );

}

export default CustomerListPage;
