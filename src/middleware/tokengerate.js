const jwt=require('jsonwebtoken')
require('dotenv').config()

 const generateToken = (user) => {
  return jwt.sign({ id: user.id, role: user.role,username:user.username }, process.env.Secrete_KEY, {
    expiresIn: '8hrs',
  });
};

 const verifyTokenJWT = (token) => {
  return jwt.verify(token, process.env.Secrete_KEY);
};
module.exports={generateToken,verifyTokenJWT}
