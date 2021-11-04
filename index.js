const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
require('dotenv').config();
var admin = require("firebase-admin");

const app = express();
const port = process.env.PORT || 5000;


// firebase admin initialization
var serviceAccount = require('./ema-john-lite-firebase-adminsdk-wpzku-38864a3e90.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});


// middle ware
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.0yaa9.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function veryfiedToken(req, res, next) {
    if (req.headers.authorization?.startsWith('Bearer')) {
        const idToken = req.headers.authorization.split('Bearer')[1];
        try {
            const decodeUser = await admin.auth().verifyIdToken(idToken);
            req.decodeUserEmail = decodeUser.email;
        }
        catch {

        }

    }
    next();
}

async function run() {
    try {
        await client.connect();
        const database = client.db('online_shop');
        const productsCollection = database.collection('products');
        const orderCollection = database.collection('orders');

        // GET Products API
        app.get('/products', async (req, res) => {
            // for query of link,
            // console.log(req.query);

            const cursor = productsCollection.find({});
            //  pagination purpose
            const page = req.query.page;
            const size = parseInt(req.query.size);
            let products;
            const count = await cursor.count();
            if (page) {
                products = await cursor.skip(page * size).limit(size).toArray();
            }
            else {
                products = await cursor.toArray();
            }

            res.send({
                count,
                products
            });
        })

        // use post to get data by keys
        app.post('/products/byKeys', async (req, res) => {
            const keys = req.body;
            // database er moddhe key field er moddhe keys jegulor moddhe ase segula select korbe like for in
            const query = { key: { $in: keys } }
            const products = await productsCollection.find(query).toArray();
            res.send(products);
        });

        // Add Orders API
        app.get('/orders', veryfiedToken, async (req, res) => {
            const email = req.query.email;
            if (req.decodeUserEmail === email) {
                query = { email: email };
                const cursor = orderCollection.find(query);
                const orders = await cursor.toArray();
                res.json(orders);
            }
            else {
                res.status(401).json({ message: 'User not authorized' })
            }



        });
        app.post('/orders', async (req, res) => {
            const order = req.body;
            order.createdAt = new Date();
            const result = await orderCollection.insertOne(order);
            res.json(result);
        })

    }
    finally {
        // await client.close();
    }
}
run().catch(console.dir)
app.get('/', (req, res) => {
    res.send('Ema john is running');
});

app.listen(port, () => {
    console.log('server running at port: ', port);
})