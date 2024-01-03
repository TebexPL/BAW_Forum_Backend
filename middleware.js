

import crypto from 'node:crypto';
import {client} from './index.js'



/*
  Generuje id którego jeszcze nie ma w bazie - unikatowe
*/
const getUniqueSid = async () => {
  let sid;
  do{
      sid = crypto.randomBytes(64).toString('hex');
  }
  while((await client.query(`

  SELECT * FROM sessions WHERE id = $1

  `, [sid])).rowCount > 0);
  return sid;
}


/*
  Przed każdą obsługą jakiegokolwiek endpointu


  Jeśli użytkownik (nieważne czy zalogowany czy nie) nie posiada cookie z ID
    To jest mu przypisywane ID/sesja w cookie i w bazie

  Jeśli sesja istnieje ale wygasła lub jest z nią problem
    Jest tworzona sesja od nowa

  Jeśli sesja jest już OK, dane z nią związane są przekazywamne do kolejnego etapu




  Do sesji przypisany jest zalogowany użytkownik, lub null.
  Kolejnych warstw nie interesuje już zarządzanie sesją, ciasteczkami itp




*/
export const cookieManagement = async (req, res, next) => {
    try{
      if(!req.cookies['sid'])
        throw "no session id";
      const id = req.cookies["sid"];
      const idHash = crypto.createHash('SHA3-512').update(id).digest('hex');
      const dbResponse = await client.query(`

      SELECT * FROM sessions
      WHERE id=$1`

      , [idHash]);
      if(dbResponse.rowCount !== 1)
        throw "session not found";
      const sessionData = dbResponse.rows[0];
      const timestampNow = new Date((new Date(Date.now())).toUTCString());
      const timestampExpiry = new Date(sessionData.expires.toUTCString());
      if(timestampExpiry < timestampNow)
        throw "session expired";
      const newExpiry = new Date(Date.now() + 1000*60*10);
      await client.query(`

      UPDATE sessions set expires = $1::timestamp
      WHERE id=$2

      `, [newExpiry.toUTCString(), idHash]);
      res.cookie("sid", id, { expires: newExpiry, httpOnly: true, sameSite: 'strict' });

      req.sessionData = sessionData;
    }
    catch(ex){
      try{
        const id = await getUniqueSid();
        const idHash = crypto.createHash('SHA3-512').update(id).digest('hex');
        const expiry = new Date(Date.now() + 1000*60*10);
        await client.query(`

        INSERT INTO sessions(id, userid, expires)
        VALUES($1, null, $2::timestamp)

        `, [idHash, expiry.toUTCString()]);
        res.cookie("sid", id, { expires: expiry, httpOnly: true, sameSite: 'strict' });
        const sessionData = {id: idHash, userid: null, expires: expiry};
        req.sessionData = sessionData;
      }
      catch(e){
        console.log(e)
        res.status(404).send();
        return;
      }
    }

  next();
}



/*
 Kolejny, opcjonalny middleware który odrzuca niezalogowanych użytkowników

*/

export const isLoggedIn = async (req, res, next) => {
  if(req.sessionData.userid == null)
    res.status(404).send();
  else
    next();
}

/*
Middleware sprawdzający czy użytkownik może kontrolować innych użytkowników (banować itp)

Odrzuca połączenie od nieautoryzowanych użytkowników


*/

export const hasUserControl = async (req, res, next) => {
  try{
    const dbResponse = await client.query(`

      SELECT roles.user_control
      FROM roles
      JOIN users ON roles.id=users.roleid
      WHERE users.id=$1

      `, [req.sessionData.userid]);

    if(dbResponse.rowCount !== 1)
      throw "not found";

    const data = dbResponse.rows[0];

    if(data.user_control == false)
      throw "not user admin"
    next();
  }
  catch(ex){
    console.log(ex)
    res.status(404).send();
  }
}


/*
Middleware sprawdzający czy użytkownik może kontrolować treści - usuwać itp

Odrzuca połączenie od nieautoryzowanych użytkowników
*/
export const hasContentControl = async (req, res, next) => {
  try{
    const dbResponse = await client.query(`

    SELECT roles.content_control
    FROM roles
    JOIN users ON roles.id=users.roleid
    WHERE users.id=$1

    `, [req.sessionData.userid]);

    if(dbResponse.rowCount !== 1)
      throw "not found";

    const data = dbResponse.rows[0];

    if(data.content_control == false)
      throw "not content admin"

    next();
  }
  catch(ex){
    console.log(ex)
    res.status(404).send();
  }
}
