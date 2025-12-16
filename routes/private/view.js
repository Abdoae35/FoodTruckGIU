const db = require('../../connectors/db');
const { getSessionToken , getUser } = require('../../utils/session');
const axios = require('axios');
require('dotenv').config();
const PORT = process.env.PORT || 3001;

function handlePrivateFrontEndView(app) {

    app.get('/dashboard' , async (req , res) => {
        
        const user = await getUser(req);
        if(user.role == "truckOwner"){
            return res.render('ownerDashboard' , {name : user.name});
        }
        // role of customer
        return res.render('customerHomepage' , {name : user.name});
    });

    app.get('/testingAxios' , async (req , res) => {

        try {
            const result = await axios.get(`http://localhost:${PORT}/test`);
            return res.status(200).send(result.data);
        } catch (error) {
            console.log("error message",error.message);
            return res.status(400).send(error.message);
        }
      
    });

    // ============ Register for The Customer ============

    // Browse trucks route
    app.get('/trucks', async function(req, res) {
        const user = await getUser(req);
        res.render('trucks', { name: user.name || user.email });
    });

    // Truck menu route
    app.get('/truckMenu/:truckId', async function(req, res) {
        const user = await getUser(req);
        res.render('truckMenu', { 
            name: user.name || user.email,
            truckId: req.params.truckId 
        });
    });

    // View Cart route
    app.get('/cart', async function(req, res) {
        const user = await getUser(req);
        res.render('cart', { name: user.name || user.email });
    });



    // My Orders route
    app.get('/orders', async function(req, res) {
        const user = await getUser(req);
        res.render('myOrders', { name: user.name || user.email });
    });


    

    // Logout route
    app.get('/logout', async function(req, res) {
        const token = getSessionToken(req);
        if (token) {
            try {
                await db('FoodTruck.Sessions').where('token', token).del();
            } catch(e) {
                console.log(e.message);
            }
        }
        res.clearCookie('session_token');
        res.redirect('/login');
    });
    // Add these routes to your ./routes/private/view.js file

    // Owner Dashboard route
    app.get('/ownerDashboard', async function(req, res) {
        const user = await getUser(req);
        if (user.role !== 'truckOwner') {
            return res.redirect('/dashboard');
        }
        res.render('ownerDashboard', { 
            name: user.name || user.email 
        });
    });

    // Menu Items Management route
    app.get('/menuItems', async function(req, res) {
        const user = await getUser(req);
        if (user.role !== 'truckOwner') {
            return res.redirect('/dashboard');
        }
        res.render('menuItems', { 
            name: user.name || user.email 
        });
    });

    // Truck Orders route (placeholder - you'll create this later)
    app.get('/truckOrders', async function(req, res) {
        const user = await getUser(req);
        if (user.role !== 'truckOwner') {
            return res.redirect('/dashboard');
        }
        res.render('truckOrders', { 
            name: user.name || user.email 
        });
    });

    // Add Menu Item route (placeholder - you'll create this later)
    app.get('/addMenuItem', async function(req, res) {
        const user = await getUser(req);
        if (user.role !== 'truckOwner') {
            return res.redirect('/dashboard');
        }
        res.render('addMenuItem', { 
            name: user.name || user.email 
        });
    });




}  
  
module.exports = {handlePrivateFrontEndView};