import 'dotenv/config';
import pg from 'pg';
import express from 'express';
import cookieParser from 'cookie-parser';
import bodyParser from 'body-parser';
import {isLoggedIn, cookieManagement} from './middleware.js'
import {userControl} from './userControl.js'
import {contentControl} from './contentControl.js'
import {auth} from './auth.js'
import {content} from './content.js'


const types = pg.types;
types.setTypeParser(1114, function(stringValue) {
    return new Date(stringValue + "+0000");
});

export const client = new pg.Client();

await client.connect();

const app = express();

app.use(cookieParser());
app.use(cookieManagement);
app.use(bodyParser.json());

auth(app);
userControl(app);
contentControl(app);
content(app);

app.use(express.static('./public'));

app.listen(process.env.PORT);
