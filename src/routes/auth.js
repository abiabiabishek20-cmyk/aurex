const express=require('express');
const bcrypt=require('bcryptjs');
const jwt=require('jsonwebtoken');
const crypto=require('crypto');
const {findByEmail,createUser}=require('../auth/store');
const router=express.Router();
function signToken(user){return jwt.sign({sub:user.id,email:user.email},process.env.JWT_SECRET,{expiresIn:process.env.JWT_EXPIRES_IN||'1h'});}
router.post('/register',async(req,res)=>{
  const email=String(req.body.email||'').trim().toLowerCase();
  const password=String(req.body.password||'');
  if(!email||password.length<8)return res.status(400).json({error:'Valid email and password of at least 8 characters are required'});
  if(findByEmail(email))return res.status(409).json({error:'User already exists'});
  const passwordHash=await bcrypt.hash(password,12);
  const user=createUser({id:crypto.randomUUID(),email,passwordHash});
  res.status(201).json({user:{id:user.id,email:user.email},token:signToken(user)});
});
router.post('/login',async(req,res)=>{
  const email=String(req.body.email||'').trim().toLowerCase();
  const password=String(req.body.password||'');
  const user=findByEmail(email);
  if(!user||!(await bcrypt.compare(password,user.passwordHash)))return res.status(401).json({error:'Invalid email or password'});
  res.json({user:{id:user.id,email:user.email},token:signToken(user)});
});
module.exports=router;
