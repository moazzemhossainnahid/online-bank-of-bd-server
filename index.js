const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const nodemailer = require("nodemailer");
const emailTransport = require('nodemailer-sendgrid-transport');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
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





const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.kaegsaq.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


// send email 

// const api = process.env.EMAIL_SENDER_KEY
// console.log(api)

const emailOptions = {
    auth: {
        api_key: process.env.EMAIL_SENDER_KEY
    }
}
const emailClient = nodemailer.createTransport(emailTransport(emailOptions));
const sendEmail = (data) => {
    // console.log(data)
    const { _id, senderAccount, statement, deposit, withdraw, date, balance, email } = data;
    const emailTemplate = {
        from: 'sabbirshuvo006@gmail.com',
        to: email,
        subject: `Hello Dear, Your Account ${senderAccount} Have ${statement} `,
        text: `Your current Balance ${balance}`,
        html: `
        <div style="padding: 20px ;">
            <h1 class="font-size: 30px ;">Online <span style="color: green;">Bank BD</span></h1>
            <h2 style="color: green; margin:10px;">Hello Dare!</h2>
            <p style="font-size: 20px; margin:10px;">Your ${statement} Transaction Completed in ${date}</p>
            <p style="margin:10px;">That's Your Money Transaction Amount: <strong>${deposit || withdraw} $USD.</strong>. <span style="text-decornation: underline">${_id}</span></p>
            <a href="http://localhost:3000/dashboard/statement" style="margin:10px 10px; padding: 5px 7px; border:2px solid green;border-radius: 7px; color: green; text-decoration: none; font-weight:600;">Go to More</a>
            <button style="background-color:green; padding:10px 25px; outline:none; border:0px; border-radius: 7px; color: white; letter-spacing: 1px; cursor: pointer;">Subscribe Now</button>
        </div>
        `
    };
    // console.log("Email Sent");
    emailClient.sendMail(emailTemplate, function (err, info) {
        if (err) {
            // console.log(err);
        }
        else {
            // console.log("send email ", info);
        }
    })
}
///////



const verifyAdmin = async (req, res, next) => {
    const requester = req.decoded.email;
    const requesterAccount = await usersCollection.findOne({ email: requester });
    if (requesterAccount.role === 'admin') {
        next();
    }
    else {
        res.status(403).send({ message: 'forbidden' });
    }
}


