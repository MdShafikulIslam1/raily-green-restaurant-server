const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;
// parser
app.use(cors());
app.use(express.json());

//middleware
const verifyToken = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).json({ error: true, message: "Unauthorized User" });
  }
  const token = authorization.split(" ")[1];
  jwt.verify(
    token,
    process.env.SECRETE_KEY_ACCESS_TOKEN,
    function (err, decoded) {
      if (err) {
        return res
          .status(403)
          .json({ error: true, message: "Unauthorized User" });
      }
      req.decoded = decoded;
    }
  );
  next();
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qg5qmf2.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const menuCollection = client
      .db("Raily-green-restaurant")
      .collection("menu");
    const cartCollection = client
      .db("Raily-green-restaurant")
      .collection("carts");
    const userCollection = client
      .db("Raily-green-restaurant")
      .collection("users");
    //create token
    app.post("/jwt", (req, res) => {
      const payload = req.body;
      const token = jwt.sign(payload, process.env.SECRETE_KEY_ACCESS_TOKEN, {
        expiresIn: "1h",
      });
      res.json({ token });
    });
    //verifyAdmin
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const isExistUser = await userCollection.findOne({ email });
      if (!isExistUser) {
        return res.status(401).send({ message: "Unauthorized User" });
      }
      if (isExistUser?.role !== "admin") {
        return res.status(403).send({ message: "Forbidden Access" });
      }
      next();
    };
    //get all user from userCollection
    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.json(result);
    });
    //save user name and email into database
    app.post("/users", async (req, res) => {
      const user = req.body;
      const isExistUser = await userCollection.findOne({ email: user?.email });
      if (isExistUser) {
        return res.json({
          message: "This user has already exist",
        });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });
    //
    app.get("/users/admin/:email", verifyToken, async (req, res) => {
      if (req.params.email !== req.decoded.email) {
        return res.send({ isAdmin: false });
      }
      const user = await userCollection.findOne({ email: req.params.email });
      const result = { admin: user?.role === "admin" };
      res.send(result);
    });
    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const result = await userCollection.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            role: "admin",
          },
        }
      );
      res.json(result);
    });
    app.delete("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const result = await userCollection.deleteOne({ _id: new ObjectId(id) });
      res.json(result);
    });
    //insert the cart data
    app.get("/carts", verifyToken, async (req, res) => {
      const email = req.query.email;
      if (!email) {
        return res.send([]);
      }
      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res
          .status(403)
          .json({ error: true, message: "Forbidden Access" });
      }
      const result = await cartCollection.find({ email: email }).toArray();
      res.send(result);
    });
    app.post("/carts", async (req, res) => {
      const item = req.body;
      const result = await cartCollection.insertOne(item);
      res.send(result);
    });
    app.delete("/carts/:id", async (req, res) => {
      const id = req.params.id;
      const result = await cartCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    //post  a menu item in to Db
    app.post("/menu", verifyToken, verifyAdmin, async (req, res) => {
      const result = await menuCollection.insertOne(req.body);
      console.log(result);
      res.send(result);
    });
    //delete a menu
    app.delete("/menu/:id", async (req, res) => {
      const result = await menuCollection.deleteOne({
        _id: new ObjectId(req.params.id),
      });
      res.send(result);
    });
    //all menu retrieve
    app.get("/menu", async (req, res) => {
      const result = await menuCollection.find().toArray();
      res.send(result);
    });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir);

//
app.get("/", (req, res) => {
  res.json("Raily Green is Sitting on browser");
});
app.listen(port, () => {
  console.log("Raily Green Restaurant is perfectly working.");
});
