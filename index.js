const express = require("express");
const app = express();
const cors = require("cors");
const port = process.env.PORT || 5000;
var jwt = require("jsonwebtoken");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

app.use(cors());
app.use(express.json());

// jwt
function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).send({ Message: "Unauthorized access" });
  }
  const token = authHeader.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      res.status(401).send({ Message: "Forbidden access " });
    }
    req.decoded = decoded;
    console.log(decoded);
    next();
  });
}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.5nnavxn.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  try {
    const allServices = client.db("geniusCar").collection("allServices");
    const ordersCollection = client.db("geniusCar").collection("orders");

    app.post("/JWT", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });
    // get all services
    app.get("/services", async (req, res) => {
      // const query = { price: { $gt: 100 } };
      const search = req.query.search;
      let query = {};
      if (search.length) {
        query = {
          $text: { $search: search },
        };
      } else {
        query = {};
      }
      const order = req.query.order === "ascending" ? 1 : -1;
      const cursor = allServices.find(query).sort({ price: order });
      const result = await cursor.toArray();
      res.send(result);
    });
    // get single services
    app.get("/service/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const service = await allServices.findOne(query);
      res.send(service);
    });

    // get orders with email
    app.get("/orders", verifyJWT, async (req, res) => {
      const decoded = req.decoded;
      console.log(decoded.email);
      if (decoded.email !== req.query.email) {
        res.status(403).send({ Message: "Unauthorized access" });
      }
      let query = {};
      if (req.query.email) {
        query = {
          email: req.query.email,
        };
      }
      const cursor = ordersCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    // create order
    app.post("/orders", async (req, res) => {
      const order = req.body;
      const result = await ordersCollection.insertOne(order);
      res.send(result);
    });
    // order status update
    app.patch("/order/:id", async (req, res) => {
      const id = req.params.id;
      const status = req.body.status;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: status,
        },
      };
      const result = await ordersCollection.updateOne(query, updateDoc);
      res.send(result);
    });
    // order delete
    app.delete("/order/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await ordersCollection.deleteOne(query);
      res.send(result);
    });
  } finally {
    // await client.close();
  }
}

app.get("/", (req, res) => {
  res.send("genius car server running..");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
run().catch(console.dir);