const run = async () => {
    try {

        await client.connect();

        const usersCollection = client.db("BankOfBD").collection("Users");
        const accountsCollection = client.db("BankOfBD").collection("accounts");
        const statementCollection = client.db("BankOfBD").collection("Transaction");
        const feedbackCollection = client.db("BankOfBD").collection("Feedback");
        const smebankingCollection = client.db("BankOfBD").collection("SmeBanking");
        const retailbankingCollection = client.db("BankOfBD").collection("RetailBanking");
        const blogsCollection = client.db("BankOfBD").collection("blogs");
        const profilesCollection = client.db("BankOfBD").collection("Profiles");
        const contactCollection = client.db("BankOfBD").collection("contact")
        const noticeCollection = client.db("BankNotice").collection("notice")
        const smeapplyloanCollection = client.db("BankLoan").collection("smeapplyloan")
        const loanCollection = client.db("BankOfBD").collection("loan");




        // deposti card payment intent api 

        app.post("/create-payment-intent", async (req, res) => {
            const { inputBalance } = req.body;
            const amount = inputBalance * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: "usd",
                payment_method_types: ["card"]
            });
            res.send({ clientSecret: paymentIntent.client_secret });
        })

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
            res.send({ result, accessToken: token });
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
        //get admin api 
        app.get("/user/isAdmin/:email", async (req, res) => {
            const email = req.params.email;
            const query = { email: email }
            const adminUser = await usersCollection.findOne(query);
            const isAdmin = adminUser.role === "admin"
            res.send({ role: isAdmin })
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


        // Create an Bank Account
        app.post('/account', async (req, res) => {
            const account = req.body;
            const result = await accountsCollection.insertOne(account);
            // sendEmail(account);
            // console.log(account)
            res.send(result);
        })

        // Approve Account
        app.put('/acc/:accountno', async (req, res) => {
            const accountno = parseInt(req.params.accountno);
            const filter = { AccNo: accountno };
            const options = { upsert: true };
            const updateAccountDoc = {
                $set: {
                    role: 'approved'
                }
            };
            const result = await accountsCollection.updateOne(filter, updateAccountDoc, options);
            res.send(result);
        })


        // Deposit Balance and withdraw balance

        app.put("/account/:accountId", async (req, res) => {

            const id = req.params.accountId;
            const updateBalance = req.body;
            console.log(updateBalance)
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

        // Main Account Deposit Balance and withdraw balance

        app.put("/mainaccount/:id", async (req, res) => {

            const id = req.params.id;
            const updateBal = req.body;
            // console.log(updateBal.bal);
            const filter = { _id: ObjectId(id) };;
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    balance: updateBal.bal
                }
            };
            // console.log(updateDoc);
            const result = await accountsCollection.updateOne(filter, updateDoc, options);
            res.send(result);
        });

        //  post blogs api data
        app.post("/blog", async (req, res) => {
            const blog = req.body;
            // console.log(blog);
            const blogPost = await blogsCollection.insertOne(blog);
            res.send(blogPost)
        })

        // get blogs data api 
        app.get("/blogs", async (req, res) => {
            const query = {}
            const blogs = await blogsCollection.find(query).toArray();
            res.send(blogs)
        })

        // get blog api data 
        app.get("/blog/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const blog = await blogsCollection.findOne(query);
            res.send(blog)
        })

        // update blog API 
        
        app.put("/blog/:id", async (req, res) => {
            const id = req.params.id;
            const blog = req.body;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            // console.log(blog);
            const updateDoc = {
                $set: {
                    title: blog.title,
                    category: blog.category,
                    description: blog.description,
                    picture: blog.picture,
                    date: blog.date
                }
            };
            const result = await blogsCollection.updateOne(filter, updateDoc, options);
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
            sendEmail(transaction);
            // console.log(transaction);
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

        // feedback get by email**

        app.get('/feedbacks/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
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

        // blog delete API 
        app.delete("/blog/:id", async (req, res) => {
            const id = req.params.id
            const query = { _id: ObjectId(id) }
            const deleteBlog = await blogsCollection.deleteOne(query)
            res.send(deleteBlog)
        })


        app.patch("/blog/comment/:id", async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const comment = req.body;
            const updateDoc = {
                $set: {
                    comment: comment
                }
            }
            const result = await blogsCollection.updateOne(filter, updateDoc)
            res.send(result)
        })

        //Retail Banking loan details
        app.get('/retailbanking', async (req, res) => {
            const query = {};
            const cursor = retailbankingCollection.find(query);
            const result = await cursor.toArray();
            res.send(result)
        })


        // Edit api Feedback **
        app.patch('/feedback/:id', async (req, res) => {
            const id = req.params.id;
            const feedback = req.body;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: feedback
            }
            const result = await feedbackCollection.updateOne(filter, updateDoc, options);
            res.send(result)
        })

        //Sme Banking loan details

        app.get('/smebanking', async (req, res) => {
            const query = {};
            const cursor = smebankingCollection.find(query);
            const result = await cursor.toArray();
            res.send(result)
        })

        app.get('/smebanking/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await smebankingCollection.findOne(query);
            res.send(result);
        })

        // post profile by email
        app.put('/profile/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            const profile = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updatedDoc = {
                $set: profile,
            };
            const result = await profilesCollection.updateOne(filter, updatedDoc, options);
            res.send(result);
        })

        // profile image upload
        app.put('/profile/image/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            const image = req.body.url;
            const filter = { email: email };
            const options = { upsert: true }
            const updatedDoc = {
                $set: {
                    image: image,
                    email: email
                }
            };
            // console.log(image);
            const result = await profilesCollection.updateOne(filter, updatedDoc, options);
            res.send(result);
        })


        // get profile by email
        app.get('/profile/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email }
            const profile = await profilesCollection.findOne(query);
            res.send(profile);
        })


        // Contact us emails

        app.post('/contact', async (req, res) => {
            const contact = req.body;
            const result = await contactCollection.insertOne(contact);
            res.send(result);
        })

        // contact get api

        app.get('/contacts', async (req, res) => {
            const query = {};
            const cursor = contactCollection.find(query);
            const feedback = await cursor.toArray();
            res.send(feedback)
        })

        // notice Put API
        app.post("/notice", async (req, res) => {
            const notice = req.body;
            const newNotice = await noticeCollection.insertOne(notice);
            res.send(newNotice);
        })
        // all notice get API
        app.get("/allNotice", async (req, res) => {
            const query = {}
            const allNotice = await noticeCollection.find(query).toArray()
            res.send(allNotice);
        })
        // user read api patch
        app.patch("/notice/read/:id", async (req, res) => {
            const id = req.params.id
            const readUsers = req.body;
            const filter = { _id: ObjectId(id) }
            const updateDoc = {
                $set: {
                    readUsers: readUsers
                }
            }
            const result = await noticeCollection.updateOne(filter, updateDoc);
            res.send(result)
        })

        // Loan post Api

        app.post("/applyLoan", async (req, res) => {
            const loanDesc = req.body;            
            const loan = await loanCollection.insertOne(loanDesc);
            res.send(loan);           
        })

        // Request Loan Get API

        app.get("/loanRequests", async (req, res) => {
            const query = {};
            const allLoanRequests = await loanCollection.find(query).toArray()
            res.send(allLoanRequests);
        })

        // Request Loan Get API by email

        app.get("/loanRequests/:email", async (req, res) => {
            const email = req.params.email;
            const query = {email: email };
            const allLoanRequests = await loanCollection.find(query).toArray()
            res.send(allLoanRequests);
        })

        // Update Status for loan

        app.put("/loanRequests/:loanId", async (req, res) => {
            const loanId = req.params.loanId;
            const {status} = req.body;            
            const filter = {_id: ObjectId(loanId)};        
            const options = { upsert: true }
            const updatedDoc = {
                $set: {                    
                    status: status
                }
            };
            const loanAccountResult = await loanCollection.updateOne(filter, updatedDoc, options);
            res.send(loanAccountResult);
        })

        // set all

        // sme loan apply start

        app.post('/smeapplyloan', async (req, res) => {
            const smeapplyloan = req.body;
            const result = await smeapplyloanCollection.insertOne(smeapplyloan);
            res.send(result);
        })

        app.get('/smeapplyloan', async (req, res) => {
            const query = {};
            const cursor = smeapplyloanCollection.find(query);
            const result = await cursor.toArray();
            res.send(result)
        })
        // sme loan apply end

    }

    finally {

    }
}

run().catch(console.dir);

app.get('/', (req, res) => {
    res.send("Running React Bank of BD Server");
});
app.listen(port, () => {
    console.log("Listen to Port", port);
});