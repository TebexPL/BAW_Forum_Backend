
import {isLoggedIn} from './middleware.js'
import {client} from './index.js'
import crypto from 'node:crypto';

export function hasSpecialChars(str){
 return /[^A-Za-z0-9]/g.test(str);
}

export const auth = (app) => {



  /*
    POST /api/register
    body:

    {
      login: login użytkownika - tylko litery i cyfry, string
      password: hasło, min 8 znaków, musi być coś oprócz liter i cyfr
    }

    Zwraca: 200 OK, 404 jakikolwiek błąd

  */
  app.post('/api/auth/register', async (req, res, next) => {
    try{
      const data = req.body;
      if(!data.login || !data.password)
        throw "no login or password";
      if(typeof(data.login)!= 'string' || typeof(data.password) != 'string')
        throw "login or password not a string";
      if(hasSpecialChars(data.login))
        throw "login special chars";

      const dbResponse = await client.query(`

      SELECT * FROM users WHERE name=$1

      `, [data.login]);

      if(dbResponse.rowCount !== 0)
          throw "already exists";

      if(!hasSpecialChars(data.password))
        throw "password to easy";
      if(data.password.length<8)
        throw "password too short";

      const salt = crypto.randomBytes(64).toString('hex');
      const hash = crypto.createHash('SHA3-512').update(data.password+salt).digest('hex');


      await client.query(`

      INSERT INTO users(name, password_hash, salt, roleid)
      VALUES ($1, $2, $3, (SELECT id FROM roles WHERE name = 'User'))

      `, [data.login, hash, salt]);

      res.status(200).send();

    }
    catch(ex){
      console.log(ex);
      res.status(404).send();
    }
  })


  /*
    POST /api/login
    body:

    {
      login: login użytkownika
      password: hasło użytkownika
    }


    Zwraca: 200 OK, 404 jakikolwiek błąd

    informacje o użytkowniku później można odczytać z /api/auth/whoami

  */

  app.post('/api/auth/login', async (req, res, next) => {
    try{
      if(req.sessionData.userid != null)
        throw "already logged in";

      const data = req.body;
      if(!data.login || !data.password)
        throw "no login or password";
      if(typeof(data.login)!= 'string' || typeof(data.password) != 'string')
        throw "login or password not a string";
      if(hasSpecialChars(data.login))
        throw "login special chars";

      const dbResponse = await client.query(`

      SELECT * FROM users WHERE name=$1

      `, [data.login]);

      if(dbResponse.rowCount !== 1)
        throw "not found";

      const userData = dbResponse.rows[0];

      const hash = crypto.createHash('SHA3-512')
                      .update(data.password+userData.salt).digest('hex')

      if(hash!==userData.password_hash)
        throw "wrong password";

      req.sessionData.userid = userData.id;

      await client.query(`

      UPDATE sessions set userid = $1 WHERE id=$2

      `, [req.sessionData.userid, req.sessionData.id]);

      res.status(200).send();

    }
    catch(ex){
      console.log(ex);
      res.status(404).send();
    }
  });



  /*
    POST /api/auth/logout

    Zwraca: 200 OK, 404 jakikolwiek błąd

  */
  app.post('/api/auth/logout',isLoggedIn, async (req, res, next) => {
    try{
      await client.query(`

      UPDATE sessions set userid = null WHERE id=$1

      `, [req.sessionData.id]);

      res.status(200).send();

    }
    catch(ex){
      console.log(ex);
      res.status(404).send();
    }
  });

  /*
    GET /api/auth/whoami

    Zwraca: 200 OK, 404 jakikolwiek błąd
    i dane: {
      username: nazwa użytkownika
      banned: czy użytkownik jest zbanowany
                (myślę że po zalogowaniu na zbanowanego użytkownika powinno mu wyświetlić
                  coś i uniemożliwić robienie czegokolwiek)
      rolename: rola użytkownika, np Admin
      user_control: czy może kontrolować innych użytkowników (banować itp)
      content_control: czy może kontrolować treści innych (usuwanie postów itp)

    }

  */
  app.get('/api/auth/whoami',isLoggedIn, async (req, res, next) => {
    try{
      const dbResponse = await client.query(`

      SELECT
        users.name as username,
        banned,
        roles.name as rolename,
        user_control,
        content_control
      FROM roles
      JOIN users on users.roleid=roles.id
      WHERE users.id=$1

      `, [req.sessionData.userid]);

      if(dbResponse.rowCount !== 1)
        throw "not found";

      const userData = dbResponse.rows[0];
      res.status(200).send(userData);

    }
    catch(ex){
      console.log(ex);
      res.status(404).send();
    }
  });


}
