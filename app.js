const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const databasePath = path.join(__dirname, "twitterClone.db");

const app = express();

app.use(express.json());

let database = null;

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () =>
      console.log("Server Running at http://localhost:3000/")
    );
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const validatePassword = (password) => {
  return password.length > 6;
};

function authenticateToken(request, response, next) {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        console.log(payload);
        //passing the username to the next methods
        request.username = payload.username;
        next();
      }
    });
  }
}

app.post("/register/", async (request, response) => {
  const { username, password, name, gender } = request.body;
  const hashedPassword = await bcrypt.hash(request.body.password, 10);
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const dbUser = await database.get(selectUserQuery);
  if (dbUser === undefined) {
    const createUserQuery = `
        INSERT INTO
          user (username, password, name, gender)
        VALUES
        ('${username}',
        '${hashedPassword}',
        '${name}',
        '${gender}');`;
    if (validatePassword(password)) {
      await database.run(createUserQuery);
      response.send("User created successfully");
    } else {
      response.status(400);
      response.send("Password is too short");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const databaseUser = await database.get(selectUserQuery);
  if (databaseUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(
      password,
      databaseUser.password
    );
    if (isPasswordMatched === true) {
      const payload = {
        username: username,
      };
      const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

app.get("/user/tweets/feed/", authenticateToken, async (request, response) => {
  const getLatestTweetsQuery = `
    SELECT
      user.username, tweet.tweet, user.date_time AS dateTime
    FROM
      user 
    NATURAL JOIN tweet
    ORDER BY dateTime
    LIMIT 4;`;
  const tweetsArray = await database.all(getLatestTweetsQuery);
  response.send(tweetsArray);
});
app.get("/user/following/", authenticateToken, async (request, response) => {
  const getAllNamesQuery = `SELECT user.username AS name
    FROM user JOIN follower ON user.user_id = follower.following_user_id;`;
  const getNamesArray = await database.all(getAllNamesQuery);
  response.send(getNamesArray);
});

app.get("/user/followers/", authenticateToken, async (request, response) => {
  const getNamesQuery = `SELECT user.username AS name
    FROM user JOIN follower ON user.user_id = follower.follower_user_id;`;
  const getNamesArray = await database.all(getNamesQuery);
  response.send(getNamesArray);
});

app.get("/tweets/:tweetId", authenticateToken, async (request, response) => {
  const { tweetId } = request.params;
  if (tweet.user_id !== follower.following_user_id) {
    response.status(401);
    response.send("Invalid Request");
  } else {
    const getUserTweetsQuery = `SELECT tweet,like.count(like_id) AS likes, reply.count(reply_id) AS replies, like.date_time as dateTime
    FROM tweet JOIN reply on tweet.tweet_id = reply.tweet_id
    JOIN like on tweet.tweet_id = like.tweet_id; WHERE tweet.tweet_id = ${tweetId};`;
  }
  const tweetRequest = await database.all(getUserTweetsQuery);
  response.send(tweetRequest);
});
app.get("/user/tweets/", authenticateToken, async (request, response) => {
  const getAllTweets = `SELECT tweet,like.count(like_id) AS likes, reply.count(reply_id) AS replies, like.date_time as dateTime
    FROM tweet JOIN reply on tweet.tweet_id = reply.tweet_id
    JOIN like on tweet.tweet_id = like.tweet_id;`;
  const getTweetsArray = await database.all(getAllTweets);
  response.send(getTweetsArray);
});

app.post("/user/tweets/", authenticateToken, async (request, response) => {
  const { tweet } = request.body;
  const postTweetQuery = `INSERT INTO tweet (tweet) VALUES ('${tweet}');`;
  await database.run(postTweetQuery);
  response.send("Created a Tweet");
});

app.delete(
  "/tweets/:tweetId/",
  authenticateToken,
  async (request, response) => {
    const { tweetId } = request.params;
    const deleteTweetQuery = "";
    if (user.user_id !== tweet.user_id) {
      response.status(401);
      response.send("Invalid Request");
    } else {
      deleteTweetQuery = `
            DELETE FROM
                tweet
            WHERE
                tweet_id = ${tweetId} 
            `;
    }
    await database.run(deleteTweetQuery);
    response.send("Tweet Removed");
  }
);

module.exports = app;
