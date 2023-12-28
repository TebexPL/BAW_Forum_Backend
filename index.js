import 'dotenv/config';
import pg from 'pg';
import express from 'express';
import cookieParser from 'cookie-parser';
import expressSession from 'express-session';

const client = new pg.Client();
await client.connect();

const app = express();

const cookieManagement = (req, res, next) => {
  if(!req.cookies['session'])
      res.cookie("session", 'token', { expires: new Date(Date.now() + 900000), httpOnly: true });
  else{
    const id = req.cookies['session'];
    const userSession = client.query("SELECT * FROM sessions WHERE session = $1", [id]);



  }
  next();
}











app.use(cookieParser());

app.use(cookieManagement);

app.use(express.static('./public'));




app.listen(process.env.PORT);
