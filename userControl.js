
import {isLoggedIn, hasUserControl} from './middleware.js'
import {client} from './index.js'


export const userControl = (app) =>{


//TODO: blokada banowania samego siebie? Blokada banowania administratorów przez moderatorów?



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
