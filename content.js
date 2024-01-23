


import {isLoggedIn} from './middleware.js'
import {client} from './index.js'
import {hasSpecialChars} from './auth.js'


//TODO CONTENT CONTROL

export const content = (app) => {



  app.get('/api/content/threads', async (req, res, next) => {
    try{
      const dbResponse = await client.query(`

      SELECT
        threads.id as id,
        threads.title as name,
        users.name as author,
        threads.created_on as created_on
      FROM threads
      JOIN users on threads.authorid=users.id

      `);
      res.status(200).send(dbResponse.rows);
    }
    catch(ex){
      console.log(ex);
      res.status(404).send();
    }
  });



  app.post('/api/content/threads/new', isLoggedIn, async (req, res, next) => {
    try{
      if(!req.body.title || typeof(req.body.title) != 'string' || !req.body.content || typeof(req.body.content) != 'string')
        throw "Invalid body while creating new thread";


	
      await client.query(`

      INSERT INTO threads(title, authorid)
      VALUES($1, $2)

      `,[req.body.title, req.sessionData.userid]);
      res.status(200).send();



      await client.query(`

      INSERT INTO messages(content, authorid, threadid)
      VALUES($1, $2, (SELECT id FROM threads WHERE title=$3))

      `,[req.body.content, req.sessionData.userid, req.body.title]);
      res.status(200).send();

    }
    catch(ex){
      console.log(ex);
      res.status(404).send();
    }
  });

  app.post('/api/content/threads/delete', isLoggedIn, async (req, res, next) => {
    try{
      if(!req.body.threadid)
        throw "Invalid body while deleting thread";

      const dbResponse = await client.query(`

      SELECT *
      FROM threads
      WHERE id=$1

      `, [req.body.threadid])

      if(dbResponse.rowCount<1)
        throw "Thread not found"
      if(dbResponse.rows[0].authorid != req.sessionData.userid)
        throw "Delete not triggered by author"

      await client.query(`

      DELETE FROM messages
      WHERE threadid=$1

      `,[req.body.threadid]);

      await client.query(`

      DELETE FROM threads
      WHERE id=$1

      `,[req.body.threadid]);
      res.status(200).send();

    }
    catch(ex){
      console.log(ex);
      res.status(404).send();
    }
  });


  app.get('/api/content/messages/:threadid', async (req, res, next) => {
    try{


      if(!req.params.threadid || typeof(req.params.threadid)!="string" || hasSpecialChars(req.params.threadid))
        throw "Invalid param while reading messages";

      const dbResponse = await client.query(`

      SELECT
        messages.id,
        messages.content,
        messages.created_on,
        users.name as author
      FROM messages
      JOIN users ON messages.authorid=users.id
      WHERE threadid=$1

      `, [req.params.threadid]);


      const userData = dbResponse.rows;
      res.status(200).send(userData);

    }
    catch(ex){
      console.log(ex);
      res.status(404).send();
    }
  });


  app.post('/api/content/messages/new', isLoggedIn, async (req, res, next) => {
    try{
      if(!req.body.content || !req.body.threadid || typeof(req.body.content) != 'string' )
        throw "Invalid body while creating new message";

      await client.query(`

      INSERT INTO messages(content, authorid, threadid)
      VALUES($1, $2, $3)

      `, [req.body.content, req.sessionData.userid, req.body.threadid]);
      res.status(200).send();

    }
    catch(ex){
      console.log(ex);
      res.status(404).send();
    }
  });


  app.post('/api/content/messages/delete', isLoggedIn, async (req, res, next) => {
    try{
      if(!req.body.messageid)
        throw "Invalid body while deleting message";

      const dbResponse = await client.query(`

      SELECT *
      FROM messages
      WHERE id=$1

      `, [req.body.messageid])

      if(dbResponse.rowCount<1)
        throw "Messgae not found"
      if(dbResponse.rows[0].authorid != req.sessionData.userid)
        throw "Delete not triggered by author"

      await client.query(`

      DELETE FROM messages
      WHERE id=$1

      `,[req.body.messageid]);

      res.status(200).send();

    }
    catch(ex){
      console.log(ex);
      res.status(404).send();
    }
  });




}
