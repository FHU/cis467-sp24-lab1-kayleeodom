const express = require("express");

const app = express();
const PORT = 3000;
const mysql = require("mysql2/promise");
const config = require("./config");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const pool = mysql.createPool(config.db);

app.listen(PORT, async () => {
  const host = process.env.HOSTNAME || "http://localhost";
  console.log(`Listening on ${host}:${PORT}`);
});

app.use((req, res, next) => {
  req.user = { id: 4, name: "Kenan" }
  next()
});

app.get("/", async (req, res) => {
  try {
    const conn = await pool.getConnection();
    console.log(req.user);
    const [users] = await conn.query("SELECT * FROM users");

    conn.release();
    //console.log(users)

    res.json(users);
  } catch (err) {
    res.json({ message: "error" });
    console.error(err);
  }
});

//      TAGS
// GET TAGS
app.get("/tags", async (req, res) => {
  try {
    const conn = await pool.getConnection();
    console.log(req.user);
    const [tags] = await conn.query("SELECT * FROM tags");

    conn.release();
    //console.log(users)

    res.json(tags);
  } catch (err) {
    res.json({ message: "error" });
    console.error(err);
  }
});

// GET TAGS ID
app.get("/tags/:id", async (req, res) => {
  try {
    const conn = await pool.getConnection();
    console.log(req.user);
    const [tags] = await conn.query(
      "SELECT * FROM tags WHERE tagID=" + req.params.id
    );

    conn.release();
    //console.log(users)

        if( tags.length > 0) {
            res.json(tags[0])
        }
        else {
            res.status(404).json({message: "Resource not found"})
        }

    }
    catch( err ) {
        res.status(500).json( {message: "error"})
        console.error(err)
    }
})

//create new user (POST TAGS)
app.post('/tags', async (req, res)=> {
    const {tagDescription} = req.body;
    try{
        const connection = await pool.getConnection();
        await connection.query("INSERT INTO TAGS (tagDescription) VALUES (?)", [tagDescription]);
        const newTag = await connection.query("SELECT * FROM tags WHERE tagDescription = ?", [tagDescription])
        connection.release();
        res.status(201).json();
    }
    catch(err){
        console.error('Error creating user:', err);
        res.status(500).send('Error creating user');
    }
})


//    PRAYERS 

// GET PRAYERS
app.get("/prayers", async (req, res) => {
    try {
      const conn = await pool.getConnection();
      console.log(req.user);
      const [tags] = await conn.query("SELECT * FROM tags");
  
      conn.release();
      //console.log(users)
  
      res.json(tags);
    } catch (err) {
      res.json({ message: "error" });
      console.error(err);
    }
});

// GET PRAYERS ID
app.get("/prayers/:id", async (req, res) => {
    try {
      const conn = await pool.getConnection();
      console.log(req.user);
      const [tags] = await conn.query(
        "SELECT * FROM tags WHERE tagID=" + req.params.id
      );
  
      conn.release();
      //console.log(users)
  
          if( tags.length > 0) {
              res.json(tags[0])
          }
          else {
              res.status(404).json({message: "Resource not found"})
          }
  
      }
      catch( err ) {
          res.status(500).json( {message: "error"})
          console.error(err)
      }
})

  
// POST PRAYERS
app.post('/prayers', async (req,res)=> {

})