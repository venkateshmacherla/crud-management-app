import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import './CustomerFormPage.css';

function CustomerFormPage() {
    const { id } = useParams();
    const isEdit = Boolean(id);
    const navigate = useNavigate();

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [addresses, setAddresses] = useState([
        { address_details: '', city: '', state: '', pin_code: '' },
    ]);
    const [errors, setErrors] = useState({});
    const [serverError, setServerError] = useState('');

    useEffect(() => {
        if (isEdit) {
            axios
                .get(`http://localhost:5000/api/customers/${id}`)
                .then(res => {
                    const c = res.data.data.customer;
                    const addrs = res.data.data.addresses;
                    setFirstName(c.first_name);
                    setLastName(c.last_name);
                    setPhoneNumber(c.phone_number);
                    setAddresses(
                        addrs.length
                            ? addrs
                            : [{ address_details: '', city: '', state: '', pin_code: '' }]
                    );
                })
                .catch(() => {
                    alert('Failed to load customer data');
                    navigate('/customers');
                });
        }
    }, [id, isEdit, navigate]);

    const validate = () => {
        const errs = {};
        if (!firstName.trim()) errs.firstName = 'First name is required';
        if (!lastName.trim()) errs.lastName = 'Last name is required';
        if (!phoneNumber.trim()) errs.phoneNumber = 'Phone number is required';
        addresses.forEach((addr, idx) => {
            if (!addr.address_details.trim())
                errs[`address_details_${idx}`] = 'Address is required';
            if (!addr.city.trim()) errs[`city_${idx}`] = 'City is required';
            if (!addr.state.trim()) errs[`state_${idx}`] = 'State is required';
            if (!addr.pin_code.trim()) errs[`pin_code_${idx}`] = 'Pin code is required';
        });
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleAddressChange = (index, field, value) => {
        const newAdrs = [...addresses];
        newAdrs[index][field] = value;
        setAddresses(newAdrs);
    };

    const addAddress = () => {
        setAddresses([
            ...addresses,
            { address_details: '', city: '', state: '', pin_code: '' },
        ]);
    };

    const removeAddress = index => {
        const newAdrs = addresses.filter((_, i) => i !== index);
        setAddresses(
            newAdrs.length
                ? newAdrs
                : [{ address_details: '', city: '', state: '', pin_code: '' }]
        );
    };

    const handleSubmit = async e => {
        e.preventDefault();
        setServerError('');
        if (!validate()) return;

        try {
            const payload = {
                first_name: firstName,
                last_name: lastName,
                phone_number: phoneNumber,
                addresses,
            };
            if (isEdit) {
                await axios.put(`http://localhost:5000/api/customers/${id}`, payload);
            } else {
                await axios.post('http://localhost:5000/api/customers', payload);
            }
            alert('Customer saved successfully!');
            navigate('/customers');
        } catch (err) {
            setServerError(err.response?.data?.error || 'Failed to save customer');
        }
    };

    return (
        <div className="container">

            <div className="header-container">
                <h2>{isEdit ? 'Edit Customer' : 'Add New Customer'}</h2>
                <button className="back-btn" type="button" onClick={() => navigate('/customers')}>
                    Back to List
                </button>
            </div>
            <form onSubmit={handleSubmit} noValidate>
                <div>
                    <label>First Name: <span style={{ color: 'red' }}>*</span></label>
                    <input
                        type="text"
                        value={firstName}
                        onChange={e => setFirstName(e.target.value)}
                    />
                    <div className="error-message">{errors.firstName}</div>
                </div>
                <div>
                    <label>Last Name: <span style={{ color: 'red' }}>*</span></label>
                    <input
                        type="text"
                        value={lastName}
                        onChange={e => setLastName(e.target.value)}
                    />
                    <div className="error-message">{errors.lastName}</div>
                </div>
                <div>
                    <label>Phone Number: <span style={{ color: 'red' }}>*</span></label>
                    <input
                        type="text"
                        value={phoneNumber}
                        maxLength={10} // restricts typing beyond 10 characters
                        onChange={e => {
                            const value = e.target.value;
                            // Allow only numbers
                            if (/^\d*$/.test(value)) {
                                setPhoneNumber(value);
                            }
                        }}
                    />
                    <div className="error-message">{errors.phoneNumber}</div>
                </div>

                <h3>Addresses</h3>
                {addresses.map((addr, idx) => (
                    <div key={idx} className="address-box">
                        {/* Address Details on its own row */}
                        <div className="address-details">
                            <label>
                                Address Details: <span style={{ color: 'red' }}>*</span>
                            </label>
                            <textarea
                                value={addr.address_details}
                                onChange={e =>
                                    handleAddressChange(idx, "address_details", e.target.value)
                                }
                            />
                            <div className="error-message">{errors[`address_details_${idx}`]}</div>
                        </div>

                        {/* City, State, Pin, Remove */}
                        <div className="address-row">
                            <div className="address-field">
                                <label>
                                    City: <span style={{ color: 'red' }}>*</span>
                                </label>
                                <input
                                    type="text"
                                    value={addr.city}
                                    onChange={e => handleAddressChange(idx, "city", e.target.value)}
                                />
                                <div className="error-message">{errors[`city_${idx}`]}</div>
                            </div>

                            <div className="address-field">
                                <label>
                                    State: <span style={{ color: 'red' }}>*</span>
                                </label>
                                <input
                                    type="text"
                                    value={addr.state}
                                    onChange={e => handleAddressChange(idx, "state", e.target.value)}
                                />
                                <div className="error-message">{errors[`state_${idx}`]}</div>
                            </div>

                            <div className="address-field">
                                <label>
                                    Pin Code: <span style={{ color: 'red' }}>*</span>
                                </label>
                                <input
                                    type="text"
                                    value={addr.pin_code}
                                    onChange={e => handleAddressChange(idx, "pin_code", e.target.value)}
                                />
                                <div className="error-message">{errors[`pin_code_${idx}`]}</div>
                            </div>

                            <button
                                type="button"
                                className="remove-address-btn"
                                onClick={() => removeAddress(idx)}
                            >
                                Remove Address
                            </button>
                        </div>
                    </div>
                ))}


                <button className="add-button" type="button" onClick={addAddress}>
                    Add Address
                </button>

                {serverError && <div className="error-message">{serverError}</div>}
                <button className="create-btn" type="submit">{isEdit ? 'Update Customer' : 'Create Customer'}</button>

            </form>
        </div>
    );
}

export default CustomerFormPage;
