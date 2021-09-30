const mongoose = require('mongoose');
const User = mongoose.model('User');

module.exports = (userProps = {}) => {
    return new User(userProps).save();
};