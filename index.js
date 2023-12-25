import 'dotenv/config';
import pg from 'pg';
import express from 'express';
import cookieSession from 'cookie-session';
import expressSession from 'express-session';

const client = new pg.Client();

const app = express();

app.use(express.static('./public'));


app.listen(process.env.PORT);
