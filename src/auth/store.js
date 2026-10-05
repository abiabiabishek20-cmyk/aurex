// Temporary in-memory store. Replace with a real database before production.
const users=new Map();
function findByEmail(email){return users.get(email.toLowerCase());}
function createUser(user){users.set(user.email.toLowerCase(),user);return user;}
module.exports={findByEmail,createUser};
