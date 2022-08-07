const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const nodemailer = require("nodemailer");
const emailTransport = require('nodemailer-sendgrid-transport');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(express.json());
app.use(cors());


// Get JWT Token

const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'UnAuthorized Aceess' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).send({ message: 'Forbidden Access' });
        }
        req.decoded = decoded;
    })
    next();
}


const uri = "mongodb+srv://bankofbd:qWuk0tgacUUr0s8k@cluster0.kaegsaq.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


// send email 

const emailOptions = {
    auth: {
        api_key: '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'
    }
}
const emailClient = nodemailer.createTransport(emailTransport(emailOptions));
const sendEmail = (data) => {
    const { name, AccNo, balance, authemail, } = data;
    const emailTemplate = {
        from: 'mdmasudrony@gmail.com',
        to: authemail,
        subject: `Hello, ${name} your current Account Balance ${balance} `,
        text: `Your Withdraw complete!, your current Balance ${balance}`,
        html: `
        <div style="padding: 20px ;">
            <h1 class="font-size: 30px ;">Online <span style="color: green;">Bank BD</span></h1>
            <h2 style="color: green; margin:10px;">Hello!${name},</h2>
            <p style="font-size: 20px; margin:10px;">Your Money Transcation Complete!</p>
            <p style="margin:10px;">That's Your Money Transcation:${AccNo} <span style="text-decornation: underline">28ue98fhw4ywhir8w9e</span></p>
            <a href="" style="margin:10px 10px; padding: 5px 7px; border:2px solid green;border-radius: 7px; color: green; text-decoration: none; font-weight:600;">Go to More</a>
            <button style="background-color:green; padding:10px 25px; outline:none; border:0px; border-radius: 7px; color: white; letter-spacing: 1px; cursor: pointer;">Subscribe Now</button>
        </div>
        `
    };

    console.log("Email Sent");
    emailClient.sendMail(emailTemplate, function (err, info) {
        if (err) {
            console.log(err);
        }
        else {
            console.log("send email ", info);
        }
    })

}
///////



const run = async () => {
    try {

        await client.connect();

        const usersCollection = client.db("BankOfBD").collection("Users");
        const accountsCollection = client.db("BankOfBD").collection("accounts");
        const statementCollection = client.db("BankOfBD").collection("Transaction");
        const feedbackCollection = client.db("BankOfBD").collection("Feedback");
        const smebankingCollection = client.db("BankOfBD").collection("SmeBanking");




        // post user by email
        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;

            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user
            };
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1d' });
            res.send({ result, accessToken: token })
        })


        // get users
        app.get('/users', async (req, res) => {
            const query = {};
            const cursor = usersCollection.find(query);
            const users = await cursor.toArray();
            res.send(users)
        })


        // delete an user
        app.delete('/user/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await usersCollection.deleteOne(query);
            res.send(result)
        })


        // post admin by email
        app.put('/user/admin/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: { role: 'admin' }
            };
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            res.send(result);
        })


        // remove admin by email
        app.put('/user/admin/remove/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: { role: '' }
            };
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            res.send(result);
        })

        // get admin
        app.get('/user/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await usersCollection.findOne({ email: email });
            const isAdmin = user?.role === 'admin';
            res.send({ admin: isAdmin });
        })

        // Create an Account

        app.post('/account', async (req, res) => {
            const account = req.body;
            const result = await accountsCollection.insertOne(account);
            sendEmail(account);
            res.send(result);

        })

        // Deposit Balance and withdraw balance

        app.put("/account/:accountId", async (req, res) => {

            const id = req.params.accountId;
            const updateBalance = req.body;

            if (updateBalance.depositBalance < 0 || updateBalance.depositBalance === null) {
                return
            }
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updateAccountDoc = {
                $set: {
                    balance: updateBalance.depositBalance
                }
            };
            const result = await accountsCollection.updateOne(filter, updateAccountDoc, options);
            res.send(result);
        });

        // Send Money put api

        app.put("/accountno/:accountno", async (req, res) => {

            const accountno = parseInt(req.params.accountno);
            const addBalance = req.body;
            const filter = { AccNo: accountno };
            const options = { upsert: true };
            const updateAccountDoc = {
                $set: {
                    balance: addBalance.transferAmount
                }
            };
            const result = await accountsCollection.updateOne(filter, updateAccountDoc, options);
            res.send(result);
        });


        // Load Account by account number params

        app.get('/accounts', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const cursor = accountsCollection.find(query);
            const accounts = await cursor.toArray();
            res.send(accounts);
        })

        // Load statement by email

        app.get('/statements', async (req, res) => {

            const email = req.query.email;
            const query = { authemail: email };
            const cursor = statementCollection.find(query);
            const accounts = await cursor.toArray();
            res.send(accounts);


        })

        // get account by id- individual

        app.get('/account/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await accountsCollection.findOne(query);
            res.send(result);
        })


        // Load account - individual - My Accounts Route

        app.get('/accounts', async (req, res) => {

            const email = req.query.email;
            const accountno = parseInt(req.query.accountno);

            if (email) {

                const query = { email: email };
                const cursor = accountsCollection.find(query);
                const accounts = await cursor.toArray();
                res.send(accounts);
            }
            if (accountno) {

                const query = { AccNo: accountno };
                const cursor = accountsCollection.find(query);
                const accounts = await cursor.toArray();
                res.send(accounts);
            }

        })

        // Load account by account number


        app.get('/accountno', async (req, res) => {

            const accountno = parseInt(req.query.accountno);
            const query = { AccNo: accountno };
            const result = await accountsCollection.findOne(query);
            res.send(result);
        })

        // Load all accounts

        app.get('/allaccounts', async (req, res) => {
            const query = {};
            const cursor = accountsCollection.find(query);
            const accounts = await cursor.toArray();
            res.send(accounts);
        })

        // Delete Account         

        app.delete('/account/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await accountsCollection.deleteOne(query);
            res.send(result);
        })

        // Transfer money
        app.get('/account/:acno', async (req, res) => {
            const transferAcc = req.params.acno;
            const query = { AccNo: transferAcc };
            const result = await accountsCollection.findOne(query);
            res.send(result);
        })

        // Statement
        app.post('/statement', async (req, res) => {
            const transaction = req.body;
            const result = await statementCollection.insertOne(transaction);
            res.send(result);
        })


        // feedback post **

        app.post('/feedback', async (req, res) => {
            const feedback = req.body;
            const result = await feedbackCollection.insertOne(feedback);
            res.send(result);
        })

        // feedback get **

        app.get('/feedbacks', async (req, res) => {
            const query = {};
            const cursor = feedbackCollection.find(query);
            const feedback = await cursor.toArray();
            res.send(feedback)
        })

        // Delete api feedback **

        app.delete('/feedback/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await feedbackCollection.deleteOne(query);
            res.send(result);
        })

        //Sme Banking loan details

        app.get('/smebanking', async (req, res) => {
            const query = {};
            const cursor = smebankingCollection.find(query);
            const result = await cursor.toArray();
            res.send(result)
        })




    }
    finally {

    }
}

run().catch(console.dir);



app.get('/', (req, res) => {
    res.send("Bank of BD Server Running........");
});

app.listen(port, () => {
    console.log("Listen to Port", port);
});