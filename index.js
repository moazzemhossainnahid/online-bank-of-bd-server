const { MongoClient, ServerApiVersion } = require('mongodb');
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const nodemailer = require("nodemailer");
const  emailTransport = require('nodemailer-sendgrid-transport');
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

const  emailOptions = {
    auth: {
      api_key: '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'
    }
  }
const  emailClient = nodemailer.createTransport(emailTransport(emailOptions));
const sendEmail=(data)=>{
    const { name, AccNo, balance,  phone, }=data
    const  emailTemplate = {
        from: 'mdmasudrony@gmail.com',
        to: 'hunnimoefbunnief@gmail.com',
        subject: `Hello, ${name} your current Account Balance ${balance} `,
        text: `Your Withdraw complete!, your current Balance ${balance}`,
        html: `
        <div style="padding: 20px ;">
            <h1 class="font-size: 30px ;">Online <span style="color: green;">Bank BD</span></h1>
            <h2 style="color: green; margin:10px;">Hello!${name},</h2>
            <p style="font-size: 20px; margin:10px;">Your Money Transcation Complete!</p>
            <p style="margin:10px;">That's Your Money Transcation:${AccNo} <span style="text-decoration: underline">28ue98fhw4ywhir8w9e</span></p>
            <a href="" style="margin:10px 10px; padding: 5px 7px; border:2px solid green;border-radius: 7px; color: green; text-decoration: none; font-weight:600;">Go to More</a>
            <button style="background-color:green; padding:10px 25px; outline:none; border:0px; border-radius: 7px; color: white; letter-spacing: 1px; cursor: pointer;">Subscribe Now</button>

        </div>
        `
      };
      emailClient.sendMail(emailTemplate, function(err, info){
        if (err ){
          console.log(err);
        }
        else {
          console.log("send email ",info);
        }
    })

}
///////


const run = async() => {
    try{

        await client.connect();
        
        const usersCollection = client.db("BankOfBD").collection("Users");
        const accountCollection = client.db("BankOfBD").collection("accounts");


        

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
            const options = {upsert: true};
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
            const options = {upsert: true};
            const updateDoc = {
                $set: { role: '' }
            };
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            res.send(result);
        })

        // get admin
        app.get('/user/admin/:email', async(req, res) => {
            const email = req.params.email;
            const user = await usersCollection.findOne({email: email});
            const isAdmin = user.role === 'admin';
            res.send({admin: isAdmin});
        })

        // Create an Account
         
         app.post('/account', async (req, res) => {
            const order = req.body;
            const result = await accountCollection.insertOne(order);
            res.send(result);
        })

    }
    finally{

    }
}

run().catch(console.dir);

app.post("/email",(req,res)=>{
    const moneyTranscation = req.body;
    sendEmail(moneyTranscation)
    console.log(moneyTranscation);
    res.send({message: true})
})

app.get('/', (req, res) => {
    res.send("Running React Bank of BD Server");
});

app.listen(port, () => {
    console.log("Listen to Port", port);
});