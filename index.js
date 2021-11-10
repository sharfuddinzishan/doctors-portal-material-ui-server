const { MongoClient } = require('mongodb');
const ObjectId = require('mongodb').ObjectId;
require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
var admin = require("firebase-admin");
// Middleware
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 4000;
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.x4ckn.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

// Firebase Admin 
var serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});


async function verifyToken(req, res, next) {
    console.log('Start Decoding')
    if (req.headers?.authorization?.startsWith('Bearer ')) {
        const idToken = req.headers.authorization.split('Bearer ')[1];
        try {
            const decodeUser = await admin.auth().verifyIdToken(idToken);
            req.decodedUserMail = decodeUser.email;
        }
        catch {

        }
    }
    next();
}

const herodoctors = async () => {
    try {
        await client.connect();
        const servicesCollection = client.db('herodoctors').collection('services');
        const appointmentCollection = client.db('herodoctors').collection('appointments');
        const usersCollection = client.db('herodoctors').collection('users');

        // Check Server is Ok or Not
        app.get('/', (req, res) => {
            res.send('Welcome Hero Doctor App');
        })

        // Add New User
        app.post('/users', async (req, res) => {
            const userInfo = req.body
            const result = await usersCollection.insertOne(userInfo);
            res.send(result);
        })

        // Check user is exist or not
        app.get('/user', async (req, res) => {
            const email = req.query.email
            const query = { email }
            const user = await usersCollection.findOne(query);
            res.send(user);
        })
        // Check user is admin or not
        app.get('/user/admin', async (req, res) => {
            const email = req.query.email
            let isAdmin = false
            const query = { email }
            const user = await usersCollection.findOne(query);
            if (user?.role === 'admin')
                isAdmin = true
            res.send(isAdmin);
        })

        // Get All Appointments 
        app.get('/appointments', async (req, res) => {
            const email = req.query.email
            const appointmentDate = new Date(req.query.appointDate).toLocaleDateString()
            const query = { email, appointmentDate }
            const appointments = appointmentCollection.find(query);
            const result = await appointments.toArray();
            res.send(result);
        })

        // Post New Appointment 
        app.post('/appointments', async (req, res) => {
            const getAppontments = req.body;
            const result = await appointmentCollection.insertOne(getAppontments);
            res.send(result);
        })

        //Make Admin
        app.put('/user/admin', verifyToken, async (req, res) => {
            const user = req.body
            const getDecodeEmail = req.decodedUserMail;
            if (getDecodeEmail) {
                const findUser = { email: getDecodeEmail }
                const getUser = await usersCollection.findOne(findUser);
                if (getUser?.role === 'admin') {
                    const filter = { email: user.email }
                    const updateDoc = {
                        $set: {
                            role: 'admin'
                        }
                    }
                    const result = await usersCollection.updateOne(filter, updateDoc)
                    res.send(result)
                }
                else {
                    res.send({ status: 401 })
                }
            }
            else {
                res.send({ status: 401 })
            }
        })

    }
    finally {
    }
}
herodoctors().catch(() => console.dir());
app.listen(PORT, () => console.log('Connect'));