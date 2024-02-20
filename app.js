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
  req.user = { id: 12, name: "Kaylee Odom" }
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

//      TAGS (DONE)
// GET TAGS - DONE
app.get("/api/v1/tags", async (req, res) => {
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

// GET TAGS ID - DONE
app.get("/api/v1/tags/:id", async (req, res) => {
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

// POST TAGS - create a new user - (can't get 303)
app.post("/api/v1/tags", async (req, res) => {
  const { tagDescription } = req.body;
  
  try {
    const connection = await pool.getConnection();

    // Check if the tag already exists
    const [existingTag] = await connection.query(
      "SELECT * FROM tags WHERE tagDescription = ?",
      [tagDescription]
    );

    if (existingTag.length > 0) {
      // Tag already exists, return 303 status code with the URI of the existing tag
      const existingTagURI = `/api/v1/tags/${existingTag[0].tagID}`;
      connection.release();
      res.status(303).location(existingTagURI).send();
    } else {
      // Tag doesn't exist, create a new tag
      await connection.query("INSERT INTO tags (tagDescription) VALUES (?)", [
        tagDescription,
      ]);

      // Retrieve the newly created tag
      const [newTag] = await connection.query(
        "SELECT * FROM tags WHERE tagDescription = ?",
        [tagDescription]
      );

      // Release the connection and return a 201 status code with the newly created tag
      connection.release();
      const newTagURI = `/api/v1/tags/${newTag[0].tagID}`;
      res.status(201).location(newTagURI).json(newTag[0]);
    }
  } catch (err) {
    console.error("Error creating tag:", err);
    res.status(500).send("Error creating tag");
  }
});

// app.post("/api/v1/tags", async (req, res) => {
//   const { tagDescription } = req.body;
//   try {
//     const connection = await pool.getConnection();
//     await connection.query("INSERT INTO tags (tagDescription) VALUES (?)", [
//       tagDescription,
//     ]);
//     const [newTag] = await connection.query(
//       "SELECT * FROM tags WHERE tagDescription=?",
//       [tagDescription]
//     );
//     connection.release();
//     res.status(201).json(newTag[0]);
//   } catch (err) {
//     console.error("Error creating user:", err);
//     res.status(500).send("Error creating user");
//   }
// });

// PUT TAGS - DONEs

app.put('/api/v1/tags/:id', async (req,res)=> {
  const {tagDescription} = req.body;
  const tagID = req.params.id;

  try{
    const connection = await pool.getConnection();
    const [existingTag] = await connection.query("SELECT * FROM tags WHERE tagID = ?", [tagID])

    if (existingTag.length === 0){
      // return a 404 if it isn't found
      connection.release();
      res.status(404).json({message: "ID Not Found"});
    }
    else{
      // on success return 200 and newly modified object in the body
      await connection.query("UPDATE tags SET tagDescription = ? WHERE tagID = ?", [tagDescription, tagID]);
      const [updatedTag] = await connection.query("SELECT * FROM tags WHERE tagID = ?", [tagID]);
      connection.release();
      res.status(200).json(updatedTag[0]);
    }
  }
  catch(err){
    console.error('Error updating tag:', err);
    res.status(500).send('Error updating tag');
  }
})

// DELETE TAGS - DONE
app.delete('/api/v1/tags/:id', async (req, res)=> {
  const tagID = req.params.id;

  try{
    const connection = await pool.getConnection();
    const [existingTag] = await connection.query("SELECT * FROM tags WHERE tagID = ?", [tagID]);
    
    if(existingTag.length === 0){
      // return a 404 if the ID doesn't exist
      connection.release();
      res.status(404).json({message: "Tag ID does not exist."});
    }
    else{
      // return a 204 if the resource is successfully deleted
      await connection.query("DELETE FROM tags WHERE tagID = ?", [tagID]);
      connection.release();
      res.status(204).send();
    }
  }
  catch(err){
    console.error('Error deleting tag:', err);
    res.status(500).send('Error deleting tag');
  }
})


//    PRAYERS 

// Reusable function to fetch detailed information about a prayer
async function getPrayerDetails(prayerID) {
  const query = `
    SELECT
      prayers.prayerID,
      prompt,
      body,
      coverImage,
      audioRecitation,
      aiCreator,
      CAST(CONCAT("[", GROUP_CONCAT(DISTINCT JSON_OBJECT("id", users.userID, "name", users.name)), "]") as JSON) as creators,
      CAST(CONCAT("[", GROUP_CONCAT(DISTINCT JSON_OBJECT("id", scriptures.scriptureID, "verse", scriptures.verses)), "]") as JSON) as scriptures,
      CAST(CONCAT("[", GROUP_CONCAT(DISTINCT JSON_OBJECT("id", tags.tagID, "description", tags.tagDescription)), "]") as JSON) as tags,
      (SELECT COUNT(userID) FROM likes WHERE likes.prayerID = prayers.prayerID) as likes,
      (SELECT COUNT(userID) FROM saves WHERE saves.prayerID = prayers.prayerID) as saves
    FROM prayers
      LEFT JOIN prayerscreators ON prayers.prayerID = prayerscreators.prayerID
      LEFT JOIN users ON prayerscreators.userID = users.userID
      LEFT JOIN prayersscriptures ON prayers.prayerID = prayersscriptures.prayerID
      LEFT JOIN scriptures ON prayersscriptures.scriptureID = scriptures.scriptureID
      LEFT JOIN prayerstags ON prayerstags.prayerID = prayers.prayerID
      LEFT JOIN tags ON prayerstags.tagID = tags.tagID
    WHERE prayers.prayerID = ?
    GROUP BY prayers.prayerID`;

  const [result] = await pool.query(query, [prayerID]);
  return result;
}

// GET PRAYERS - DONE
// return all prayers (in the format shown below)
app.get("/api/v1/prayers", async (req, res) => {
  try {
    const [prayers] = await pool.query("SELECT * FROM prayers");
    const detailedPrayers = await Promise.all(
      prayers.map(async (prayer) => await getPrayerDetails(prayer.prayerID))
    );
    res.json(detailedPrayers);
  } catch (err) {
    res.status(500).json({ message: "error" });
    console.error(err);
  }
});

// GET PRAYERS ID - DONE
  // return 1 prayer (in the format shown below)
  app.get("/api/v1/prayers/:id", async (req, res) => {
    try {
      const prayer = await getPrayerDetails(req.params.id);
      if(prayer){
        res.json(prayer);
      }
      else{
        res.status(404).json({message: "ID Not Found"})
      }
    }
    catch(err){
      res.status(500).json({message: "error"});
      console.error(err);
    }
})

// POST NEW PRAYER
app.post("/api/v1/prayers", async (req, res) => {
  try {
    const {
      prompt,
      body,
      coverImage,
      audioRecitation,
      aiCreator,
      //creators // an array of user IDs for creators
      //scriptures, // an array of scripture IDs
      //tags, // an array of tag IDs
    } = req.body;

    // Insert the new prayer into the 'prayers' table
    const insertPrayerQuery = `
      INSERT INTO prayers (prompt, body, coverImage, audioRecitation, aiCreator)
      VALUES (?, ?, ?, ?, ?)`;

    const [insertResult] = await pool.query(insertPrayerQuery, [
      prompt,
      body,
      coverImage,
      audioRecitation,
      aiCreator,
    ]);

    const newPrayerID = insertResult.insertId; 

    res.status(201).json({ message: "Prayer created successfully", prayerID: newPrayerID });
  } catch (err) {
    res.status(500).json({ message: "error" });
    console.error(err);
  }
});

// PUT PRAYERS - COME BACK
app.put('/api/v1/prayers/:id', async (req, res) => {
  const prayerID = req.params.id;

  try {
    const connection = await pool.getConnection();
    
    // Check if the prayer with the given ID exists
    const [existingPrayer] = await connection.query("SELECT * FROM prayers WHERE prayerID = ?", [prayerID]);

    if (existingPrayer.length === 0) {
      connection.release();
      res.status(404).json({ message: "ID Not Found" });
    } else {
      // Update the prayer with the new values from the request body
      const { prompt, body, coverImage, audioRecitation, aiCreator } = req.body;
      const updatePrayerQuery = `
        UPDATE prayers
        SET prompt = ?, body = ?, coverImage = ?, audioRecitation = ?, aiCreator = ?
        WHERE prayerID = ?`;

      await connection.query(updatePrayerQuery, [prompt, body, coverImage, audioRecitation, aiCreator, prayerID]);

      // Fetch the updated prayer
      const [updatedPrayer] = await connection.query("SELECT * FROM prayers WHERE prayerID = ?", [prayerID]);
      connection.release();
      
      res.status(200).json(updatedPrayer[0]);
    }
  } catch (err) {
    console.error('Error updating prayer:', err);
    res.status(500).send('Error updating prayer');
  }
});

// DELETE PRAYERS - DONE
app.delete('/api/v1/prayers/:id', async (req, res)=> {
  const prayerID = req.params.id;

  try{
    const connection = await pool.getConnection();
    const [existingPrayer] = await connection.query("SELECT * FROM prayers WHERE prayerID = ?", [prayerID]);

    if(existingPrayer.length === 0){
      // return a 404 if the ID doesn't exist
      connection.release();
      res.status(404).json({message: "ID Does Not Exist"});
    }
    else{
      await connection.query("DELETE FROM prayers WHERE prayerID = ?", [prayerID]);
      connection.release();
      // return a 204 if the resource is successfully deleted
      res.status(204).send()
    }
  }
  catch(err){
    console.error('Error deleting prayer:', err);
    res.status(500).send('Error deleting prayer')
  }
})

//     LIKES (DONE)

// GET LIKES - DONE
app.get('/api/v1/prayers/:id/likes', async(req, res)=> {
  // Get all likes of prayer with given id (for all users)
  const prayerId = req.params.id;

  try {
    const connection = await pool.getConnection();

    // Check if the prayer with the given ID exists
    const [existingPrayer] = await connection.query("SELECT * FROM prayers WHERE prayerID = ?", [prayerId]);

    if (existingPrayer.length === 0) {
      // Prayer not found, return 404 status code
      connection.release();
      res.status(404).json({ message: "Prayer not found" });
    } else {
      // Prayer found, get all likes for the prayer
      const [likes] = await connection.query("SELECT userID, prayerID, likedID FROM likes WHERE prayerID = ?", [prayerId]);

      connection.release();

      // Return the likes for the prayer
      res.json(likes);
    }
  } catch (err) {
    console.error('Error retrieving likes:', err);
    res.status(500).send('Error retrieving likes');
  }
})

// POST LIKES - DONE
// Like a prayer with given id (for current user)
app.post('/api/v1/prayers/:id/likes', async(req, res)=> {
  const prayerId = req.params.id;
  const userId = req.user.id; // Assuming req.user contains user information

  try {
    const connection = await pool.getConnection();

    // Check if the prayer with the given ID exists
    const [existingPrayer] = await connection.query("SELECT * FROM prayers WHERE prayerID = ?", [prayerId]);

    if (existingPrayer.length === 0) {
      // Prayer not found, return 404 status code
      connection.release();
      res.status(404).json({ message: "Prayer not found" });
    } else {
      // Check if the like already exists for the current user and prayer
      const [existingLike] = await connection.query("SELECT * FROM likes WHERE prayerID = ? AND userID = ?", [prayerId, userId]);

      if (existingLike.length > 0) {
        // Like already exists, return 409 status code
        connection.release();
        res.status(409).json({ message: "Like already exists" });
      } else {
        // Like doesn't exist, add the like for the current user and prayer
        await connection.query("INSERT INTO likes (prayerID, userID, likedTime) VALUES (?, ?, CURRENT_TIME)", [prayerId, userId]);

        connection.release();

        // Return a 201 status code indicating successful creation of the like
        res.status(201).send();
      }
    }
  } catch (err) {
    console.error('Error liking prayer:', err);
    res.status(500).send('Error liking prayer');
  }
})

// DELETE LIKES - DONE
// unlike a prayer with given id (for current user)
app.delete('/api/v1/prayers/:id/likes', async(req, res)=> {
  const prayerId = req.params.id;
  const userId = req.user.id; // Assuming req.user contains user information

  try {
    const connection = await pool.getConnection();

    // Check if the prayer with the given ID exists
    const [existingPrayer] = await connection.query("SELECT * FROM prayers WHERE prayerID = ?", [prayerId]);

    if (existingPrayer.length === 0) {
      // Prayer not found, return 404 status code
      connection.release();
      res.status(404).json({ message: "Prayer not found" });
    } else {
      // Check if the like exists for the current user and prayer
      const [existingLike] = await connection.query("SELECT * FROM likes WHERE prayerID = ? AND userID = ?", [prayerId, userId]);

      if (existingLike.length === 0) {
        // Like not found, return 404 status code
        connection.release();
        res.status(404).json({ message: "Like not found" });
      } else {
        // Like found, delete the like for the current user and prayer
        await connection.query("DELETE FROM likes WHERE prayerID = ? AND userID = ?", [prayerId, userId]);

        connection.release();

        // Return a 204 status code indicating successful deletion
        res.status(204).send();
      }
    }
  } catch (err) {
    console.error('Error unliking prayer:', err);
    res.status(500).send('Error unliking prayer');
  }
})


//     SAVES (DONE)

// GET SAVES - DONE
app.get('/api/v1/prayers/:id/saves', async(req, res)=> {
  // get all saves of prayer with given id (by all users)
  const prayerId = req.params.id;

  try {
    const connection = await pool.getConnection();

    // Check if the prayer with the given ID exists
    const [existingPrayer] = await connection.query("SELECT * FROM prayers WHERE prayerID = ?", [prayerId]);

    if (existingPrayer.length === 0) {
      // Prayer not found, return 404 status code
      connection.release();
      res.status(404).json({ message: "Prayer not found" });
    } else {
      // Prayer found, get all saves for the prayer
      const [saves] = await connection.query("SELECT savedID, prayerID, userID FROM saves WHERE prayerID = ?", [prayerId]);

      connection.release();

      // Return the saves for the prayer
      res.json(saves);
    }
  } catch (err) {
    console.error('Error retrieving saves:', err);
    res.status(500).send('Error retrieving saves');
  }
})

// POST SAVES  (save the prayer with given id (for current user)) - DONE
app.post('/api/v1/prayers/:id/saves', async(req, res)=> {
  const prayerId = req.params.id;
  const userId = req.user.id; // Assuming req.user contains user information

  try {
    const connection = await pool.getConnection();

    // Check if the prayer with the given ID exists
    const [existingPrayer] = await connection.query("SELECT * FROM prayers WHERE prayerID = ?", [prayerId]);

    if (existingPrayer.length === 0) {
      // Prayer not found, return 404 status code
      connection.release();
      res.status(404).json({ message: "Prayer ID Doesn't Exist" });
    } else {
      // Check if the save already exists for the current user and prayer
      const [existingSave] = await connection.query("SELECT * FROM saves WHERE prayerID = ? AND userID = ?", [prayerId, userId]);

      if (existingSave.length > 0) {
        // Save already exists, return 409 status code
        connection.release();
        res.status(409).json({ message: "Save already exists" });
      } else {
        // Save doesn't exist, add the save for the current user and prayer
        await connection.query("INSERT INTO saves (prayerID, userID, savedTime) VALUES (?, ?, CURRENT_TIMESTAMP)", [prayerId, userId]);

        connection.release();

        // Return a 201 status code indicating successful creation of the save
        res.status(201).send();
      }
    }
  } catch (err) {
    console.error('Error saving prayer:', err);
    res.status(500).send('Error saving prayer');
  }
})

// DELETE SAVES (unsave the prayer with given id (for current user)) - DONE
app.delete('/api/v1/prayers/:id/saves', async(req, res)=> {
  const prayerId = req.params.id;
  const userId = req.user.id; // Assuming req.user contains user information

  try {
    const connection = await pool.getConnection();

    // Check if the prayer with the given ID exists
    const [existingPrayer] = await connection.query("SELECT * FROM prayers WHERE prayerID = ?", [prayerId]);

    if (existingPrayer.length === 0) {
      // Prayer not found, return 404 status code
      connection.release();
      res.status(404).json({ message: "Prayer ID not found" });
    } else {
      // Check if the save exists for the current user and prayer
      const [existingSave] = await connection.query("SELECT * FROM saves WHERE prayerID = ? AND userID = ?", [prayerId, userId]);

      if (existingSave.length === 0) {
        // Save not found, return 404 status code
        connection.release();
        res.status(404).json({ message: "Save not found" });
      } else {
        // Save found, delete the save for the current user and prayer
        await connection.query("DELETE FROM saves WHERE prayerID = ? AND userID = ?", [prayerId, userId]);

        connection.release();

        // Return a 204 status code indicating successful deletion
        res.status(204).send();
      }
    }
  } catch (err) {
    console.error('Error unsaving prayer:', err);
    res.status(500).send('Error unsaving prayer');
  }
})