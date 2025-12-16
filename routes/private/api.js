const db = require('../../connectors/db');
// check function getUser in milestone 3 description and session.js
const {getUser} = require('../../utils/session');
// getUser takes only one input of req 
// await getUser(req);

function handlePrivateBackendApi(app) {
  
  // insert all your private server side end points here
  app.get('/test' ,async (req,res) => {
     try{
      return res.status(200).send("succesful connection");
     }catch(err){
      console.log("error message", err.message);
      return res.status(400).send(err.message)
     }    
  });










//////////////////////////////////////////
//BrowseMenu/////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////


// /api/v1/menuItem/truck/:truckId (Customer)
app.get("/api/v1/menuItem/truck/:truckId", async (req, res) => {
  try {
    
    const user = await getUser(req);

    if (!user || user.role !== "customer") 
    {
      return res.status(403).json({ error: "Unauthorized user" });
    }

    const { truckId } = req.params;

    // Get All Avaliable Items For a Specific truck
    const menuItems = await db("MenuItems")
      .withSchema("FoodTruck")
      .where({ 
        truckId: Number(truckId),
        status: "available" 
      })
      .orderBy("itemId", "asc");

    return res.status(200).json(menuItems);

  } catch (err) {
    console.error("Error fetching menu items for truck:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// /api/v1/menuItem/truck/:truckId/category/:category  (Customer)
app.get("/api/v1/menuItem/truck/:truckId/category/:category", async (req, res) => {
  try {
    

    const user = await getUser(req);
    
    if (!user || user.role !== "customer") {
      return res.status(403).json({ error: "Unauthorized user" });
    }

    const { truckId, category } = req.params;

    //Get All Avaliable Items For a Specific truck and category
    const menuItems = await db("MenuItems")
      .withSchema("FoodTruck")
      .where({ 
        truckId: Number(truckId),
        category: category,
        status: "available" 
      })
      .orderBy("itemId", "asc");

    return res.status(200).json(menuItems);

  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});


//////////////////////////////////////////
// Cart /////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////

// /api/v1/cart/new (Customer)
app.post("/api/v1/cart/new", async (req, res) => {
    try {
        
        const user = await getUser(req);
        
        if (!user || user.role !== "customer") {
        return res.status(403).json({ error: "Unauthorized user" });
        }

        const { itemId, quantity, price } = req.body;

        // Validate input
        if (!itemId || !quantity || !price) {
        return res.status(400).json({ error: "All fields are required" });
        }

        // Get the menu item and check if it exists
        const newMenuItem = await db("MenuItems")
        .withSchema("FoodTruck")
        .where({ itemId: Number(itemId) })
        .first();

        if (!newMenuItem) {
        return res.status(404).json({ error: "Menu item not found" });
        }

        // Check if item is available
        if (newMenuItem.status !== "available") {
        return res.status(400).json({ 
            error: "Menu item is not available" 
        });
        }

        // Check if customer already has items in cart
        const existingCartItems = await db("Carts")
        .withSchema("FoodTruck")
        .where({ userId: user.userId });

        //If cart has items 
        //(verify that all items in the cart belong to the same truck (truckId)) 
        if (existingCartItems.length > 0) {
        // Get truckId of first item in cart
        const firstCartItem = existingCartItems[0];
        const firstMenuItem = await db("MenuItems")
            .withSchema("FoodTruck")
            .where({ itemId: firstCartItem.itemId })
            .first();

        // Check if new item is from a different truck
        if (firstMenuItem.truckId !== newMenuItem.truckId) {
            return res.status(400).json({ 
            message: "Cannot order from multiple trucks" 
            });
        }
        }

        // Add item to cart
        await db("Carts")
        .withSchema("FoodTruck")
        .insert({
            userId: user.userId,
            itemId: Number(itemId),
            quantity: Number(quantity),
            price: Number(price)
        });

        return res.status(200).json({
        message: "item added to cart successfully"
        });

    } catch (err) {
        console.error("Error adding item to cart:", err);
        return res.status(500).json({ error: "Internal Server error" });
    }
    });

// GET: /api/v1/cart/view (Customer)
app.get("/api/v1/cart/view", async (req, res) => {
    try {
        // Get current customer
        const user = await getUser(req);
        
        if (!user || user.role !== "customer") {
        return res.status(403).json({ error: "Unauthorized user" });
        }

        // Get all cart items for this customer with menu item details
        const cartItems = await db("Carts")
        .withSchema("FoodTruck")
        .join("MenuItems", "Carts.itemId", "MenuItems.itemId")
        .select(
            "Carts.cartId",
            "Carts.userId",
            "Carts.itemId",
            "MenuItems.name as itemName",
            "Carts.price",
            "Carts.quantity"
        )

        .where({ "Carts.userId": user.userId })
        .orderBy("Carts.cartId", "asc");

        return res.status(200).json(cartItems);

    } 
    catch (err){
        console.error("Error fetching cart:", err);
        return res.status(500).json({ error: "Server error" });
    }
    });

// PUT: /api/v1/cart/edit/:cartId (Customer)
app.put("/api/v1/cart/edit/:cartId", async (req, res) => {
try {
    // Get current customer
    const user = await getUser(req);
    
    if (!user || user.role !== "customer") {
    return res.status(403).json({ error: "Unauthorized user" });
    }

    const { cartId } = req.params;
    const { quantity } = req.body;

    // Validate input
    if (!quantity) {
    return res.status(400).json({ error: "Quantity is required" });
    }

    // Check if cart item exists and belongs to this user
    const cartItem = await db("Carts")
    .withSchema("FoodTruck")
    .where({ 
        cartId: Number(cartId),
        userId: user.userId 
    })
    .first();

    if (!cartItem) {
    return res.status(404).json({ 
        error: "Cart item not found or unauthorized" 
    });
    }

    // Update the cart item quantity
    await db("Carts")
    .withSchema("FoodTruck")
    .where({ cartId: Number(cartId) })
    .update({ quantity: Number(quantity) });

    return res.status(200).json({
    message: "cart updated successfully"
    });

} catch (err) {
    console.error("Error updating cart item:", err);
    return res.status(500).json({ error: "Server error" });
}
});

// DELETE: /api/v1/cart/delete/:cartId (Customer)
app.delete("/api/v1/cart/delete/:cartId", async (req, res) => {
try {
    // Get current customer
    const user = await getUser(req);
    
    if (!user || user.role !== "customer") {
    return res.status(403).json({ error: "Unauthorized user" });
    }

    const { cartId } = req.params;

    // Check if cart item exists and belongs to this user
    const cartItem = await db("Carts")
    .withSchema("FoodTruck")
    .where({ 
        cartId: Number(cartId),
        userId: user.userId 
    })
    .first();

    if (!cartItem) {
    return res.status(404).json({ 
        error: "Cart item not found or unauthorized" 
    });
    }

    // Delete the cart item
    await db("Carts")
    .withSchema("FoodTruck")
    .where({ cartId: Number(cartId) })
    .del();

    return res.status(200).json({
    message: "item removed from cart successfully"
    });

} catch (err) {
    console.error("Error deleting cart item:", err);
    return res.status(500).json({ error: "Server error" });
}
});



//////////////////////////////////////////
// Menu Item /////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////

app.post("/api/v1/menuitem/new", async (req, res) => {
  try {

    const user = await getUser(req);
    
    if (!user) {
      console.log("No user returned");
      return res.status(403).json({ error: "Unauthorized user" });
    }
    
    if (user.role !== "truckOwner") {
      console.log(`Role check failed. Expected: "truckOwner", Got: "${user.role}"`);
      return res.status(403).json({ error: "Unauthorized user" });
    }
    
   
    
    if (!user.truckId) {
      console.log("No truckId found");
      return res.status(400).json({ error: "Truck not found for this user" });
    }
         
    const { name, price, description, category } = req.body;
    
    if (!name || !price || !description || !category) {
      return res.status(400).json({ error: "All fields are required" });
    }
    
    await db("MenuItems")
      .withSchema("FoodTruck")
      .insert({
        truckId: user.truckId,
        name,
        price,
        description,
        category
      });
    
    
    return res.status(200).json({
      message: "Menu item was created successfully"
    });
  } catch (err) {
    console.error("Endpoint error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET: /api/v1/menuitem/view (TruckOwner)
app.get("/api/v1/menuitem/view", async (req, res) => {
  try {
    // Get current truck owner
    const user = await getUser(req);
    
    if (!user || user.role !== "truckOwner") {
      return res.status(403).json({ error: "Unauthorized user" });
    }
    
    if (!user.truckId) {
      return res.status(400).json({ error: "Truck not found for this user" });
    }

    // Get menu items for this truck only, where status is available
    const menuItems = await db("MenuItems")
      .withSchema("FoodTruck")
      .where({ truckId: user.truckId, status: "available" })
      .orderBy("itemId", "asc");

    return res.status(200).json(menuItems);

  } catch (err) {
    console.error("Error fetching menu items:", err);
    return res.status(500).json({ error: "Internal Server error" });
  }
});

//  /api/v1/menuitem/view/:itemId (TruckOwner)
app.get("/api/v1/menuitem/view/:itemId", async (req, res) => {
  try {
    
    const user = await getUser(req);
    
    if (!user || user.role !== "truckOwner") {
      return res.status(403).json({ error: "Unauthorized user" });
    }
    
    if (!user.truckId) {
      return res.status(400).json({ error: "Truck not found for this user" });
    }

    const { itemId } = req.params;

    // Get the menu item for this truck only
    const menuItem = await db("MenuItems")
      .withSchema("FoodTruck")
      .where({ itemId: Number(itemId), truckId: user.truckId })
      .first();

    if (!menuItem) {
      return res.status(404).json({ error: "Menu item not found" });
    }

    return res.status(200).json(menuItem);

  } catch (err) {
    console.error("Error fetching menu item:", err);
    return res.status(500).json({ error: "Internal Server error" });
  }
});

//  /api/v1/menuitem/edit/:itemId (TruckOwner)
app.put("/api/v1/menuitem/edit/:itemId", async (req, res) => {
  try {
    
    const user = await getUser(req);
    
    if (!user || user.role !== "truckOwner") {
      return res.status(403).json({ error: "Unauthorized user" });
    }
    
    if (!user.truckId) {
      return res.status(400).json({ error: "Truck not found for this user" });
    }

    const { itemId } = req.params;
    const { name, price, category, description } = req.body;

   
    if (!name || !price || !category || !description) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Check if menu item belongs to this truck
    const menuItem = await db("MenuItems")
      .withSchema("FoodTruck")
      .where({ itemId: Number(itemId), truckId: user.truckId })
      .first();

    if (!menuItem) {
      return res.status(404).json({ error: "Menu item not found or unauthorized" });
    }

    // Update menu item
    await db("MenuItems")
      .withSchema("FoodTruck")
      .where({ itemId: Number(itemId) })
      .update({ name, price, category, description });

    return res.status(200).json({ message: "menu item updated successfully" });

  } catch (err) {
    console.error("Error updating menu item:", err);
    return res.status(500).json({ error: "Internal Server error" });
  }
});

//  /api/v1/menuitem/delete/:itemId (TruckOwner)
app.delete("/api/v1/menuitem/delete/:itemId", async (req, res) => {
  try {
    
    const user = await getUser(req);
    
    if (!user || user.role !== "truckOwner") {
      return res.status(403).json({ error: "Unauthorized user" });
    }
    
    if (!user.truckId) {
      return res.status(400).json({ error: "Truck not found for this user" });
    }

    const { itemId } = req.params;

    console.log("Deleting itemId:", itemId, "for truckId:", user.truckId);

    // Get menu item
    const menuItem = await db("MenuItems")
      .withSchema("FoodTruck")
      .where({ itemId: Number(itemId), truckId: user.truckId })
      .first();

   

    if (!menuItem) {
      return res.status(404).json({ error: "Menu item not found or unauthorized" });
    }

    const updatedRows = await db("MenuItems")
      .withSchema("FoodTruck")
      .where({ itemId: Number(itemId), truckId: user.truckId })
      .update({ status: "unavailable" });

   

    if (updatedRows === 0) {
      return res.status(400).json({ error: "Menu item could not be deleted" });
    }

    return res.status(200).json({ message: "menu item deleted successfully" });

  } catch (err) {
    console.error("Error deleting menu item:", err);
    return res.status(500).json({ error: "Internal Server error" });
  }
});


//////////////////////////////////////////
// Orders /////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////

//(Customer)
app.get("/api/v1/order/myOrders", async (req, res) => {
  try {
    
    const user = await getUser(req);
    
    if (!user || user.role !== "customer") {
      return res.status(403).json({ error: "Unauthorized user" });
    }

    // Get all orders for this customer with truck details
    const orders = await db("Orders")
      .withSchema("FoodTruck")
      .join("Trucks", "Orders.truckId", "Trucks.truckId")
      .select(
        "Orders.orderId",
        "Orders.userId",
        "Orders.truckId",
        "Trucks.truckName",
        "Orders.orderStatus",
        "Orders.totalPrice",
        "Orders.scheduledPickupTime",
        "Orders.estimatedEarliestPickup",
        "Orders.createdAt"
      )
      .where({ "Orders.userId": user.userId })
      .orderBy("Orders.orderId", "desc");

    return res.status(200).json(orders);

  } catch (err) {
    console.error("Error fetching orders:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

//(Customer)
app.get("/api/v1/order/details/:orderId", async (req, res) => {
  try {
    
    const user = await getUser(req);
    
    if (!user || user.role !== "customer") {
      return res.status(403).json({ error: "Unauthorized user" });
    }

    const { orderId } = req.params;

    // Get order details with truck name
    const order = await db("Orders")
      .withSchema("FoodTruck")
      .join("Trucks", "Orders.truckId", "Trucks.truckId")
      .select(
        "Orders.orderId",
        "Trucks.truckName",
        "Orders.orderStatus",
        "Orders.totalPrice",
        "Orders.scheduledPickupTime",
        "Orders.estimatedEarliestPickup",
        "Orders.createdAt"
      )
      .where({ 
        "Orders.orderId": Number(orderId),
        "Orders.userId": user.userId 
      })
      .first();

    if (!order) {
      return res.status(404).json({ 
        error: "Order not found or unauthorized" 
      });
    }

    // Get order items with menu item details
    const items = await db("OrderItems")
      .withSchema("FoodTruck")
      .join("MenuItems", "OrderItems.itemId", "MenuItems.itemId")
      .select(
        "MenuItems.name as itemName",
        "OrderItems.quantity",
        "OrderItems.price"
      )
      .where({ "OrderItems.orderId": Number(orderId) });

    //Combine order details with items
    const orderDetails = {
      ...order,
      items: items
    };

    return res.status(200).json(orderDetails);

  } catch (err) {
    console.error("Error fetching order details:", err);
    return res.status(500).json({ error: "Server error" });
  }
});


//(Truck Owner)
app.get("/api/v1/order/truckOrders", async (req, res) => {
  try {
    
    const user = await getUser(req);
    
    if (!user || user.role !== "truckOwner") {
      return res.status(403).json({ error: "Unauthorized user" });
    }

    if (!user.truckId) {
      return res.status(400).json({ error: "Truck not found for this user" });
    }

    // Get all orders for this truck with customer details
    const orders = await db("Orders")
      .withSchema("FoodTruck")
      .join("Users", "Orders.userId", "Users.userId")
      .select(
        "Orders.orderId",
        "Orders.userId",
        "Users.name as customerName",
        "Orders.orderStatus",
        "Orders.totalPrice",
        "Orders.scheduledPickupTime",
        "Orders.estimatedEarliestPickup",
        "Orders.createdAt"
      )
      .where({ "Orders.truckId": user.truckId })
      .orderBy("Orders.orderId", "desc");

    return res.status(200).json(orders);

  } catch (err) {
    console.error("Error fetching truck orders:", err);
    return res.status(500).json({ error: "Server error" });
  }
});
// (Truck Owner)
app.get("/api/v1/order/truckOwner/:orderId", async (req, res) => {
  try {
    // Get current truck owner
    const user = await getUser(req);
    
    if (!user || user.role !== "truckOwner") {
      return res.status(403).json({ error: "Unauthorized user" });
    }

    if (!user.truckId) {
      return res.status(400).json({ error: "Truck not found for this user" });
    }

    const { orderId } = req.params;

    // Get order details with truck name
    const order = await db("Orders")
      .withSchema("FoodTruck")
      .join("Trucks", "Orders.truckId", "Trucks.truckId")
      .select(
        "Orders.orderId",
        "Trucks.truckName",
        "Orders.orderStatus",
        "Orders.totalPrice",
        "Orders.scheduledPickupTime",
        "Orders.estimatedEarliestPickup",
        "Orders.createdAt"
      )
      .where({ 
        "Orders.orderId": Number(orderId),
        "Orders.truckId": user.truckId 
      })
      .first();

    if (!order) {
      return res.status(404).json({ 
        error: "Order not found or unauthorized" 
      });
    }

    // Get order items with menu item details
    const items = await db("OrderItems")
      .withSchema("FoodTruck")
      .join("MenuItems", "OrderItems.itemId", "MenuItems.itemId")
      .select(
        "MenuItems.name as itemName",
        "OrderItems.quantity",
        "OrderItems.price"
      )
      .where({ "OrderItems.orderId": Number(orderId) });

    // Combine order details with items
    const orderDetails = {
      ...order,
      items: items
    };

    return res.status(200).json(orderDetails);

  } catch (err) {
    console.error("Error fetching order details for truck owner:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// (Customer)
app.post("/api/v1/order/new", async (req, res) => {
  try {
    
    const user = await getUser(req);
    
    if (!user || user.role !== "customer") {
      return res.status(403).json({ error: "Unauthorized user" });
    }

    const { scheduledPickupTime } = req.body;

    // Validate input
    if (!scheduledPickupTime) {
      return res.status(400).json({ error: "Scheduled pickup time is required" });
    }

    // Get all cart items for this customer
    const cartItems = await db("Carts")
      .withSchema("FoodTruck")
      .where({ userId: user.userId });

    if (cartItems.length === 0) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    // Get menu items to check truck IDs
    const itemIds = cartItems.map(item => item.itemId);
    const menuItems = await db("MenuItems")
      .withSchema("FoodTruck")
      .whereIn("itemId", itemIds);

    // Check if all items belong to the same truck
    const truckIds = [...new Set(menuItems.map(item => item.truckId))];
    
    if (truckIds.length > 1) {
      return res.status(400).json({ 
        error: "Cannot order from multiple trucks" 
      });
    }

    const truckId = truckIds[0];

    // Calculate total price
    let totalPrice = 0;
    cartItems.forEach(item => {
      totalPrice += item.price * item.quantity;
    });

    // Calculate estimated earliest pickup (30 minutes before scheduled time)
    const estimatedEarliestPickup = new Date(new Date(scheduledPickupTime).getTime() - 30 * 60000);

    // Insert order
    const [order] = await db("Orders")
      .withSchema("FoodTruck")
      .insert({
        userId: user.userId,
        truckId: truckId,
        orderStatus: "pending",
        totalPrice: totalPrice,
        scheduledPickupTime: scheduledPickupTime,
        estimatedEarliestPickup: estimatedEarliestPickup
      })
      .returning("orderId");

    const orderId = order.orderId;

    // Insert order items
    const orderItemsData = cartItems.map(item => ({
      orderId: orderId,
      itemId: item.itemId,
      quantity: item.quantity,
      price: item.price
    }));

    await db("OrderItems")
      .withSchema("FoodTruck")
      .insert(orderItemsData);

    // Delete all cart items for this customer
    await db("Carts")
      .withSchema("FoodTruck")
      .where({ userId: user.userId })
      .del();

    return res.status(200).json({
      message: "order placed successfully"
    });

  } catch (err) {
    console.error("Error placing order:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

//(Truck Owner)
app.put("/api/v1/order/updateStatus/:orderId", async (req, res) => {
  try {
    
    const user = await getUser(req);
    
    if (!user || user.role !== "truckOwner") {
      return res.status(403).json({ error: "Unauthorized user" });
    }

    if (!user.truckId) {
      return res.status(400).json({ error: "Truck not found for this user" });
    }

    const { orderId } = req.params;
    const { orderStatus, estimatedEarliestPickup } = req.body;

    // Validate orderStatus
    const validStatuses = ["pending", "preparing", "ready", "completed", "cancelled"];
    
    if (!orderStatus) {
      return res.status(400).json({ error: "Order status is required" });
    }

    if (!validStatuses.includes(orderStatus)) {
      return res.status(400).json({ 
        error: "Invalid order status. Must be one of: pending, preparing, ready, completed, cancelled" 
      });
    }

    // Check if order exists and belongs to this truck
    const order = await db("Orders")
      .withSchema("FoodTruck")
      .where({ 
        orderId: Number(orderId),
        truckId: user.truckId 
      })
      .first();

    if (!order) {
      return res.status(404).json({ 
        error: "Order not found or unauthorized" 
      });
    }

    // Prepare update data
    const updateData = {
      orderStatus: orderStatus
    };

    // Add estimatedEarliestPickup to update if provided
    if (estimatedEarliestPickup) {
      updateData.estimatedEarliestPickup = estimatedEarliestPickup;
    }

    // Update the order
    await db("Orders")
      .withSchema("FoodTruck")
      .where({ orderId: Number(orderId) })
      .update(updateData);

    return res.status(200).json({
      message: "order status updated successfully"
    });

  } catch (err) {
    console.error("Error updating order status:", err);
    return res.status(500).json({ error: "Server error" });
  }
});


//////////////////////////////////////////
// Truckmanagement /////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////

// GET: /api/v1/trucks/view (Customer)
app.get("/api/v1/trucks/view", async (req, res) => {
  try {
    // Get current customer
    const user = await getUser(req);
    
    if (!user || user.role !== "customer") {
      return res.status(403).json({ error: "Unauthorized user" });
    }

    // Query all trucks that are available for ordering
    const trucks = await db("Trucks")
      .withSchema("FoodTruck")
      .where({ 
        truckStatus: "available",
        orderStatus: "available" 
      })
      .orderBy("truckId", "asc");

    return res.status(200).json(trucks);

  } catch (err) {
    console.error("Error fetching trucks:", err);
    return res.status(500).json({ error: "Server error" });
  }
});


// PUT: /api/v1/trucks/updateOrderStatus (Truck Owner)
app.put("/api/v1/trucks/updateOrderStatus", async (req, res) => {
  try {
    // Get current truck owner
    const user = await getUser(req);
    
    if (!user || user.role !== "truckOwner") {
      return res.status(403).json({ error: "Unauthorized user" });
    }

    if (!user.truckId) {
      return res.status(400).json({ error: "Truck not found for this user" });
    }

    const { orderStatus } = req.body;

    // Validate orderStatus
    const validStatuses = ["available", "unavailable"];
    
    if (!orderStatus) {
      return res.status(400).json({ error: "Order status is required" });
    }

    if (!validStatuses.includes(orderStatus)) {
      return res.status(400).json({ 
        error: "Invalid order status. Must be either 'available' or 'unavailable'" 
      });
    }

    // Update truck order status
    await db("Trucks")
      .withSchema("FoodTruck")
      .where({ truckId: user.truckId })
      .update({ orderStatus: orderStatus });

    return res.status(200).json({
      message: "truck order status updated successfully"
    });

  } catch (err) {
    console.error("Error updating truck order status:", err);
    return res.status(500).json({ error: "Server error" });
  }
});



// GET  /api/v1/trucks/myTruck.  (TruckOwner)
app.get('/api/v1/trucks/myTruck', async (req, res) => {
  try {
    //Get the authenticated user using getUser function
    const user = await getUser(req);

    //Check if user is authenticated
    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Please provide a valid authentication token'
      });
    }

    //Check if user is a truck owner
    if (user.role !== 'truckOwner') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only truck owners can access this endpoint'
      });
    }

    //Check if truck exists (should exist since getUser already fetches it)
    if (!user.truckId) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'No truck found for this owner'
      });
    }

    //Fetch the complete truck information from database
    const truck = await db('Trucks')
      .withSchema('FoodTruck')
      .where({ truckId: user.truckId })
      .first();

    //If truck doesn't exist (edge case)
    if (!truck) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Truck information not found'
      });
    }

    //Return truck object
    return res.status(200).json({
      truckId: truck.truckId,
      truckName: truck.truckName,
      truckLogo: truck.truckLogo,
      ownerId: truck.ownerId,
      truckStatus: truck.truckStatus,
      orderStatus: truck.orderStatus,
      createdAt: truck.createdAt
    });

  } catch (error) {
    console.error('Error fetching truck information:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred while fetching truck information'
    });
  }
});



};



module.exports = {handlePrivateBackendApi};
