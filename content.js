


import {isLoggedIn} from './middleware.js'
import {client} from './index.js'
import {hasSpecialChars} from './auth.js'



//TODO MODIFY/DELETE by author

export const content = (app) => {

  /*


      GET /api/content/threads

      Zwraca: 200 OK, 404 jakikolwiek błąd
      ORAZ tablicę obiektów o wyglądzie:
      [
      {name: tytuł wątku, author: nazwa autora, created_on: timestamp utworzenia},
      {name: tytuł wątku, author: nazwa autora, created_on: timestamp utworzenia},
      {name: tytuł wątku, author: nazwa autora, created_on: timestamp utworzenia},
      {name: tytuł wątku, author: nazwa autora, created_on: timestamp utworzenia},
      {name: tytuł wątku, author: nazwa autora, created_on: timestamp utworzenia}

      ]

  */


  app.get('/api/content/threads', async (req, res, next) => {
    try{
      const dbResponse = await client.query(`

      SELECT
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

  /*


      POST /api/content/threads/new
      body: {
        title: nazwa wątku
      }


      Zwraca: 200 OK, 404 jakikolwiek błąd

  */


  app.post('/api/content/threads/new', isLoggedIn, async (req, res, next) => {
    try{
      if(!req.body.title || typeof(req.body.title) != 'string' || hasSpecialChars(req.body.title))
        throw "Invalid body while creating new thread";

      await client.query(`

      INSERT INTO threads(title, authorid)
      VALUES($1, $2)

      `,[req.body.title, req.sessionData.userid]);
      res.status(200).send();

    }
    catch(ex){
      console.log(ex);
      res.status(404).send();
    }
  });


  /*


      POST /api/content/messages/new
      body: {
        threadname: nazwa wątku do którego ma być dodana wiadomość
        content: treść wiadomości
      }


      Zwraca: 200 OK, 404 jakikolwiek błąd

  */

  app.post('/api/content/messages/new', isLoggedIn, async (req, res, next) => {
    try{
      if(!req.body.content || !req.body.threadname || typeof(req.body.content) != 'string'|| typeof(req.body.threadname) != 'string' || hasSpecialChars(req.body.threadname) || hasSpecialChars(req.body.content))
        throw "Invalid body while creating new message";

      await client.query(`

      INSERT INTO messages(content, authorid, threadid)
      VALUES($1, $2, (SELECT id FROM threads WHERE title=$3))

      `, [req.body.content, req.sessionData.userid, req.body.threadname]);
      res.status(200).send();

    }
    catch(ex){
      console.log(ex);
      res.status(404).send();
    }
  });

  /*


      Niestety tu post do pobierania bo trzeba podać z którego wątku
      POST /api/content/messages
      body: {
        threadname: nazwa wątku z którego mają być pobrane wiadomości
      }


      Zwraca: 200 OK, 404 jakikolwiek błąd
      ORAZ
      [
        {content: treść wiadomości, created_on: timestamp utworzenia, author: autor wiadomości}
        {content: treść wiadomości, created_on: timestamp utworzenia, author: autor wiadomości}
        {content: treść wiadomości, created_on: timestamp utworzenia, author: autor wiadomości}
        {content: treść wiadomości, created_on: timestamp utworzenia, author: autor wiadomości}
        {content: treść wiadomości, created_on: timestamp utworzenia, author: autor wiadomości}
      ]

  */

  app.post('/api/content/messages', async (req, res, next) => {
    try{

      if(!req.body.threadname || typeof(req.body.threadname)!="string" || hasSpecialChars(req.body.threadname))
        throw "Invalid body while reading messages";

      const dbResponse = await client.query(`

      SELECT
        messages.content,
        messages.created_on,
        users.name as author
      FROM messages
      JOIN users ON messages.authorid=users.id
      WHERE threadid=(SELECT id FROM threads where title=$1)

      `, [req.body.threadname]);


      const userData = dbResponse.rows;
      res.status(200).send(userData);

    }
    catch(ex){
      console.log(ex);
      res.status(404).send();
    }
  });



}
