
import {isLoggedIn, hasUserControl} from './middleware.js'
import {client} from './index.js'


export const userControl = (app) =>{


//TODO: blokada banowania samego siebie? Blokada banowania administratorów przez moderatorów?


/*



  GET /api/roles

  Zwraca: 200 OK, 404 jakikolwiek błąd
  ORAZ tablicę nazw ról np

  [
    "Admin",
    "User"
    ...
  ]


  middleware isLoggedIn oraz hasUserControl sprawiają że użytkownik musi być
  zalogowany i mieć odpowiednie uprawnienia żeby skorzystać z tego endpoint


*/

  app.get('/api/roles',isLoggedIn, hasUserControl, async (req, res, next) => {
    try{
      const dbResponse = await client.query(`

      SELECT name FROM roles

      `);

      const userData = dbResponse.rows.map(function(item) { return item["name"]; });
      res.status(200).send(userData);

    }
    catch(ex){
      console.log(ex);
      res.status(404).send();
    }
  });


  /*



    GET /api/users

    Zwraca: 200 OK, 404 jakikolwiek błąd
    ORAZ tablicę z informacjami o użytkownikach

    [
      {username: nazwa użytkownika, banned: czy jest zbanowany, rolename: nazwę jego roli, since: datę dołączenia},
      {username: nazwa użytkownika, banned: czy jest zbanowany, rolename: nazwę jego roli, since: datę dołączenia},
      {username: nazwa użytkownika, banned: czy jest zbanowany, rolename: nazwę jego roli, since: datę dołączenia},
      ...
    ]



    middleware isLoggedIn oraz hasUserControl sprawiają że użytkownik musi być
    zalogowany i mieć odpowiednie uprawnienia żeby skorzystać z tego endpoint


  */

  app.get('/api/users',isLoggedIn, hasUserControl, async (req, res, next) => {
    try{
      const dbResponse = await client.query(`

      SELECT
        users.name as username,
        users.banned,
        roles.name as rolename,
        users.since
      FROM roles
      JOIN users on users.roleid=roles.id

      `);

      const userData = dbResponse.rows;
      res.status(200).send(userData);

    }
    catch(ex){
      console.log(ex);
      res.status(404).send();
    }
  });


  /*



    POST /api/users/ban
    body:
    {
      username: nazwa użytkownika do zbanowania lub odbanowania
      state: true = ban, false = odbanowanie

    }


    Zwraca: 200 OK, 404 jakikolwiek błąd




    middleware isLoggedIn oraz hasUserControl sprawiają że użytkownik musi być
    zalogowany i mieć odpowiednie uprawnienia żeby skorzystać z tego endpoint


  */


  app.post('/api/users/ban',isLoggedIn, hasUserControl, async (req, res, next) => {
    try{
      if(!req.body.username || typeof(req.body.state)!=="boolean")
        throw "no data";
      await client.query(`

      UPDATE users SET banned=$1 WHERE name=$2

      `, [req.body.state, req.body.username]);

      res.status(200).send();

    }
    catch(ex){
      console.log(ex);
      res.status(404).send();
    }
  });


  /*
    POST /api/users/role
    body:
    {
      username: nazwa użytkownika do zmiany roli
      rolename: nazwa roli jaka ma być przypisana do użytkownika

    }


    Zwraca: 200 OK, 404 jakikolwiek błąd




    middleware isLoggedIn oraz hasUserControl sprawiają że użytkownik musi być
    zalogowany i mieć odpowiednie uprawnienia żeby skorzystać z tego endpoint


  */


  app.post('/api/users/role',isLoggedIn, hasUserControl, async (req, res, next) => {
    try{
      if(!req.body.username || !req.body.rolename)
        throw "no data";
      await client.query(`

      UPDATE users
      SET roleid=(SELECT id FROM roles WHERE name=$1)
      WHERE name=$2

      `, [req.body.rolename, req.body.username]);

      res.status(200).send();

    }
    catch(ex){
      console.log(ex);
      res.status(404).send();
    }
  });

}
